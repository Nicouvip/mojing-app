'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils/utils'
import { CheckCircle2, XCircle, Save } from 'lucide-react'

interface SystemConfig {
  model: string
  wordGoal: number
}

const DEFAULT_CONFIG: SystemConfig = {
  model: 'deepseek-chat',
  wordGoal: 3000,
}

function loadConfig(): SystemConfig {
  try {
    const raw = localStorage.getItem('mojing_system_config')
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
  } catch {}
  return DEFAULT_CONFIG
}

function saveConfig(config: SystemConfig) {
  try { localStorage.setItem('mojing_system_config', JSON.stringify(config)) } catch {}
}

export function SettingsForm({ keyConfigured }: { keyConfigured: boolean }) {
  const [config, setConfig] = useState<SystemConfig>(DEFAULT_CONFIG)
  const [saved, setSaved] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setConfig(loadConfig())
    setLoaded(true)
  }, [])

  const handleSave = () => {
    saveConfig(config)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!loaded) return <div className="text-sm text-muted-foreground py-10 text-center">加载中...</div>

  return (
    <div className="space-y-6">
      {/* API Key 状态 */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-sm font-semibold text-foreground mb-3">DeepSeek API Key</h2>
          <div className="flex items-center gap-3">
            {keyConfigured ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="text-sm text-emerald-600 font-medium">已配置</span>
                <span className="text-xs text-muted-foreground">Key 已从 .env.local 读取，安全存储</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-destructive" />
                <span className="text-sm text-destructive font-medium">未配置</span>
                <span className="text-xs text-muted-foreground">请在 .env.local 中设置 DEEPSEEK_API_KEY</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 默认模型 */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-sm font-semibold text-foreground mb-3">默认 AI 模型</h2>
          <p className="text-xs text-muted-foreground mb-3">选择 AI 续写/润色/扩写时使用的模型</p>
          <div className="flex gap-2">
            {['deepseek-chat', 'deepseek-reasoner'].map(model => (
              <button
                key={model}
                onClick={() => setConfig(prev => ({ ...prev, model }))}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm border transition-all",
                  config.model === model
                    ? "bg-primary text-white border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                )}
              >
                {model === 'deepseek-chat' ? '⚡ Flash（快速）' : '🚀 Pro（高质量）'}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            {config.model === 'deepseek-chat' ? '速度快、成本低，适合日常写作' : '质量更高、推理更强，适合重要章节'}
          </p>
        </CardContent>
      </Card>

      {/* 字数目标 */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-sm font-semibold text-foreground mb-3">每日字数目标</h2>
          <p className="text-xs text-muted-foreground mb-3">编辑器进度条的目标字数</p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={config.wordGoal}
              onChange={e => setConfig(prev => ({ ...prev, wordGoal: Math.max(100, parseInt(e.target.value) || 0) }))}
              className="w-32 h-9 px-3 text-sm rounded-lg border border-border bg-background outline-none focus:border-primary"
              min={100}
              step={100}
            />
            <span className="text-sm text-muted-foreground">字</span>
          </div>
          <div className="flex gap-2 mt-2">
            {[1000, 2000, 3000, 5000, 10000].map(n => (
              <button
                key={n}
                onClick={() => setConfig(prev => ({ ...prev, wordGoal: n }))}
                className={cn(
                  "px-2 py-0.5 rounded text-xs border transition-colors",
                  config.wordGoal === n
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                )}
              >
                {n.toLocaleString()}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 保存按钮 */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          保存设置
        </button>
        {saved && (
          <span className="text-sm text-emerald-500 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" />
            已保存
          </span>
        )}
      </div>
    </div>
  )
}
