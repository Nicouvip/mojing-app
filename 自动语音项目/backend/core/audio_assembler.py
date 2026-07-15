"""
音频组装器

按剧本顺序将各 CV 的音频片段组装成完整音轨，
支持交叉渐变、咔嗒声消除、静音裁剪等后处理。
所有参数均可调节/开关。
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import numpy as np

from .audio_io import load_audio, save_audio


@dataclass
class FadeParams:
    """交叉渐变参数（片段之间，不是每个片段独立淡入淡出）"""
    enabled: bool = True
    crossfade_duration: float = 0.2   # 片段间交叉渐变时长（秒），0.1-0.3 秒效果最佳
    curve: str = "linear"             # linear, s_curve


@dataclass
class ClickRemovalParams:
    """咔嗒声消除参数"""
    enabled: bool = True
    threshold_db: float = -30.0       # dB 阈值（比之前-40更轻，减少误杀）
    crossfade: float = 0.005          # 交叉渐变时长（秒）


@dataclass
class SilenceTrimParams:
    """静音裁剪参数"""
    enabled: bool = True
    threshold_db: float = -50.0
    min_duration: float = 0.1


@dataclass
class ExportParams:
    """导出参数"""
    sample_rate: int = 44100
    format: str = "wav"               # wav, mp3, flac
    bitrate: str = "192k"
    subtype: str = "PCM_16"           # PCM_16, PCM_24, FLOAT
    channels: str = "mono"            # mono, stereo


@dataclass
class SegmentConfig:
    """一个待组装的音频片段配置"""
    file_path: str
    offset: float = 0.0
    duration: float = 0.0
    gain_db: float = 0.0              # 增益（dB），用于平衡不同CV音量


def _crossfade_join(a: np.ndarray, b: np.ndarray,
                    crossfade_samples: int,
                    curve: str = "linear") -> np.ndarray:
    """
    将两段音频用交叉渐变拼接。

    不是对每段单独做淡入淡出，而是在两段重叠区域做交叉渐变：
    - 前一段的尾部逐渐淡出
    - 后一段的头部逐渐淡入
    - 重叠部分相加
    """
    if crossfade_samples <= 0:
        return np.concatenate([a, b])

    crossfade_samples = min(crossfade_samples, len(a), len(b))
    if crossfade_samples <= 0:
        return np.concatenate([a, b])

    if curve == "s_curve":
        # S曲线：更自然的听觉感受
        t = np.linspace(-6, 6, crossfade_samples)
        fade_out = 1 / (1 + np.exp(t))          # 1→0
        fade_out = (fade_out - fade_out[0]) / (fade_out[-1] - fade_out[0] + 1e-10)
        fade_in = 1 - fade_out                   # 0→1
    else:
        # 线性
        fade_out = np.linspace(1, 0, crossfade_samples)
        fade_in = np.linspace(0, 1, crossfade_samples)

    # 前一段尾部 × fade_out + 后一段头部 × fade_in
    overlap_a = a[-crossfade_samples:] * fade_out
    overlap_b = b[:crossfade_samples] * fade_in
    overlap = overlap_a + overlap_b

    return np.concatenate([a[:-crossfade_samples], overlap, b[crossfade_samples:]])


def _remove_click(data: np.ndarray, sr: int,
                  threshold_db: float = -30.0,
                  crossfade: float = 0.005) -> np.ndarray:
    """
    咔嗒声消除 - 改进版

    原版问题：用一阶差分阈值检测，容易误杀爆破音（p/t/b），
    且用 linspace 归零会引入新噪声。

    改进：使用中值滤波检测离群点，用插值修复而非归零。
    """
    out = data.copy()
    threshold_linear = 10 ** (threshold_db / 20)
    n_crossfade = max(1, int(crossfade * sr))

    # 使用局部中值作为参考，检测瞬态异常
    med_window = max(7, n_crossfade * 2 + 1)
    if med_window > len(data):
        return out

    # 短时能量 vs 局部中值能量
    frame_len = min(int(sr * 0.002), 32)  # 2ms帧
    energy = np.array([
        np.sqrt(np.mean(data[i:i + frame_len] ** 2))
        for i in range(0, len(data), frame_len)
    ])

    # 检测突发的能量尖峰（超过局部中值3倍以上）
    from scipy.ndimage import median_filter
    smooth_energy = median_filter(energy, size=max(3, int(sr * 0.01 / frame_len)))
    energy_ratio = energy / (smooth_energy + 1e-10)
    click_frames = np.where(energy_ratio > 3.0)[0]

    if len(click_frames) == 0:
        return out

    # 将帧索引转换为采样点
    click_positions = (click_frames * frame_len).astype(int)
    click_positions = click_positions[click_positions < len(data)]

    # 合并相近的点击点
    merged = []
    for pos in click_positions:
        if not merged or pos - merged[-1] > n_crossfade * 3:
            merged.append(pos)

    # 对每个点击点做平滑插值（不是归零）
    for pos in merged:
        start = max(0, pos - n_crossfade)
        end = min(len(out), pos + n_crossfade)

        if end - start < 3:
            continue

        # 用起始处和结束处的采样值做线性插值
        val_start = out[max(0, start - 1)] if start > 0 else 0
        val_end = out[min(len(out) - 1, end)] if end < len(out) else 0
        t = np.linspace(0, 1, end - start)
        interpolation = val_start * (1 - t) + val_end * t

        # 只在咔嗒点附近混合（渐变过渡）
        blend_width = min(n_crossfade, (end - start) // 4)
        if blend_width > 0:
            fade = np.ones(end - start)
            fade[:blend_width] = np.linspace(0, 1, blend_width)
            fade[-blend_width:] = np.linspace(1, 0, blend_width)
            out[start:end] = out[start:end] * (1 - fade * 0.8) + interpolation * fade * 0.8
        else:
            out[start:end] = interpolation

    return out


def _trim_silence(data: np.ndarray, sr: int,
                  threshold_db: float = -50.0,
                  min_duration: float = 0.1) -> np.ndarray:
    """
    裁剪首尾静音 - 修复版

    原版问题：RMS 计算赋值给切片 + 索引查找逻辑有 bug。
    修复：逐帧计算并存储到独立数组。
    """
    threshold_linear = 10 ** (threshold_db / 20)
    frame_length = max(1, int(sr * min_duration))
    n_frames = (len(data) + frame_length - 1) // frame_length

    # 逐帧计算 RMS（修复 bug：用独立列表而非切片赋值）
    rms_frames = np.zeros(n_frames)
    for i in range(n_frames):
        start = i * frame_length
        end = min(start + frame_length, len(data))
        segment = data[start:end]
        if len(segment) > 0:
            rms_frames[i] = np.sqrt(np.mean(segment ** 2))

    # 找到第一个和最后一个超过阈值的帧
    above_threshold = np.where(rms_frames > threshold_linear)[0]
    if len(above_threshold) == 0:
        return data

    first_frame = max(0, above_threshold[0] - 1)
    last_frame = min(n_frames - 1, above_threshold[-1] + 1)

    start_sample = first_frame * frame_length
    end_sample = min(len(data), (last_frame + 1) * frame_length)

    return data[start_sample:end_sample]


def apply_gain(data: np.ndarray, gain_db: float) -> np.ndarray:
    """对音频应用增益（dB）"""
    if gain_db == 0:
        return data
    linear = 10 ** (gain_db / 20)
    return data * linear


def normalize_rms(data: np.ndarray, target_db: float = -24.0) -> np.ndarray:
    """
    RMS 归一化：将音频的平均音量调整到目标电平
    目标值 -24dB 是有声书常见标准
    """
    if len(data) == 0:
        return data

    current_rms = np.sqrt(np.mean(data ** 2))
    if current_rms < 1e-10:
        return data

    target_linear = 10 ** (target_db / 20)
    gain = target_linear / current_rms
    return data * gain


def assemble_audio(
    segments: list[SegmentConfig],
    fade_params: FadeParams | None = None,
    click_params: ClickRemovalParams | None = None,
    silence_params: SilenceTrimParams | None = None,
    export_params: ExportParams | None = None,
    normalize: bool = True,
    target_lufs: float = -24.0,
) -> tuple[np.ndarray, int]:
    """
    将多个音频片段按顺序组装为完整音轨

    处理流程（按顺序）：
    1. 加载音频 → 2. 增益调整 → 3. 静音裁剪
    → 4. 咔嗒声消除 → 5. 交叉渐变拼接 → 6. 整体响度归一化
    """
    fade_params = fade_params or FadeParams()
    click_params = click_params or ClickRemovalParams()
    silence_params = silence_params or SilenceTrimParams()
    export_params = export_params or ExportParams()

    target_sr = export_params.sample_rate
    processed: list[np.ndarray] = []

    for seg in segments:
        # 加载音频
        data, sr = load_audio(seg.file_path, sr=target_sr)

        # 截取指定段落
        start_sample = int(seg.offset * sr)
        if seg.duration > 0:
            end_sample = start_sample + int(seg.duration * sr)
            data = data[start_sample:end_sample]
        elif start_sample > 0:
            data = data[start_sample:]

        if len(data) == 0:
            continue

        # 增益调整（平衡不同CV音量）
        if seg.gain_db != 0:
            data = apply_gain(data, seg.gain_db)

        # 静音裁剪（首尾）
        if silence_params.enabled:
            data = _trim_silence(
                data, sr,
                threshold_db=silence_params.threshold_db,
                min_duration=silence_params.min_duration,
            )

        # 咔嗒声消除
        if click_params.enabled:
            data = _remove_click(
                data, sr,
                threshold_db=click_params.threshold_db,
                crossfade=click_params.crossfade,
            )

        if len(data) > 0:
            processed.append(data)

    if not processed:
        return np.zeros(0, dtype=np.float32), target_sr

    # 交叉渐变拼接（在片段之间做 crossfade，而不是每段独立淡入淡出）
    if len(processed) == 1:
        result = processed[0]
    else:
        crossfade_samples = int(fade_params.crossfade_duration * target_sr) if fade_params.enabled else 0
        result = processed[0]
        for i in range(1, len(processed)):
            result = _crossfade_join(result, processed[i], crossfade_samples, fade_params.curve)

    # 整体响度归一化（所有CV音量一致）
    if normalize:
        result = normalize_rms(result, target_db=target_lufs)

    return result.astype(np.float32), target_sr
