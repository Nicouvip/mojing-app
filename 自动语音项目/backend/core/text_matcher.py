"""
文字匹配器

核心任务：将 ASR 转写结果（带时间戳的文字）与剧本台词逐句匹配，
确定每段音频对应剧本的哪一句，并计算出对齐位置。

支持两种模式：
1. 角色剧本模式：[角色]: 台词 → 按角色和行号匹配
2. 小说模式：整段文本 → 全文模糊搜索定位
"""

from difflib import SequenceMatcher
from typing import Optional

from .asr_adapter import ASRResult, ASRSegment
from .script_parser import Script, Line


def normalize_text(text: str) -> str:
    """文本标准化：去标点、去空格、转小写"""
    import re
    text = re.sub(r'[^\w\u4e00-\u9fff]', '', text)
    return text.strip().lower()


def text_similarity(a: str, b: str) -> float:
    """计算两段文本的相似度（0-1）"""
    a_norm = normalize_text(a)
    b_norm = normalize_text(b)
    if not a_norm or not b_norm:
        return 0.0
    return SequenceMatcher(None, a_norm, b_norm).ratio()


def find_best_position(query: str, full_text: str) -> tuple[int, int, float]:
    """
    在全文文本中找到查询文本的最佳匹配位置

    使用快速近似搜索：找查询文本中连续子串在全文中的最长匹配。

    返回:
        (start_char, end_char, confidence)
    """
    query_norm = normalize_text(query)
    full_norm = normalize_text(full_text)

    if not query_norm or not full_norm:
        return (0, 0, 0.0)

    if len(query_norm) > len(full_norm):
        query_norm = query_norm[:len(full_norm)]

    # 快速方法：取查询文本的前 N 个字符作为种子，在全文搜索
    # 如果查询太长，只取前30字和后30字作为搜索依据
    window = min(30, len(query_norm))
    prefix = query_norm[:window]
    suffix = query_norm[-window:] if len(query_norm) > window else ""

    best_score = 0.0
    best_pos = 0

    # 用前缀和后缀在全文种搜索
    for seed in [prefix, suffix]:
        idx = full_norm.find(seed)
        if idx >= 0:
            # 计算这个位置的完整匹配得分
            end = min(idx + len(query_norm), len(full_norm))
            chunk = full_norm[idx:end]
            score = SequenceMatcher(None, query_norm, chunk).ratio()
            if score > best_score:
                best_score = score
                best_pos = idx

    # 如果种子搜索没找到，用全局粗略采样
    if best_score < 0.1 and len(full_norm) < 10000:
        step = max(1, len(full_norm) // 50)
        for i in range(0, len(full_norm) - window + 1, step):
            chunk = full_norm[i:i + window * 2]
            score = SequenceMatcher(None, query_norm[:window * 2], chunk).ratio()
            if score > best_score:
                best_score = score
                best_pos = i

    end_pos = min(best_pos + len(query_norm), len(full_norm))
    return (best_pos, end_pos, best_score)
    return (best_pos, end_pos, best_score)


def _get_chapter_text(full_text: str, clip_label: str) -> str:
    import re
    if not clip_label:
        return full_text
    chapter_nums = re.findall(r'[第]([一二三四五六七八九十\d]+)[篇章部篇]', clip_label)
    if not chapter_nums:
        nums = re.findall(r'(\d+)', clip_label)
        if nums:
            chapter_nums = [nums[0]]
    if not chapter_nums:
        return full_text
    cn = chapter_nums[0]
    cn_map = {'一':'1','二':'2','三':'3','四':'4','五':'5','六':'6','七':'7','八':'8','九':'9','十':'10'}
    arabic = cn_map.get(cn, cn)
    markers = [f'第{arabic}章', f'第{cn}章', f'第{arabic}篇', f'第{cn}篇', f'第{arabic}部分']
    found = None
    for m in markers:
        pos = full_text.find(m)
        if pos >= 0:
            found = pos
            break
    if found is None:
        return full_text
    n = int(arabic) if arabic.isdigit() else 2
    next_markers = [f'第{i}章' for i in range(n+1, n+10)] + [f'第{i}篇' for i in range(n+1, n+10)]
    end = None
    for nm in next_markers:
        pos = full_text.find(nm, found + 5)
        if pos >= 0:
            end = pos
            break
    return full_text[found:end] if end else full_text[found:]


def match_clip_to_novel(
    asr_text: str,
    full_text: str,
    clip_label: str = "",
    role: str = "",
) -> list[dict]:
    """
    将一段音频的 ASR 转写结果匹配到小说全文

    参数:
        asr_text: ASR 识别的文本
        full_text: 小说全文
        clip_label: 音频文件名
        role: 角色名

    返回:
        [{"line_index": 0, "text": ..., "audio_start": 0, ...}, ...]
    """
    if not asr_text.strip():
        return []

    chapter_text = _get_chapter_text(full_text, clip_label)
    search_text = chapter_text if len(chapter_text) < len(full_text) else full_text

    start_pos, end_pos, confidence = find_best_position(asr_text, search_text)

    if confidence < 0.05:
        confidence = max(confidence, 0.01)

    return [{
        "line_index": 0,
        "role": role or "旁白",
        "script_text": full_text[max(0, start_pos-5):min(len(full_text), end_pos+5)],
        "matched_text": asr_text,
        "confidence": round(confidence, 4),
        "audio_start": 0.0,
        "audio_end": 0.0,
        "_char_start": start_pos,
        "_char_end": end_pos,
    }]


def match_clip_to_script(
    asr_result: ASRResult,
    script: Script,
    role: str = "",
) -> list[dict]:
    """
    将一段音频的 ASR 结果匹配到剧本

    自动选择匹配模式：
    - 小说模式（script 只有1句旁白）→ 全文搜索
    - 角色模式（script 有多句）→ 逐句匹配
    """
    # 检测是否为小说模式
    is_novel = len(script.lines) == 1 and script.lines[0].role == "旁白" and len(script.lines[0].text) > 500

    if is_novel:
        return match_clip_to_novel(
            asr_text=asr_result.text,
            full_text=script.lines[0].text,
            clip_label="",
            role=role,
        )

    # 角色剧本模式原有逻辑
    if role:
        target_lines = [l for l in script.lines if l.role == role]
    else:
        target_lines = script.lines

    if not target_lines:
        target_lines = script.lines

    segments = asr_result.segments
    results = []
    seg_index = 0

    for line in target_lines:
        matched_seg, confidence, used_count = _match_line_to_segment(
            line, segments, seg_index
        )

        if matched_seg and confidence > 0.3:
            end_idx = min(seg_index + used_count, len(segments))
            end_time = segments[end_idx - 1].end if end_idx > seg_index else matched_seg.end
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

    return results


def _match_line_to_segment(
    line: Line,
    segments: list[ASRSegment],
    start_index: int = 0,
) -> tuple[Optional[ASRSegment], float, int]:
    """将一句台词与 ASR segments 列表匹配"""
    line_text_norm = normalize_text(line.text)
    if not line_text_norm:
        return None, 0.0, 0

    best_score = 0.0
    best_seg = None
    best_count = 1

    for count in range(1, min(4, len(segments) - start_index)):
        cand_segs = segments[start_index:start_index + count]
        cand_text = "".join(s.text for s in cand_segs)
        score = text_similarity(line_text_norm, cand_text)
        if score > best_score:
            best_score = score
            best_seg = cand_segs[0]
            best_count = count

    return best_seg, best_score, best_count


def align_script_clips(
    script: Script,
    clip_results: list[dict],
) -> list[dict]:
    """
    将所有音频片段的对齐结果合并为完整时间轴
    """
    is_novel = len(script.lines) == 1 and script.lines[0].role == "旁白" and len(script.lines[0].text) > 500

    if is_novel:
        return _align_novel_clips(script, clip_results)

    # 原有角色模式
    timeline = []
    current_time = 0.0
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


def _align_novel_clips(
    script: Script,
    clip_results: list[dict],
) -> list[dict]:
    """
    小说模式对齐：
    1. 优先从文件名提取序号排序（第三篇-01-旁白 → 01）
    2. 文字匹配结果作为补充排序依据
    3. 构建时间线
    """
    import re
    full_text = script.lines[0].text

    def extract_seq(name):
        """从文件名提取序号"""
        nums = re.findall(r'[-\~（(](\d+)[-\）)]', name)
        if nums:
            return int(nums[0])
        nums = re.findall(r'(\d+)', name)
        return int(nums[0]) if nums else 999

    # 收集所有匹配
    entries = []
    for clip_result in clip_results:
        clip_label = clip_result.get("clip_label", "")
        role = clip_result.get("role", "")
        seq = extract_seq(clip_label)
        for match in clip_result.get("matches", []):
            char_start = match.get("_char_start", 0)
            char_end = match.get("_char_end", 0)
            ctx_start = max(0, char_start - 15)
            ctx_end = min(len(full_text), char_end + 15)
            matched_text = full_text[ctx_start:ctx_end]
            entries.append({
                "char_pos": char_start,
                "seq": seq,
                "line_index": 0,
                "role": role or "旁白",
                "text": matched_text,
                "source_clip": clip_label,
                "audio_offset": match.get("audio_start", 0),
                "audio_end": match.get("audio_end", 0),
                "confidence": match.get("confidence", 0.0),
            })

    if not entries:
        return []

    # 判断用哪种排序：如果置信度平均值 > 0.15 用文本位置，否则用文件名序号
    avg_conf = sum(e["confidence"] for e in entries) / len(entries)
    if avg_conf > 0.15:
        entries.sort(key=lambda e: e["char_pos"])
    else:
        entries.sort(key=lambda e: e["seq"])

    # 去重：同一个文件只保留第一次出现
    seen = set()
    unique = []
    for e in entries:
        if e["source_clip"] not in seen:
            seen.add(e["source_clip"])
            unique.append(e)

    # 构建时间线
    timeline = []
    current_time = 0.0

    for entry in unique:
        duration = entry["audio_end"] - entry["audio_offset"]
        if duration <= 0:
            duration = 10.0

        timeline.append({
            "line_index": entry["line_index"],
            "role": entry["role"],
            "text": (entry["text"][:80] + "...") if len(entry["text"]) > 80 else entry["text"],
            "source_clip": entry["source_clip"],
            "audio_offset": entry["audio_offset"],
            "audio_end": entry["audio_end"],
            "timeline_start": current_time,
            "timeline_end": current_time + duration,
            "confidence": entry["confidence"],
        })
        current_time += duration

    return timeline
