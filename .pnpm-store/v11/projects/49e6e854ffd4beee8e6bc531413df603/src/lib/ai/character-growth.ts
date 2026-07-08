// ============================================================
// 墨境提示词系统 — 角色成长追踪 (Character Growth Tracking)
// 功能：检测4种成长触发条件 + 章末自动标注
// 版本：v1.0.0
// ============================================================

/** 成长触发条件 */
export type GrowthTrigger =
  | 'different_choice'       // 与初始人设完全不同的重大选择
  | 'value_shift'            // 核心价值观受到挑战并发生偏移
  | 'relationship_change'    // 与他人关系发生不可逆的质变
  | 'ability_identity_change' // 获得或失去重要能力/身份/信念

/** 成长记录 */
export interface CharacterGrowth {
  /** 记录ID */
  id: string
  /** 角色名称 */
  characterName: string
  /** 触发条件 */
  trigger: GrowthTrigger
  /** 变化简述 */
  changeDescription: string
  /** 发生章节 */
  chapter: number
  /** 发生时间戳 */
  timestamp: number
  /** 关联事件 */
  relatedEvent?: string
  /** 备注 */
  notes?: string
}

/** 角色档案 */
export interface CharacterProfile {
  /** 角色名称 */
  name: string
  /** 初始性格阶段 */
  initialPersonality: string
  /** 当前性格阶段 */
  currentPersonality: string
  /** 成长记录列表 */
  growthHistory: CharacterGrowth[]
  /** 描写指纹 */
  descriptionFingerprint?: {
    sensoryChannels: string[]  // 感官通道
    imagery: string[]          // 意象类型
    metaphorDomain: string[]   // 比喻域
  }
  /** 身体习惯 */
  bodyHabits?: string[]
  /** 说话风格 */
  speakingStyle?: string
}

/** 角色成长台账 */
export interface CharacterGrowthLedger {
  /** 角色档案列表 */
  characters: CharacterProfile[]
  /** 最后更新章节 */
  lastUpdatedChapter: number
}

// ===== 成长触发条件描述 =====

/** 成长触发条件说明 */
export const GROWTH_TRIGGER_DESCRIPTIONS: Record<GrowthTrigger, string> = {
  different_choice: '与初始人设完全不同的重大选择',
  value_shift: '核心价值观受到挑战并发生偏移',
  relationship_change: '与他人关系发生不可逆的质变（如决裂、结盟、信任崩塌）',
  ability_identity_change: '获得或失去重要能力/身份/信念',
}

// ===== 核心函数 =====

/**
 * 创建空的角色成长台账
 */
export function createCharacterGrowthLedger(): CharacterGrowthLedger {
  return {
    characters: [],
    lastUpdatedChapter: 0,
  }
}

/**
 * 添加角色
 * @param ledger 台账
 * @param character 角色信息
 * @returns 更新后的台账
 */
export function addCharacter(
  ledger: CharacterGrowthLedger,
  character: Omit<CharacterProfile, 'growthHistory'>
): CharacterGrowthLedger {
  const existing = ledger.characters.find(c => c.name === character.name)
  if (existing) return ledger  // 已存在则不添加

  return {
    ...ledger,
    characters: [...ledger.characters, { ...character, growthHistory: [] }],
  }
}

/**
 * 记录角色成长
 * @param ledger 台账
 * @param characterName 角色名称
 * @param growth 成长记录
 * @param currentChapter 当前章节号
 * @returns 更新后的台账
 */
export function recordGrowth(
  ledger: CharacterGrowthLedger,
  characterName: string,
  growth: Omit<CharacterGrowth, 'id' | 'characterName' | 'chapter' | 'timestamp'>,
  currentChapter: number
): CharacterGrowthLedger {
  const id = `cg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

  return {
    ...ledger,
    characters: ledger.characters.map(c =>
      c.name === characterName
        ? {
            ...c,
            growthHistory: [
              ...c.growthHistory,
              {
                ...growth,
                id,
                characterName,
                chapter: currentChapter,
                timestamp: Date.now(),
              },
            ],
          }
        : c
    ),
    lastUpdatedChapter: currentChapter,
  }
}

/**
 * 检测成长触发条件（基于文本分析，简化版）
 * @param text 章节文本
 * @param characterName 角色名称
 * @returns 可能的触发条件列表
 */
export function detectGrowthTriggers(text: string, characterName: string): GrowthTrigger[] {
  const triggers: GrowthTrigger[] = []

  // 检测不同选择（关键词：决定、选择、放弃、坚持）
  const choicePatterns = ['决定', '选择', '放弃', '坚持', '违背', '背叛']
  if (choicePatterns.some(p => text.includes(`${characterName}${p}`) || text.includes(`他${p}`))) {
    triggers.push('different_choice')
  }

  // 检测价值观变化（关键词：不再、终于明白、意识到）
  const valuePatterns = ['不再', '终于明白', '意识到', '改变了看法', '重新认识']
  if (valuePatterns.some(p => text.includes(p))) {
    triggers.push('value_shift')
  }

  // 检测关系变化（关键词：决裂、结盟、信任、背叛、和解）
  const relationshipPatterns = ['决裂', '结盟', '信任崩塌', '背叛', '和解', '反目']
  if (relationshipPatterns.some(p => text.includes(p))) {
    triggers.push('relationship_change')
  }

  // 检测能力/身份变化（关键词：获得、失去、觉醒、觉醒、成为）
  const abilityPatterns = ['获得', '失去', '觉醒', '成为', '不再是']
  if (abilityPatterns.some(p => text.includes(p))) {
    triggers.push('ability_identity_change')
  }

  return [...new Set(triggers)]
}

/**
 * 更新角色性格阶段
 * @param ledger 台账
 * @param characterName 角色名称
 * @param newPersonality 新的性格阶段描述
 * @param currentChapter 当前章节号
 * @returns 更新后的台账
 */
export function updateCharacterPersonality(
  ledger: CharacterGrowthLedger,
  characterName: string,
  newPersonality: string,
  currentChapter: number
): CharacterGrowthLedger {
  return {
    ...ledger,
    characters: ledger.characters.map(c =>
      c.name === characterName
        ? { ...c, currentPersonality: newPersonality }
        : c
    ),
    lastUpdatedChapter: currentChapter,
  }
}

/**
 * 获取角色成长历史
 */
export function getCharacterGrowthHistory(
  ledger: CharacterGrowthLedger,
  characterName: string
): CharacterGrowth[] {
  const character = ledger.characters.find(c => c.name === characterName)
  return character?.growthHistory || []
}

/**
 * 格式化角色成长记录（用于章末自检报告）
 */
export function formatGrowthForReport(
  ledger: CharacterGrowthLedger,
  currentChapter: number
): string[] {
  const recentGrowth = ledger.characters
    .flatMap(c => c.growthHistory)
    .filter(g => g.chapter === currentChapter)

  if (recentGrowth.length === 0) return []

  return recentGrowth.map(g =>
    `🔄角色成长: ${g.characterName} ${g.changeDescription}`
  )
}

/**
 * 获取角色当前状态摘要
 */
export function getCharacterStatusSummary(
  ledger: CharacterGrowthLedger,
  characterName: string
): {
  name: string
  currentPersonality: string
  growthCount: number
  lastGrowthChapter?: number
  lastGrowthDescription?: string
} {
  const character = ledger.characters.find(c => c.name === characterName)
  if (!character) {
    return {
      name: characterName,
      currentPersonality: '未知',
      growthCount: 0,
    }
  }

  const lastGrowth = character.growthHistory[character.growthHistory.length - 1]

  return {
    name: character.name,
    currentPersonality: character.currentPersonality,
    growthCount: character.growthHistory.length,
    lastGrowthChapter: lastGrowth?.chapter,
    lastGrowthDescription: lastGrowth?.changeDescription,
  }
}
