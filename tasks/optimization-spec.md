# Spec: 脚本整合优化 — 借鉴 Voicebox 设计改进现有工具

## Objective

基于对 Voicebox（jamiepine/voicebox）源码的深度分析，将其架构设计中可借鉴的优秀模式整合到我们现有的有声书配音工具链中。核心目标：让代码更简洁、更可配置、更健壮。

## 分析依据

Voicebox 源码位于 `D:\codexvip\temp_voicebox_source\`，已完整克隆（--depth 1）。关键参考文件：
- `backend/utils/chunked_tts.py` — numpy crossfade 拼接
- `backend/utils/effects.py` — JSON 效果链注册表模式
- `backend/mcp_server/tools.py` — MCP 简洁接口设计
- `backend/services/stories.py` — 多轨混音算法

## 整合改进项（按优先级）

### P0：numpy 重写 crossfade（concatenator.py）

**现状：** 用 `struct.unpack/pack` 逐样本处理 PCM 字节，代码冗长（60+行），速度慢。

**借鉴 Voicebox：** `chunked_tts.py` 的 `concatenate_audio_chunks()` 用 `np.linspace` 生成渐变曲线，直接对 numpy 数组做向量化运算，代码仅 20 行。

**改动：** 引入 `numpy` 依赖，把 `apply_fade` / `apply_fade_in` / `apply_fade_out` / `concatenate` 全部重写为 numpy 版本。

### P1：效果链 JSON 配置化（effects.py）

**现状：** 硬编码压缩器+混响两个效果，参数写死在代码里，要加新效果必须改代码。

**借鉴 Voicebox：** `effects.py` 的 `EFFECT_REGISTRY` 注册表 + 效果链 JSON 配置模式。每种效果注册 cls/label/params（含default/min/max），效果链是纯数据 JSON，与处理逻辑解耦。

**改动：** 实现效果注册表，支持 8 种 pedalboard 效果（压缩/混响/延迟/合唱/变调/增益/高通/低通），效果链从 JSON 配置读取。

### P2：全局配置 config.toml

**现状：** 参数分散在多个脚本（SAMPLE_RATE、silence_ms、fade_ms、max_chunk_chars 等硬编码）。

**借鉴 Voicebox：** `generation_settings` 表集中管理全局参数。

**改动：** 在 `scripts/` 下创建 `config.toml`，集中管理所有可配置参数，各模块从配置读取。

### P3：合成日志记录

**现状：** 每次合成后没有记录参数，想复现某段效果靠记忆。

**借鉴 Voicebox：** `generations` 表记录了 engine/model_size/seed/instruct 等完整元数据。

**改动：** 合成后自动生成日志文件（CSV 或 JSONL），记录时间、文本摘要、音色ID、speech_rate、pitch、context_texts、cot 标签。

## 不变的范围（不做的事）

- ❌ 不改 parser/arranger/synthesizer 的核心逻辑（只改 effects 和 concatenator）
- ❌ 不改主入口 narrate-arrange.py 的 CLI 参数
- ❌ 不改输出格式和打标逻辑
- ❌ 不改成 SQLite（等 JSON 版本出问题再说）

## 命令

```bash
# 测试 numpy 版拼接
python -c "from narrate_arrange_lib.concatenator import concatenate; ..."

# 测试效果链
python -c "from narrate_arrange_lib.effects import apply_effects_chain; ..."

# 完整流程测试
python scripts/narrate-arrange.py test_画本.txt --dry-run
```

## 项目结构（变动部分）

```
scripts/
├── config.toml                   # 新增：全局配置
├── narrate-arrange.py             # 不改
└── narrate_arrange_lib/
    ├── concatenator.py            # 改：numpy 重写
    ├── effects.py                 # 改：JSON 效果链注册表
    └── ...                        # 其他模块不改
```

## 代码风格

```python
# numpy 风格：向量化运算，不逐样本循环
fade_out = np.linspace(1.0, 0.0, overlap, dtype=np.float32)
fade_in  = np.linspace(0.0, 1.0, overlap, dtype=np.float32)
result[-overlap:] = result[-overlap:] * fade_out + chunk[:overlap] * fade_in

# 效果链风格：纯数据 JSON，与处理逻辑解耦
EFFECT_REGISTRY = {
    "compressor": {
        "cls": Compressor,
        "params": {
            "threshold": {"default": -20, "min": -60, "max": 0},
            "ratio": {"default": 3.0, "min": 1.0, "max": 20.0},
        }
    }
}
```

## Success Criteria

- [ ] numpy 版 concatenator 输出和原始版本听感一致（无异常噪音）
- [ ] 效果链支持 ≥4 种效果（压缩/混响 + 至少延迟/变调）
- [ ] config.toml 中所有参数能被脚本正确读取
- [ ] `--dry-run` 不受影响
- [ ] 所有模块能正常协同工作

## 边界

### Always do
- 用 numpy 替代 struct 后验证输出音频无异常
- 效果链配置向后兼容（不破坏现有调用方式）
- 清理 tmp_voicebox_source 源码目录

### Ask first
- 改变输出格式或文件名规则
- 添加新的第三方依赖（numpy 已确认可用）

### Never do
- 破坏编排脚本的主流程
- 修改 parser/arranger/synthesizer 的核心逻辑
