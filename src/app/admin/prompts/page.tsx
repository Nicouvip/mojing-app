'use client'

import { useState } from 'react'
import { registry } from '@/lib/prompts'
import { TemplateCard } from './card'
import { StatsPanel } from './stats-panel'
import { ABPanel } from './ab-panel'
import { UsageTab } from './usage-tab'
import { cn } from '@/lib/utils/utils'

const TABS = [
  { key: 'stats', label: '效果看板' },
  { key: 'usage', label: '调用统计' },
  { key: 'ab', label: 'A/B 实验' },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function PromptsPage() {
  const templates = registry.listActive()
  const [activeTab, setActiveTab] = useState<TabKey>('stats')

  const typeLabel: Record<string, string> = {
    continue: '续写',
    polish: '润色',
    expand: '扩写',
    brainstorm: '脑洞喷射',
  }

  const typeOrder = ['continue', 'polish', 'expand', 'brainstorm']
  const sorted = [...templates].sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">提示词管理中心</h1>
        <p className="text-sm text-muted-foreground mt-1">
          管理 AI 提示词模板、查看效果数据、运行 A/B 实验。共 {templates.length} 个活跃模板。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 模板列表 — 占 2/3 */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            📄 模板列表
          </h2>
          {sorted.map(t => (
            <TemplateCard key={t.id} template={t} typeLabel={typeLabel[t.type] || t.type} />
          ))}
        </div>

        {/* 右侧面板 — Tab 切换 */}
        <div className="space-y-4">
          {/* Tab 导航 */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex-1 px-3 py-2 text-xs font-medium transition-colors',
                  activeTab === tab.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-secondary'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 内容 */}
          {activeTab === 'stats' && <StatsPanel />}
          {activeTab === 'usage' && <UsageTab />}
          {activeTab === 'ab' && <ABPanel />}
        </div>
      </div>
    </div>
  )
}
