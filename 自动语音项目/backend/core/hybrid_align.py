"""
混合对齐引擎

流程:
1. MiMo ASR → 高精度中文文字识别
2. faster-whisper → 词级时间戳（本地轻量模型）
3. 合并：将 MiMo 的识别文字映射到 whisper 的时间戳上
4. 输出带精确时间戳的逐句分段

优势：MiMo认字准 + Whisper时间戳准 = 又快又准
"""

import os
import re
from dataclasses import dataclass, field
from typing import Optional

import numpy as np

# 模型缓存到 D 盘
os.environ.setdefault("HF_HOME", "D:/huggingface_cache")
os.environ.setdefault("XDG_CACHE_HOME", "D:/huggingface_cache")


@dataclass
class AlignedWord:
    """对齐后的词"""
    text: str
    start: float          # 秒
    end: float            # 秒
    confidence: float = 0.0


@dataclass
class AlignedSegment:
    """对齐后的句子段"""
    text: str
    words: list[AlignedWord] = field(default_factory=list)
    start: float = 0.0
    end: float = 0.0
    confidence: float = 0.0


def _get_whisper_timestamps(
    audio_data: np.ndarray,
    sr: int,
    model_size: str = "tiny",
    language: str = "zh",
) -> list[dict]:
    """
    用 faster-whisper 获取词级时间戳

    参数:
        audio_data: 音频数据 (float32)
        sr: 采样率
        model_size: 模型大小 (tiny/base/small/medium/large)
        language: 语言代码

    返回:
        [{"word": str, "start": float, "end": float, "probability": float}, ...]
    """
    from faster_whisper import WhisperModel

    # 确保数据类型为 float32（Whisper 要求）
    if audio_data.dtype != np.float32:
        audio_data = audio_data.astype(np.float32)

    # tiny 模型 ~150MB，CPU 上跑很快
    model = WhisperModel(
        model_size,
        device="cpu",
        compute_type="int8",
        download_root="D:/huggingface_cache/whisper",
    )

    segments, info = model.transcribe(
        audio_data,
        language=language,
        beam_size=3,
        word_timestamps=True,
        vad_filter=True,
    )

    words = []
    for segment in segments:
        if segment.words:
            for word in segment.words:
                words.append({
                    "word": word.word.strip(),
                    "start": word.start,
                    "end": word.end,
                    "probability": word.probability,
                })
        else:
            # 没有词级时间戳，用段级
            words.append({
                "word": segment.text.strip(),
                "start": segment.start,
                "end": segment.end,
                "probability": segment.avg_logprob,
            })

    return words


def merge_mimo_with_whisper(
    mimo_text: str,
    whisper_words: list[dict],
) -> list[AlignedSegment]:
    """
    将 MiMo 的识别文字与 Whisper 的词级时间戳合并

    策略：
    1. MiMo 的文本更准确，用它作为最终文字
    2. Whisper 的时间戳更准，用它作为时间位置
    3. 按标点切分 MiMo 文本为句子
    4. 将 Whisper 的词分配给各个句子
    """
    if not mimo_text.strip() or not whisper_words:
        return []

    # 按标点切分 MiMo 文本
    sentences = re.split(r'[。！？\n；;，、]', mimo_text)
    sentences = [s.strip() for s in sentences if s.strip()]
    if not sentences:
        sentences = [mimo_text.strip()]

    # 构建 sentence -> words 的映射
    result = []
    word_idx = 0
    total_words = len(whisper_words)

    for sentence in sentences:
        if not sentence.strip():
            continue

        # 简化文本用于匹配
        sentence_clean = re.sub(r'[^\w\u4e00-\u9fff]', '', sentence)
        if not sentence_clean:
            continue

        # 从当前 word_idx 开始，尽量匹配这段句子的字数
        matched_words = []
        matched_chars = 0
        target_chars = len(sentence_clean)
        start_idx = word_idx

        while word_idx < total_words and matched_chars < target_chars:
            w = whisper_words[word_idx]
            w_clean = re.sub(r'[^\w\u4e00-\u9fff]', '', w["word"])
            matched_chars += len(w_clean)
            matched_words.append(w)
            word_idx += 1

        # 如果匹配到的词太少，多取几个
        if len(matched_words) < 1 and word_idx < total_words:
            matched_words.append(whisper_words[word_idx])
            word_idx += 1

        if not matched_words:
            continue

        # 计算时间范围
        seg_start = matched_words[0]["start"]
        seg_end = matched_words[-1]["end"]
        avg_conf = np.mean([w.get("probability", 0) for w in matched_words]) if matched_words else 0

        aligned_words = [
            AlignedWord(
                text=w["word"],
                start=w["start"],
                end=w["end"],
                confidence=w.get("probability", 0),
            )
            for w in matched_words
        ]

        result.append(AlignedSegment(
            text=sentence,
            words=aligned_words,
            start=seg_start,
            end=seg_end,
            confidence=float(avg_conf),
        ))

    return result


def hybrid_align(
    mimo_text: str,
    audio_data: np.ndarray,
    sr: int,
) -> list[dict]:
    """
    混合对齐主入口

    参数:
        mimo_text: MiMo ASR 返回的识别文本
        audio_data: 音频数据
        sr: 采样率

    返回:
        [{"text": str, "start": float, "end": float, "confidence": float}, ...]
    """
    if not mimo_text.strip():
        return [{
            "text": "",
            "start": 0.0,
            "end": len(audio_data) / sr,
            "confidence": 0.0,
        }]

    try:
        # 1. Whisper 获取时间戳
        whisper_words = _get_whisper_timestamps(audio_data, sr)
    except Exception as e:
        print(f"⚠️ Whisper 对齐失败，回退到 VAD 方案: {e}")
        # 回退到已有的 VAD 方案
        from .forced_align import forced_align
        return forced_align(mimo_text, audio_data, sr)

    if not whisper_words:
        print("⚠️ Whisper 未返回词级时间戳，回退到 VAD 方案")
        from .forced_align import forced_align
        return forced_align(mimo_text, audio_data, sr)

    # 2. 合并
    segments = merge_mimo_with_whisper(mimo_text, whisper_words)

    if not segments:
        # 合并失败，回退
        return [{
            "text": mimo_text,
            "start": 0.0,
            "end": whisper_words[-1]["end"] if whisper_words else len(audio_data) / sr,
            "confidence": 0.5,
        }]

    return [
        {
            "text": s.text,
            "start": round(s.start, 3),
            "end": round(s.end, 3),
            "confidence": round(s.confidence, 4),
        }
        for s in segments
    ]
