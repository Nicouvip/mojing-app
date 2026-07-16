"""
讯飞 一句话复刻 MCP Server
全流程：训练声音 → 合成语音
"""

import asyncio
import base64
import hashlib
import hmac as hmac_mod
import json
import os
import time
from pathlib import Path
from typing import Optional

import aiohttp
import httpx
import websockets
from mcp.server import Server, NotificationOptions
from mcp.server.models import InitializationOptions
import mcp.server.stdio
import mcp.types as types

# ─── 配置 ────────────────────────────────────────────────────────────
APPID = "cb18693d"
APIKEY = "39eaa494bbdd468489c3eb3b53ae8933"
APISECRET = "NWY5MWJhZmI0OTNmNDY2NjMzYjhlMTk3"
OUTPUT_DIR = Path(__file__).parent / "outputs"

TOKEN_URL = "http://avatar-hci.xfyousheng.com/aiauth/v1/token"
TRAIN_BASE = "http://opentrain.xfyousheng.com/voice_train"

server = Server("xfyun-voiceclone")


# ─── 工具函数 ─────────────────────────────────────────────────────────

def _get_timestamp() -> str:
    return str(int(time.time() * 1000))


def _get_auth_sign(timestamp: str, body: str) -> str:
    """获取鉴权 token 的签名"""
    key_sign = hashlib.md5((APIKEY + timestamp).encode("utf-8")).hexdigest()
    return hashlib.md5((key_sign + body).encode("utf-8")).hexdigest()


def _get_x_sign(timestamp: str, body: str) -> str:
    """获取训练接口的 X-Sign"""
    return hashlib.md5((APIKEY + timestamp + hashlib.md5(body.encode("utf-8")).hexdigest()).encode("utf-8")).hexdigest()


def _get_tts_auth_url(res_id: str) -> str:
    """构建 TTS 合成 WebSocket 鉴权 URL（讯飞标准 hmac-sha256 鉴权）"""
    from datetime import datetime
    from urllib.parse import urlencode

    host = "cn-huabei-1.xf-yun.com"
    path = "/v1/private/voice_clone"
    date = datetime.utcnow().strftime("%a, %d %b %Y %H:%M:%S GMT")

    sign_str = f"host: {host}\ndate: {date}\nGET {path} HTTP/1.1"
    signature = base64.b64encode(
        hmac_mod.new(
            APISECRET.encode("utf-8"),
            sign_str.encode("utf-8"),
            hashlib.sha256,
        ).digest()
    ).decode("utf-8")

    auth_origin = (
        f'api_key="{APIKEY}", '
        f'algorithm="hmac-sha256", '
        f'headers="host date request-line", '
        f'signature="{signature}"'
    )
    authorization = base64.b64encode(auth_origin.encode("utf-8")).decode("utf-8")

    # 注意：合成接口的参数通过 URL query 传入 res_id
    params = {"host": host, "date": date, "authorization": authorization}
    return f"ws://{host}{path}?{urlencode(params)}"


async def _get_token() -> str:
    """获取鉴权 token"""
    timestamp = _get_timestamp()
    body = json.dumps({
        "base": {"appid": APPID, "version": "v1", "timestamp": timestamp},
        "model": "remote",
    }, separators=(",", ":"))
    sign = _get_auth_sign(timestamp, body)

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            TOKEN_URL,
            headers={"Content-Type": "application/json", "Authorization": sign},
            content=body,
            timeout=15,
        )
        data = resp.json()
        if data.get("retcode") != "000000":
            raise RuntimeError(f"获取 token 失败: {data}")
        return data["accesstoken"]


async def _create_training_task(token: str, task_name: str = "") -> str:
    """创建训练任务，返回 task_id"""
    timestamp = _get_timestamp()
    body = json.dumps({
        "taskName": task_name or f"voiceclone_{int(time.time())}",
        "sex": 1,
        "ageGroup": 2,
        "resourceType": 12,
        "denoise": 1,
    }, separators=(",", ":"))
    x_sign = _get_x_sign(timestamp, body)

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{TRAIN_BASE}/task/add",
            headers={
                "Content-Type": "application/json",
                "X-Sign": x_sign,
                "X-Token": token,
                "X-AppId": APPID,
                "X-Time": timestamp,
            },
            content=body,
            timeout=15,
        )
        data = resp.json()
        if data.get("code") != 0:
            raise RuntimeError(f"创建训练任务失败: {data}")
        return data["data"]


async def _submit_training_with_audio(token: str, task_id: str, audio_path: str) -> None:
    """上传本地音频文件并提交训练"""
    import aiofiles

    timestamp = _get_timestamp()
    audio_path_obj = Path(audio_path)
    if not audio_path_obj.exists():
        raise ValueError(f"音频文件不存在: {audio_path}")

    ext = audio_path_obj.suffix.lower()
    supported = {".mp3", ".wav", ".m4a", ".pcm"}
    if ext not in supported:
        raise ValueError(f"不支持的音频格式: {ext}，支持 mp3/wav/m4a/pcm")

    # 检查文件大小
    size = audio_path_obj.stat().st_size
    if size > 3 * 1024 * 1024:
        raise ValueError(f"音频文件过大 ({size / 1024 / 1024:.1f}MB)，最大 3MB")

    # 读取音频文件
    async with aiofiles.open(audio_path, "rb") as f:
        audio_bytes = await f.read()

    # 用第一个训练文本（segId=1）
    body_data = {
        "taskId": task_id,
        "textId": "5001",
        "textSegId": "1",
    }
    body_str = json.dumps(body_data, separators=(",", ":"))
    x_sign = _get_x_sign(timestamp, body_str)

    # multipart/form-data 上传
    import aiohttp

    async with aiohttp.ClientSession() as session:
        data = aiohttp.FormData()
        data.add_field("file", audio_bytes,
                       filename=f"audio{ext}",
                       content_type=f"audio/{ext.lstrip('.')}")
        data.add_field("taskId", task_id)
        data.add_field("textId", "5001")
        data.add_field("textSegId", "1")

        resp = await session.post(
            f"{TRAIN_BASE}/task/submitWithAudio",
            headers={
                "X-Sign": x_sign,
                "X-Token": token,
                "X-AppId": APPID,
                "X-Time": timestamp,
            },
            data=data,
            timeout=60,
        )
        result = await resp.json()
        if result.get("code") != 0:
            raise RuntimeError(f"提交训练失败: {result}")


async def _poll_training_result(token: str, task_id: str, max_wait: int = 120) -> dict:
    """轮询训练结果，返回包含 trainVcn 的 dict"""
    start = time.time()
    while time.time() - start < max_wait:
        timestamp = _get_timestamp()
        body = json.dumps({"taskId": task_id}, separators=(",", ":"))
        x_sign = _get_x_sign(timestamp, body)

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{TRAIN_BASE}/task/result",
                headers={
                    "Content-Type": "application/json",
                    "X-Sign": x_sign,
                    "X-Token": token,
                    "X-AppId": APPID,
                    "X-Time": timestamp,
                },
                content=body,
                timeout=15,
            )
            data = resp.json()
            if data.get("code") != 0:
                raise RuntimeError(f"查询训练状态失败: {data}")

            result = data.get("data", {})
            status = result.get("trainStatus")
            if status == 1:  # 成功
                return {
                    "trainVid": result.get("trainVid", ""),
                    "trainVcn": result.get("trainVcn", ""),
                    "taskId": task_id,
                    "taskName": result.get("taskName", ""),
                }
            elif status == -1:  # 训练中
                await asyncio.sleep(5)
                continue
            elif status == 2:  # 排队中
                await asyncio.sleep(5)
                continue
            elif status == 0:  # 失败
                raise RuntimeError(f"训练失败: {result.get('failDesc', '未知错误')}")

    raise TimeoutError(f"训练超时（{max_wait}s）")


async def _tts_synthesize(text: str, res_id: str) -> bytes:
    """用训练好的音色ID合成语音"""
    auth_url = _get_tts_auth_url(res_id)
    audio_chunks = []

    business = {
        "common": {"app_id": APPID},
        "business": {
            "aue": "lame",
            "auf": "audio/L16;rate=16000",
            "vcn": "x5_clone",
            "speed": 50,
            "pitch": 50,
            "volume": 50,
            "tte": "UTF8",
            "res_id": res_id,
        },
        "data": {
            "status": 2,
            "text": base64.b64encode(text.encode("utf-8")).decode("utf-8"),
        },
    }

    async with websockets.connect(auth_url) as ws:
        await ws.send(json.dumps(business))

        while True:
            resp = json.loads(await ws.recv())
            data = resp.get("data", {})
            status = data.get("status", 0)
            audio_data = data.get("audio", "")
            if audio_data:
                audio_chunks.append(base64.b64decode(audio_data))

            code = resp.get("code", 0)
            if code != 0:
                raise RuntimeError(f"合成错误: code={code}, message={resp.get('message', '')}")

            if status == 2:
                break

    return b"".join(audio_chunks)


# ─── MCP 工具定义 ────────────────────────────────────────────────────

@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="xfyun_voice_train",
            description="讯飞 声音克隆训练 - 上传音频样本，训练属于自己的音色，返回音色ID。训练成功后可用该ID合成语音。",
            inputSchema={
                "type": "object",
                "properties": {
                    "audio_file": {
                        "type": "string",
                        "description": "人声样本音频文件的**绝对路径**（mp3/wav/m4a/pcm，≤3MB，建议20-40秒清晰人声，无背景噪音）",
                    },
                    "task_name": {
                        "type": "string",
                        "description": "训练任务名称（可选）",
                    },
                },
                "required": ["audio_file"],
            },
        ),
        types.Tool(
            name="xfyun_voice_synth",
            description="讯飞 声音克隆合成 - 用训练好的音色ID合成语音。需要先通过 xfyun_voice_train 训练获得音色ID。",
            inputSchema={
                "type": "object",
                "properties": {
                    "text": {
                        "type": "string",
                        "description": "要合成语音的文本",
                    },
                    "voice_id": {
                        "type": "string",
                        "description": "训练得到的音色ID（trainVcn）",
                    },
                },
                "required": ["text", "voice_id"],
            },
        ),
    ]


@server.call_tool()
async def handle_call_tool(
    name: str, arguments: dict
) -> list[types.TextContent | types.EmbeddedResource]:
    if name == "xfyun_voice_train":
        return await _handle_train(arguments)
    elif name == "xfyun_voice_synth":
        return await _handle_synth(arguments)
    raise ValueError(f"Unknown tool: {name}")


async def _handle_train(arguments: dict) -> list[types.TextContent]:
    audio_file = arguments["audio_file"]
    task_name = arguments.get("task_name", "")

    try:
        token = await _get_token()
        task_id = await _create_training_task(token, task_name)
        await _submit_training_with_audio(token, task_id, audio_file)
        result = await _poll_training_result(token, task_id)

        return [types.TextContent(
            type="text",
            text=json.dumps({
                "success": True,
                "task_id": task_id,
                "train_vid": result["trainVid"],
                "train_vcn": result["trainVcn"],
                "note": "训练成功！请保存 train_vcn（音色ID），后续用 xfyun_voice_synth 合成语音时需传入此ID",
            }, ensure_ascii=False, indent=2),
        )]
    except Exception as e:
        return [types.TextContent(
            type="text",
            text=json.dumps({"success": False, "error": str(e)}, ensure_ascii=False, indent=2),
        )]


async def _handle_synth(arguments: dict) -> list[types.TextContent]:
    text = arguments["text"]
    voice_id = arguments["voice_id"]

    try:
        audio_bytes = await _tts_synthesize(text, voice_id)

        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        timestamp = int(time.time())
        filename = f"xfyun_voiceclone_{timestamp}.mp3"
        filepath = OUTPUT_DIR / filename
        with open(filepath, "wb") as f:
            f.write(audio_bytes)

        return [types.TextContent(
            type="text",
            text=json.dumps({
                "success": True,
                "file": str(filepath),
                "filename": filename,
                "size_bytes": len(audio_bytes),
                "text_length": len(text),
                "voice_id": voice_id,
            }, ensure_ascii=False, indent=2),
        )]
    except Exception as e:
        return [types.TextContent(
            type="text",
            text=json.dumps({"success": False, "error": str(e)}, ensure_ascii=False, indent=2),
        )]


async def main():
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="xfyun-voiceclone",
                server_version="1.0.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )


if __name__ == "__main__":
    asyncio.run(main())
