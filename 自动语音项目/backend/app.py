"""
自动对轨工具 - Flask Web 后端
"""

import json
import os
import sys
import uuid
from pathlib import Path
from threading import Lock

# 确保 backend 目录在 Python 路径中
_backend_dir = Path(__file__).parent.resolve()
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from flask import Flask, jsonify, request, send_file, send_from_directory, session
from flask_cors import CORS

from core.audio_io import load_audio, save_audio, get_audio_info
from core.audio_assembler import (
    assemble_audio, ExportParams, FadeParams,
    ClickRemovalParams, SilenceTrimParams, SegmentConfig,
)
from core.asr_adapter import create_asr_adapter, ASRResult
from core.project import Project, AudioClip, create_project
from core.script_parser import parse_script
from core.text_matcher import match_clip_to_script

app = Flask(__name__)
app.secret_key = os.urandom(24).hex()
CORS(app)

# 工作目录
WORK_DIR = Path(__file__).parent
FRONTEND_DIR = WORK_DIR.parent / "frontend"
UPLOAD_DIR = WORK_DIR / "uploads"
EXPORT_DIR = WORK_DIR / "exports"
PROJECT_DIR = WORK_DIR / "projects"
UPLOAD_DIR.mkdir(exist_ok=True)
EXPORT_DIR.mkdir(exist_ok=True)
PROJECT_DIR.mkdir(exist_ok=True)

# 从 config.json 加载默认配置
CONFIG_PATH = WORK_DIR / "config.json"
_default_config: dict = {}
if CONFIG_PATH.exists():
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            _default_config = json.load(f)
        print(f"📋 已加载配置: ASR Key={'***' + _default_config.get('asr_api_key','')[-4:] if _default_config.get('asr_api_key') else '无'}")
    except Exception as e:
        print(f"⚠️ 配置文件读取失败: {e}")

# 当前工程（内存中）
_current_project: Project | None = None
_project_lock = Lock()


def get_project() -> Project:
    global _current_project
    with _project_lock:
        if _current_project is None:
            _current_project = create_project("新工程")
            # 应用默认配置
            if _default_config.get("asr_api_key"):
                _current_project.asr_api_key = _default_config["asr_api_key"]
            if _default_config.get("asr_base_url"):
                _current_project.asr_api_url = _default_config["asr_base_url"]
            if _default_config.get("asr_language"):
                _current_project.asr_language = _default_config["asr_language"]
        return _current_project


# ─── 剧本 API ─────────────────────────────────────────


@app.route("/api/script", methods=["POST"])
def set_script():
    """上传/更新剧本"""
    data = request.get_json()
    raw_text = data.get("text", "")
    if not raw_text.strip():
        return jsonify({"error": "剧本内容不能为空"}), 400

    script = parse_script(raw_text)
    proj = get_project()
    proj.script = script
    proj.updated_at = __import__("datetime").datetime.now().isoformat()

    return jsonify({"script": script.to_dict()})


@app.route("/api/script", methods=["GET"])
def get_script():
    """获取当前剧本"""
    proj = get_project()
    if not proj.script:
        return jsonify({"script": None})
    return jsonify({"script": proj.script.to_dict()})


# ─── 音频管理 API ─────────────────────────────────────


@app.route("/api/audio/upload", methods=["POST"])
def upload_audio():
    """上传音频文件"""
    if "file" not in request.files:
        return jsonify({"error": "未选择文件"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "空文件名"}), 400

    # 保存上传文件（保持原名）
    save_name = file.filename
    save_path = UPLOAD_DIR / save_name
    counter = 1
    while save_path.exists():
        stem = Path(save_name).stem
        ext = Path(save_name).suffix
        save_name = f"{stem}_{counter}{ext}"
        save_path = UPLOAD_DIR / save_name
        counter += 1
    file.save(str(save_path))

    # 获取音频信息
    info = get_audio_info(save_path)

    proj = get_project()
    clip = AudioClip(
        file_path=str(save_path),
        label=file.filename,
        duration=info["duration"],
        sample_rate=info["sample_rate"],
    )

    # 从文件名自动识别角色
    role = _detect_role_from_filename(file.filename, proj)
    if role:
        clip.role = role

    proj.clips.append(clip)

    return jsonify({
        "clip": clip.to_dict(),
        "audio_info": info,
    })


def _detect_role_from_filename(filename: str, proj: Project) -> str:
    """从文件名中提取角色名"""
    # 去掉扩展名
    name = Path(filename).stem
    # 用 - 分割
    parts = name.split("-")
    
    # 检查是否有已知角色词
    known_roles = ["旁白", "CV", "cv"]
    for role in known_roles:
        if role in parts:
            return role
    
    # 如果工程已有剧本，检查剧本中的角色
    if proj.script:
        for role in proj.script.roles:
            if role in parts:
                return role
    
    # 尝试提取 CV 名（最后一段）
    for part in reversed(parts):
        # 跳过纯数字和篇章节标记
        if not any(c.isdigit() for c in part) and len(part) > 1:
            # 这可能是一个角色或CV名
            pass
    
    return ""


@app.route("/api/audio/list", methods=["GET"])
def list_audio():
    """列出已上传的音频文件"""
    proj = get_project()
    return jsonify({"clips": [c.to_dict() for c in proj.clips]})


@app.route("/api/audio/<clip_index>", methods=["DELETE"])
def delete_audio(clip_index):
    """删除一个音频文件"""
    proj = get_project()
    idx = int(clip_index)
    if 0 <= idx < len(proj.clips):
        clip = proj.clips[idx]
        path = Path(clip.file_path)
        if path.exists():
            path.unlink()
        proj.clips.pop(idx)
        return jsonify({"status": "ok"})
    return jsonify({"error": "索引无效"}), 404


@app.route("/api/audio/<clip_index>/assign_role", methods=["POST"])
def assign_role(clip_index):
    """为音频片段分配角色"""
    proj = get_project()
    idx = int(clip_index)
    if 0 <= idx < len(proj.clips):
        data = request.get_json()
        proj.clips[idx].role = data.get("role", "")
        return jsonify({"clip": proj.clips[idx].to_dict()})
    return jsonify({"error": "索引无效"}), 404


# ─── ASR API ──────────────────────────────────────────


@app.route("/api/asr/config", methods=["GET"])
def get_asr_config():
    """获取ASR配置"""
    proj = get_project()
    provider = "mimo" if proj.asr_api_key.startswith("tp-") else "http"
    return jsonify({
        "provider": provider,
        "api_key": proj.asr_api_key,
        "base_url": proj.asr_api_url,
        "model": proj.asr_model,
        "language": proj.asr_language,
    })


@app.route("/api/asr/config", methods=["POST"])
def set_asr_config():
    """设置ASR配置"""
    proj = get_project()
    data = request.get_json()
    proj.asr_api_key = data.get("api_key", proj.asr_api_key)
    proj.asr_api_url = data.get("base_url", proj.asr_api_url)
    proj.asr_model = data.get("model", proj.asr_model)
    proj.asr_language = data.get("language", proj.asr_language)
    return jsonify({"status": "ok"})


@app.route("/api/asr/transcribe/<clip_index>", methods=["POST"])
def transcribe_clip(clip_index):
    """对指定音频做 ASR 转写"""
    proj = get_project()
    idx = int(clip_index)
    if not (0 <= idx < len(proj.clips)):
        return jsonify({"error": "索引无效"}), 404

    clip = proj.clips[idx]
    if not Path(clip.file_path).exists():
        return jsonify({"error": "音频文件不存在"}), 404

    # 自动创建适配器（MiMo 或通用 HTTP）
    adapter = create_asr_adapter({
        "api_key": proj.asr_api_key,
        "base_url": proj.asr_api_url,
        "model": proj.asr_model,
        "language": proj.asr_language,
    })

    # 加载音频并转写
    data, sr = load_audio(clip.file_path)
    try:
        result = adapter.transcribe(data, sr)
    except Exception as e:
        return jsonify({"error": f"ASR 转写失败: {e}"}), 500

    # 保存结果到 clip
    clip.asr_text = result.text
    clip.asr_segments = [
        {"text": s.text, "start": s.start, "end": s.end, "confidence": s.confidence}
        for s in result.segments
    ]

    return jsonify({
        "clip_index": idx,
        "asr_text": result.text,
        "asr_segments": clip.asr_segments,
        "adapter": adapter.get_name(),
    })


# ─── 对齐 API ─────────────────────────────────────────


@app.route("/api/align", methods=["POST"])
def run_alignment():
    """执行对齐：匹配各段音频到剧本"""
    proj = get_project()
    if not proj.script:
        return jsonify({"error": "请先导入剧本"}), 400
    if not proj.clips:
        return jsonify({"error": "请先上传音频文件"}), 400

    all_matches = []
    for i, clip in enumerate(proj.clips):
        if not clip.asr_segments:
            continue
        from core.asr_adapter import ASRResult, ASRSegment
        asr_result = ASRResult(
            text=clip.asr_text,
            segments=[ASRSegment(**s) for s in clip.asr_segments],
        )
        matches = match_clip_to_script(asr_result, proj.script, role=clip.role)
        all_matches.append({
            "clip_index": i,
            "clip_label": clip.label,
            "role": clip.role,
            "matches": matches,
        })

    # 构建时间线
    from core.text_matcher import align_script_clips
    timeline = align_script_clips(proj.script, all_matches)

    # 小说模式：AI 匹配
    is_novel = len(proj.script.lines) == 1 and proj.script.lines[0].role == "旁白"
    if is_novel and proj.asr_api_key:
        try:
            from core.ai_matcher import MimoMatcherConfig, ai_match_clips
            clip_data = [
                {"label": c.label, "asr_text": c.asr_text, "role": c.role}
                for c in proj.clips if c.asr_text
            ]
            full_text = proj.script.lines[0].text if len(proj.script.lines) == 1 else ""
            if full_text:
                config = MimoMatcherConfig(
                    api_key=proj.asr_api_key,
                    base_url=proj.asr_api_url or "https://token-plan-cn.xiaomimimo.com/v1",
                )
                ai_timeline = ai_match_clips(clip_data, full_text, config)
                if ai_timeline:
                    timeline = ai_timeline
        except Exception:
            pass

    # 应用手动微调
    for entry in timeline:
        key = f"{entry['line_index']}_{entry['source_clip']}"
        adj = _manual_adjustments.get(key, {})
        shift = adj.get("offset_shift", 0.0)
        if shift != 0:
            entry["audio_offset"] = max(0, entry["audio_offset"] + shift)
            entry["audio_end"] = max(entry["audio_offset"] + 0.1, entry["audio_end"] + shift)
            dur = entry["audio_end"] - entry["audio_offset"]
            entry["timeline_end"] = entry["timeline_start"] + dur

    return jsonify({
        "matches": all_matches,
        "timeline": timeline,
    })


# ─── 手动微调 API ─────────────────────────────

# 存储手动微调偏移量：{ "{line_index}_{source_clip}": { "offset_shift": 0.0, "duration_shift": 0.0 } }
_manual_adjustments: dict = {}


@app.route("/api/timeline/adjust", methods=["POST"])
def adjust_timeline():
    """手动微调某条时间线条目的 offset"""
    data = request.get_json()
    line_index = data.get("line_index")
    source_clip = data.get("source_clip", "")
    offset_shift = data.get("offset_shift", 0.0)  # 秒，正数=往后移

    if line_index is None:
        return jsonify({"error": "line_index 必填"}), 400

    key = f"{line_index}_{source_clip}"
    current = _manual_adjustments.get(key, {"offset_shift": 0.0})
    current["offset_shift"] = current.get("offset_shift", 0.0) + offset_shift
    _manual_adjustments[key] = current

    return jsonify({"status": "ok", "key": key, "offset_shift": current["offset_shift"]})


@app.route("/api/timeline/adjustments", methods=["GET"])
def get_adjustments():
    """获取所有手动微调"""
    return jsonify({"adjustments": _manual_adjustments})


@app.route("/api/timeline/adjustments/clear", methods=["POST"])
def clear_adjustments():
    """清除所有手动微调"""
    _manual_adjustments.clear()
    return jsonify({"status": "ok"})


# ─── 导出 API ─────────────────────────────────────────


@app.route("/api/export/params", methods=["GET"])
def get_export_params():
    """获取导出参数"""
    proj = get_project()
    return jsonify({
        "crossfade_enabled": proj.crossfade_enabled,
        "crossfade_duration": proj.crossfade_duration,
        "crossfade_curve": proj.crossfade_curve,
        "click_removal_enabled": proj.click_removal_enabled,
        "click_removal_threshold": proj.click_removal_threshold,
        "click_removal_crossfade": proj.click_removal_crossfade,
        "silence_trim_enabled": proj.silence_trim_enabled,
        "silence_trim_threshold": proj.silence_trim_threshold,
        "silence_trim_min_duration": proj.silence_trim_min_duration,
        "export_sample_rate": proj.export_sample_rate,
        "export_format": proj.export_format,
        "export_bitrate": proj.export_bitrate,
        "export_subtype": proj.export_subtype,
        "export_channels": proj.export_channels,
        "normalize_enabled": proj.normalize_enabled,
        "normalize_target_db": proj.normalize_target_db,
    })


@app.route("/api/export/params", methods=["POST"])
def set_export_params():
    """设置导出参数"""
    proj = get_project()
    data = request.get_json()
    for key in ("crossfade_enabled", "crossfade_duration", "crossfade_curve",
                 "click_removal_enabled", "click_removal_threshold",
                 "click_removal_crossfade",
                 "silence_trim_enabled", "silence_trim_threshold",
                 "silence_trim_min_duration",
                 "export_sample_rate", "export_format", "export_bitrate",
                 "export_subtype", "export_channels",
                 "normalize_enabled", "normalize_target_db"):
        if key in data:
            setattr(proj, key, data[key])
    return jsonify({"status": "ok"})


@app.route("/api/export", methods=["POST"])
def export_audio():
    """导出对齐后的完整音轨"""
    proj = get_project()

    data = request.get_json()
    timeline = data.get("timeline", [])
    if not timeline:
        return jsonify({"error": "没有对齐数据，请先运行对齐"}), 400

    # 从时间线构建 segments
    segments = []
    for entry in timeline:
        clip_label = entry.get("source_clip", "")
        clip_path = clip_label
        for clip in reversed(proj.clips):
            if clip.label == clip_label:
                clip_path = clip.file_path
                break
        if not Path(clip_path).exists():
            print(f"EXPORT ERROR: clip_label={clip_label!r} clip_path={clip_path!r}")
            print(f"EXPORT ERROR: current clips: {[(c.label, c.file_path) for c in proj.clips]}")
            return jsonify({"error": f"音频文件不存在: {clip_label}"}), 404
        seg = SegmentConfig(
            file_path=clip_path,
            offset=entry.get("audio_offset", 0),
            duration=entry.get("audio_end", 0) - entry.get("audio_offset", 0),
        )
        segments.append(seg)

    # 组装
    try:
        audio_data, sr = assemble_audio(
            segments,
            fade_params=FadeParams(
                enabled=proj.crossfade_enabled,
                crossfade_duration=proj.crossfade_duration,
                curve=proj.crossfade_curve,
            ),
            click_params=ClickRemovalParams(
                enabled=proj.click_removal_enabled,
                threshold_db=proj.click_removal_threshold,
                crossfade=proj.click_removal_crossfade,
            ),
            silence_params=SilenceTrimParams(
                enabled=proj.silence_trim_enabled,
                threshold_db=proj.silence_trim_threshold,
                min_duration=proj.silence_trim_min_duration,
            ),
            export_params=ExportParams(
                sample_rate=proj.export_sample_rate,
                format=proj.export_format,
                bitrate=proj.export_bitrate,
                subtype=proj.export_subtype,
                channels=proj.export_channels,
            ),
            normalize=proj.normalize_enabled,
            target_lufs=proj.normalize_target_db,
        )
    except Exception as e:
        return jsonify({"error": f"导出失败: {e}"}), 500

    # 保存导出文件
    export_name = f"{proj.name}_成品_{uuid.uuid4().hex[:8]}.{proj.export_format}"
    export_path = EXPORT_DIR / export_name
    save_audio(str(export_path), audio_data, sr)

    return jsonify({
        "export_path": str(export_path),
        "export_name": export_name,
        "duration": len(audio_data) / sr,
        "sample_rate": sr,
    })


@app.route("/api/export/download/<filename>", methods=["GET"])
def download_export(filename):
    """下载导出文件"""
    file_path = EXPORT_DIR / filename
    if not file_path.exists():
        return jsonify({"error": "文件不存在"}), 404
    return send_file(str(file_path), as_attachment=True)


# ─── 音频播放 API ──────────────────────────────


@app.route("/api/audio/play/<int:clip_index>")
def play_audio(clip_index):
    """流式播放上传的音频（用于预览）"""
    proj = get_project()
    if not (0 <= clip_index < len(proj.clips)):
        return jsonify({"error": "索引无效"}), 404
    clip = proj.clips[clip_index]
    path = Path(clip.file_path)
    if not path.exists():
        return jsonify({"error": "文件不存在"}), 404
    return send_file(str(path), mimetype="audio/wav")


# ─── 工程文件 API ────────────────────────────


@app.route("/api/project", methods=["GET"])
def get_project_info():
    """获取当前工程信息"""
    proj = get_project()
    return jsonify({"project": proj.to_dict()})


@app.route("/api/project/save", methods=["POST"])
def save_project():
    """保存工程文件"""
    proj = get_project()
    data = request.get_json()
    file_path = data.get("path", "")

    if file_path:
        save_path = Path(file_path)
    else:
        save_name = f"{proj.name}_{uuid.uuid4().hex[:8]}.aproj"
        save_path = PROJECT_DIR / save_name

    proj.save(save_path)
    return jsonify({"path": str(save_path)})


@app.route("/api/project/load", methods=["POST"])
def load_project():
    """载入工程文件"""
    global _current_project
    data = request.get_json()
    file_path = data.get("path", "")
    if not file_path or not Path(file_path).exists():
        return jsonify({"error": "工程文件不存在"}), 404
    with _project_lock:
        _current_project = Project.load(file_path)
    return jsonify({"project": _current_project.to_dict()})


@app.route("/api/project/list", methods=["GET"])
def list_projects():
    """列出已保存的工程文件"""
    files = []
    for f in PROJECT_DIR.glob("*.aproj"):
        files.append({
            "name": f.stem,
            "path": str(f),
            "size": f.stat().st_size,
            "modified": f.stat().st_mtime,
        })
    return jsonify({"projects": files})


# ─── 前端静态文件服务 ──────────────────────────


@app.route("/")
def serve_index():
    """提供前端首页"""
    return send_from_directory(str(FRONTEND_DIR), "index.html")


@app.route("/css/<path:filename>")
def serve_css(filename):
    """提供 CSS 文件"""
    return send_from_directory(str(FRONTEND_DIR / "css"), filename)


@app.route("/js/<path:filename>")
def serve_js(filename):
    """提供 JS 文件"""
    resp = send_from_directory(str(FRONTEND_DIR / "js"), filename)
    if filename.endswith(".js"):
        resp.headers["Content-Type"] = "application/javascript; charset=utf-8"
    return resp


if __name__ == "__main__":
    print("=" * 50)
    print("  自动对轨工具 - 后端服务")
    print(f"  工作目录: {WORK_DIR}")
    print(f"  前端地址: http://127.0.0.1:5000")
    print("=" * 50)
    app.run(host="127.0.0.1", port=5000, debug=False, use_reloader=False)
