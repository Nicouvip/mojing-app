'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { registry, feedbackCollector } from '@/lib/prompts'
import { loadCallCounts } from '@/lib/prompts/store'
import { BarChart3, PhoneCall, CalendarDays, Layers, TrendingUp } from 'lucide-react'

export function UsageTab() {
  const [totalCalls, setTotalCalls] = useState(0)
  const [dailyAvg, setDailyAvg] = useState(0)
  const [breakdown, setBreakdown] = useState<{ id: string; name: string; calls: number; pct: string }[]>([])
  const [daysSpan, setDaysSpan] = useState(1)

  useEffect(() => {
    const counts = loadCallCounts()
    const templates = registry.listActive()
    const allFeedbacks = feedbackCollector.getAll()

    // 按 templateId@version 汇总
    const map = new Map<string, number>()
    let total = 0
    counts.forEach((v, k) => {
      map.set(k, v)
      total += v
    })

    // 计算时间跨度（最早反馈至今）
    let firstTs = Date.now()
    for (const fb of allFeedbacks) {
      if (fb.createdAt < firstTs) firstTs = fb.createdAt
    }
    const days = Math.max(1, Math.ceil((Date.now() - firstTs) / 86400000))

    // 按模板细分
    const templateMap = new Map(templates.map(t => [t.id, t]))
    const items: { id: string; name: string; calls: number; pct: string }[] = []
    const seen = new Set<string>()

    counts.forEach((count, key) => {
      const [id] = key.split('@')
      if (seen.has(id)) return
      seen.add(id)
      const tmpl = templateMap.get(id)
      // 汇总同一模板所有版本
      let versionTotal = 0
      counts.forEach((v, k) => {
        if (k.startsWith(id + '@')) versionTotal += v
      })
      items.push({
        id,
        name: tmpl?.name || id,
        calls: versionTotal,
        pct: total > 0 ? ((versionTotal / total) * 100).toFixed(1) : '0.0',
      })
    })

    items.sort((a, b) => b.calls - a.calls)

    setTotalCalls(total)
    setDailyAvg(Math.round((total / days) * 10) / 10)
    setDaysSpan(days)
    setBreakdown(items)
  }, [])

  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-muted-foreground" />
          调用统计
        </h2>

        {totalCalls === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">暂无调用记录</p>
        ) : (
          <div className="space-y-5">
            {/* 核心指标 */}
            <div className="grid grid-cols-3 gap-3">
              <MetricCard label="总调用" value={totalCalls.toLocaleString()} icon={PhoneCall} color="blue" />
              <MetricCard label={`日均 (${daysSpan}天)`} value={dailyAvg.toLocaleString()} icon={CalendarDays} color="emerald" />
              <MetricCard label="模板数" value={breakdown.length} icon={Layers} color="violet" />
            </div>

            {/* 按模板细分 */}
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                按模板细分
              </h3>
              <div className="space-y-1.5">
                {breakdown.map(item => (
                  <div key={item.id} className="flex items-center gap-3 text-xs">
                    <span className="w-24 truncate text-foreground font-medium shrink-0" title={item.name}>
                      {item.name}
                    </span>
                    <div className="flex-1 h-5 bg-secondary rounded-full overflow-hidden relative">
                      <div
                        className="h-full bg-primary/20 rounded-full transition-all"
                        style={{ width: `${Math.max(2, parseFloat(item.pct))}%` }}
                      />
                      <span className="absolute inset-0 flex items-center px-2 text-[10px] text-muted-foreground">
                        {item.calls.toLocaleString()} 次
                      </span>
                    </div>
                    <span className="text-muted-foreground w-10 text-right shrink-0">{item.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MetricCard({ label, value, icon: Icon, color }: {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  color: string
}) {
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
