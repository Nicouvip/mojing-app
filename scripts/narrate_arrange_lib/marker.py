"""
AU 标记写入模块 — marker.py

在 WAV 文件中写入 AU 可识别的 cue 标记。
基于已有的成熟方案（已验证通过）。
"""

import struct
import os
from pathlib import Path

from .parser import Segment, DialogMarker
from .concatenator import SAMPLE_RATE


def detect_marker_positions(
    wav_path: str,
) -> list[dict]:
    """
    从编排文件中读取标记位置信息。
    由于我们直接编排时知道标记位置，无需 silencedetect。
    此函数从 WAV 文件的标记信息结构推算。
    
    简化版：直接计算采样位置。
    完整版应该读取编排清单并计算每个标记在最终音频中的采样位置。
    """
    # 简化版返回空，实际标记位置由 add_markers_to_wav 直接计算
    return []


def add_markers_to_wav(
    wav_path: str,
    segments: list[Segment],
    silence_ms: int = 800,
    fade_ms: int = 80,
):
    """
    在已拼接的 WAV 文件中写入 AU cue 标记。
    
    通过重新遍历编排清单，计算每个 DialogMarker
    在最终音频中的采样位置，然后写入标记。
    """
    if not os.path.exists(wav_path):
        raise FileNotFoundError(f"WAV 文件不存在: {wav_path}")
    
    # 读取现有 WAV 数据
    with open(wav_path, 'rb') as f:
        wav_data = f.read()
    
    # 计算标记位置
    # 重新走一遍和 concatenator 相同的逻辑来计算采样位置
    markers = _calculate_marker_positions(segments, silence_ms, fade_ms)
    
    if not markers:
        print("  ⚠ 没有需要标记的对话位")
        return
    
    # 写入标记
    new_wav = _write_cue_markers(wav_data, markers)
    
    # 写回文件
    with open(wav_path, 'wb') as f:
        f.write(new_wav)
    
    print(f"  ✅ 已写入 {len(markers)} 个 cue 标记:")
    for m in markers:
        time_sec = m['sample_pos'] / SAMPLE_RATE
        print(f"     {m['label']} @ {time_sec:.2f}s — {m['note']}")


def _calculate_marker_positions(
    segments: list[Segment],
    silence_ms: int = 800,
    fade_ms: int = 80,
) -> list[dict]:
    """计算每个 DialogMarker 在最终音频中的采样位置"""
    markers = []
    current_sample = 0
    
    for seg in segments:
        if seg.type == "narration":
            if seg.audio_path and os.path.exists(seg.audio_path):
                # 读取 WAV 获取 PCM 长度
                with open(seg.audio_path, 'rb') as f:
                    header = f.read(44)
                    data_size = struct.unpack('<I', header[40:44])[0]
                    pcm_samples = data_size // 2  # 16bit
                current_sample += pcm_samples
            # 旁白段标记在段尾（标记插入点是旁白结束后）
            
        elif seg.type == "silence":
            silence_samples = int(SAMPLE_RATE * seg.ms / 1000)
            current_sample += silence_samples
            
        elif seg.type == "dialog_marker":
            # DialogMarker 的采样位置 = 当前累计位置
            markers.append({
                'label': seg.label,
                'note': seg.note,
                'sample_pos': current_sample,
            })
    
    return markers


def _write_cue_markers(wav_data: bytes, markers: list[dict]) -> bytes:
    """
    在 WAV 文件末尾追加 cue 和 LIST/adtl 块。
    
    标记结构（AU 标准）：
      cue 块:     标记数量 + 每个标记{ID, 采样位置, "data", 0, 0, 采样位置}
      LIST/adtl: labl 子块{ID, 标记名称}
    """
    # 解析现有 WAV 块
    pos = 12  # 跳过 RIFF + size + WAVE
    chunks = []
    
    while pos < len(wav_data) - 8:
        cid = wav_data[pos:pos+4]
        csize = struct.unpack('<I', wav_data[pos+4:pos+8])[0]
        chunk_data = wav_data[pos:pos+8+csize]
        
        if cid == b'data':
            # 修复 data 块大小
            real_size = len(wav_data) - (pos + 8)
            if real_size != csize:
                chunk_data = struct.pack('<4sI', b'data', real_size)
                chunk_data += wav_data[pos+8:pos+8+real_size]
            chunks.append(chunk_data)
            break
        else:
            chunks.append(chunk_data)
        
        pos += 8 + csize
        if pos % 2:
            pos += 1
    
    # 构建 cue 块
    num = len(markers)
    cue_data = struct.pack('<I', num)
    for i, m in enumerate(markers):
        cue_data += struct.pack(
            '<II4sIII',
            i + 1,                    # dwName（标记ID）
            m['sample_pos'],          # dwPosition（采样位置）
            b'data',                  # fccChunk
            0,                        # dwChunkStart
            0,                        # dwBlockStart
            m['sample_pos'],          # dwSampleOffset
        )
    cue_chunk = struct.pack('<4sI', b'cue ', len(cue_data)) + cue_data
    if len(cue_chunk) % 2:
        cue_chunk += b'\x00'
    
    # 构建 LIST/adtl（只加 labl，不加 note）
    adtl_data = b'adtl'
    for i, m in enumerate(markers):
        # 标记名称：用 label 即可
        name_bytes = m['label'].encode('utf-8') + b'\x00'
        labl = struct.pack('<4sI', b'labl', len(name_bytes) + 4)
        labl += struct.pack('<I', i + 1) + name_bytes
        if len(labl) % 2:
            labl += b'\x00'
        adtl_data += labl
    
    list_chunk = struct.pack('<4sI', b'LIST', len(adtl_data)) + adtl_data
    if len(list_chunk) % 2:
        list_chunk += b'\x00'
    
    # 组装：RIFF 头 + 原始块 + cue + LIST
    new_wav = b'RIFF' + struct.pack('<I', 0) + b'WAVE'
    for c in chunks:
        new_wav += c
    new_wav += cue_chunk + list_chunk
    new_wav = new_wav[:4] + struct.pack('<I', len(new_wav) - 8) + new_wav[8:]
    
    return new_wav
