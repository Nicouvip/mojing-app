"""
批量合成模块 — synthesizer.py

生成合成任务清单，管理合成进度。
由于豆包 API 通过 Reasonix MCP 工具调用，
本模块负责：
  1. 从编排清单提取旁白段 → 生成合成任务清单 JSON
  2. 断点续传：记录已合成/未合成状态
  3. 导入合成结果：将合成后的音频路径写回编排清单
"""

import json
import os
from pathlib import Path

from .parser import NarrationSegment, Segment
from .arranger import arrange, segments_to_json


# 输出目录
OUTPUT_DIR = Path("D:/codexvip/audio-outputs/arranged")
TASK_FILE = "synthesize_tasks.json"
STATUS_FILE = "synthesis_status.json"


def generate_tasks(
    segments: list[Segment],
    book: str = "",
    episode: str = "01",
    cv: str = "",
    output_dir: str | Path = OUTPUT_DIR,
) -> list[dict]:
    """
    从编排清单生成合成任务列表。
    每个任务包含：序号、文本、目标文件路径。
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    tasks = []
    nar_idx = 0
    
    for seg in segments:
        if seg.type == "narration":
            nar_idx += 1
            filename = f"{book}-{episode}-{cv}-旁段{nar_idx:02d}.wav"
            tasks.append({
                "task_id": nar_idx,
                "text": seg.text,
                "text_len": len(seg.text),
                "output_path": str(output_dir / filename),
                "done": False,
            })
    
    return tasks


def save_tasks(tasks: list[dict], output_dir: str | Path = OUTPUT_DIR):
    """保存合成任务清单"""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    with open(output_dir / TASK_FILE, "w", encoding="utf-8") as f:
        json.dump(tasks, f, ensure_ascii=False, indent=2)
    # 同时保存状态文件
    save_status(tasks, output_dir)


def save_status(tasks: list[dict], output_dir: str | Path = OUTPUT_DIR):
    """保存合成状态（断点续传用）"""
    output_dir = Path(output_dir)
    status = []
    for t in tasks:
        status.append({
            "task_id": t["task_id"],
            "text_preview": t["text"][:50],
            "text_len": len(t["text"]),
            "output_path": t["output_path"],
            "done": t["done"],
        })
    with open(output_dir / STATUS_FILE, "w", encoding="utf-8") as f:
        json.dump(status, f, ensure_ascii=False, indent=2)


def load_status(output_dir: str | Path = OUTPUT_DIR) -> list[dict]:
    """加载合成状态"""
    status_path = Path(output_dir) / STATUS_FILE
    if status_path.exists():
        with open(status_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def load_tasks(output_dir: str | Path = OUTPUT_DIR) -> list[dict]:
    """加载合成任务清单"""
    task_path = Path(output_dir) / TASK_FILE
    if task_path.exists():
        with open(task_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def mark_done(task_id: int, output_dir: str | Path = OUTPUT_DIR):
    """标记一个任务为已完成"""
    tasks = load_tasks(output_dir)
    for t in tasks:
        if t["task_id"] == task_id:
            t["done"] = True
            break
    save_tasks(tasks, output_dir)


def import_results(
    segments: list[Segment],
    output_dir: str | Path = OUTPUT_DIR,
) -> list[Segment]:
    """
    将合成结果导入回编排清单。
    读取已完成任务的音频路径，写入对应 NarrationSegment。
    """
    tasks = load_tasks(output_dir)
    task_map = {t["task_id"]: t for t in tasks}
    
    nar_idx = 0
    for seg in segments:
        if seg.type == "narration":
            nar_idx += 1
            task = task_map.get(nar_idx)
            if task and task["done"] and os.path.exists(task["output_path"]):
                seg.audio_path = task["output_path"]
    
    return segments


def print_task_summary(tasks: list[dict]):
    """打印合成任务概要"""
    total = len(tasks)
    done = sum(1 for t in tasks if t["done"])
    total_chars = sum(t["text_len"] for t in tasks)
    
    print(f"=" * 50)
    print(f"📋 合成任务清单")
    print(f"=" * 50)
    print(f"  总段数：{total}")
    print(f"  已完成：{done}")
    print(f"  待合成：{total - done}")
    print(f"  总字符数：{total_chars}")
    print(f"-" * 50)
    for t in tasks:
        status = "✅" if t["done"] else "⏳"
        preview = t.get("text_preview", t["text"][:50])
        print(f"  {status} [{t['task_id']:02d}] {preview}...")
    print(f"=" * 50)
