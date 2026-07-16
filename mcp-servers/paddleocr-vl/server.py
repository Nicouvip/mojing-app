#!/usr/bin/env python3
"""
PaddleOCR-VL-1.6 MCP Server
通过讯飞星辰 MaaS 平台调用 PaddleOCR-VL-1.6 视觉语言模型，
实现图片/文档的识别和结构化解析（OCR、版面分析、表格/公式识别等）。
"""

import base64
import json
import os
import sys
from pathlib import Path
from typing import Optional

import httpx
from mcp.server.fastmcp import FastMCP
from pydantic import BaseModel, Field, ConfigDict

# ─── 配置 ────────────────────────────────────────────────────────────
API_BASE = "https://maas-api.cn-huabei-1.xf-yun.com/v2"
API_KEY = os.environ.get(
    "PADDLEOCR_API_KEY",
    "39eaa494bbdd468489c3eb3b53ae8933:NWY5MWJhZmI0OTNmNDY2NjMzYjhlMTk3",
)
MODEL_ID = os.environ.get("PADDLEOCR_MODEL_ID", "xoppaddleocrv16")
MAX_IMAGE_SIZE = 20 * 1024 * 1024  # 20MB

mcp = FastMCP("paddleocr_vl")


class PaddleOCRInput(BaseModel):
    """PaddleOCR-VL-1.6 图片识别输入参数"""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    image_path: str = Field(
        ...,
        description="图片文件的绝对路径（支持 jpg/png/jpeg/webp/tiff/bmp 等格式）",
        min_length=1,
    )
    prompt: Optional[str] = Field(
        default=None,
        description="自定义识别提示词。不传则自动根据图片内容进行文档解析。"
                    "可用的指令示例：'OCR:'（纯文字识别）、'Table Recognition:'（表格识别）、"
                    "'Formula Recognition:'（公式识别）、'Chart Recognition:'（图表识别）、"
                    "'Seal Recognition:'（印章识别）、'Spotting:'（文字检视）",
        max_length=500,
    )
    max_tokens: Optional[int] = Field(
        default=4096,
        description="最大生成 token 数，范围 1-8192，默认 4096",
        ge=1,
        le=8192,
    )
    temperature: Optional[float] = Field(
        default=0.3,
        description="生成温度 0-1，越低越确定，默认 0.3（文档识别建议低温度）",
        ge=0.0,
        le=1.0,
    )


def _encode_image(image_path: str) -> str:
    """读取图片文件并编码为 base64"""
    path = Path(image_path)
    if not path.exists():
        raise FileNotFoundError(f"图片文件不存在: {image_path}")
    if not path.is_file():
        raise ValueError(f"路径不是文件: {image_path}")

    file_size = path.stat().st_size
    if file_size > MAX_IMAGE_SIZE:
        raise ValueError(f"图片文件过大 ({file_size / 1024 / 1024:.1f}MB)，最大支持 20MB")

    suffix = path.suffix.lower().lstrip(".")
    if suffix in ("jpg", "jpeg"):
        mime = "image/jpeg"
    elif suffix == "png":
        mime = "image/png"
    elif suffix == "webp":
        mime = "image/webp"
    elif suffix == "tiff" or suffix == "tif":
        mime = "image/tiff"
    elif suffix == "bmp":
        mime = "image/bmp"
    else:
        mime = "image/png"

    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")

    return f"data:{mime};base64,{b64}"


async def _call_paddleocr(
    image_b64: str,
    prompt: Optional[str] = None,
    max_tokens: int = 4096,
    temperature: float = 0.3,
) -> str:
    """调用讯飞 MaaS PaddleOCR-VL-1.6 API"""
    text_prompt = prompt or "请详细识别并描述这张图片/文档中的全部文字内容，包括标题、段落、表格、公式等所有信息，使用 Markdown 格式输出。"

    payload = {
        "model": MODEL_ID,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": text_prompt},
                    {"type": "image_url", "image_url": {"url": image_b64}},
                ],
            }
        ],
        "max_tokens": max_tokens,
        "temperature": temperature,
        "stream": False,
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}",
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{API_BASE}/chat/completions",
            json=payload,
            headers=headers,
        )

        if response.status_code == 401:
            return json.dumps({
                "success": False,
                "error": "API 认证失败，请检查 API Key 是否正确",
            }, ensure_ascii=False)

        if response.status_code == 429:
            return json.dumps({
                "success": False,
                "error": "请求频率超限，请稍后重试（QPS 限制 5）",
            }, ensure_ascii=False)

        response.raise_for_status()
        result = response.json()

        content = (
            result.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        )

        usage = result.get("usage", {})
        usage_info = {
            "prompt_tokens": usage.get("prompt_tokens", 0),
            "completion_tokens": usage.get("completion_tokens", 0),
            "total_tokens": usage.get("total_tokens", 0),
        }

        return json.dumps({
            "success": True,
            "content": content,
            "usage": usage_info,
            "model": MODEL_ID,
        }, ensure_ascii=False, indent=2)


@mcp.tool(
    name="paddleocr_vl_recognize",
    annotations={
        "title": "PaddleOCR-VL-1.6 图片/文档识别",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": True,
    },
)
async def paddleocr_vl_recognize(params: PaddleOCRInput) -> str:
    """
    使用 PaddleOCR-VL-1.6 视觉语言模型识别图片/文档中的文字内容。

    支持多种文档类型：印刷文档、手写文本、表格、公式、图表、印章、古籍等。
    图片支持本地文件路径，自动编码为 base64 后调用讯飞 MaaS API。

    Args:
        params (PaddleOCRInput): 输入参数包含:
            - image_path (str): 图片文件的绝对路径
            - prompt (Optional[str]): 自定义识别提示词（可选）
            - max_tokens (Optional[int]): 最大生成 token 数，默认 4096
            - temperature (Optional[float]): 生成温度，默认 0.3

    Returns:
        str: JSON 格式的识别结果，包含:
        {
            "success": bool,         # 是否成功
            "content": str,          # 识别出的文字内容（Markdown 格式）
            "usage": {               # Token 用量统计
                "prompt_tokens": int,
                "completion_tokens": int,
                "total_tokens": int
            },
            "model": str             # 使用的模型 ID
        }

        失败时返回:
        {
            "success": false,
            "error": str             # 错误描述
        }

    Examples:
        - 通用文档识别: params with image_path="C:/docs/page1.png"
        - 表格识别: params with image_path="C:/table.png", prompt="Table Recognition:"
        - 公式识别: params with image_path="C:/formula.png", prompt="Formula Recognition:"

    Error Handling:
        - 图片文件不存在: 返回明确的文件路径错误
        - 图片过大 (>20MB): 返回大小限制提示
        - API 认证失败 (401): 提示检查 API Key
        - 频率限制 (429): 提示等待后重试
        - 其他 API 错误: 返回具体错误信息
    """
    try:
        # 编码图片
        image_b64 = _encode_image(params.image_path)

        # 调用 API
        result = await _call_paddleocr(
            image_b64,
            prompt=params.prompt,
            max_tokens=params.max_tokens or 4096,
            temperature=params.temperature or 0.3,
        )

        return result

    except FileNotFoundError as e:
        return json.dumps({
            "success": False,
            "error": str(e),
        }, ensure_ascii=False)
    except ValueError as e:
        return json.dumps({
            "success": False,
            "error": str(e),
        }, ensure_ascii=False)
    except httpx.HTTPStatusError as e:
        return json.dumps({
            "success": False,
            "error": f"API 请求失败 (HTTP {e.response.status_code}): {e.response.text[:200]}",
        }, ensure_ascii=False)
    except httpx.TimeoutException:
        return json.dumps({
            "success": False,
            "error": "API 请求超时（120秒），图片可能过大或服务繁忙",
        }, ensure_ascii=False)
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": f"未知错误: {type(e).__name__}: {str(e)}",
        }, ensure_ascii=False)


if __name__ == "__main__":
    mcp.run()
