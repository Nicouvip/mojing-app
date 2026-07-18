# 📖 Codex 工作区 — 全站资源引导

> 新对话/换 agent 的第一步：读这个文件。
> 这里列出了项目中所有可用的资源、文档、技能包、MCP Server、记忆，按分类索引。

---

## 一、📐 项目通用规则

| 文件 | 说明 |
|:---|:---|
| `AGENTS.md` | 协作规则、铁律、Git提交纪律。**每次对话自动加载** |
| `GUIDE.md`（本文件） | 全站资源引导，所有东西的查找入口 |

---

## 二、🎯 技能包（Skills）

技能包位于 `.reasonix/skills/{skill-name}/SKILL.md`。
执行对应任务时必须触发并严格遵循流程。

| 技能包 | 描述 | 触发场景 |
|:---|:---|:---|
| **aubook-narration-producer** | 有声书口播制作全流程：文本分析→语气设计→引擎合成 | 有声书/口播/旁白相关任务 |
| **mojing-diagnose** | 墨境项目故障诊断流程 | 墨境项目出错/故障时 |
| **voice-toolkit** | 语音工具集成（识别/克隆/合成） | 需要调用多个语音工具时 |
| **agent-browser** | 浏览器自动化 | 需要打开网页、填表单、截图等 |

---

## 三、🔌 MCP Server

### 语音类
| Server | 工具 | 说明 |
|:---|:---|:---|
| `mcp-servers/doubao-voice/server.py` | `doubao_tts_synthesize` | 豆包语音合成。支持 expressive 版（model/context_texts/use_tag_parser） |
| `mcp-servers/xfyun-voiceclone/server.py` | `xfyun_voice_train` + `xfyun_voice_synth` | 讯飞声音复刻。支持标准版(x5)和多风格版(x6) |
| `mcp-servers/xfyun-tts/server.py` | `xfyun_tts` | 讯飞语音合成。多种发音人 |
| `mcp-servers/mimo-voiceclone/server.py` | `mimo_voice_clone` | MiMo 声音克隆 |

### 视觉类
| Server | 工具 | 说明 |
|:---|:---|:---|
| `mcp-servers/paddleocr-vl/server.py` | `paddleocr_vl_recognize` / `_chat` / `_generate_image` / `_rerank` | 讯飞MaaS 6模型：OCR/对话/生图/重排序 |
| `mcp-servers/../mojing-vision/` | `recognize_image` | 墨境识图（多API轮询） |

### 生图/视频类
| Server | 工具 | 说明 |
|:---|:---|:---|
| `doubao-image` / `doubao-img` | `text_to_image` / `image_to_video` / `text_to_video` | 豆包文生图/图生视频/文生视频 |

---

## 四、🔧 脚本工具

| 脚本 | 说明 |
|:---|:---|
| `scripts/narrate-arrange.py` | 多轨编排脚本：解析画本→批量合成→拼接打标→（可选）后处理润色 |

---

## 五、📚 项目文档

| 文件 | 内容 |
|:---|:---|
| `docs/doubao-voice-params-reference.md` | 豆包语音完整参数手册（含expressive版全部参数） |
| `docs/doubao-voice-source-docs.md` | 火山引擎官方文档原文保存（最佳实践+语音指令与标签） |
| `docs/narrate-arrange-guide.md` | 多轨编排脚本使用说明 |
| `audio-outputs/` | 所有合成音频输出目录 |
| `audio-outputs/arranged/` | 编排版音频输出目录 |

---

## 六、🧠 持久记忆

记忆自动加载到每个会话中。可以用 `memory list` 查看全部，用 `memory read {name}` 读取详情。

### 有声书/语音相关
| 记忆名 | 内容 |
|:---|:---|
| `voice-prompt-role-definition` | 语音指令提示词写作：角色决定质量 |
| `context-design-method` | 上下文设计法：三层写作（前情+笔记+指导） |
| `voice-tool-priority` | 语音工具优先级规则 |
| `xfyun-api-credentials` | 讯飞 API 认证信息（APPID/APIKey/APISecret） |
| `doubao-voice-clone` | 豆包声音复刻合成 + AU自动打标方案 |
| `aubook-narration-knowledge` | 有声书演播完整知识库（题材/参数/踩坑） |
| `voice-mcp-servers-summary` | 语音 MCP Server 总览 |

### 墨境项目相关
| 记忆名 | 内容 |
|:---|:---|
| `mojing-asset-inventory` | 墨境完整资产清单（账号/API Keys/数据库） |
| `mojing-backup-rule` | 墨境备份铁律 |
| `mojing-self-check` | 墨境收工前自检清单 |
| `paddleocr-vl-mcp-server` | PaddleOCR-VL MCP Server 接入信息 |

### 其他
| 记忆名 | 内容 |
|:---|:---|
| `kun-skills-global-match` | 138个Kun技能的关键词匹配表 |
| `skill-binding-iron-rule` | 改代码前先调skill的铁律 |
| `skill-execution-iron-rule` | 技能执行铁律 |
| `vision-tool-priority` | 识图/生图免费优先规则 |
| `user-prefers-ask-first` | 用户偏好：多问多确认 |

---

## 七、⚙️ 核心配置速查

### 豆包 Expressive 版（当前有声书主力）

```
model: seed-tts-2.0-expressive
additions: JSON字符串（不是对象！）
  context_texts: ["用低沉压抑的语气讲述"]  // 语音指令
  use_tag_parser: true                     // 开启cot标签
  speech_rate: 0 / loudness_rate: 0
```

### 讯飞多风格版（备选）

```
vcn: x6_clone
rhy: 0-5（0=默认 1=高兴 2=悲伤 3=生气 4=激动 5=平静）
```

### 讯飞 MaaS（6个免费模型）

```
PaddleOCR-VL-1.6 → 识图/文档解析
HunyuanOCR → OCR
Qwen3.5-2B → 文本对话
Hy-MT2-7B → 翻译
Qwen3-Reranker-8B → 重排序
Z-Image-Turbo → 文生图（steps≤5免费）
```

---

## 🔄 新对话初始化流程

**新对话/换 agent 后，按以下步骤恢复工作状态：**

```
1. 读 AGENTS.md（自动加载）→ 了解协作规则
2. 读本文件 GUIDE.md → 了解所有资源的位置
3. 根据任务触发对应的技能包（skills/xxx/SKILL.md）
4. 需要详细参数时读 docs/ 下的文档
```

---

_最后更新：2026-07-17_
