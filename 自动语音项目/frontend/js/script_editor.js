/**
 * 剧本编辑器
 */

let currentScript = null;  // { raw_text, lines, roles }

async function scriptParse() {
    const textarea = document.getElementById('scriptInput');
    const rawText = textarea.value.trim();
    if (!rawText) {
        showStatus('请先粘贴剧本内容', 'error');
        return;
    }

    try {
        const resp = await fetch('/api/script', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: rawText })
        });
        if (!resp.ok) {
            const err = await resp.json();
            showStatus(err.error || '解析失败', 'error');
            return;
        }
        const data = await resp.json();
        currentScript = data.script;
        renderScriptPreview();
        renderRoleSelects();
        showStatus(`剧本解析完成：共 ${currentScript.lines.length} 句，${currentScript.roles.length} 个角色`, 'success');
    } catch (e) {
        showStatus(`剧本解析失败: ${e.message}`, 'error');
    }
}

function renderScriptPreview() {
    const preview = document.getElementById('scriptPreview');
    if (!currentScript || !currentScript.lines.length) {
        preview.innerHTML = '';
        return;
    }

    // 显示角色标签
    const rolesHtml = currentScript.roles.map(r =>
        `<span class="role-tag">${r}</span>`
    ).join(' ');
    preview.innerHTML = `<div style="margin-bottom:4px;">${rolesHtml}</div>`;

    // 显示前几句
    const previewLines = currentScript.lines.slice(0, 3).map(l =>
        `<div style="font-size:12px;color:var(--text-muted);padding:1px 0;">[${l.role}]: ${l.text.slice(0, 30)}${l.text.length > 30 ? '…' : ''}</div>`
    ).join('');
    const more = currentScript.lines.length > 3 ? `<div style="font-size:11px;color:var(--text-muted);">……共 ${currentScript.lines.length} 句</div>` : '';
    preview.innerHTML += previewLines + more;
}

function scriptClear() {
    document.getElementById('scriptInput').value = '';
    document.getElementById('scriptPreview').innerHTML = '';
    currentScript = null;
    showStatus('已清空剧本', '');
}

function renderRoleSelects() {
    if (!currentScript) return;
    const roles = currentScript.roles;
    document.querySelectorAll('.role-select').forEach(select => {
        const currentVal = select.value;
        select.innerHTML = '<option value="">自动</option>';
        roles.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r;
            opt.textContent = r;
            if (r === currentVal) opt.selected = true;
            select.appendChild(opt);
        });
    });
}
