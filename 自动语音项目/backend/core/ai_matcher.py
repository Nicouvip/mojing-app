import re, json, requests
from dataclasses import dataclass


@dataclass
class MimoMatcherConfig:
    api_key: str = ""
    base_url: str = "https://token-plan-cn.xiaomimimo.com/v1"
    model: str = "mimo-v2.5-pro"


def _call(prompt: str, cfg: MimoMatcherConfig, tokens: int = 100) -> str:
    if not cfg.api_key: return ""
    headers = {"api-key": cfg.api_key, "Content-Type": "application/json"}
    payload = {"model": cfg.model, "messages": [{"role": "user", "content": prompt}], "max_tokens": tokens}
    try:
        r = requests.post(f"{cfg.base_url}/chat/completions", headers=headers, data=json.dumps(payload), timeout=60)
        r.raise_for_status()
        m = r.json()["choices"][0]["message"]
        return m.get("reasoning_content", "") or m.get("content", "")
    except: return ""


def _judge(text: str, script: str, cfg: MimoMatcherConfig) -> bool:
    """判断音频内容是否属于剧本"""
    resp = _call(f"剧本：{script[:200]}。音频：{text[:80]}。属于这个剧本？是或否。", cfg)
    last = resp[-200:]
    # 否定词权重更高
    neg = sum(1 for w in ["不在", "没有", "不属于"] if w in last) * 2
    neg += sum(1 for w in ["否"] if w in last)
    pos = sum(1 for w in ["是", "在", "属于"] if w in last)
    if pos > neg: return True
    if neg > pos: return False
    return last.count("是") > last.count("否")


def ai_match_clips(clips: list[dict], full_text: str, cfg: MimoMatcherConfig) -> list[dict]:
    if not clips or not full_text or not cfg.api_key: return []
    items = [{"label":c.get("label",""), "text":c.get("asr_text","")[:200], "role":c.get("role","")} for c in clips if c.get("asr_text")]
    if not items: return []

    matched = [it for it in items if it["text"] and _judge(it["text"], full_text, cfg)]

    if not matched:
        matched = sorted(items, key=lambda x: int(re.findall(r'\d+', x["label"])[0]) if re.findall(r'\d+', x["label"]) else 999)

    tl = []
    t = 0.0
    for it in matched:
        tl.append({"line_index":0, "role":it["role"] or "旁白", "text":it["text"][:60],
                    "source_clip":it["label"], "audio_offset":0.0, "audio_end":10.0,
                    "timeline_start":t, "timeline_end":t+10.0, "confidence":0.7})
        t += 10.0
    return tl
