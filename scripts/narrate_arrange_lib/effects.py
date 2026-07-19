"""
后处理效果模块 — effects.py（可配置效果链版）

基于 pedalboard（Spotify 开源库）实现音频后处理。
借鉴 Voicebox effects.py 的 EFFECT_REGISTRY + JSON 效果链模式。

用法：
  效果链是纯数据 JSON，与处理逻辑解耦。
  每个效果有完整的参数注册表（default/min/max），
  可存数据库、传 API、前端动态编辑。

支持的 8 种效果：
  compressor / reverb / delay / chorus / pitch_shift / gain / highpass / lowpass
"""

import os
import subprocess
import sys
from typing import Any

import numpy as np


# ── 效果注册表 ─────────────────────────────────────────


def _import_pedalboard():
    """延迟导入 pedalboard"""
    import pedalboard
    from pedalboard import (
        Chorus, Compressor, Delay, Gain,
        HighpassFilter, LowpassFilter, PitchShift, Reverb,
    )
    return pedalboard, {
        "chorus": Chorus,
        "reverb": Reverb,
        "delay": Delay,
        "compressor": Compressor,
        "gain": Gain,
        "highpass": HighpassFilter,
        "lowpass": LowpassFilter,
        "pitch_shift": PitchShift,
    }


EFFECT_REGISTRY = {
    "compressor": {
        "cls_name": "Compressor",
        "label": "压缩器",
        "description": "动态范围压缩，让声音更饱满",
        "params": {
            "threshold": {"default": -20.0, "min": -60, "max": 0, "step": 1},
            "ratio": {"default": 3.0, "min": 1.0, "max": 20.0, "step": 0.5},
            "attack_ms": {"default": 5.0, "min": 0.1, "max": 100, "step": 0.1},
            "release_ms": {"default": 100.0, "min": 1, "max": 1000, "step": 1},
        },
    },
    "reverb": {
        "cls_name": "Reverb",
        "label": "混响",
        "description": "房间混响效果",
        "params": {
            "room_size": {"default": 0.15, "min": 0.0, "max": 1.0, "step": 0.01},
            "damping": {"default": 0.5, "min": 0.0, "max": 1.0, "step": 0.01},
            "wet_level": {"default": 0.08, "min": 0.0, "max": 1.0, "step": 0.01},
            "dry_level": {"default": 0.92, "min": 0.0, "max": 1.0, "step": 0.01},
            "width": {"default": 0.5, "min": 0.0, "max": 1.0, "step": 0.01},
        },
    },
    "delay": {
        "cls_name": "Delay",
        "label": "延迟",
        "description": "回声/延迟效果",
        "params": {
            "delay_seconds": {"default": 0.25, "min": 0.01, "max": 5.0, "step": 0.01},
            "feedback": {"default": 0.0, "min": 0.0, "max": 0.95, "step": 0.01},
            "mix": {"default": 0.3, "min": 0.0, "max": 1.0, "step": 0.01},
        },
    },
    "chorus": {
        "cls_name": "Chorus",
        "label": "合唱",
        "description": "合唱/镶边效果",
        "params": {
            "rate_hz": {"default": 1.0, "min": 0.01, "max": 20.0, "step": 0.01},
            "depth": {"default": 0.5, "min": 0.0, "max": 1.0, "step": 0.01},
            "centre_delay_ms": {"default": 7.0, "min": 0.5, "max": 50.0, "step": 0.1},
            "feedback": {"default": 0.0, "min": 0.0, "max": 0.95, "step": 0.01},
            "mix": {"default": 0.5, "min": 0.0, "max": 1.0, "step": 0.01},
        },
    },
    "pitch_shift": {
        "cls_name": "PitchShift",
        "label": "变调",
        "description": "半音移调",
        "params": {
            "semitones": {"default": 0, "min": -12, "max": 12, "step": 1},
        },
    },
    "gain": {
        "cls_name": "Gain",
        "label": "增益",
        "description": "音量增益",
        "params": {
            "gain_db": {"default": 0.0, "min": -40, "max": 40, "step": 0.5},
        },
    },
    "highpass": {
        "cls_name": "HighpassFilter",
        "label": "高通滤波",
        "description": "切除低频",
        "params": {
            "cutoff_frequency_hz": {"default": 300.0, "min": 20, "max": 20000, "step": 10},
        },
    },
    "lowpass": {
        "cls_name": "LowpassFilter",
        "label": "低通滤波",
        "description": "切除高频",
        "params": {
            "cutoff_frequency_hz": {"default": 6000.0, "min": 20, "max": 20000, "step": 10},
        },
    },
}


# ── 内置预设 ───────────────────────────────────────────


BUILTIN_PRESETS = {
    "润色": {
        "label": "润色（压缩+轻微混响）",
        "description": "默认润色：压缩让声音饱满 + 轻微混响让听感自然",
        "effects": [
            {"type": "compressor", "enabled": True, "params": {
                "threshold": -20, "ratio": 3.0, "attack_ms": 5.0, "release_ms": 100.0,
            }},
            {"type": "reverb", "enabled": True, "params": {
                "room_size": 0.15, "damping": 0.5,
                "wet_level": 0.08, "dry_level": 0.92, "width": 0.5,
            }},
        ],
    },
    "电台": {
        "label": "电台（AM收音机效果）",
        "description": "模拟 AM 收音机音质的高通+低通+压缩",
        "effects": [
            {"type": "highpass", "enabled": True, "params": {"cutoff_frequency_hz": 300}},
            {"type": "lowpass", "enabled": True, "params": {"cutoff_frequency_hz": 3500}},
            {"type": "compressor", "enabled": True, "params": {
                "threshold": -24, "ratio": 4.0, "attack_ms": 3.0, "release_ms": 80.0,
            }},
            {"type": "gain", "enabled": True, "params": {"gain_db": 6.0}},
        ],
    },
    "空旷": {
        "label": "空旷（大房间回声）",
        "description": "模拟空旷大房间的大混响+延迟",
        "effects": [
            {"type": "reverb", "enabled": True, "params": {
                "room_size": 0.85, "damping": 0.3,
                "wet_level": 0.4, "dry_level": 0.6, "width": 0.8,
            }},
            {"type": "delay", "enabled": True, "params": {
                "delay_seconds": 0.2, "feedback": 0.3, "mix": 0.15,
            }},
        ],
    },
    "低沉": {
        "label": "低沉（变调+低通）",
        "description": "让声音更低沉：降调+切除高频",
        "effects": [
            {"type": "pitch_shift", "enabled": True, "params": {"semitones": -3}},
            {"type": "lowpass", "enabled": True, "params": {"cutoff_frequency_hz": 6000}},
            {"type": "compressor", "enabled": True, "params": {
                "threshold": -18, "ratio": 2.5, "attack_ms": 5.0, "release_ms": 100.0,
            }},
        ],
    },
}


# ── 核心函数 ───────────────────────────────────────────


def has_pedalboard() -> bool:
    """检查 pedalboard 是否已安装"""
    try:
        import pedalboard
        return True
    except ImportError:
        return False


def install_pedalboard() -> bool:
    """尝试安装 pedalboard"""
    print("  ⚠ pedalboard 未安装，正在安装...")
    try:
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "pedalboard"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        print("  ✅ pedalboard 安装成功")
        return True
    except Exception as e:
        print(f"  ❌ 安装失败: {e}")
        print(f"  可手动执行: pip install pedalboard")
        return False


def build_pedalboard(effects_chain: list[dict]) -> Any:
    """
    从 JSON 效果链构建 Pedalboard 实例。
    
    Args:
        effects_chain: 效果链配置列表
            [{"type": "compressor", "enabled": true, "params": {...}}, ...]
    
    Returns:
        Pedalboard 实例
    """
    _pd, classes = _import_pedalboard()
    plugins = []

    for effect in effects_chain:
        if not effect.get("enabled", True):
            continue

        effect_type = effect["type"]
        if effect_type not in EFFECT_REGISTRY:
            print(f"  ⚠ 未知效果类型: {effect_type}，跳过")
            continue

        registry = EFFECT_REGISTRY[effect_type]
        cls = classes[registry["cls_name"].lower()]

        # 合并默认值：用户提供的参数覆盖默认值
        params = {}
        for pname, pdef in registry["params"].items():
            params[pname] = effect.get("params", {}).get(pname, pdef["default"])

        plugins.append(cls(**params))

    return _pd.Pedalboard(plugins)


def apply_effects_chain(
    input_path: str,
    output_path: str | None = None,
    effects_chain: list[dict] | None = None,
) -> str:
    """
    对音频文件应用效果链。
    
    Args:
        input_path: 输入 WAV 路径
        output_path: 输出 WAV 路径（None 则自动生成 _效果名.wav）
        effects_chain: 效果链配置（None 则使用默认"润色"预设）
    
    Returns:
        输出文件路径
    """
    if effects_chain is None:
        effects_chain = BUILTIN_PRESETS["润色"]["effects"]

    if not has_pedalboard():
        if not install_pedalboard():
            print("  ⚠ 跳过后处理")
            return input_path

    if output_path is None:
        base, ext = os.path.splitext(input_path)
        output_path = f"{base}_润色{ext}"

    print(f"  🎛 应用后处理效果...")

    try:
        import soundfile as sf
        audio, sr = sf.read(input_path)

        board = build_pedalboard(effects_chain)
        processed = board(audio.astype(np.float32), sr)

        sf.write(output_path, processed, sr)
        print(f"  ✅ 后处理完成: {output_path}")
        return output_path

    except Exception as e:
        print(f"  ❌ 后处理失败: {e}")
        print(f"  保留原始文件: {input_path}")
        return input_path


def apply_effects(input_path: str, output_path: str | None = None) -> str:
    """兼容旧接口：调用默认润色预设（不覆盖原文件）"""
    if output_path is None:
        base, ext = os.path.splitext(input_path)
        output_path = f"{base}_润色{ext}"
    return apply_effects_chain(input_path, output_path)


def get_preset_names() -> list[str]:
    """返回所有预设名称列表"""
    return list(BUILTIN_PRESETS.keys())


def ask_effects() -> str | None:
    """询问用户是否要应用后处理效果，返回选择的预设名"""
    presets = get_preset_names()
    print("\n🎛 可选后处理效果：")
    for i, name in enumerate(presets, 1):
        p = BUILTIN_PRESETS[name]
        print(f"  [{i}] {p['label']}")
    print(f"  [0] 跳过")

    while True:
        try:
            choice = input(f"\n请选择（0-{len(presets)}，默认0）: ").strip()
            if choice in ("", "0"):
                return None
            idx = int(choice)
            if 1 <= idx <= len(presets):
                return presets[idx - 1]
            print(f"  请输入 0-{len(presets)}")
        except ValueError:
            print("  请输入数字")
