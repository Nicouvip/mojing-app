export interface Project {
  id: string
  name: string
  genre: string
  description: string
  createdAt: number
  updatedAt: number
  deletedAt?: number | null
  chapterCount: number
  totalWords: number
  /** 所属用户 ID（用于 Supabase 行级隔离） */
  userId?: string
}

export interface Character {
  name: string
  type: '主角' | '配角' | '反派' | '次要角色' | '客串'
  description: string
}

export interface Chapter {
  id: string
  projectId: string
  title: string
  content: string
  order: number
  wordCount: number
  createdAt: number
  updatedAt: number
  deletedAt?: number | null
  status: 'draft' | 'writing' | 'review' | 'completed'
  /** 所属卷 ID，空字符串表示未分类 */
  volumeId?: string
  /** 所属用户 ID（用于 Supabase 行级隔离） */
  userId?: string
}

export interface Volume {
  id: string
  projectId: string
  name: string
  order: number
  createdAt: number
  updatedAt: number
}

// ═══════════════════════════════════════════
// P1 新增：写作引擎数据模型
// 来源：V10.0.2 模板 + 5个知识库
// ═══════════════════════════════════════════

/** 角色成长记录 */
export interface CharacterGrowth {
  id: string
  characterId: string
  trigger: 'different_choice' | 'value_shift' | 'relationship_change' | 'ability_identity_change'
  changeDescription: string
  chapter: number
  timestamp: number
}

/** 完整角色档案 — 扩展原有 Character */
export interface CharacterProfile {
  id: string
  projectId: string
  name: string
  type: '主角' | '配角' | '反派' | '次要角色' | '客串'
  // 核心设定
  corePersonality: string
  speakingStyle: string
  coreDesire: string
  coreObstacle: string
  // 身体描写
  bodyHabits: string[]
  // 描写指纹
  sensoryChannels: string[]
  imageryTypes: string[]
  metaphorDomains: string[]
  // 成长记录
  initialPersonality: string
  currentPersonality: string
  growthHistory: CharacterGrowth[]
  createdAt: number
  updatedAt: number
}

/** 世界观设定 */
export interface WorldSetting {
  id: string
  projectId: string
  category: 'time_location' | 'power_system' | 'rules' | 'custom'
  title: string
  content: string
  order: number
  createdAt: number
  updatedAt: number
}

/** 大纲节点 */
export interface Outline {
  id: string
  projectId: string
  chapterOrder: number
  coreEvent: string
  functionTag: string
  emotionArc: string
  conflictLevel: 'L1' | 'L2' | 'L3' | 'L4' | 'L5'
  foreshadowsToPlant: string[]
  foreshadowsToResolve: string[]
  characters: string[]
  createdAt: number
  updatedAt: number
}

/** 伏笔 */
export interface Foreshadow {
  id: string
  projectId: string
  content: string
  importance: 'major' | 'minor'
  status: 'active' | 'resolved' | 'abandoned'
  chapterPlanted: number
  chapterPlannedResolution?: number
  chapterResolved?: number
  relatedCharacters: string[]
  createdAt: number
  updatedAt: number
}

/** 冷却状态 — 按项目存储 */
export interface CoolingState {
  id: string
  projectId: string
  senses: Record<string, number[]>
  sentences: Record<string, number[]>
  scenes: Record<string, number[]>
  endings: Record<string, number[]>
  hooks: Record<string, number[]>
  emotions: string[]
  progressiveJudgment: Record<number, number>
  updatedAt: number
}

/** 章末自检报告 */
export interface ChapterReport {
  id: string
  projectId: string
  chapterId: string
  chapterOrder: number
  score: number
  compliant: boolean
  forbiddenA: number
  forbiddenB: number
  forbiddenC: number
  forbiddenD: number
  bodyDensity: number
  openingHook: boolean
  items: ChapterCheckItem[]
  aiResults: Record<number, { status: string; reason: string; detail: string }> | null
  reportLine: string
  createdAt: number
}

/** 章节检查项 */
export interface ChapterCheckItem {
  id: number
  name: string
  status: 'pass' | 'warning' | 'fail'
  detail: string
  value?: string | number
}

/** 写作计划卡片 */
export interface WritingPlan {
  id: string
  projectId: string
  chapterOrder: number
  conflictLevel: 'L1' | 'L2' | 'L3' | 'L4' | 'L5'
  style: '冷峻白描' | '快消口语' | '感官极值'
  sceneMethod: string
  sensoryAnchors: string[]
  bodyAnchors: string[]
  endingType: string
  hookType: string
  specialTechniques: string[]
  statusLine: string
  createdAt: number
}
