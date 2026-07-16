"""
剧本解析器

支持格式:
  [角色名]: 台词内容
  角色名：台词内容
  角色名: 台词内容

也支持纯文本（无角色标记），自动分配为"旁白"
"""

import re
from dataclasses import dataclass, field


@dataclass
class Line:
    """一句台词"""
    role: str          # 角色名
    text: str          # 台词原文
    index: int = 0     # 在剧本中的序号（从0开始）


@dataclass
class Script:
    """解析后的剧本"""
    raw_text: str                    # 原文
    lines: list[Line] = field(default_factory=list)
    roles: list[str] = field(default_factory=list)  # 去重角色列表

    def to_dict(self) -> dict:
        return {
            "raw_text": self.raw_text,
            "lines": [
                {"role": l.role, "text": l.text, "index": l.index}
                for l in self.lines
            ],
            "roles": self.roles,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Script":
        script = cls(raw_text=data.get("raw_text", ""))
        for ld in data.get("lines", []):
            script.lines.append(Line(
                role=ld["role"], text=ld["text"], index=ld["index"]
            ))
        script.roles = data.get("roles", [])
        script._reindex()
        return script

    def _reindex(self):
        for i, l in enumerate(self.lines):
            l.index = i


# 严格匹配 [角色]: 台词
_LINE_PATTERN = re.compile(
    r'^\[(?P<role>[^\]]+?)\]\s*[：:]\s*(?P<text>.+)'
)

# 宽松匹配：角色：台词（角色部分最多6个字，避免误匹配小说对话）
_LOOSE_PATTERN = re.compile(
    r'^(?P<role>[^\]:]{1,6}?)\s*[：:]\s*(?P<text>.+)'
)


def parse_script(raw_text: str) -> Script:
    """
    解析剧本文本，返回 Script 对象

    自动检测格式：
    - 含有 [角色]: 标记 → 按角色分行
    - 纯文本（无标记）→ 整体作为旁白
    """
    script = Script(raw_text=raw_text)
    roles_seen: set[str] = set()

    lines = raw_text.strip().split("\n")
    non_empty = [ln.strip() for ln in lines if ln.strip()]

    # 检测格式：必须至少有一条严格匹配 [角色]: 才走角色解析
    strict_matches = sum(1 for ln in non_empty if _LINE_PATTERN.match(ln))

    if strict_matches == 0:
        # 没有 [角色]: 标记 → 纯文本模式（适合小说）
        script.lines.append(Line(role="旁白", text=raw_text.strip(), index=0))
        script.roles = ["旁白"]
        return script

    for line_text in lines:
        line_text = line_text.strip()
        if not line_text:
            continue

        m = _LINE_PATTERN.match(line_text)
        if not m:
            m = _LOOSE_PATTERN.match(line_text)
        if m:
            role = m.group("role").strip()
            text = m.group("text").strip()
        else:
            role = "旁白"
            text = line_text

        if text:
            roles_seen.add(role)
            script.lines.append(Line(role=role, text=text, index=len(script.lines)))

    script.roles = sorted(roles_seen)
    return script


def script_to_alignment_target(script: Script) -> list[dict]:
    """
    将剧本转换为对齐目标列表（供前端/匹配器使用）
    每个条目：{ index, role, text, start_char, end_char }
    """
    full_text = " ".join(l.text for l in script.lines)
    result = []
    char_pos = 0
    for l in script.lines:
        result.append({
            "index": l.index,
            "role": l.role,
            "text": l.text,
            "start_char": char_pos,
            "end_char": char_pos + len(l.text),
        })
        char_pos += len(l.text) + 1  # +1 for space
    return result
