"""Update app.js: full custom voice support"""
with open('D:/codexvip/tts-webapp/static/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace customVoices declaration with richer structure
content = content.replace(
    'let customVoices = [];',
    '''let customVoices = [];
let lastCloneData = null;  // { audioBase64, mime, style }
let lastDesignData = null; // { audioBase64, desc }
let selectedCustomVoice = null; // { id, audioBase64, mime, type }''')

# Update getCurrentVoices to include custom voices
content = content.replace(
    '''function getCurrentVoices() {
  const sel = document.getElementById('settingProvider');
  return (sel && sel.value === 'xfyun') ? XFYUN_VOICES : VOICES;
}''',
    '''function getCurrentVoices() {
  const sel = document.getElementById('settingProvider');
  let base = (sel && sel.value === 'xfyun') ? XFYUN_VOICES : VOICES;
  // Add custom voices
  if (sel && sel.value !== 'xfyun') {
    const custom = customVoices.map(cv => ({ id: cv.id, name: cv.name + '⭐', icon: '🧬', desc: cv.desc }));
    return [...base, ...custom];
  }
  return base;
}''')

# After renderVoiceGrid, add custom voices rendering
old_render = '''function renderVoiceGrid() {
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
}'''

new_render = '''function renderVoiceGrid() {
  const grid = document.getElementById("voiceGrid");
  const provider = (document.getElementById("settingProvider") || { value: "mimo" }).value;
  const voices = provider === "xfyun" ? XFYUN_VOICES : VOICES;
  grid.innerHTML = voices.map(v => `
    <div class="voice-card">
      <span class="icon">${v.icon}</span>
      <div class="info">
        <div class="name">${v.name}</div>
        <div class="desc">${v.desc}</div>
      </div>
    </div>
  `).join("");
  // Render custom voices
  renderCustomVoiceList();
}

function renderCustomVoiceList() {
  const list = document.getElementById("customVoiceList");
  if (!list) return;
  if (customVoices.length === 0) {
    list.innerHTML = '<div class="empty-hint">还没有自定义音色</div>';
    return;
  }
  list.innerHTML = customVoices.map(cv => \`
    <div class="custom-voice-item" onclick="selectCustomVoice('\${cv.id}')">
      <span class="voice-type-badge">\${cv.source === 'clone' ? '🧬' : '🎨'}</span>
      <span class="voice-name">\${cv.name}</span>
      <span class="voice-desc">\${cv.desc}</span>
      <button class="btn btn-xs btn-ghost" onclick="event.stopPropagation(); deleteCustomVoice('\${cv.id}')" title="删除">✕</button>
    </div>
  \`).join("");
}''')

content = content.replace(old_render, new_render)

# Add selectCustomVoice function
content = content.replace(
    'function onExportFormatChange()',
    '''function selectCustomVoice(id) {
  const cv = customVoices.find(v => v.id === id);
  if (!cv) return;
  selectedCustomVoice = cv;
  document.getElementById("settingVoice").value = cv.id;
  toast("已选用: " + cv.name);
}

function deleteCustomVoice(id) {
  customVoices = customVoices.filter(v => v.id !== id);
  if (selectedCustomVoice && selectedCustomVoice.id === id) selectedCustomVoice = null;
  renderCustomVoiceList();
  populateSettings();
  toast("已删除");
}

function onExportFormatChange()''')

# Update populateSettings to include custom voices correctly
old_settings = '''function populateSettings() {
  const voiceSel = document.getElementById("settingVoice");
  const emotionSel = document.getElementById("settingEmotion");
  voiceSel.innerHTML = getCurrentVoices().map(v => `<option value="${v.id}">${v.name}</option>`).join("");
  emotionSel.innerHTML = EMOTIONS.map(e => `<option value="${e}">${e}</option>`).join("");
}'''

new_settings = '''function populateSettings() {
  const voiceSel = document.getElementById("settingVoice");
  const emotionSel = document.getElementById("settingEmotion");
  const provider = (document.getElementById("settingProvider") || { value: "mimo" }).value;
  let voices = provider === "xfyun" ? XFYUN_VOICES : VOICES;
  // Add custom voices (only for MiMo)
  if (provider !== "xfyun") {
    const custom = customVoices.map(cv => ({ id: cv.id, name: cv.name + " ⭐", icon: "🧬", desc: cv.desc }));
    voices = [...voices, ...custom];
  }
  voiceSel.innerHTML = voices.map(v => `<option value="${v.id}">${v.name}</option>`).join("");
  emotionSel.innerHTML = EMOTIONS.map(e => `<option value="${e}">${e}</option>`).join("");
}'''

content = content.replace(old_settings, new_settings)

# Update saveDesignedVoice to actually work
old_save_design = '''function saveDesignedVoice() {
  toast("音色已保存（功能开发中）");
}'''

new_save_design = '''function saveDesignedVoice() {
  if (!lastDesignData) { toast("请先生成音色预览"); return; }
  const id = "custom_design_" + Date.now();
  customVoices.push({
    id: id,
    name: "设计音色 " + (customVoices.filter(v => v.source === "design").length + 1),
    source: "design",
    desc: document.getElementById("designDesc").value.trim().slice(0, 30) + "...",
    audioBase64: lastDesignData.audioBase64,
    mime: lastDesignData.mime,
  });
  renderCustomVoiceList();
  populateSettings();
  toast("✅ 设计音色已保存");
}'''

content = content.replace(old_save_design, new_save_design)

# Update cloneVoice to save last clone data and add save button
old_clone_end = '''      document.getElementById("clonePlayer").src = "data:audio/wav;base64," + result.audioBase64;
      document.getElementById("cloneResult").style.display = "block";
      toast("✅ 克隆音频生成成功");'''

new_clone_end = '''      document.getElementById("clonePlayer").src = "data:audio/wav;base64," + result.audioBase64;
      document.getElementById("cloneResult").style.display = "block";
      // Store clone data for saving
      lastCloneData = {
        audioBase64: result.audioBase64,
        mime: "audio/wav",
        style: cloneStyle,
      };
      // Show save button
      document.getElementById("saveCloneBtn").style.display = "inline-block";
      toast("✅ 克隆音频生成成功");'''

content = content.replace(old_clone_end, new_clone_end)

# Add saveCloneVoice function before the init section
content = content.replace(
    'function onProviderChange() {',
    '''function saveCloneVoice() {
  if (!lastCloneData) { toast("请先生成克隆音频"); return; }
  const id = "custom_clone_" + Date.now();
  // If we still have the original audio sample, use it instead
  if (voiceSampleFile) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const b64 = e.target.result.split(",")[1];
      const mime = voiceSampleFile.type || "audio/mpeg";
      customVoices.push({
        id: id,
        name: "我的克隆 " + (customVoices.filter(v => v.source === "clone").length + 1),
        source: "clone",
        desc: "克隆声音 (点击选用)",
        audioBase64: b64,
        mime: mime,
        style: document.getElementById("cloneStyle").value,
      });
      renderCustomVoiceList();
      populateSettings();
      toast("✅ 克隆音色已保存");
    };
    reader.readAsDataURL(voiceSampleFile);
  } else {
    // Fallback: save the generated audio as sample (less accurate for re-cloning)
    customVoices.push({
      id: id, name: "我的克隆 " + (customVoices.filter(v => v.source === "clone").length + 1),
      source: "clone", desc: "克隆声音",
      audioBase64: lastCloneData.audioBase64,
      mime: "audio/wav",
      style: lastCloneData.style,
    });
    renderCustomVoiceList();
    populateSettings();
    toast("✅ 克隆音色已保存");
  }
  document.getElementById("saveCloneBtn").style.display = "none";
}

function onProviderChange() {'''  
)

with open('D:/codexvip/tts-webapp/static/app.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('app.js custom voice logic updated OK')
