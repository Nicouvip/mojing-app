/**
 * AutoTrack - 自动对轨工具
 */

let state = { script: null, clips: [], timeline: [] };
let _progressTimer = null;
let audioCtx = null;

document.addEventListener('DOMContentLoaded', init);

async function init() {
  try {
    const r = await fetch('/api/project', { signal: AbortSignal.timeout(3000) });
    if (!r.ok) throw new Error('后端未响应');
  } catch(e) {
    setStatus('后端未启动', 'error');
    return;
  }
  await Promise.all([loadScript(), loadAudioList()]);
  updateSteps();
  setStatus('Ready', '');
}

// ─── API ───
async function api(method, path, body) {
  const opt = { method, headers: {} };
  if (body) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
  const r = await fetch(path, opt);
  return r.json();
}

// ─── Status ───
function setStatus(msg, type) {
  const el = document.getElementById('statusBadge');
  el.textContent = msg;
  el.className = 'status-badge' + (type ? ' ' + type : '');
}

function showProgress(msg) {
  document.getElementById('progressDisplay').textContent = msg;
}
function hideProgress() {
  document.getElementById('progressDisplay').textContent = '';
}

// ─── Steps ───
function updateSteps() {
  const steps = ['step1','step2','step3','step4'];
  const labels = ['导入素材', '添加音频', '对齐', '导出'];
  const state_map = [
    state.script ? 'done' : 'active',
    state.clips.length ? 'done' : '',
    state.timeline.length ? 'done' : '',
    state.timeline.length ? '' : '',
  ];
  let activeIdx = 0;
  steps.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = 'step-dot';
    if (state_map[i] === 'done') { el.classList.add('done'); activeIdx = i + 1; }
    else if (i === activeIdx || (!state_map[i] && i === activeIdx)) { el.classList.add('active'); }
  });
  const label = document.getElementById('stepLabel');
  if (label) label.textContent = labels[activeIdx] || '完成';
}

// ─── View ───
function showImport() {
  document.querySelectorAll('.workspace-view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-import').classList.add('active');
}
function showAlign() {
  document.querySelectorAll('.workspace-view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-align').classList.add('active');
}

// ─── Script ───
function importScript() {
  showModal('导入剧本', `
    <div class="form-group">
      <label>粘贴剧本内容</label>
      <textarea id="scriptText" placeholder="支持格式：\n[角色]: 台词\n或直接粘贴小说文本"></textarea>
    </div>
    <button class="btn btn-primary" onclick="submitScript()">解析并导入</button>
  `);
}

async function loadScript() {
  const d = await api('GET', '/api/script');
  if (d.script) {
    state.script = d.script;
    showScriptInfo();
    updateSteps();
  }
}

async function submitScript() {
  const text = document.getElementById('scriptText').value.trim();
  if (!text) return;
  const d = await api('POST', '/api/script', { text });
  if (d.error) { setStatus(d.error, 'error'); return; }
  state.script = d.script;
  showScriptInfo();
  closeModal();
  showImport();
  updateSteps();
  setStatus('剧本已导入', 'success');
}

function showScriptInfo() {
  if (!state.script) return;
  const el = document.getElementById('scriptInfo');
  el.style.display = 'block';
  const lines = state.script.lines;
  const totalLen = lines.length === 1 ? lines[0].text.length : lines.reduce((s,l) => s + l.text.length, 0);
  el.innerHTML = `<div class="stat">📖 剧本 · <strong>${lines.length}句</strong> · <strong>${totalLen}字</strong> · 角色 ${state.script.roles.join(' / ')}</div>`;
}

// ─── Audio ───
function importAudio() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'audio/*'; input.multiple = true;
  input.onchange = async () => {
    for (const f of input.files) await uploadAudio(f);
    input.value = '';
  };
  input.click();
}

async function uploadAudio(file) {
  setStatus('上传中...', 'processing');
  const form = new FormData(); form.append('file', file);
  try {
    const r = await fetch('/api/audio/upload', { method: 'POST', body: form });
    const d = await r.json();
    state.clips.push(d.clip);
    const role = d.clip.role || '';
    if (!role && state.script) {
      for (const r2 of state.script.roles) {
        if (file.name.includes(r2)) {
          await api('POST', `/api/audio/${state.clips.length-1}/assign_role`, { role: r2 });
          state.clips[state.clips.length-1].role = r2;
          break;
        }
      }
    }
    renderAudioList();
    updateSteps();
    setStatus('已添加', 'success');
  } catch(e) { setStatus('上传失败', 'error'); }
}

async function deleteAudio(idx) {
  await api('DELETE', `/api/audio/${idx}`);
  state.clips.splice(idx, 1);
  renderAudioList();
  updateSteps();
}

function renderAudioList() {
  const el = document.getElementById('audioList');
  if (!state.clips.length) {
    el.innerHTML = '<div class="empty-hint">拖入音频文件<br>或点击 + 添加</div>';
    return;
  }
  el.innerHTML = state.clips.map((c, i) => {
    const dot = c.asr_text ? 'done' : 'pending';
    const dur = c.duration ? (c.duration/60).toFixed(1) + 'm' : '';
    return `<div class="file-item">
      <span class="dot ${dot}"></span>
      <span class="name" title="${c.label}">${esc(c.label)}</span>
      ${c.role ? `<span class="tag">${c.role}</span>` : ''}
      <span class="dur">${dur}</span>
      <button class="del" onclick="deleteAudio(${i})">×</button>
    </div>`;
  }).join('');
}

async function loadAudioList() {
  const d = await api('GET', '/api/audio/list');
  state.clips = d.clips || [];
  renderAudioList();
}

// ─── ASR Progress ───
function startAsrPoll() {
  if (_progressTimer) clearInterval(_progressTimer);
  pollAsr();
  _progressTimer = setInterval(pollAsr, 2000);
}

async function pollAsr() {
  try {
    const d = await api('GET', '/api/audio/list');
    const clips = d.clips || [];
    const done = clips.filter(c => c.asr_text).length;
    const total = clips.length;
    if (done === total) {
      showProgress('ASR 完成');
      clearInterval(_progressTimer);
      _progressTimer = null;
      setTimeout(hideProgress, 2000);
      return;
    }
    showProgress(`ASR ${done}/${total}`);
  } catch(e) {}
}

// ─── Align ───
async function runAlign() {
  if (!state.script) { setStatus('请导入剧本', 'error'); return; }
  if (!state.clips.length) { setStatus('请添加音频', 'error'); return; }

  const pending = state.clips.findIndex(c => !c.asr_text);
  if (pending >= 0) {
    startAsrPoll();
    for (let i = 0; i < state.clips.length; i++) {
      if (state.clips[i].asr_text) continue;
      try {
        const d = await api('POST', `/api/asr/transcribe/${i}`);
        if (d.asr_text) { state.clips[i].asr_text = d.asr_text; state.clips[i].asr_segments = d.asr_segments; }
      } catch(e) {}
      renderAudioList();
    }
    if (_progressTimer) { clearInterval(_progressTimer); _progressTimer = null; }
    hideProgress();
  }

  setStatus('对齐中...', 'processing');
  try {
    const d = await api('POST', '/api/align');
    if (d.error) { setStatus(d.error, 'error'); return; }
    state.timeline = d.timeline || [];
    renderTimeline();
    showAlign();
    updateSteps();
    document.getElementById('exportBtn').disabled = false;
    document.getElementById('playAllBtn').disabled = false;
    setStatus(`对齐完成 (${state.timeline.length}段)`, 'success');
  } catch(e) { setStatus('对齐失败', 'error'); }
}

function renderTimeline() {
  const el = document.getElementById('timelineContent');
  if (!state.timeline.length) { el.innerHTML = '<div class="empty-hint">暂无结果</div>'; return; }
  const last = state.timeline[state.timeline.length-1];
  document.getElementById('timelineInfo').textContent = `${state.timeline.length} 段 · ${fmtTime(last.timeline_end)}`;

  el.innerHTML = state.timeline.map((e, i) => {
    const ci = state.clips.findIndex(c => c.file_path === e.source_clip);
    const conf = e.confidence || 0;
    const cc = conf >= 0.7 ? 'conf-high' : (conf >= 0.4 ? 'conf-mid' : 'conf-low');
    return `<div class="tl-item">
      <span class="idx">#${i+1}</span>
      <span class="role-tag">${e.role}</span>
      <span class="text">${esc(e.text)}</span>
      <span class="time">${fmtTime(e.timeline_start)}</span>
      <span class="conf ${cc}">${(conf*100).toFixed(0)}%</span>
      <button class="play-btn" onclick="playSegment(${ci}, ${e.audio_offset||0}, ${(e.audio_end||0)-(e.audio_offset||0)})" title="播放">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      </button>
      <div class="tl-adjust">
        <button onclick="adjustOffset(${e.line_index},'${e.source_clip}',-0.1)" title="-0.1s">◀.1</button>
        <button onclick="adjustOffset(${e.line_index},'${e.source_clip}',0.1)" title="+0.1s">.1▶</button>
        <button onclick="adjustOffset(${e.line_index},'${e.source_clip}',-1)" title="-1s">◀1s</button>
        <button onclick="adjustOffset(${e.line_index},'${e.source_clip}',1)" title="+1s">1s▶</button>
      </div>
    </div>`;
  }).join('');
}

async function adjustOffset(lineIndex, src, delta) {
  await api('POST', '/api/timeline/adjust', { line_index: lineIndex, source_clip: src, offset_shift: delta });
  await runAlign();
}

function getAudioCtx() { if (!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)(); return audioCtx; }

async function playSegment(ci, offset, dur) {
  if (ci < 0) return;
  try {
    const r = await fetch(`/api/audio/play/${ci}`);
    const buf = await r.arrayBuffer();
    const ctx = getAudioCtx();
    const audio = await ctx.decodeAudioData(buf);
    const src = ctx.createBufferSource();
    src.buffer = audio; src.connect(ctx.destination);
    src.start(0, offset||0, dur||(audio.duration-offset));
  } catch(e) {}
}

async function playAll() {
  for (const e of state.timeline) {
    const ci = state.clips.findIndex(c => c.file_path === e.source_clip);
    if (ci < 0) continue;
    playSegment(ci, e.audio_offset, e.audio_end - e.audio_offset);
    await new Promise(r => setTimeout(r, (e.audio_end - e.audio_offset) * 1000));
  }
}

// ─── Export ───
async function runExport() {
  if (!state.timeline.length) { setStatus('请先对齐', 'error'); return; }
  setStatus('导出中...', 'processing');
  try {
    const d = await api('POST', '/api/export', { timeline: state.timeline });
    if (d.error) { setStatus(d.error, 'error'); return; }
    const a = document.createElement('a');
    a.href = `/api/export/download/${encodeURIComponent(d.export_name)}`;
    a.download = d.export_name; a.click();
    setStatus('导出成功', 'success');
  } catch(e) { setStatus('导出失败', 'error'); }
}

// ─── Settings ───
function showSettings() {
  showModal('设置', `
    <div class="form-row"><label>API Key</label>
      <input type="password" id="sKey" placeholder="tp-xxx"></div>
    <div class="form-row"><label>语言</label>
      <select id="sLang"><option value="zh">中文</option><option value="en">英文</option></select></div>
    <div style="margin-top:12px;"><button class="btn btn-primary" onclick="saveSettings()">保存</button></div>
  `);
  api('GET', '/api/asr/config').then(d => {
    if (d.api_key) document.getElementById('sKey').value = d.api_key;
    if (d.language) document.getElementById('sLang').value = d.language;
  });
}

async function saveSettings() {
  await api('POST', '/api/asr/config', {
    api_key: document.getElementById('sKey').value,
    language: document.getElementById('sLang').value,
  });
  closeModal();
  setStatus('设置已保存', 'success');
}

// ─── Modal ───
function showModal(title, html) {
  document.getElementById('modalHead').innerHTML = `<h3>${title}</h3><button class="btn-icon" onclick="closeModal()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>`;
  document.getElementById('modalBody').innerHTML = html;
  document.getElementById('modal').style.display = 'flex';
}
function closeModal() { document.getElementById('modal').style.display = 'none'; }

// ─── Utils ───
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function fmtTime(sec) {
  if (!sec && sec !== 0) return '--:--';
  const m = Math.floor(sec/60), s = Math.floor(sec%60), ms = Math.floor((sec%1)*100);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(2,'0')}`;
}

// ─── Drag & Drop ───
let dc = 0;
document.addEventListener('dragenter', e => { dc++; document.getElementById('app').style.opacity = '.7'; });
document.addEventListener('dragleave', e => { dc--; if (!dc) document.getElementById('app').style.opacity = '1'; });
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', async e => {
  e.preventDefault(); document.getElementById('app').style.opacity = '1'; dc = 0;
  for (const f of e.dataTransfer.files) {
    if (f.type.startsWith('audio/')) await uploadAudio(f);
  }
});
