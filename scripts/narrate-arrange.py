#!/usr/bin/env python3
"""
narrate-arrange.py — 多轨叙事编排脚本

将画本解析为编排清单，批量合成旁白后自动拼接+打标。

用法：
  # 模式A：自动解析画本
  python narrate-arrange.py 画本.txt --book 枕边人的毒计 --episode 01 --cv 墨染青衣Nicou
  
  # 模式B：手动标注
  python narrate-arrange.py 画本.txt --mode annotated --book 枕边人的毒计 --episode 01
  
  # 只输出编排清单（不合成）
  python narrate-arrange.py 画本.txt --dry-run
  
  # 指定静音时长
  python narrate-arrange.py 画本.txt --silence-ms 1000
"""

import argparse
import json
import os
import sys
from pathlib import Path

# 将上级目录加入路径（脚本在 scripts/ 下运行）
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from narrate_arrange_lib.parser import (
    parse_script, format_segments, NarrationSegment,
)
from narrate_arrange_lib.arranger import (
    arrange, segments_to_json, count_narration_chars, count_dialog_markers,
)
from narrate_arrange_lib.synthesizer import (
    generate_tasks, load_tasks, import_results,
    print_task_summary, OUTPUT_DIR,
)
from narrate_arrange_lib.concatenator import concatenate
from narrate_arrange_lib.marker import add_markers_to_wav
from narrate_arrange_lib.effects import (
    apply_effects_chain, ask_effects, BUILTIN_PRESETS,
)


def main():
    parser = argparse.ArgumentParser(
        description="多轨叙事编排脚本 — 将画本解析、批量合成、拼接打标",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python narrate-arrange.py 画本.txt --book 枕边人的毒计 --episode 01 --cv 墨染青衣Nicou
  python narrate-arrange.py 画本.txt --mode annotated --dry-run
  python narrate-arrange.py 画本.txt --silence-ms 1000
        """,
    )
    
    parser.add_argument("input", help="画本文件路径（.txt）")
    parser.add_argument("--mode", choices=["auto", "annotated"], default="auto",
                        help="解析模式：auto=自动解析画本（默认），annotated=手动标注")
    parser.add_argument("--book", default="",
                        help="书名（输出文件名用）")
    parser.add_argument("--episode", default="01",
                        help="集数（输出文件名用）")
    parser.add_argument("--cv", default="",
                        help="CV名（输出文件名用）")
    parser.add_argument("--dry-run", action="store_true",
                        help="只输出编排清单，不合成")
    parser.add_argument("--silence-ms", type=int, default=800,
                        help="夹角色音处静音时长（毫秒，默认800）")
    parser.add_argument("--output-dir", default=str(OUTPUT_DIR),
                        help="输出目录")
    parser.add_argument("--no-effects", action="store_true",
                        help="跳过 pedalbboard 后处理询问")
    
    args = parser.parse_args()
    
    # ── 读取输入文件 ─────────────────────────────────
    input_path = Path(args.input)
    if not input_path.exists():
        print(f"❌ 文件不存在: {args.input}")
        sys.exit(1)
    
    with open(input_path, "r", encoding="utf-8") as f:
        text = f.read()
    
    print(f"\n📖 读取画本: {input_path.name}")
    print(f"   大小: {len(text)} 字符")
    print(f"   模式: {'自动解析' if args.mode == 'auto' else '手动标注'}")
    print()
    
    # ── Step 1: 解析 ─────────────────────────────────
    print("=" * 50)
    print("Step 1/5: 解析画本")
    print("=" * 50)
    
    segments = parse_script(text, mode=args.mode, silence_ms=args.silence_ms)
    print(f"  原始段数: {len(segments)}")
    
    # ── Step 2: 编排 ─────────────────────────────────
    print()
    print("=" * 50)
    print("Step 2/5: 生成编排清单")
    print("=" * 50)
    
    arranged = arrange(segments, max_chars=2000, silence_ms=args.silence_ms)
    
    nar_count = count_narration_chars(arranged)
    dialog_count = count_dialog_markers(arranged)
    silence_count = sum(1 for s in arranged if s.type == "silence")
    
    print(f"  编排后段数: {len(arranged)}")
    print(f"    旁白段: {sum(1 for s in arranged if s.type == 'narration')}")
    print(f"    对话标记: {dialog_count}")
    print(f"    静音段: {silence_count}")
    print(f"  旁白总字符: {nar_count}")
    
    # 输出编排清单
    json_output = segments_to_json(arranged)
    print(f"\n  编排清单:")
    print(json_output[:2000] + ("..." if len(json_output) > 2000 else ""))
    
    if args.dry_run:
        print(f"\n  ⚡ --dry-run：未合成，以上为编排清单")
        
        # 同时输出合成任务预览
        generate_tasks(arranged, args.book, args.episode, args.cv, args.output_dir)
        print()
        print_task_summary()
        
        print(f"\n  合成任务已保存至 SQLite: synthesis.db")
        print(f"  可查看后使用合成工具批量合成")
        return
    
    # ── Step 3: 生成合成任务并等待确认 ──────────────
    print()
    print("=" * 50)
    print("Step 3/5: 生成合成任务")
    print("=" * 50)
    
    generate_tasks(arranged, args.book, args.episode, args.cv, args.output_dir)
    print_task_summary()
    
    # 检查已有任务状态
    tasks = load_tasks()
    if tasks and any(t["done"] == 1 for t in tasks):
        print(f"\n  📌 检测到已有 {sum(1 for t in tasks if t['done']==1)} 段已合成")
        answer = input("  是否跳过已合成的段继续？(Y/n): ").strip().lower()
        if answer not in ('n', 'no'):
            pass  # 保持当前状态
        else:
            # 重置所有任务为待合成
            from narrate_arrange_lib.database import get_conn
            conn = get_conn()
            conn.execute("UPDATE synthesis_tasks SET done=0")
            conn.commit()
            conn.close()
            tasks = load_tasks()
    
    pending = [t for t in tasks if t["done"] == 0]
    if pending:
        print(f"\n  ⚠ 还有 {len(pending)} 段待合成")
        print(f"  📋 任务数据库: synthesis.db")
        print(f"  🔧 请用合成工具（调用豆包 API）合成后，输入 y 继续")
        input("  准备好后按回车继续...")
        
        # 重新加载任务状态
        tasks = load_tasks()
    
    all_done = all(t["done"] == 1 for t in tasks)
    if not all_done:
        print(f"\n  ❌ 还有 {sum(1 for t in tasks if t['done']!=1)} 段尚未合成")
        print(f"  请先完成所有合成，然后重新运行此脚本")
        sys.exit(1)
    
    print(f"  ✅ 所有旁白段已合成")
    
    # 导入合成结果
    arranged = import_results(arranged)
    
    # ── Step 4: 拼接 + 打标 ─────────────────────────
    print()
    print("=" * 50)
    print("Step 4/5: 拼接音频 + 写入标记")
    print("=" * 50)
    
    # 生成输出文件名
    book = args.book or Path(args.input).stem
    output_filename = f"{book}-{args.episode}-{args.cv}-旁白-编排版.wav"
    if args.cv:
        output_filename = f"{book}-{args.episode}-{args.cv}-旁白-编排版.wav"
    else:
        output_filename = f"{book}-{args.episode}-旁白-编排版.wav"
    
    output_path = str(Path(args.output_dir) / output_filename)
    
    concatenate(arranged, output_path, fade_ms=80)
    add_markers_to_wav(output_path, arranged, silence_ms=args.silence_ms)
    
    # ── Step 5: 后处理（可选） ──────────────────────
    print()
    print("=" * 50)
    print("Step 5/5: 可选后处理")
    print("=" * 50)
    
    if not args.no_effects:
        preset_name = ask_effects()
        if preset_name:
            preset = BUILTIN_PRESETS[preset_name]
            final_path = output_path.replace(".wav", f"_{preset_name}.wav")
            apply_effects_chain(output_path, final_path, preset["effects"])
        else:
            print("  跳过")
    else:
        print("  跳过")
    
    # ── 完成 ─────────────────────────────────────────
    print()
    print("=" * 50)
    print(f"✅ 全部完成！")
    print(f"   输出文件: {output_path}")
    print(f"   旁白段数: {sum(1 for s in arranged if s.type == 'narration')}")
    print(f"   对话标记: {dialog_count}")
    print(f"   总字符数: {nar_count}")
    print("=" * 50)


if __name__ == "__main__":
    main()
