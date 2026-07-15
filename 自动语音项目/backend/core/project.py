"""
工程文件管理

保存/载入工程文件（JSON格式），包含：
- 原始剧本
- 音频文件列表及角色映射
- ASR转写结果
- 对齐结果
- 导出参数配置
"""

import json
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Optional

from .script_parser import Script, parse_script


@dataclass
class AudioClip:
    """一个音频片段"""
    file_path: str           # 原始文件路径
    role: str = ""           # 关联的角色
    label: str = ""          # 显示标签
    duration: float = 0.0    # 时长（秒）
    sample_rate: int = 0
    asr_text: str = ""       # ASR转写结果
    asr_segments: list = field(default_factory=list)  # ASR分段结果 [{text, start, end}]
    align_index: int = -1    # 匹配到的剧本行index，-1表示未匹配
    align_confidence: float = 0.0  # 匹配置信度
    offset: float = 0.0      # 手动微调偏移量（秒）
    fade_in: float = 0.05    # 淡入时长（秒）
    fade_out: float = 0.05   # 淡出时长（秒）

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class Project:
    """工程文件"""
    name: str = "未命名工程"
    created_at: str = ""
    updated_at: str = ""
    script: Optional[Script] = None
    clips: list[AudioClip] = field(default_factory=list)

    # 全局导出参数
    # 交叉渐变参数（片段之间，取代每段独立淡入淡出）
    crossfade_enabled: bool = True
    crossfade_duration: float = 0.2        # 秒，默认200ms
    crossfade_curve: str = "linear"        # linear, s_curve
    click_removal_enabled: bool = True
    click_removal_threshold: float = -30.0  # dB（比之前-40更轻）
    click_removal_crossfade: float = 0.005
    silence_trim_enabled: bool = True
    silence_trim_threshold: float = -50.0
    silence_trim_min_duration: float = 0.1
    export_sample_rate: int = 44100
    export_format: str = "wav"              # wav, mp3, flac
    export_bitrate: str = "192k"
    export_subtype: str = "PCM_16"          # PCM_16, PCM_24, FLOAT
    export_channels: str = "mono"           # mono, stereo
    normalize_enabled: bool = True
    normalize_target_db: float = -24.0      # 目标响度（dB），有声书常用-24 LUFS

    # ASR配置
    asr_api_url: str = ""
    asr_api_key: str = ""
    asr_model: str = ""
    asr_language: str = "zh"

    @property
    def file_path(self) -> Path | None:
        return self._file_path

    @file_path.setter
    def file_path(self, path: Path | None):
        self._file_path = path

    def __post_init__(self):
        self._file_path: Path | None = None

    def to_dict(self) -> dict:
        d = {
            "name": self.name,
            "created_at": self.created_at,
            "updated_at": self.updated_at or datetime.now().isoformat(),
            "script": self.script.to_dict() if self.script else None,
            "clips": [c.to_dict() for c in self.clips],
            "crossfade_enabled": self.crossfade_enabled,
            "crossfade_duration": self.crossfade_duration,
            "crossfade_curve": self.crossfade_curve,
            "click_removal_enabled": self.click_removal_enabled,
            "click_removal_threshold": self.click_removal_threshold,
            "click_removal_crossfade": self.click_removal_crossfade,
            "silence_trim_enabled": self.silence_trim_enabled,
            "silence_trim_threshold": self.silence_trim_threshold,
            "silence_trim_min_duration": self.silence_trim_min_duration,
            "export_sample_rate": self.export_sample_rate,
            "export_format": self.export_format,
            "export_bitrate": self.export_bitrate,
            "export_subtype": self.export_subtype,
            "export_channels": self.export_channels,
            "normalize_enabled": self.normalize_enabled,
            "normalize_target_db": self.normalize_target_db,
            "asr_api_url": self.asr_api_url,
            "asr_api_key": self.asr_api_key,
            "asr_model": self.asr_model,
            "asr_language": self.asr_language,
        }
        return d

    def save(self, path: str | Path | None = None):
        """保存工程文件"""
        if path:
            self._file_path = Path(path)
        if not self._file_path:
            raise ValueError("未指定工程文件路径")
        self.updated_at = datetime.now().isoformat()
        self._file_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self._file_path, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, ensure_ascii=False, indent=2)

    @classmethod
    def load(cls, path: str | Path) -> "Project":
        """载入工程文件"""
        path = Path(path)
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        project = cls()
        project.name = data.get("name", "未命名工程")
        project.created_at = data.get("created_at", "")
        project.updated_at = data.get("updated_at", "")
        project._file_path = path

        # 恢复剧本
        if data.get("script"):
            project.script = Script.from_dict(data["script"])

        # 恢复剪辑
        for cd in data.get("clips", []):
            clip = AudioClip(**{k: v for k, v in cd.items()
                               if k in AudioClip.__dataclass_fields__})
            project.clips.append(clip)

        # 恢复参数
        for key in ("crossfade_enabled", "crossfade_duration", "crossfade_curve",
                     "click_removal_enabled", "click_removal_threshold",
                     "click_removal_crossfade",
                     "silence_trim_enabled", "silence_trim_threshold",
                     "silence_trim_min_duration",
                     "export_sample_rate", "export_format", "export_bitrate",
                     "export_subtype", "export_channels",
                     "normalize_enabled", "normalize_target_db",
                     "asr_api_url", "asr_api_key", "asr_model", "asr_language"):
            if key in data:
                setattr(project, key, data[key])

        return project


def create_project(name: str = "未命名工程") -> Project:
    """创建一个新工程"""
    now = datetime.now().isoformat()
    return Project(name=name, created_at=now, updated_at=now)
