# Spec: 多轨叙事编排脚本（narrate-arrange）

## Objective

将画本自动解析为"旁白段 + 角色标记位"的编排清单，批量合成旁白后自动拼接：

- 夹角色音处插入 ≥800ms 静音
- 段间 80ms 淡入淡出
- 自动写入 AU 可识别的 cue 标记
- 输出一个完整的、后期可以直接用的音频文件

## Tech Stack

- 语言：Python 3.12+
- 合成引擎：豆包 Expressive（通过 doubao_tts_synthesize MCP 工具）
- 音频处理：`pydub`（拼接/淡入淡出）+ `pedalboard`（可选项后处理）
- 标记写入：Python `struct` 直接写 WAV cue 块
- 依赖：`requests`, `pydub`, `pedalboard`（可选）, `numpy`

## 输入 / 输出

| | 说明 |
|:---|:---|
| **输入** | 标准画本 .txt（【角色-CV】"对话"格式），或已标注段落的 JSON |
| **输出** | WAV 文件，命名 `{书名}-{集数:02d}-{CV名}-旁白-编排版.wav` |
| **目录** | `D:\codexvip\audio-outputs\arranged\` |

## 输入格式（两种都支持）

### 模式A：直接解析画本

脚本自动识别【角色-CV】"对话"标记，自动分离旁白和对话位：

```
【旁白-墨染青衣Nicou】"尚某接过那份资料，翻了几页..."
【魏总-墨染青衣Nicou】"这个文在哪儿？"
【旁白-墨染青衣Nicou】"尚某继续往下翻..."
```

→ 自动生成编排清单

### 模式B：手动标注段落

用户用特定标记标注段落边界，脚本按标注执行，不做智能解析：

```
|旁白_START|
尚某接过那份资料，翻了几页...
|旁白_END|
|角色_标记01|   ← 这里插入800ms静音+打标
|旁白_START|
尚某继续往下翻...
|旁白_END|
```

## 核心功能

### 1. 解析画本 → 编排清单 JSON

```
[
  {"type": "narration", "text": "尚某接过那份资料，翻了几页，面上看不出什么变化，只问了一句："},
  {"type": "dialog_marker", "label": "标记01", "note": "魏总：这个文在哪儿？"},
  {"type": "silence", "ms": 800},
  {"type": "narration", "text": "魏总笑了，说这个文可厉害了..."},
  {"type": "dialog_marker", "label": "标记02", "note": "魏总：......"},
  {"type": "silence", "ms": 800},
  ...
]
```

"标记01"、"标记02" 即 AU 中显示的 cue 标记名称。

### 2. 批量合成旁白段

- 提取所有 `narration` 段
- 逐段调豆包合成（保留现有 context_texts + cot 流程）
- 支持断点续传（已合成的跳过）

### 3. 拼接

- 按编排清单顺序拼接：旁白 → 静音 → 旁白 → 静音 → ...
- 段间 80ms 淡入淡出
- 夹角色音处静音 ≥800ms（可配置）

### 4. 写入 AU cue 标记

- 检测静音段位置（基于 ffmpeg silencedetect 或直接按编排位置）
- 写入 WAV cue 块 + LIST/adtl 块
- 标记命名："标记01"、"标记02" ...

### 5. （可选）pedalboard 后处理

合成完后问用户：
```
要加压缩/混响润色吗？(y/N):
```
选 y 才执行，默认跳过。

## 命令

```bash
# 模式A：直接解析画本
python narrate-arrange.py 画本.txt --book 枕边人的毒计 --episode 01 --cv 墨染青衣Nicou

# 模式B：手动标注
python narrate-arrange.py 画本_已标注.txt --book 枕边人的毒计 --episode 01 --cv 墨染青衣Nicou --mode annotated

# 只输出编排清单（不合成）
python narrate-arrange.py 画本.txt --dry-run

# 指定静音时长
python narrate-arrange.py 画本.txt --silence-ms 1000
```

## 项目结构

```
D:\codexvip\
├── scripts\
│   └── narrate-arrange.py      # 主脚本
│   └── narrate-arrange-lib\
│       ├── __init__.py
│       ├── parser.py           # 画本解析器（正则分离旁白/对话）
│       ├── arranger.py         # 编排清单生成
│       ├── synthesizer.py      # 批量合成（调豆包API）
│       ├── concatenator.py     # 拼接+淡入淡出
│       ├── marker.py           # AU cue 标记写入
│       └── effects.py          # pedalboard 后处理（可选）
├── audio-outputs\
│   └── arranged\               # 编排版输出目录
└── tasks\
    └── narrate-arrange-spec.md # 本文件
```

## 代码风格

```python
# 编排清单结构
@dataclass
class NarrationSegment:
    type: Literal["narration"]
    text: str
    audio_path: str | None = None  # 合成后填充

@dataclass  
class DialogMarker:
    type: Literal["dialog_marker"]
    label: str       # "标记01"
    note: str        # 角色+对话内容，供参考

@dataclass
class SilenceSegment:
    type: Literal["silence"]
    ms: int          # 静音毫秒数

Segment = NarrationSegment | DialogMarker | SilenceSegment

# 命名：动词开头、snake_case
def parse_script(path: str) -> list[Segment]: ...
def synthesize_batch(segments: list[Segment]) -> list[Segment]: ...
def concatenate(segments: list[Segment], output_path: str) -> str: ...
def write_markers(wav_path: str, segments: list[Segment]) -> None: ...
```

## Success Criteria

- [ ] 输入标准画本 → 自动解析旁白/对话位 → 输出编排清单
- [ ] 输入已标注文本 → 按标注分段执行
- [ ] `--dry-run` 只输出清单，不调 API
- [ ] 批量合成正确（不跳段、不漏段、不乱序）
- [ ] 夹角色音处静音 ≥800ms（可配置）
- [ ] 段间 80ms 淡入淡出
- [ ] 输出 WAV 在 AU 中打开能看到 cue 标记点
- [ ] 后处理：每次问，选 y 才执行

## 边界（Boundaries）

### Always do
- 合成前输出清单让用户确认
- 合成后验证段数匹配
- 输出文件命名规范

### Ask first
- 修改静音时长默认值
- 更换合成引擎（豆包→讯飞等）
- 添加新的后处理效果

### Never do
- 不经过确认直接调 API
- 覆盖已有输出文件（先检查）
- 删除原始画本文件

## 执行流程

```
用户执行脚本
  ↓
解析画本 → 输出编排清单 → 让用户确认
  ↓ 用户说"可以"
批量合成旁白段
  ↓
拼接：旁白 + 静音 + 旁白 + 标记...
  ↓
写入 AU cue 标记
  ↓
问：要加压缩/混响润色吗？
  ↓ 选y → pedalboard 处理
  ↓ 选n → 直接完成
输出最终文件
```

## Open Questions

无（已确认）。
