"""
墨境有声书工坊 — 完整版
FastAPI 后端：AI分析 + TTS生成 + 章节管理 + 对话模式 + 声音克隆/设计
"""

import asyncio
import base64
import io
import json
import os
import re
import subprocess
import tempfile
import uuid
import websockets
from datetime import datetime
from pathlib import Path
from typing import Optional

import numpy as np
import soundfile as sf
from fastapi import FastAPI, File, Form, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from openai import OpenAI
from pydantic import BaseModel

# ─── 配置 ────────────────────────────────────────────────────────────
MIMO_API_BASE = "https://token-plan-cn.xiaomimimo.com/v1"
MIMO_API_KEY = "tp-c233nqeu5oovmyuhzdml2bsfs2vjwuey53g74trfpf4ov5m7"
DEEPSEEK_API_BASE = "https://api.deepseek.com"
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY") or "sk-e53df7e8dc4b4e89a99ab13ec356d66c"

MIMO_MODEL_TTS = "mimo-v2.5-tts"
MIMO_MODEL_CLONE = "mimo-v2.5-tts-voiceclone"
MIMO_MODEL_DESIGN = "mimo-v2.5-tts-voicedesign"
DEEPSEEK_MODEL = "deepseek-chat"

# ─── 讯飞配置 ────────────────────────────────────────────────────────
XF_APPID = "cb18693d"
XF_APIKEY = "39eaa494bbdd468489c3eb3b53ae8933"
XF_APISECRET = "NWY5MWJhZmI0OTNmNDY2NjMzYjhlMTk3"

SAMPLE_RATE = 24000
MAX_CHUNK_CHARS = 2000
BASE_DIR = Path(__file__).parent
OUTPUT_DIR = BASE_DIR / "outputs"
DATA_DIR = BASE_DIR / "data"

OUTPUT_DIR.mkdir(exist_ok=True)
DATA_DIR.mkdir(exist_ok=True)

# ─── 预置音色 ────────────────────────────────────────────────────────
PRESET_VOICES = [
    {"id": "冰糖", "name": "冰糖", "lang": "zh", "gender": "female", "desc": "甜美女声，适合旁白"},
    {"id": "茉莉", "name": "茉莉", "lang": "zh", "gender": "female", "desc": "温柔女声，适合对话"},
    {"id": "苏打", "name": "苏打", "lang": "zh", "gender": "male", "desc": "阳光男声，适合青年"},
    {"id": "白桦", "name": "白桦", "lang": "zh", "gender": "male", "desc": "沉稳男声，适合中年"},
    {"id": "青柠", "name": "青柠", "lang": "zh", "gender": "female", "desc": "活泼少女"},
    {"id": "墨竹", "name": "墨竹", "lang": "zh", "gender": "male", "desc": "磁性低音"},
    {"id": "晚星", "name": "晚星", "lang": "zh", "gender": "female", "desc": "知性优雅"},
    {"id": "远山", "name": "远山", "lang": "zh", "gender": "male", "desc": "浑厚旁白"},
    {"id": "小鹿", "name": "小鹿", "lang": "zh", "gender": "female", "desc": "童声可爱"},
    {"id": "大叔", "name": "大叔", "lang": "zh", "gender": "male", "desc": "沧桑大叔"},
    {"id": "川妹子", "name": "川妹子", "lang": "zh", "gender": "female", "desc": "四川方言"},
    {"id": "东北哥", "name": "东北哥", "lang": "zh", "gender": "male", "desc": "东北方言"},
    {"id": "粤语妹", "name": "粤语妹", "lang": "zh", "gender": "female", "desc": "粤语女声"},
    {"id": "播客男", "name": "播客男", "lang": "zh", "gender": "male", "desc": "播客主播"},
    {"id": "Mia", "name": "Mia", "lang": "en", "gender": "female", "desc": "English Female"},
    {"id": "Chloe", "name": "Chloe", "lang": "en", "gender": "female", "desc": "English Gentle"},
    {"id": "Milo", "name": "Milo", "lang": "en", "gender": "male", "desc": "English Male"},
    {"id": "Dean", "name": "Dean", "lang": "en", "gender": "male", "desc": "English Deep"},
]

EMOTIONS = ["平静", "开心", "悲伤", "愤怒", "温柔", "严肃", "恐惧", "惊讶", "冷漠"]

# AI可能返回的音色描述 → 我们系统音色ID的映射
VOICE_MAP = {
    # 中文女性
    "甜美女声": "冰糖", "甜美": "冰糖", "清亮女声": "冰糖",
    "温柔女声": "茉莉", "温柔": "茉莉", "柔和女声": "茉莉", "清冷女声": "茉莉",
    "活泼少女": "青柠", "活泼": "青柠", "可爱女声": "青柠",
    "知性女声": "晚星", "优雅女声": "晚星", "知性优雅": "晚星",
    "童声": "小鹿", "童声女声": "小鹿",
    # 中文男性
    "阳光男声": "苏打", "青年男声": "苏打", "年轻男声": "苏打", "清朗男声": "苏打",
    "沉稳男声": "白桦", "中年男声": "白桦", "深沉男声": "白桦", "磁性男声": "白桦",
    "磁性低音": "墨竹", "低沉男声": "墨竹",
    "浑厚男声": "远山", "旁白男声": "远山",
    "沧桑男声": "大叔", "大叔声": "大叔",
    "播客男声": "播客男",
    # 方言
    "四川话": "川妹子", "东北话": "东北哥", "粤语": "粤语妹",
    # 英文
    "English Female": "Mia", "English Gentle": "Chloe",
    "English Male": "Milo", "English Deep": "Dean",
}

def fix_voice_id(voice_id: str, gender: str = "") -> str:
    """将AI返回的音色描述映射为系统音色ID。"""
    if voice_id in VOICE_MAP:
        return VOICE_MAP[voice_id]
    # 检查是否已经是有效的音色ID
    valid_ids = [v["id"] for v in PRESET_VOICES]
    if voice_id in valid_ids:
        return voice_id
    # 根据性别默认分配
    if gender == "female":
        return "冰糖"
    return "苏打"

# ─── 朗读文本库 ──────────────────────────────────────────────────────
READ_TEXTS = [
    "窗外的阳光洒在书桌上，空气中弥漫着淡淡的咖啡香。远处传来几声鸟鸣，像是在诉说着这个春天的故事。我翻开那本旧相册，每一张照片都承载着一段温暖的回忆。",
    "清晨的街道还很安静，只有几辆早班公交车缓缓驶过。早餐店的老板已经开始忙碌，蒸笼里的热气腾腾升起，带来一阵阵包子和豆浆的香味。",
    "夜深了，月光透过窗帘的缝隙洒进房间。我坐在书桌前，翻开一本泛黄的笔记本，里面记录着年少时的梦想和那些未完成的计划。",
    "春天来了，公园里的樱花树开满了粉白色的花朵。微风吹过，花瓣纷纷飘落，像一场浪漫的雪。孩子们在树下追逐嬉戏。",
    "我站在山顶，俯瞰着脚下连绵起伏的山脉。远处的云层中透出金色的阳光，照亮了整片山谷。大自然的力量让人感到渺小。",
    "图书馆里很安静，只能听到翻书的沙沙声和偶尔传来的低语。阳光透过高大的窗户照进来，在地板上投下斑驳的光影。",
    "秋天的枫叶红得像火一样，铺满了整条小路。我踩着落叶慢慢走着，脚下发出清脆的声响。空气中弥漫着果实成熟的香甜气息。",
    "雨后的城市格外清新，空气中带着泥土和青草的味道。街道上的积水倒映着天空的影子，行人撑着伞匆匆走过。",
]

# ─── 数据持久化 ──────────────────────────────────────────────────────
PROJECTS_FILE = DATA_DIR / "projects.json"


def load_projects() -> dict:
    if PROJECTS_FILE.exists():
        return json.loads(PROJECTS_FILE.read_text(encoding="utf-8"))
    return {}


def save_projects(data: dict):
    PROJECTS_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


# ─── FastAPI ──────────────────────────────────────────────────────────
app = FastAPI(title="墨境有声书工坊")
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")


# ─── 文本分块 ────────────────────────────────────────────────────────
def chunk_text(text: str, max_chars: int = MAX_CHUNK_CHARS) -> list[str]:
    text = text.strip()
    if not text:
        return []
    paragraphs = re.split(r'\n\s*\n', text)
    chunks, current = [], ""
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        if len(current) + len(para) + 2 <= max_chars:
            current = f"{current}\n\n{para}" if current else para
        else:
            if current:
                chunks.append(current)
            if len(para) > max_chars:
                sentences = re.split(r'(?<=[。！？.!?\n])\s*', para)
                current = ""
                for sent in sentences:
                    if len(current) + len(sent) + 1 <= max_chars:
                        current = f"{current} {sent}" if current else sent
                    else:
                        if current:
                            chunks.append(current)
                        if len(sent) > max_chars:
                            for j in range(0, len(sent), max_chars):
                                chunks.append(sent[j:j + max_chars])
                            current = ""
                        else:
                            current = sent
            else:
                current = para
    if current:
        chunks.append(current)
    return chunks


# ─── 智能分章 ────────────────────────────────────────────────────────
CHAPTER_PATTERNS = [
    r'^第[一二三四五六七八九十百千万\d]+章\s*.*',
    r'^第[一二三四五六七八九十百千万\d]+节\s*.*',
    r'^Chapter\s+\d+.*',
    r'^序章\s*.*',
    r'^楔子\s*.*',
    r'^尾声\s*.*',
    r'^番外\s*.*',
    r'^后记\s*.*',
]


def smart_split_chapters(text: str) -> list[dict]:
    """智能分章：按常见章节标题模式切分。"""
    lines = text.split('\n')
    chapters = []
    current_title = "第1章"
    current_content = []

    for line in lines:
        stripped = line.strip()
        is_chapter_header = False
        for pattern in CHAPTER_PATTERNS:
            if re.match(pattern, stripped, re.IGNORECASE):
                is_chapter_header = True
                break

        if is_chapter_header and current_content:
            chapters.append({
                "title": current_title,
                "content": "\n".join(current_content).strip(),
            })
            current_title = stripped
            current_content = []
        else:
            if stripped:
                current_content.append(line)

    if current_content:
        chapters.append({
            "title": current_title,
            "content": "\n".join(current_content).strip(),
        })

    if not chapters:
        chapters.append({
            "title": "全文",
            "content": text.strip(),
        })

    return chapters


# ─── DeepSeek AI 分析 ────────────────────────────────────────────────
ANALYSIS_PROMPT = """分析小说文本，输出JSON格式的角色、段落、情绪数据。严格按以下格式输出，不要添加其他文字。

JSON格式：
```json
{"meta":{"title":"标题","genre":"题材","overallMood":"氛围"},"characters":[{"name":"角色名","gender":"male/female","age":"child/young/adult/elderly","personality":"性格","speakingStyle":"说话风格","recommendedVoice":"音色ID","recommendedEmotion":"默认情绪"}],"segments":[{"index":0,"text":"合并后文本","type":"narration/dialogue","characterName":"角色名","emotion":"情绪","emotionIntensity":5,"emotionDetail":"情绪细节","speed":"slow/normal/fast","needsPause":false,"pauseDuration":0,"nonLanguageSound":"","specialNote":"演播指导","contextNote":"上下文"}],"sceneBreakdown":[{"sceneIndex":0,"location":"地点","mood":"氛围","segmentRange":[0,2]}]}
```

核心规则：
1. 同一角色连续说话必须合并为一个segment，只有角色切换时才拆分
2. emotionIntensity: 1-10（1平静 5中等 10极端）
3. speed: slow(沉思/悲伤) normal(日常) fast(激动/紧急)
4. 每个角色用不同音色：旁白→远山 男主→墨竹 女主→茉莉 配角从未用过的选
5. 可用音色ID：冰糖(甜美女) 茉莉(温柔女) 青柠(活泼女) 晚星(知性女) 苏打(阳光男) 白桦(沉稳男) 墨竹(磁性男) 远山(浑厚男)
6. 情绪转变明显时才拆分segment
7. emotionDetail写情绪层次，如"压抑的愤怒""带着哽咽的笑"
8. 标点影响情绪：!提升强度 ...降低速度 ?判断疑惑
9. nonLanguageSound标记：[笑声][叹气][咳嗽]等
10. contextNote标注：角色首次出场/情绪转折/高潮段落

要分析的文本：
"""


def call_deepseek(text: str) -> dict:
    """调用 DeepSeek API 分析文本。"""
    if not DEEPSEEK_API_KEY:
        raise RuntimeError("DEEPSEEK_API_KEY 未配置")

    client = OpenAI(api_key=DEEPSEEK_API_KEY, base_url=DEEPSEEK_API_BASE)

    completion = client.chat.completions.create(
        model=DEEPSEEK_MODEL,
        messages=[
            {"role": "system", "content": "你是一位资深的有声书演播导演。请严格按照JSON格式输出。"},
            {"role": "user", "content": ANALYSIS_PROMPT + text},
        ],
        temperature=0.3,
        max_tokens=8000,
    )

    content = completion.choices[0].message.content

    # 三级JSON解析
    result = _extract_json(content)
    if not result:
        raise RuntimeError("AI分析结果解析失败")
    return result


def _extract_json(text: str) -> Optional[dict]:
    """三级JSON解析策略。"""
    # 1. 直接解析
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 2. 提取代码块
    m = re.search(r'```json\s*([\s\S]*?)\s*```', text)
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            pass

    # 3. 括号计数法
    idx = text.find('{')
    if idx >= 0:
        depth = 0
        for i in range(idx, len(text)):
            if text[i] == '{':
                depth += 1
            elif text[i] == '}':
                depth -= 1
            if depth == 0:
                try:
                    return json.loads(text[idx:i + 1])
                except json.JSONDecodeError:
                    pass
    return None


def _correct_texts(original_text: str, result: dict) -> dict:
    """学 SonicVale 的 Precise Fill：用原文校正AI分析结果中的文本，防止LLM改字。"""
    import difflib
    # 将原文按句子拆分
    orig_sentences = re.split(r'(?<=[。！？.!?])\s*', original_text.strip())
    orig_sentences = [s.strip() for s in orig_sentences if s.strip()]
    if not orig_sentences:
        return result

    # 为每个segment找到最匹配的原文句子
    for seg in result.get("segments", []):
        ai_text = seg.get("text", "")
        if not ai_text:
            continue
        # 用 SequenceMatcher 找最佳匹配
        best_match = ai_text
        best_ratio = 0
        for orig in orig_sentences:
            ratio = difflib.SequenceMatcher(None, ai_text, orig).ratio()
            if ratio > best_ratio:
                best_ratio = ratio
                best_match = orig
        # 如果匹配度 > 0.6，用原文替换
        if best_ratio > 0.6:
            seg["text"] = best_match

    return result


# ─── TTS API 调用 ────────────────────────────────────────────────────
def call_tts_api(
    text: str,
    voice_id: str,
    emotion: Optional[str] = None,
    model: str = MIMO_MODEL_TTS,
    voice_audio_base64: Optional[str] = None,
    voice_mime: Optional[str] = None,
    style: Optional[str] = None,
) -> bytes:
    """调用 MiMo TTS API（使用 httpx 直接请求，避免 SDK header 冲突）。"""
    import httpx

    # 构建 user message（风格指令）
    user_content = ""
    if style:
        user_content = style
    elif emotion:
        user_content = emotion

    messages = []
    if user_content:
        messages.append({"role": "user", "content": user_content})
    messages.append({"role": "assistant", "content": text})

    # TTS音色映射：我们的自定义音色 → MiMo真实音色ID
    TTS_VOICE_MAP = {
        "墨竹": "苏打", "青柠": "冰糖", "晚星": "茉莉", "远山": "白桦",
        "小鹿": "冰糖", "大叔": "白桦", "川妹子": "冰糖", "东北哥": "苏打",
        "粤语妹": "茉莉", "播客男": "苏打",
    }
    mapped_voice = TTS_VOICE_MAP.get(voice_id, voice_id)

    # 构建 audio 参数
    audio_param = {"format": "wav"}
    if voice_audio_base64 and voice_mime:
        # 音色复刻模式
        audio_param["voice"] = f"data:{voice_mime};base64,{voice_audio_base64}"
    elif model != MIMO_MODEL_DESIGN and mapped_voice:
        # 预置音色模式（voice design模型不支持voice参数）
        audio_param["voice"] = mapped_voice

    payload = {
        "model": model,
        "messages": messages,
        "audio": audio_param,
    }

    headers = {
        "Content-Type": "application/json",
        "api-key": MIMO_API_KEY,
    }

    resp = httpx.post(
        f"{MIMO_API_BASE}/chat/completions",
        json=payload,
        headers=headers,
        timeout=60.0,
    )

    if resp.status_code != 200:
        raise RuntimeError(f"API 错误 {resp.status_code}: {resp.text[:200]}")

    result = resp.json()
    audio_data = result.get("choices", [{}])[0].get("message", {}).get("audio", {}).get("data")
    if not audio_data:
        raise RuntimeError(f"API 未返回音频数据: {str(result)[:200]}")

    return base64.b64decode(audio_data)


# ─── 讯飞 TTS API 调用 ───────────────────────────────────────────────
async def call_xfyun_tts_api(
    text: str,
    vcn: str = "x4_xiaoyan",
    speed: int = 50,
    pitch: int = 50,
    volume: int = 50,
    aue: str = "lame",
) -> bytes:
    """调用讯飞 TTS WebSocket API（async）。"""
    import json
    import hmac
    import hashlib
    import base64 as b64
    from datetime import datetime
    from urllib.parse import urlencode

    host = "tts-api.xfyun.cn"
    path = "/v2/tts"
    date = datetime.utcnow().strftime("%a, %d %b %Y %H:%M:%S GMT")
    sign_lines = ["host: " + host, "date: " + date, "GET " + path + " HTTP/1.1"]
    sign_str = "host: " + host + chr(10) + "date: " + date + chr(10) + "GET " + path + " HTTP/1.1"
    signature = b64.b64encode(
        hmac.new(XF_APISECRET.encode(), sign_str.encode(), hashlib.sha256).digest()
    ).decode()
    auth_origin = f'api_key="{XF_APIKEY}", algorithm="hmac-sha256", headers="host date request-line", signature="{signature}"'
    authorization = b64.b64encode(auth_origin.encode()).decode()
    params = {"host": host, "date": date, "authorization": authorization}
    ws_url = f"wss://{host}{path}?{urlencode(params)}"

    async with websockets.connect(ws_url) as ws:
        business = {
            "common": {"app_id": XF_APPID},
            "business": {
                "aue": aue, "auf": "audio/L16;rate=16000",
                "vcn": vcn, "speed": speed, "pitch": pitch, "volume": volume,
                "tte": "UTF8",
            },
            "data": {
                "status": 2,
                "text": b64.b64encode(text.encode()).decode(),
            },
        }
        await ws.send(json.dumps(business))
        chunks = []
        while True:
            resp = json.loads(await ws.recv())
            data = resp.get("data", {})
            status = data.get("status", 0)
            audio_data = data.get("audio", "")
            if audio_data:
                chunks.append(b64.b64decode(audio_data))
            code = resp.get("code", 0)
            if code != 0:
                raise RuntimeError(f"讯飞TTS错误: code={code}, {resp.get('message','')}")
            if status == 2:
                break
        return b"".join(chunks)


def wav_bytes_to_pcm(wav_bytes: bytes) -> np.ndarray:
    data, _ = sf.read(io.BytesIO(wav_bytes), dtype="float32")
    return data


def pcm_to_wav_bytes(pcm_data: np.ndarray, sample_rate: int = SAMPLE_RATE) -> bytes:
    buf = io.BytesIO()
    sf.write(buf, pcm_data, samplerate=sample_rate, format="WAV", subtype="PCM_16")
    return buf.getvalue()


def _convert_webm_to_wav(webm_bytes: bytes) -> bytes:
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
        f.write(webm_bytes)
        in_path = f.name
    out_path = in_path.replace(".webm", ".wav")
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", in_path, "-ar", "16000", "-ac", "1", out_path],
            capture_output=True, check=True, timeout=30,
        )
        with open(out_path, "rb") as f:
            return f.read()
    finally:
        for p in [in_path, out_path]:
            try:
                os.unlink(p)
            except OSError:
                pass


# ─── API 路由 ────────────────────────────────────────────────────────
@app.get("/", response_class=HTMLResponse)
async def index():
    return FileResponse(BASE_DIR / "static" / "index.html")


@app.get("/api/voices")
async def get_voices():
    return JSONResponse(content=PRESET_VOICES)


@app.get("/api/xfyun-voices")
async def get_xfyun_voices():
    """返回讯飞发音人列表"""
    voices = [
        {"id": "x4_xiaoyan", "name": "小燕", "desc": "甜美女声"},
        {"id": "x4_xiaofeng", "name": "小锋", "desc": "阳光男声"},
        {"id": "x4_xiaoyu", "name": "小雨", "desc": "可爱女声"},
        {"id": "x4_xiaoqi", "name": "小琪", "desc": "温柔女声"},
        {"id": "x4_xiaolin", "name": "小林", "desc": "沉稳男声"},
        {"id": "x4_xiaomei", "name": "小美", "desc": "甜美女声"},
        {"id": "x4_xiaogang", "name": "小刚", "desc": "浑厚男声"},
        {"id": "x4_xiaorong", "name": "小蓉", "desc": "知性女声"},
        {"id": "x4_xiaoqian", "name": "小茜", "desc": "纯净女声"},
        {"id": "ais_bigang", "name": "毕刚", "desc": "沉稳男声"},
        {"id": "ais_xuanxuan", "name": "萱萱", "desc": "可爱女声"},
        {"id": "ais_bingbing", "name": "冰冰", "desc": "甜美女声"},
        {"id": "ais_jingjing", "name": "静静", "desc": "温柔女声"},
        {"id": "ais_yezi", "name": "叶子", "desc": "年轻女声"},
        {"id": "ais_nana", "name": "娜娜", "desc": "亲切女声"},
    ]
    return JSONResponse(content=voices)


@app.get("/api/emotions")
async def get_emotions():
    return JSONResponse(content=EMOTIONS)


@app.get("/api/read-texts")
async def get_read_texts():
    return JSONResponse(content=READ_TEXTS)


# ─── 项目管理 ────────────────────────────────────────────────────────
@app.get("/api/projects")
async def list_projects():
    projects = load_projects()
    result = []
    for pid, p in projects.items():
        result.append({
            "id": pid,
            "title": p.get("title", "未命名"),
            "chapterCount": len(p.get("chapters", [])),
            "totalChars": sum(len(c.get("content", "")) for c in p.get("chapters", [])),
            "createdAt": p.get("createdAt", ""),
            "updatedAt": p.get("updatedAt", ""),
        })
    result.sort(key=lambda x: x.get("updatedAt", ""), reverse=True)
    return JSONResponse(content=result)


@app.post("/api/projects")
async def create_project(
    title: str = Form(...),
    text: str = Form(""),
    mode: str = Form("smart"),  # smart / paragraph / none
):
    projects = load_projects()
    pid = uuid.uuid4().hex[:12]
    now = datetime.now().isoformat()

    chapters = []
    if text.strip():
        if mode == "smart":
            chapters = smart_split_chapters(text)
        elif mode == "paragraph":
            paras = [p.strip() for p in re.split(r'\n\s*\n', text) if p.strip()]
            chapters = [{"title": f"段落 {i+1}", "content": c} for i, c in enumerate(paras)]
        else:
            chapters = [{"title": "全文", "content": text.strip()}]

    projects[pid] = {
        "title": title,
        "chapters": chapters,
        "createdAt": now,
        "updatedAt": now,
    }
    save_projects(projects)

    return JSONResponse(content={
        "id": pid,
        "title": title,
        "chapterCount": len(chapters),
    })


@app.delete("/api/projects/{pid}")
async def delete_project(pid: str):
    projects = load_projects()
    if pid in projects:
        del projects[pid]
        save_projects(projects)
    return JSONResponse(content={"ok": True})


@app.get("/api/projects/{pid}")
async def get_project(pid: str):
    projects = load_projects()
    if pid not in projects:
        return JSONResponse(status_code=404, content={"error": "项目不存在"})
    p = projects[pid]
    return JSONResponse(content={
        "id": pid,
        "title": p["title"],
        "chapters": p.get("chapters", []),
        "createdAt": p.get("createdAt", ""),
        "updatedAt": p.get("updatedAt", ""),
    })


@app.put("/api/projects/{pid}/chapters")
async def update_chapters(pid: str, chapters: list[dict]):
    projects = load_projects()
    if pid not in projects:
        return JSONResponse(status_code=404, content={"error": "项目不存在"})
    projects[pid]["chapters"] = chapters
    projects[pid]["updatedAt"] = datetime.now().isoformat()
    save_projects(projects)
    return JSONResponse(content={"ok": True, "count": len(chapters)})


# ─── AI 文本分析 ─────────────────────────────────────────────────────
@app.post("/api/analyze")
async def analyze_text(
    text: str = Form(...),
):
    """调用 DeepSeek 分析小说文本。"""
    import sys
    print(f"[ANALYZE] Received text length: {len(text)}", file=sys.stderr)
    if not text.strip():
        return JSONResponse(status_code=400, content={"error": "文本不能为空"})

    try:
        result = call_deepseek(text)
        print(f"[ANALYZE] DeepSeek returned {len(result.get('segments',[]))} segments", file=sys.stderr)
        # 文本校正：确保AI不改原文（学SonicVale Precise Fill）
        result = _correct_texts(text, result)
        # 修复音色ID：将AI返回的描述映射为系统音色ID
        for ch in result.get("characters", []):
            ch["recommendedVoice"] = fix_voice_id(ch.get("recommendedVoice", ""), ch.get("gender", ""))
        for seg in result.get("segments", []):
            # 找到对应角色的音色
            char_name = seg.get("characterName", "旁白")
            char_info = next((c for c in result.get("characters", []) if c["name"] == char_name), None)
            if char_info:
                seg["recommendedVoice"] = char_info["recommendedVoice"]
            else:
                seg["recommendedVoice"] = fix_voice_id(seg.get("recommendedVoice", ""), "")
        return JSONResponse(content={"success": True, **result})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


# ─── TTS 生成 ────────────────────────────────────────────────────────
@app.post("/api/generate")
async def generate_tts(
    text: str = Form(...),
    voice: str = Form("冰糖"),
    emotion: str = Form(""),
    style: str = Form(""),
    provider: str = Form("mimo"),
):
    """单段 TTS 生成。provider: mimo / xfyun"""
    if not text.strip():
        return JSONResponse(status_code=400, content={"error": "文本不能为空"})

    chunks = chunk_text(text)
    if not chunks:
        return JSONResponse(status_code=400, content={"error": "文本处理后为空"})

    all_pcm = []
    for chunk in chunks:
        try:
            if provider == "xfyun":
                vcn_map = {"冰糖":"x4_xiaoyan","茉莉":"x4_xiaoqi","苏打":"x4_xiaofeng","白桦":"x4_xiaogang","青柠":"x4_xiaoyu","晚星":"x4_xiaorong","小鹿":"x4_xiaoyu","大叔":"x4_xiaogang","播客男":"x4_xiaolin"}
                vcn = vcn_map.get(voice, "x4_xiaoyan")
                wav_bytes = await call_xfyun_tts_api(text=chunk, vcn=vcn)
            else:
                wav_bytes = call_tts_api(
                    text=chunk, voice_id=voice, emotion=emotion or None, style=style or None,
                )
            pcm = wav_bytes_to_pcm(wav_bytes)
            all_pcm.append(pcm)
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": str(e)})

    combined = np.concatenate(all_pcm)
    filename = f"tts_{uuid.uuid4().hex[:8]}.wav"
    sf.write(str(OUTPUT_DIR / filename), combined, samplerate=SAMPLE_RATE, subtype="PCM_16")

    return JSONResponse(content={
        "success": True,
        "filename": filename,
        "audioBase64": base64.b64encode(pcm_to_wav_bytes(combined)).decode(),
        "duration": round(len(combined) / SAMPLE_RATE, 2),
        "downloadUrl": f"/api/download/{filename}",
    })


@app.post("/api/generate/batch")
async def generate_batch(
    segments: str = Form(...),  # JSON array of {text, voice, emotion}
    provider: str = Form("mimo"),
):
    """批量生成多段音频。"""
    seg_list = json.loads(segments)
    results = []

    for i, seg in enumerate(seg_list):
        text = seg.get("text", "")
        voice = seg.get("voice", "冰糖")
        emotion = seg.get("emotion", "")

        if not text.strip():
            results.append({"index": i, "error": "文本为空"})
            continue

        try:
            if provider == "xfyun":
                vcn_map = {"冰糖":"x4_xiaoyan","茉莉":"x4_xiaoqi","苏打":"x4_xiaofeng","白桦":"x4_xiaogang","青柠":"x4_xiaoyu","晚星":"x4_xiaorong","小鹿":"x4_xiaoyu","大叔":"x4_xiaogang","播客男":"x4_xiaolin"}
                vcn = vcn_map.get(voice, "x4_xiaoyan")
                wav_bytes = await call_xfyun_tts_api(text=text, vcn=vcn)
            else:
                wav_bytes = call_tts_api(text=text, voice_id=voice, emotion=emotion or None)
            audio_b64 = base64.b64encode(wav_bytes).decode()
            filename = f"batch_{uuid.uuid4().hex[:8]}.wav"
            sf.write(str(OUTPUT_DIR / filename), wav_bytes_to_pcm(wav_bytes),
                     samplerate=SAMPLE_RATE, subtype="PCM_16")
            results.append({
                "index": i,
                "success": True,
                "filename": filename,
                "audioBase64": audio_b64,
                "duration": round(len(wav_bytes_to_pcm(wav_bytes)) / SAMPLE_RATE, 2),
            })
        except Exception as e:
            results.append({"index": i, "error": str(e)})

    return JSONResponse(content={"results": results})


# ─── 音频合并 ────────────────────────────────────────────────────────
@app.post("/api/merge")
async def merge_audio(
    filenames: str = Form(...),  # JSON array of filenames
    output_name: str = Form("merged"),
):
    """合并多个 WAV 文件。"""
    file_list = json.loads(filenames)
    all_pcm = []

    for fn in file_list:
        fp = OUTPUT_DIR / fn
        if fp.exists():
            pcm = wav_bytes_to_pcm(fp.read_bytes())
            all_pcm.append(pcm)

    if not all_pcm:
        return JSONResponse(status_code=400, content={"error": "没有可合并的音频"})

    combined = np.concatenate(all_pcm)
    out_fn = f"{output_name}_{uuid.uuid4().hex[:8]}.wav"
    sf.write(str(OUTPUT_DIR / out_fn), combined, samplerate=SAMPLE_RATE, subtype="PCM_16")

    return JSONResponse(content={
        "success": True,
        "filename": out_fn,
        "duration": round(len(combined) / SAMPLE_RATE, 2),
        "downloadUrl": f"/api/download/{out_fn}",
    })


# ─── 声音克隆 ────────────────────────────────────────────────────────
@app.post("/api/voices/clone")
async def voice_clone(
    text: str = Form(...),
    style: str = Form(""),
    voice_file: UploadFile = File(...),
):
    audio_bytes = await voice_file.read()
    if len(audio_bytes) > 10 * 1024 * 1024:
        return JSONResponse(status_code=400, content={"error": "音频样本不能超过 10MB"})

    filename_lower = (voice_file.filename or "").lower()
    if filename_lower.endswith(".wav"):
        mime = "audio/wav"
    elif filename_lower.endswith(".mp3"):
        mime = "audio/mpeg"
    elif filename_lower.endswith(".webm"):
        audio_bytes = _convert_webm_to_wav(audio_bytes)
        mime = "audio/wav"
    else:
        return JSONResponse(status_code=400, content={"error": "仅支持 mp3、wav、webm 格式"})

    voice_b64 = base64.b64encode(audio_bytes).decode("utf-8")
    chunks = chunk_text(text)
    if not chunks:
        return JSONResponse(status_code=400, content={"error": "文本处理后为空"})
    all_pcm = []

    for chunk in chunks:
        try:
            wav_bytes = call_tts_api(
                text=chunk, voice_id="", model=MIMO_MODEL_CLONE,
                voice_audio_base64=voice_b64, voice_mime=mime, style=style or None,
            )
            all_pcm.append(wav_bytes_to_pcm(wav_bytes))
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": str(e)})

    combined = np.concatenate(all_pcm)
    filename = f"clone_{uuid.uuid4().hex[:8]}.wav"
    sf.write(str(OUTPUT_DIR / filename), combined, samplerate=SAMPLE_RATE, subtype="PCM_16")

    return JSONResponse(content={
        "success": True,
        "filename": filename,
        "audioBase64": base64.b64encode(pcm_to_wav_bytes(combined)).decode(),
        "duration": round(len(combined) / SAMPLE_RATE, 2),
        "downloadUrl": f"/api/download/{filename}",
    })


# ─── 声音设计 ────────────────────────────────────────────────────────
@app.post("/api/voices/design")
async def voice_design(
    description: str = Form(...),
    preview_text: str = Form("你好，这是音色预览。请听一下这个声音是否满意。"),
):
    try:
        wav_bytes = call_tts_api(
            text=preview_text, voice_id="",
            model=MIMO_MODEL_DESIGN, style=description,
        )
        audio_b64 = base64.b64encode(wav_bytes).decode()
        filename = f"design_{uuid.uuid4().hex[:8]}.wav"
        sf.write(str(OUTPUT_DIR / filename), wav_bytes_to_pcm(wav_bytes),
                 samplerate=SAMPLE_RATE, subtype="PCM_16")

        return JSONResponse(content={
            "success": True,
            "filename": filename,
            "audioBase64": audio_b64,
            "duration": round(len(wav_bytes_to_pcm(wav_bytes)) / SAMPLE_RATE, 2),
            "downloadUrl": f"/api/download/{filename}",
        })
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


# ─── 下载 ────────────────────────────────────────────────────────────
@app.get("/api/download/{filename}")
async def download_audio(filename: str):
    file_path = OUTPUT_DIR / filename
    if not file_path.exists():
        return JSONResponse(status_code=404, content={"error": "文件不存在"})
    return FileResponse(path=str(file_path), media_type="audio/wav", filename=filename)


# ─── MP3 导出 ──────────────────────────────────────────────────────
@app.get("/api/export/mp3/{filename}")
async def export_mp3(filename: str):
    """将 WAV 文件转换为 MP3 格式下载。"""
    wav_path = OUTPUT_DIR / filename
    if not wav_path.exists():
        return JSONResponse(status_code=404, content={"error": "文件不存在"})

    mp3_name = filename.replace(".wav", ".mp3")
    mp3_path = OUTPUT_DIR / mp3_name

    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(wav_path), "-codec:a", "libmp3lame", "-b:a", "192k", str(mp3_path)],
            capture_output=True, check=True, timeout=120,
        )
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        return JSONResponse(status_code=500, content={"error": f"MP3 转换失败: {e}"})

    return FileResponse(
        path=str(mp3_path),
        media_type="audio/mpeg",
        filename=mp3_name,
    )


# ─── SRT 字幕生成 ──────────────────────────────────────────────────
def _estimate_srt(segments: list[dict], audio_durations: list[float]) -> str:
    """根据段落文本和音频时长生成 SRT 字幕。"""
    srt_lines = []
    current_time = 0.0

    for i, (seg, dur) in enumerate(zip(segments, audio_durations)):
        text = seg.get("text", "")
        # 按句号/问号/感叹号分句，每句一行字幕
        sentences = re.split(r'(?<=[。！？.!?])\s*', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        if not sentences:
            sentences = [text]

        time_per_sentence = dur / len(sentences)

        for j, sentence in enumerate(sentences):
            start = current_time + j * time_per_sentence
            end = start + time_per_sentence
            srt_lines.append(f"{len(srt_lines) + 1}")
            srt_lines.append(f"{_format_srt_time(start)} --> {_format_srt_time(end)}")
            srt_lines.append(sentence)
            srt_lines.append("")

        current_time += dur

    return "\n".join(srt_lines)


def _format_srt_time(seconds: float) -> str:
    """将秒数转换为 SRT 时间格式 HH:MM:SS,mmm"""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


@app.post("/api/export/srt")
async def export_srt(
    segments: str = Form(...),  # JSON array of {text, duration}
    output_name: str = Form("subtitles"),
):
    """根据段落文本和时长生成 SRT 字幕文件。"""
    seg_list = json.loads(segments)
    srt_content = _estimate_srt(
        [s for s in seg_list],
        [s.get("duration", 3.0) for s in seg_list],
    )

    srt_fn = f"{output_name}_{uuid.uuid4().hex[:8]}.srt"
    srt_path = OUTPUT_DIR / srt_fn
    srt_path.write_text(srt_content, encoding="utf-8")

    return JSONResponse(content={
        "success": True,
        "filename": srt_fn,
        "downloadUrl": f"/api/download/{srt_fn}",
    })


# ─── 启动 ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
