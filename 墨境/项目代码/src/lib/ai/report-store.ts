// ============================================================
// 墨境报告持久化层
// 功能：章末自检报告的保存/读取/跨章聚合
// 存储：localStorage（接口设计兼容未来 Supabase 迁移）
// ============================================================

import type { ChapterCheckReport, ChapterCheckItem } from './compliance'

/* ─── 存储记录类型 ─── */

export interface ChapterReportRecord {
  /** 主键 UUID */
  id: string
  projectId: string
  chapterId: string
  chapterTitle: string
  chapterOrder: number
  /** 综合评分 1-5 */
  score: number
  /** 是否合规 */
  compliant: boolean
  wordCount: number
  bodyDensity: number
  bodyDensityStatus: string
  /** 55字生死线 */
  openingHook: boolean
  forbiddenA: number
  forbiddenB: number
  forbiddenC: number
  forbiddenD: number
  /** 各检查项结果快照 */
  items: ChapterCheckItem[]
  /** 极简自检报告行 */
  reportLine: string
  /** AI 深度分析结果缓存 */
  aiResults: Record<number, { status: string; reason: string; detail: string }> | null
  /** 创建时间戳 */
  createdAt: number
  /** 最后更新时间戳 */
  updatedAt: number
}

/* ─── 检查项可信度分层 ─── */

export type CheckTier = 'precise' | 'metric' | 'heuristic' | 'ai_needed'

export interface TieredItem extends ChapterCheckItem {
  tier: CheckTier
  tierLabel: string
  tierDesc: string
  userTitle: string
  userAdvice: string
}

/**
 * 23项检查的可信度分层定义
 * precise   = 规则精确可自动化，结果可信
 * metric    = 数值型指标，有参考价值
 * heuristic = 启发式判断，可能误报
 * ai_needed = 当前无法可靠自动化，需 AI 辅助或人工确认
 */
export const ITEM_TIER_MAP: Record<number, { tier: CheckTier; label: string; desc: string; userTitle: string; userAdvice: string }> = {
  1:  { tier: 'metric',    label: '量化指标',  desc: '基于主语切换次数的统计', userTitle: '这一段写了太多件事', userAdvice: '主语频繁切换，读者不知道该跟谁。一段只聚焦一个人物的行动。' },
  2:  { tier: 'precise',   label: '精确检测',  desc: '基于身体动作词库的精确计算', userTitle: '情绪是"说"出来的，不是"演"出来的', userAdvice: '"他感到害怕"不如"他手心全是汗"。用身体动作代替心理描写。' },
  3:  { tier: 'precise',   label: '精确检测',  desc: '基于违规词库的多层检测', userTitle: '有些词反复出现', userAdvice: '同一段里某些词多次出现，读起来像卡带。换个说法或者删掉多余的。' },
  4:  { tier: 'precise',   label: '精确检测',  desc: '基于A类正则模式匹配', userTitle: '连续用了太多递进判断句', userAdvice: '全章递进判断句不超过1次，建议删掉多余的。' },
  5:  { tier: 'heuristic', label: '启发式建议', desc: '基于"像…"句式的简单统计', userTitle: '有重复的意象', userAdvice: '同一个比喻用了太多次，换个更有新意的表达。' },
  6:  { tier: 'metric',    label: '量化指标',  desc: '引号内文字占比计算', userTitle: '对话占比偏低', userAdvice: '加上一段两人对话可以调节叙事节奏。' },
  7:  { tier: 'metric',    label: '量化指标',  desc: '基于解释性关键词统计', userTitle: '解释性语句偏多', userAdvice: '"因为""所以""这意味着"太多会削弱画面感，试着直接呈现场景。' },
  8:  { tier: 'ai_needed', label: '需AI辅助',  desc: '语义分析才能准确判断', userTitle: '旁白·台词·动作比例', userAdvice: '需要人工判断，建议整体读一遍感受节奏。' },
  9:  { tier: 'ai_needed', label: '需AI辅助',  desc: '需理解情节动机归属', userTitle: '情节由角色性格驱动', userAdvice: '需要人工判断——情节推进是角色自己的选择，还是作者安排？' },
  10: { tier: 'precise',   label: '精确检测',  desc: '基于AI模式词库匹配', userTitle: '检测到 AI 常用叙事套路', userAdvice: '"画面一转""与此同时"这类词会提醒读者这是虚构故事，建议删掉。' },
  11: { tier: 'metric',    label: '量化指标',  desc: '句中"的"字密度统计', userTitle: '形容词用太多了', userAdvice: '一句里出现3个以上"的"字会让句子变重，试着删掉一些修饰词。' },
  12: { tier: 'ai_needed', label: '需AI辅助',  desc: '需理解句式是否适合朗读', userTitle: '大白话测试', userAdvice: '读出声试试——太书面化的句子会打断阅读节奏。' },
  13: { tier: 'ai_needed', label: '需AI辅助',  desc: '需理解叙述语感', userTitle: '口语化程度', userAdvice: '叙事者距离故事太远还是太近？需要人工感受。' },
  14: { tier: 'ai_needed', label: '需AI辅助',  desc: '需分析事件时序逻辑', userTitle: '因果顺序', userAdvice: '读者应该先看到动作，再知道原因——先果后因更有冲击力。' },
  15: { tier: 'heuristic', label: '启发式建议', desc: '基于标点和动词密度的段落级分析', userTitle: '连续紧张段落需要"透气"', userAdvice: '连续多段高强度的动作/对话，读者会疲劳。中间插入一段环境描写或轻松互动。' },
  16: { tier: 'ai_needed', label: '需AI辅助',  desc: '需理解叙述视角归属', userTitle: '视角是否一致', userAdvice: '当前视角角色不可能知道别人在想什么？需要人工核验。' },
  17: { tier: 'ai_needed', label: '需AI辅助',  desc: '需跨段落比对角色行为一致性', userTitle: '角色行为是否一致', userAdvice: '角色在前文和后文的行为逻辑是否连贯？需要人工核验。' },
  18: { tier: 'ai_needed', label: '需AI辅助',  desc: '需理解时间线前后逻辑', userTitle: '时间线是否连贯', userAdvice: '注意时间标记和事件先后顺序是否一致。' },
  19: { tier: 'ai_needed', label: '需AI辅助',  desc: '需综合评估段落节奏', userTitle: '节奏是否均衡', userAdvice: '整章读下来的节奏感是否舒服？快慢段落穿插如何？' },
  20: { tier: 'ai_needed', label: '需AI辅助',  desc: '需判断心理描写是否贴合情境', userTitle: '心理描写是否自然', userAdvice: '角色的心理反应是否符合当时的情景和性格？' },
  21: { tier: 'ai_needed', label: '需AI辅助',  desc: '需分析句长分布多样性', userTitle: '句式是否多样', userAdvice: '连续太短或太长的句子会让节奏单调。长短句交替更耐读。' },
  22: { tier: 'ai_needed', label: '需AI辅助',  desc: '需分析叙事速度变化', userTitle: '叙事速度', userAdvice: '重要场景放慢细节，过渡段落加快节奏——变速是否合理？' },
  23: { tier: 'precise',   label: '精确检测',  desc: '基于动作词+解释词上下文检测', userTitle: '动作后跟了解释', userAdvice: '做了就做了，不需要解释原因。删掉"因为""所以"保留纯粹的动作。' },
}

/** 给检查项打上分层标记 */
export function tierItems(items: ChapterCheckItem[]): TieredItem[] {
  return items.map(item => {
    const meta = ITEM_TIER_MAP[item.id] ?? { tier: 'ai_needed' as CheckTier, label: '需AI辅助', desc: '' }
    return { ...item, tier: meta.tier, tierLabel: meta.label, tierDesc: meta.desc, userTitle: meta.userTitle, userAdvice: meta.userAdvice }
  })
}

/** 按分层分组 */
export function groupByTier(items: TieredItem[]) {
  return {
    precise:    items.filter(i => i.tier === 'precise'),
    metric:     items.filter(i => i.tier === 'metric'),
    heuristic:  items.filter(i => i.tier === 'heuristic'),
    ai_needed:  items.filter(i => i.tier === 'ai_needed'),
  }
}

/* ─── 存储键名 ─── */

const STORAGE_PREFIX = 'mojing_report_'
const INDEX_KEY = STORAGE_PREFIX + 'index'

interface ReportIndex {
  [projectId: string]: string[]   // chapterId[]
}

function getIndex(): ReportIndex {
  try {
    const raw = localStorage.getItem(INDEX_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveIndex(idx: ReportIndex) {
  try { localStorage.setItem(INDEX_KEY, JSON.stringify(idx)) } catch {}
}

function recordKey(projectId: string, chapterId: string): string {
  return `${STORAGE_PREFIX}${projectId}_${chapterId}`
}

/* ─── CRUD ─── */

export function saveChapterReport(
  projectId: string,
  chapterId: string,
  chapterTitle: string,
  chapterOrder: number,
  report: ChapterCheckReport,
): ChapterReportRecord {
  const now = Date.now()
  const record: ChapterReportRecord = {
    id: `${projectId}_${chapterId}_${now}`,
    projectId,
    chapterId,
    chapterTitle,
    chapterOrder,
    score: report.score,
    compliant: report.compliant,
    wordCount: report.wordCount,
    bodyDensity: report.bodyDensity,
    bodyDensityStatus: report.bodyDensityStatus,
    openingHook: report.openingHook,
    forbiddenA: report.forbiddenA,
    forbiddenB: report.forbiddenB,
    forbiddenC: report.forbiddenC,
    forbiddenD: report.forbiddenD,
    items: report.items,
    reportLine: report.reportLine,
    aiResults: null,
    createdAt: now,
    updatedAt: now,
  }

  try {
    localStorage.setItem(recordKey(projectId, chapterId), JSON.stringify(record))
    // 更新索引
    const idx = getIndex()
    if (!idx[projectId]) idx[projectId] = []
    if (!idx[projectId].includes(chapterId)) idx[projectId].push(chapterId)
    saveIndex(idx)
  } catch (e) {
    console.warn('[report-store] 保存报告失败:', e)
  }

  return record
}

export function getChapterReport(projectId: string, chapterId: string): ChapterReportRecord | null {
  try {
    const raw = localStorage.getItem(recordKey(projectId, chapterId))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function deleteChapterReport(projectId: string, chapterId: string) {
  try {
    localStorage.removeItem(recordKey(projectId, chapterId))
    const idx = getIndex()
    if (idx[projectId]) {
      idx[projectId] = idx[projectId].filter(id => id !== chapterId)
      if (idx[projectId].length === 0) delete idx[projectId]
      saveIndex(idx)
    }
  } catch {}
}

export function getAllChapterReports(projectId: string): ChapterReportRecord[] {
  try {
    const idx = getIndex()
    const ids = idx[projectId] || []
    const reports: ChapterReportRecord[] = []
    for (const chapterId of ids) {
      const raw = localStorage.getItem(recordKey(projectId, chapterId))
      if (raw) {
        try { reports.push(JSON.parse(raw)) } catch {}
      }
    }
    // 按章节顺序排序
    return reports.sort((a, b) => a.chapterOrder - b.chapterOrder)
  } catch { return [] }
}

/** 获取某项目的质量汇总统计 */
export function getProjectQualitySummary(projectId: string) {
  const reports = getAllChapterReports(projectId)

  if (reports.length === 0) return null

  const scores = reports.map(r => r.score)
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length

  return {
    totalChapters: reports.length,
    checkedChapters: reports.length,
    avgScore: Math.round(avgScore * 10) / 10,
    bestChapter: Math.max(...scores),
    worstChapter: Math.min(...scores),
    compliantCount: reports.filter(r => r.compliant).length,
    complianceRate: Math.round((reports.filter(r => r.compliant).length / reports.length) * 100),
    avgWordCount: Math.round(reports.reduce((a, b) => a + b.wordCount, 0) / reports.length),
    totalWords: reports.reduce((a, b) => a + b.wordCount, 0),
    reports,
  }
}

/** 清除某项目的所有报告 */
export function clearProjectReports(projectId: string) {
  const reports = getAllChapterReports(projectId)
  for (const r of reports) {
    localStorage.removeItem(recordKey(projectId, r.chapterId))
  }
  const idx = getIndex()
  delete idx[projectId]
  saveIndex(idx)
}

/* ─── 未来 Supabase 同步接口（占位） ─── */

/**
 * 将来对接 Supabase 时实现此接口
 * 当前 localStorage 版本确保数据格式兼容
 */
// export async function syncReportToSupabase(record: ChapterReportRecord): Promise<void>
// export async function fetchReportsFromSupabase(projectId: string): Promise<ChapterReportRecord[]>

/* ─── AI 结果持久化 ─── */

export function saveAiResults(
  projectId: string,
  chapterId: string,
  results: Record<number, { status: string; reason: string; detail: string }>,
) {
  const existing = getChapterReport(projectId, chapterId)
  if (!existing) return
  existing.aiResults = results
  existing.updatedAt = Date.now()
  try {
    localStorage.setItem(recordKey(projectId, chapterId), JSON.stringify(existing))
  } catch {}
}

export function getAiResults(
  projectId: string,
  chapterId: string,
): Record<number, { status: string; reason: string; detail: string }> | null {
  const report = getChapterReport(projectId, chapterId)
  return report?.aiResults || null
}
