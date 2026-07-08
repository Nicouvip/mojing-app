// ============================================================
// 墨境提示词系统 — 状态快照 (State Snapshot)
// 功能：导出/导入全局写作状态，支持跨对话恢复
// 版本：v1.0.0
// ============================================================

import type { CoolingState } from './cooling'
import type { ForeshadowLedger } from './foreshadow'
import type { CharacterGrowthLedger } from './character-growth'
import type { WritingStyle, ConflictLevel, Genre } from '../prompts/types'

/** 全局写作状态快照 */
export interface WritingStateSnapshot {
  /** 快照版本 */
  version: string
  /** 创建时间戳 */
  createdAt: number
  /** 书名 */
  bookTitle: string
  /** 当前章节号 */
  currentChapter: number
  /** 总章节数 */
  totalChapters: number

  // === 创作参数 ===
  /** 写作风格 */
  style: WritingStyle
  /** 题材 */
  genre: Genre
  /** 当前冲突强度级别 */
  conflictLevel: ConflictLevel

  // === 状态数据 ===
  /** 冷却状态 */
  cooling: CoolingState
  /** 伏笔台账 */
  foreshadows: ForeshadowLedger
  /** 角色成长台账 */
  characterGrowth: CharacterGrowthLedger

  // === 元数据 ===
  /** 最后修改时间 */
  lastModified: number
  /** 备注 */
  notes?: string
}

/** 快照导出选项 */
export interface ExportOptions {
  /** 是否包含正文全文 */
  includeFullText?: boolean
  /** 仅导出最近N章正文 */
  recentChapters?: number
  /** 正文内容（如果需要导出） */
  chapterTexts?: Record<number, string>
}

/** 快照导入结果 */
export interface ImportResult {
  /** 是否成功 */
  success: boolean
  /** 导入的状态快照 */
  snapshot?: WritingStateSnapshot
  /** 错误信息 */
  error?: string
  /** 警告信息 */
  warnings?: string[]
}

// ===== 核心函数 =====

/**
 * 创建新的写作状态快照
 */
export function createSnapshot(
  bookTitle: string,
  style: WritingStyle,
  genre: Genre
): WritingStateSnapshot {
  const now = Date.now()
  return {
    version: '1.0.0',
    createdAt: now,
    bookTitle,
    currentChapter: 1,
    totalChapters: 0,
    style,
    genre,
    conflictLevel: 'L2',
    cooling: {
      scenes: { S1: [], S2: [], S3: [], S4: [], S5: [], S6: [] },
      endings: {
        E1: [], E2: [], E3: [], E4: [], E5: [], E6: [],
        E7: [], E8: [], E9: [], E10: [], E11: [], E12: [],
      },
      hooks: {
        H01: [], H02: [], H03: [], H04: [], H05: [], H06: [], H07: [],
        H08: [], H09: [], H10: [], H11: [], H12: [], H13: [],
      },
      senses: { visual: [], tactile: [], auditory: [], olfactory: [], gustatory: [], sixth: [] },
      emotions: [],
      sentences: { parallelism: [], antithesis: [], rare: [] },
      progressiveJudgment: {},
    },
    foreshadows: {
      foreshadows: [],
      lastUpdatedChapter: 0,
    },
    characterGrowth: {
      characters: [],
      lastUpdatedChapter: 0,
    },
    lastModified: now,
  }
}

/**
 * 导出状态快照为JSON字符串
 * @param snapshot 状态快照
 * @param options 导出选项
 * @returns JSON字符串
 */
export function exportSnapshot(
  snapshot: WritingStateSnapshot,
  options?: ExportOptions
): string {
  const exportData = {
    ...snapshot,
    exportOptions: options,
    exportedAt: Date.now(),
  }

  return JSON.stringify(exportData, null, 2)
}

/**
 * 导出状态快照为Markdown格式（人类可读）
 * @param snapshot 状态快照
 * @returns Markdown文本
 */
export function exportSnapshotAsMarkdown(snapshot: WritingStateSnapshot): string {
  const lines: string[] = []

  lines.push(`# 创作状态快照`)
  lines.push(`- 书名：${snapshot.bookTitle}`)
  lines.push(`- 当前章节：第${snapshot.currentChapter}章 / 总${snapshot.totalChapters}章`)
  lines.push(`- 导出时间：${new Date(snapshot.lastModified).toLocaleString()}`)
  lines.push(`- 风格：${snapshot.style}`)
  lines.push(`- 题材：${snapshot.genre}`)
  lines.push(`- 冲突强度：${snapshot.conflictLevel}`)
  lines.push('')

  // 冷却状态
  lines.push(`## 冷却状态`)
  lines.push('```')
  lines.push(`场景：S1(${snapshot.cooling.scenes.S1.length > 0 ? '冷却中' : '可用'}) S2(${snapshot.cooling.scenes.S2.length > 0 ? '冷却中' : '可用'}) S3(${snapshot.cooling.scenes.S3.length > 0 ? '冷却中' : '可用'}) S4(${snapshot.cooling.scenes.S4.length > 0 ? '冷却中' : '可用'}) S5(${snapshot.cooling.scenes.S5.length > 0 ? '冷却中' : '可用'}) S6(${snapshot.cooling.scenes.S6.length > 0 ? '冷却中' : '可用'})`)
  lines.push(`情感序列：${snapshot.cooling.emotions.join(' → ') || '无'}`)
  lines.push('```')
  lines.push('')

  // 活跃伏笔
  lines.push(`## 活跃伏笔`)
  const activeForeshadows = snapshot.foreshadows.foreshadows.filter(f => f.status === 'active')
  if (activeForeshadows.length === 0) {
    lines.push('无活跃伏笔')
  } else {
    for (const f of activeForeshadows) {
      lines.push(`- ${f.content}（埋设章：${f.chapterPlanted}，${f.importance === 'major' ? '重要' : '次要'}）`)
    }
  }
  lines.push('')

  // 角色档案
  lines.push(`## 角色档案`)
  if (snapshot.characterGrowth.characters.length === 0) {
    lines.push('无角色档案')
  } else {
    for (const c of snapshot.characterGrowth.characters) {
      lines.push(`### ${c.name}`)
      lines.push(`- 当前性格：${c.currentPersonality}`)
      lines.push(`- 成长次数：${c.growthHistory.length}`)
      if (c.growthHistory.length > 0) {
        const lastGrowth = c.growthHistory[c.growthHistory.length - 1]
        lines.push(`- 最近成长：第${lastGrowth.chapter}章 - ${lastGrowth.changeDescription}`)
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}

/**
 * 从JSON字符串导入状态快照
 * @param jsonString JSON字符串
 * @returns 导入结果
 */
export function importSnapshot(jsonString: string): ImportResult {
  try {
    const data = JSON.parse(jsonString)

    // 验证必需字段
    const warnings: string[] = []

    if (!data.version) {
      warnings.push('缺少版本号，假设为1.0.0')
      data.version = '1.0.0'
    }

    if (!data.bookTitle) {
      return { success: false, error: '缺少书名' }
    }

    if (!data.cooling) {
      return { success: false, error: '缺少冷却状态数据' }
    }

    // 创建完整快照
    const snapshot: WritingStateSnapshot = {
      version: data.version,
      createdAt: data.createdAt || Date.now(),
      bookTitle: data.bookTitle,
      currentChapter: data.currentChapter || 1,
      totalChapters: data.totalChapters || 0,
      style: data.style || '冷峻白描',
      genre: data.genre || '通用',
      conflictLevel: data.conflictLevel || 'L2',
      cooling: data.cooling,
      foreshadows: data.foreshadows || { foreshadows: [], lastUpdatedChapter: 0 },
      characterGrowth: data.characterGrowth || { characters: [], lastUpdatedChapter: 0 },
      lastModified: data.lastModified || Date.now(),
      notes: data.notes,
    }

    return {
      success: true,
      snapshot,
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  } catch (error) {
    return {
      success: false,
      error: `解析失败：${error instanceof Error ? error.message : '未知错误'}`,
    }
  }
}

/**
 * 更新快照的章节信息
 */
export function updateSnapshotChapter(
  snapshot: WritingStateSnapshot,
  currentChapter: number
): WritingStateSnapshot {
  return {
    ...snapshot,
    currentChapter,
    totalChapters: Math.max(snapshot.totalChapters, currentChapter),
    lastModified: Date.now(),
  }
}

/**
 * 更新快照的冲突强度
 */
export function updateSnapshotConflictLevel(
  snapshot: WritingStateSnapshot,
  conflictLevel: ConflictLevel
): WritingStateSnapshot {
  return {
    ...snapshot,
    conflictLevel,
    lastModified: Date.now(),
  }
}

/**
 * 更新快照的写作风格
 */
export function updateSnapshotStyle(
  snapshot: WritingStateSnapshot,
  style: WritingStyle
): WritingStateSnapshot {
  return {
    ...snapshot,
    style,
    lastModified: Date.now(),
  }
}
