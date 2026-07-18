# 任务清单：多轨叙事编排脚本

## 实现顺序（按依赖链）

### 任务 1：parser.py — 画本解析器
- [ ] 实现模式A：正则解析【角色-CV】"对话"格式
  - 正则去掉对话标记，提取纯旁白
  - 记录每个对话标记位置，生成 DialogMarker + SilenceSegment
- [ ] 实现模式B：正则解析 |旁白_START|~|旁白_END| + |角色_标记名|
- [ ] 单元测试：用真实画本片段测试两种模式
- 验收：输入画本 → 输出正确段的编排清单（JSON）
- 涉及文件：`scripts/narrate-arrange-lib/parser.py`

### 任务 2：arranger.py — 编排清单生成
- [ ] 接收 parser 输出 → 生成完整编排清单
- [ ] 超长旁白段自动拆分（≤500字/段）
- [ ] 标记间确保 ≥800ms 静音
- [ ] 输出 JSON 格式编排清单
- 验收：编排清单包含 narration/dialog_marker/silence 三种类型、段间静音≥800ms
- 涉及文件：`scripts/narrate-arrange-lib/arranger.py`

### 任务 3：synthesizer.py — 批量合成（调豆包 API）
- [ ] 从编排清单提取 narration 段
- [ ] 逐段调 doubao_tts_synthesize
- [ ] 合成前输出清单让用户确认
- [ ] 断点续传：保存合成状态
- [ ] 重试机制（最多3次）
- 验收：能正确批量合成旁白段，确认后才调 API
- 涉及文件：`scripts/narrate-arrange-lib/synthesizer.py`

### 任务 4：concatenator.py + marker.py — 音频拼接与标记
- [ ] 按编排清单顺序拼接 + 80ms 淡入淡出
- [ ] 生成对应时长静音段
- [ ] 写入 WAV cue 块 + LIST/adtl 标记
- [ ] 修复 WAV data 块大小
- 验收：输出完整 WAV，AU 打开能看到标记点
- 涉及文件：`scripts/narrate-arrange-lib/concatenator.py`, `scripts/narrate-arrange-lib/marker.py`

### 任务 5：effects.py — pedalboard 后处理（可选）
- [ ] 压缩器效果
- [ ] 轻微混响效果
- [ ] 用户询问逻辑
- 验收：选 y→加效果，选 n→跳过
- 涉及文件：`scripts/narrate-arrange-lib/effects.py`

### 任务 6：narrate-arrange.py — 主入口 + 集成测试
- [ ] CLI 参数解析（argparse）
- [ ] 按顺序调用各模块
- [ ] 完整流程集成测试
- 验收：`python narrate-arrange.py 画本.txt --dry-run` 正常工作
- 涉及文件：`scripts/narrate-arrange.py`
