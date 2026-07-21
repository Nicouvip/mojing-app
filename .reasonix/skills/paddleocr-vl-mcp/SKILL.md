---
name: paddleocr-vl-mcp
description: 创建 PaddleOCR-VL-1.6 MCP Server，通过讯飞 MaaS 云 API 调用
runAs: subagent
allowed-tools: [read_file, grep, glob, bash, edit_file]
---

# PaddleOCR-VL MCP Server

## 接入方式
通过 **讯飞星辰 MaaS 平台** 调用 PaddleOCR-VL-1.6，使用张总的讯飞账号后付费额度。

## 配置信息
| 字段 | 值 |
|---|---|
| Model ID | `xoppaddleocrv16` |
| API 地址 | `https://maas-api.cn-huabei-1.xf-yun.com/v2` |
| API Key | `39eaa494bbdd468489c3eb3b53ae8933:NWY5MWJhZmI0OTNmNDY2NjMzYjhlMTk3` |
| APPID | `cb18693d` |
| 免费额度 | 后付费（已启用），QPS 5，并发 5 路 |

## MCP Server 位置
`D:\codexvip\mcp-servers\paddleocr-vl\server.py`

## 可用工具
- `paddleocr_vl_recognize` — 图片/文档识别，支持自定义 prompt 和参数

## 调用方式
在 Reasonix 中直接使用 `paddleocr_vl_recognize` 工具，传入 `image_path` 参数即可。

## 为什么
张总的电脑是 Intel Arc 2GB 显存，无法本地运行 PaddleOCR-VL-1.6（需要 8GB+ VRAM），所以通过讯飞 MaaS 云 API 调用，使用已有的讯飞账号免费额度。
