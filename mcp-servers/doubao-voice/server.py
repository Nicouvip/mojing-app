#!/usr/bin/env python3
"""
豆包语音 MCP Server
通过火山引擎豆包语音 API 提供语音合成(TTS)和声音复刻功能。
使用 SSE 协议调用，支持 348+ 种音色。
"""

import base64
import json
import os
import time
import uuid
from pathlib import Path
from typing import Optional

import httpx
from mcp.server.fastmcp import FastMCP
from pydantic import BaseModel, Field, ConfigDict

# ─── 配置 ────────────────────────────────────────────────────────────
APP_ID = os.environ.get("DOUBAO_VOICE_APP_ID", "7083389501")
ACCESS_TOKEN = os.environ.get("DOUBAO_VOICE_ACCESS_TOKEN", "beUEfo3fRJ6MXkLD_AQgxQo460MklZmq")
RESOURCE_ID = os.environ.get("DOUBAO_VOICE_RESOURCE_ID", "seed-tts-1.0")
SSE_URL = "https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse"
OUTPUT_DIR = Path(__file__).parent / "outputs"

# 常用音色速查
COMMON_VOICES = {
    "魅力女友": "zh_female_meilinvyou_moon_bigtts",
    "柔美女友": "zh_female_sajiaonvyou_moon_bigtts",
    "撒娇学妹": "zh_female_yuanqinvyou_moon_bigtts",
    "深夜播客": "zh_male_shenyeboke_moon_bigtts",
    "少年梓辛": "zh_male_shaonianzixin_moon_bigtts",
    "湾区大叔": "zh_female_wanqudashu_moon_bigtts",
    "呆萌川妹": "zh_female_daimengchuanmei_moon_bigtts",
    "广州德哥": "zh_male_guozhoudege_moon_bigtts",
    "北京小爷": "zh_male_beijingxiaoye_moon_bigtts",
    "浩宇小哥": "zh_male_haoyuxiaoge_moon_bigtts",
}

mcp = FastMCP("doubao_voice")


class TTSInput(BaseModel):
    """豆包语音合成输入参数"""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    text: str = Field(
        ...,
        description="要合成语音的文本内容",
        min_length=1,
        max_length=5000,
    )
    voice_type: str = Field(
        default="zh_female_meilinvyou_moon_bigtts",
        description="音色ID。常用音色: 'zh_female_meilinvyou_moon_bigtts'(魅力女友), "
                    "'zh_female_sajiaonvyou_moon_bigtts'(柔美女友), "
                    "'zh_male_shaonianzixin_moon_bigtts'(少年梓辛), "
                    "'zh_female_wanqudashu_moon_bigtts'(湾区大叔), "
                    "'zh_female_daimengchuanmei_moon_bigtts'(呆萌川妹), "
                    "'zh_male_beijingxiaoye_moon_bigtts'(北京小爷), "
                    "'zh_male_guozhoudege_moon_bigtts'(广州德哥)",
    )
    format: Optional[str] = Field(
        default="mp3",
        description="音频格式: mp3(默认), wav, ogg_opus, pcm",
    )
    sample_rate: Optional[int] = Field(
        default=24000,
        description="采样率: 8000, 16000, 22050, 24000, 32000, 44100, 48000",
    )
    speech_rate: Optional[int] = Field(
        default=0,
        description="语速: -50(0.5倍) ~ 100(2.0倍)，默认0",
        ge=-50,
        le=100,
    )
    pitch: Optional[int] = Field(
        default=0,
        description="音调: -12 ~ 12，默认0",
        ge=-12,
        le=12,
    )


@mcp.tool(
    name="doubao_tts_synthesize",
    annotations={
        "title": "豆包语音合成",
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": False,
        "openWorldHint": True,
    },
)
async def doubao_tts_synthesize(params: TTSInput) -> str:
    """
    使用豆包语音合成大模型将文本转换为语音。

    支持 348+ 种音色，覆盖通用场景、角色扮演、趣味方言等。
    生成 mp3/wav 格式音频文件。

    Args:
        params (TTSInput): 输入参数包含:
            - text (str): 要合成的文本
            - voice_type (str): 音色ID
            - format (Optional[str]): 音频格式，默认 mp3
            - sample_rate (Optional[int]): 采样率，默认 24000
            - speech_rate (Optional[int]): 语速 -50~100
            - pitch (Optional[int]): 音调 -12~12

    Returns:
        str: JSON 格式结果，包含音频文件路径和信息
    """
    try:
        req_id = str(uuid.uuid4())
        payload = {
            "user": {"uid": "reasonix"},
            "req_params": {
                "text": params.text,
                "speaker": params.voice_type,
                "audio_params": {
                    "format": params.format or "mp3",
                    "sample_rate": params.sample_rate or 24000,
                },
            },
        }

        # 添加可选参数
        additions = {}
        if params.speech_rate != 0:
            additions["speech_rate"] = params.speech_rate
        if params.pitch != 0:
            additions["post_process"] = {"pitch": params.pitch}
        if additions:
            payload["req_params"]["additions"] = additions

        headers = {
            "X-Api-App-Id": APP_ID,
            "X-Api-Access-Key": ACCESS_TOKEN,
            "X-Api-Resource-Id": RESOURCE_ID,
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST", SSE_URL, json=payload, headers=headers
            ) as response:
                if response.status_code != 200:
                    error_text = await response.aread()
                    return json.dumps({
                        "success": False,
                        "error": f"HTTP {response.status_code}: {error_text.decode()[:200]}",
                    }, ensure_ascii=False)

                audio_chunks = []
                async for line in response.aiter_lines():
                    line = line.strip()
                    if line.startswith("data: "):
                        try:
                            data = json.loads(line[6:])
                            code = data.get("code", -1)
                            if code == 0:
                                b64_audio = data.get("data", "")
                                if b64_audio:
                                    audio_chunks.append(base64.b64decode(b64_audio))
                            elif code != 0 and not audio_chunks:
                                # 只在还没有音频数据时报错
                                return json.dumps({
                                    "success": False,
                                    "error": data.get("message", f"错误码: {code}"),
                                }, ensure_ascii=False)
                        except json.JSONDecodeError:
                            continue

        if not audio_chunks:
            return json.dumps({
                "success": False,
                "error": "未生成音频数据",
            }, ensure_ascii=False)

        # 保存音频文件
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        timestamp = int(time.time())
        suffix = f".{params.format or 'mp3'}"
        filename = f"doubao_tts_{timestamp}{suffix}"
        filepath = OUTPUT_DIR / filename

        full_audio = b"".join(audio_chunks)
        with open(filepath, "wb") as f:
            f.write(full_audio)

        return json.dumps({
            "success": True,
            "file": str(filepath),
            "filename": filename,
            "format": params.format or "mp3",
            "size_bytes": len(full_audio),
            "text_length": len(params.text),
            "voice_type": params.voice_type,
        }, ensure_ascii=False, indent=2)

    except httpx.TimeoutException:
        return json.dumps({
            "success": False,
            "error": "请求超时（120秒），文本可能过长",
        }, ensure_ascii=False)
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": f"未知错误: {type(e).__name__}: {str(e)}",
        }, ensure_ascii=False)


if __name__ == "__main__":
    mcp.run()
