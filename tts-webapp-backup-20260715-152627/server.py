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
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")

MIMO_MODEL_TTS = "mimo-v2.5-tts"
MIMO_MODEL_CLONE = "mimo-v2.5-tts-voiceclone"
MIMO_MODEL_DESIGN = "mimo-v2.5-tts-voicedesign"
DEEPSEEK_MODEL = "deepseek-chat"

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
    {"id": "Mia", "name": "Mia", "lang": "en", "gender": "female", "desc": "English Female"},
    {"id": "Chloe", "name": "Chloe", "lang": "en", "gender": "female", "desc": "English Gentle"},
    {"id": "Milo", "name": "Milo", "lang": "en", "gender": "male", "desc": "English Male"},
    {"id": "Dean", "name": "Dean", "lang": "en", "gender": "male", "desc": "English Deep"},
]

EMOTIONS = ["平静", "开心", "悲伤", "愤怒", "温柔", "严肃", "恐惧", "惊讶", "冷漠"]

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
ANALYSIS_PROMPT = """你是一位资深的有声书演播导演。请分析以下小说文本，识别角色、对话、旁白和情绪。

请严格按照以下JSON格式输出，不要添加任何其他文字：

{
  "characters": [
    {
      "name": "旁白",
      "gender": "female",
      "age": "adult",
      "personality": "沉稳叙述",
      "recommendedVoice": "冰糖",
      "recommendedEmotion": "平静"
    }
  ],
  "segments": [
    {
      "index": 0,
      "text": "段落文本",
      "type": "narration",
      "characterName": "旁白",
      "emotion": "平静",
      "emotionIntensity": 5,
      "speed": "normal",
      "recommendedVoice": "冰糖",
      "needsPause": false,
      "specialNote": ""
    }
  ],
  "narrationStyle": {
    "overallTone": "整体语气",
    "pace": "语速建议",
    "emphasis": "重点",
    "notes": "备注"
  }
}

分析规则：
1. 每个自然段或每句对话为一个segment
2. type只能是"narration"或"dialogue"
3. emotionIntensity范围1-10
4. speed只能是"slow"/"normal"/"fast"
5. 旁白角色名固定为"旁白"
6. 根据角色性别年龄推荐合适音色
7. 标记需要停顿的地方(needsPause=true)
8. 保持segment的index全局唯一且连续

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

    # 构建 audio 参数
    audio_param = {"format": "wav"}
    if voice_audio_base64 and voice_mime:
        audio_param["voice"] = f"data:{voice_mime};base64,{voice_audio_base64}"
    else:
        audio_param["voice"] = voice_id

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
    if not text.strip():
        return JSONResponse(status_code=400, content={"error": "文本不能为空"})

    try:
        result = call_deepseek(text)
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
):
    """单段 TTS 生成。"""
    if not text.strip():
        return JSONResponse(status_code=400, content={"error": "文本不能为空"})

    chunks = chunk_text(text)
    if not chunks:
        return JSONResponse(status_code=400, content={"error": "文本处理后为空"})

    all_pcm = []
    for chunk in chunks:
        try:
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


# ─── 启动 ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
