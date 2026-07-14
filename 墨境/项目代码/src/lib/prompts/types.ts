// ============================================================
// 墨境提示词系统 — 核心类型定义
// 版本：v1.0.0
// ============================================================

/**
 * 提示词层叠层级（从底层到顶层）
 * Layer 1 → 系统铁律层（A-1 全域铁律、防守规则、禁用词提醒）
 * Layer 2 → 功能指令层（续写/润色/扩写/脑洞的具体指令）
 * Layer 3 → 上下文注入层（前文、用户指令、风格偏好）
 * Layer 4 → 输出约束层（格式要求、字数限制）
 */
export type PromptLayer =
  | 'system_iron_rules'    // L1 铁律
  | 'function_instruction' // L2 功能指令
  | 'context_injection'    // L3 上下文
  | 'output_constraints'   // L4 输出约束

/**
 * 提示词模板定义
 */
export interface PromptTemplate {
  /** 模板唯一标识 */
  id: string
  /** 语义化版本号 */
  version: string
  /** 模板名称（人类可读） */
  name: string
  /** 模板描述 */
  description: string
  /** 模板类型 */
  type: ToolType
  /** 各层级的提示词内容，按层级顺序组合 */
  layers: Partial<Record<PromptLayer, string>>
  /** 默认生成参数 */
  defaultParams: GenerationParams
  /** 适用题材列表（空=通用） */
  genres: string[]
  /** 创建时间戳 */
  createdAt: number
  /** 最后更新时间戳 */
  updatedAt: number
  /** 变更日志 */
  changelog: string[]
}

/**
 * 冲突强度分级（P0-2）
 * 源规则：KB2「冲突强度分级机制详表」
 * 控制句长、句号换行、身体密度、形容词密度等参数
 */
export type ConflictLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5'

/**
 * 写作风格（P1-7 预埋）
 * 源规则：小墨V10.0.2「零-3 风格规则优先级」
 */
export type WritingStyle = '冷峻白描' | '快消口语' | '感官极值'

/**
 * 冲突强度参数配置
 * 每个级别对句子特征、身体密度、换行规则等有不同要求
 */
export interface ConflictLevelConfig {
  level: ConflictLevel
  name: string
  description: string
  /** 句子长度偏好 */
  sentenceLength: '可长' | '正常' | '短句倾向' | '强制短句' | '极短句'
  /** 句号后是否换行 */
  lineBreak: '不换' | '建议' | '强制'
  /** 身体密度下限（百分比） */
  bodyDensityMin: number
  /** 形容词密度限制 */
  adjectiveLimit: '可自由' | '正常' | '克制' | '禁用装饰性' | '零容忍'
  /** 典型场景 */
  typicalScenes: string[]
}

/** 冲突强度配置表（5级） */
export const CONFLICT_LEVELS: Record<ConflictLevel, ConflictLevelConfig> = {
  L1: {
    level: 'L1',
    name: '日常/透气',
    description: '日常过渡、放松、环境描写、内心活动',
    sentenceLength: '可长',
    lineBreak: '不换',
    bodyDensityMin: 30,
    adjectiveLimit: '可自由',
    typicalScenes: ['日常过渡', '放松', '环境描写', '内心活动'],
  },
  L2: {
    level: 'L2',
    name: '铺垫/对话',
    description: '信息传递、人物互动、计划讨论、情感交流',
    sentenceLength: '正常',
    lineBreak: '不换',
    bodyDensityMin: 40,
    adjectiveLimit: '正常',
    typicalScenes: ['信息传递', '人物互动', '计划讨论', '情感交流'],
  },
  L3: {
    level: 'L3',
    name: '小冲突/悬念',
    description: '争执、发现线索、紧张对峙',
    sentenceLength: '短句倾向',
    lineBreak: '建议',
    bodyDensityMin: 50,
    adjectiveLimit: '克制',
    typicalScenes: ['争执', '发现线索', '紧张对峙'],
  },
  L4: {
    level: 'L4',
    name: '大冲突/爆发',
    description: '战斗、情感爆发、激烈争吵',
    sentenceLength: '强制短句',
    lineBreak: '强制',
    bodyDensityMin: 55,
    adjectiveLimit: '禁用装饰性',
    typicalScenes: ['战斗', '情感爆发', '激烈争吵'],
  },
  L5: {
    level: 'L5',
    name: '高潮/转折',
    description: '生死抉择、重大揭秘、终极对抗',
    sentenceLength: '极短句',
    lineBreak: '强制',
    bodyDensityMin: 60,
    adjectiveLimit: '零容忍',
    typicalScenes: ['生死抉择', '重大揭秘', '终极对抗'],
  },
}

/**
 * 工具类型
 */
export type ToolType =
  | 'continue'   // 续写
  | 'polish'     // 润色
  | 'expand'     // 扩写
  | 'brainstorm' // 脑洞喷射

/**
 * AI 生成参数
 */
export interface GenerationParams {
  temperature: number
  maxTokens: number
  model?: string
}

/**
 * Prompt 构建选项
 * 调用方传入的运行时参数，注入到模板中
 */
export interface BuildOptions {
  /** 模板 ID */
  templateId: string
  /** 工具类型 */
  type: ToolType
  /** 上下文/前文内容（续写/扩写用） */
  context?: string
  /** 用户额外指令 */
  instruction?: string
  /** 题材（脑洞喷射用） */
  genre?: string
  /** 需要生成的脑洞数量（脑洞喷射用） */
  count?: number
  /** 覆盖默认生成参数 */
  params?: Partial<GenerationParams>
  /** 是否启用铁律层（默认 true） */
  enableIronRules?: boolean
  /** 是否启用 A-2 禁用词提醒（默认 true） */
  enableForbiddenWordsReminder?: boolean
  /** P0-2: 冲突强度级别（L1-L5），影响句长/换行/身体密度等参数 */
  conflictLevel?: ConflictLevel
  /** P1-7: 写作风格（影响豁免/强化规则） */
  style?: WritingStyle
  /** P1-8: 章节索引（用于黄金三章模式判断） */
  chapterIndex?: number
  /** P1-9: 章末收束提示（从E1-E12中选择） */
  endingHint?: string
  /** P2-1: 当前场景已使用的感官通道列表 */
  usedSenses?: string[]
  /** P2-1: 每场景最少感官数（默认2） */
  requiredSensesCount?: number

  // ═══ P2-6: L3 上下文注入参数 ═══
  /** 角色档案（从 DB 读取，按出场角色筛选） */
  characterProfiles?: Array<{
    name: string
    corePersonality: string
    speakingStyle: string
    bodyHabits: string[]
    sensoryChannels: string[]
  }>
  /** 世界观设定（从 DB 读取） */
  worldSettings?: Array<{
    title: string
    content: string
  }>
  /** 冷却状态（从 DB 读取） */
  coolingState?: {
    scenes: Record<string, number[]>
    endings: Record<string, number[]>
    hooks: Record<string, number[]>
    senses: Record<string, number[]>
    emotions: string[]
  } | null
  /** 活跃伏笔（从 DB 读取） */
  activeForeshadows?: Array<{
    content: string
    importance: string
    chapterPlanted: number
  }>
  /** 上章检测结果（从 DB 读取） */
  lastReport?: {
    score: number
    compliant: boolean
    forbiddenA: number
    forbiddenB: number
    forbiddenC: number
    forbiddenD: number
    bodyDensity: number
    reportLine: string
  } | null
}

/**
 * 模版注册条目
 */
export interface TemplateEntry {
  template: PromptTemplate
  active: boolean
  activatedAt: number
  deactivatedAt?: number
}

/**
 * Prompt 构建结果
 */
export interface BuildResult {
  /** 组装后的完整 Prompt 文本 */
  prompt: string
  /** 使用的模板 ID */
  templateId: string
  /** 模板版本 */
  templateVersion: string
  /** 实际使用的参数 */
  params: GenerationParams
  /** 各层级的文本（用于调试/展示） */
  layerTexts: Record<PromptLayer, string>
}

// ============================================================
// P2-2: 信息传达12种 + 信息渗透5法
// 源规则：KB1「工具E：信息传达12种 + 信息渗透五法」
// ============================================================

/** 信息传达方法 */
export type InfoDeliveryMethod =
  | 'P1'   // 偶然发现
  | 'P2'   // 读者先于角色
  | 'P3'   // 环境间接揭示
  | 'P4'   // 行为推测
  | 'P5'   // 误解解除
  | 'P6'   // 延迟揭示
  | 'P7'   // 对话信息差
  | 'P8'   // 被迫展示
  | 'P9'   // 矛盾信息
  | 'P10'  // 角色回避
  | 'P11'  // 错收信息
  | 'P12'  // 信息被篡改

/** 信息渗透方法 */
export type InfoPenetrationMethod =
  | 'body_action'      // 身体动作渗透
  | 'environment'      // 环境细节渗透
  | 'dialogue_burr'    // 对话毛边渗透
  | 'repeated_image'   // 重复意象渗透
  | 'meaningless'      // 无意义细节渗透

/** 信息传达方法配置 */
export interface InfoDeliveryConfig {
  id: InfoDeliveryMethod
  name: string
  desc: string
  example: string
}

/** 信息渗透方法配置 */
export interface InfoPenetrationConfig {
  id: InfoPenetrationMethod
  name: string
  desc: string
  example: string
}

/** 信息传达12种配置 */
export const INFO_DELIVERY_METHODS: InfoDeliveryConfig[] = [
  {
    id: 'P1',
    name: '偶然发现',
    desc: '角色在执行任务或日常生活中偶然发现线索',
    example: '倒立时看到监控编号',
  },
  {
    id: 'P2',
    name: '读者先于角色',
    desc: '读者知道的信息，角色尚不知道，制造紧张或喜剧效果',
    example: '读者知道凶手是谁，但主角还在调查',
  },
  {
    id: 'P3',
    name: '环境间接揭示',
    desc: '通过环境细节间接传递信息，不靠对话或文字',
    example: '墙上的涂鸦痕迹暗示有人来过',
  },
  {
    id: 'P4',
    name: '行为推测',
    desc: '角色通过观察他人行为推测信息',
    example: '从老周手抖推测他曾经也是宿主',
  },
  {
    id: 'P5',
    name: '误解解除',
    desc: '角色之前的误解在本章被纠正',
    example: '原来他不是凶手，而是受害者',
  },
  {
    id: 'P6',
    name: '延迟揭示',
    desc: '先给结果或画面，延后再揭示背后的原因或信息',
    example: '先写角色哭泣，后文才揭示原因',
  },
  {
    id: 'P7',
    name: '对话信息差',
    desc: '两个角色对话时，各自掌握不同信息，造成的冲突或悬念',
    example: 'A知道真相但B不知道，对话中产生张力',
  },
  {
    id: 'P8',
    name: '被迫展示',
    desc: '角色被迫在某种压力下展示信息',
    example: '为了完成任务必须公开直播',
  },
  {
    id: 'P9',
    name: '矛盾信息',
    desc: '不同来源提供的信息互相矛盾，角色需要判断真假',
    example: '两个人对同一事件的描述完全相反',
  },
  {
    id: 'P10',
    name: '角色回避',
    desc: '角色主动回避某个信息或不想知道某些事',
    example: '他不想知道那个人的过去',
  },
  {
    id: 'P11',
    name: '错收信息',
    desc: '角色收到了本不该发给他的信息',
    example: '收到了发给别人的短信',
  },
  {
    id: 'P12',
    name: '信息被篡改',
    desc: '角色获得的信息经过篡改，需要在后续发现真相',
    example: '监控录像被剪辑过',
  },
]

/** 信息渗透5法配置 */
export const INFO_PENETRATION_METHODS: InfoPenetrationConfig[] = [
  {
    id: 'body_action',
    name: '身体动作渗透',
    desc: '将全局情报转化为当前角色的身体反应',
    example: '彩姐看了他一眼，那眼神像是认识了不止六年',
  },
  {
    id: 'environment',
    name: '环境细节渗透',
    desc: '将暗线线索嵌入环境描写',
    example: '监控探头转了一下，镜头里编号闪了闪，然后灭掉了',
  },
  {
    id: 'dialogue_burr',
    name: '对话毛边渗透',
    desc: '让角色在闲聊中无意间触及暗线关键词但不展开',
    example: '"那时候你还没来公司呢"，不解释',
  },
  {
    id: 'repeated_image',
    name: '重复意象渗透',
    desc: '用不起眼的物品或动作在不同章节中重复出现',
    example: '银杏叶、橡皮鸭',
  },
  {
    id: 'meaningless',
    name: '无意义细节渗透',
    desc: '将暗线信息伪装成无意义细节埋入',
    example: '老周手抖，后期揭示是系统后遗症',
  },
]

/**
 * 题材定义（用于脑洞喷射等工具）
 */
export const GENRE_MAP: Record<string, string> = {
  '通用': '网文创作',
  '悬疑': '悬疑推理类网文',
  '都市': '都市现实类网文',
  '玄幻': '玄幻仙侠类网文',
  '言情': '言情情感类网文',
  '科幻': '科幻末世类网文',
} as const

// ============================================================
// P1-3: 题材参数映射表
// 源规则：KB2「工具S：题材参数映射表」
// 5种题材×20项参数，影响写作规则的自动调整
// ============================================================

/** 题材类型 */
export type Genre = '通用' | '悬疑' | '都市' | '玄幻' | '言情'

/** 题材参数配置 */
export interface GenreParams {
  /** 题材名称 */
  genre: Genre

  // === 55字生死线 ===
  /** 55字生死线放宽条件 */
  openingRule: string
  /** 开篇检查字数 */
  openingLength: number

  // === 身体密度 ===
  /** L1-L2身体密度下限（百分比） */
  bodyDensityLow: number
  /** L3身体密度下限 */
  bodyDensityMid: number
  /** L4-L5身体密度下限 */
  bodyDensityHigh: number

  // === 句号换行 ===
  /** L1-L2句号换行 */
  lineBreakLow: '不换' | '建议' | '强制'
  /** L3句号换行 */
  lineBreakMid: '不换' | '建议' | '强制'
  /** L4-L5句号换行 */
  lineBreakHigh: '不换' | '建议' | '强制'

  // === 连接词限制 ===
  /** L1-L2连接词限制 */
  conjunctionLow: '放宽' | '标准' | '完全放开'
  /** L3-L5连接词限制 */
  conjunctionHigh: string

  // === 三不原则例外 ===
  /** 三不原则例外说明 */
  threeNoExceptions: string

  // === 粗糙原则例外 ===
  /** 粗糙原则例外说明 */
  roughnessExceptions: string

  // === 视角切换 ===
  /** 视角切换规则 */
  perspectiveSwitch: '禁止' | '允许同章双视角≤2次'

  // === 第六识冷却 ===
  /** 第六识"知"冷却章数 */
  sixthSenseCooling: number

  // === 无意义细节 ===
  /** 每章无意义要求数量 */
  meaninglessDetailsPerChapter: number

  // === 情感颜色偏好 ===
  /** 情感颜色偏好 */
  emotionColorPreference: string

  // === 收束类型偏好 ===
  /** 章末收束类型偏好 */
  endingPreference: string

  // === 场景方法偏好 ===
  /** 场景方法偏好 */
  sceneMethodPreference: string

  // === 金手指背景绑定 ===
  /** 是否启用金手指背景绑定检查 */
  goldenFingerBinding: boolean

  // === 伏笔回收时限 ===
  /** 重要伏笔回收时限（章） */
  foreshadowMajorLimit: number
  /** 次要伏笔回收时限（章） */
  foreshadowMinorLimit: number

  // === 活跃伏笔上限 ===
  /** 短篇活跃伏笔上限 */
  foreshadowMaxShort: number
  /** 中篇活跃伏笔上限 */
  foreshadowMaxMedium: number
  /** 长篇活跃伏笔上限 */
  foreshadowMaxLong: number
}

/**
 * 题材参数配置表（5种题材）
 * 源规则：KB2「工具S：题材参数映射表」
 */
export const GENRE_PARAMS: Record<Genre, GenreParams> = {
  通用: {
    genre: '通用',
    openingRule: '前55字必须出现冲突/悬念/动作',
    openingLength: 55,
    bodyDensityLow: 40,
    bodyDensityMid: 50,
    bodyDensityHigh: 55,
    lineBreakLow: '不换',
    lineBreakMid: '建议',
    lineBreakHigh: '强制',
    conjunctionLow: '放宽',
    conjunctionHigh: '≤3次/章',
    threeNoExceptions: '无',
    roughnessExceptions: '无',
    perspectiveSwitch: '禁止',
    sixthSenseCooling: 3,
    meaninglessDetailsPerChapter: 1,
    emotionColorPreference: '全色',
    endingPreference: '全类型',
    sceneMethodPreference: '均衡',
    goldenFingerBinding: false,
    foreshadowMajorLimit: 30,
    foreshadowMinorLimit: 10,
    foreshadowMaxShort: 3,
    foreshadowMaxMedium: 5,
    foreshadowMaxLong: 10,
  },

  悬疑: {
    genre: '悬疑',
    openingRule: '前150字含反常细节即可放宽',
    openingLength: 150,
    bodyDensityLow: 40,
    bodyDensityMid: 50,
    bodyDensityHigh: 55,
    lineBreakLow: '不换',
    lineBreakMid: '强制',
    lineBreakHigh: '强制',
    conjunctionLow: '标准',
    conjunctionHigh: '≤3次/章',
    threeNoExceptions: '无',
    roughnessExceptions: '推理过程不压缩',
    perspectiveSwitch: '禁止',
    sixthSenseCooling: 2,  // 悬疑题材第六识冷却更短
    meaninglessDetailsPerChapter: 1,
    emotionColorPreference: '偏冷/凉',
    endingPreference: 'E-6反转/E-12预示优先',
    sceneMethodPreference: 'S4时间/S5物品优先',
    goldenFingerBinding: false,
    foreshadowMajorLimit: 30,
    foreshadowMinorLimit: 10,
    foreshadowMaxShort: 3,
    foreshadowMaxMedium: 5,
    foreshadowMaxLong: 10,
  },

  都市: {
    genre: '都市',
    openingRule: '前55字必须出现冲突/悬念/动作',
    openingLength: 55,
    bodyDensityLow: 25,  // 都市题材身体密度下限更低
    bodyDensityMid: 40,
    bodyDensityHigh: 55,
    lineBreakLow: '不换',
    lineBreakMid: '建议',
    lineBreakHigh: '强制',
    conjunctionLow: '完全放开',
    conjunctionHigh: '≤3次/章',
    threeNoExceptions: '无',
    roughnessExceptions: '经营过程不压缩',
    perspectiveSwitch: '禁止',
    sixthSenseCooling: 3,
    meaninglessDetailsPerChapter: 2,  // 都市题材更多无意义细节
    emotionColorPreference: '偏暖/凉',
    endingPreference: 'E-11情绪余味/E-5意象优先',
    sceneMethodPreference: 'S3对话/S6意识优先',
    goldenFingerBinding: false,
    foreshadowMajorLimit: 30,
    foreshadowMinorLimit: 10,
    foreshadowMaxShort: 3,
    foreshadowMaxMedium: 5,
    foreshadowMaxLong: 10,
  },

  玄幻: {
    genre: '玄幻',
    openingRule: '前55字必须出现冲突/悬念/动作',
    openingLength: 55,
    bodyDensityLow: 35,
    bodyDensityMid: 50,
    bodyDensityHigh: 55,
    lineBreakLow: '不换',
    lineBreakMid: '不换',  // 玄幻L3不强制换行
    lineBreakHigh: '强制',
    conjunctionLow: '标准',
    conjunctionHigh: '≤3次/章',
    threeNoExceptions: '无',
    roughnessExceptions: '设定说明可保留',
    perspectiveSwitch: '允许同章双视角≤2次',  // 玄幻允许双视角
    sixthSenseCooling: 3,
    meaninglessDetailsPerChapter: 1,
    emotionColorPreference: '偏热/苍凉',
    endingPreference: 'E-10环境/E-12预示优先',
    sceneMethodPreference: 'S1身体/S4时间优先',
    goldenFingerBinding: true,  // 玄幻启用金手指背景绑定
    foreshadowMajorLimit: 30,
    foreshadowMinorLimit: 10,
    foreshadowMaxShort: 3,
    foreshadowMaxMedium: 5,
    foreshadowMaxLong: 10,
  },

  言情: {
    genre: '言情',
    openingRule: '前100字含情感悬念即可放宽',
    openingLength: 100,
    bodyDensityLow: 20,  // 言情身体密度下限最低
    bodyDensityMid: 40,
    bodyDensityHigh: 55,
    lineBreakLow: '不换',
    lineBreakMid: '不换',  // 言情L3不强制换行
    lineBreakHigh: '建议',
    conjunctionLow: '完全放开',
    conjunctionHigh: '≤3次/章',
    threeNoExceptions: 'L1-L2可总结情绪≤2次/章，科幻设定交代不视为解释',
    roughnessExceptions: '情感铺垫不压缩',
    perspectiveSwitch: '禁止',
    sixthSenseCooling: 3,
    meaninglessDetailsPerChapter: 2,  // 言情更多无意义细节
    emotionColorPreference: '偏暖/凉',
    endingPreference: 'E-4沉默/E-11情绪余味优先',
    sceneMethodPreference: 'S3对话/S6意识优先',
    goldenFingerBinding: false,
    foreshadowMajorLimit: 30,
    foreshadowMinorLimit: 10,
    foreshadowMaxShort: 3,
    foreshadowMaxMedium: 5,
    foreshadowMaxLong: 10,
  },
}

/**
 * 获取题材参数
 * @param genre 题材名称
 * @returns 题材参数配置
 */
export function getGenreParams(genre: string): GenreParams {
  return GENRE_PARAMS[genre as Genre] || GENRE_PARAMS['通用']
}

/**
 * 获取题材特定的冲突强度配置
 * @param genre 题材
 * @param level 冲突级别
 * @returns 融合了题材参数的冲突强度配置
 */
export function getConflictLevelWithGenre(genre: string, level: ConflictLevel): ConflictLevelConfig & { genreParams: GenreParams } {
  const genreParams = getGenreParams(genre)
  const levelConfig = CONFLICT_LEVELS[level]

  return {
    ...levelConfig,
    genreParams,
  }
}

// ============================================================
// P2-5: 极端人设四维设计
// 源规则：KB4「工具W：极端人设四维设计」
// 身份→性格→思维行为模式→语言特征的因果链
// ============================================================

/** 极端人设四维 */
export interface CharacterExtreme {
  /** 角色名称 */
  name: string
  /** 第一维：身份（socioeconomic status + 基本信息 + 过去/现在处境） */
  identity: string
  /** 第二维：性格（与处境相关，但异于常人，有故事性） */
  personality: string
  /** 第三维：思维行为模式（因为性格，所以遇事会怎样思考和行动） */
  thinkingPattern: string
  /** 第四维：语言特征（因为常做某些行为，所以说话总是某种特征） */
  speakingStyle: string
  /** 合理性说明（为什么这个极端设定是合理的） */
 合理性: string
}

/**
 * 创建极端人设
 * @param name 角色名称
 * @param identity 身份描述
 * @param personality 性格描述
 * @param thinkingPattern 思维行为模式
 * @param speakingStyle 语言特征
 * @param rationale 合理性说明
 * @returns 极端人设对象
 */
export function createCharacterExtreme(
  name: string,
  identity: string,
  personality: string,
  thinkingPattern: string,
  speakingStyle: string,
  rationale: string
): CharacterExtreme {
  return {
    name,
    identity,
    personality,
    thinkingPattern,
    speakingStyle,
    合理性: rationale,
  }
}

/**
 * 格式化极端人设为文本（用于prompt注入）
 */
export function formatCharacterExtreme(character: CharacterExtreme): string {
  return `【极端人设：${character.name}】
一、身份：${character.identity}
二、性格：${character.personality}
三、思维行为模式：${character.thinkingPattern}
四、语言特征：${character.speakingStyle}
合理性：${character.合理性}`
}

// ============================================================
// P2-6: 救猫咪10种
// 源规则：KB4「工具Z：救猫咪·开场共情锚点技巧」
// 10种让读者在开篇就喜欢/心疼主角的方法
// ============================================================

/** 救猫咪类型 */
export type SaveTheCatType =
  | 'save_cat'           // 救一只猫
  | 'misunderstood'      // 被误解的善良
  | 'professional'       // 专业结果展示
  | 'self_deprecation'   // 自嘲式幽默
  | 'unfinished_farewell' // 未完成的告别
  | 'silent_guardian'    // 默默的守护
  | 'unfair_punishment'  // 不公平的惩罚
  | 'taking_blame'       // 代人受过
  | 'against_current'    // 逆流而行
  | 'original_dream'     // 最初的梦想

/** 救猫咪配置 */
export interface SaveTheCatConfig {
  id: SaveTheCatType
  name: string
  desc: string
  example: string
}

/** 救猫咪10种配置 */
export const SAVE_THE_CAT_METHODS: SaveTheCatConfig[] = [
  {
    id: 'save_cat',
    name: '救一只猫',
    desc: '主角对弱小者施以援手',
    example: '他蹲下来，把那只淋雨的流浪猫抱进怀里',
  },
  {
    id: 'misunderstood',
    name: '被误解的善良',
    desc: '主角做了好事却被误认为是坏事',
    example: '他扶起摔倒的老人，却被路人拍下来发到网上骂',
  },
  {
    id: 'professional',
    name: '专业结果展示',
    desc: '不展示技能推导过程，只展示技能造成的震撼结果',
    example: '一刀斩断瀑布，而非讲解刀法心诀',
  },
  {
    id: 'self_deprecation',
    name: '自嘲式幽默',
    desc: '主角对自己的窘境开涮，显得不卑不亢',
    example: '"我这个人吧，穷得就剩骨气了"',
  },
  {
    id: 'unfinished_farewell',
    name: '未完成的告别',
    desc: '主角心里有一个来不及说的再见',
    example: '他站在墓碑前，想说的话都变成了沉默',
  },
  {
    id: 'silent_guardian',
    name: '默默的守护',
    desc: '主角在无人知晓处做一件温柔的事',
    example: '他每天深夜给那只野猫留一碗饭，从不让任何人知道',
  },
  {
    id: 'unfair_punishment',
    name: '不公平的惩罚',
    desc: '主角承受了不该他承受的代价',
    example: '明明是别人的错，他却替人背了锅',
  },
  {
    id: 'taking_blame',
    name: '代人受过',
    desc: '主角替别人扛下责任',
    example: '"这事是我干的"，他说这话时眼睛都没眨一下',
  },
  {
    id: 'against_current',
    name: '逆流而行',
    desc: '所有人都在做一件事，主角做相反的正确的事',
    example: '所有人都在逃，只有他往回走',
  },
  {
    id: 'original_dream',
    name: '最初的的梦想',
    desc: '主角有一个纯真的、与现实反差极大的梦想',
    example: '他想当个宇航员，但现在只是个送外卖的',
  },
]

/**
 * 获取救猫咪方法配置
 */
export function getSaveTheCatMethod(id: SaveTheCatType): SaveTheCatConfig | undefined {
  return SAVE_THE_CAT_METHODS.find(m => m.id === id)
}

/**
 * 格式化救猫咪方法为文本
 */
export function formatSaveTheCatMethod(method: SaveTheCatConfig): string {
  return `【${method.name}】${method.desc}
例：${method.example}`
}

// ============================================================
// P2-7: 英雄之旅12阶段
// 源规则：KB4「工具AA：英雄之旅12阶段」
// 叙事结构诊断工具
// ============================================================

/** 英雄之旅阶段 */
export type HeroJourneyStage =
  | 'ordinary_world'      // 1. 平凡世界
  | 'call_to_adventure'   // 2. 冒险召唤
  | 'refusal_of_call'     // 3. 拒绝召唤
  | 'meeting_mentor'      // 4. 遇见导师
  | 'crossing_threshold'  // 5. 跨越第一道门槛
  | 'tests_allies_enemies' // 6. 考验、盟友、敌人
  | 'approach_cave'       // 7. 接近最深的洞穴
  | 'ordeal'              // 8. 磨难
  | 'reward'              // 9. 奖励（掌握宝剑）
  | 'road_back'           // 10. 返回之路
  | 'resurrection'        // 11. 复活
  | 'return_with_elixir'  // 12. 携万能药回归

/** 英雄之旅阶段配置 */
export interface HeroJourneyConfig {
  stage: HeroJourneyStage
  order: number
  name: string
  desc: string
}

/** 英雄之旅12阶段配置 */
export const HERO_JOURNEY_STAGES: HeroJourneyConfig[] = [
  { stage: 'ordinary_world', order: 1, name: '平凡世界', desc: '主角的日常生活，展示他原本的世界' },
  { stage: 'call_to_adventure', order: 2, name: '冒险召唤', desc: '收到召唤，打破日常平衡' },
  { stage: 'refusal_of_call', order: 3, name: '拒绝召唤', desc: '主角犹豫、恐惧、拒绝冒险' },
  { stage: 'meeting_mentor', order: 4, name: '遇见导师', desc: '遇到给予指导或工具的人' },
  { stage: 'crossing_threshold', order: 5, name: '跨越第一道门槛', desc: '正式进入冒险世界' },
  { stage: 'tests_allies_enemies', order: 6, name: '考验、盟友、敌人', desc: '面对挑战，结识盟友，遭遇敌人' },
  { stage: 'approach_cave', order: 7, name: '接近最深的洞穴', desc: '准备面对最大的恐惧' },
  { stage: 'ordeal', order: 8, name: '磨难', desc: '面对死亡或最大的失败' },
  { stage: 'reward', order: 9, name: '奖励（掌握宝剑）', desc: '获得胜利或重要物品' },
  { stage: 'road_back', order: 10, name: '返回之路', desc: '踏上归途，可能有追击' },
  { stage: 'resurrection', order: 11, name: '复活', desc: '最终考验，主角获得重生' },
  { stage: 'return_with_elixir', order: 12, name: '携万能药回归', desc: '带着收获回到平凡世界' },
]

/**
 * 获取英雄之旅阶段配置
 */
export function getHeroJourneyStage(stage: HeroJourneyStage): HeroJourneyConfig | undefined {
  return HERO_JOURNEY_STAGES.find(s => s.stage === stage)
}

/**
 * 格式化英雄之旅阶段为文本
 */
export function formatHeroJourneyStage(config: HeroJourneyConfig): string {
  return `${config.order}. ${config.name}：${config.desc}`
}

/**
 * 格式化完整英雄之旅为文本
 */
export function formatHeroJourneyFull(): string {
  return HERO_JOURNEY_STAGES
    .map(s => `${s.order}. ${s.name} — ${s.desc}`)
    .join('\n')
}

