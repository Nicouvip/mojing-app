# 多轨编排脚本使用说明

## 概述

`narrate-arrange.py` 是一个将画本自动编排并合成旁白的工具。它解决的核心问题是：
**画本中旁白和角色对话交替出现时，手动对齐和拼接费时费力。**

脚本自动完成：
1. 解析画本 → 区分旁白和对话位
2. 生成编排清单（含静音间距）
3. 批量合成旁白（需配合豆包 API）
4. 自动拼接 + 80ms 淡入淡出
5. 写入 AU 可识别的 cue 标记
6. （可选）pedalboard 压缩/混响润色

## 安装

脚本依赖以下 Python 库：
```bash
pip install numpy           # 音频处理（必选）
pip install soundfile       # 音频读写
pip install pedalboard      # 后处理效果（可选，不安装也能用）
```

## 配置文件

全局参数在 `scripts/config.toml` 中集中管理：

```toml
[audio]
sample_rate = 24000

[arrange]
silence_ms = 800
fade_ms = 80
max_chars_per_segment = 2000
```

可直接修改此文件调整参数，无需改代码。

## 快速开始

### 1. 准备画本文件

画本可以是两种格式：

**模式A（自动解析，推荐）：** 标准【角色-CV】"对话"格式

```
【旁白-墨染青衣Nicou】"尚某接过那份资料，翻了几页，面上看不出什么变化，只问了一句："
【魏总-墨染青衣Nicou】"这个文在哪儿？"
【旁白-墨染青衣Nicou】"魏总笑了，说这个文可厉害了..."
```

**模式B（手动标注）：** 用标记明确标注段落边界

```
|旁白_START|
尚某接过那份资料，翻了几页。
|旁白_END|
|角色_标记01|
|旁白_START|
魏总笑了。
|旁白_END|
```

### 2. 预览编排清单（不调 API）

```bash
cd D:\codexvip\scripts
python narrate-arrange.py 画本.txt --book 枕边人的毒计 --episode 01 --cv 墨染青衣Nicou --dry-run
```

输出示例：
```
Step 1/5: 解析画本
  原始段数: 5

Step 2/5: 生成编排清单
  旁白段: 3
  对话标记: 2
  静音段: 4
  
  编排清单:
  [
    {"type": "narration", "text": "尚某接过..."},
    {"type": "silence", "ms": 800},
    {"type": "dialog_marker", "label": "标记01", "note": "魏总：这个文在哪儿？"},
    ...
  ]

📋 合成任务清单
  总段数：3  已完成：0  待合成：3
  ⏳ [01] 尚某接过...
  ⏳ [02] 魏总笑了...
  ⏳ [03] 尚某把那叠A4纸...
```

### 3. 确认后逐段合成

`--dry-run` 会生成 `synthesize_tasks.json`，记录了每段需要合成的文本。确认无误后，逐段调用豆包 API 合成，合成后的 WAV 放回指定路径。

### 4. 拼接 + 打标

全部合成完成后，用 `--silence-ms 800` 参数再次运行脚本（不加 `--dry-run`）：

```bash
python narrate-arrange.py 画本.txt --book 枕边人的毒计 --episode 01 --cv 墨染青衣Nicou
```

脚本会：
1. 检测已合成的 WAV 文件
2. 按编排清单顺序拼接（旁白→800ms静音→标记位→旁白→...）
3. 段间 80ms 淡入淡出
4. 写入 AU cue 标记点
5. 询问是否加 pedalboard 后处理

### 5. 输出

最终文件：`D:\codexvip\audio-outputs\arranged\{书名}-{集数}-{CV}-旁白-编排版.wav`

在 Adobe Audition 中打开，可以看到带标记点的波形。

## 命令行参数

| 参数 | 说明 | 默认值 |
|:---|:---|:---:|
| `input` | 画本文件路径 | 必填 |
| `--mode` | 解析模式：auto / annotated | auto |
| `--book` | 书名（输出文件名用） | 画本文件名 |
| `--episode` | 集数 | 01 |
| `--cv` | CV名 | 空 |
| `--dry-run` | 只输出编排清单，不合成 | 否 |
| `--silence-ms` | 标记位静音毫秒数 | 800（或 config.toml 值） |
| `--output-dir` | 输出目录 | audio-outputs/arranged |
| `--no-effects` | 跳过 pedalboard 询问 | 否 |

## 后处理预设

脚本内置了 4 种后处理效果预设，拼接完成后会询问选择：

| 预设 | 效果 | 适用场景 |
|:---|:---|:---|
| **润色**（默认） | 压缩器 + 轻微混响 | 旁白通用润色 |
| **电台** | 高通+低通滤波 + 压缩 | 回忆/闪回段落 |
| **空旷** | 大混响 + 延迟 | 内心独白/梦境 |
| **低沉** | 降调 + 低通滤波 | 沉重气氛段落 |

所有预设不覆盖原始文件，生成 `_预设名.wav` 独立文件。

## 工作原理

```
画本.txt
  │
  ▼ parser.py
  解析画本 → NarrationSegment / DialogMarker 列表
  │
  ▼ arranger.py
  编排 → 超长拆分、间距控制、JSON 输出
  │
  ▼ synthesizer.py
  生成合成任务 → 等待豆包 API 合成
  │
  ▼ concatenator.py
  拼接 → 旁白+静音+淡入淡出 → 完整 WAV
  │
  ▼ marker.py
  写入 AU cue 标记
  │
  ▼ effects.py（可选）
  pedalboard 压缩+混响
  │
  最终 WAV
```

## 注意事项

- **不能直接调豆包 API**：脚本生成合成任务清单后，需要 Reasonix 读取清单并调豆包合成
- **断点续传**：合成状态保存在 `synthesize_tasks.json`，已合成的段会跳过
- **AU 标记**：输出 WAV 在 AU 中打开即可看到标记点，无需额外操作
- **后处理可选**：每次都会询问，默认不执行
