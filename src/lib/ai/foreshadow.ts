// ============================================================
// 墨境提示词系统 — 伏笔管理 (Foreshadow Management)
// 功能：三态追踪 + 活跃上限 + 回收时限预警
// 版本：v1.0.0
// ============================================================

/** 伏笔状态 */
export type ForeshadowStatus = 'active' | 'resolved' | 'abandoned'

/** 伏笔重要程度 */
export type ForeshadowImportance = 'major' | 'minor'

/** 伏笔 */
export interface Foreshadow {
  /** 伏笔ID */
  id: string
  /** 伏笔内容描述 */
  content: string
  /** 重要程度 */
  importance: ForeshadowImportance
  /** 当前状态 */
  status: ForeshadowStatus
  /** 埋设章节 */
  chapterPlanted: number
  /** 计划回收章节 */
  chapterPlannedResolution?: number
  /** 实际回收章节 */
  chapterResolved?: number
  /** 废弃章节 */
  chapterAbandoned?: number
  /** 关联角色 */
  relatedCharacters?: string[]
  /** 备注 */
  notes?: string
}

/** 伏笔台账 */
export interface ForeshadowLedger {
  /** 所有伏笔 */
  foreshadows: Foreshadow[]
  /** 最后更新章节 */
  lastUpdatedChapter: number
}

/** 伏笔预警 */
export interface ForeshadowWarning {
  /** 预警类型 */
  type: 'overdue' | 'over_limit' | 'approaching_deadline'
  /** 伏笔ID */
  foreshadowId: string
  /** 预警信息 */
  message: string
  /** 严重程度 */
  severity: 'warning' | 'critical'
}

// ===== 伏笔上限配置 =====

/** 活跃伏笔上限 */
export const FORESHADOW_LIMITS = {
  short: 3,    // 短篇（≤1万字）
  medium: 5,   // 中篇（1-10万字）
  long: 10,    // 长篇（≥10万字）
} as const

/** 回收时限配置（章数） */
export const FORESHADOW_DEADLINES = {
  major: 30,   // 重要伏笔：30章内回收
  minor: 10,   // 次要伏笔：10章内回收
} as const

// ===== 核心函数 =====

/**
 * 创建空的伏笔台账
 */
export function createForeshadowLedger(): ForeshadowLedger {
  return {
    foreshadows: [],
    lastUpdatedChapter: 0,
  }
}

/**
 * 添加伏笔
 * @param ledger 伏笔台账
 * @param foreshadow 伏笔信息
 * @param currentChapter 当前章节号
 * @returns 更新后的台账
 */
export function addForeshadow(
  ledger: ForeshadowLedger,
  foreshadow: Omit<Foreshadow, 'id' | 'status' | 'chapterPlanted'>,
  currentChapter: number
): { ledger: ForeshadowLedger; warning?: ForeshadowWarning } {
  const id = `fs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const newForeshadow: Foreshadow = {
    ...foreshadow,
    id,
    status: 'active',
    chapterPlanted: currentChapter,
  }

  const newLedger = {
    ...ledger,
    foreshadows: [...ledger.foreshadows, newForeshadow],
    lastUpdatedChapter: currentChapter,
  }

  // 检查是否超过上限
  const activeCount = getActiveForeshadows(newLedger).length
  const limit = FORESHADOW_LIMITS.long  // 默认使用长篇上限
  if (activeCount > limit) {
    return {
      ledger: newLedger,
      warning: {
        type: 'over_limit',
        foreshadowId: id,
        message: `活跃伏笔数量（${activeCount}）超过上限（${limit}）`,
        severity: 'critical',
      },
    }
  }

  return { ledger: newLedger }
}

/**
 * 回收伏笔
 * @param ledger 伏笔台账
 * @param foreshadowId 伏笔ID
 * @param currentChapter 当前章节号
 * @returns 更新后的台账
 */
export function resolveForeshadow(
  ledger: ForeshadowLedger,
  foreshadowId: string,
  currentChapter: number
): ForeshadowLedger {
  return {
    ...ledger,
    foreshadows: ledger.foreshadows.map(f =>
      f.id === foreshadowId
        ? { ...f, status: 'resolved' as ForeshadowStatus, chapterResolved: currentChapter }
        : f
    ),
    lastUpdatedChapter: currentChapter,
  }
}

/**
 * 废弃伏笔
 * @param ledger 伏笔台账
 * @param foreshadowId 伏笔ID
 * @param currentChapter 当前章节号
 * @returns 更新后的台账
 */
export function abandonForeshadow(
  ledger: ForeshadowLedger,
  foreshadowId: string,
  currentChapter: number
): ForeshadowLedger {
  return {
    ...ledger,
    foreshadows: ledger.foreshadows.map(f =>
      f.id === foreshadowId
        ? { ...f, status: 'abandoned' as ForeshadowStatus, chapterAbandoned: currentChapter }
        : f
    ),
    lastUpdatedChapter: currentChapter,
  }
}

/**
 * 获取活跃伏笔列表
 */
export function getActiveForeshadows(ledger: ForeshadowLedger): Foreshadow[] {
  return ledger.foreshadows.filter(f => f.status === 'active')
}

/**
 * 获取伏笔预警
 * @param ledger 伏笔台账
 * @param currentChapter 当前章节号
 * @returns 预警列表
 */
export function getForeshadowWarnings(
  ledger: ForeshadowLedger,
  currentChapter: number
): ForeshadowWarning[] {
  const warnings: ForeshadowWarning[] = []
  const activeForeshadows = getActiveForeshadows(ledger)

  for (const f of activeForeshadows) {
    const chaptersSincePlant = currentChapter - f.chapterPlanted
    const deadline = f.importance === 'major'
      ? FORESHADOW_DEADLINES.major
      : FORESHADOW_DEADLINES.minor

    // 超期预警
    if (chaptersSincePlant > deadline) {
      warnings.push({
        type: 'overdue',
        foreshadowId: f.id,
        message: `伏笔「${f.content.slice(0, 20)}...」已超过回收时限（${chaptersSincePlant}章/${deadline}章）`,
        severity: 'critical',
      })
    }
    // 临近预警（剩余3章内）
    else if (chaptersSincePlant >= deadline - 3) {
      warnings.push({
        type: 'approaching_deadline',
        foreshadowId: f.id,
        message: `伏笔「${f.content.slice(0, 20)}...」即将到期（剩余${deadline - chaptersSincePlant}章）`,
        severity: 'warning',
      })
    }
  }

  return warnings
}

/**
 * 获取伏笔统计
 */
export function getForeshadowStats(ledger: ForeshadowLedger): {
  total: number
  active: number
  resolved: number
  abandoned: number
  overdue: number
} {
  const active = ledger.foreshadows.filter(f => f.status === 'active')
  const resolved = ledger.foreshadows.filter(f => f.status === 'resolved')
  const abandoned = ledger.foreshadows.filter(f => f.status === 'abandoned')

  return {
    total: ledger.foreshadows.length,
    active: active.length,
    resolved: resolved.length,
    abandoned: abandoned.length,
    overdue: 0,  // 需要传入当前章节号才能计算
  }
}

/**
 * 格式化伏笔台账（用于A-8状态行）
 */
export function formatForeshadowForA8(ledger: ForeshadowLedger, currentChapter: number): string {
  const activeCount = getActiveForeshadows(ledger).length
  const warnings = getForeshadowWarnings(ledger, currentChapter)
  const criticalWarnings = warnings.filter(w => w.severity === 'critical')

  let text = `活跃伏笔_${activeCount}条`
  if (criticalWarnings.length > 0) {
    text += ` ⚠️超期_${criticalWarnings.length}条`
  }

  return text
}
