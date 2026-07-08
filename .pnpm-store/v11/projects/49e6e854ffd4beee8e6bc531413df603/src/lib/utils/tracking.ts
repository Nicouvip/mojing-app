// ============================================================
// 墨境用户行为追踪 — Tracking
// 功能：页面浏览 / 按钮点击 / 功能使用埋点
//       不依赖外部服务，数据写入 localStorage
// 版本：v1.0.0
// ============================================================

/**
 * 追踪事件数据类型
 */
export interface TrackingEvent {
  /** 事件唯一 ID */
  id: string
  /** 事件名称（如 'page_view' / 'click' / 'feature_use'） */
  name: string
  /** 事件分类 */
  category: 'page' | 'click' | 'feature' | 'custom'
  /** 事件标签（如页面路径 / 按钮名 / 功能名） */
  label: string
  /** 附加数据（可选） */
  data?: Record<string, string | number | boolean>
  /** 用户 ID（如有） */
  userId?: string
  /** 时间戳（ms） */
  timestamp: number
  /** 会话 ID（每次打开页面生成一次） */
  sessionId: string
  /** 页面路径 */
  page: string
  /** 页面标题 */
  pageTitle?: string
}

/**
 * 按日聚合计数（用于快速读取趋势，不用扫全量日志）
 */
export interface DailyAggregate {
  date: string                // '2025-07-16'
  pageViews: number
  clicks: number
  featureUses: number
  /** 细分：{ featureName: count } */
  featureBreakdown: Record<string, number>
  /** 细分：{ buttonName: count } */
  clickBreakdown: Record<string, number>
  /** 细分：{ path: count } */
  pageBreakdown: Record<string, number>
}

// ===== 常量 =====

const STORAGE_KEY_EVENTS = 'mojing_tracking_events'
const STORAGE_KEY_AGGREGATES = 'mojing_tracking_aggregates'
const STORAGE_KEY_SESSION = 'mojing_tracking_session'

/** 本地保留的最大事件数（超出时丢弃最旧的事件） */
const MAX_EVENTS = 5000

/** 聚合保留的天数 */
const MAX_AGGREGATE_DAYS = 90

// ===== 会话管理 =====

/**
 * 生成唯一 ID
 */
function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/**
 * 获取或创建会话 ID
 */
function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let sid = sessionStorage.getItem(STORAGE_KEY_SESSION)
    if (!sid) {
      sid = uid()
      sessionStorage.setItem(STORAGE_KEY_SESSION, sid)
    }
    return sid
  } catch {
    return uid()
  }
}

// ===== localStorage 读写 =====

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function safeSet<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    // localStorage 配额超限时，清空最旧的一半事件
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      const events = safeGet<TrackingEvent[]>(STORAGE_KEY_EVENTS, [])
      const half = Math.floor(events.length / 2)
      safeSet(STORAGE_KEY_EVENTS, events.slice(half))
    }
  }
}

// ===== 事件管理 =====

/**
 * 获取当前日期字符串（时区无关，统一用本地日期）
 */
function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * 获取所有已存储的事件
 */
export function getEvents(): TrackingEvent[] {
  return safeGet<TrackingEvent[]>(STORAGE_KEY_EVENTS, [])
}

/**
 * 按日期范围查询事件
 */
export function queryEvents(options: {
  startDate?: string
  endDate?: string
  category?: TrackingEvent['category']
  name?: string
  label?: string
  limit?: number
}): TrackingEvent[] {
  let events = getEvents()

  if (options.startDate) {
    const start = new Date(options.startDate).getTime()
    events = events.filter(e => e.timestamp >= start)
  }
  if (options.endDate) {
    const end = new Date(options.endDate + 'T23:59:59').getTime()
    events = events.filter(e => e.timestamp <= end)
  }
  if (options.category) {
    events = events.filter(e => e.category === options.category)
  }
  if (options.name) {
    events = events.filter(e => e.name === options.name)
  }
  if (options.label) {
    events = events.filter(e => e.label === options.label)
  }

  events.sort((a, b) => b.timestamp - a.timestamp) // 最新在前

  if (options.limit && options.limit > 0) {
    events = events.slice(0, options.limit)
  }

  return events
}

/**
 * 记录一条事件（内部方法）
 */
function recordEvent(event: Omit<TrackingEvent, 'id' | 'timestamp' | 'sessionId' | 'page'>): void {
  if (typeof window === 'undefined') return

  const fullEvent: TrackingEvent = {
    ...event,
    id: uid(),
    timestamp: Date.now(),
    sessionId: getSessionId(),
    page: window.location.pathname,
    pageTitle: document.title,
  }

  // 追加事件日志
  const events = getEvents()
  events.push(fullEvent)

  // 超限裁剪
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS)
  }

  safeSet(STORAGE_KEY_EVENTS, events)

  // 更新日聚合
  updateAggregate(fullEvent)
}

// ===== 聚合管理 =====

/**
 * 获取所有日聚合数据
 */
export function getAggregates(): DailyAggregate[] {
  return safeGet<DailyAggregate[]>(STORAGE_KEY_AGGREGATES, [])
}

/**
 * 按日期范围查询聚合
 */
export function queryAggregates(startDate?: string, endDate?: string): DailyAggregate[] {
  let aggregates = getAggregates()
  if (startDate) aggregates = aggregates.filter(a => a.date >= startDate)
  if (endDate) aggregates = aggregates.filter(a => a.date <= endDate)
  return aggregates.sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * 更新日聚合
 */
function updateAggregate(event: TrackingEvent): void {
  const date = todayStr()
  const aggregates = getAggregates()
  let day = aggregates.find(a => a.date === date)

  if (!day) {
    day = {
      date,
      pageViews: 0,
      clicks: 0,
      featureUses: 0,
      featureBreakdown: {},
      clickBreakdown: {},
      pageBreakdown: {},
    }
    aggregates.push(day)
  }

  switch (event.category) {
    case 'page':
      day.pageViews++
      day.pageBreakdown[event.label] = (day.pageBreakdown[event.label] || 0) + 1
      break
    case 'click':
      day.clicks++
      day.clickBreakdown[event.label] = (day.clickBreakdown[event.label] || 0) + 1
      break
    case 'feature':
      day.featureUses++
      day.featureBreakdown[event.label] = (day.featureBreakdown[event.label] || 0) + 1
      break
  }

  // 裁剪旧聚合（保留 MAX_AGGREGATE_DAYS 天）
  while (aggregates.length > MAX_AGGREGATE_DAYS) {
    aggregates.shift()
  }

  safeSet(STORAGE_KEY_AGGREGATES, aggregates)
}

// ===== 公开 API =====

/**
 * 追踪页面浏览
 *
 * @example
 * ```tsx
 * // 在 page.tsx 中调用
 * useEffect(() => { trackPageView() }, [])
 * ```
 */
export function trackPageView(title?: string): void {
  recordEvent({
    name: 'page_view',
    category: 'page',
    label: window.location.pathname,
    data: title ? { title } : undefined,
  })
}

/**
 * 追踪按钮点击
 *
 * @example
 * ```tsx
 * <button onClick={() => trackClick('新建作品', 'dashboard')}>新建作品</button>
 * ```
 */
export function trackClick(buttonName: string, location?: string): void {
  recordEvent({
    name: 'click',
    category: 'click',
    label: buttonName,
    data: location ? { location } : undefined,
  })
}

/**
 * 追踪功能使用
 *
 * @example
 * ```tsx
 * // 用户使用 AI 续写功能时
 * trackFeature('ai_continue')
 *
 * // 带附加数据
 * trackFeature('compliance_check', { result: 'pass', issues: '3' })
 * ```
 */
export function trackFeature(featureName: string, extra?: Record<string, string | number | boolean>): void {
  recordEvent({
    name: 'feature_use',
    category: 'feature',
    label: featureName,
    data: extra,
  })
}

/**
 * 追踪自定义事件（用于不属于前三类的场景）
 *
 * @example
 * ```tsx
 * trackEvent('feedback', 'satisfaction_rating', { score: 4 })
 * ```
 */
export function trackEvent(name: string, label: string, data?: Record<string, string | number | boolean>): void {
  recordEvent({
    name,
    category: 'custom',
    label,
    data,
  })
}

// ===== 工具方法 =====

/**
 * 清除所有追踪数据（用于测试或用户要求删除数据）
 */
export function clearTracking(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY_EVENTS)
    localStorage.removeItem(STORAGE_KEY_AGGREGATES)
  } catch { /* ignore */ }
}

/**
 * 获取追踪数据概览（用于调试面板）
 */
export function getTrackingSummary(): {
  totalEvents: number
  aggregateDays: number
  sessionId: string
  storageUsage: string
} {
  const events = getEvents()
  const aggregates = getAggregates()
  const usage = new Blob([JSON.stringify(events)]).size + new Blob([JSON.stringify(aggregates)]).size
  const kb = (usage / 1024).toFixed(1)

  return {
    totalEvents: events.length,
    aggregateDays: aggregates.length,
    sessionId: getSessionId(),
    storageUsage: `${kb} KB`,
  }
}

/**
 * 导出全部追踪数据为 JSON（用于调试 / 手动分析）
 */
export function exportTrackingJSON(): string {
  return JSON.stringify({ events: getEvents(), aggregates: getAggregates() }, null, 2)
}

// ===== React Hooks (Next.js App Router) =====

/**
 * 页面浏览追踪 Hook —— 在 page.tsx 的 useEffect 中调用
 *
 * @example
 * ```tsx
 * // app/dashboard/page.tsx
 * 'use client'
 * import { usePageTracking } from '@/lib/utils/tracking'
 *
 * export default function DashboardPage() {
 *   usePageTracking('控制台')
 *   return <div>...</div>
 * }
 * ```
 */
export function usePageTracking(pageTitle?: string): void {
  if (typeof window === 'undefined') return

  // 使用 React 的 dynamic import 让使用方自行调 useEffect
  // 这里只是纯函数包装，暴露给用户更方便
  trackPageView(pageTitle)
}

// ============================================================
// 使用说明
// ============================================================
//
// ## 快速开始
//
// ### 1. 页面浏览追踪
// 在任意 'use client' page.tsx 的 useEffect 中调用：
//
// ```tsx
// import { useEffect } from 'react'
// import { trackPageView } from '@/lib/utils/tracking'
//
// useEffect(() => { trackPageView('控制台') }, [])
// ```
//
// ### 2. 按钮点击追踪
// 给 onClick 加一行：
//
// ```tsx
// import { trackClick } from '@/lib/utils/tracking'
//
// <button onClick={() => { trackClick('新建作品'); handleCreate() }}>
//   新建作品
// </button>
// ```
//
// ### 3. 功能使用追踪
// 在调用 AI 功能时：
//
// ```tsx
// import { trackFeature } from '@/lib/utils/tracking'
//
// async function handleContinue() {
//   trackFeature('ai_continue')
//   // ... 实际调用
// }
// ```
//
// ## 查看数据
//
// 在浏览器 DevTools Console 中：
//
// ```js
// // 查看汇总
// import { getTrackingSummary } from '@/lib/utils/tracking'
// console.table(getTrackingSummary())
//
// // 查看日聚合
// import { getAggregates } from '@/lib/utils/tracking'
// console.table(getAggregates())
//
// // 查询特定事件
// import { queryEvents } from '@/lib/utils/tracking'
// console.table(queryEvents({ category: 'feature', limit: 10 }))
//
// // 导出全部数据
// import { exportTrackingJSON } from '@/lib/utils/tracking'
// console.log(exportTrackingJSON())
// ```
