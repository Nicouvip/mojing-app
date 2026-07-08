'use client'

import { useState, useEffect } from 'react'
import { getProjects, getChapters } from '@/lib/db/store'
import { checkCompliance, check55Rule, calcBodyDensity } from '@/lib/ai/compliance'
import type { Project, Chapter } from '@/lib/db/types'
import type { ComplianceResult } from '@/lib/ai/compliance'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils/utils'

interface ChapterReport {
  chapter: Chapter
  projectName: string
  compliance: ComplianceResult
  density: number
  fiveFive: ReturnType<typeof check55Rule>
  checked: boolean
}

export default function WorkshopPage() {
  const [reports, setReports] = useState<ChapterReport[]>([])
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    const projects = getProjects()
    const all: ChapterReport[] = []
    projects.forEach(proj => {
      const chs = getChapters(proj.id)
      chs.forEach(ch => {
        all.push({
          chapter: ch,
          projectName: proj.name,
          compliance: { forbiddenA: 0, forbiddenB: 0, forbiddenC: 0, forbiddenD: 0, refinedDensity: 0, blockedItems: [] },
          density: 0,
          fiveFive: { passed: false, checkedLength: 55, genre: '通用' as const, genreAdjusted: false, hitConditions: [], detail: '' },
          checked: false,
        })
      })
    })
    setReports(all)
  }, [])

  const runCheck = async (index: number) => {
    setReports(prev => prev.map((r, i) => {
      if (i !== index) return r
      return {
        ...r,
        compliance: checkCompliance(r.chapter.content || ''),
        density: calcBodyDensity(r.chapter.content || ''),
        fiveFive: check55Rule(r.chapter.content || ''),
        checked: true,
      }
    }))
  }

  const runAll = async () => {
    setLoading(true)
    setRunning(true)
    // 分批检测，避免 UI 卡顿
    const results = [...reports]
    for (let i = 0; i < results.length; i++) {
      const r = results[i]
      results[i] = {
        ...r,
        compliance: checkCompliance(r.chapter.content || ''),
        density: calcBodyDensity(r.chapter.content || ''),
        fiveFive: check55Rule(r.chapter.content || ''),
        checked: true,
      }
      if (i % 3 === 0) {
        setReports([...results])
        await new Promise(r => setTimeout(r, 0))
      }
    }
    setReports(results)
    setLoading(false)
    setRunning(false)
  }

  const checkedCount = reports.filter(r => r.checked).length
  const problemCount = reports.filter(r => r.checked && r.compliance.blockedItems.length > 0).length

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 px-6 flex items-center justify-between border-b border-border bg-card/80">
        <div className="flex items-center gap-4">
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground">← 返回</a>
          <h1 className="text-sm font-medium text-foreground">投稿质检中心</h1>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{reports.length} 章</span>
          <span>·</span>
          <span>已检测 {checkedCount} 章</span>
          {problemCount > 0 && <span className="text-amber-500">· ⚠️ {problemCount} 章有问题</span>}
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {reports.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">暂无章节可供检测</p>
            <a href="/" className="text-sm text-primary hover:underline mt-2 inline-block">← 返回首页创建作品</a>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                稿件质检 · 检测 A/B/C/D 类合规项 · 55 字生死线 · 身体密度
              </p>
              <button
                onClick={runAll}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={cn("w-4 h-4", running && "animate-spin")} />
                {loading ? '检测中...' : '一键全本检测'}
              </button>
            </div>

            <div className="space-y-3">
              {reports.map((report, i) => (
                <Card key={report.chapter.id} className={cn(
                  "transition-shadow hover:shadow-card",
                  report.checked && report.compliance.blockedItems.length > 0 && "border-amber-200"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-sm font-medium text-foreground">
                          {report.projectName} · {report.chapter.title}
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {report.chapter.wordCount?.toLocaleString() || 0} 字
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {report.checked ? (
                          report.compliance.blockedItems.length === 0 ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                          )
                        ) : (
                          <button
                            onClick={() => runCheck(i)}
                            className="text-xs px-3 py-1 rounded-full bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            检测
                          </button>
                        )}
                      </div>
                    </div>

                    {report.checked && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div className={cn(
                          "rounded-lg px-3 py-1.5",
                          report.fiveFive.passed ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                        )}>
                          55字线: {report.fiveFive.passed ? '✅' : '❌'}
                        </div>
                        <div className={cn(
                          "rounded-lg px-3 py-1.5",
                          report.density >= 40 && report.density <= 55 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                        )}>
                          身体密度: {report.density}%
                        </div>
                        <div className={cn(
                          "rounded-lg px-3 py-1.5",
                          report.compliance.forbiddenB === 0 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                        )}>
                          B类禁用: {report.compliance.forbiddenB}
                        </div>
                        <div className={cn(
                          "rounded-lg px-3 py-1.5",
                          report.compliance.blockedItems.length === 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                        )}>
                          阻断项: {report.compliance.blockedItems.length}
                        </div>
                      </div>
                    )}

                    {report.checked && report.compliance.blockedItems.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {report.compliance.blockedItems.slice(0, 5).map((item, j) => (
                          <div key={j} className="text-xs text-amber-600 bg-amber-50 rounded px-3 py-1">
                            {item.type === 'forbidden_b'
                              ? `B类禁用词: ${item.words?.join('、') || ''}`
                              : '动作句后紧跟解释语句'}
                          </div>
                        ))}
                        {report.compliance.blockedItems.length > 5 && (
                          <p className="text-xs text-muted-foreground pl-3">
                            ...还有 {report.compliance.blockedItems.length - 5} 项
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
