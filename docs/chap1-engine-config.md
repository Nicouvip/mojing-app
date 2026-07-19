# Step 3：引擎选择与参数配置

## 3.1 引擎选择

| 项目 | 选择 |
|:---|:---|
| 引擎 | 豆包 ICL2.0 Expressive 版 |
| 资源ID | `seed-icl-2.0` |
| 模型版本 | `seed-tts-2.0-expressive` |
| 音色 | `myvoice_a852e8`（墨染青衣Nicou） |
| 鉴权 | 新版 X-Api-Key |

## 3.2 核心参数

```json
{
  "model": "seed-tts-2.0-expressive",
  "audio_params": {"format": "wav", "sample_rate": 24000},
  "additions": {
    "context_texts": ["[按Step 2方案每段不同]"],
    "use_tag_parser": true,
    "speech_rate": 0,
    "loudness_rate": 0
  }
}
```

## 3.3 分段策略

7段，在情绪转折处切分，每段独立请求。

## 3.4 输出文件

| 项目 | 内容 |
|:---|:---|
| 目录 | `audio-outputs\voice-clone\doubao\枕边人的毒计\` |
| 文件名 | `01-墨染青衣Nicou-旁白.wav` |
| 格式 | WAV / 44.1kHz / 32bit / 192kbps（按张总要求） |
| 分段文件 | `segments/01-要点~07-罗姝+收尾.wav` |

## 3.5 拼接处理

| 项目 | 参数 |
|:---|:---:|
| 淡入淡出 | ≥80ms |
| 段间间隔 | 1秒静音 |
| 夹角色音位置 | 已在cot中用"停顿片刻"控制，引擎自动留白 |
