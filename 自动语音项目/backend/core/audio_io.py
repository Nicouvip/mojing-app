"""
音频 I/O 工具
支持 wav/mp3/flac 等格式的读写
"""

from pathlib import Path
from typing import Optional

import librosa
import numpy as np
import soundfile as sf


def load_audio(path: str | Path, sr: Optional[int] = None) -> tuple[np.ndarray, int]:
    """
    加载音频文件，返回 (音频数据, 采样率)
    自动统一为单声道 float32
    """
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"音频文件不存在: {path}")

    # librosa 自动转单声道、重采样
    data, sr = librosa.load(str(path), sr=sr, mono=True)
    return data.astype(np.float32), sr


def save_audio(path: str | Path, data: np.ndarray, sr: int, subtype: str = "PCM_16"):
    """
    保存音频文件
    subtype: PCM_16, PCM_24, FLOAT 等
    """
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(path), data, sr, subtype=subtype)
    return path


def get_audio_info(path: str | Path) -> dict:
    """获取音频文件基本信息"""
    path = Path(path)
    data, sr = load_audio(path)
    duration = len(data) / sr
    return {
        "path": str(path),
        "sample_rate": sr,
        "duration": round(duration, 3),
        "samples": len(data),
        "size_bytes": path.stat().st_size,
    }


def resample(data: np.ndarray, orig_sr: int, target_sr: int) -> np.ndarray:
    """重采样"""
    if orig_sr == target_sr:
        return data
    return librosa.resample(data, orig_sr=orig_sr, target_sr=target_sr)
