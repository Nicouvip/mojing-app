'use client'
import { toast } from 'sonner'

import { useMemo, useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils/utils'
import { Button } from '@/components/ui/button'
import { SimpleLineChart, SimpleBarChart } from '@/components/charts'
import {
  chapterEndCheck,
  generateChapterSummary,
  type Genre,
  type ChapterCheckItem,
} from '@/lib/ai/compliance'
import { loadPrompts } from '@/lib/ai/deep-check-prompt'
import {
  type ChapterReportRecord,
  type CheckTier,
  type TieredItem,
  tierItems,
  groupByTier,
  saveChapterReport,
  getChapterReport,
  getAllChapterReports,
  saveAiResults,
  getAiResults,
} from '@/lib/ai/report-store'

/* ─── Props ─── */

interface Props {
  show: boolean
  onClose: () => void
  content: string
  onSave: () => void
  genre?: string
  chapterAUsed?: number
  projectId: string
  chapterId: string
  chapterTitle: string
  chapterOrder: number
}

/* ─── 分层配置 ─── */

const TIER_CONFIG: Record<CheckTier, {
  label: string; icon: string; color: string; bg: string; desc: string
}> = {
  precise:   { label: '精确检测', icon: '✓', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', desc: '基于规则引擎的精确计算，可信度高' },
  metric:    { label: '量化指标', icon: '■', color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200',    desc: '数值型统计指标，有参考价值' },
  heuristic: { label: '启发式建议', icon: '△', color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200',  desc: '基于简单模式的判断，可能误报' },
  ai_needed: { label: '需AI辅助', icon: '○', color: 'text-purple-600',  bg: 'bg-purple-50 border-purple-200', desc: '当前无法可靠自动化，建议AI分析或人工确认' },
}

const TIER_ORDER: CheckTier[] = ['precise', 'metric', 'heuristic', 'ai_needed']

/* ─── 主组件 ─── */

export function ReportModal({
  show, onClose, content, onSave,
  genre, chapterAUsed = 0,
  projectId, chapterId, chapterTitle, chapterOrder,
}: Props) {
  const [tab, setTab] = useState<'all' | 'precise' | 'metric' | 'heuristic' | 'ai_needed'>('all')
  const [view, setView] = useState<'report' | 'history'>('report')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [savedRecord, setSavedRecord] = useState<ChapterReportRecord | null>(null)
  const [history, setHistory] = useState<ChapterReportRecord[]>([])
  const [justSaved, setJustSaved] = useState(false)
// 计算当前报告
  const report = useMemo(
    () => chapterEndCheck(content, (genre || '通用') as Genre, chapterAUsed),
    [content, genre, chapterAUsed],
  )

  // 加载历史
  useEffect(() => {
    if (!show) return
    const existing = getChapterReport(projectId, chapterId)
    setSavedRecord(existing)
    setHistory(getAllChapterReports(projectId))
    setView(existing ? 'history' : 'report')
    setTab('all')
    setExpandedId(null)
  }, [show, projectId, chapterId])

  // 分层处理
  const tieredItems = useMemo(() => tierItems(report.items), [report.items])
  const grouped = useMemo(() => groupByTier(tieredItems), [tieredItems])

  // 计算各层级的通过状态
  const tierStatus = useMemo(() => {
    const result: Record<CheckTier, { pass: number; warning: number; fail: number; total: number }> = {
      precise: { pass: 0, warning: 0, fail: 0, total: 0 },
      metric: { pass: 0, warning: 0, fail: 0, total: 0 },
      heuristic: { pass: 0, warning: 0, fail: 0, total: 0 },
      ai_needed: { pass: 0, warning: 0, fail: 0, total: 0 },
    }
    for (const item of tieredItems) {
      const key = TIER_ORDER.find(t => t === (item as TieredItem).tier) || 'ai_needed'
      if (!result[key]) continue
      result[key].total++
      if (item.status === 'fail') result[key].fail++
      else if (item.status === 'warning') result[key].warning++
      else result[key].pass++
    }
    return result
  }, [tieredItems])

  const handleSaveReport = useCallback(() => {
    const record = saveChapterReport(
      projectId, chapterId, chapterTitle, chapterOrder, report,
    )
    setSavedRecord(record)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2000)
    onSave()
    onClose()
  }, [projectId, chapterId, chapterTitle, chapterOrder, report, onSave, onClose])

  const handleRecheck = useCallback(() => {
    const record = saveChapterReport(
      projectId, chapterId, chapterTitle, chapterOrder, report,
    )
    setSavedRecord(record)
    setHistory(getAllChapterReports(projectId))
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2000)
  }, [projectId, chapterId, chapterTitle, chapterOrder, report])

  if (!show) return null

  const { score, compliant, items, reportLine, wordCount, bodyDensity, bodyDensityStatus, openingHook } = report
  const failCount = items.filter(i => i.status === 'fail').length
  const warnCount = items.filter(i => i.status === 'warning').length

  const scoreColor = score >= 4 ? 'text-emerald-600' : score >= 3 ? 'text-amber-600' : 'text-destructive'
  const scoreBg = score >= 4 ? 'bg-emerald-500/10' : score >= 3 ? 'bg-amber-500/10' : 'bg-destructive/10'

  // 过滤显示项
  let displayItems = tieredItems
  if (tab !== 'all') displayItems = tieredItems.filter(i => (i as TieredItem).tier === tab)

  // 当前报告 vs 上次报告的变化
  const prevScore = savedRecord?.score
  const scoreDiff = prevScore !== undefined ? score - prevScore : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="章末自检报告" onClick={onClose}>
      <div
        className="bg-white rounded-[20px] shadow-modal max-w-2xl w-full mx-4 flex flex-col max-h-[90vh] modal-enter"
        onClick={e => e.stopPropagation()}
      >
        {/* ===== 头部 ===== */}
        <div className="flex items-start justify-between px-6 pt-6 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">章末自检报告</h3>
              {scoreDiff !== null && (
                <span className={cn(
                  'text-xs font-medium px-1.5 py-0.5 rounded',
                  scoreDiff > 0 ? 'bg-emerald-100 text-emerald-700' :
                  scoreDiff < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500',
                )}>
                  {scoreDiff > 0 ? `↑+${scoreDiff}` : scoreDiff < 0 ? `↓${scoreDiff}` : '—'}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {wordCount.toLocaleString()} 字 · 身体密度 {bodyDensity}%({bodyDensityStatus})
              · 55字线 {openingHook ? '✓' : '✗'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {savedRecord && (
              <span className="text-[10px] text-muted-foreground">
                上次检测: {new Date(savedRecord.updatedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl', scoreBg)}>
              <span className={cn('text-2xl font-bold', scoreColor)}>{score}</span>
              <span className="text-xs text-muted-foreground">/5</span>
            </div>
          </div>
        </div>

        {/* ===== 一句话总结 ===== */}
        <div className="mx-6 mb-3 px-4 py-3 rounded-xl bg-muted/30 border border-border/40">
          <p className="text-sm text-foreground leading-relaxed">{generateChapterSummary(report)}</p>
        </div>

        {/* ===== 极简报告行 + 历史切换 ===== */}
        <div className="mx-6 mb-2 flex items-center gap-2">
          <div className="flex-1 px-3 py-2 rounded-lg bg-muted/50 border border-border/50">
            <code className="text-[11px] text-muted-foreground font-mono leading-relaxed block">{reportLine}</code>
          </div>
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => setView('report')}
              className={cn('px-2.5 py-1.5 text-xs rounded-lg transition-colors', view === 'report' ? 'bg-primary text-white font-medium' : 'bg-secondary text-muted-foreground')}
            >检测</button>
            <button
              onClick={() => { setView('history'); setHistory(getAllChapterReports(projectId)) }}
              className={cn('px-2.5 py-1.5 text-xs rounded-lg transition-colors', view === 'history' ? 'bg-primary text-white font-medium' : 'bg-secondary text-muted-foreground')}
            >趋势</button>
          </div>
        </div>

        {/* ===== 统计摘要 ===== */}
        <div className="mx-6 mb-2 flex flex-wrap gap-1.5 text-xs">
          {failCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
              ✗ {failCount}项失败
            </span>
          )}
          {warnCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-medium">
              △ {warnCount}项警告
            </span>
          )}
          {TIER_ORDER.map(t => {
            const s = tierStatus[t]
            if (s.total === 0) return null
            const cfg = TIER_CONFIG[t]
            return (
              <span key={t} className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full border', cfg.bg, cfg.color)}>
                {cfg.icon} {cfg.label} {s.pass}/{s.total}
              </span>
            )
          })}
        </div>

        {/* ===== 视图：检测 / 趋势 ===== */}
        {view === 'history' ? (
          /* ── 趋势视图 ── */
          <div className="flex-1 overflow-y-auto px-6 pb-2 min-h-0">
            <div className="space-y-2">
              {history.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">暂无历史检测数据</p>
              )}
              {history.length > 0 && (
                <>
                  {/* 简版趋势图 — 分数折线 */}
                  <div className="bg-card rounded-xl border border-border p-4">
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2">各章评分趋势</h4>
                    <SimpleLineChart
                      data={history.map(r => ({ label: r.chapterTitle, value: r.score, max: 5 }))}
                      color="#10b981"
                    />
                  </div>
                  {/* 字数分布 */}
                  <div className="bg-card rounded-xl border border-border p-4">
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2">各章字数</h4>
                    <SimpleBarChart
                      data={history.map(r => ({ label: r.chapterTitle, value: r.wordCount }))}
                      color="#6366f1"
                    />
                  </div>
                  {/* 身体密度 */}
                  <div className="bg-card rounded-xl border border-border p-4">
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2">身体密度走势（目标40-55%）</h4>
                    <SimpleLineChart
                      data={history.map(r => ({ label: r.chapterTitle, value: r.bodyDensity, max: 100 }))}
                      color="var(--color-primary)"
                    />
                  </div>
                  {/* 违规统计 */}
                  <div className="bg-card rounded-xl border border-border p-4">
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2">违规统计</h4>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      {(['A类', 'B类', 'C类', 'D类'] as const).map((label, i) => {
                        const key = ['forbiddenA', 'forbiddenB', 'forbiddenC', 'forbiddenD'][i] as keyof ChapterReportRecord
                        const total = history.reduce((sum, r) => sum + (typeof r[key] === 'number' ? r[key] as number : 0), 0)
                        const max = Math.max(...history.map(r => typeof r[key] === 'number' ? r[key] as number : 0))
                        return (
                          <div key={label} className="bg-muted/50 rounded-lg p-2 text-center">
                            <div className="font-semibold text-muted-foreground">{label}</div>
                            <div className="text-lg font-bold mt-0.5">{total}</div>
                            <div className="text-[10px] text-muted-foreground">共{total}次 / 单章最高{max}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          /* ── 检测视图 ── */
          <>
            {/* 分层切换标签 */}
            <div className="mx-6 mb-2 flex gap-1 flex-wrap">
              {[
                { id: 'all', label: `全部(${tieredItems.length})` },
                ...TIER_ORDER.filter(t => grouped[t].length > 0).map(t => ({
                  id: t,
                  label: `${TIER_CONFIG[t].icon} ${TIER_CONFIG[t].label}(${grouped[t].length})`,
                })),
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id as typeof tab)}
                  className={cn(
                    'px-2.5 py-1 text-xs rounded-lg transition-colors flex items-center gap-1',
                    tab === t.id
                      ? 'bg-primary text-white font-medium'
                      : 'bg-secondary text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* 检查项列表 */}
            <div className="flex-1 overflow-y-auto px-6 pb-2 min-h-0">
              <div className="space-y-1.5">
                {displayItems.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">暂无此项</p>
                )}
                {tab === 'ai_needed' && displayItems.length > 0 && (
                  <AiOverviewBar content={content} projectId={projectId} chapterId={chapterId} onRefresh={() => setExpandedId(-1)} />
                )}
                {displayItems.map((item: TieredItem) => {
                  const tier = item.tier as CheckTier
                  const cfg = TIER_CONFIG[tier]
                  const isExpanded = expandedId === item.id
                  return (
                    <div
                      key={item.id}
                      className={cn('rounded-xl border transition-all duration-150 overflow-hidden', cfg.bg)}
                    >
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left"
                      >
                        {/* 分层标记 */}
                        <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0', cfg.color, 'bg-white/60')}>
                          {cfg.label}
                        </span>
                        {/* 状态点 */}
                        <span className={cn(
                          'w-1.5 h-1.5 rounded-full shrink-0',
                          item.status === 'fail' ? 'bg-destructive' :
                          item.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500',
                        )} />
                        {/* 名称 */}
                        <span className={cn(
                          'text-sm flex-1 min-w-0 truncate',
                          item.status === 'fail' ? 'font-medium text-foreground' : 'text-muted-foreground',
                        )}>
                          {item.name}
                        </span>
                        {/* 值 */}
                        {item.value !== undefined && (
                          <span className={cn('text-xs font-mono tabular-nums shrink-0', cfg.color)}>
                            {typeof item.value === 'number' ? item.value : String(item.value)}
                          </span>
                        )}
                        {/* 展开箭头 */}
                        <svg className={cn('w-3 h-3 shrink-0 text-muted-foreground transition-transform duration-200', isExpanded && 'rotate-180')} viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 1L5 5L9 1" />
                        </svg>
                      </button>
                      {/* 展开详情 */}
                      <div className={cn('overflow-hidden transition-all duration-200', isExpanded ? 'max-h-40' : 'max-h-0')}>
                        <div className="px-3 pb-3 pt-0 space-y-1">
                          <p className="text-[11px] font-medium text-foreground/80">{item.userTitle}</p>
                          <p className={cn('text-xs leading-relaxed', cfg.color)}>{item.userAdvice}</p>
                          {tier === 'ai_needed' && <AiCheckSection itemId={item.id} content={content} projectId={projectId} chapterId={chapterId} />}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* ===== 底部操作 ===== */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border/50">
          <div className="flex items-center gap-1.5 text-xs">
            <span className={cn('inline-block w-2 h-2 rounded-full', compliant ? 'bg-emerald-500' : 'bg-destructive')} />
            <span className={compliant ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}>
              {compliant ? '合规通过' : `存在${failCount}项需修改`}
            </span>
            {justSaved && <span className="text-emerald-500 text-[10px]">✓已保存报告</span>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>返回修改</Button>
            <Button variant="outline" size="sm" onClick={handleRecheck}>重新检测</Button>
            {!compliant && (
              <Button variant="outline" size="sm" onClick={handleSaveReport}>强制通过</Button>
            )}
            <Button size="sm" onClick={handleSaveReport}>
              {compliant ? '通过并保存报告' : '强制保存'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── AI 总览栏 ─── */

function AiOverviewBar({ content, projectId, chapterId, onRefresh }: { content: string; projectId: string; chapterId: string; onRefresh?: () => void }) {
  const [loading, setLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [done, setDone] = useState(false)
  const [summary, setSummary] = useState<{ pass: number; warn: number; fail: number } | null>(null)

  useEffect(() => {
    if (!loading) { setElapsed(0); return }
    const id = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [loading])

  // 读取已缓存的 AI 结果
  const cached = useMemo(() => {
    try { return getAiResults(projectId, chapterId) } catch { return null }
  }, [projectId, chapterId])

  const analyzedCount = cached ? Object.keys(cached).length : 0
  const cachedPass = cached ? Object.values(cached).filter(r => r.status === 'pass').length : 0
  const cachedWarn = cached ? Object.values(cached).filter(r => r.status === 'warning').length : 0
  const cachedFail = cached ? Object.values(cached).filter(r => r.status === 'fail').length : 0

  const totalItems = loadPrompts().length

  const handleBatch = async () => {
    setLoading(true); setDone(false)
    try {
      const res = await fetch('/api/ai/deep-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content, batch: true, prompts: loadPrompts() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '分析失败')
      if (data.results) {
        const mapped: Record<number, { status: string; reason: string; detail: string }> = {}
        for (const r of data.results) {
          mapped[r.checkId] = { status: r.status, reason: r.reason || '', detail: r.detail || '' }
        }
        saveAiResults(projectId, chapterId, mapped)
        const pass = Object.values(mapped).filter(r => r.status === 'pass').length
        const warning = Object.values(mapped).filter(r => r.status === 'warning').length
        const fail = Object.values(mapped).filter(r => r.status === 'fail').length
        setSummary({ pass, warn: warning, fail })
      }
      setDone(true); onRefresh?.()
    } catch (e) {
      toast.error('AI 批量分析失败: ' + (e instanceof Error ? e.message : '请求失败'))
    } finally {
      setLoading(false)
    }
  }

  const displaySummary = summary || (cached ? { pass: cachedPass, warn: cachedWarn, fail: cachedFail } : null)

  return (
    <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3 space-y-2">
      {/* 状态概览 */}
      {displaySummary && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-muted-foreground">
            📊 AI 已分析 <b className="text-purple-700">{analyzedCount}/{totalItems}</b> 项
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-medium">
            🟢 {displaySummary.pass}
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-medium">
            🟡 {displaySummary.warn}
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-medium">
            🔴 {displaySummary.fail}
          </span>
          {done && <span className="text-[10px] text-emerald-600 font-medium">✓ 分析完成</span>}
        </div>
      )}

      {/* 进度条 */}
      {loading && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-purple-600">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full border-2 border-purple-300 border-t-purple-600 animate-spin" />
              AI 分析中...
            </span>
            <span>{elapsed}秒</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-purple-200 overflow-hidden">
            <div className="h-full rounded-full bg-purple-400 animate-progress-indeterminate" style={{ width: '40%' }} />
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      {!done && !loading && (
        <button
          onClick={handleBatch}
          className="w-full px-4 py-2 rounded-lg bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
        >
          🤖 全部 AI 分析（{totalItems}项）
        </button>
      )}

      {done && (
        <button
          onClick={handleBatch}
          className="w-full px-4 py-1.5 rounded-lg border border-purple-200 bg-white text-purple-600 text-xs font-medium hover:bg-purple-50 transition-colors flex items-center justify-center gap-1"
        >
          🔄 重新分析
        </button>
      )}
    </div>
  )
}

/* ─── AI 深度分析子组件 ─── */

function AiCheckSection({ itemId, content, projectId, chapterId }: { itemId: number; content: string; projectId: string; chapterId: string }) {
  const prompts = useMemo(() => loadPrompts(), [])
  const [state, setState] = useState<{
    status: 'idle' | 'loading' | 'done' | 'error'
    result?: { status: string; reason: string; detail: string }
    error?: string
  }>({ status: 'idle' })

  const promptInfo = useMemo(() => prompts.find(p => p.id === itemId), [itemId, prompts])

  const handleCheck = async () => {
    setState({ status: 'loading' })
    try {
      const res = await fetch('/api/ai/deep-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content, checkId: itemId, prompts: loadPrompts() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '分析失败')
      setState({ status: 'done', result: { status: data.status, reason: data.reason, detail: data.detail } })
      // 持久化单项结果
      try {
        const existing = getAiResults(projectId, chapterId) || {}
        existing[itemId] = { status: data.status, reason: data.reason || '', detail: data.detail || '' }
        saveAiResults(projectId, chapterId, existing)
      } catch {}
    } catch (e) {
      setState({ status: 'error', error: e instanceof Error ? e.message : '请求失败' })
    }
  }

  if (state.status === 'loading') {
    return (
      <div className="mt-1.5 p-2.5 rounded-lg bg-purple-50 border border-purple-200">
        <div className="flex items-center gap-2 text-[10px] text-purple-600">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-purple-300 border-t-purple-600 animate-spin" />
          <span className="font-medium">AI 正在分析「{promptInfo?.name || '此项'}」...</span>
        </div>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="mt-1.5 p-2.5 rounded-lg bg-red-50 border border-red-200">
        <p className="text-[10px] text-red-600 leading-relaxed">
          ❌ 分析失败：{state.error}
        </p>
        <button
          onClick={handleCheck}
          className="mt-1 text-[10px] text-red-600 hover:text-red-700 font-medium underline underline-offset-2"
        >
          点击重试
        </button>
      </div>
    )
  }

  if (state.status === 'done' && state.result) {
    const r = state.result
    const colors = r.status === 'pass'
      ? { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', icon: '✅', label: '通过' }
      : r.status === 'warning'
        ? { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500', icon: '⚠️', label: '建议关注' }
        : { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500', icon: '❌', label: '需修改' }

    return (
      <div className={`mt-1.5 p-3 rounded-lg border ${colors.bg} ${colors.border} space-y-1.5 animate-in`}>
        <div className="flex items-center gap-1.5">
          <span>{colors.icon}</span>
          <span className={`text-[11px] font-semibold ${colors.text}`}>{colors.label}</span>
          <span className="text-[10px] text-muted-foreground">— {promptInfo?.name || `检测项 #${itemId}`}</span>
        </div>
        <p className="text-[11px] leading-relaxed text-foreground/80">{r.detail || r.reason}</p>
      </div>
    )
  }

  return (
    <button
      onClick={handleCheck}
      className="mt-1.5 w-full px-3 py-1.5 rounded-lg border border-dashed border-purple-300 bg-purple-50/50 text-purple-600 hover:bg-purple-100 hover:border-purple-400 transition-all text-[10px] font-medium flex items-center justify-center gap-1"
    >
      🤖 AI 分析「{promptInfo?.name || `检测项 #${itemId}`}」→
    </button>
  )
}

