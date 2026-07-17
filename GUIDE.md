# 🎯 有声书制作 & 豆包语音 — 项目引导

> 新对话/换agent时，先读这个文件，就知道所有东西在哪。

---

## 📂 快速导航

| 要找什么 | 在哪里 |
|:---|:---|
| **完整工作流程** | `.reasonix/skills/aubook-narration-producer/SKILL.md` |
| **豆包语音完整参数手册** | `docs/doubao-voice-params-reference.md` |
| **火山引擎官方文档原文** | `docs/doubao-voice-source-docs.md` |
| **音频输出目录** | `audio-outputs/` |
| **测试音频** | `audio-outputs/test/` |
| **豆包MCP Server源码** | `mcp-servers/doubao-voice/server.py` |
| **讯飞声音复刻MCP Server** | `mcp-servers/xfyun-voiceclone/server.py` |
| **讯飞TTS MCP Server** | `mcp-servers/xfyun-tts/server.py` |
| **PaddleOCR-VL MCP** | `mcp-servers/paddleocr-vl/server.py` |

---

## 🧠 持久记忆（跨会话自动加载）

| 记忆名 | 内容 |
|:---|:---|
| `voice-prompt-role-definition` | 语音指令提示词写作：角色决定质量 |
| `context-design-method` | 上下文设计法：三层写作方法（前情+笔记+指导） |
| `voice-tool-priority` | 语音工具优先级规则 |
| `xfyun-api-credentials` | 讯飞API认证信息 |
| `doubao-voice-clone` | 豆包声音复刻合成+AU打标方案 |
| `aubook-narration-knowledge` | 有声书演播完整知识库 |

---

## 🛠 核心参数速查

### 豆包 Expressive 版（当前主力）

```json
{
  "model": "seed-tts-2.0-expressive",
  "additions": "{\"context_texts\": [\"用低沉压抑的语气讲述\"], \"use_tag_parser\": true}"
}
```

**关键踩坑：** `additions` 必须是 **JSON字符串**，不是对象！

### 讯飞多风格版（备选）

```json
{
  "vcn": "x6_clone",
  "rhy": 2   // 0=默认, 1=高兴, 2=悲伤, 3=生气, 4=激动, 5=平静
}
```

---

## ⚠️ 这个项目的重要约定

1. **每次改代码前先调 skill**（铁律，见 AGENTS.md）
2. **做完一轮改动必须 git commit**（不能留未提交的改动）
3. **故障诊断必须先出方案、等确认、再执行**（不能直接动手修）
4. **用户确认一个功能模块没问题后，必须立即做备份**
5. **每次收工前跑总管自检清单**

---

## 🔄 新对话恢复工作

开新对话后，按这个顺序恢复上下文：

```
1. 读这个文件（GUIDE.md）→ 知道所有东西在哪
2. 读 skills/aubook-narration-producer/SKILL.md → 加载工作流程和角色定义
3. 读 docs/doubao-voice-params-reference.md → 加载参数手册
4. 记忆会自动加载，但可以再用 memory list 确认
```

---

_最后更新：2026-07-17_
