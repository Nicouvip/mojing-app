"""
配置加载模块 — config.py

从 scripts/config.toml 读取全局配置。
各模块从此获取参数，替代硬编码常量。
"""

import os
import tomllib
from pathlib import Path


# 配置文件路径（相对于脚本目录）
_CONFIG_PATH = Path(__file__).parent.parent / "config.toml"

# 缓存的配置
_cache: dict | None = None


def _load() -> dict:
    """加载配置文件"""
    global _cache
    if _cache is not None:
        return _cache

    if not _CONFIG_PATH.exists():
        # 如果配置文件不存在，返回默认值
        _cache = {
            "audio": {"sample_rate": 24000, "bits_per_sample": 16, "num_channels": 1},
            "arrange": {"silence_ms": 800, "fade_ms": 80, "max_chars_per_segment": 2000},
        }
        return _cache

    with open(_CONFIG_PATH, "rb") as f:
        _cache = tomllib.load(f)
    return _cache


def reload():
    """重新加载配置（运行时修改后调用）"""
    global _cache
    _cache = None
    _load()


# ── 便捷访问函数 ────────────────────────────────────────


def get(section: str, key: str, default=None):
    """获取配置值"""
    cfg = _load()
    return cfg.get(section, {}).get(key, default)


def sample_rate() -> int:
    return get("audio", "sample_rate", 24000)


def bits_per_sample() -> int:
    return get("audio", "bits_per_sample", 16)


def num_channels() -> int:
    return get("audio", "num_channels", 1)


def silence_ms() -> int:
    return get("arrange", "silence_ms", 800)


def fade_ms() -> int:
    return get("arrange", "fade_ms", 80)


def max_chars_per_segment() -> int:
    return get("arrange", "max_chars_per_segment", 2000)


def output_dir() -> str:
    return get("paths", "output_dir", "D:/codexvip/audio-outputs/arranged")


def task_file() -> str:
    return get("paths", "task_file", "synthesize_tasks.json")


def status_file() -> str:
    return get("paths", "status_file", "synthesis_status.json")
