"""
后处理效果模块 — effects.py（可选）

基于 pedalboard（Spotify 开源库）实现音频后处理：
- 压缩器：让声音更饱满
- 混响：让听感更自然

每次执行时询问用户是否使用。
"""

import os
import subprocess
import sys


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


def apply_effects(input_path: str, output_path: str | None = None) -> str:
    """
    对音频文件应用压缩 + 轻微混响。
    
    Args:
        input_path: 输入 WAV 路径
        output_path: 输出 WAV 路径（None 则覆盖原文件）
    
    Returns:
        输出文件路径
    """
    if not has_pedalboard():
        if not install_pedalboard():
            print("  ⚠ 跳过后处理")
            return input_path
    
    import pedalboard
    from pedalboard import Pedalboard, Compressor, Reverb
    
    if output_path is None:
        # 生成临时文件名
        base, ext = os.path.splitext(input_path)
        output_path = f"{base}_effected{ext}"
    
    print(f"  🎛 应用后处理效果...")
    
    try:
        import soundfile as sf
        audio, sr = sf.read(input_path)
        
        board = Pedalboard([
            Compressor(
                threshold=-20,
                ratio=3.0,
                attack_ms=5.0,
                release_ms=100.0,
            ),
            Reverb(
                room_size=0.15,       # 小房间混响
                damping=0.5,
                wet_level=0.08,       # 干湿比（轻微）
                dry_level=0.92,
                width=0.5,
            ),
        ])
        
        effected = board(audio, sr)
        sf.write(output_path, effected, sr)
        
        print(f"  ✅ 后处理完成: {output_path}")
        return output_path
    
    except Exception as e:
        print(f"  ❌ 后处理失败: {e}")
        print(f"  保留原始文件: {input_path}")
        return input_path


def ask_effects() -> bool:
    """询问用户是否要应用后处理效果"""
    while True:
        answer = input("\n🎛 要加压缩/混响润色吗？(y/N): ").strip().lower()
        if answer in ('y', 'yes'):
            return True
        if answer in ('', 'n', 'no'):
            return False
        print("  请输入 y 或 n")
