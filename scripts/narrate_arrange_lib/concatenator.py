"""
音频拼接模块 — concatenator.py（numpy 优化版）

按编排清单顺序拼接音频：
- 旁白段 → 读取合成好的 WAV
- 对话标记位 → 插入静音（≥800ms）
- 段间 80ms 淡入淡出（numpy 向量化运算）
- 输出完整 WAV

借鉴 Voicebox chunked_tts.py 的 crossfade 实现：
  np.linspace 生成渐变曲线，直接对数组做乘法，不用 for 循环。
"""

import os
import struct
from pathlib import Path

import numpy as np

from .parser import Segment
from .config_loader import sample_rate as get_sr, bits_per_sample, num_channels


# 音频参数（从 config.toml 读取）
SAMPLE_RATE = get_sr()
BITS_PER_SAMPLE = bits_per_sample()
NUM_CHANNELS = num_channels()
BYTES_PER_SAMPLE = BITS_PER_SAMPLE // 8


def generate_silence(duration_ms: int) -> np.ndarray:
    """生成长度为 duration_ms 的静音 numpy 数组（float32 归一化）"""
    num_samples = int(SAMPLE_RATE * duration_ms / 1000)
    return np.zeros(num_samples, dtype=np.float32)


def read_wav_float32(wav_path: str) -> np.ndarray:
    """读取 WAV 文件，返回 float32 归一化数组 [-1.0, 1.0]"""
    with open(wav_path, 'rb') as f:
        header = f.read(44)
        if header[:4] != b'RIFF' or header[8:12] != b'WAVE':
            raise ValueError(f"不是有效的 WAV 文件: {wav_path}")
        data_size = struct.unpack('<I', header[40:44])[0]
        pcm_bytes = f.read(data_size)

    # int16 → float32 归一化
    samples = np.frombuffer(pcm_bytes, dtype=np.int16).astype(np.float32)
    samples /= 32768.0
    return samples


def apply_fade(audio: np.ndarray, fade_ms: int = 80) -> np.ndarray:
    """
    对 numpy 数组应用淡入淡出（向量化运算，无 for 循环）。
    
    借鉴 Voicebox: np.linspace 生成渐变曲线，直接相乘。
    """
    fade_samples = int(SAMPLE_RATE * fade_ms / 1000)
    if fade_samples * 2 > len(audio):
        return audio  # 太短了不做

    result = audio.copy()

    # 淡入：线性 0→1
    fade_in = np.linspace(0.0, 1.0, fade_samples, dtype=np.float32)
    result[:fade_samples] *= fade_in

    # 淡出：线性 1→0
    fade_out = np.linspace(1.0, 0.0, fade_samples, dtype=np.float32)
    result[-fade_samples:] *= fade_out

    return result


def apply_fade_in(audio: np.ndarray, fade_ms: int = 80) -> np.ndarray:
    """仅淡入"""
    fade_samples = int(SAMPLE_RATE * fade_ms / 1000)
    if fade_samples * 2 > len(audio):
        return audio
    result = audio.copy()
    fade_in = np.linspace(0.0, 1.0, fade_samples, dtype=np.float32)
    result[:fade_samples] *= fade_in
    return result


def apply_fade_out(audio: np.ndarray, fade_ms: int = 80) -> np.ndarray:
    """仅淡出"""
    fade_samples = int(SAMPLE_RATE * fade_ms / 1000)
    if fade_samples * 2 > len(audio):
        return audio
    result = audio.copy()
    fade_out = np.linspace(1.0, 0.0, fade_samples, dtype=np.float32)
    result[-fade_samples:] *= fade_out
    return result


def float32_to_pcm(audio: np.ndarray) -> bytes:
    """float32 归一化数组 → int16 PCM 字节"""
    # 防削波
    max_val = np.abs(audio).max()
    if max_val > 1.0:
        audio = audio / max_val
    samples = np.clip(audio, -1.0, 1.0) * 32767.0
    return samples.astype(np.int16).tobytes()


def write_wav(output_path: str, pcm_data: bytes):
    """将 PCM 数据写入 WAV 文件"""
    data_size = len(pcm_data)
    file_size = 36 + data_size

    header = struct.pack(
        '<4sI4s4sIHHIIHH',
        b'RIFF', file_size, b'WAVE',
        b'fmt ', 16,
        1,  # PCM
        NUM_CHANNELS,
        SAMPLE_RATE,
        SAMPLE_RATE * NUM_CHANNELS * BYTES_PER_SAMPLE,
        NUM_CHANNELS * BYTES_PER_SAMPLE,
        BITS_PER_SAMPLE,
    )

    with open(output_path, 'wb') as f:
        f.write(header)
        f.write(struct.pack('<4sI', b'data', data_size))
        f.write(pcm_data)


def get_total_samples(pcm_data: bytes) -> int:
    """获取 PCM 数据的采样数"""
    return len(pcm_data) // BYTES_PER_SAMPLE


def concatenate(
    segments: list[Segment],
    output_path: str,
    fade_ms: int = 80,
) -> int:
    """
    按编排清单拼接音频（numpy 版）。
    
    Args:
        segments: 编排段列表
        output_path: 输出 WAV 路径
        fade_ms: 淡入淡出毫秒数
    
    Returns:
        总采样数
    """
    chunks: list[np.ndarray] = []

    for seg in segments:
        if seg.type == "narration":
            if seg.audio_path and os.path.exists(seg.audio_path):
                audio = read_wav_float32(seg.audio_path)
                audio = apply_fade(audio, fade_ms)
                chunks.append(audio)
            else:
                print(f"  ⚠ 旁白段未合成: {seg.text[:50]}...")

        elif seg.type == "silence":
            silence = generate_silence(seg.ms)
            chunks.append(silence)

        elif seg.type == "dialog_marker":
            pass  # 静音已在编排中

    if not chunks:
        raise ValueError("没有可拼接的音频段")

    # 合并所有 numpy 数组
    all_audio = np.concatenate(chunks)

    # 转 PCM 写入
    pcm = float32_to_pcm(all_audio)
    write_wav(output_path, pcm)
    total_samples = get_total_samples(pcm)

    duration = total_samples / SAMPLE_RATE
    print(f"  ✅ 拼接完成: {output_path}")
    print(f"  总采样数: {total_samples} ({duration:.1f}秒)")

    return total_samples
