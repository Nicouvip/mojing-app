// ============================================================
// 墨境提示词系统 — A/B 测试 (ABTest)
// 功能：按流量比例分发不同模板版本，支持实验管理
// 版本：v1.0.0
// ============================================================

import type { ToolType } from './types'
import { registry } from './registry'
import { feedbackCollector } from './feedback'
import { persistExperiments, loadExperiments } from './store'

/**
 * A/B 实验定义
 */
export interface ABExperiment {
  /** 实验唯一标识 */
  id: string
  /** 实验名称 */
  name: string
  /** 实验描述 */
  description: string
  /** 涉及的工具类型 */
  toolType: ToolType
  /** 实验组 */
  groups: ABGroup[]
  /** 流量分配方案 */
  trafficSplit: TrafficSplit
  /** 实验状态 */
  status: ExperimentStatus
  /** 起始时间 */
  startedAt: number
  /** 结束时间（如有） */
  endedAt?: number
  /** 评估指标 */
  metrics: ExperimentMetric[]
  /** 目标样本量 */
  targetSampleSize: number
}

export interface ABGroup {
  /** 组标识（如 'control', 'variant-a'） */
  id: string
  /** 组名称（如 '对照组', '实验组A'） */
  name: string
  /** 使用的模板 ID */
  templateId: string
  /** 模板版本 */
  templateVersion: string
  /** 参数覆盖（可选） */
  paramOverrides?: Partial<{
    temperature: number
    maxTokens: number
  }>
}

export type TrafficSplit = 'equal' | { groups: Record<string, number> }

export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed' | 'stopped'

export interface ExperimentMetric {
  key: string
  name: string
  higherIsBetter: boolean
}

/**
 * 实验运行结果
 */
export interface ExperimentResult {
  experiment: ABExperiment
  groupStats: Array<{
    group: ABGroup
    stats: ReturnType<typeof feedbackCollector.getStats>
  }>
  winner?: string  // 胜出的 group id
  confidence?: number  // 置信度（简化版）
}

// ===== A/B 测试管理器 =====

class ABTestManager {
  private experiments: Map<string, ABExperiment> = new Map()

  constructor() {
    const loaded = loadExperiments()
    for (const exp of loaded) {
      this.experiments.set(exp.id, exp)
    }
  }

  private persist(): void {
    persistExperiments(Array.from(this.experiments.values()))
  }

  /**
   * 创建实验
   */
  create(params: Omit<ABExperiment, 'id' | 'startedAt' | 'status'>): ABExperiment {
    const experiment: ABExperiment = {
      ...params,
      id: `ab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      status: 'draft',
      startedAt: Date.now(),
    }
    this.experiments.set(experiment.id, experiment)
    this.persist()
    return experiment
  }

  /**
   * 启动实验
   */
  start(id: string): boolean {
    const exp = this.experiments.get(id)
    if (!exp || exp.status !== 'draft') return false
    exp.status = 'running'
    // 验证模板存在
    for (const g of exp.groups) {
      if (!registry.get(g.templateId)) {
        exp.status = 'draft'
        return false
      }
    }
    this.persist()
    return true
  }

  /**
   * 停止实验
   */
  stop(id: string): boolean {
    const exp = this.experiments.get(id)
    if (!exp) return false
    exp.status = 'stopped'
    exp.endedAt = Date.now()
    this.persist()
    return true
  }

  /**
   * 根据流量分配选择组
   */
  assignGroup(toolType: ToolType, seed?: string): { experiment: ABExperiment; group: ABGroup } | null {
    const running = Array.from(this.experiments.values())
      .filter(e => e.status === 'running' && e.toolType === toolType)

    if (running.length === 0) return null

    // 取第一个正在运行的实验（简化策略）
    const exp = running[0]

    // 流量分配
    let groupId: string
    if (exp.trafficSplit === 'equal') {
      // 平均分配
      const idx = seed
        ? Math.abs(hashCode(seed)) % exp.groups.length
        : Math.floor(Math.random() * exp.groups.length)
      groupId = exp.groups[idx].id
    } else {
      // 按比例分配
      const r = Math.random()
      let cumulative = 0
      groupId = exp.groups[0].id
      for (const g of exp.groups) {
        const weight = exp.trafficSplit.groups[g.id] || 0
        cumulative += weight / 100
        if (r <= cumulative) {
          groupId = g.id
          break
        }
      }
    }

    const group = exp.groups.find(g => g.id === groupId)
    return group ? { experiment: exp, group } : null
  }

  /**
   * 获取实验结果
   */
  getResult(id: string): ExperimentResult | null {
    const exp = this.experiments.get(id)
    if (!exp) return null

    const groupStats = exp.groups.map(group => ({
      group,
      stats: feedbackCollector.getStats(group.templateId, group.templateVersion),
    }))

    // 简化版：比较 avgSatisfaction 判定胜者
    let winner: string | undefined
    const metrics = exp.metrics.find(m => m.key === 'avgSatisfaction')
    if (metrics && groupStats.length >= 2) {
      const sorted = [...groupStats].sort((a, b) => {
        return metrics.higherIsBetter
          ? b.stats.avgSatisfaction - a.stats.avgSatisfaction
          : a.stats.avgSatisfaction - b.stats.avgSatisfaction
      })
      if (sorted[0].stats.sampleSize >= 10) {
        winner = sorted[0].group.id
      }
    }

    return { experiment: exp, groupStats, winner }
  }

  /**
   * 获取实验
   */
  get(id: string): ABExperiment | undefined {
    return this.experiments.get(id)
  }

  /**
   * 列出所有实验
   */
  list(): ABExperiment[] {
    return Array.from(this.experiments.values())
  }
}

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return hash
}

// 全局单例
export const abTestManager = new ABTestManager()
