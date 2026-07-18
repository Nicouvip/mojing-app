"""
音频拼接模块 — concatenator.py

按编排清单顺序拼接音频：
- 旁白段 → 读取合成好的 WAV
- 对话标记位 → 插入静音（≥800ms）
- 段间 80ms 淡入淡出
- 输出完整 WAV
"""

import struct
import os
from pathlib import Path

from .parser import Segment, NarrationSegment, DialogMarker, SilenceSegment


# 音频参数
SAMPLE_RATE = 24000  # 豆包默认采样率
BITS_PER_SAMPLE = 16
NUM_CHANNELS = 1      # 先单声道，后期可转立体声
BYTES_PER_SAMPLE = BITS_PER_SAMPLE // 8


def generate_silence(duration_ms: int) -> bytes:
    """生成长度为 duration_ms 的静音 PCM 数据（单声道 16bit）"""
    num_samples = int(SAMPLE_RATE * duration_ms / 1000)
    return b'\x00' * (num_samples * BYTES_PER_SAMPLE)


def read_wav_pcm(wav_path: str) -> bytes:
    """读取 WAV 文件的 PCM 数据（跳过文件头 44 字节）"""
    with open(wav_path, 'rb') as f:
        header = f.read(44)
        # 验证 RIFF/WAVE
        if header[:4] != b'RIFF' or header[8:12] != b'WAVE':
            raise ValueError(f"不是有效的 WAV 文件: {wav_path}")
        return f.read()


def apply_fade(pcm_data: bytes, fade_ms: int = 80) -> bytes:
    """
    对 PCM 数据应用淡入淡出。
    淡入：前 fade_ms 毫秒
    淡出：后 fade_ms 毫秒
    """
    fade_samples = int(SAMPLE_RATE * fade_ms / 1000)
    if fade_samples * 2 > len(pcm_data):
        return pcm_data  # 太短了不做
    
    samples = list(struct.unpack('<' + 'h' * (len(pcm_data) // 2), pcm_data))
    
    # 淡入
    for i in range(fade_samples):
        samples[i] = int(samples[i] * (i / fade_samples))
    
    # 淡出
    for i in range(fade_samples):
        idx = len(samples) - 1 - i
        samples[idx] = int(samples[idx] * (i / fade_samples))
    
    return struct.pack('<' + 'h' * len(samples), *samples)


def apply_fade_in(pcm_data: bytes, fade_ms: int = 80) -> bytes:
    """仅淡入"""
    fade_samples = int(SAMPLE_RATE * fade_ms / 1000)
    if fade_samples * 2 > len(pcm_data):
        return pcm_data
    samples = list(struct.unpack('<' + 'h' * (len(pcm_data) // 2), pcm_data))
    for i in range(fade_samples):
        samples[i] = int(samples[i] * (i / fade_samples))
    return struct.pack('<' + 'h' * len(samples), *samples)


def apply_fade_out(pcm_data: bytes, fade_ms: int = 80) -> bytes:
    """仅淡出"""
    fade_samples = int(SAMPLE_RATE * fade_ms / 1000)
    if fade_samples * 2 > len(pcm_data):
        return pcm_data
    samples = list(struct.unpack('<' + 'h' * (len(pcm_data) // 2), pcm_data))
    for i in range(fade_samples):
        idx = len(samples) - 1 - i
        samples[idx] = int(samples[idx] * (i / fade_samples))
    return struct.pack('<' + 'h' * len(samples), *samples)


def write_wav(output_path: str, pcm_data: bytes):
    """将 PCM 数据写入 WAV 文件"""
    data_size = len(pcm_data)
    file_size = 36 + data_size
    
    header = struct.pack(
        '<4sI4s4sIHHIIHH',
        b'RIFF', file_size, b'WAVE',
        b'fmt ', 16,               # chunk id + size
        1,                         # PCM 格式
        NUM_CHANNELS,              # 声道数
        SAMPLE_RATE,               # 采样率
        SAMPLE_RATE * NUM_CHANNELS * BYTES_PER_SAMPLE,  # 字节率
        NUM_CHANNELS * BYTES_PER_SAMPLE,  # 块对齐
        BITS_PER_SAMPLE,           # 位深
    )
    
    with open(output_path, 'wb') as f:
        f.write(header)
        f.write(struct.pack('<4sI', b'data', data_size))
        f.write(pcm_data)


def get_sample_position(pcm_data: bytes) -> int:
    """获取 PCM 数据的采样位置（标记写入用）"""
    return len(pcm_data) // (NUM_CHANNELS * BYTES_PER_SAMPLE)


def concatenate(
    segments: list[Segment],
    output_path: str,
    fade_ms: int = 80,
) -> int:
    """
    按编排清单拼接音频。
    
    Args:
        segments: 编排段列表
        output_path: 输出 WAV 路径
        fade_ms: 淡入淡出毫秒数
    
    Returns:
        总采样数（后续标记写入需要）
    """
    all_pcm = b''
    
    for i, seg in enumerate(segments):
        if seg.type == "narration":
            if seg.audio_path and os.path.exists(seg.audio_path):
                pcm = read_wav_pcm(seg.audio_path)
                # 段首淡入，段尾淡出
                pcm = apply_fade(pcm, fade_ms)
                all_pcm += pcm
            else:
                print(f"  ⚠ 旁白段未合成: {seg.text[:50]}...")
        
        elif seg.type == "silence":
            silence = generate_silence(seg.ms)
            all_pcm += silence
        
        elif seg.type == "dialog_marker":
            # 对话标记本身不产生音频，静音已在编排中
            pass
    
    # 写入 WAV
    write_wav(output_path, all_pcm)
    total_samples = get_sample_position(all_pcm)
    
    print(f"  ✅ 拼接完成: {output_path}")
    print(f"  总采样数: {total_samples} ({total_samples / SAMPLE_RATE:.1f}秒)")
    
    return total_samples
