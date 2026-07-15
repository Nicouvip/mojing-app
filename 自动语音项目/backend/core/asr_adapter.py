"""
ASR 适配器 - MiMo 语音识别适配 + 抽象接口

支持接入 MiMo-V2.5-ASR（Token Plan 模式），
也保留通用 HTTP 适配器以支持其他 ASR API。

MiMo ASR 接入要点:
- 兼容 OpenAI Chat Completions 格式
- Token Plan 地址: https://token-plan-cn.xiaomimimo.com/v1
- API Key 头: api-key (非 Authorization: Bearer)
- 模型: mimo-v2.5-asr
- 音频以 base64 data URL 传入 input_audio 字段
"""

from __future__ import annotations

import base64
import io
import json
import math
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional

import numpy as np
import requests
import soundfile as sf


# ─── 数据结构 ────────────────────────────────────────


@dataclass
class ASRSegment:
    """ASR 返回的一个片段"""
    text: str
    start: float        # 开始时间（秒）
    end: float          # 结束时间（秒）
    confidence: float = 0.0


@dataclass
class ASRResult:
    """ASR 识别结果"""
    text: str
    segments: list[ASRSegment] = field(default_factory=list)
    language: str = "zh"
    duration: float = 0.0
    raw_response: dict = field(default_factory=dict)


# ─── 抽象基类 ────────────────────────────────────────


class ASRAdapter(ABC):
    """ASR 适配器抽象基类"""

    @abstractmethod
    def transcribe(self, audio_data: np.ndarray, sr: int, **kwargs) -> ASRResult:
        ...

    @abstractmethod
    def get_name(self) -> str:
        ...


# ─── MiMo 专属适配器 ─────────────────────────────────


# Token Plan 默认地址
MIMO_DEFAULT_BASE_URL = "https://token-plan-cn.xiaomimimo.com/v1"
# 按量付费地址
MIMO_PAYG_BASE_URL = "https://api.xiaomimimo.com/v1"


class MimoASRAdapter(ASRAdapter):
    """
    MiMo-V2.5-ASR 适配器

    使用 OpenAI Chat Completions 兼容接口，
    音频以 base64 data URL 形式通过 input_audio 字段传入。
    """

    def __init__(self, api_key: str = "", base_url: str = "",
                 language: str = "zh"):
        self.api_key = api_key
        # Token Plan key 以 "tp-" 开头
        if not base_url:
            self.base_url = (MIMO_TOKEN_PLAN_BASE_URL
                             if api_key.startswith("tp-")
                             else MIMO_PAYG_BASE_URL)
        else:
            self.base_url = base_url.rstrip("/")
        self.language = language

    def get_name(self) -> str:
        return "MiMo-V2.5-ASR"

    def transcribe(self, audio_data: np.ndarray, sr: int,
                   **kwargs) -> ASRResult:
        """
        调用 MiMo ASR API 进行语音识别

        1. 音频重采样 → 编码为 WAV base64
        2. POST /v1/chat/completions
        3. 解析 OpenAI 格式响应
        4. 按字符比例估算分段时间戳
        """
        # 编码音频为 base64 data URL
        data_url = self._audio_to_data_url(audio_data, sr)

        # 构建请求体
        payload = {
            "model": "mimo-v2.5-asr",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_audio",
                            "input_audio": {
                                "data": data_url
                            }
                        }
                    ]
                }
            ],
            "asr_options": {
                "language": kwargs.get("language", self.language),
            },
        }

        headers = {
            "api-key": self.api_key,
            "Content-Type": "application/json",
        }

        url = f"{self.base_url}/chat/completions"
        audio_duration = len(audio_data) / sr

        try:
            resp = requests.post(
                url, headers=headers,
                data=json.dumps(payload),
                timeout=300,
            )
            resp.raise_for_status()
            result = resp.json()
            return self._parse_response(result, audio_data, sr)
        except requests.RequestException as e:
            raise RuntimeError(f"MiMo ASR 调用失败: {e}")

    def _audio_to_data_url(self, audio_data: np.ndarray, sr: int) -> str:
        """将音频数据编码为 base64 data URL"""
        buf = io.BytesIO()
        sf.write(buf, audio_data, sr, format="WAV", subtype="PCM_16")
        buf.seek(0)
        b64 = base64.b64encode(buf.read()).decode("utf-8")
        return f"data:audio/wav;base64,{b64}"

    def _parse_response(self, data: dict,
                         audio_data: np.ndarray,
                         sr: int) -> ASRResult:
        """
        解析 OpenAI Chat Completions 格式响应

        MiMo ASR 不返回词级时间戳，
        使用 VAD + DTW 强制对齐获得真实时间戳。
        """
        from .forced_align import forced_align

        full_text = ""
        try:
            full_text = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError):
            full_text = ""

        # 使用 VAD + 文本分配做真实对齐（取代字符比例估算）
        aligned_segments = forced_align(full_text, audio_data, sr)
        segments = [
            ASRSegment(text=s["text"], start=s["start"],
                       end=s["end"], confidence=s.get("confidence", 0.0))
            for s in aligned_segments
        ]

        return ASRResult(
            text=full_text,
            segments=segments,
            language=self.language,
            duration=len(audio_data) / sr,
            raw_response=data,
        )

    def _estimate_segments(self, text: str, audio_duration: float) -> list[ASRSegment]:
        """
        根据文本和音频时长估算逐句时间戳

        策略：
        1. 按句号/问号/感叹号/换行切分句子
        2. 按字符数比例分配时间
        3. 中文约 3-4 字/秒，英文约 3-5 词/秒
        """
        import re
        if not text.strip() or audio_duration <= 0:
            return []

        # 按标点切分
        sentences = re.split(r'[。！？\n;；]', text)
        sentences = [s.strip() for s in sentences if s.strip()]

        if not sentences:
            # 如果没有标点，整段作为一个 segment
            return [ASRSegment(text=text, start=0.0, end=audio_duration)]

        # 计算总字符权重（中文1字符≈1单位，英文1词≈2单位）
        total_weight = 0
        weights = []
        for s in sentences:
            # 中文字符 + 英文单词*2
            cn_chars = len(re.findall(r'[\u4e00-\u9fff]', s))
            en_words = len(re.findall(r'[a-zA-Z]+', s))
            weight = cn_chars + en_words * 2 + len(s) * 0.3  # 标点符号的权重
            weights.append(max(weight, 1))
            total_weight += weight

        segments = []
        current_time = 0.0
        for i, s in enumerate(sentences):
            seg_duration = (weights[i] / total_weight) * audio_duration
            end_time = min(current_time + seg_duration, audio_duration)
            segments.append(ASRSegment(
                text=s,
                start=round(current_time, 3),
                end=round(end_time, 3),
            ))
            current_time = end_time

        return segments


# ─── 通用 HTTP 适配器（备用） ────────────────────────


class HttpASRAdapter(ASRAdapter):
    """
    通用 HTTP ASR API 适配器（备用方案）
    兼容 OpenAI Whisper API 格式 (POST file → { text, segments })
    """

    def __init__(self, api_url: str = "", api_key: str = "",
                 model: str = "", language: str = "zh",
                 extra_params: Optional[dict] = None):
        self.api_url = api_url
        self.api_key = api_key
        self.model = model
        self.language = language
        self.extra_params = extra_params or {}

    def get_name(self) -> str:
        return "HTTP ASR API"

    def transcribe(self, audio_data: np.ndarray, sr: int, **kwargs) -> ASRResult:
        buf = io.BytesIO()
        sf.write(buf, audio_data, sr, format="WAV", subtype="PCM_16")
        buf.seek(0)

        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        files = {"file": ("audio.wav", buf.read(), "audio/wav")}
        data = {
            "model": self.model or "default",
            "language": kwargs.get("language", self.language),
            "response_format": "json",
            "timestamp_granularities": ["segment"],
            **self.extra_params,
            **kwargs,
        }

        try:
            resp = requests.post(
                self.api_url, headers=headers, files=files, data=data, timeout=300
            )
            resp.raise_for_status()
            result = resp.json()
            return self._parse_whisper_response(result)
        except requests.RequestException as e:
            raise RuntimeError(f"ASR API 调用失败: {e}")

    def _parse_whisper_response(self, data: dict) -> ASRResult:
        full_text = data.get("text", data.get("transcript", ""))
        segments_raw = data.get("segments", [])
        duration = data.get("duration", 0.0)

        segments = []
        for seg in segments_raw:
            start = seg.get("start", seg.get("begin", 0.0))
            end = seg.get("end", seg.get("finish", start))
            text = seg.get("text", seg.get("token", ""))
            confidence = seg.get("confidence", seg.get("prob", 0.0))
            if isinstance(text, str) and text.strip():
                segments.append(ASRSegment(
                    text=text.strip(),
                    start=float(start),
                    end=float(end),
                    confidence=float(confidence),
                ))

        return ASRResult(
            text=full_text,
            segments=segments,
            language=data.get("language", self.language),
            duration=float(duration or 0),
            raw_response=data,
        )


# ─── 工厂函数 ────────────────────────────────────────

MIMO_TOKEN_PLAN_BASE_URL = "https://token-plan-cn.xiaomimimo.com/v1"
MIMO_PAYG_BASE_URL = "https://api.xiaomimimo.com/v1"


def create_asr_adapter(config: dict) -> ASRAdapter:
    """
    根据配置自动创建合适的 ASR 适配器

    config 字段:
        provider: "mimo" | "http" (默认自动检测)
        api_key: API 密钥
        base_url: API 地址（mimo 模式下可自动推断）
        api_url: HTTP 模式下的完整 API 地址
        model: 模型名称
        language: 语言
        extra_params: 额外参数
    """
    provider = config.get("provider", "auto")
    api_key = config.get("api_key", "")

    # 自动检测: tp- 开头的 Key → MiMo Token Plan
    if provider == "auto":
        if api_key.startswith("tp-"):
            provider = "mimo"
        else:
            provider = "http"

    if provider == "mimo":
        return MimoASRAdapter(
            api_key=api_key,
            base_url=config.get("base_url", ""),
            language=config.get("language", "zh"),
        )
    else:
        return HttpASRAdapter(
            api_url=config.get("api_url", ""),
            api_key=api_key,
            model=config.get("model", ""),
            language=config.get("language", "zh"),
            extra_params=config.get("extra_params", {}),
        )
