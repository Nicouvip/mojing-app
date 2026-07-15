# 🎧 AutoTrack — 自动对轨工具

有声书主播的后期利器：按剧本自动组装各CV录音，生成完整音轨。

## 使用流程

```
1. 粘贴剧本 ───→ 2. 上传音频 ───→ 3. ASR转写 ───→ 4. 一键对齐 ───→ 5. 导出成品
```

## 功能特性

| 功能 | 说明 |
|------|------|
| 📜 剧本解析 | 支持 `[角色]: 台词` 格式，自动识别角色列表 |
| 🎤 音频管理 | 拖拽/点击上传，关联角色 |
| 🎙️ ASR 智能识别 | 接入 **小米 MiMo-V2.5-ASR**（Token Plan），自动将音频转文字 |
| 🔗 文字匹配对齐 | ASR文字 ↔ 剧本逐句匹配，自动推算每段音频的位置 |
| 🔊 淡入淡出 | 4种曲线(linear/log/sqrt/s_curve)，时长可调，可开关 |
| 🔇 咔嗒声消除 | 阈值可调，交叉渐变，可开关 |
| ✂️ 静音裁剪 | 首尾静音自动去除，阈值/最小时长可调 |
| 💾 工程保存 | JSON格式(.aproj)，可保存/载入/恢复 |
| 📤 导出成品 | WAV/MP3，采样率/比特率可选 |

## 快速开始

### 1. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 配置 MiMo ASR

1. 启动后端：`python app.py`
2. 在界面右侧"ASR 识别配置"面板：
   - API Key：填入你的 Token Plan Key（`tp-xxx`）
   - 接口地址：留空自动推断
   - 语言：中文
3. 点击"保存配置"

### 3. 使用

1. **粘贴剧本**：左侧文本区粘贴剧本内容
2. **上传音频**：点击"上传"选择各CV的录音文件
3. **分配角色**：在下拉菜单中指定每段音频对应的角色
4. **全部转写**：自动调用 ASR 识别文字
5. **一键对齐**：匹配到剧本，生成时间线
6. **调参**：底部面板调整淡入淡出/咔嗒声/静音裁剪参数
7. **导出成品**：下载对齐后的完整音轨

## 项目结构

```
自动语音项目/
├── backend/                 # Flask 后端
│   ├── app.py               # 主服务 + REST API
│   ├── requirements.txt     # Python 依赖
│   ├── core/                # 核心引擎
│   │   ├── audio_io.py      # 音频加载/导出
│   │   ├── script_parser.py # 剧本解析器
│   │   ├── project.py       # 工程文件管理
│   │   ├── asr_adapter.py   # ASR适配器 (MiMo + 通用)
│   │   ├── text_matcher.py  # 文字匹配器
│   │   └── audio_assembler.py # 音频组装器
│   ├── uploads/             # 上传的音频
│   ├── exports/             # 导出的成品
│   └── projects/            # 保存的工程文件
├── frontend/                # Web 前端
│   ├── index.html           # 主页面
│   ├── css/style.css        # 样式
│   └── js/
│       ├── app.js           # 主控制器
│       ├── script_editor.js # 剧本编辑器
│       ├── audio_manager.js # 音频管理
│       ├── waveform_view.js # 波形时间线
│       └── parameters.js    # 参数面板
└── README.md
```

## 技术栈

- **后端**: Python 3.12+ / Flask / librosa / scipy / numpy
- **前端**: HTML5 / CSS3 / Vanilla JS / WaveSurfer.js
- **ASR**: MiMo-V2.5-ASR（小米开放平台，Token Plan）
- **格式**: WAV / MP3 / FLAC

## 未来计划

- [ ] 手动微调：拖拽波形调整对齐位置
- [ ] TTS 补位：缺失台词用 TTS 自动生成
- [ ] 批量处理：多章节一键对齐
- [ ] 参数预设：保存/载入常用配置模板
- [ ] 波形可视化：WaveSurfer.js 实时波形
