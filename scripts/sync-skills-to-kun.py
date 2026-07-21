#!/usr/bin/env python3
"""
同步 .reasonix/skills/ 到 Kun 的 skills 目录
在每次更新 skill 后运行，确保 Kun 也能使用最新版本
"""

import shutil, os, sys
from pathlib import Path

# 源目录
SRC_DIR = Path(r"D:\codexvip\.reasonix\skills")
# 目标目录
DST_DIR = Path(r"C:\Users\nicou\.kun\skills")

def sync():
    if not SRC_DIR.exists():
        print(f"❌ 源目录不存在: {SRC_DIR}")
        return False

    DST_DIR.mkdir(parents=True, exist_ok=True)

    synced = 0
    for skill_dir in SRC_DIR.iterdir():
        if not skill_dir.is_dir():
            continue

        src_skill_md = skill_dir / "SKILL.md"
        if not src_skill_md.exists():
            continue

        dst_skill_dir = DST_DIR / skill_dir.name
        dst_skill_dir.mkdir(parents=True, exist_ok=True)
        dst_skill_md = dst_skill_dir / "SKILL.md"

        shutil.copy2(src_skill_md, dst_skill_md)
        synced += 1
        print(f"  ✅ {skill_dir.name}")

    print(f"\n共同步 {synced} 个技能")
    return True

if __name__ == "__main__":
    print("📦 同步 skills → Kun...")
    success = sync()
    sys.exit(0 if success else 1)
