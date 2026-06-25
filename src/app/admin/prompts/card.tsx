'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import type { PromptTemplate } from '@/lib/prompts'
import { registry } from '@/lib/prompts'
import { ChevronDown, ChevronRight, FileText, Edit3, Save, X, Power, PowerOff } from 'lucide-react'
import { cn } from '@/lib/utils/utils'

const LAYER_LABELS: Record<string, string> = {
  system_iron_rules: 'L1 铁律层',
  function_instruction: 'L2 功能指令层',
  context_injection: 'L3 上下文注入层',
  output_constraints: 'L4 输出约束层',
}

export function TemplateCard({ template, typeLabel }: { template: PromptTemplate; typeLabel: string }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState<PromptTemplate | null>(null)
  const [saved, setSaved] = useState(false)

  // Check if active
  const [active, setActive] = useState(true)

  const handleEdit = () => {
    setEditData({ ...template, layers: { ...template.layers }, defaultParams: { ...template.defaultParams } })
    setEditing(true)
  }

  const handleSave = () => {
    if (!editData) return
    registry.register(editData)
    setSaved(true)
    setEditing(false)
    setTimeout(() => setSaved(false), 2000)
  }

  const toggleActive = () => {
    if (active) {
      registry.deactivate(template.id)
    } else {
      registry.activate(template.id)
    }
    setActive(!active)
  }

  const updateLayer = (key: string, value: string) => {
    if (!editData) return
    setEditData({
      ...editData,
      layers: { ...editData.layers, [key]: value },
    })
  }

  const updateParam = (key: 'temperature' | 'maxTokens', value: number) => {
    if (!editData) return
    setEditData({
      ...editData,
      defaultParams: { ...editData.defaultParams, [key]: value },
    })
  }

  return (
    <Card className={cn("transition-shadow hover:shadow-card", !active && "opacity-50")}>
      <CardContent className="p-0">
        <div
          onClick={() => setOpen(!open)}
          role="button"
          tabIndex={0}
          onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setOpen(!open)}
          className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-secondary/30 transition-colors cursor-pointer"
        >
          <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-primary" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{template.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{typeLabel}</span>
              <span className="text-[10px] text-muted-foreground/50 font-mono">v{template.version}</span>
              {!active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-600">已停用</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{template.description}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
            <button onClick={handleEdit} title="编辑" className="p-1 rounded hover:bg-secondary">
              <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button onClick={toggleActive} title={active ? '停用' : '启用'} className="p-1 rounded hover:bg-secondary">
              {active ? <PowerOff className="w-3.5 h-3.5 text-amber-500" /> : <Power className="w-3.5 h-3.5 text-emerald-500" />}
            </button>
          </div>
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
        </div>

        {/* 编辑模式 */}
        {editing && editData && (
          <div className="border-t border-border px-5 py-4 space-y-4 bg-secondary/20">
            <div className="flex items-center gap-2">
              <input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })}
                className="text-sm font-medium bg-background border border-border rounded px-2 py-1 w-40" />
              <input value={editData.version} onChange={e => setEditData({ ...editData, version: e.target.value })}
                className="text-xs bg-background border border-border rounded px-2 py-1 w-24 font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="flex items-center gap-2">
                <span className="text-muted-foreground">Temperature</span>
                <input type="number" step="0.1" min="0" max="2" value={editData.defaultParams.temperature}
                  onChange={e => updateParam('temperature', parseFloat(e.target.value))}
                  className="w-16 bg-background border border-border rounded px-1.5 py-0.5" />
              </label>
              <label className="flex items-center gap-2">
                <span className="text-muted-foreground">Max Tokens</span>
                <input type="number" step="64" min="64" value={editData.defaultParams.maxTokens}
                  onChange={e => updateParam('maxTokens', parseInt(e.target.value))}
                  className="w-20 bg-background border border-border rounded px-1.5 py-0.5" />
              </label>
            </div>
            {Object.keys(editData.layers).map(key => (
              <div key={key}>
                <p className="text-xs font-medium text-foreground mb-1">{LAYER_LABELS[key] || key}</p>
                <textarea value={(editData.layers as Record<string, string>)[key] || ''}
                  onChange={e => updateLayer(key, e.target.value)}
                  className="w-full h-24 text-xs bg-background border border-border rounded p-2 resize-y font-mono" />
              </div>
            ))}
            <div className="flex gap-2">
              <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1.5 rounded bg-primary text-white text-xs">
                <Save className="w-3 h-3" />保存
              </button>
              <button onClick={() => setEditing(false)} className="flex items-center gap-1 px-3 py-1.5 rounded border border-border text-xs">
                <X className="w-3 h-3" />取消
              </button>
              {saved && <span className="text-xs text-emerald-500 self-center">已保存</span>}
            </div>
          </div>
        )}

        {/* 展开预览 */}
        {open && !editing && (
          <div className="border-t border-border px-5 py-4 space-y-4">
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>温度: <span className="font-mono text-foreground">{template.defaultParams.temperature}</span></span>
              <span>Max Tokens: <span className="font-mono text-foreground">{template.defaultParams.maxTokens}</span></span>
              {template.genres.length > 0 ? <span>适用题材: {template.genres.join('、')}</span> : <span>适用题材: 通用</span>}
            </div>
            {Object.entries(template.layers).map(([key, content]) => (
              content ? (
                <div key={key}>
                  <h4 className="text-xs font-semibold text-foreground mb-1">{LAYER_LABELS[key] || key}</h4>
                  <pre className="text-xs text-muted-foreground bg-secondary rounded-lg p-3 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">{content}</pre>
                </div>
              ) : null
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
