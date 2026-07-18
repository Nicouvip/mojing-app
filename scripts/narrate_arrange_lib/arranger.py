"""
编排清单生成器 — arranger.py

将 parser 输出的段列表处理为最终编排清单：
- 超长旁白段自动拆分（≤500字/段，豆包单段上限预留余量）
- 标记间确保 ≥800ms 静音
- 输出 JSON 供用户确认
"""

import json
from typing import Literal

from .parser import (
    Segment, NarrationSegment, DialogMarker, SilenceSegment,
    format_segments,
)


# 豆包单段文本上限（含 cot 标签），预留余量
MAX_CHARS_PER_SEGMENT = 2000


def split_long_text(text: str, max_chars: int = MAX_CHARS_PER_SEGMENT) -> list[str]:
    """
    将超长文本按句子边界拆分为多段。
    优先在句号、问号、感叹号、省略号处拆分。
    """
    if len(text) <= max_chars:
        return [text]
    
    import re
    parts = []
    # 按句子分割
    sentences = re.split(r'(?<=[。？！…！\.\?\!])', text)
    
    current = ""
    for sent in sentences:
        if not sent.strip():
            continue
        if len(current) + len(sent) <= max_chars:
            current += sent
        else:
            if current:
                parts.append(current.strip())
            # 单句超长则硬切
            if len(sent) > max_chars:
                while len(sent) > max_chars:
                    parts.append(sent[:max_chars].strip())
                    sent = sent[max_chars:]
                current = sent
            else:
                current = sent
    
    if current:
        parts.append(current.strip())
    
    return parts if parts else [text]


def arrange(
    segments: list[Segment],
    max_chars: int = MAX_CHARS_PER_SEGMENT,
    silence_ms: int = 800,
) -> list[Segment]:
    """
    处理编排清单：
    1. 超长旁白段拆分
    2. 合并连续静音段
    3. 确保标记前有静音
    4. 清理收尾多余静音
    """
    result: list[Segment] = []
    
    for seg in segments:
        if seg.type == "narration":
            texts = split_long_text(seg.text, max_chars)
            for i, t in enumerate(texts):
                if i > 0:
                    # 拆分出来的续段，前补短静音（300ms，连续性停顿非角色位）
                    result.append(SilenceSegment(ms=300))
                result.append(NarrationSegment(text=t))
        elif seg.type == "dialog_marker":
            # 和前一个段之间确保有静音
            if result and result[-1].type != "silence":
                result.append(SilenceSegment(ms=silence_ms))
            result.append(seg)
            # 标记后也补一份静音（等待角色音的时长）
            result.append(SilenceSegment(ms=silence_ms))
        else:
            # 合并连续静音段
            if result and result[-1].type == "silence":
                result[-1] = SilenceSegment(ms=result[-1].ms + seg.ms)
            else:
                result.append(seg)
    
    # 清理收尾多余静音
    while result and result[-1].type == "silence":
        result.pop()
    
    return result


def segments_to_json(segments: list[Segment], indent: int = 2) -> str:
    """将编排清单输出为 JSON 字符串"""
    return json.dumps(format_segments(segments), ensure_ascii=False, indent=indent)


def count_narration_chars(segments: list[Segment]) -> int:
    """统计旁白段总字符数"""
    return sum(len(s.text) for s in segments if s.type == "narration")


def count_dialog_markers(segments: list[Segment]) -> int:
    """统计对话标记数"""
    return sum(1 for s in segments if s.type == "dialog_marker")
