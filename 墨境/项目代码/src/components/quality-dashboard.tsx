'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils/utils'
import { SimpleLineChart, SimpleBarChart } from '@/components/charts'
import { loadGoals, getTodayWords, getStreak } from '@/lib/ai/goals-store'
import { getProjects } from '@/lib/db/store'
import {
  getProjectQualitySummary,
  type ChapterReportRecord,
} from '@/lib/ai/report-store'
import {
  BarChart3, TrendingUp,
  CheckCircle2, FileText, Activity,
} from 'lucide-react'

interface Props {
  projectId: string
  projectName: string
}

export function QualityDashboard({ projectId, projectName }: Props) {
  const summary = useMemo(() => getProjectQualitySummary(projectId), [projectId])
  const goals = loadGoals()
  const todayWords = getTodayWords()
  const streak = getStreak()
  const goalPct = goals.enabled && goals.dailyWordTarget > 0 ? Math.min(100, Math.round(todayWords / goals.dailyWordTarget * 100)) : 0

  const allProjects = useMemo(() => {
    return getProjects().filter(p => p.id !== projectId).map(p => ({
      ...p,
      quality: getProjectQualitySummary(p.id),
    })).filter(p => p.quality)
  }, [projectId])

  const [selectedChapter, setSelectedChapter] = useState<string | null>(null)

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BarChart3 className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold mb-2">暂无质量数据</h2>
        <p className="text-sm text-muted-foreground mb-6">
          完成章节写作后点击「章末自检」生成质量报告，这里将展示跨章质量趋势
        </p>
        <Link
          href={`/editor/${projectId}`}
          className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          前往编辑器
        </Link>
      </div>
    )
  }

  const { reports, avgScore, complianceRate, totalWords, avgWordCount, compliantCount } = summary
  const scoreData = reports.map(r => ({ label: r.chapterTitle, value: r.score, max: 5 }))
  const densityData = reports.map(r => ({ label: r.chapterTitle, value: r.bodyDensity, max: 100 }))
  const wordCountData = reports.map(r => ({ label: r.chapterTitle, value: Math.round(r.wordCount / 100) }))
  const selected = selectedChapter ? reports.find(r => r.chapterId === selectedChapter) : null
  const dashboardSummary = generateProjectSummary(summary)

  return (
    <div className="space-y-8">
      {/* ===== 一句话总评 ===== */}
      <p className="text-sm text-muted-foreground leading-relaxed px-0.5 max-w-2xl">
        {dashboardSummary}
      </p>

      {/* ===== 今日进度 ===== */}
      {goals.enabled && goalPct > 0 && (
        <div className="bg-card rounded-2xl p-4 border border-border/50 shadow-sm flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>今日写作进度</span>
              <span>{todayWords.toLocaleString()} / {goals.dailyWordTarget.toLocaleString()} 字</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{width: goalPct + '%'}} />
            </div>
          </div>
          {streak > 0 && <div className="text-right shrink-0"><div className="text-lg font-bold text-warning">🔥 {streak}</div><div className="text-[10px] text-muted-foreground">连续写作</div></div>}
        </div>
      )}

      {/* ===== 概览卡片 ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="平均评分"
          value={`${avgScore}/5`}
          color={avgScore >= 4 ? 'text-success' : avgScore >= 3 ? 'text-warning' : 'text-destructive'}
        />
        <SummaryCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="合规率"
          value={`${complianceRate}%`}
          sub={`${compliantCount}/${reports.length}章`}
          color={complianceRate >= 80 ? 'text-success' : complianceRate >= 50 ? 'text-warning' : 'text-destructive'}
        />
        <SummaryCard
          icon={<FileText className="w-5 h-5" />}
          label="总字数"
          value={`${(totalWords / 10000).toFixed(1)}万`}
          sub={`平均${(avgWordCount / 1000).toFixed(1)}千/章`}
          color="text-primary"
        />
        <SummaryCard
          icon={<BarChart3 className="w-5 h-5" />}
          label="已检测章节"
          value={`${reports.length}`}
          color="text-primary"
        />
      </div>

      {/* ===== 图表网格 ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 评分趋势 */}
        <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-sm">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            评分趋势
          </h3>
          <SimpleLineChart data={scoreData} color="var(--color-success)" />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>最低 {Math.min(...reports.map(r => r.score))}</span>
            <span>最高 {Math.max(...reports.map(r => r.score))}</span>
          </div>
        </div>

        {/* 身体密度趋势 */}
        <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-sm">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-500" />
            身体密度趋势
          </h3>
          <div className="relative">
            <SimpleLineChart data={densityData} color="var(--color-warning)" />
            <div className="absolute inset-x-0 top-[28%] h-[34%] border-y border-dashed border-success/40 pointer-events-none" />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>目标区 40-55%</span>
            <span>均值 {Math.round(reports.reduce((a, b) => a + b.bodyDensity, 0) / reports.length)}%</span>
          </div>
        </div>

        {/* 字数分布 */}
        <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-sm">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            字数分布（百字）
          </h3>
          <SimpleBarChart data={wordCountData} color="var(--color-primary)" />
        </div>
      </div>

      {/* ===== 多作品对比 ===== */}
      {allProjects.length > 0 && (
        <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">其他作品对比</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {allProjects.map(p => (
              <Link key={p.id} href={'/quality-check/' + p.id}
                className="rounded-xl border border-border/50 p-3 hover:bg-muted/50 transition-colors block">
                <div className="font-medium text-sm truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{p.genre}</div>
                <div className="flex gap-3 mt-2 text-xs">
                  <span>⭐ {p.quality!.avgScore}</span>
                  <span>{p.quality!.checkedChapters}章</span>
                  <span className={p.quality!.complianceRate >= 80 ? 'text-success' : 'text-warning'}>合规 {p.quality!.complianceRate}%</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ===== 各章一览 ===== */}
      <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-sm">
        <h3 className="text-sm font-semibold mb-4">各章评分一览</h3>
        <div className="space-y-0.5">
          {reports.map(r => (
            <div
              key={r.chapterId}
              onClick={() => setSelectedChapter(r.chapterId === selectedChapter ? null : r.chapterId)}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors border-b border-border/30 last:border-0"
            >
              <span className="text-sm font-medium w-24 truncate">{r.chapterTitle}</span>
              <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${(r.score / 5) * 100}%`,
                    background: r.score >= 4 ? 'var(--color-success)' : r.score >= 3 ? 'var(--color-warning)' : 'var(--color-destructive)',
                  }}
                />
              </div>
              <span className={`text-xs font-bold w-8 text-right ${r.score >= 4 ? 'text-success' : r.score >= 3 ? 'text-warning' : 'text-destructive'}`}>
                {r.score}
              </span>
              <span className="text-xs w-6 text-center">
                {r.compliant ? <span className="text-emerald-500">✓</span> : <span className="text-destructive">⚠</span>}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ===== 选中章节详情 ===== */}
      {selected && (
        <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">{selected.chapterTitle} — 检查详情</h3>
            <button onClick={() => setSelectedChapter(null)} className="text-xs text-muted-foreground hover:text-foreground">关闭</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <MiniStat label="评分" value={`${selected.score}/5`} color={getScoreColor(selected.score)} />
            <MiniStat label="身体密度" value={`${selected.bodyDensity}%`} sub={selected.bodyDensityStatus} />
            <MiniStat label="字数" value={selected.wordCount.toLocaleString()} />
            <MiniStat label="55字线" value={selected.openingHook ? '通过' : '未通过'} color={selected.openingHook ? 'text-success' : 'text-destructive'} />
          </div>
          <div className="text-xs text-muted-foreground font-mono bg-muted/50 rounded-lg px-3 py-2">
            {selected.reportLine}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── 子组件 ─── */

function SummaryCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color: string
}) {
  return (
    <div className="rounded-2xl p-4 border border-border/50 shadow-sm bg-card">
      <div className={cn('flex items-center gap-2 mb-2', color)}>
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className={cn('text-2xl font-bold', color)}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  )
}

function MiniStat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-muted/30 rounded-xl px-3 py-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={cn('text-sm font-semibold', color || 'text-foreground')}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  )
}

function getScoreColor(score: number): string {
  return score >= 4 ? 'text-success' : score >= 3 ? 'text-warning' : 'text-destructive'
}

function generateProjectSummary(summary: NonNullable<ReturnType<typeof getProjectQualitySummary>>): string {
  const parts: string[] = []
  if (summary.avgScore >= 4) parts.push('整体质量稳定，')
  else if (summary.avgScore >= 3) parts.push('整体质量中等，有几章需要关注，')
  else parts.push('整体质量偏低，建议逐章检查，')

  if (summary.complianceRate >= 80) parts.push(`合规率 ${summary.complianceRate}% 表现不错。`)
  else if (summary.complianceRate >= 50) parts.push(`合规率 ${summary.complianceRate}%，仍有提升空间。`)
  else parts.push(`合规率仅 ${summary.complianceRate}%，需要重点关注。`)

  return parts.join('')
}

/* ─── 简易折线图 ─── */
