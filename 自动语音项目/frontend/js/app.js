/**
 * 自动对轨工具 - 主应用控制器
 */

document.addEventListener('DOMContentLoaded', () => {
    init();
});

async function init() {
    // 尝试连接后端（不阻塞页面加载）
    let backendOk = false;
    try {
        const health = await fetch('/api/project', { signal: AbortSignal.timeout(3000) });
        backendOk = health.ok;
    } catch (e) {
        console.warn('后端首次检查未通过，会继续尝试:', e.message);
    }

    if (!backendOk) {
        showStatus('⚠️ 后端未响应，请确认服务已启动', 'error');
    }

    initAudioUpload();
    // 并行加载数据，失败不阻塞
    await Promise.allSettled([
        loadExportParams(),
        loadAudioList(),
        loadScript(),
        loadAsrConfig(),
    ]);

    // 加载工程信息
    try {
        const resp = await fetch('/api/project');
        if (resp.ok) {
            const data = await resp.json();
            if (data.project) {
                document.getElementById('projectName').textContent = data.project.name || '未命名工程';
            }
        }
    } catch (e) {
        console.warn('加载工程信息失败:', e);
    }

    if (backendOk) showStatus('就绪', '');
}

async function loadScript() {
    try {
        const resp = await fetch('/api/script');
        if (resp.ok) {
            const data = await resp.json();
            if (data.script) {
                currentScript = data.script;
                document.getElementById('scriptInput').value = data.script.raw_text || '';
                renderScriptPreview();
                renderRoleSelects();
            }
        }
    } catch (e) {
        console.warn('加载剧本失败:', e);
    }
}

async function loadAsrConfig() {
    try {
        const resp = await fetch('/api/asr/config');
        if (resp.ok) {
            const cfg = await resp.json();
            document.getElementById('asrApiKey').value = cfg.api_key || '';
            document.getElementById('asrBaseUrl').value = cfg.base_url || '';
            document.getElementById('asrLanguage').value = cfg.language || 'zh';
            updateProviderBadge(cfg.provider || '');
            if (cfg.api_key) {
                showStatus('✅ MiMo ASR 已就绪', 'success');
            }
        }
    } catch (e) {
        console.warn('加载ASR配置失败:', e);
    }
}

// ─── 状态显示 ───────────────────────────────

function showStatus(msg, type) {
    const badge = document.getElementById('statusBadge');
    badge.textContent = msg;
    badge.className = 'badge';
    if (type) badge.classList.add(type);
    if (type === 'success' || type === 'error') {
        setTimeout(() => {
            badge.textContent = '就绪';
            badge.className = 'badge';
        }, 3000);
    }
}

// ─── 对齐 ───────────────────────────────────

async function runAlign() {
    if (!currentScript) {
        showStatus('请先导入剧本', 'error');
        return;
    }
    if (!audioClips.some(c => c.asr_text)) {
        showStatus('请先运行 ASR 转写', 'error');
        return;
    }

    showStatus('正在对齐...', 'processing');

    try {
        const resp = await fetch('/api/align', { method: 'POST' });
        if (!resp.ok) {
            const err = await resp.json();
            showStatus(err.error || '对齐失败', 'error');
            return;
        }
        const data = await resp.json();

        // 渲染时间线
        renderTimeline(data.timeline);

        // 显示匹配详情
        const matchedCount = data.matches.reduce((sum, m) => sum + m.matches.length, 0);
        showStatus(`对齐完成：匹配 ${matchedCount} 句`, 'success');
    } catch (e) {
        showStatus(`对齐失败: ${e.message}`, 'error');
    }
}

// ─── 导出 ───────────────────────────────────

async function runExport() {
    if (!timelineData.length) {
        showStatus('请先执行对齐', 'error');
        return;
    }

    showStatus('正在导出...', 'processing');

    try {
        const resp = await fetch('/api/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ timeline: timelineData })
        });
        if (!resp.ok) {
            const err = await resp.json();
            showStatus(err.error || '导出失败', 'error');
            return;
        }
        const data = await resp.json();
        showStatus(`导出成功！${data.export_name} (${formatTime(data.duration)})`, 'success');

        // 触发下载
        const a = document.createElement('a');
        a.href = `/api/export/download/${encodeURIComponent(data.export_name)}`;
        a.download = data.export_name;
        a.click();
    } catch (e) {
        showStatus(`导出失败: ${e.message}`, 'error');
    }
}

// ─── ASR 配置 ──────────────────────────────

function updateProviderBadge(provider) {
    const badge = document.getElementById('providerBadge');
    if (provider === 'mimo') {
        badge.textContent = '🔗 MiMo-V2.5-ASR (Token Plan)';
        badge.style.borderColor = 'var(--success)';
    } else if (provider === 'http') {
        badge.textContent = '🔗 HTTP ASR API';
        badge.style.borderColor = 'var(--warning)';
    } else {
        badge.textContent = '🔌 未配置';
        badge.style.borderColor = '';
    }
}

async function saveAsrConfig() {
    const apiKey = document.getElementById('asrApiKey').value.trim();
    const baseUrl = document.getElementById('asrBaseUrl').value.trim();
    const language = document.getElementById('asrLanguage').value;

    try {
        const resp = await fetch('/api/asr/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: apiKey,
                base_url: baseUrl,
                language: language,
            })
        });
        if (!resp.ok) {
            showStatus('保存ASR配置失败', 'error');
            return;
        }
        const provider = apiKey.startsWith('tp-') ? 'mimo' : (apiKey ? 'http' : '');
        updateProviderBadge(provider);
        showStatus('ASR配置已保存', 'success');
    } catch (e) {
        showStatus(`保存失败: ${e.message}`, 'error');
    }
}

// ─── 工程文件 ──────────────────────────────

async function projectSave() {
    try {
        const resp = await fetch('/api/project/save', { method: 'POST' });
        if (!resp.ok) return;
        const data = await resp.json();
        showStatus(`工程已保存: ${data.path}`, 'success');
    } catch (e) {
        showStatus(`保存失败: ${e.message}`, 'error');
    }
}

async function projectLoad() {
    try {
        const resp = await fetch('/api/project/list');
        if (!resp.ok) return;
        const data = await resp.json();
        const projects = data.projects || [];

        if (!projects.length) {
            showStatus('没有已保存的工程', 'error');
            return;
        }

        showModal('选择工程文件', `
            ${projects.map(p => `
                <div class="project-file-item" onclick="loadProjectFile('${p.path}')">
                    <span>${p.name}</span>
                    <span style="color:var(--text-muted);font-size:12px;">${(p.size / 1024).toFixed(1)}KB</span>
                </div>
            `).join('')}
        `);
    } catch (e) {
        showStatus(`加载列表失败: ${e.message}`, 'error');
    }
}

async function loadProjectFile(path) {
    closeModal();
    try {
        const resp = await fetch('/api/project/load', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path })
        });
        if (!resp.ok) return;
        // 重新加载全部状态
        location.reload();
    } catch (e) {
        showStatus(`加载失败: ${e.message}`, 'error');
    }
}

// ─── 弹窗 ──────────────────────────────────

function showModal(title, bodyHtml) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHtml;
    document.getElementById('modalOverlay').style.display = 'flex';
}

function closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
}

// ─── 折叠面板 ──────────────────────────────

function toggleCollapse(id) {
    const section = document.getElementById(id);
    section.classList.toggle('open');
    const icon = section.querySelector('.collapse-icon');
    if (icon) icon.textContent = section.classList.contains('open') ? '▲' : '▼';
}

// ─── 键盘快捷键 ──────────────────────────────

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        const active = document.activeElement;
        if (active && active.id === 'scriptInput') {
            e.preventDefault();
            scriptParse();
        }
    }
    if (e.key === 'Escape') {
        const modal = document.getElementById('modalOverlay');
        if (modal.style.display === 'flex') closeModal();
    }
});
