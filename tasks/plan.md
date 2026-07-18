# Plan: 多轨叙事编排脚本

## 架构总览

```
画本.txt
  │
  ▼
parser.py ──→ Segments（旁白/对话/标记原始数据）
  │
  ▼
arranger.py ──→ Arrangement（编排清单 JSON）
  │
  ▼
synthesizer.py ──→ 旁白段批量合成（调豆包 API）
  │
  ▼
concatenator.py ──→ 拼接 + 淡入淡出 + 静音插入
  │
  ▼
marker.py ──→ 写入 WAV cue 标记
  │
  ▼
effects.py（可选）──→ pedalboard 压缩/混响
  │
  ▼
最终 WAV 文件
```

## 模块依赖图

```
parser ──→ arranger ──→ synthesizer ──→ concatenator ──→ marker
                                      ↘              ↗
                                   effects（可选）
```

**串行链：** 每个模块的输出是下一个的输入，必须按顺序执行。
**不存在可并行的部分**（合成依赖文本，拼接依赖合成，标记依赖拼接）。

## 各模块设计

### parser.py — 画本解析器

两种模式：

**模式A（自动解析）：**
```
正则（优化后的）：
  1. 去掉【角色-CV】"对话"整体 → 得到纯旁白
  2. 记录每个被去掉的位置 → 生成 DialogMarker
  3. 旁白文本按段落拆分 → NarrationSegment
  4. 中间夹 DialogMarker + SilenceSegment（≥800ms）
```

**模式B（手动标注）：**
```
正则匹配 |旁白_START|...|旁白_END| 和 |角色_标记名|
  1. |旁白_START|~|旁白_END| → NarrationSegment
  2. |角色_标记名| → DialogMarker
  3. 标记间自动补 SilenceSegment（800ms）
```

### arranger.py — 编排清单生成

将 parser 输出的段列表整理为最终编排清单：
- 限制每段旁白 ≤500 字（豆包单段上限预留余量），超长则拆分
- 标记间确保 ≥800ms 静音
- 输出 JSON 供用户确认（`--dry-run`）

### synthesizer.py — 批量合成

- 遍历编排清单，提取所有 narration 段
- 逐段调 doubao_tts_synthesize
- **关键设计：合成前输出清单让用户确认，确认后才调 API**
- 支持断点续传：保存中间状态，已合成的跳过
- 每段保存为临时 WAV，路径记录到 Segment 中

### concatenator.py — 音频拼接

- 按编排清单顺序读取临时 WAV
- 拼接：段间 80ms 淡入淡出
- SilenceSegment → 生成对应时长静音（24000Hz × 2bytes × ms/1000）
- 输出完整 WAV

### marker.py — AU 标记写入

- 遍历编排清单，定位每个 DialogMarker 在最终音频中的采样位置
- 写入 WAV cue 块 + LIST/adtl 块（labl 子块）
- 标记名称："标记01"、"标记02" ...

### effects.py — pedalboard 后处理

- 可选，每次执行时问用户
- 默认跳过
- 若启用：压缩器 + 轻微混响

### narrate-arrange.py — 主入口

CLI 参数解析 + 按顺序调用各模块 + 进度输出。

## 风险与应对

| 风险 | 概率 | 影响 | 应对 |
|:---|:---:|:---:|:---|
| 正则解析画本漏匹配特殊格式 | 中 | 中 | 先拿真实画本测，发现漏的就补正则 |
| 豆包 API 合成超时/失败 | 低 | 中 | 重试机制（最多3次），跳过失败的段并报错 |
| 超长段落超过豆包 5000 字限制 | 低 | 中 | arranger 自动检测并拆分 |
| 合成后旁白段情绪不连贯 | 中 | 中 | 保留 context_texts 三层设计传递情绪 |
| WAV cue 标记 AU 不识别 | 低 | 中 | 先造一个含标记的测试 WAV，AU 打开验证 |

## 验证检查点

```
Checkpoint 1: parser 解析 → 输出和手动核对一致
Checkpoint 2: dry-run 输出编排清单 → 用户确认无误
Checkpoint 3: 单段合成 → 效果满意后再批量
Checkpoint 4: 拼接后音频 → 听一遍确认节奏正确
Checkpoint 5: AU 打开标记 → 标记点位置正确
```
