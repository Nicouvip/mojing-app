/**
 * 墨境有声书工坊 — 前端主逻辑
 */

const VOICES = [
  { id: "冰糖", name: "冰糖", icon: "🍬", lang: "zh", gender: "female", desc: "甜美女声，适合旁白" },
  { id: "茉莉", name: "茉莉", icon: "🌸", lang: "zh", gender: "female", desc: "温柔女声，适合对话" },
  { id: "苏打", name: "苏打", icon: "🥤", lang: "zh", gender: "male", desc: "阳光男声，适合青年" },
  { id: "白桦", name: "白桦", icon: "🌲", lang: "zh", gender: "male", desc: "沉稳男声，适合中年" },
  { id: "Mia", name: "Mia", icon: "🎤", lang: "en", gender: "female", desc: "English Female" },
  { id: "Chloe", name: "Chloe", icon: "🎵", lang: "en", gender: "female", desc: "English Gentle" },
  { id: "Milo", name: "Milo", icon: "🎸", lang: "en", gender: "male", desc: "English Male" },
  { id: "Dean", name: "Dean", icon: "🎹", lang: "en", gender: "male", desc: "English Deep" },
];

const XFYUN_VOICES = [
  { id: "x4_xiaoyan", name: "小燕", icon: "🎤", desc: "甜美女声" },
  { id: "x4_xiaofeng", name: "小锋", icon: "🎤", desc: "阳光男声" },
  { id: "x4_xiaoyu", name: "小雨", icon: "🎤", desc: "可爱女声" },
  { id: "x4_xiaoqi", name: "小琪", icon: "🎤", desc: "温柔女声" },
  { id: "x4_xiaolin", name: "小林", icon: "🎤", desc: "沉稳男声" },
  { id: "x4_xiaomei", name: "小美", icon: "🎤", desc: "甜美" },
  { id: "x4_xiaogang", name: "小刚", icon: "🎤", desc: "浑厚男声" },
  { id: "x4_xiaorong", name: "小蓉", icon: "🎤", desc: "知性女声" },
  { id: "ais_bigang", name: "毕刚", icon: "🎤", desc: "沉稳男声" },
  { id: "ais_xuanxuan", name: "萱萱", icon: "🎤", desc: "可爱女声" },
  { id: "ais_bingbing", name: "冰冰", icon: "🎤", desc: "甜美女声" },
  { id: "ais_jingjing", name: "静静", icon: "🎤", desc: "温柔女声" },
  { id: "ais_yezi", name: "叶子", icon: "🎤", desc: "年轻女声" },
  { id: "ais_nana", name: "娜娜", icon: "🎤", desc: "亲切女声" },
];

function getCurrentVoices() {
  const sel = document.getElementById('settingProvider');
  return (sel && sel.value === 'xfyun') ? XFYUN_VOICES : VOICES;
}

function getCurrentProvider() {
  const sel = document.getElementById('settingProvider');
  return (sel && sel.value) || 'mimo';
}

const EMOTIONS = ["平静", "开心", "悲伤", "愤怒", "温柔", "严肃", "恐惧", "惊讶", "冷漠"];

const READ_TEXTS = [
  "窗外的阳光洒在书桌上，空气中弥漫着淡淡的咖啡香。远处传来几声鸟鸣，像是在诉说着这个春天的故事。我翻开那本旧相册，每一张照片都承载着一段温暖的回忆。",
  "清晨的街道还很安静，只有几辆早班公交车缓缓驶过。早餐店的老板已经开始忙碌，蒸笼里的热气腾腾升起，带来一阵阵包子和豆浆的香味。",
  "夜深了，月光透过窗帘的缝隙洒进房间。我坐在书桌前，翻开一本泛黄的笔记本，里面记录着年少时的梦想和那些未完成的计划。",
  "春天来了，公园里的樱花树开满了粉白色的花朵。微风吹过，花瓣纷纷飘落，像一场浪漫的雪。孩子们在树下追逐嬉戏。",
  "我站在山顶，俯瞰着脚下连绵起伏的山脉。远处的云层中透出金色的阳光，照亮了整片山谷。大自然的力量让人感到渺小。",
  "图书馆里很安静，只能听到翻书的沙沙声和偶尔传来的低语。阳光透过高大的窗户照进来，在地板上投下斑驳的光影。",
  "秋天的枫叶红得像火一样，铺满了整条小路。我踩着落叶慢慢走着，脚下发出清脆的声响。空气中弥漫着果实成熟的香甜气息。",
  "雨后的城市格外清新，空气中带着泥土和青草的味道。街道上的积水倒映着天空的影子，行人撑着伞匆匆走过。",
];

// ─── 状态 ────────────────────────────────────────────────────────
let projects = [];
let currentProject = null;
let currentTab = "chapters";
let analysisResult = null;
let editedSegments = [];
let editedCharacters = [];
let segmentAudioCache = {}; // index -> { audioBase64, filename, duration }
let selectedSegmentIds = new Set();
let currentFilter = "all";
let customVoices = [];

// 播放器状态
let playerAudio = null;
let playerPlaying = false;

// 录音状态
let mediaRecorder = null;
let audioChunks = [];
let recordStream = null;
let recordTimer = null;
let recordSeconds = 0;
let isRecording = false;
let recordedBlob = null;
let readTextIndex = 0;
let voiceSampleFile = null;
const MAX_RECORD_SECONDS = 60;

// ─── 初始化 ──────────────────────────────────────────────────────
function onProviderChange() {
  renderVoiceGrid();
  const sel = document.getElementById("settingVoice");
  if (sel) {
    const voices = getCurrentVoices();
    sel.innerHTML = voices.map(v => `<option value="${v.id}">${v.name}</option>`).join("");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadProjects();
  renderVoiceGrid();
  populateSettings();
});

// ─── API 工具 ────────────────────────────────────────────────────
async function api(url, opts = {}) {
  const resp = await fetch(url, opts);
  return resp.json();
}

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.style.display = "block";
  setTimeout(() => { el.style.display = "none"; }, 3000);
}

// ─── 视图切换 ────────────────────────────────────────────────────
function goHome() {
  document.getElementById("viewHome").style.display = "block";
  document.getElementById("viewProject").style.display = "none";
  document.getElementById("topbarRight").style.display = "none";
  document.getElementById("playerBar").style.display = "none";
  currentProject = null;
  loadProjects();
}

function showProject(project) {
  currentProject = project;
  document.getElementById("viewHome").style.display = "none";
  document.getElementById("viewProject").style.display = "block";
  document.getElementById("topbarRight").style.display = "flex";
  document.getElementById("projectTitle").textContent = project.title;
  renderChapters();
  switchProjectTab("chapters");
}

function switchProjectTab(tab) {
  currentTab = tab;
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
  ["Chapters", "Dialogue", "Voices", "Settings"].forEach(name => {
    const el = document.getElementById("tab" + name);
    if (el) {
      el.style.display = "";  // 清除内联样式
      el.classList.toggle("active", name.toLowerCase() === tab);
    }
  });
}

// ─── 项目管理 ────────────────────────────────────────────────────
async function loadProjects() {
  projects = await api("/api/projects");
  const grid = document.getElementById("projectGrid");
  if (!projects.length) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">📚</div><p>还没有作品，点击上方按钮导入小说开始创作</p></div>';
    return;
  }
  grid.innerHTML = projects.map(p => `
    <div class="project-card" onclick="openProject('${p.id}')">
      <h3>📖 ${esc(p.title)}</h3>
      <div class="meta">
        <span>${p.chapterCount} 章</span>
        <span>${p.totalChars} 字</span>
      </div>
      <div class="actions">
        <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();deleteProject('${p.id}')">🗑️</button>
      </div>
    </div>
  `).join("");
  // 自动打开第一个项目
  if (projects.length > 0 && !currentProject) {
    openProject(projects[0].id);
  }
}

async function openProject(pid) {
  const p = await api(`/api/projects/${pid}`);
  if (p.error) { toast(p.error); return; }
  showProject(p);
  // 填充选择器
  setTimeout(() => {
    populateProjectSelect();
    populateChapterSelect();
    const sel = document.getElementById("projectSelect");
    if (sel) sel.value = pid;
    onChapterChange();
  }, 200);
}

// ─── 项目/章节选择器 ──────────────────────────────────────────
function populateProjectSelect() {
  const sel = document.getElementById("projectSelect");
  if (!sel) return;
  sel.innerHTML = '<option value="">选择作品...</option>' +
    projects.map(p => `<option value="${p.id}">${esc(p.title || '未命名')} (${p.chapterCount}章)</option>`).join('');
  if (currentProject) sel.value = currentProject.id;
}

function onProjectChange() {
  const pid = document.getElementById("projectSelect").value;
  if (pid) openProject(pid);
}

function onChapterChange() {
  if (!currentProject) return;
  const v = document.getElementById("chapterSelect").value;
  const ta = document.getElementById("sourceText");
  const info = document.getElementById("sourceInfo");
  const chapters = currentProject.chapters || [];
  if (v === "all") {
    ta.value = chapters.map(c => c.content).join("\n\n");
    info.textContent = chapters.length + "章, " + ta.value.length + "字";
  } else {
    const ch = chapters[parseInt(v)];
    if (ch) { ta.value = ch.content; info.textContent = ch.title + ", " + ch.content.length + "字"; }
  }
}

function populateChapterSelect() {
  const sel = document.getElementById("chapterSelect");
  if (!sel || !currentProject) return;
  const chapters = currentProject.chapters || [];
  sel.innerHTML = '<option value="all">全部章节</option>' +
    chapters.map((c,i) => `<option value="${i}">${esc(c.title || '第'+(i+1)+'章')} (${c.content.length}字)</option>`).join('');
}

// ─── 手动创建角色 ──────────────────────────────────────────────
let charIdCounter = 0;
let manualCharacters = [];

function addNarrator() {
  charIdCounter++;
  manualCharacters.push({ id: charIdCounter, name: "旁白", type: "narration", voice: "远山", text: "", audioBase64: null, filename: null, duration: null });
  renderManualCharacters();
  toast("📖 已添加旁白");
}

function addCharacter() {
  const name = prompt("角色名称：", `角色${manualCharacters.length + 1}`);
  if (!name) return;
  charIdCounter++;
  manualCharacters.push({ id: charIdCounter, name: name, type: "dialogue", voice: "冰糖", text: "", audioBase64: null, filename: null, duration: null });
  renderManualCharacters();
  toast(`👤 已添加角色「${name}」`);
}

function removeManualChar(id) {
  manualCharacters = manualCharacters.filter(c => c.id !== id);
  renderManualCharacters();
}

function renderManualCharacters() {
  const el = document.getElementById("characterList");
  if (!el) return;
  if (!manualCharacters.length) {
    el.innerHTML = '<div class="empty-hint">点击「+旁白」或「+角色」添加，或用「AI 分析」自动识别</div>';
    return;
  }
  el.innerHTML = manualCharacters.map(c => {
    const cached = segmentAudioCache[c.id];
    return `
    <div class="char-item" data-id="${c.id}">
      <div class="char-item-header">
        <span class="char-item-type ${c.type}">${c.type === "narration" ? "📖" : "💬"} ${esc(c.name)}</span>
        <select class="select-sm" onchange="updateManualCharVoice(${c.id}, this.value)">
          ${VOICES.map(v => '<option value="' + v.id + '" ' + (v.id === c.voice ? 'selected' : '') + '>' + v.name + '</option>').join('')}
        </select>
        <button class="btn btn-sm btn-ghost" onclick="removeManualChar(${c.id})" style="color:var(--danger);">✕</button>
      </div>
      <textarea class="char-textarea" rows="2" placeholder="输入${esc(c.name)}的台词..." onchange="updateManualCharText(${c.id}, this.value)">${esc(c.text)}</textarea>
      <div class="char-item-actions">
        <button class="btn btn-sm btn-primary" onclick="generateManualChar(${c.id})">▶ 生成</button>
        ${cached ? `<button class="btn btn-sm" onclick="playManualCharAudio(${c.id})">🔊 播放</button>` : ""}
        ${cached ? `<a class="btn btn-sm" href="/api/download/${cached.filename}" download>💾 下载</a>` : ""}
        ${cached ? `<span style="font-size:11px;color:var(--text-secondary);">${cached.duration}s</span>` : ""}
      </div>
      ${cached ? `<div class="char-audio"><audio controls src="data:audio/wav;base64,${cached.audioBase64}" style="width:100%;height:32px;"></audio></div>` : ""}
    </div>`;
  }).join("");
}

function updateManualCharVoice(id, voice) { const c = manualCharacters.find(x=>x.id===id); if (c) c.voice = voice; }
function updateManualCharText(id, text) { const c = manualCharacters.find(x=>x.id===id); if (c) c.text = text; }

async function generateManualChar(id) {
  const c = manualCharacters.find(x=>x.id===id);
  if (!c || !c.text.trim()) { toast("请输入文本"); return; }
  toast(`生成「${c.name}」...`);
  const fd = new FormData();
  fd.append("text", c.text);
  fd.append("voice", c.voice);
  fd.append("emotion", "");
  try {
    const r = await api("/api/generate", { method: "POST", body: fd });
    if (r.success) {
      segmentAudioCache[c.id] = { audioBase64: r.audioBase64, filename: r.filename, duration: r.duration };
      c.audioBase64 = r.audioBase64;
      c.filename = r.filename;
      c.duration = r.duration;
      renderManualCharacters();
      toast(`✅ 「${c.name}」生成完成 (${r.duration}s)`);
      playManualCharAudio(id);
    } else toast("失败: " + r.error);
  } catch(e) { toast("请求失败: " + e.message); }
}

function playManualCharAudio(id) {
  const c = manualCharacters.find(x=>x.id===id);
  if (!c || !c.audioBase64) return;
  playerPlaylist = manualCharacters.filter(ch => ch.audioBase64).map(ch => ({
    name: ch.name, audioBase64: ch.audioBase64, filename: ch.filename, duration: ch.duration
  }));
  playerIndex = playerPlaylist.findIndex(p => p.name === c.name);
  startPlayer();
}

async function deleteProject(pid) {
  if (!confirm("确定删除这个作品？")) return;
  await api(`/api/projects/${pid}`, { method: "DELETE" });
  toast("已删除");
  loadProjects();
}

// ─── 导入 ────────────────────────────────────────────────────────
function showImportModal() {
  document.getElementById("importModal").style.display = "flex";
  document.getElementById("importTitle").value = "";
  document.getElementById("importText").value = "";
}

function handleImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => { document.getElementById("importText").value = ev.target.result; };
  reader.readAsText(file, "utf-8");
  e.target.value = "";
}

async function submitImport() {
  const title = document.getElementById("importTitle").value.trim();
  const text = document.getElementById("importText").value.trim();
  const mode = document.querySelector('input[name="splitMode"]:checked').value;
  if (!title) { toast("请输入作品名称"); return; }

  const fd = new FormData();
  fd.append("title", title);
  fd.append("text", text);
  fd.append("mode", mode);

  const result = await api("/api/projects", { method: "POST", body: fd });
  toast(`已创建「${title}」，共 ${result.chapterCount} 章`);
  hideModal("importModal");
  openProject(result.id);
}

// ─── 章节管理 ────────────────────────────────────────────────────
function renderChapters() {
  if (!currentProject) return;
  const list = document.getElementById("chapterList");
  const chapters = currentProject.chapters || [];
  if (!chapters.length) {
    list.innerHTML = '<div class="empty-hint">暂无章节</div>';
    return;
  }
  list.innerHTML = chapters.map((ch, i) => `
    <div class="chapter-item">
      <input type="checkbox" data-chapter="${i}" onchange="toggleChapterSelect(${i}, this.checked)">
      <div style="flex:1;">
        <div class="chapter-title">${esc(ch.title)}</div>
        <div class="chapter-meta">${ch.content.length} 字</div>
      </div>
      <div class="chapter-status" id="chStatus${i}"></div>
    </div>
  `).join("");
}

function toggleChapterSelect(idx, checked) {
  // managed by DOM
}

function selectAllChapters() {
  document.querySelectorAll('#chapterList input[type="checkbox"]').forEach(cb => cb.checked = true);
}

function deselectAllChapters() {
  document.querySelectorAll('#chapterList input[type="checkbox"]').forEach(cb => cb.checked = false);
}

async function generateSelectedChapters() {
  const checked = document.querySelectorAll('#chapterList input[type="checkbox"]:checked');
  if (!checked.length) { toast("请先勾选章节"); return; }

  const voice = document.getElementById("settingVoice").value;
  const emotion = document.getElementById("settingEmotion").value;

  for (const cb of checked) {
    const idx = parseInt(cb.dataset.chapter);
    const ch = currentProject.chapters[idx];
    const statusEl = document.getElementById("chStatus" + idx);
    statusEl.innerHTML = '<span class="spinner"></span>';

    try {
      const fd = new FormData();
      fd.append("text", ch.content);
      fd.append("voice", voice);
      fd.append("emotion", emotion);
      const result = await api("/api/generate", { method: "POST", body: fd });
      if (result.success) {
        statusEl.innerHTML = "✅";
        statusEl.title = `${result.duration}s`;
      } else {
        statusEl.innerHTML = "❌";
        statusEl.title = result.error;
      }
    } catch (e) {
      statusEl.innerHTML = "❌";
      statusEl.title = e.message;
    }
  }
  toast("章节生成完成");
}

async function mergeGeneratedChapters() {
  toast("合并功能：请先在对话模式中生成段落音频");
}

// ─── 对话模式 ────────────────────────────────────────────────────
async function runAIAnalysis() {
  if (!currentProject || !currentProject.chapters.length) {
    toast("请先导入小说文本");
    return;
  }
  // 使用当前选中的章节文本（如果选了单章就只分析那一章）
  const chapterSelect = document.getElementById("chapterSelect");
  const selectedChapter = chapterSelect ? chapterSelect.value : "all";
  let fullText = "";
  if (selectedChapter === "all") {
    fullText = currentProject.chapters.map(c => c.content).join("\n\n");
  } else {
    const ch = currentProject.chapters[parseInt(selectedChapter)];
    fullText = ch ? ch.content : "";
  }
  if (!fullText) {
    toast("没有可分析的文本");
    return;
  }
  if (fullText.length > 30000) {
    toast("文本过长（" + fullText.length + "字），请选择单个章节");
    return;
  }

  toast("🤖 AI 正在分析文本，请稍候...");
  const fd = new FormData();
  fd.append("text", fullText);

  try {
    const result = await api("/api/analyze", { method: "POST", body: fd });
    if (result.error) {
      toast("分析失败: " + result.error);
      return;
    }
    analysisResult = result;
    editedCharacters = result.characters || [];
    editedSegments = result.segments || [];
    segmentAudioCache = {};
    selectedSegmentIds = new Set();
    renderCharacters();
    renderSegments();
    renderFilterTabs();
    toast(`✅ 分析完成：${editedCharacters.length} 个角色，${editedSegments.length} 个段落`);
  } catch (e) {
    toast("分析请求失败: " + e.message);
  }
}

function renderCharacters() {
  const list = document.getElementById("characterList");
  if (!editedCharacters.length) {
    list.innerHTML = '<div class="empty-hint">点击「AI 分析」自动识别角色</div>';
    return;
  }
  list.innerHTML = editedCharacters.map((ch, i) => `
    <div class="character-card" data-idx="${i}">
      <div class="char-name">${esc(ch.name)}</div>
      <div class="char-info">${ch.gender === "male" ? "男" : "女"} · ${ch.age} · ${esc(ch.personality)}</div>
      <div class="char-voice">
        音色：
        <select onchange="updateCharacterVoice(${i}, this.value)" style="background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);font-size:11px;padding:2px 4px;">
          ${VOICES.map(v => `<option value="${v.id}" ${v.id === ch.recommendedVoice ? "selected" : ""}>${v.name}</option>`).join("")}
        </select>
      </div>
    </div>
  `).join("");
}

function updateCharacterVoice(idx, voiceId) {
  editedCharacters[idx].recommendedVoice = voiceId;
  // 同步更新该角色所有段落的推荐音色
  const name = editedCharacters[idx].name;
  editedSegments.forEach(seg => {
    if (seg.characterName === name) seg.recommendedVoice = voiceId;
  });
  renderSegments();
}

function renderFilterTabs() {
  const tabs = document.getElementById("filterTabs");
  let html = '<button class="filter-tab active" data-filter="all" onclick="filterSegments(\'all\')">全部</button>';
  // 按角色分组
  const charSet = new Set(editedSegments.map(s => s.characterName));
  charSet.forEach(name => {
    html += `<button class="filter-tab" data-filter="${esc(name)}" onclick="filterSegments('${esc(name)}')">${esc(name)}</button>`;
  });
  tabs.innerHTML = html;
}

function filterSegments(filter) {
  currentFilter = filter;
  document.querySelectorAll(".filter-tab").forEach(t => t.classList.toggle("active", t.dataset.filter === filter));
  renderSegments();
}

function renderSegments() {
  const list = document.getElementById("segmentList");
  let filtered = editedSegments;
  if (currentFilter !== "all") {
    filtered = editedSegments.filter(s => s.characterName === currentFilter);
  }
  if (!filtered.length) {
    list.innerHTML = '<div class="empty-hint">暂无段落</div>';
    return;
  }
  list.innerHTML = filtered.map(seg => {
    const cached = segmentAudioCache[seg.index];
    return `
    <div class="segment-item" data-idx="${seg.index}">
      <div class="segment-header">
        <div>
          <span class="segment-type ${seg.type}">${seg.type === "dialogue" ? "💬 对话" : "📖 旁白"}</span>
          <span style="font-size:11px;color:var(--text-secondary);margin-left:6px;">${esc(seg.characterName)}</span>
        </div>
        <div class="segment-emotion">
          ${seg.emotion} (${seg.emotionIntensity}/10)
          · ${seg.speed === "slow" ? "慢速" : seg.speed === "fast" ? "快速" : "正常"}
        </div>
      </div>
      <div class="segment-text">${esc(seg.text)}</div>
      ${seg.specialNote ? `<div style="font-size:11px;color:var(--warning);margin-top:4px;">💡 ${esc(seg.specialNote)}</div>` : ""}
      <div class="segment-actions">
        <button class="btn btn-sm btn-primary" onclick="generateSegment(${seg.index})">▶ 生成</button>
        ${cached ? `<button class="btn btn-sm btn-success" onclick="playSegmentAudio(${seg.index})">🔊 播放</button>` : ""}
        ${cached ? `<button class="btn btn-sm btn-secondary" onclick="downloadSegment(${seg.index})">💾 下载</button>` : ""}
      </div>
      ${cached ? `<div class="segment-audio"><audio controls src="data:audio/wav;base64,${cached.audioBase64}" style="width:100%;height:36px;"></audio></div>` : ""}
    </div>
  `}).join("");
}

async function generateSegment(index) {
  const seg = editedSegments.find(s => s.index === index);
  if (!seg) return;

  const voice = seg.recommendedVoice || "冰糖";
  const emotion = seg.emotion || "";

  toast(`正在生成第 ${index + 1} 段...`);
  const fd = new FormData();
  fd.append("text", seg.text);
  fd.append("voice", voice);
  fd.append("emotion", emotion);

  try {
    const result = await api("/api/generate", { method: "POST", body: fd });
    if (result.success) {
      segmentAudioCache[index] = {
        audioBase64: result.audioBase64,
        filename: result.filename,
        duration: result.duration,
      };
      renderSegments();
      toast(`✅ 第 ${index + 1} 段生成完成 (${result.duration}s)`);
    } else {
      toast("生成失败: " + result.error);
    }
  } catch (e) {
    toast("请求失败: " + e.message);
  }
}

function playSegmentAudio(index) {
  const cached = segmentAudioCache[index];
  if (!cached) return;
  const audio = new Audio("data:audio/wav;base64," + cached.audioBase64);
  audio.play();
}

function downloadSegment(index) {
  const cached = segmentAudioCache[index];
  if (!cached) return;
  window.open(`/api/download/${cached.filename}`);
}

async function batchGenerateSegments() {
  const ungenerated = editedSegments.filter(s => !segmentAudioCache[s.index]);
  if (!ungenerated.length) { toast("所有段落已生成"); return; }

  toast(`正在批量生成 ${ungenerated.length} 个段落...`);
  const segData = ungenerated.map(s => ({
    text: s.text,
    voice: s.recommendedVoice || "冰糖",
    emotion: s.emotion || "",
  }));

  const fd = new FormData();
  fd.append("segments", JSON.stringify(segData));
    fd.append("provider", getCurrentProvider());

  try {
    const result = await api("/api/generate/batch", { method: "POST", body: fd });
    let successCount = 0;
    result.results.forEach((r, i) => {
      if (r.success) {
        segmentAudioCache[ungenerated[i].index] = {
          audioBase64: r.audioBase64,
          filename: r.filename,
          duration: r.duration,
        };
        successCount++;
      }
    });
    renderSegments();
    toast(`✅ 批量生成完成：${successCount}/${ungenerated.length}`);
  } catch (e) {
    toast("批量生成失败: " + e.message);
  }
}

async function mergeSegmentAudios() {
  const filenames = Object.values(segmentAudioCache).map(c => c.filename);
  if (!filenames.length) { toast("没有可合并的音频"); return; }

  const fd = new FormData();
  fd.append("filenames", JSON.stringify(filenames));
  fd.append("output_name", "merged_segments");

  try {
    const result = await api("/api/merge", { method: "POST", body: fd });
    if (result.success) {
      window.open(`/api/download/${result.filename}`);
      toast(`✅ 合并完成 (${result.duration}s)`);
    } else {
      toast("合并失败: " + result.error);
    }
  } catch (e) {
    toast("合并请求失败: " + e.message);
  }
}

// ─── 音色管理 ────────────────────────────────────────────────────
function renderVoiceGrid() {
  const grid = document.getElementById("voiceGrid");
  grid.innerHTML = getCurrentVoices().map(v => `
    <div class="voice-card">
      <span class="icon">${v.icon}</span>
      <div class="info">
        <div class="name">${v.name}</div>
        <div class="desc">${v.desc}</div>
      </div>
    </div>
  `).join("");
}

function populateSettings() {
  const voiceSel = document.getElementById("settingVoice");
  const emotionSel = document.getElementById("settingEmotion");
  voiceSel.innerHTML = getCurrentVoices().map(v => `<option value="${v.id}">${v.name}</option>`).join("");
  emotionSel.innerHTML = EMOTIONS.map(e => `<option value="${e}">${e}</option>`).join("");
}

// ─── 声音设计 ────────────────────────────────────────────────────
function showDesignModal() {
  document.getElementById("designModal").style.display = "flex";
  document.getElementById("designDesc").value = "";
  document.getElementById("designResult").style.display = "none";
}

async function designVoice() {
  const desc = document.getElementById("designDesc").value.trim();
  if (!desc) { toast("请输入音色描述"); return; }

  const btn = document.getElementById("designBtn");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> 生成中...';

  const fd = new FormData();
  fd.append("description", desc);
  fd.append("preview_text", document.getElementById("designPreview").value);

  try {
    const result = await api("/api/voices/design", { method: "POST", body: fd });
    if (result.success) {
      document.getElementById("designPlayer").src = "data:audio/wav;base64," + result.audioBase64;
      document.getElementById("designResult").style.display = "block";
      toast("✅ 音色预览生成成功");
    } else {
      toast("生成失败: " + result.error);
    }
  } catch (e) {
    toast("请求失败: " + e.message);
  }
  btn.disabled = false;
  btn.innerHTML = "生成预览";
}

function saveDesignedVoice() {
  toast("音色已保存（功能开发中）");
}

// ─── 声音克隆 ────────────────────────────────────────────────────
function showCloneModal() {
  document.getElementById("cloneModal").style.display = "flex";
  document.getElementById("cloneResult").style.display = "none";
  voiceSampleFile = null;
  recordedBlob = null;
}

function switchCapture(mode) {
  document.querySelectorAll(".capture-tab").forEach(t => t.classList.toggle("active", t.dataset.capture === mode));
  document.getElementById("recordMode").style.display = mode === "record" ? "block" : "none";
  document.getElementById("uploadMode").style.display = mode === "upload" ? "block" : "none";
}

function shuffleReadText() {
  readTextIndex = (readTextIndex + 1) % READ_TEXTS.length;
  document.getElementById("readTextBox").innerHTML = `<p>${READ_TEXTS[readTextIndex]}</p>`;
}

// ─── 录音 ────────────────────────────────────────────────────────
async function toggleRecord() {
  if (isRecording) { stopRecord(); } else { await startRecord(); }
}

async function startRecord() {
  try {
    recordStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    alert("无法访问麦克风: " + err.message);
    return;
  }
  audioChunks = [];
  recordSeconds = 0;
  isRecording = true;
  recordedBlob = null;

  const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus" : "audio/webm";

  mediaRecorder = new MediaRecorder(recordStream, { mimeType });
  mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
  mediaRecorder.onstop = () => {
    recordedBlob = new Blob(audioChunks, { type: mimeType });
    onRecordComplete();
  };
  mediaRecorder.start(250);

  document.getElementById("recordBtn").classList.add("recording");
  document.getElementById("recordIcon").textContent = "⏹";
  document.getElementById("recordBtnText").textContent = "停止录音";
  document.getElementById("recordTimer").classList.add("recording");
  document.getElementById("recordTimer").textContent = "00:00";
  document.getElementById("recordHint").textContent = "🔴 正在录音...照着上面的文本朗读即可";
  document.getElementById("recordResult").style.display = "none";

  recordTimer = setInterval(() => {
    recordSeconds++;
    const m = String(Math.floor(recordSeconds / 60)).padStart(2, "0");
    const s = String(recordSeconds % 60).padStart(2, "0");
    document.getElementById("recordTimer").textContent = `${m}:${s}`;
    document.getElementById("recordProgressBar").style.width = `${Math.min((recordSeconds / MAX_RECORD_SECONDS) * 100, 100)}%`;
    if (recordSeconds >= MAX_RECORD_SECONDS) stopRecord();
  }, 1000);
}

function stopRecord() {
  if (!mediaRecorder || mediaRecorder.state === "inactive") return;
  isRecording = false;
  mediaRecorder.stop();
  recordStream.getTracks().forEach(t => t.stop());
  recordStream = null;
  clearInterval(recordTimer);
  document.getElementById("recordBtn").classList.remove("recording");
  document.getElementById("recordIcon").textContent = "⏺";
  document.getElementById("recordBtnText").textContent = "开始录音";
  document.getElementById("recordTimer").classList.remove("recording");
  document.getElementById("recordHint").textContent = "点击开始录制，建议朗读 10~60 秒";
}

function onRecordComplete() {
  if (recordSeconds < 3) { toast("录音太短，至少3秒"); document.getElementById("recordResult").style.display = "none"; return; }
  document.getElementById("recordPlayer").src = URL.createObjectURL(recordedBlob);
  document.getElementById("recordDuration").textContent = `${String(Math.floor(recordSeconds / 60)).padStart(2, "0")}:${String(recordSeconds % 60).padStart(2, "0")}`;
  document.getElementById("recordResult").style.display = "block";
  document.getElementById("recordProgressBar").style.width = "100%";
}

function reRecord() {
  recordedBlob = null;
  voiceSampleFile = null;
  document.getElementById("recordResult").style.display = "none";
  document.getElementById("recordProgressBar").style.width = "0%";
  document.getElementById("recordTimer").textContent = "00:00";
}

function useRecording() {
  if (!recordedBlob) return;
  voiceSampleFile = new File([recordedBlob], "recording.webm", { type: recordedBlob.type });
  toast("✅ 录音已就绪");
}

// ─── 文件上传 ────────────────────────────────────────────────────
function setupUpload() {
  const zone = document.getElementById("uploadZone");
  const input = document.getElementById("voiceSampleUpload");
  if (!zone) return;
  zone.addEventListener("click", () => input.click());
  zone.addEventListener("dragover", e => { e.preventDefault(); zone.classList.add("dragover"); });
  zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
  zone.addEventListener("drop", e => { e.preventDefault(); zone.classList.remove("dragover"); if (e.dataTransfer.files[0]) handleUploadFile(e.dataTransfer.files[0]); });
  input.addEventListener("change", e => { if (e.target.files[0]) handleUploadFile(e.target.files[0]); input.value = ""; });
}

function handleUploadFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  if (!["mp3", "wav", "webm"].includes(ext)) { toast("仅支持 mp3/wav/webm"); return; }
  voiceSampleFile = file;
  document.getElementById("uploadZone").style.display = "none";
  document.getElementById("uploadPreview").style.display = "flex";
  document.getElementById("previewPlayer").src = URL.createObjectURL(file);
}

function removeVoiceSample() {
  voiceSampleFile = null;
  document.getElementById("uploadZone").style.display = "flex";
  document.getElementById("uploadPreview").style.display = "none";
}

async function cloneVoice() {
  if (!voiceSampleFile) { toast("请先录音或上传声音样本"); return; }
  const btn = document.getElementById("cloneBtn");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> 生成中...';

  const cloneText = document.getElementById("cloneText").value.trim() || "你好，这是克隆声音的预览。";
  const cloneStyle = document.getElementById("cloneStyle").value.trim();

  const fd = new FormData();
  fd.append("text", cloneText);
  fd.append("style", cloneStyle);
  fd.append("voice_file", voiceSampleFile);

  try {
    const result = await api("/api/voices/clone", { method: "POST", body: fd });
    if (result.success) {
      document.getElementById("clonePlayer").src = "data:audio/wav;base64," + result.audioBase64;
      document.getElementById("cloneResult").style.display = "block";
      toast("✅ 克隆音频生成成功");
    } else {
      toast("克隆失败: " + result.error);
    }
  } catch (e) {
    toast("请求失败: " + e.message);
  }
  btn.disabled = false;
  btn.innerHTML = "生成克隆音频";
}

// ─── 播放器 ──────────────────────────────────────────────────────
function playerToggle() {
  if (!playerAudio) return;
  if (playerPlaying) { playerAudio.pause(); } else { playerAudio.play(); }
}

function playerPrev() {}
function playerNext() {}

function playerSeek(e) {
  if (!playerAudio) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  playerAudio.currentTime = pct * playerAudio.duration;
}

// ─── 弹窗 ────────────────────────────────────────────────────────
function hideModal(id) { document.getElementById(id).style.display = "none"; }
function closeModal(e, id) { if (e.target === e.currentTarget) hideModal(id); }

// ─── 工具 ────────────────────────────────────────────────────────
function esc(s) { if (!s) return ""; const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

// 初始化上传
document.addEventListener("DOMContentLoaded", setupUpload);
