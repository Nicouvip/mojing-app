'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { feedbackCollector } from '@/lib/prompts'
import { registry } from '@/lib/prompts'
import type { TemplateStats } from '@/lib/prompts'
import { BarChart3, TrendingUp, CheckCircle2, RefreshCw } from 'lucide-react'

export function StatsPanel() {
  const [stats, setStats] = useState<TemplateStats[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    const templates = registry.listActive()
    const allStats = templates.map(t => feedbackCollector.getStats(t.id, t.version))
    setStats(allStats)
    if (allStats.length > 0 && !selectedId) setSelectedId(allStats[0].templateId)
  }, [])

  const selected = stats.find(s => s.templateId === selectedId)

  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-muted-foreground" />
          效果看板
        </h2>

        {stats.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">暂无反馈数据</p>
        ) : (
          <div className="space-y-4">
            {/* 模板选择 */}
            <div className="flex gap-2 flex-wrap">
              {stats.map(s => (
                <button
                  key={s.templateId}
                  onClick={() => setSelectedId(s.templateId)}
                  className={`px-3 py-1 rounded-full text-xs transition-colors ${
                    selectedId === s.templateId
                      ? 'bg-primary text-white'
                      : 'bg-secondary text-muted-foreground hover:bg-primary/10'
                  }`}
                >
                  {s.templateId.replace('mojing-', '').replace('-v1', '')}
                </button>
              ))}
            </div>

            {selected && (
              <div className="space-y-4">
                {/* 核心指标 */}
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard label="总调用" value={selected.totalCalls} icon={TrendingUp} color="blue" />
                  <MetricCard label="反馈数" value={selected.totalFeedback} icon={BarChart3} color="violet" />
                  <MetricCard label="满意度" value={`${selected.avgSatisfaction}/5`} icon={CheckCircle2} color="emerald" />
                  <MetricCard label="采纳率" value={`${selected.adoptionRate}%`} icon={RefreshCw} color="amber" />
                </div>

                {/* 详细指标 */}
                <div className="text-xs text-muted-foreground space-y-1.5">
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span>直接保留率</span><span className="font-medium text-foreground">{selected.keepRate}%</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span>编辑率</span><span className="font-medium text-foreground">{selected.editRate}%</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span>重写率</span><span className="font-medium text-foreground">{selected.rewriteRate}%</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span>丢弃率</span><span className="font-medium text-foreground">{selected.discardRate}%</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span>重试率</span><span className="font-medium text-foreground">{selected.retryRate}%</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span>平均编辑次数</span><span className="font-medium text-foreground">{selected.avgEditCount}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MetricCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-500',
    violet: 'bg-violet-50 text-violet-500',
    emerald: 'bg-emerald-50 text-emerald-500',
    amber: 'bg-amber-50 text-amber-500',
  }
  return (
    <div className="bg-secondary rounded-lg p-3 flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg ${colors[color] || colors.blue} flex items-center justify-center`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  )
}
