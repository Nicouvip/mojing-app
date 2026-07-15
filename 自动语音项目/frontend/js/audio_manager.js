/**
 * 音频管理
 */

let audioClips = [];
window.audioClips = audioClips;  // 公开给其他模块

function initAudioUpload() {
    const input = document.getElementById('audioUpload');
    input.addEventListener('change', async (e) => {
        const files = e.target.files;
        if (!files.length) return;

        for (const file of files) {
            await uploadAudio(file);
        }
        input.value = '';
    });
}

async function uploadAudio(file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const resp = await fetch('/api/audio/upload', {
            method: 'POST',
            body: formData
        });
        if (!resp.ok) {
            const err = await resp.json();
            showStatus(`上传失败 ${file.name}: ${err.error}`, 'error');
            return;
        }
        const data = await resp.json();
        audioClips.push(data.clip);
        renderAudioList();
        showStatus(`已上传: ${file.name}`, 'success');
    } catch (e) {
        showStatus(`上传失败 ${file.name}: ${e.message}`, 'error');
    }
}

async function deleteAudio(index) {
    try {
        const resp = await fetch(`/api/audio/${index}`, { method: 'DELETE' });
        if (!resp.ok) return;
        audioClips.splice(index, 1);
        renderAudioList();
    } catch (e) {
        showStatus(`删除失败: ${e.message}`, 'error');
    }
}

async function assignRole(index, role) {
    try {
        await fetch(`/api/audio/${index}/assign_role`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role })
        });
        audioClips[index].role = role;
    } catch (e) {
        console.warn('分配角色失败:', e);
    }
}

async function loadAudioList() {
    try {
        const resp = await fetch('/api/audio/list');
        if (!resp.ok) return;
        const data = await resp.json();
        audioClips = data.clips || [];
        renderAudioList();
    } catch (e) {
        console.warn('加载音频列表失败:', e);
    }
}

function renderAudioList() {
    const container = document.getElementById('audioList');
    if (!audioClips.length) {
        container.innerHTML = '<div class="empty-hint">上传各CV的音频文件</div>';
        return;
    }

    container.innerHTML = audioClips.map((clip, i) => {
        const statusClass = clip.asr_text ? 'done' : 'pending';
        const duration = clip.duration ? `${clip.duration.toFixed(1)}s` : '';
        return `
            <div class="audio-item" data-index="${i}">
                <span class="status-dot ${statusClass}"></span>
                <span class="label" title="${clip.label}">${clip.label}</span>
                <span class="duration">${duration}</span>
                <select class="role-select" onchange="assignRole(${i}, this.value)">
                    <option value="">自动</option>
                    ${currentScript ? currentScript.roles.map(r =>
                        `<option value="${r}" ${clip.role === r ? 'selected' : ''}>${r}</option>`
                    ).join('') : ''}
                </select>
                <button class="btn-del" onclick="deleteAudio(${i})" title="删除">✕</button>
            </div>
        `;
    }).join('');
}

// 全部转写
async function transcribeAll() {
    if (!audioClips.length) {
        showStatus('请先上传音频文件', 'error');
        return;
    }

    const pending = audioClips.filter(c => !c.asr_text);
    if (!pending.length) {
        showStatus('所有音频已转写完成', 'success');
        return;
    }

    showStatus(`正在转写 ${pending.length} 个音频...`, 'processing');

    for (let i = 0; i < audioClips.length; i++) {
        const clip = audioClips[i];
        if (clip.asr_text) continue;

        try {
            const resp = await fetch(`/api/asr/transcribe/${i}`, { method: 'POST' });
            if (!resp.ok) {
                const err = await resp.json();
                console.warn(`转写失败 #${i}:`, err);
                continue;
            }
            const data = await resp.json();
            clip.asr_text = data.asr_text;
            clip.asr_segments = data.asr_segments;
        } catch (e) {
            console.warn(`转写失败 #${i}:`, e);
        }
    }

    renderAudioList();
    showStatus('全部转写完成 ✓', 'success');
}
