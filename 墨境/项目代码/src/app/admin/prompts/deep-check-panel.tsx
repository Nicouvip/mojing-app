'use client'

import { useState } from 'react'
import { loadPrompts, type DeepCheckPrompt } from '@/lib/ai/deep-check-prompt'
import { cn } from '@/lib/utils/utils'

export function DeepCheckPanel() {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [localPrompts, setLocalPrompts] = useState(() => loadPrompts())

  const selected = localPrompts.find(p => p.id === selectedId)

  const handleSave = (updated: DeepCheckPrompt) => {
    setLocalPrompts(prev => prev.map(p => p.id === updated.id ? updated : p))
    setEditMode(false)
    // 保存到 localStorage 供前端运行时读取
    try {
      const updatedList = localPrompts.map(p => p.id === updated.id ? updated : p)
      localStorage.setItem('mojing_deep_check_prompts', JSON.stringify(updatedList))
    } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">🤖 AI 深度检测（12 项）</h2>
        <span className="text-[10px] text-muted-foreground">
          修改保存后，刷新章末自检页面生效
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        管理 12 项规则无法自动化的检测项的 AI 提示词。每项可调整 temperature 和采样策略。
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 左侧：列表 */}
        <div className="space-y-1">
          {localPrompts.map(p => (
            <button
              key={p.id}
              onClick={() => { setSelectedId(p.id); setEditMode(false) }}
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg text-xs transition-colors border',
                selectedId === p.id
                  ? 'bg-primary/10 border-primary/30 text-primary font-medium'
                  : 'bg-background border-border/50 text-muted-foreground hover:bg-muted/50'
              )}
            >
              <div className="flex items-center justify-between">
                <span>#{p.id} {p.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  T={p.temperature} · {p.sampleMode}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* 右侧：编辑区 */}
        <div>
          {!selected && (
            <div className="text-xs text-muted-foreground text-center py-10 border border-dashed border-border/50 rounded-lg">
              选择左侧一项开始编辑
            </div>
          )}

          {selected && !editMode && (
            <div className="border border-border/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">#{selected.id} {selected.name}</h3>
                <button onClick={() => setEditMode(true)} className="text-xs text-primary hover:underline">
                  编辑
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Temperature：</span>
                  <span className="font-mono">{selected.temperature}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">采样策略：</span>
                  <span className="font-mono">{selected.sampleMode === 'head' ? '取开头' : '头中尾三段'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">系统提示词：</span>
                  <pre className="mt-1 p-2 bg-muted/50 rounded text-[10px] leading-relaxed whitespace-pre-wrap font-mono">
                    {selected.systemPrompt}
                  </pre>
                </div>
                <div>
                  <span className="text-muted-foreground">用户提示词模板：</span>
                  <pre className="mt-1 p-2 bg-muted/50 rounded text-[10px] leading-relaxed whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
                    {selected.userTemplate}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {selected && editMode && (
            <DeepCheckEditor prompt={selected} onSave={handleSave} onCancel={() => setEditMode(false)} />
          )}
        </div>
      </div>
    </div>
  )
}

function DeepCheckEditor({
  prompt,
  onSave,
  onCancel,
}: {
  prompt: DeepCheckPrompt
  onSave: (p: DeepCheckPrompt) => void
  onCancel: () => void
}) {
  const [temp, setTemp] = useState(prompt.temperature)
  const [mode, setMode] = useState(prompt.sampleMode)
  const [sysPrompt, setSysPrompt] = useState(prompt.systemPrompt)
  const [userTemplate, setUserTemplate] = useState(prompt.userTemplate)

  return (
    <div className="border border-border/50 rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-semibold">编辑 #{prompt.id} {prompt.name}</h3>

      <div className="space-y-2 text-xs">
        <div>
          <label className="text-muted-foreground block mb-0.5">Temperature（0-1）</label>
          <input
            type="number"
            min={0} max={1} step={0.1}
            value={temp}
            onChange={e => setTemp(parseFloat(e.target.value) || 0.3)}
            className="w-20 px-2 py-1 rounded border border-border bg-background text-xs font-mono"
          />
          <span className="ml-2 text-[10px] text-muted-foreground">高=更有创意，低=更精确</span>
        </div>

        <div>
          <label className="text-muted-foreground block mb-0.5">采样策略</label>
          <select
            value={mode}
            onChange={e => setMode(e.target.value as 'head' | 'spread')}
            className="px-2 py-1 rounded border border-border bg-background text-xs"
          >
            <option value="head">取开头（head）</option>
            <option value="spread">头中尾三段（spread）</option>
          </select>
        </div>

        <div>
          <label className="text-muted-foreground block mb-0.5">系统提示词</label>
          <textarea
            value={sysPrompt}
            onChange={e => setSysPrompt(e.target.value)}
            rows={2}
            className="w-full px-2 py-1 rounded border border-border bg-background text-[10px] font-mono"
          />
        </div>

        <div>
          <label className="text-muted-foreground block mb-0.5">用户提示词模板</label>
          <textarea
            value={userTemplate}
            onChange={e => setUserTemplate(e.target.value)}
            rows={8}
            className="w-full px-2 py-1 rounded border border-border bg-background text-[10px] font-mono leading-relaxed"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="px-3 py-1 rounded border border-border text-xs text-muted-foreground hover:bg-secondary">
          取消
        </button>
        <button
          onClick={() => onSave({ ...prompt, temperature: temp, sampleMode: mode, systemPrompt: sysPrompt, userTemplate })}
          className="px-3 py-1 rounded bg-primary text-white text-xs hover:bg-primary/90"
        >
          保存
        </button>
      </div>
    </div>
  )
}
