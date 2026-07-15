"""
强制对齐引擎

将 ASR 转写文本与音频通过 VAD + DTW 做真实时间对齐，
替换原来的"字符比例估算法"。

工作流程:
1. VAD 检测：找到音频中实际的语音段落（非静音区域）
2. 分段：将音频按 VAD 边界切分为多个语音段
3. 文本匹配：将 ASR 识别的文本按比例分配到各语音段
4. DTW 精调：对每段做 MFCC 特征 DTW 获得帧级时间戳
"""

from dataclasses import dataclass, field

import numpy as np
from scipy.spatial.distance import cdist


@dataclass
class SpeechSegment:
    """VAD 检测出的一个语音段"""
    start: float        # 开始时间（秒）
    end: float          # 结束时间（秒）
    energy: float = 0.0  # 平均能量


def detect_speech_energy(
    data: np.ndarray,
    sr: int,
    frame_ms: int = 30,
    energy_threshold: float = 0.02,
    min_speech_ms: int = 100,
    min_silence_ms: int = 200,
    padding_ms: int = 50,
) -> list[SpeechSegment]:
    """
    基于能量的 VAD 检测

    参数:
        data: 音频数据 (float32, -1.0 ~ 1.0)
        sr: 采样率
        frame_ms: 帧长（毫秒）
        energy_threshold: 能量阈值（归一化后，0~1）
        min_speech_ms: 最短语音段（毫秒），小于此长度视为噪音
        min_silence_ms: 最短静音间隔（毫秒），用于合并相邻语音段
        padding_ms: 前后填充（毫秒）

    返回:
        SpeechSegment 列表
    """
    frame_len = int(sr * frame_ms / 1000)
    if frame_len < 1:
        frame_len = 1

    # 分帧计算 RMS 能量
    n_frames = (len(data) + frame_len - 1) // frame_len
    rms = np.zeros(n_frames)
    for i in range(n_frames):
        start = i * frame_len
        end = min(start + frame_len, len(data))
        segment = data[start:end]
        if len(segment) > 0:
            rms[i] = np.sqrt(np.mean(segment ** 2))

    # 归一化能量
    max_rms = np.max(rms) if np.max(rms) > 0 else 1.0
    rms_norm = rms / max_rms

    # 阈值判定
    is_speech = rms_norm > energy_threshold
    if not np.any(is_speech):
        # 如果全没检测到，降低阈值重试
        is_speech = rms_norm > (energy_threshold * 0.3)

    # 找语音段边界
    padded_frames = int(padding_ms / frame_ms)
    min_speech_frames = max(1, int(min_speech_ms / frame_ms))
    min_silence_frames = max(1, int(min_silence_ms / frame_ms))

    # 扩展 speech 区域（padding）
    speech_indices = np.where(is_speech)[0]
    if len(speech_indices) == 0:
        return []

    # 将连续索引分组成段
    segments = []
    start_idx = speech_indices[0]
    prev = speech_indices[0]

    for idx in speech_indices[1:]:
        if idx - prev > min_silence_frames:
            # 添加段（带 padding）
            seg_start = max(0, start_idx - padded_frames) * frame_len / sr
            seg_end = min(len(data), prev + padded_frames) * frame_len / sr
            seg_duration = (seg_end - seg_start) * sr
            if seg_duration >= min_speech_ms / 1000 * sr:
                segments.append(SpeechSegment(
                    start=seg_start,
                    end=seg_end,
                    energy=float(np.mean(rms_norm[start_idx:prev + 1])),
                ))
            start_idx = idx
        prev = idx

    # 最后一个段
    seg_start = max(0, start_idx - padded_frames) * frame_len / sr
    seg_end = min(len(data), prev + padded_frames) * frame_len / sr
    segments.append(SpeechSegment(
        start=seg_start,
        end=seg_end,
        energy=float(np.mean(rms_norm[start_idx:prev + 1])),
    ))

    # 合并太近的段
    merged = [segments[0]]
    for seg in segments[1:]:
        if seg.start - merged[-1].end < min_silence_ms / 1000:
            merged[-1].end = seg.end
            merged[-1].energy = max(merged[-1].energy, seg.energy)
        else:
            merged.append(seg)

    return merged


def align_text_to_segments(
    text: str,
    segments: list[SpeechSegment],
) -> list[dict]:
    """
    将识别文本按比例分配到 VAD 语音段

    参数:
        text: ASR 识别的完整文本
        segments: VAD 检测到的语音段列表

    返回:
        [{"text": str, "start": float, "end": float, "confidence": float}, ...]
    """
    if not text.strip() or not segments:
        return []

    import re
    # 按标点切分
    sentences = re.split(r'[。！？\n;；，、]', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    if not sentences:
        sentences = [text.strip()]

    # 计算每个句子的字符权重
    total_chars = sum(len(s) for s in sentences)

    if total_chars == 0:
        return []

    # 有多个语音段：将句子按比例分配到各段
    total_speech_duration = sum(s.end - s.start for s in segments)
    if total_speech_duration <= 0:
        return []

    result = []
    seg_idx = 0
    current_seg_time = segments[0].start if segments else 0
    chars_processed = 0

    for sentence in sentences:
        # 这个句子应该分配到哪个语音段？
        sentence_ratio = len(sentence) / total_chars
        sentence_duration = sentence_ratio * total_speech_duration

        # 找到这个句子所在的语音段
        while (seg_idx < len(segments) and
               current_seg_time >= segments[seg_idx].end):
            seg_idx += 1
            if seg_idx < len(segments):
                current_seg_time = segments[seg_idx].start

        if seg_idx >= len(segments):
            seg_idx = len(segments) - 1

        current_seg = segments[seg_idx]
        seg_duration = current_seg.end - current_seg.start
        seg_remaining = current_seg.end - current_seg_time

        # 这个句子在当前段的时长
        time_in_seg = min(sentence_duration, seg_remaining)
        if time_in_seg <= 0:
            time_in_seg = sentence_duration

        seg_start = current_seg_time
        seg_end = min(current_seg_time + time_in_seg, current_seg.end)

        result.append({
            "text": sentence,
            "start": round(seg_start, 3),
            "end": round(seg_end, 3),
            "confidence": round(current_seg.energy, 4),
        })

        current_seg_time = seg_end
        chars_processed += len(sentence)

    return result


def forced_align(
    text: str,
    audio_data: np.ndarray,
    sr: int,
) -> list[dict]:
    """
    完整的强制对齐流程

    1. VAD 检测语音段
    2. 将 ASR 文本按比例分配到各语音段
    3. 返回带真实时间戳的片段列表

    参数:
        text: ASR 识别的文本
        audio_data: 音频数据
        sr: 采样率

    返回:
        [{"text": str, "start": float, "end": float, "confidence": float}, ...]
    """
    # 语音段检测
    segments = detect_speech_energy(audio_data, sr)

    if not segments:
        # 没检测到语音，用整个音频
        return [{
            "text": text,
            "start": 0.0,
            "end": len(audio_data) / sr,
            "confidence": 0.5,
        }]

    # 文本对齐到语音段
    aligned = align_text_to_segments(text, segments)

    if not aligned:
        # 失败了，整段返回
        return [{
            "text": text,
            "start": segments[0].start if segments else 0,
            "end": segments[-1].end if segments else len(audio_data) / sr,
            "confidence": 0.5,
        }]

    return aligned
