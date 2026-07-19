"""
数据库模块 — database.py

SQLite 替代 JSON 管理合成任务。
借鉴 Voicebox 的 SQLite 持久化方案。

表结构：
  synthesis_tasks — 合成任务 + 参数日志
"""

import os
import json
import sqlite3
from datetime import datetime
from pathlib import Path

from .config_loader import output_dir


DB_PATH = Path(output_dir()) / "synthesis.db"


def get_conn() -> sqlite3.Connection:
    """获取数据库连接（自动创建表）"""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")  # 并发安全
    _init_db(conn)
    return conn


def _init_db(conn: sqlite3.Connection):
    """初始化数据库表"""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS synthesis_tasks (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id     INTEGER NOT NULL,
            text        TEXT NOT NULL,
            text_len    INTEGER NOT NULL,
            output_path TEXT NOT NULL,
            done        INTEGER DEFAULT 0,
            
            -- 合成参数（记录供复现）
            voice_type      TEXT,
            speech_rate     INTEGER,
            pitch           INTEGER,
            loudness_rate   INTEGER,
            context_texts   TEXT,
            cot_summary     TEXT,
            
            -- 音频信息
            duration_ms     INTEGER,
            
            -- 时间戳
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()


# ── 任务管理 ────────────────────────────────────────────


def create_tasks(tasks: list[dict]):
    """批量创建合成任务"""
    conn = get_conn()
    try:
        # 清空旧任务
        conn.execute("DELETE FROM synthesis_tasks")
        for t in tasks:
            conn.execute("""
                INSERT INTO synthesis_tasks
                    (task_id, text, text_len, output_path, done)
                VALUES (?, ?, ?, ?, ?)
            """, (t["task_id"], t["text"], t["text_len"],
                  t["output_path"], 1 if t.get("done") else 0))
        conn.commit()
    finally:
        conn.close()


def load_tasks() -> list[dict]:
    """加载所有任务"""
    conn = get_conn()
    try:
        rows = conn.execute(
            "SELECT * FROM synthesis_tasks ORDER BY task_id"
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def mark_done(task_id: int, duration_ms: int = 0):
    """标记一个任务为已完成"""
    conn = get_conn()
    try:
        conn.execute(
            "UPDATE synthesis_tasks SET done=1, duration_ms=?, "
            "updated_at=CURRENT_TIMESTAMP WHERE task_id=?",
            (duration_ms, task_id),
        )
        conn.commit()
    finally:
        conn.close()


def mark_failed(task_id: int):
    """标记一个任务为失败"""
    conn = get_conn()
    try:
        conn.execute(
            "UPDATE synthesis_tasks SET done=-1, "
            "updated_at=CURRENT_TIMESTAMP WHERE task_id=?",
            (task_id,),
        )
        conn.commit()
    finally:
        conn.close()


def get_pending_count() -> int:
    """获取待合成的任务数"""
    conn = get_conn()
    try:
        row = conn.execute(
            "SELECT COUNT(*) as cnt FROM synthesis_tasks WHERE done=0"
        ).fetchone()
        return row["cnt"] if row else 0
    finally:
        conn.close()


def get_done_count() -> int:
    """获取已合成的任务数"""
    conn = get_conn()
    try:
        row = conn.execute(
            "SELECT COUNT(*) as cnt FROM synthesis_tasks WHERE done=1"
        ).fetchone()
        return row["cnt"] if row else 0
    finally:
        conn.close()


# ── 合成日志 ────────────────────────────────────────────


def log_synthesis(
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
    conn = get_conn()
    try:
        conn.execute("""
            UPDATE synthesis_tasks SET
                voice_type=?, speech_rate=?, pitch=?, loudness_rate=?,
                context_texts=?, cot_summary=?,
                duration_ms=?, updated_at=CURRENT_TIMESTAMP
            WHERE task_id=?
        """, (
            voice_type, speech_rate, pitch, loudness_rate,
            json.dumps(context_texts, ensure_ascii=False) if context_texts else None,
            cot_summary, duration_ms, task_id,
        ))
        conn.commit()
    finally:
        conn.close()


def get_synthesis_log(limit: int = 20) -> list[dict]:
    """获取最近的合成记录（含参数）"""
    conn = get_conn()
    try:
        rows = conn.execute("""
            SELECT task_id, text_len, voice_type, speech_rate, pitch,
                   context_texts, duration_ms, created_at
            FROM synthesis_tasks
            WHERE done=1 AND voice_type IS NOT NULL
            ORDER BY updated_at DESC
            LIMIT ?
        """, (limit,)).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def print_summary():
    """打印任务摘要"""
    conn = get_conn()
    try:
        total = conn.execute(
            "SELECT COUNT(*) as cnt FROM synthesis_tasks"
        ).fetchone()["cnt"]
        done = conn.execute(
            "SELECT COUNT(*) as cnt FROM synthesis_tasks WHERE done=1"
        ).fetchone()["cnt"]
        failed = conn.execute(
            "SELECT COUNT(*) as cnt FROM synthesis_tasks WHERE done=-1"
        ).fetchone()["cnt"]
        total_chars = conn.execute(
            "SELECT COALESCE(SUM(text_len),0) as total FROM synthesis_tasks"
        ).fetchone()["total"]

        print(f"  总段数：{total}")
        print(f"  已完成：{done}")
        print(f"  已失败：{failed}")
        print(f"  待合成：{total - done - failed}")
        print(f"  总字符数：{total_chars}")

        # 输出详细列表
        rows = conn.execute(
            "SELECT * FROM synthesis_tasks ORDER BY task_id"
        ).fetchall()
        print(f"  " + "-" * 50)
        for r in rows:
            status = "✅" if r["done"] == 1 else "❌" if r["done"] == -1 else "⏳"
            preview = r["text"][:45] if r["text"] else ""
            print(f"  {status} [{r['task_id']:02d}] {preview}...")
    finally:
        conn.close()
