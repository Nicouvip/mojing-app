# 豆包语音（火山引擎）完整参数参考手册

> 来源：火山引擎豆包语音 V3 SSE 接口文档 + V1 HTTP 接口文档
> 适用接口：`POST https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse`
> 资源 ID：`seed-icl-2.0`（声音复刻2.0）

---

## 一、请求结构总览

```json
{
  "user": {
    "uid": "reasonix"
  },
  "req_params": {
    "text": "要合成的文本",
    "speaker": "myvoice_a852e8",
    "model": "seed-tts-2.0-expressive",
    "audio_params": {
      "format": "wav",
      "sample_rate": 44100
    },
    "additions": {
      "speech_rate": 0,
      "loudness_rate": 0,
      "post_process": { "pitch": 0 },
      "context_texts": [],
      "use_tag_parser": false,
      "enable_subtitle": false,
      "silence_duration": 0,
      "disable_markdown_filter": false,
      "disable_emoji_filter": false,
      "aigc_watermark": false,
      "cache_config": {},
      "section_id": ""
    }
  }
}
```

---

## 二、参数详解

### 2.1 `model` —— 版本选择（核心开关）

| 值 | 说明 | Cot能力 | QA能力 | 语速行为 |
|:---|:---|:---:|:---:|:---|
| `seed-tts-2.0-standard`（默认） | 标准版 | ❌ | ❌ | 均匀 |
| `seed-tts-2.0-expressive` | 表现力增强版 | ✅ | ✅ | 自动根据情绪调 |

**注意：** 只对声音复刻2.0（ICL2.0）生效。不传则默认 standard。

---

### 2.2 基础控制参数（standard + expressive 都支持）

| 参数 | 位置 | 类型 | 范围 | 说明 |
|:---|:---|:---:|:---:|:---|
| `speech_rate` | additions | int | -50~100 | 语速（0=正常，-50=0.5倍，100=2倍） |
| `loudness_rate` | additions | int | -50~100 | 音量（0=正常） |
| `pitch` | additions.post_process | int | -12~12 | 音调（0=正常） |
| `format` | audio_params | string | mp3/wav/ogg_opus/pcm | 输出格式 |
| `sample_rate` | audio_params | int | 8000/16000/24000/44100 | 采样率 |

**注意：** V1接口用 `speed_ratio`（0.1~2.0 倍率），V3接口用 `speech_rate`（-50~100 偏移量），不要搞混。

---

### 2.3 语音指令QA —— `context_texts`（表现力核心①）

**适用版本：** 仅 `seed-tts-2.0-expressive`

**位置：** `req_params.additions.context_texts`

**格式：** 字符串数组，当前只第一个值有效

**用法：** 用自然语言描述想要的语气

```json
"additions": {
  "context_texts": ["你可以用特别特别痛心的语气说话吗？"]
}
```

**官方语音指令示例库（实测有效）：**

| 指令 | 效果 |
|:---|:---|
| `"你得跟我互怼！就是跟我用吵架的语气对话"` | 吵架、激烈 |
| `"用asmr的语气来试试撩撩我"` | 暧昧、悄悄话 |
| `"用试探性的犹豫、带点害羞又藏着温柔期待的语气说"` | 复杂情感 |
| `"用低沉沙哑的语气、带着沧桑与绝望地说"` | 沧桑、绝望 |
| `"用颤抖沙哑、带着崩溃与绝望的哭腔，夹杂着质问与心碎的语气说"` | 崩溃哭腔 |
| `"你可以说慢一点吗？"` | 放慢语速 |
| `"你可以用特别特别痛心的语气说话吗？"` | 悲伤痛心 |
| `"嗯，你的语气再欢乐一点"` | 欢乐 |
| `"你嗓门再小点。"` | 减小音量 |
| `"你能用骄傲的语气来说话吗？"` | 骄傲 |

**注意：** context_texts 的文本**不参与计费**！

**限制：**
- 仅 TTS2.0 预置音色和 ICL2.0 expressive 版支持
- 只取数组第一个值

### 2.4 引用上文（让模型理解语境）

**适用版本：** ICL2.0 expressive 版

**原理：** 输入合成文本的上文（只引用不合成），模型会理解并承接语境的情绪进行合成。

| 方法 | API对应 |
|:---|:---|
| 语音指令 | `additions.context_texts` |
| 引用上文 | `additions.section_id`（多轮会话）或 在 `context_texts` 中传入上文 |

**官方示例：**

| 引用上文 | 合成文本 | 效果 |
|:---|:---|:---|
| 无 | "你怎么评价北京这个城市？" | 平淡 |
| `"你怎么评价北京这个城市？"` | "北京…因为我来，这是第二次…" | **有思考和停顿感** |
| `"是你吗？怎么看着好像没怎么变啊？"` | "你头发长了…十年了…你还好吗？" | **激动的语气** |
| `"挺好的…就是去年整理旧书，翻到你给我写的毕业留言…"` | "我也带着这个…你看，当时在操场拍的…" | **温暖回忆** |

---

### 2.4 语音标签Cot —— `use_tag_parser` + `<cot>`（表现力核心②）

**适用版本：** 仅 ICL2.0 expressive 版（声音复刻）

**位置：** `req_params.additions.use_tag_parser`

**用法：**
1. 设置 `"use_tag_parser": true`
2. 在文本中嵌入 `<cot text=描述>内容</cot>` 标签

```json
"additions": {
  "use_tag_parser": true
}
"text": "他愣住了。<cot text=语速缓慢,语气低沉>原来事情是这样的。</cot>"
```

**cot 标签规则：**
- 支持多组标签，分段控制
- 单句text字符长度最好 ≤64（含cot标签）
- cot标签用自然语言描述，不限于预设值
- 仅当前句子生效

**cot 标签示例：**

| 文本内写法 | 效果 |
|:---|:---|
| `<cot text=语速缓慢>内容</cot>` | 放慢语速 |
| `<cot text=急促难耐>内容</cot>` | 加快，紧张 |
| `<cot text=语气低沉>内容</cot>` | 压低声音 |
| `<cot text=特别特别痛心>内容</cot>` | 悲伤 |
| `<cot text=压抑着愤怒>内容</cot>` | 隐忍的怒气 |
| `<cot text=平静地讲述>内容</cot>` | 冷静叙述 |

---

### 2.5 辅助功能参数

| 参数 | 位置 | 类型 | 说明 |
|:---|:---|:---:|:---|
| `enable_subtitle` | additions | bool | 开启字幕/时间戳返回 |
| `silence_duration` | additions | int | 句尾增加静音，0~30000ms |
| `disable_markdown_filter` | additions | bool | 过滤markdown语法（如**加粗**） |
| `disable_emoji_filter` | additions | bool | 不过滤emoji |
| `aigc_watermark` | additions | bool | 音频结尾加AIGC标识 |
| `cache_config.text_type` | additions | int | 缓存（传1） |
| `cache_config.use_cache` | additions | bool | 开启缓存（相同文本1小时内快速返回） |
| `section_id` | additions | string | 多轮会话ID，保持上下文连贯 |

---

## 三、有声书旁白配置方案（推荐）

### 3.1 版本选择

**优先用 `seed-tts-2.0-expressive`**，因为 Cot 标签可以分段精确控制语气。

### 3.2 配置模板

```json
{
  "user": { "uid": "reasonix" },
  "req_params": {
    "speaker": "myvoice_a852e8",
    "model": "seed-tts-2.0-expressive",
    "audio_params": {
      "format": "wav",
      "sample_rate": 44100
    },
    "additions": {
      "speech_rate": 0,
      "loudness_rate": 0,
      "use_tag_parser": true,
      "silence_duration": 0
    }
  }
}
```

### 3.3 不同段落类型用 Cot 标签控制

| 段落类型 | Cot 标签写法 |
|:---|:---|
| 普通叙述 | 不加cot，默认语气 |
| 内心独白/回忆 | `<cot text=放慢,声音放轻>内容</cot>` |
| 压抑、沉重 | `<cot text=语速缓慢,语气低沉>内容</cot>` |
| 紧张、急促 | `<cot text=急促难耐>内容</cot>` |
| 愤怒、爆发 | `<cot text=压抑着怒火>内容</cot>` |
| 悲伤、痛心 | `<cot text=特别痛心的语气>内容</cot>` |
| 冷峻、决断 | `<cot text=语速缓慢,语气冷峻>内容</cot>` |

### 3.4 分段原则

- 每段建议 200~300 字
- 在情绪转折处分段
- 段间人为加 1~2 秒静音（代码处理）
- 每段独立发送请求，避免引擎累积情绪

---

## 四、声音复刻2.0最佳实践（官方文档）

### 4.1 Prompt（训练音频）要求

| 要求 | 说明 |
|:---|:---|
| 长度 | **14~30秒**，WAV格式（过长的音频系统会自动截断） |
| 音质 | 低噪声、单人、**单轨**（不用双声道） |
| 情绪 | **尽可能一致**，不要大起大落，也不要过于平淡 |
| 语气 | 避免发音模糊、语气生硬，要贴合内容场景 |
| 可选优化 | 降噪可提升清晰度，但会损失一定相似度 |
| 中英混 | prompt中最好能同时覆盖中英文 |

### 4.2 context_texts 的核心用法

**官方明确说：**
> 2.0模型**不会完全贴合prompt情感**，会更贴合**语义信息**

所以即使训练音频是中性语气，只要在合成时加 context_texts 指令，就能控制情感表现。

**两种场景：**

| 场景 | 用法 |
|:---|:---|
| 通用合成 | `context_texts: ["用最悲伤的语气演绎下面这句话："]` |
| LLM 对话后置合成 | 把用户上一轮 query 放进去，语气更适配 |

**高表现力技巧：**
> 如果想要prompt的音色又需要prompt情感 → 请求中**常驻**context_texts（带上prompt的情感描述）

### 4.3 情感稳定性

| Prompt类型 | 特点 |
|:---|:---|
| 情感平稳型 | 合成时情感表现更**稳定** |
| 情感丰富型 | 多次合成同一文本，情感会有**变化** |

**对我们的启示：** 我们的训练音频（口播旁白）情感平稳 → 合成效果会更稳定。然后通过 context_texts 和 cot 标签精确控制每段的语气。

---

## 五、还待验证的问题

1. **Cot 标签在声音复刻上实际效果如何？** —— 文档说"存在效果抽卡的情况"
2. **`context_texts` 对复刻音色的控制力度？** —— 比 cot 更全局，可能更适合设定基调
3. **同时用 context_texts 和 cot 会冲突吗？** —— context_texts 设全局语气，cot 局部覆盖
4. **speech_rate 和 cot 的语速控制哪个优先级高？** —— 推测 cot 优先
5. **standard 版不传 speech_rate 是否会自行根据情绪调语速？** —— 文档说 standard 不支持情绪变化，应该不会
