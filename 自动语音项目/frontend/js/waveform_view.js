/**
 * 波形显示 & 对齐时间线
 * 带有播放预览 + 手动微调功能
 */

let timelineData = [];
let _audioContext = null;

function getAudioContext() {
    if (!_audioContext) {
        _audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return _audioContext;
}

/** 播放指定音频片段 */
async function playSegment(clipIndex, offset, duration) {
    try {
        const resp = await fetch(`/api/audio/play/${clipIndex}`);
        if (!resp.ok) throw new Error('加载音频失败');
        const blob = await resp.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const ctx = getAudioContext();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        const startOffset = offset || 0;
        const dur = duration || (audioBuffer.duration - startOffset);
        source.start(0, startOffset, dur);
        source.connect(ctx.destination);
    } catch (e) {
        console.error('播放失败:', e);
        if (typeof showStatus === 'function') {
            showStatus(`播放失败: ${e.message}`, 'error');
        }
    }
}

/** 微调偏移量 */
async function adjustOffset(lineIndex, sourceClip, deltaSeconds) {
    try {
        const resp = await fetch('/api/timeline/adjust', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                line_index: lineIndex,
                source_clip: sourceClip,
                offset_shift: deltaSeconds,
            })
        });
        if (!resp.ok) throw new Error('调整失败');
        const data = await resp.json();
        // 重新对齐以获取更新后的时间线
        if (typeof runAlign === 'function') {
            await runAlign();
        }
        if (typeof showStatus === 'function') {
            showStatus(`已偏移 ${deltaSeconds > 0 ? '+' : ''}${deltaSeconds.toFixed(1)}s (累计: ${data.offset_shift.toFixed(1)}s)`, 'success');
        }
    } catch (e) {
        console.error('调整失败:', e);
        if (typeof showStatus === 'function') {
            showStatus(`调整失败: ${e.message}`, 'error');
        }
    }
}

/** 重置所有微调 */
async function resetAdjustments() {
    try {
        await fetch('/api/timeline/adjustments/clear', { method: 'POST' });
        if (typeof runAlign === 'function') await runAlign();
        if (typeof showStatus === 'function') showStatus('❌ 已清除所有微调', '');
    } catch (e) {
        console.error('重置失败:', e);
    }
}

function renderTimeline(timeline) {
    const container = document.getElementById('timelineContent');
    timelineData = timeline || [];

    if (!timeline || !timeline.length) {
        container.innerHTML = '<div class="empty-hint">上传音频 → ASR转写 → 对齐 → 导出</div>';
        container.classList.remove('has-content');
        return;
    }

    container.classList.add('has-content');

    const totalDuration = timeline.length > 0
        ? timeline[timeline.length - 1].timeline_end
        : 0;

    const html = `
        <div style="width:100%;overflow-y:auto;padding:4px 0;">
            <div style="padding:0 12px 8px;font-size:12px;color:var(--text-muted);border-bottom:1px solid var(--border);display:flex;gap:16px;align-items:center;">
                <span>共 ${timeline.length} 句</span>
                <span>总时长: ${formatTime(totalDuration)}</span>
                <button class="btn-sm" onclick="resetAdjustments()" style="margin-left:auto;">重置微调</button>
            </div>
            ${timeline.map((entry, i) => {
                const clipIndex = findClipIndex(entry.source_clip);
                const adjKey = `${entry.line_index}_${entry.source_clip}`;
                return `
                <div class="timeline-entry" style="flex-wrap:wrap;">
                    <span class="entry-index">#${entry.line_index + 1}</span>
                    <span class="entry-role">${entry.role}</span>
                    <span class="entry-text">${escapeHtml(entry.text)}</span>
                    <span class="entry-time">
                        ${formatTime(entry.timeline_start)} → ${formatTime(entry.timeline_end)}
                    </span>
                    <span class="entry-confidence ${confidenceClass(entry.confidence)}">
                        ${(entry.confidence * 100).toFixed(0)}%
                    </span>
                    <button class="btn-sm" onclick="playSegment(${clipIndex}, ${entry.audio_offset || 0}, ${(entry.audio_end || 0) - (entry.audio_offset || 0)})" title="试听此段">▶</button>
                    <div style="display:flex;gap:2px;margin-left:auto;">
                        <button class="btn-sm" onclick="adjustOffset(${entry.line_index}, '${entry.source_clip}', -0.1)" title="向前移0.1秒">◀0.1</button>
                        <button class="btn-sm" onclick="adjustOffset(${entry.line_index}, '${entry.source_clip}', 0.1)" title="向后移0.1秒">0.1▶</button>
                        <button class="btn-sm" onclick="adjustOffset(${entry.line_index}, '${entry.source_clip}', -1.0)" title="向前移1秒">◀1s</button>
                        <button class="btn-sm" onclick="adjustOffset(${entry.line_index}, '${entry.source_clip}', 1.0)" title="向后移1秒">1s▶</button>
                    </div>
                </div>
            `}).join('')}
        </div>
    `;

    container.innerHTML = html;
}

/** 根据文件路径查找 clip index */
function findClipIndex(filePath) {
    if (!window.audioClips) return 0;
    const idx = window.audioClips.findIndex(c => c.file_path === filePath);
    return idx >= 0 ? idx : 0;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime(seconds) {
    if (!seconds && seconds !== 0) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

function confidenceClass(conf) {
    if (conf >= 0.7) return 'entry-conf-high';
    if (conf >= 0.4) return 'entry-conf-mid';
    return 'entry-conf-low';
}
