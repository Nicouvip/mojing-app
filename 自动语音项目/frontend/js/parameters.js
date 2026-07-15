/**
 * 参数面板 - 淡入淡出 / 咔嗒声 / 静音裁剪 / 导出格式
 */

const PARAM_TABS = {
    fade: {
        title: '交叉渐变',
        params: [
            { key: 'crossfade_enabled', type: 'toggle', label: '启用交叉渐变' },
            { key: 'crossfade_duration', type: 'range', label: '渐变时长(ms)', min: 10, max: 500, step: 10, suffix: 'ms', multiply: 1000 },
            { key: 'crossfade_curve', type: 'select', label: '曲线', options: ['linear', 's_curve'] },
        ]
    },
    click: {
        title: '咔嗒声消除',
        params: [
            { key: 'click_removal_enabled', type: 'toggle', label: '启用消除' },
            { key: 'click_removal_threshold', type: 'range', label: '阈值(dB)', min: -50, max: -10, step: 1, suffix: 'dB' },
        ]
    },
    silence: {
        title: '静音裁剪',
        params: [
            { key: 'silence_trim_enabled', type: 'toggle', label: '启用裁剪' },
            { key: 'silence_trim_threshold', type: 'range', label: '阈值(dB)', min: -70, max: -20, step: 1, suffix: 'dB' },
            { key: 'silence_trim_min_duration', type: 'range', label: '最短静音(s)', min: 0.1, max: 1.0, step: 0.1, suffix: 's' },
        ]
    },
    export: {
        title: '导出格式',
        params: [
            { key: 'export_format', type: 'select', label: '格式', options: ['wav', 'mp3', 'flac'] },
            { key: 'export_sample_rate', type: 'select', label: '采样率', options: [22050, 44100, 48000, 96000] },
            { key: 'export_subtype', type: 'select', label: '位深', options: ['PCM_16', 'PCM_24', 'FLOAT'] },
            { key: 'export_channels', type: 'select', label: '声道', options: ['mono', 'stereo'] },
            { key: 'export_bitrate', type: 'select', label: '比特率', options: ['64k', '96k', '128k', '192k', '256k', '320k'] },
        ]
    },
    normalize: {
        title: '响度标准化',
        params: [
            { key: 'normalize_enabled', type: 'toggle', label: '启用响度标准化' },
            { key: 'normalize_target_db', type: 'range', label: '目标(dB)', min: -30, max: -10, step: 1, suffix: 'dB' },
        ]
    },
};

let exportParamsCache = {};

async function loadExportParams() {
    try {
        const resp = await fetch('/api/export/params');
        if (!resp.ok) return;
        exportParamsCache = await resp.json();
        renderParams('fade');
    } catch (e) {
        console.warn('加载导出参数失败:', e);
    }
}

async function saveExportParams() {
    try {
        await fetch('/api/export/params', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(exportParamsCache)
        });
    } catch (e) {
        console.warn('保存导出参数失败:', e);
    }
}

function renderParams(tabName) {
    const config = PARAM_TABS[tabName];
    if (!config) return;

    const container = document.getElementById('paramsContent');
    container.innerHTML = '';

    config.params.forEach(p => {
        const value = exportParamsCache[p.key];
        const group = document.createElement('div');
        group.className = 'param-group';

        if (p.type === 'toggle') {
            const btn = document.createElement('button');
            btn.className = `param-toggle ${value ? 'on' : ''}`;
            btn.title = p.label;
            btn.onclick = () => {
                exportParamsCache[p.key] = !exportParamsCache[p.key];
                btn.classList.toggle('on');
                saveExportParams();
            };
            const label = document.createElement('label');
            label.textContent = p.label;
            group.appendChild(btn);
            group.appendChild(label);
        } else if (p.type === 'range') {
            const label = document.createElement('label');
            const displayValue = p.multiply ? (value * p.multiply) : value;
            label.textContent = `${p.label}: ${displayValue}${p.suffix || ''}`;
            const input = document.createElement('input');
            input.type = 'range';
            input.min = p.min;
            input.max = p.max;
            input.step = p.step;
            input.value = displayValue;
            input.oninput = () => {
                const raw = parseFloat(input.value);
                exportParamsCache[p.key] = p.multiply ? raw / p.multiply : raw;
                label.textContent = `${p.label}: ${raw}${p.suffix || ''}`;
                saveExportParams();
            };
            group.appendChild(label);
            group.appendChild(input);
        } else if (p.type === 'select') {
            const label = document.createElement('label');
            label.textContent = p.label;
            const select = document.createElement('select');
            p.options.forEach(opt => {
                const optEl = document.createElement('option');
                optEl.value = opt;
                optEl.textContent = opt;
                if (value == opt) optEl.selected = true;
                select.appendChild(optEl);
            });
            select.onchange = () => {
                exportParamsCache[p.key] = select.value;
                saveExportParams();
            };
            group.appendChild(label);
            group.appendChild(select);
        }

        container.appendChild(group);
    });
}

// ─── 参数预设管理 ────────────────────────────

const PRESETS = {
    default: {
        name: '默认',
        params: {
            crossfade_enabled: true, crossfade_duration: 0.2, crossfade_curve: 'linear',
            click_removal_enabled: true, click_removal_threshold: -30,
            silence_trim_enabled: true, silence_trim_threshold: -50, silence_trim_min_duration: 0.1,
            export_sample_rate: 44100, export_format: 'wav', export_bitrate: '192k',
            export_subtype: 'PCM_16', export_channels: 'mono',
            normalize_enabled: true, normalize_target_db: -24,
        }
    },
    gentle: {
        name: '柔和',
        params: {
            crossfade_enabled: true, crossfade_duration: 0.25, crossfade_curve: 's_curve',
            click_removal_enabled: true, click_removal_threshold: -35,
            silence_trim_enabled: true, silence_trim_threshold: -45, silence_trim_min_duration: 0.15,
            export_sample_rate: 48000, export_format: 'wav', export_bitrate: '256k',
            export_subtype: 'PCM_24', export_channels: 'mono',
            normalize_enabled: true, normalize_target_db: -24,
        }
    },
    quick: {
        name: '快速',
        params: {
            crossfade_enabled: false, crossfade_duration: 0, crossfade_curve: 'linear',
            click_removal_enabled: false, click_removal_threshold: -30,
            silence_trim_enabled: false, silence_trim_threshold: -50, silence_trim_min_duration: 0.1,
            export_sample_rate: 44100, export_format: 'wav', export_bitrate: '192k',
            export_subtype: 'PCM_16', export_channels: 'mono',
            normalize_enabled: false, normalize_target_db: -24,
        }
    },
};

function applyPreset(presetName) {
    const preset = PRESETS[presetName];
    if (!preset) return;
    Object.assign(exportParamsCache, preset.params);
    saveExportParams().then(() => {
        // 重新渲染当前标签
        const activeTab = document.querySelector('.param-tab.active');
        if (activeTab) renderParams(activeTab.dataset.tab);
        showStatus(`已应用预设: ${preset.name}`, 'success');
    });
}

// 在参数栏添加预设按钮
function renderPresetButtons() {
    const container = document.getElementById('paramsContent');
    const presetBar = document.createElement('div');
    presetBar.style.cssText = 'width:100%;display:flex;gap:6px;align-items:center;padding-bottom:4px;border-bottom:1px solid var(--border);margin-bottom:4px;';
    presetBar.innerHTML = '<span style="font-size:11px;color:var(--text-muted);">预设:</span>';
    Object.entries(PRESETS).forEach(([key, preset]) => {
        const btn = document.createElement('button');
        btn.className = 'btn-sm';
        btn.textContent = preset.name;
        btn.onclick = () => applyPreset(key);
        presetBar.appendChild(btn);
    });
    container.prepend(presetBar);
}

// 重写 renderParams 以包含预设按钮
const _origRenderParams = renderParams;
renderParams = function(tabName) {
    const config = PARAM_TABS[tabName];
    if (!config) return;

    const container = document.getElementById('paramsContent');
    container.innerHTML = '';

    // 在 fade 标签页显示预设按钮
    if (tabName === 'fade') {
        renderPresetButtons();
    }

    config.params.forEach(p => {
        const value = exportParamsCache[p.key];
        const group = document.createElement('div');
        group.className = 'param-group';

        if (p.type === 'toggle') {
            const btn = document.createElement('button');
            btn.className = `param-toggle ${value ? 'on' : ''}`;
            btn.title = p.label;
            btn.onclick = () => {
                exportParamsCache[p.key] = !exportParamsCache[p.key];
                btn.classList.toggle('on');
                saveExportParams();
            };
            const label = document.createElement('label');
            label.textContent = p.label;
            group.appendChild(btn);
            group.appendChild(label);
        } else if (p.type === 'range') {
            const label = document.createElement('label');
            const displayValue = p.multiply ? (value * p.multiply) : value;
            label.textContent = `${p.label}: ${displayValue}${p.suffix || ''}`;
            const input = document.createElement('input');
            input.type = 'range';
            input.min = p.min;
            input.max = p.max;
            input.step = p.step;
            input.value = displayValue;
            input.oninput = () => {
                const raw = parseFloat(input.value);
                exportParamsCache[p.key] = p.multiply ? raw / p.multiply : raw;
                label.textContent = `${p.label}: ${raw}${p.suffix || ''}`;
                saveExportParams();
            };
            group.appendChild(label);
            group.appendChild(input);
        } else if (p.type === 'select') {
            const label = document.createElement('label');
            label.textContent = p.label;
            const select = document.createElement('select');
            p.options.forEach(opt => {
                const optEl = document.createElement('option');
                optEl.value = opt;
                optEl.textContent = opt;
                if (value == opt) optEl.selected = true;
                select.appendChild(optEl);
            });
            select.onchange = () => {
                exportParamsCache[p.key] = select.value;
                saveExportParams();
            };
            group.appendChild(label);
            group.appendChild(select);
        }

        container.appendChild(group);
    });
};

// 标签切换
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.param-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.param-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderParams(tab.dataset.tab);
        });
    });
});
