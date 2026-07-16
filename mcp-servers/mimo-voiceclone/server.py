"""
MiMo-V2.5-TTS-VoiceClone MCP Server
通过音频样本精准复刻任意音色并生成语音（OpenAI 兼容 API）
"""

import base64
import json
import os
import time
from pathlib import Path
from typing import Optional

import httpx
from mcp.server import Server, NotificationOptions
from mcp.server.models import InitializationOptions
import mcp.server.stdio
import mcp.types as types

# ─── 配置 ────────────────────────────────────────────────────────────
MIMO_API_BASE = "https://token-plan-cn.xiaomimimo.com/v1"
MIMO_API_KEY = "tp-c233nqeu5oovmyuhzdml2bsfs2vjwuey53g74trfpf4ov5m7"
MIMO_MODEL = "mimo-v2.5-tts-voiceclone"
OUTPUT_DIR = Path(__file__).parent / "outputs"

server = Server("mimo-voiceclone")


async def _voice_clone(
    sample_audio_base64: str,
    sample_mime: str,
    text: str,
    style_hint: str = "",
    format: str = "wav",
) -> tuple[bytes, float]:
    """
    调用 MiMo VoiceClone API
    返回 (audio_bytes, duration_seconds)
    """
    # 构建音频 data URI
    voice_data = f"data:{sample_mime};base64,{sample_audio_base64}"

    # 构建 messages
    user_content = "请基于提供的音频样本，自然地朗读以下内容。"
    if style_hint:
        user_content = f"请基于提供的音频样本，请用{style_hint}的风格朗读以下内容。"

    messages = [
        {"role": "user", "content": user_content},
        {"role": "assistant", "content": text},
    ]

    body = {
        "model": MIMO_MODEL,
        "messages": messages,
        "audio": {
            "voice": voice_data,
            "format": format,
        },
    }

    # 带重试的请求（应对 429）
    max_retries = 3
    last_error = None

    for attempt in range(max_retries + 1):
        if attempt > 0:
            wait_ms = min(10000 * (2 ** (attempt - 1)), 40000)
            print(f"[VoiceClone] 429 rate limited, retry {attempt}/{max_retries} after {wait_ms}ms")
            await asyncio.sleep(wait_ms / 1000)

        try:
            async with httpx.AsyncClient(timeout=120) as client:
                response = await client.post(
                    f"{MIMO_API_BASE}/chat/completions",
                    headers={
                        "Content-Type": "application/json",
                        "api-key": MIMO_API_KEY,
                    },
                    json=body,
                )

                if response.status_code == 429 and attempt < max_retries:
                    retry_after = int(response.headers.get("Retry-After", "0"))
                    last_error = f"429 rate limited, retry after {retry_after}s"
                    continue

                if response.status_code != 200:
                    error_text = response.text
                    raise RuntimeError(f"MiMo API error {response.status_code}: {error_text}")

                result = response.json()
                audio_data = result.get("choices", [{}])[0].get("message", {}).get("audio", {}).get("data")
                if not audio_data:
                    raise RuntimeError("No audio data in MiMo response")

                audio_bytes = base64.b64decode(audio_data)
                # 24kHz PCM16 mono → 2 bytes/sample
                duration = len(audio_bytes) / (24000 * 2)
                return audio_bytes, duration

        except (httpx.RequestError, asyncio.TimeoutError) as e:
            if attempt < max_retries:
                print(f"[VoiceClone] network error, retry {attempt + 1}/{max_retries}: {e}")
                last_error = str(e)
                continue
            raise RuntimeError(f"VoiceClone failed after retries: {e}")

    raise RuntimeError(f"VoiceClone failed: {last_error}")


# 需要 asyncio 用于 httpx
import asyncio


def _validate_audio_file(filepath: str) -> tuple[str, str]:
    """验证音频文件，返回 (mime_type, base64_data)"""
    path = Path(filepath)
    if not path.exists():
        raise ValueError(f"文件不存在: {filepath}")

    ext = path.suffix.lower()
    mime_map = {
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".m4a": "audio/mp4",
    }
    if ext not in mime_map:
        raise ValueError(f"不支持的音频格式: {ext}，支持 mp3/wav/m4a")

    # 检查大小（Base64 后 ≤ 10MB，原始约 7.5MB）
    max_size = 7.5 * 1024 * 1024
    if path.stat().st_size > max_size:
        raise ValueError(f"音频文件过大 ({path.stat().st_size / 1024 / 1024:.1f}MB)，最大 {max_size / 1024 / 1024}MB")

    with open(path, "rb") as f:
        audio_bytes = f.read()

    return mime_map[ext], base64.b64encode(audio_bytes).decode("utf-8")


@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="mimo_voice_clone",
            description="MiMo 声音克隆 - 基于音频样本复刻任意音色并生成语音。上传一段人声样本（mp3/wav/m4a），即可用该声音朗读指定文本。",
            inputSchema={
                "type": "object",
                "properties": {
                    "audio_file": {
                        "type": "string",
                        "description": "音频样本文件的**绝对路径**（mp3/wav/m4a 格式，≤7.5MB，建议 10秒-1分钟）",
                    },
                    "text": {
                        "type": "string",
                        "description": "要让克隆声音朗读的文本内容",
                    },
                    "style": {
                        "type": "string",
                        "description": "可选风格描述，如 '开心'、'温柔'、'严肃' 等",
                    },
                    "format": {
                        "type": "string",
                        "description": "输出格式: wav(默认) 或 pcm16",
                        "default": "wav",
                    },
                },
                "required": ["audio_file", "text"],
            },
        ),
    ]


@server.call_tool()
async def handle_call_tool(
    name: str, arguments: dict
) -> list[types.TextContent | types.EmbeddedResource]:
    if name != "mimo_voice_clone":
        raise ValueError(f"Unknown tool: {name}")

    audio_file = arguments["audio_file"]
    text = arguments["text"]
    style = arguments.get("style", "")
    fmt = arguments.get("format", "wav")

    try:
        mime_type, audio_b64 = _validate_audio_file(audio_file)
        audio_bytes, duration = await _voice_clone(audio_b64, mime_type, text, style, fmt)

        # 保存文件
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        timestamp = int(time.time())
        suffix = ".wav" if fmt == "wav" else ".pcm"
        filename = f"mimo_voiceclone_{timestamp}{suffix}"
        filepath = OUTPUT_DIR / filename
        with open(filepath, "wb") as f:
            f.write(audio_bytes)

        return [
            types.TextContent(
                type="text",
                text=json.dumps({
                    "success": True,
                    "file": str(filepath),
                    "filename": filename,
                    "format": fmt,
                    "size_bytes": len(audio_bytes),
                    "duration_seconds": round(duration, 2),
                    "text_length": len(text),
                    "sample_file": audio_file,
                }, ensure_ascii=False, indent=2),
            )
        ]
    except Exception as e:
        return [
            types.TextContent(
                type="text",
                text=json.dumps({
                    "success": False,
                    "error": str(e),
                }, ensure_ascii=False, indent=2),
            )
        ]


async def main():
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="mimo-voiceclone",
                server_version="1.0.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )


if __name__ == "__main__":
    asyncio.run(main())
