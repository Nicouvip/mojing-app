# Fix app.js - apply all missing changes
import re

with open('D:/codexvip/tts-webapp/static/app.js', 'r', encoding='utf-8') as f:
    js = f.read()

changes = 0

# 1. Add XFYUN_VOICES + helper functions after VOICES
marker = 'const EMOTIONS = ["平静", "开心", "悲伤", "愤怒", "温柔", "严肃", "恐惧", "惊讶", "冷漠"];'
if marker in js and 'XFYUN_VOICES' not in js:
    new_content = '''const XFYUN_VOICES = [
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

'''
    js = js.replace(marker, new_content + '\n' + marker)
    changes += 1
    print('1. Added XFYUN_VOICES')

# 2. Add custom voice state
if 'let customVoices = []' in js:
    js = js.replace('let customVoices = []', 'let customVoices = []\nlet lastCloneData = null\nlet lastDesignData = null\nlet selectedCustomVoice = null')
    changes += 1
    print('2. Added custom voice state')

# 3. Fix saveDesignedVoice
old = 'function saveDesignedVoice() {\n  toast("音色已保存（功能开发中）");\n}'
new = '''function saveDesignedVoice() {
  if (!lastDesignData) { toast("请先生成音色预览"); return; }
  var id = "custom_design_" + Date.now();
  customVoices.push({
    id: id,
    name: "设计音色",
    source: "design",
    desc: document.getElementById("designDesc").value.trim().slice(0, 20),
    audioBase64: lastDesignData.audioBase64,
    mime: "audio/wav"
  });
  renderCustomVoiceList();
  populateSettings();
  toast("设计音色已保存");
}'''
if old in js:
    js = js.replace(old, new)
    changes += 1
    print('3. Fixed saveDesignedVoice')

# 4. Update cloneVoice - add save button display
old = 'document.getElementById("clonePlayer").src = "data:audio/wav;base64," + result.audioBase64;\n      document.getElementById("cloneResult").style.display = "block";\n      toast("克隆音频生成成功");'
new = 'document.getElementById("clonePlayer").src = "data:audio/wav;base64," + result.audioBase64;\n      document.getElementById("cloneResult").style.display = "block";\n      lastCloneData = { audioBase64: result.audioBase64, mime: "audio/wav", style: cloneStyle };\n      document.getElementById("saveCloneBtn").style.display = "inline-block";\n      toast("克隆音频生成成功");'
if old in js:
    js = js.replace(old, new)
    changes += 1
    print('4. Updated cloneVoice result')

# 5. Add all the missing functions before DOMContentLoaded
marker = 'document.addEventListener("DOMContentLoaded", () => {'
new_funcs = '''function onExportFormatChange() {
  var fmt = document.getElementById("settingExportFormat").value;
  var br = document.getElementById("bitrateSetting");
  if (br) br.style.display = fmt === "mp3" ? "block" : "none";
}

function onProviderChange() {
  populateSettings();
  renderVoiceGrid();
}

function getCurrentProvider() {
  var sel = document.getElementById("settingProvider");
  return (sel && sel.value) || "mimo";
}

function getCurrentVoices() {
  var sel = document.getElementById("settingProvider");
  if (sel && sel.value === "xfyun") return XFYUN_VOICES;
  var result = VOICES.slice();
  for (var i = 0; i < customVoices.length; i++) {
    result.push({ id: customVoices[i].id, name: customVoices[i].name + " \\u2B50", icon: "\\uD83E\\uDDEC", desc: customVoices[i].desc });
  }
  return result;
}

function getAudioFormData() {
  var r = {};
  r.sample_rate = parseInt(document.getElementById("settingSampleRate").value);
  r.bit_depth = parseInt(document.getElementById("settingBitDepth").value);
  r.export_format = document.getElementById("settingExportFormat").value;
  if (r.export_format === "mp3") {
    r.bitrate = document.getElementById("settingBitrate").value;
  }
  return r;
}

function saveCloneVoice() {
  if (!lastCloneData) { toast("请先生成克隆音频"); return; }
  var id = "custom_clone_" + Date.now();
  customVoices.push({
    id: id,
    name: "我的克隆",
    source: "clone",
    desc: "克隆声音",
    audioBase64: lastCloneData.audioBase64,
    mime: "audio/wav"
  });
  renderCustomVoiceList();
  populateSettings();
  document.getElementById("saveCloneBtn").style.display = "none";
  toast("克隆音色已保存");
}

function renderCustomVoiceList() {
  var list = document.getElementById("customVoiceList");
  if (!list) return;
  if (customVoices.length === 0) {
    list.innerHTML = "<div class=\\'empty-hint\\'>还没有自定义音色</div>";
    return;
  }
  var html = "";
  for (var i = 0; i < customVoices.length; i++) {
    var cv = customVoices[i];
    var badge = cv.source === "clone" ? "\\uD83E\\uDDEC" : "\\uD83C\\uDFA8";
    html += "<div class=\\'custom-voice-item\\' onclick=\\'selectCustomVoice(\\\\"" + cv.id + "\\\\")\\'><span class=\\'voice-type-badge\\'>" + badge + "</span><span class=\\'voice-name\\'>" + cv.name + "</span><span class=\\'voice-desc\\'>" + cv.desc + "</span><button class=\\'btn btn-xs btn-ghost\\' onclick=\\'event.stopPropagation(); deleteCustomVoice(\\\\"" + cv.id + "\\\\")\\'>&#10005;</button></div>";
  }
  list.innerHTML = html;
}

function selectCustomVoice(id) {
  var cv = null;
  for (var i = 0; i < customVoices.length; i++) { if (customVoices[i].id === id) { cv = customVoices[i]; break; } }
  if (!cv) return;
  selectedCustomVoice = cv;
  var sel = document.getElementById("settingVoice");
  if (sel) sel.value = cv.id;
  toast("已选用: " + cv.name);
}

function deleteCustomVoice(id) {
  var newArr = [];
  for (var i = 0; i < customVoices.length; i++) { if (customVoices[i].id !== id) newArr.push(customVoices[i]); }
  customVoices = newArr;
  if (selectedCustomVoice && selectedCustomVoice.id === id) selectedCustomVoice = null;
  renderCustomVoiceList();
  populateSettings();
  toast("已删除");
}

'''
if marker in js:
    js = js.replace(marker, new_funcs + marker)
    changes += 1
    print('5. Added all helper functions')

# 6. Update renderVoiceGrid
old = 'function renderVoiceGrid() {\n  const grid = document.getElementById("voiceGrid");\n  grid.innerHTML = VOICES.map(v =>'
new_fn = '''function renderVoiceGrid() {
  renderCustomVoiceList();
  const grid = document.getElementById("voiceGrid");
  var sel = document.getElementById("settingProvider");
  var voices = (sel && sel.value === "xfyun") ? XFYUN_VOICES : VOICES;
  grid.innerHTML = voices.map(v =>'''
if old in js:
    js = js.replace(old, new_fn)
    changes += 1
    print('6. Updated renderVoiceGrid')

# 7. Update populateSettings
old = '''function populateSettings() {
  const voiceSel = document.getElementById("settingVoice");
  const emotionSel = document.getElementById("settingEmotion");
  voiceSel.innerHTML = VOICES.map(v => `<option value="${v.id}">${v.name}</option>`).join("");
  emotionSel.innerHTML = EMOTIONS.map(e => `<option value="${e}">${e}</option>`).join("");
}'''
new_fn = '''function populateSettings() {
  const voiceSel = document.getElementById("settingVoice");
  const emotionSel = document.getElementById("settingEmotion");
  var sel = document.getElementById("settingProvider");
  var voices = (sel && sel.value === "xfyun") ? XFYUN_VOICES : VOICES;
  // Add custom voices
  if (!sel || sel.value !== "xfyun") {
    var custom = [];
    for (var i = 0; i < customVoices.length; i++) {
      custom.push({ id: customVoices[i].id, name: customVoices[i].name + " \\u2B50", icon: "\\uD83E\\uDDEC", desc: customVoices[i].desc });
    }
    voices = voices.concat(custom);
  }
  voiceSel.innerHTML = voices.map(v => `<option value="${v.id}">${v.name}</option>`).join("");
  emotionSel.innerHTML = EMOTIONS.map(e => `<option value="${e}">${e}</option>`).join("");
}'''
if old in js:
    js = js.replace(old, new_fn)
    changes += 1
    print('7. Updated populateSettings')

# 8. Update generate functions to pass custom voice data
# generateManualChar
old = 'fd.append("voice", c.voice);\n    const r = await api("/api/generate"'
new_fn = '''fd.append("voice", c.voice);
    // Pass custom voice data if applicable
    for (var ci = 0; ci < customVoices.length; ci++) {
      if (customVoices[ci].id === c.voice) {
        fd.append("custom_voice_b64", customVoices[ci].audioBase64);
        fd.append("custom_voice_mime", customVoices[ci].mime);
        break;
      }
    }
    const r = await api("/api/generate"'''
if old in js:
    js = js.replace(old, new_fn)
    changes += 1
    print('8a. Updated generateManualChar')

# generateSelectedChapters
old = 'fd.append("voice", voice);\n      const result = await api("/api/generate"'
new_fn = '''fd.append("voice", voice);
      for (var ci = 0; ci < customVoices.length; ci++) {
        if (customVoices[ci].id === voice) {
          fd.append("custom_voice_b64", customVoices[ci].audioBase64);
          fd.append("custom_voice_mime", customVoices[ci].mime);
          break;
        }
      }
      const result = await api("/api/generate"'''
if old in js:
    js = js.replace(old, new_fn)
    changes += 1
    print('8b. Updated generateSelectedChapters')

# generateSegment
old = 'fd.append("voice", voice);\n    const result = await api("/api/generate"'
new_fn = '''fd.append("voice", voice);
    for (var ci = 0; ci < customVoices.length; ci++) {
      if (customVoices[ci].id === voice) {
        fd.append("custom_voice_b64", customVoices[ci].audioBase64);
        fd.append("custom_voice_mime", customVoices[ci].mime);
        break;
      }
    }
    const result = await api("/api/generate"'''
if old in js:
    js = js.replace(old, new_fn)
    changes += 1
    print('8c. Updated generateSegment')

# 9. Update designVoice to save lastDesignData
old = 'document.getElementById("designPlayer").src = "data:audio/wav;base64," + result.audioBase64;\n      document.getElementById("designResult").style.display = "block";\n      toast("音色预览生成成功");'
new_fn = 'document.getElementById("designPlayer").src = "data:audio/wav;base64," + result.audioBase64;\n      document.getElementById("designResult").style.display = "block";\n      lastDesignData = { audioBase64: result.audioBase64, mime: "audio/wav" };\n      toast("音色预览生成成功");'
if old in js:
    js = js.replace(old, new_fn)
    changes += 1
    print('9. Updated designVoice')

# Write back
with open('D:/codexvip/tts-webapp/static/app.js', 'w', encoding='utf-8') as f:
    f.write(js)

print(f'\nTotal changes: {changes}')
print(f'File size: {len(js)} bytes')
