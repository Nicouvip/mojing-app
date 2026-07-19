"""
批量合成模块 — synthesizer.py（SQLite 版）

生成合成任务清单，管理合成进度。
使用 SQLite 替代 JSON 做任务持久化（借鉴 Voicebox 方案）。

由于豆包 API 通过 Reasonix MCP 工具调用，
本模块负责：
  1. 从编排清单提取旁白段 → 生成合成任务到 SQLite
  2. 断点续传：查询已合成/未合成状态
  3. 导入合成结果：将合成后的音频路径写回编排清单
  4. 合成日志：记录每次合成的完整参数
"""

import os
from pathlib import Path

from .parser import Segment
from .arranger import arrange
from .database import (
    create_tasks, load_tasks as db_load_tasks,
    mark_done as db_mark_done, get_pending_count, get_done_count,
    get_synthesis_log, log_synthesis, print_summary as db_print_summary,
)
from .config_loader import output_dir as get_output_dir


OUTPUT_DIR = Path(get_output_dir())


def generate_tasks(
    segments: list[Segment],
    book: str = "",
    episode: str = "01",
    cv: str = "",
    output_dir: str | Path = OUTPUT_DIR,
) -> list[dict]:
    """
    从编排清单生成合成任务列表并写入 SQLite。
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

    # 写入 SQLite
    create_tasks(tasks)
    return tasks


def load_tasks() -> list[dict]:
    """从 SQLite 加载任务清单"""
    return db_load_tasks()


def mark_done(task_id: int, duration_ms: int = 0):
    """标记一个任务为已完成"""
    db_mark_done(task_id, duration_ms)


def log_params(
    task_id: int,
    voice_type: str = "",
    speech_rate: int = 0,
    pitch: int = 0,
    loudness_rate: int = 0,
    context_texts: list[str] | None = None,
    cot_summary: str = "",
    duration_ms: int = 0,
):
    """记录一次合成的完整参数"""
    log_synthesis(task_id, voice_type, speech_rate, pitch,
                  loudness_rate, context_texts, cot_summary, duration_ms)


def import_results(
    segments: list[Segment],
    output_dir: str | Path = OUTPUT_DIR,
) -> list[Segment]:
    """
    将合成结果导入回编排清单。
    读取已完成任务的音频路径，写入对应 NarrationSegment。
    """
    tasks = load_tasks()
    task_map = {t["task_id"]: t for t in tasks}

    nar_idx = 0
    for seg in segments:
        if seg.type == "narration":
            nar_idx += 1
            task = task_map.get(nar_idx)
            if task and task["done"] == 1 and os.path.exists(task["output_path"]):
                seg.audio_path = task["output_path"]

    return segments


def print_task_summary(tasks: list[dict] | None = None):
    """打印合成任务概要"""
    db_print_summary()


def print_synthesis_log(limit: int = 10):
    """打印最近的合成参数记录"""
    records = get_synthesis_log(limit)
    if not records:
        print("  (暂无合成记录)")
        return

    print(f"  {'任务':>4s} {'字符':>4s} {'音色':>12s} {'语速':>4s} {'音调':>4s} {'时长':>6s}")
    print(f"  " + "-" * 50)
    for r in records:
        ctx = r["context_texts"] or ""
        print(f"  [{r['task_id']:02d}] {r['text_len']:4d} "
              f"{(r['voice_type'] or '-')[:12]:>12s} "
              f"{r['speech_rate'] or 0:4d} {r['pitch'] or 0:4d} "
              f"{r['duration_ms'] or 0:5d}ms")
