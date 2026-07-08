// ============================================================
// 墨境提示词系统 — 反馈闭环 (Feedback)
// 功能：采集用户对 AI 输出的反馈，驱动提示词版本迭代
// 版本：v1.0.0
// ============================================================

import type { ToolType } from './types'
import { persistFeedback, persistCallCounts, loadFeedback, loadCallCounts } from './store'

// ===== 反馈数据类型 =====

/**
 * 用户对单次 AI 输出的反馈
 */
export interface PromptFeedback {
  /** 唯一标识 */
  id: string
  /** 关联的模板 ID */
  templateId: string
  /** 模板版本号 */
  templateVersion: string
  /** 工具类型 */
  toolType: ToolType
  /** 时间戳 */
  createdAt: number

  // === 核心指标 ===

  /** 满意度评分（1-5） */
  satisfaction?: SatisfactionScore
  /** 是否采纳（保留/部分修改/完全重写/丢弃） */
  adoption?: AdoptionStatus
  /** 用户修改后的版本（如果有） */
  editedVersion?: string
  /** 原始版本（AI 输出） */
  originalOutput?: string
  /** 用户修改次数（二次编辑次数） */
  editCount?: number
  /** 是否重试（用户点击了重新生成） */
  retried?: boolean
  /** 重试次数 */
  retryCount?: number

  // === 质量维度（可选） ===

  /** 流畅度评分（1-5） */
  fluency?: number
  /** 一致性评分（1-5） */
  consistency?: number
  /** 创意度评分（1-5） */
  creativity?: number
  /** 情感深度评分（1-5） */
  emotionalDepth?: number

  /** 用户补充评论文本 */
  comment?: string
}

export type SatisfactionScore = 1 | 2 | 3 | 4 | 5
export type AdoptionStatus = 'kept' | 'partially_edited' | 'rewritten' | 'discarded'

/**
 * 模板版本的聚合统计数据
 */
export interface TemplateStats {
  templateId: string
  templateVersion: string
  toolType: ToolType
  totalCalls: number
  totalFeedback: number
  feedbackRate: number           // 反馈率
  avgSatisfaction: number        // 平均满意度
  adoptionRate: number           // 采纳率 (kept + partially_edited)
  keepRate: number               // 直接保留率 (kept)
  editRate: number               // 编辑率 (partially_edited + rewritten)
  rewriteRate: number            // 重写率 (rewritten)
  discardRate: number            // 丢弃率 (discarded)
  avgEditCount: number           // 平均编辑次数
  retryRate: number              // 重试率
  avgRetryCount: number          // 平均重试次数
  avgFluency?: number
  avgConsistency?: number
  avgCreativity?: number
  avgEmotionalDepth?: number
  sampleSize: number
}

// ===== 反馈收集器 =====

class FeedbackCollector {
  private feedbacks: PromptFeedback[] = []
  private callCounts: Map<string, number> = new Map()

  constructor() {
    this.feedbacks = loadFeedback()
    this.callCounts = loadCallCounts()
  }

  /**
   * 记录一次 AI 调用
   */
  recordCall(templateId: string, version: string): void {
    const key = `${templateId}@${version}`
    this.callCounts.set(key, (this.callCounts.get(key) || 0) + 1)
    persistCallCounts(this.callCounts)
  }

  /**
   * 提交反馈
   */
  submit(feedback: PromptFeedback): void {
    this.feedbacks.push(feedback)
    persistFeedback(this.feedbacks)
  }

  /**
   * 获取某个模板版本的所有反馈
   */
  getFeedbacks(templateId: string, version?: string): PromptFeedback[] {
    return this.feedbacks.filter(f =>
      f.templateId === templateId &&
      (!version || f.templateVersion === version)
    )
  }

  /**
   * 获取模板版本的聚合统计
   */
  getStats(templateId: string, version: string): TemplateStats {
    const key = `${templateId}@${version}`
    const totalCalls = this.callCounts.get(key) || 0
    const feedbacks = this.getFeedbacks(templateId, version)
    const totalFeedback = feedbacks.length

    const avg = (arr: number[]) =>
      arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100 : 0

    const satisfactionScores = feedbacks.filter(f => f.satisfaction).map(f => f.satisfaction!)
    const adoptions = feedbacks.filter(f => f.adoption).map(f => f.adoption!)
    const editCounts = feedbacks.filter(f => f.editCount != null).map(f => f.editCount!)
    const retries = feedbacks.filter(f => f.retried != null)
    const retryCounts = feedbacks.filter(f => f.retryCount != null).map(f => f.retryCount!)

    const adoptedCount = adoptions.filter(a => a === 'kept' || a === 'partially_edited').length
    const keptCount = adoptions.filter(a => a === 'kept').length
    const editedCount = adoptions.filter(a => a === 'partially_edited' || a === 'rewritten').length
    const rewrittenCount = adoptions.filter(a => a === 'rewritten').length
    const discardedCount = adoptions.filter(a => a === 'discarded').length
    const retriedCount = retries.filter(f => f.retried).length

    return {
      templateId,
      templateVersion: version,
      toolType: feedbacks[0]?.toolType || 'continue',
      totalCalls,
      totalFeedback,
      feedbackRate: totalCalls > 0 ? Math.round((totalFeedback / totalCalls) * 10000) / 100 : 0,
      avgSatisfaction: avg(satisfactionScores),
      adoptionRate: adoptions.length > 0 ? Math.round((adoptedCount / adoptions.length) * 10000) / 100 : 0,
      keepRate: adoptions.length > 0 ? Math.round((keptCount / adoptions.length) * 10000) / 100 : 0,
      editRate: adoptions.length > 0 ? Math.round((editedCount / adoptions.length) * 10000) / 100 : 0,
      rewriteRate: adoptions.length > 0 ? Math.round((rewrittenCount / adoptions.length) * 10000) / 100 : 0,
      discardRate: adoptions.length > 0 ? Math.round((discardedCount / adoptions.length) * 10000) / 100 : 0,
      avgEditCount: avg(editCounts),
      retryRate: retries.length > 0 ? Math.round((retriedCount / retries.length) * 10000) / 100 : 0,
      avgRetryCount: avg(retryCounts),
      avgFluency: avg(feedbacks.filter(f => f.fluency).map(f => f.fluency!)),
      avgConsistency: avg(feedbacks.filter(f => f.consistency).map(f => f.consistency!)),
      avgCreativity: avg(feedbacks.filter(f => f.creativity).map(f => f.creativity!)),
      avgEmotionalDepth: avg(feedbacks.filter(f => f.emotionalDepth).map(f => f.emotionalDepth!)),
      sampleSize: totalFeedback,
    }
  }

  /**
   * 比较两个版本的统计
   */
  compareVersions(templateId: string, versionA: string, versionB: string): {
    a: TemplateStats
    b: TemplateStats
    diff: Partial<Record<keyof TemplateStats, number>>
  } {
    const a = this.getStats(templateId, versionA)
    const b = this.getStats(templateId, versionB)
    const diff: Record<string, number> = {}
    for (const key of ['avgSatisfaction', 'adoptionRate', 'retryRate', 'keepRate'] as const) {
      diff[key] = Math.round((b[key] as number - (a[key] as number)) * 100) / 100
    }
    return { a, b, diff }
  }

  /**
   * 获取所有已收集的反馈
   */
  getAll(): PromptFeedback[] {
    return [...this.feedbacks]
  }

  /**
   * 清空（用于测试）
   */
  clear(): void {
    this.feedbacks = []
    this.callCounts.clear()
    persistFeedback([])
    persistCallCounts(new Map())
  }
}

// 全局单例
export const feedbackCollector = new FeedbackCollector()

/**
 * 创建反馈对象的工厂函数
 */
export function createFeedback(params: {
  templateId: string
  templateVersion: string
  toolType: ToolType
  satisfaction?: SatisfactionScore
  adoption?: AdoptionStatus
  editedVersion?: string
  originalOutput?: string
  editCount?: number
  retried?: boolean
  retryCount?: number
  comment?: string
}): PromptFeedback {
  return {
    id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    ...params,
  }
}
