// ============================================================
// 墨境提示词系统 — 冷却系统 (Cooling System)
// 功能：跨章追踪技法使用状态，防止短期密集重复
// 版本：v1.0.0
// ============================================================

// ===== 技法类型定义 =====

/** 场景主方法 S1-S6 */
export type SceneMethod = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6'

/** 章末收束 E1-E12 */
export type EndingType = 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6' | 'E7' | 'E8' | 'E9' | 'E10' | 'E11' | 'E12'

/** 钩子类型 H01-H13 */
export type HookType = 'H01' | 'H02' | 'H03' | 'H04' | 'H05' | 'H06' | 'H07' | 'H08' | 'H09' | 'H10' | 'H11' | 'H12' | 'H13'

/** 感官通道 */
export type SenseChannel = 'visual' | 'tactile' | 'auditory' | 'olfactory' | 'gustatory' | 'sixth'

/** 情感颜色 */
export type EmotionColor = 'warm' | 'cold' | 'hot' | 'cool' | 'frustrated'

/** 句式类型 */
export type SentenceStyle = 'parallelism' | 'antithesis' | 'rare'

// ===== 技法使用记录 =====

/** 单次技法使用记录 */
export interface TechniqueUsage {
  /** 技法类型 */
  type: 'scene' | 'ending' | 'hook' | 'sense' | 'emotion' | 'sentence'
  /** 技法ID */
  id: string
  /** 使用章节 */
  chapter: number
  /** 使用时间戳 */
  timestamp: number
}

/** 冷却状态 */
export interface CoolingState {
  /** 场景方法使用记录 */
  scenes: Record<SceneMethod, number[]>  // 章节号数组
  /** 章末收束使用记录 */
  endings: Record<EndingType, number[]>
  /** 钩子类型使用记录 */
  hooks: Record<HookType, number[]>
  /** 感官通道使用记录 */
  senses: Record<SenseChannel, number[]>
  /** 情感颜色序列（近3章） */
  emotions: EmotionColor[]
  /** 句式使用记录 */
  sentences: Record<SentenceStyle, number[]>
  /** 递进判断句使用次数（按章） */
  progressiveJudgment: Record<number, number>
}

// ===== 冷却配置 =====

/** 各技法冷却要求（章数） */
export const COOLING_REQUIREMENTS = {
  scene: 3,      // 场景方法：使用后需冷却3章
  ending: 3,     // 章末收束：同编号≥3章冷却
  hook: 5,       // 钩子类型：使用后需冷却5章
  sense: 3,      // 感官通道：同感官≥3章冷却
  emotion: 3,    // 情感颜色：避免连续3章同色
  sentence: 5,   // 句式类型：使用后需冷却5章
} as const

/** 场景方法互斥规则 */
export const SCENE_EXCLUSIONS: Record<SceneMethod, SceneMethod[]> = {
  S1: [],
  S2: ['S5'],  // S2与S5互斥
  S3: [],
  S4: [],
  S5: ['S2'],  // S5与S2互斥
  S6: [],
}

// ===== 核心函数 =====

/**
 * 创建初始冷却状态
 */
export function createCoolingState(): CoolingState {
  return {
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
  }
}

/**
 * 记录技法使用
 * @param state 当前冷却状态
 * @param usage 使用记录
 * @param chapter 当前章节号
 * @returns 更新后的冷却状态
 */
export function recordUsage(state: CoolingState, usage: TechniqueUsage, chapter: number): CoolingState {
  const newState = { ...state }

  switch (usage.type) {
    case 'scene':
      newState.scenes = {
        ...state.scenes,
        [usage.id as SceneMethod]: [...(state.scenes[usage.id as SceneMethod] || []), chapter],
      }
      break
    case 'ending':
      newState.endings = {
        ...state.endings,
        [usage.id as EndingType]: [...(state.endings[usage.id as EndingType] || []), chapter],
      }
      break
    case 'hook':
      newState.hooks = {
        ...state.hooks,
        [usage.id as HookType]: [...(state.hooks[usage.id as HookType] || []), chapter],
      }
      break
    case 'sense':
      newState.senses = {
        ...state.senses,
        [usage.id as SenseChannel]: [...(state.senses[usage.id as SenseChannel] || []), chapter],
      }
      break
    case 'emotion':
      newState.emotions = [...state.emotions, usage.id as EmotionColor].slice(-3)
      break
    case 'sentence':
      newState.sentences = {
        ...state.sentences,
        [usage.id as SentenceStyle]: [...(state.sentences[usage.id as SentenceStyle] || []), chapter],
      }
      break
  }

  return newState
}

/**
 * 检查技法是否在冷却期
 * @param state 冷却状态
 * @param type 技法类型
 * @param id 技法ID
 * @param currentChapter 当前章节号
 * @returns 是否在冷却期
 */
export function isCooling(
  state: CoolingState,
  type: TechniqueUsage['type'],
  id: string,
  currentChapter: number
): boolean {
  let usageHistory: number[] = []

  switch (type) {
    case 'scene':
      usageHistory = state.scenes[id as SceneMethod] || []
      break
    case 'ending':
      usageHistory = state.endings[id as EndingType] || []
      break
    case 'hook':
      usageHistory = state.hooks[id as HookType] || []
      break
    case 'sense':
      usageHistory = state.senses[id as SenseChannel] || []
      break
    case 'sentence':
      usageHistory = state.sentences[id as SentenceStyle] || []
      break
    case 'emotion':
      // 情感颜色特殊处理：检查近3章是否有相同颜色
      return state.emotions.slice(-3).includes(id as EmotionColor)
  }

  if (usageHistory.length === 0) return false

  const lastUsed = Math.max(...usageHistory)
  const coolingRequired = COOLING_REQUIREMENTS[type]
  const chaptersSinceUse = currentChapter - lastUsed

  return chaptersSinceUse < coolingRequired
}

/**
 * 获取可用的技法列表
 * @param state 冷却状态
 * @param type 技法类型
 * @param currentChapter 当前章节号
 * @returns 可用的技法ID列表
 */
export function getAvailableTechniques(
  state: CoolingState,
  type: TechniqueUsage['type'],
  currentChapter: number
): string[] {
  let allTechniques: string[] = []

  switch (type) {
    case 'scene':
      allTechniques = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']
      break
    case 'ending':
      allTechniques = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10', 'E11', 'E12']
      break
    case 'hook':
      allTechniques = ['H01', 'H02', 'H03', 'H04', 'H05', 'H06', 'H07', 'H08', 'H09', 'H10', 'H11', 'H12', 'H13']
      break
    case 'sense':
      allTechniques = ['visual', 'tactile', 'auditory', 'olfactory', 'gustatory', 'sixth']
      break
    case 'emotion':
      allTechniques = ['warm', 'cold', 'hot', 'cool', 'frustrated']
      break
    case 'sentence':
      allTechniques = ['parallelism', 'antithesis', 'rare']
      break
  }

  return allTechniques.filter(id => !isCooling(state, type, id, currentChapter))
}

/**
 * 检查场景方法互斥
 * @param scene1 场景方法1
 * @param scene2 场景方法2
 * @returns 是否互斥
 */
export function isSceneExclusive(scene1: SceneMethod, scene2: SceneMethod): boolean {
  return SCENE_EXCLUSIONS[scene1]?.includes(scene2) || false
}

/**
 * 获取冷却状态快照（用于A-8状态行）
 * @param state 冷却状态
 * @param currentChapter 当前章节号
 * @returns 格式化的冷却快照
 */
export function getCoolingSnapshot(state: CoolingState, currentChapter: number): string {
  const availableScenes = getAvailableTechniques(state, 'scene', currentChapter)
  const availableEndings = getAvailableTechniques(state, 'ending', currentChapter)
  const availableHooks = getAvailableTechniques(state, 'hook', currentChapter)
  const availableSenses = getAvailableTechniques(state, 'sense', currentChapter)

  return [
    `场景:${availableScenes.join('/')}`,
    `收束:${availableEndings.slice(0, 3).join('/')}${availableEndings.length > 3 ? '...' : ''}`,
    `钩子:${availableHooks.slice(0, 3).join('/')}${availableHooks.length > 3 ? '...' : ''}`,
    `感官:${availableSenses.join('/')}`,
    `情感:${state.emotions.slice(-3).join('→') || '无'}`,
  ].join(' | ')
}

/**
 * 获取冷却违规详情（用于自检报告）
 * @param state 冷却状态
 * @param currentChapter 当前章节号
 * @returns 违规项列表
 */
export function getCoolingViolations(state: CoolingState, currentChapter: number): string[] {
  const violations: string[] = []

  // 检查场景方法
  for (const scene of ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'] as SceneMethod[]) {
    if (isCooling(state, 'scene', scene, currentChapter)) {
      const lastUsed = Math.max(...(state.scenes[scene] || []))
      violations.push(`场景${scene}：已冷却${currentChapter - lastUsed}章，需${COOLING_REQUIREMENTS.scene}章`)
    }
  }

  // 检查钩子类型
  for (const hook of ['H01', 'H02', 'H03', 'H04', 'H05', 'H06', 'H07', 'H08', 'H09', 'H10', 'H11', 'H12', 'H13'] as HookType[]) {
    if (isCooling(state, 'hook', hook, currentChapter)) {
      const lastUsed = Math.max(...(state.hooks[hook] || []))
      violations.push(`钩子${hook}：已冷却${currentChapter - lastUsed}章，需${COOLING_REQUIREMENTS.hook}章`)
    }
  }

  // 检查情感颜色连续
  if (state.emotions.length >= 3) {
    const last3 = state.emotions.slice(-3)
    if (last3[0] === last3[1] && last3[1] === last3[2]) {
      violations.push(`情感颜色连续3章同色：${last3[0]}`)
    }
  }

  return violations
}

/**
 * 验证场景方法选择（含互斥检查）
 * @param selectedScene 选择的场景方法
 * @param lastUsedScene 上一章使用的场景方法
 * @param state 冷却状态
 * @param currentChapter 当前章节号
 * @returns 验证结果
 */
export function validateSceneSelection(
  selectedScene: SceneMethod,
  lastUsedScene: SceneMethod | null,
  state: CoolingState,
  currentChapter: number
): {
  valid: boolean
  reason?: string
  suggestedAlternative?: SceneMethod
} {
  // 检查冷却期
  if (isCooling(state, 'scene', selectedScene, currentChapter)) {
    const lastUsed = Math.max(...(state.scenes[selectedScene] || []))
    const remaining = COOLING_REQUIREMENTS.scene - (currentChapter - lastUsed)
    return {
      valid: false,
      reason: `${selectedScene} 仍在冷却期（还需${remaining}章）`,
      suggestedAlternative: getAvailableTechniques(state, 'scene', currentChapter)[0] as SceneMethod,
    }
  }

  // 检查互斥
  if (lastUsedScene && isSceneExclusive(selectedScene, lastUsedScene)) {
    return {
      valid: false,
      reason: `${selectedScene} 与上一章的 ${lastUsedScene} 互斥（S2/S5不能连续使用）`,
      suggestedAlternative: getAvailableTechniques(state, 'scene', currentChapter)
        .find(s => !isSceneExclusive(s as SceneMethod, lastUsedScene)) as SceneMethod,
    }
  }

  return { valid: true }
}

