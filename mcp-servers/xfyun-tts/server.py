"""
讯飞语音合成 (TTS) MCP Server
通过 WebSocket 调用讯飞在线语音合成 API，生成音频文件
"""

import asyncio
import base64
import hashlib
import hmac
import json
import os
import time
from datetime import datetime
from pathlib import Path
from typing import Optional
from urllib.parse import urlencode, urlparse

import httpx
from mcp.server import Server, NotificationOptions
from mcp.server.models import InitializationOptions
import mcp.server.stdio
import mcp.types as types

# ─── 配置 ────────────────────────────────────────────────────────────
APPID = "cb18693d"
APISECRET = "NWY5MWJhZmI0OTNmNDY2NjMzYjhlMTk3"
APIKEY = "39eaa494bbdd468489c3eb3b53ae8933"
TTS_URL = "wss://tts-api.xfyun.cn/v2/tts"
OUTPUT_DIR = Path(__file__).parent / "outputs"

server = Server("xfyun-tts")


def _build_auth_url() -> str:
    """构建讯飞 WebSocket 鉴权 URL"""
    ul = urlparse(TTS_URL)
    date = datetime.utcnow().strftime("%a, %d %b %Y %H:%M:%S GMT")

    # 拼接签名原始字段
    sign_str = f"host: {ul.hostname}\ndate: {date}\nGET {ul.path} HTTP/1.1"

    # hmac-sha256 签名
    signature_sha = hmac.new(
        APISECRET.encode("utf-8"),
        sign_str.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    signature = base64.b64encode(signature_sha).decode("utf-8")

    # 构建 authorization
    auth_origin = (
        f'api_key="{APIKEY}", '
        f'algorithm="hmac-sha256", '
        f'headers="host date request-line", '
        f'signature="{signature}"'
    )
    authorization = base64.b64encode(auth_origin.encode("utf-8")).decode("utf-8")

    # 构建最终 URL
    params = {"host": ul.hostname, "date": date, "authorization": authorization}
    return f"{TTS_URL}?{urlencode(params)}"


async def _tts_synthesize(
    text: str,
    vcn: str = "x4_xiaoyan",
    speed: int = 50,
    pitch: int = 50,
    volume: int = 50,
    aue: str = "lame",
) -> bytes:
    """调用讯飞 TTS WebSocket 接口合成语音

    参数:
        text: 要合成的文本（最多 8000 字节 / 约 2000 汉字）
        vcn: 发音人
        speed: 语速 0-100
        pitch: 音高 0-100
        volume: 音量 0-100
        aue: 音频编码 (raw=pcm, lame=mp3)
    返回:
        音频二进制数据
    """
    auth_url = _build_auth_url()
    audio_chunks: list[bytes] = []

    # 使用 websockets 库连接
    import websockets

    async with websockets.connect(auth_url) as ws:
        # 发送业务参数
        business = {
            "common": {"app_id": APPID},
            "business": {
                "aue": aue,
                "auf": "audio/L16;rate=16000",
                "vcn": vcn,
                "speed": speed,
                "pitch": pitch,
                "volume": volume,
                "tte": "UTF8",
            },
            "data": {
                "status": 2,
                "text": base64.b64encode(text.encode("utf-8")).decode("utf-8"),
            },
        }
        await ws.send(json.dumps(business))

        # 接收音频数据
        while True:
            resp = json.loads(await ws.recv())
            data = resp.get("data", {})
            status = data.get("status", 0)
            audio_data = data.get("audio", "")
            if audio_data:
                audio_chunks.append(base64.b64decode(audio_data))

            # 检查错误
            code = resp.get("code", 0)
            if code != 0:
                raise RuntimeError(f"讯飞TTS错误: code={code}, message={resp.get('message', '')}")

            if status == 2:
                break

    return b"".join(audio_chunks)


@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="xfyun_tts",
            description="讯飞语音合成(TTS) - 将文本转为语音音频。支持中文、英文、粤语及多种方言，多种发音人可选。",
            inputSchema={
                "type": "object",
                "properties": {
                    "text": {
                        "type": "string",
                        "description": "要合成的文本（最多 2000 汉字）",
                    },
                    "vcn": {
                        "type": "string",
                        "description": "发音人。常见可选: x4_xiaoyan(小燕-甜美), x4_xiaofeng(小锋-阳光男), x4_xiaoyu(小雨-可爱), x4_xiaoqi(小琪-温柔), x4_xiaolin(小林-沉稳), x4_xiaomei(小美-甜美), x4_xiaogang(小刚-浑厚), x4_xiaorong(小蓉-知性), x4_xiaoqian(小茜-纯净), ais_bigang(毕刚-沉稳男), ais_xuanxuan(萱萱-可爱女), ais_bingbing(冰冰-甜美), ais_jingjing(静静-温柔), ais_yezi(叶子-年轻女), ais_nana(娜娜-亲切), ais_jie(阿杰-阳光男), ais_xiaokun(小坤-活力), ais_chengcheng(成成-男声), ais_linlin(林林-女声)。更多发音人请到讯飞控制台添加试用或购买。",
                    },
                    "speed": {
                        "type": "integer",
                        "description": "语速 0-100，默认 50",
                        "default": 50,
                    },
                    "pitch": {
                        "type": "integer",
                        "description": "音高 0-100，默认 50",
                        "default": 50,
                    },
                    "volume": {
                        "type": "integer",
                        "description": "音量 0-100，默认 50",
                        "default": 50,
                    },
                    "format": {
                        "type": "string",
                        "description": "输出格式: mp3(默认) 或 wav",
                        "default": "mp3",
                    },
                },
                "required": ["text"],
            },
        ),
    ]


@server.call_tool()
async def handle_call_tool(
    name: str, arguments: dict
) -> list[types.TextContent | types.EmbeddedResource]:
    if name != "xfyun_tts":
        raise ValueError(f"Unknown tool: {name}")

    text = arguments["text"]
    vcn = arguments.get("vcn", "x4_xiaoyan")
    speed = arguments.get("speed", 50)
    pitch = arguments.get("pitch", 50)
    volume = arguments.get("volume", 50)
    fmt = arguments.get("format", "mp3")

    # 参数校验
    if len(text.encode("utf-8")) > 8000:
        return [types.TextContent(type="text", text="文本过长，请控制在 8000 字节以内（约 2000 汉字）")]
    if not (0 <= speed <= 100):
        return [types.TextContent(type="text", text="语速取值范围 0-100")]
    if not (0 <= pitch <= 100):
        return [types.TextContent(type="text", text="音高取值范围 0-100")]
    if not (0 <= volume <= 100):
        return [types.TextContent(type="text", text="音量取值范围 0-100")]

    aue = "raw" if fmt == "wav" else "lame"

    try:
        audio_data = await _tts_synthesize(text, vcn, speed, pitch, volume, aue)

        # 保存文件
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        timestamp = int(time.time())
        suffix = ".wav" if fmt == "wav" else ".mp3"
        filename = f"xfyun_tts_{timestamp}{suffix}"
        filepath = OUTPUT_DIR / filename
        with open(filepath, "wb") as f:
            f.write(audio_data)

        ext = "wav" if fmt == "wav" else "mp3"
        return [
            types.TextContent(
                type="text",
                text=json.dumps({
                    "success": True,
                    "file": str(filepath),
                    "filename": filename,
                    "format": ext,
                    "size_bytes": len(audio_data),
                    "text_length": len(text),
                    "voice": vcn,
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
                server_name="xfyun-tts",
                server_version="1.0.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )


if __name__ == "__main__":
    asyncio.run(main())
