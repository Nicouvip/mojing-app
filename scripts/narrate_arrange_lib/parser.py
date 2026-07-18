"""
画本解析器 — parse_script.py

将画本文本解析为编排段列表（Segment）。
支持两种模式：
  模式A（auto）：自动解析 【角色-CV】"对话" 格式
  模式B（annotated）：手动标注 |旁白_START|~|旁白_END| 格式
"""

import re
from dataclasses import dataclass, field
from typing import Literal


# ── 数据结构 ─────────────────────────────────────────────


@dataclass
class NarrationSegment:
    type: Literal["narration"] = "narration"
    text: str = ""
    audio_path: str | None = None  # 合成后填充


@dataclass
class DialogMarker:
    type: Literal["dialog_marker"] = "dialog_marker"
    label: str = ""      # "标记01"
    note: str = ""       # 角色+对话内容，供参考


@dataclass
class SilenceSegment:
    type: Literal["silence"] = "silence"
    ms: int = 800        # 静音毫秒数


Segment = NarrationSegment | DialogMarker | SilenceSegment


# ── 模式B：手动标注解析 ─────────────────────────────────


PATTERN_ANNOTATED = re.compile(
    r'\|旁白_START\|\s*(.*?)\s*\|旁白_END\|',
    re.DOTALL,
)
PATTERN_MARKER = re.compile(r'\|角色[ _]*(.+?)\|')


def parse_annotated(text: str, silence_ms: int = 800) -> list[Segment]:
    """
    解析手动标注格式的文本。
    只解析内容，不插入静音（间距由 arranger 统一处理）。
    
    标注格式：
      |旁白_START|
      旁白内容...
      |旁白_END|
      |角色_标记01|
    """
    segments: list[Segment] = []
    last_end = 0

    for m in PATTERN_ANNOTATED.finditer(text):
        # 旁白段前的内容 → 可能有角色标记
        before = text[last_end : m.start()].strip()
        if before:
            for marker in PATTERN_MARKER.finditer(before):
                raw = marker.group(1).strip()
                # 去掉用户可能写的"标记"前缀
                code = raw.replace("标记", "").strip()
                segments.append(DialogMarker(
                    label=f"标记{code}",
                    note=raw,
                ))

        # 旁白段
        narration_text = m.group(1).strip()
        if narration_text:
            segments.append(NarrationSegment(text=narration_text))

        last_end = m.end()

    # 尾部剩余标记
    tail = text[last_end:].strip()
    if tail:
        for marker in PATTERN_MARKER.finditer(tail):
            raw = marker.group(1).strip()
            code = raw.replace("标记", "").strip()
            segments.append(DialogMarker(
                label=f"标记{code}",
                note=raw,
            ))

    return segments


# ── 模式A：自动解析画本 ─────────────────────────────────


# 匹配 【角色-CV】"对话"
QT = '\u201c'  # 中文左引号
QT_END = '\u201d'  # 中文右引号
PATTERN_DIALOG_FULL = re.compile(
    rf'【[^】]+】(?:{QT}|")[^{QT_END}"]*(?:{QT_END}|")'
)
# 匹配 【旁白-CV】"内容"（旁白标记行）
PATTERN_NARRATION_WRAP = re.compile(
    rf'【旁白[^】]*】(?:{QT}|")([^{QT_END}"]*)(?:{QT_END}|")'
)
# 匹配剩余的【角色...】标记
PATTERN_ROLE_TAG = re.compile(r'【[^】]+】')
# 提取角色名和对话内容（用于记录 note）
PATTERN_DIALOG_EXTRACT = re.compile(
    rf'【([^】]+?)(?:-[^】]*)?】(?:{QT}|")([^{QT_END}"]*)(?:{QT_END}|")'
)


def parse_auto(text: str, silence_ms: int = 800) -> list[Segment]:
    """
    自动解析标准画本格式。
    
    输入格式：
      【旁白-墨染青衣Nicou】"叙述文字..."
      【角色名-CV】"对话内容..."
      
    规则：
      1. 【旁白-CV】"内容" → 提取内容为旁白
      2. 【角色-CV】"对话" → 去掉，记录为 DialogMarker
      3. 纯文字行（无标记） → 保留为旁白
      4. 对话标记间 ≥800ms 静音
    """
    segments: list[Segment] = []
    lines = text.split('\n')
    
    i = 0
    marker_counter = 0
    pending_narration = []  # 累积连续旁白行
    
    def flush_narration():
        """将累积的旁白行写入一个 NarrationSegment"""
        nonlocal pending_narration
        if pending_narration:
            combined = ''.join(pending_narration).strip()
            if combined:
                segments.append(NarrationSegment(text=combined))
            pending_narration = []
    
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
        
        # 检查是否是 【旁白-CV】"内容" 包裹格式
        n_wrap = PATTERN_NARRATION_WRAP.search(line)
        if n_wrap:
            flush_narration()
            content = n_wrap.group(1).strip()
            if content:
                segments.append(NarrationSegment(text=content))
            i += 1
            continue
        
        # 检查是否包含 【角色-CV】"对话"（非旁白角色）
        has_dialog = PATTERN_DIALOG_FULL.search(line)
        if has_dialog:
            flush_narration()
            
            # 提取角色名和对话内容
            for dm in PATTERN_DIALOG_EXTRACT.finditer(line):
                role = dm.group(1).strip()
                dialog_text = dm.group(2).strip()
                
                # 跳过旁白标记行（已在前面处理过）
                if role.startswith('旁白'):
                    continue
                
                marker_counter += 1
                note = f"{role}：{dialog_text}" if dialog_text else role
                segments.append(DialogMarker(
                    label=f"标记{marker_counter:02d}",
                    note=note,
                ))
            
            # 检查行内是否有旁白残留（对话标记前后的文字）
            remaining = PATTERN_DIALOG_FULL.sub('', line).strip()
            remaining = PATTERN_ROLE_TAG.sub('', remaining).strip()
            if remaining and remaining not in ('"', '」', '「'):
                pending_narration.append(remaining)
            
            i += 1
            continue
        
        # 纯文字行 → 作为旁白累积
        # 先去掉可能残留的【角色】标记
        clean = PATTERN_ROLE_TAG.sub('', line).strip()
        if clean:
            pending_narration.append(clean)
        
        i += 1
    
    # 收尾累积旁白
    flush_narration()
    
    # 清理：去掉末尾多余的静音段
    while segments and segments[-1].type == "silence":
        segments.pop()
    
    return segments


# ── 主入口 ───────────────────────────────────────────────


def parse_script(
    text: str,
    mode: Literal["auto", "annotated"] = "auto",
    silence_ms: int = 800,
) -> list[Segment]:
    """
    解析画本文本，返回编排段列表。
    
    Args:
        text: 画本文本内容
        mode: "auto" 自动解析 / "annotated" 手动标注
        silence_ms: 标记位间插入的静音毫秒数
    
    Returns:
        编排段列表（NarrationSegment / DialogMarker / SilenceSegment）
    """
    if mode == "annotated":
        return parse_annotated(text, silence_ms)
    else:
        return parse_auto(text, silence_ms)


def format_segments(segments: list[Segment]) -> list[dict]:
    """将 Segment 列表转为可 JSON 序列化的字典列表"""
    result = []
    for seg in segments:
        if seg.type == "narration":
            result.append({
                "type": "narration",
                "text": seg.text,
                "audio_path": seg.audio_path,
            })
        elif seg.type == "dialog_marker":
            result.append({
                "type": "dialog_marker",
                "label": seg.label,
                "note": seg.note,
            })
        elif seg.type == "silence":
            result.append({
                "type": "silence",
                "ms": seg.ms,
            })
    return result
