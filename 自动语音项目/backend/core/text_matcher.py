"""
文字匹配器

核心任务：将 ASR 转写结果（带时间戳的文字）与剧本台词逐句匹配，
确定每段音频对应剧本的哪一句，并计算出对齐位置。
"""

from difflib import SequenceMatcher
from typing import Optional

from .asr_adapter import ASRResult, ASRSegment
from .script_parser import Script, Line


def normalize_text(text: str) -> str:
    """文本标准化：去标点、去空格、转小写"""
    import re
    # 去除非中文/英文/数字的字符（保留文字主体）
    text = re.sub(r'[^\w\u4e00-\u9fff]', '', text)
    return text.strip().lower()


def text_similarity(a: str, b: str) -> float:
    """计算两段文本的相似度（0-1）"""
    a_norm = normalize_text(a)
    b_norm = normalize_text(b)
    if not a_norm or not b_norm:
        return 0.0
    return SequenceMatcher(None, a_norm, b_norm).ratio()


def match_line_to_segment(
    line: Line,
    segments: list[ASRSegment],
    start_index: int = 0,
) -> tuple[Optional[ASRSegment], float, int]:
    """
    将一句台词与 ASR segments 列表匹配

    返回:
        (最佳匹配的 segment, 置信度, 使用的 segment 数量)
    """
    line_text_norm = normalize_text(line.text)
    if not line_text_norm:
        return None, 0.0, 0

    best_score = 0.0
    best_seg = None
    best_count = 1

    # 尝试匹配1-3个连续segments
    for count in range(1, min(4, len(segments) - start_index)):
        cand_segs = segments[start_index:start_index + count]
        cand_text = "".join(s.text for s in cand_segs)
        score = text_similarity(line_text_norm, cand_text)
        if score > best_score:
            best_score = score
            best_seg = cand_segs[0]  # 用第一个segment作为时间参考
            best_count = count

    return best_seg, best_score, best_count


def match_clip_to_script(
    asr_result: ASRResult,
    script: Script,
    role: str = "",
) -> list[dict]:
    """
    将一段音频的 ASR 结果匹配到剧本，返回对齐结果列表

    返回:
    [
        {
            "line_index": int,      # 匹配到的剧本行index
            "role": str,
            "script_text": str,     # 原文
            "matched_text": str,    # ASR匹配文本
            "confidence": float,    # 匹配置信度
            "audio_start": float,   # 在音频中的开始时间（秒）
            "audio_end": float,     # 在音频中的结束时间（秒）
        },
        ...
    ]
    """
    # 过滤角色
    if role:
        target_lines = [l for l in script.lines if l.role == role]
    else:
        target_lines = script.lines

    # 如果指定角色但没找到，尝试匹配全部
    if not target_lines:
        target_lines = script.lines

    segments = asr_result.segments
    results = []
    seg_index = 0

    for line in target_lines:
        matched_seg, confidence, used_count = match_line_to_segment(
            line, segments, seg_index
        )

        if matched_seg and confidence > 0.3:
            # 计算该 segment 对应的结束时间
            end_idx = min(seg_index + used_count, len(segments))
            end_time = segments[end_idx - 1].end if end_idx > seg_index else matched_seg.end
            # 取匹配到的所有segments的文本
            matched_text = "".join(s.text for s in segments[seg_index:end_idx])

            results.append({
                "line_index": line.index,
                "role": line.role,
                "script_text": line.text,
                "matched_text": matched_text,
                "confidence": round(confidence, 4),
                "audio_start": matched_seg.start,
                "audio_end": end_time,
            })
            seg_index += used_count
        else:
            # 没匹配上，跳过
            pass

    return results


def align_script_clips(
    script: Script,
    clip_results: list[dict],
) -> list[dict]:
    """
    将所有音频片段的对齐结果合并为完整时间轴

    clip_results: [
        {
            "clip_index": 0,
            "clip_label": "张总_1.wav",
            "role": "张总",
            "matches": [  # 来自 match_clip_to_script 的结果
                { "line_index": 0, "audio_start": 0.5, "audio_end": 2.3, ... },
                ...
            ]
        },
        ...
    ]

    返回:
    [
        {
            "line_index": 0,
            "role": "张总",
            "text": "大家好",
            "source_clip": "张总_1.wav",
            "audio_offset": 0.5,    # 在原始音频中的偏移
            "timeline_start": 0.0,  # 在最终时间轴上的起始位置
            "timeline_end": 1.8,    # 在最终时间轴上的结束位置
        },
        ...
    ]
    """
    timeline = []
    current_time = 0.0

    # 按剧本行顺序构建时间线
    line_order = {l.index: l for l in script.lines}

    for clip_result in clip_results:
        for match in clip_result.get("matches", []):
            line_index = match["line_index"]
            if line_index not in line_order:
                continue

            duration = match["audio_end"] - match["audio_start"]
            timeline.append({
                "line_index": line_index,
                "role": match.get("role", clip_result.get("role", "")),
                "text": line_order[line_index].text,
                "source_clip": clip_result.get("clip_label", ""),
                "audio_offset": match["audio_start"],
                "audio_end": match["audio_end"],
                "timeline_start": current_time,
                "timeline_end": current_time + duration,
                "confidence": match.get("confidence", 0.0),
            })
            current_time += duration

    return timeline
