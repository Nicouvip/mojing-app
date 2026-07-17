---
name: voice-toolkit
description: 语音工具集成技能包，支持图片识别、声音克隆、语音合成、画本解析、有声书演播等功能。当用户需要进行语音相关操作（TTS、声音克隆、图片识别、画本解析、有声书制作）时触发。
---

# Voice Toolkit 语音工具集成技能包

## 概述

集成多个语音和视觉工具，提供统一的调用接口和优先级规则。

## 工具列表

### 1. PaddleOCR-VL MCP Server（图片/文档识别）
- **位置**: `D:\codexvip\mcp-servers\paddleocr-vl\server.py`
- **工具**: `paddleocr_vl_recognize`
- **功能**: 图片/文档识别，支持 OCR、表格、公式、印章等
- **调用方式**: 传入 `image_path` 参数

### 2. MiMo 声音克隆/语音合成
- **位置**: `D:\codexvip\mcp-servers\mimo-voiceclone\server.py`
- **工具**: `mimo_voice_clone`
- **功能**: 基于音频样本复刻音色并生成语音
- **调用方式**: 传入 `audio_file` 和 `text` 参数

### 3. 讯飞声音复刻/语音合成
- **位置**: `D:\codexvip\mcp-servers\xfyun-voiceclone\server.py`
- **工具**: `xfyun_voice_train` 和 `xfyun_voice_synth`
- **功能**: 声音复刻训练和语音合成
- **调用方式**: 先训练获取音色ID，再用音色ID合成

### 4. 豆包语音合成
- **位置**: `D:\codexvip\mcp-servers\doubao-voice\server.py`
- **工具**: `doubao_tts_synthesize`
- **功能**: 文本转语音，支持 348+ 种音色
- **调用方式**: 传入 `text` 和 `voice_type` 参数

## 优先级规则

### 识图/生图
1. **识图**: PaddleOCR-VL-1.6（免费）→ HunyuanOCR（免费）→ 付费
2. **生图**: Z-Image-Turbo（免费，steps≤5）→ 付费

### 语音/TTS
1. **MiMo** → 讯飞 → 豆包

### 声音克隆
1. **MiMo** → 讯飞 → 豆包

## 画本解析规则

### 有声喵画本格式
- 角色定义区：`【CV名】【角色名】【性别】【角色描述】【出场数】`
- 正文标记：`【角色名-CV名】"对话内容"`
- 标记本身不生成语音，只配对话内容

### 纯文本解析
- 识别章节标题、对话内容、角色
- 输出角色列表，让用户分配 CV
- 确认后进行合成

## 使用示例

### 图片识别
```
使用 paddleocr_vl_recognize 识别图片内容
```

### 声音克隆
```
使用 mimo_voice_clone 基于音频样本生成语音
```

### 语音合成
```
使用 doubao_tts_synthesize 将文本转换为语音
```

## 配置信息

### 讯飞 MaaS 配置
- API 地址: `https://maas-api.cn-huabei-1.xf-yun.com/v2`
- Model ID: `xoppaddleocrv16` (PaddleOCR-VL-1.6)
- API Key: 已配置

### 豆包语音配置
- API 地址: 讯飞星辰 MaaS
- 免费额度: 后付费（已启用）

### MiMo 配置
- API 地址: MiMo 官方 API
- 免费额度: 按量付费

## 注意事项

1. **优先使用免费工具**: 识图/生图优先使用 PaddleOCR-VL 和 Z-Image-Turbo
2. **语音工具优先级**: MiMo > 讯飞 > 豆包
3. **画本格式**: 有声喵格式需要先解析角色定义区
4. **纯文本**: 需要先分析角色和旁白，让用户分配 CV
5. **输出格式**: 默认输出 MP3/44.1kHz/32bit/320kbps，除非用户有特别要求
