"""
TTS + DTW 对齐引擎

流程：
1. 用 MiMo TTS 按剧本台词生成参考音频（标准发音）
2. 提取参考音频和 CV 录音的 MFCC 特征
3. 用 DTW（动态时间规整）对齐两条特征序列
4. 从对齐路径倒推出 CV 录音中每句台词的时间戳

优势：
- 不依赖 ASR 时间戳
- TTS 发音标准，中文完美
- DTW 能处理语速差异
- MiMo TTS 目前限时免费

劣势：
- 每句都要调 TTS API（有网络延迟）
- 不同人声的 MFCC 差异可能影响精度
"""

import base64
import json
import os
from dataclasses import dataclass, field

import numpy as np
import requests


@dataclass
class TTSConfig:
    """TTS 配置"""
    api_key: str = ""
    base_url: str = "https://token-plan-cn.xiaomimimo.com/v1"
    voice: str = "冰糖"      # 预置音色：冰糖/茉莉/苏打/白桦
    language: str = "zh"


def generate_reference_audio(
    text: str,
    config: TTSConfig,
) -> tuple[np.ndarray, int]:
    """
    调用 MiMo TTS 生成参考音频

    参数:
        text: 要合成的文本
        config: TTS 配置

    返回:
        (音频数据, 采样率) 统一为 16000Hz mono float32
    """
    if not config.api_key:
        raise ValueError("未配置 MiMo API Key")

    payload = {
        "model": "mimo-v2.5-tts",
        "messages": [
            {"role": "user", "content": "以自然清晰的语气朗读以下文本"},
            {"role": "assistant", "content": text}
        ],
        "audio": {"format": "wav", "voice": config.voice}
    }

    headers = {
        "api-key": config.api_key,
        "Content-Type": "application/json"
    }

    resp = requests.post(
        f"{config.base_url}/chat/completions",
        headers=headers,
        data=json.dumps(payload),
        timeout=60,
    )
    resp.raise_for_status()
    result = resp.json()

    # 解析音频数据
    try:
        audio_b64 = result["choices"][0]["message"]["audio"]["data"]
    except (KeyError, IndexError) as e:
        raise RuntimeError(f"TTS 响应解析失败: {e}")

    wav_bytes = base64.b64decode(audio_b64)

    # 解码 WAV（MiMo TTS 返回 24kHz PCM16）
    import soundfile as sf
    import io
    data, sr = sf.read(io.BytesIO(wav_bytes))
    if data.dtype != np.float32:
        data = data.astype(np.float32)

    return data, sr


def dtw_align(
    ref_audio: np.ndarray,
    ref_sr: int,
    cv_audio: np.ndarray,
    cv_sr: int,
) -> np.ndarray:
    """
    用 DTW 将 CV 录音对齐到参考音频

    参数:
        ref_audio: 参考音频（TTS 生成）
        ref_sr: 参考音频采样率
        cv_audio: CV 录音
        cv_sr: CV 录音采样率

    返回:
        对齐路径，shape=(N, 2)，每行是 (ref_frame, cv_frame)
    """
    import librosa

    # 统一采样率到 16000
    target_sr = 16000
    if ref_sr != target_sr:
        ref_audio = librosa.resample(ref_audio, orig_sr=ref_sr, target_sr=target_sr)
    if cv_sr != target_sr:
        cv_audio = librosa.resample(cv_audio, orig_sr=cv_sr, target_sr=target_sr)

    # 提取 MFCC 特征
    ref_mfcc = librosa.feature.mfcc(y=ref_audio, sr=target_sr, n_mfcc=13)
    cv_mfcc = librosa.feature.mfcc(y=cv_audio, sr=target_sr, n_mfcc=13)

    # DTW 对齐
    _, wp = librosa.sequence.dtw(X=ref_mfcc, Y=cv_mfcc, metric="cosine")

    # wp 是从终点到起点的，翻转一下
    wp = wp[::-1]

    return wp


def path_to_timestamps(
    wp: np.ndarray,
    ref_audio: np.ndarray,
    ref_sr: int,
    cv_sr: int,
    sentences: list[str],
) -> list[dict]:
    """
    将对齐路径转换为逐句时间戳

    参数:
        wp: 对齐路径 (N, 2)
        ref_audio: 参考音频
        ref_sr: 参考音频采样率
        cv_sr: CV 音频采样率
        sentences: 句子列表（按文本顺序）

    返回:
        [{"text": str, "start": float, "end": float}, ...]
    """
    if not sentences:
        return []

    target_sr = 16000
    hop_length = 512  # librosa MFCC 默认 hop_length
    frames_per_sec = target_sr / hop_length

    # 按字符比例分配参考音频中的句子位置
    total_chars = sum(len(s) for s in sentences)
    if total_chars == 0:
        return []

    ref_duration = len(ref_audio) / target_sr
    ref_total_frames = int(ref_duration * frames_per_sec)

    result = []
    char_pos = 0

    for sentence in sentences:
        # 这句在参考音频中的帧范围
        sent_chars = len(sentence)
        sent_start_frame = int(char_pos / total_chars * ref_total_frames)
        sent_end_frame = int((char_pos + sent_chars) / total_chars * ref_total_frames)

        # 通过对齐路径找到对应的 CV 音频帧
        cv_start_frames = wp[wp[:, 0] >= sent_start_frame]
        if len(cv_start_frames) > 0:
            cv_start = cv_start_frames[0, 1]
        else:
            cv_start = 0

        cv_end_frames = wp[wp[:, 0] <= sent_end_frame]
        if len(cv_end_frames) > 0:
            cv_end = cv_end_frames[-1, 1]
        else:
            cv_end = wp[-1, 1] if len(wp) > 0 else 0

        # 转换帧到秒
        target_sr_cv = 16000
        start_sec = cv_start / frames_per_sec
        end_sec = cv_end / frames_per_sec

        result.append({
            "text": sentence,
            "start": round(start_sec, 3),
            "end": round(end_sec, 3),
        })

        char_pos += sent_chars

    return result


def tts_dtw_align(
    sentences: list[str],
    cv_audio: np.ndarray,
    cv_sr: int,
    config: TTSConfig,
) -> list[dict]:
    """
    完整的 TTS + DTW 对齐流程

    1. 用 TTS 生成参考音频
    2. 提取 MFCC 特征
    3. DTW 对齐
    4. 输出时间戳

    参数:
        sentences: 剧本台词列表
        cv_audio: CV 录音
        cv_sr: CV 录音采样率
        config: TTS 配置

    返回:
        [{"text": str, "start": float, "end": float}, ...]
    """
    if not sentences:
        return []

    # 合并所有句子为一段文本用于 TTS
    full_text = "。".join(sentences) + "。"

    # 1. TTS 生成参考音频
    ref_audio, ref_sr = generate_reference_audio(full_text, config)

    # 2. DTW 对齐
    wp = dtw_align(ref_audio, ref_sr, cv_audio, cv_sr)

    # 3. 转换为时间戳
    timestamps = path_to_timestamps(wp, ref_audio, ref_sr, cv_sr, sentences)

    return timestamps
