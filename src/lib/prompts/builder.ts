// ============================================================
// 墨境提示词系统 — Prompt 构建器 (Builder)
// 功能：从模板按层次组合 Prompt，注入运行时变量，组装最终文本
// 版本：v1.1.0
// ============================================================

import type { BuildOptions, BuildResult, PromptLayer, ConflictLevel, WritingStyle } from './types'
import { GENRE_MAP, CONFLICT_LEVELS } from './types'
import { registry } from './registry'
import { SYSTEM_IRON_RULES, FORBIDDEN_WORDS_REMINDER, BRAINSTORM_QUALITY_RULES } from './iron-rules'

/**
 * 构建完整 Prompt
 */
export function buildPrompt(options: BuildOptions): BuildResult {
  const {
    templateId,
    type,
    context,
    instruction,
    genre,
    count,
    params: paramOverrides,
    enableIronRules = true,
    enableForbiddenWordsReminder = true,
    conflictLevel,    // P0-2 新增
    style,            // P1-7 新增
    chapterIndex,     // P1-8 新增
    endingHint,       // P1-9 新增
    usedSenses = [],  // P2-1 新增
    requiredSensesCount = 2,  // P2-1 新增
  } = options

  // 1. 获取模板
  let template = registry.get(templateId)
  if (!template) {
    template = registry.getActiveByType(type)
  }
  if (!template) {
    throw new Error(`找不到可用的模板: type=${type}, templateId=${templateId}`)
  }

  // 2. 确定最终参数
  const params = {
    ...template.defaultParams,
    ...paramOverrides,
  }

  // 3. 解析各层内容
  const layerTexts: Record<PromptLayer, string> = {
    system_iron_rules: '',
    function_instruction: '',
    context_injection: '',
    output_constraints: '',
  }

  // L1 — 铁律层（仅写作类工具启用）
  if (enableIronRules && (type === 'continue' || type === 'polish' || type === 'expand')) {
    let rules = SYSTEM_IRON_RULES
    if (enableForbiddenWordsReminder) {
      rules += '\n\n' + FORBIDDEN_WORDS_REMINDER
    }

    // P0-2: 注入冲突强度分级规则
    if (conflictLevel) {
      const levelConfig = CONFLICT_LEVELS[conflictLevel]
      rules += `\n\n【当前冲突强度：${levelConfig.level} ${levelConfig.name}】
- 句子长度：${levelConfig.sentenceLength}
- 句号换行：${levelConfig.lineBreak === '强制' ? '强制换行' : levelConfig.lineBreak === '建议' ? '建议换行' : '不强制换行'}
- 身体密度：≥${levelConfig.bodyDensityMin}%
- 形容词限制：${levelConfig.adjectiveLimit}
- 典型场景：${levelConfig.typicalScenes.join('、')}`
    }

    // P1-7: 注入风格豁免/强化规则
    if (style) {
      const styleRules = getStyleRules(style)
      rules += `\n\n${styleRules}`
    }

    // P1-8: 黄金三章模式（章节≤3时自动启用）
    if (chapterIndex !== undefined && chapterIndex <= 3) {
      rules += getGoldenChapterRules(chapterIndex)
    }

    // P2-1: 五感锚定法规则
    const sensoryRules = generateSensoryRules(usedSenses, requiredSensesCount)
    if (sensoryRules) {
      rules += `\n\n${sensoryRules}`
    }

    layerTexts.system_iron_rules = rules
  }

  // L2 — 功能指令层
  let fnInstruction = template.layers.function_instruction || ''
  // 替换变量
  fnInstruction = fnInstruction
    .replace(/\{\{context\}\}/g, context || '')
    .replace(/\{\{instruction\}\}/g, instruction || '')
    .replace(/\{\{text\}\}/g, context || '')
    .replace(/\{\{count\}\}/g, String(count || 5))
    .replace(/\{\{genre\}\}/g, GENRE_MAP[genre || '通用'] || '网文创作')
  layerTexts.function_instruction = fnInstruction

  // L3 — 上下文注入层
  let ctxInjection = template.layers.context_injection || ''

  // 对续写/扩写：注入前文上下文
  if (type === 'continue' || type === 'expand') {
    const truncatedContext = (context || '').slice(-3000)
    ctxInjection = ctxInjection
      .replace(/\{\{context\}\}/g, truncatedContext)
      .replace(/\{\{text\}\}/g, truncatedContext)
  }

  // 对润色：注入原文
  if (type === 'polish') {
    ctxInjection = ctxInjection
      .replace(/\{\{text\}\}/g, context || '')
  }

  // 通用变量替换
  ctxInjection = ctxInjection
    .replace(/\{\{instruction\}\}/g, instruction || '')
    .replace(/\{\{count\}\}/g, String(count || 5))
    .replace(/\{\{genre\}\}/g, GENRE_MAP[genre || '通用'] || '网文创作')

  // 用户指令格式化
  if (instruction && instruction.trim()) {
    const instrText = `用户额外要求：${instruction.trim()}`
    ctxInjection = ctxInjection.replace(/\{\{instruction\}\}/g, instrText)
  } else {
    ctxInjection = ctxInjection.replace(/\{\{instruction\}\}/g, '')
  }

  // 脑洞喷射特殊处理：注入创意质量规则到指令层
  if (type === 'brainstorm') {
    fnInstruction += '\n\n' + BRAINSTORM_QUALITY_RULES
    layerTexts.function_instruction = fnInstruction
  }

  layerTexts.context_injection = ctxInjection

  // L4 — 输出约束层
  let outputConstraints = template.layers.output_constraints || ''
  // P1-9: 注入章末收束提示
  if (endingHint) {
    outputConstraints = outputConstraints.replace(/\{\{ending_hint\}\}/g, endingHint)
  } else {
    outputConstraints = outputConstraints.replace(/\{\{ending_hint\}\}/g, '')
  }
  layerTexts.output_constraints = outputConstraints

  // 4. 组装最终 Prompt
  const allLayers: PromptLayer[] = [
    'system_iron_rules',
    'function_instruction',
    'context_injection',
    'output_constraints',
  ]

  const promptParts: string[] = []
  for (const layer of allLayers) {
    const text = layerTexts[layer]
    if (text && text.trim()) {
      promptParts.push(text.trim())
    }
  }

  const prompt = promptParts.join('\n\n')
    .replace(/\n{3,}/g, '\n\n') // 合并多余空行
    .trim()

  return {
    prompt,
    templateId: template.id,
    templateVersion: template.version,
    params,
    layerTexts,
  }
}

// ============================================================
// P1-7: 风格豁免/强化规则
// 源规则：小墨V10.0.2「零-3 风格规则优先级」+ KB2
// 3种风格差异化规则：冷峻白描/快消口语/感官极值
// ============================================================

/**
 * 获取风格规则提示词
 * @param style 写作风格
 * @returns 风格规则文本
 */
function getStyleRules(style: WritingStyle): string {
  switch (style) {
    case '冷峻白描':
      return `【风格：冷峻白描（默认）】
- 55字生死线：严格执行，无放宽
- 身体优先：升级，无评价性锚点
- 句式偏好：短句(8-15字)，句号多，独立短句
- 评价性锚点：极少
- 成语/固定搭配：极少
- 适合题材：悬疑/灵异/文学向`

    case '快消口语':
      return `【风格：快消口语（番茄风优化）】
- 55字生死线：严格执行
- B类禁用词：L1-L2放宽（不强制替换）
- C类连接词：L1-L2完全放开
- 不定义情绪：每500字可定义1次（通过评价性锚点实现）
- 对话占比：≥35%（番茄风≥40%）
- 逗号/句号比：≥1.5:1
- 评价性锚点：每500字≥1次
- 核心原则：读起来像滑滑梯——逗号串联动作、锚点帮读者确认感受、对话推进信息
- 前三章额外强化：评价性锚点每300字1次、对话占比≥40%、逗号/句号比≥2:1`

    case '感官极值':
      return `【风格：感官极值】
- 身体密度下限：提高至60%+
- 每段感官描写：≥3种感官
- 允许极端形容词
- 适合题材：恐怖/无限流`

    default:
      return ''
  }
}

/**
 * 获取黄金三章规则
 * 源规则：KB1「工具G：黄金三章创作法」
 * @param chapterIndex 章节索引（1-3）
 * @returns 黄金三章规则文本
 */
function getGoldenChapterRules(chapterIndex: number): string {
  const baseRules = `

⚜️【黄金三章模式已启用】
55字生死线：强制生效（无放宽）
震撼开场引擎：自动启用
期待感万能公式：自动验证
救猫咪技巧：自动调用`

  switch (chapterIndex) {
    case 1:
      return baseRules + `

【第一章·黄金开局（3个必须）】
1. 共情锚点：用1个具体动作让读者"喜欢"或"心疼"主角
2. 预设打破：主角的日常必须出现一道裂缝
3. 钩子预埋：结尾必须有一个读者不翻下一章就睡不着的问题`

    case 2:
      return baseRules + `

【第二章·赌注升级（3个必须）】
1. 成本展示：让读者看清主角若不行动会失去什么
2. 期待感万能公式：极度渴望（目标）+ 绝对阻碍（危机）+ 预告后果（赌注）
3. 阻力登场：第一个具体的阻碍力量出现`

    case 3:
      return baseRules + `

【第三章·不可逆抉择（3个必须）】
1. 第一道门槛：主角做出一个无法回头的行为
2. 代价兑现：第一章展示的"成本"在本章开始兑现
3. 长线钩子落地：结尾埋下贯穿全书的主线钩子`

    default:
      return baseRules
  }
}

// ============================================================
// P2-1: 五感锚定法规则生成器
// 源规则：KB1「工具D：五感锚定法」
// 每个重要场景至少使用2种感官，禁止连续3段只用视觉
// ============================================================

/** 感官通道定义 */
export const SENSE_CHANNELS = [
  { id: 'visual', name: '视觉', desc: '看到什么', cold: false },
  { id: 'tactile', name: '触觉', desc: '摸到什么/身体感受', cold: false },
  { id: 'auditory', name: '听觉', desc: '听到什么', cold: false },
  { id: 'olfactory', name: '嗅觉', desc: '闻到什么', cold: true },
  { id: 'gustatory', name: '味觉', desc: '尝到什么', cold: true },
  { id: 'sixth', name: '第六识"知"', desc: '直觉/预感/气场感知', cold: true },
] as const

/**
 * 生成五感锚定法规则
 * @param usedSenses 当前场景已使用的感官通道
 * @param requiredCount 每场景最少感官数
 * @returns 规则文本
 */
function generateSensoryRules(usedSenses: string[], requiredCount: number): string {
  const availableSenses = SENSE_CHANNELS.filter(s => !usedSenses.includes(s.id))
  const coldSenses = SENSE_CHANNELS.filter(s => s.cold)
  const mainSenses = SENSE_CHANNELS.filter(s => !s.cold)

  return `【五感锚定法】
- 每个重要场景至少使用${requiredCount}种感官
- 禁止连续3段只用视觉描写
- 常用感官：${mainSenses.map(s => s.name).join('、')}
- 冷储备感官：${coldSenses.map(s => s.name).join('、')}（当常用感官接近冷却线时启用）
- 当前已使用：${usedSenses.length > 0 ? usedSenses.map(id => SENSE_CHANNELS.find(s => s.id === id)?.name || id).join('、') : '无'}
- 建议补充：${availableSenses.length > 0 ? availableSenses.slice(0, 2).map(s => s.name).join('、') : '所有感官均已使用'}

感官切换上限：同一语义段内感官描写不超过2种（感官极值场景除外）。`
}

// ============================================================
// P1-2: A-8 创作状态行生成器
// 源规则：KB3「工具O：A-8创作状态行格式」
// 每章开始前输出极简状态行
// ============================================================

/** A-8 状态行参数 */
export interface A8StatusParams {
  /** 当前章节号 */
  chapter: number
  /** 大纲节点关键词 */
  outlineNode?: string
  /** 活跃伏笔数量 */
  activeForeshadows?: number
  /** 伏笔超限预警 */
  foreshadowWarning?: boolean
  /** 冲突强度级别 */
  conflictLevel?: ConflictLevel
  /** 写作风格 */
  style?: string
  /** AI推荐的技法 */
  recommendedTechnique?: string
  /** AI推荐的感官 */
  recommendedSense?: string
  /** 异常项列表 */
  anomalies?: string[]
  /** 是否为前三章（⚜️标记） */
  isGoldenChapter?: boolean
  /** 冷却状态快照 */
  coolingSnapshot?: string
  /** 防守规则违规数 */
  defenseViolations?: number
}

/**
 * 生成 A-8 创作状态行
 * @param params 状态行参数
 * @returns 格式化的状态行字符串
 *
 * 格式：第X章 | 📍[大纲节点] | 🎭活跃伏笔_N条 | 🆕[L1-L5] | 🎨[风格] | √AI推荐:[手法][感官] | ⚠️[仅列出异常项]
 * 前三章标记 ⚜️
 */
export function generateA8Status(params: A8StatusParams): string {
  const parts: string[] = []

  // 章节号（前三章加⚜️标记）
  const chapterPrefix = params.isGoldenChapter ? '⚜️' : ''
  parts.push(`${chapterPrefix}第${params.chapter}章`)

  // 大纲节点
  if (params.outlineNode) {
    parts.push(`📍${params.outlineNode}`)
  }

  // 活跃伏笔
  if (params.activeForeshadows !== undefined) {
    const foreshadowText = `🎭活跃伏笔_${params.activeForeshadows}条`
    parts.push(params.foreshadowWarning ? `⚠️${foreshadowText}` : foreshadowText)
  }

  // 冲突强度
  if (params.conflictLevel) {
    parts.push(`🆕${params.conflictLevel}`)
  }

  // 风格
  if (params.style) {
    parts.push(`🎨${params.style}`)
  }

  // AI推荐
  if (params.recommendedTechnique || params.recommendedSense) {
    const technique = params.recommendedTechnique || ''
    const sense = params.recommendedSense || ''
    parts.push(`√AI推荐:${technique}${sense ? `[${sense}]` : ''}`)
  }

  // 冷却状态
  if (params.coolingSnapshot) {
    parts.push(`❄️${params.coolingSnapshot}`)
  }

  // 防守规则违规
  if (params.defenseViolations && params.defenseViolations > 0) {
    parts.push(`⚠️上章防守_${params.defenseViolations}项待确认`)
  }

  // 异常项
  if (params.anomalies && params.anomalies.length > 0) {
    parts.push(`⚠️${params.anomalies.join('·')}`)
  }

  return parts.join(' | ')
}

/**
 * 生成简化版 A-8 状态行（用于快速场景）
 */
export function generateSimpleA8Status(chapter: number, conflictLevel?: ConflictLevel): string {
  return generateA8Status({
    chapter,
    conflictLevel,
    isGoldenChapter: chapter <= 3,
  })
}

// ============================================================
// P1-4: 分层变速原则
// 源规则：KB2「分层变速原则详表」
// 根据叙事功能自动调整节奏参数
// ============================================================

/** 叙事功能类型 */
export type NarrativeFunction = 'emotion_peak' | 'info_delivery' | 'transition' | 'dialogue'

/** 叙事功能配置 */
export interface NarrativeFunctionConfig {
  /** 功能类型 */
  type: NarrativeFunction
  /** 功能名称 */
  name: string
  /** 节奏要求 */
  rhythm: string
  /** 句子特征 */
  sentenceFeature: string
  /** 锚点密度（每段） */
  anchorDensity: number
  /** 画面质感 */
  visualTexture: '必须保留' | '适度' | '精简' | '不需要'
}

/** 分层变速配置表 */
export const NARRATIVE_FUNCTION_CONFIGS: Record<NarrativeFunction, NarrativeFunctionConfig> = {
  emotion_peak: {
    type: 'emotion_peak',
    name: '情绪高点',
    rhythm: '减速，拉长瞬间',
    sentenceFeature: '短句逐个落地，句号断开。允许写身体微观反应（手指、呼吸、目光停留）。每句只装一个动作或一个感知',
    anchorDensity: 1,
    visualTexture: '必须保留',
  },
  info_delivery: {
    type: 'info_delivery',
    name: '信息交代',
    rhythm: '中速，用逗号串联',
    sentenceFeature: '2-3个动作合为一句流水句，逗号连接。若信息本身对主角有强情感冲击，允许切换为情绪高点节奏——短句、身体反应、碎片化独白',
    anchorDensity: 1,
    visualTexture: '适度',
  },
  transition: {
    type: 'transition',
    name: '过渡叙述',
    rhythm: '加速，压缩',
    sentenceFeature: '流水句为主，逗号多句号少。动作连续发生，不展开描写每个动作的质感。用"然后""接着"等连接词自然过渡',
    anchorDensity: 0,
    visualTexture: '精简',
  },
  dialogue: {
    type: 'dialogue',
    name: '对话',
    rhythm: '碎片化',
    sentenceFeature: '短、碎、有打断。微信对话模拟真实聊天节奏（不等对方说完就发下一条）',
    anchorDensity: 0,
    visualTexture: '不需要',
  },
}

/**
 * 获取叙事功能配置
 * @param functionType 叙事功能类型
 * @returns 配置
 */
export function getNarrativeFunctionConfig(functionType: NarrativeFunction): NarrativeFunctionConfig {
  return NARRATIVE_FUNCTION_CONFIGS[functionType]
}

/**
 * 获取分层变速提示词（用于注入到prompt中）
 * @param functionType 当前段落的叙事功能
 * @returns 提示词文本
 */
export function getNarrativeFunctionPrompt(functionType: NarrativeFunction): string {
  const config = getNarrativeFunctionConfig(functionType)
  return `【当前叙事功能：${config.name}】
- 节奏：${config.rhythm}
- 句子特征：${config.sentenceFeature}
- 锚点密度：每段${config.anchorDensity}次
- 画面质感：${config.visualTexture}`
}

/**
 * 自动判断段落的叙事功能（简化版）
 * @param text 段落文本
 * @returns 推荐的叙事功能类型
 */
export function detectNarrativeFunction(text: string): NarrativeFunction {
  // 检测对话
  const dialogueCount = (text.match(/["「].*?["」]/g) || []).length
  if (dialogueCount > 2) return 'dialogue'

  // 检测情绪高点（感叹号、问号密集）
  const exclamationCount = (text.match(/[！!？?]/g) || []).length
  if (exclamationCount >= 3) return 'emotion_peak'

  // 检测过渡叙述（连接词密集）
  const transitionWords = ['然后', '接着', '随后', '之后', '于是']
  const transitionCount = transitionWords.filter(w => text.includes(w)).length
  if (transitionCount >= 2) return 'transition'

  // 默认为信息交代
  return 'info_delivery'
}

/**
 * 获取分层变速参数调整建议
 * @param functionType 叙事功能类型
 * @param genreParams 题材参数
 * @returns 参数调整建议
 */
export function getSpeedAdjustment(
  functionType: NarrativeFunction,
  genreParams?: { bodyDensityLow: number; lineBreakLow: string }
): {
  bodyDensityAdjustment: number
  lineBreakAdjustment: string
  conjunctionAllowance: string
} {
  const baseBodyDensity = genreParams?.bodyDensityLow || 40
  const baseLineBreak = genreParams?.lineBreakLow || '不换'

  switch (functionType) {
    case 'emotion_peak':
      return {
        bodyDensityAdjustment: baseBodyDensity + 10,  // 情绪高点身体密度更高
        lineBreakAdjustment: '强制',  // 情绪高点强制换行
        conjunctionAllowance: '放宽',  // 情绪高点连接词放宽
      }
    case 'info_delivery':
      return {
        bodyDensityAdjustment: baseBodyDensity,
        lineBreakAdjustment: baseLineBreak,
        conjunctionAllowance: '标准',
      }
    case 'transition':
      return {
        bodyDensityAdjustment: Math.max(20, baseBodyDensity - 10),  // 过渡段身体密度更低
        lineBreakAdjustment: '不换',  // 过渡段不强制换行
        conjunctionAllowance: '完全放开',  // 过渡段连接词完全放开
      }
    case 'dialogue':
      return {
        bodyDensityAdjustment: 0,  // 对话段不计算身体密度
        lineBreakAdjustment: '不换',
        conjunctionAllowance: '完全放开',
      }
  }
}

// ============================================================
// P1-9: 章末收束提示生成器
// 源规则：KB1「工具B：章末收束12种」
// 从12种收束类型中随机选择，避开正在冷却的
// ============================================================

/** 章末收束类型定义 */
export const ENDING_TYPES = [
  { id: 'E1', name: '钩子式', desc: '结尾抛出一个新悬念或未解答的问题' },
  { id: 'E2', name: '回环式', desc: '结尾呼应本章开头的某个意象、动作或对话' },
  { id: 'E3', name: '升维式', desc: '结尾将本章事件的意义提升到更高层面' },
  { id: 'E4', name: '沉默式', desc: '结尾以角色沉默、静止、空白收束' },
  { id: 'E5', name: '意象式', desc: '结尾以一个重复出现的意象收束' },
  { id: 'E6', name: '反转式', desc: '结尾抛出一个反转信息' },
  { id: 'E7', name: '问题式', desc: '结尾以角色的内心疑问收束' },
  { id: 'E8', name: '动作暂停式', desc: '结尾以一个进行到一半被暂停的动作收束' },
  { id: 'E9', name: '对话断崖式', desc: '结尾以一句未说完的对话或对方的沉默收束' },
  { id: 'E10', name: '环境定格式', desc: '结尾以环境描写收束' },
  { id: 'E11', name: '情绪余味式', desc: '结尾以角色的身体感受或情绪余波收束' },
  { id: 'E12', name: '预示式', desc: '结尾暗示即将发生的事件' },
] as const

/**
 * 生成章末收束提示
 * @param coolingEndings 正在冷却的收束类型ID列表
 * @returns 收束提示文本
 */
export function generateEndingHint(coolingEndings: string[] = []): string {
  // 过滤掉正在冷却的类型
  const available = ENDING_TYPES.filter(e => !coolingEndings.includes(e.id))

  if (available.length === 0) {
    return '【章末收束】所有收束类型均在冷却中，请自由选择。'
  }

  // 随机选择2-3个推荐
  const shuffled = [...available].sort(() => Math.random() - 0.5)
  const recommended = shuffled.slice(0, Math.min(3, shuffled.length))

  const hints = recommended.map(e => `- ${e.id} ${e.name}：${e.desc}`).join('\n')

  return `【章末收束建议】请从以下类型中选择一种：
${hints}

章末收束优先考虑钩子+意象+谜题的三合一组合。`
}

// ============================================================
// P1-12: 卡文三板斧
// 源规则：KB3「工具AB：卡文三板斧」
// 环境切入→感官切入→落差对比三步突破写作瓶颈
// ============================================================

/** 卡文三板斧类型 */
export type UnblockMethod = 'environment' | 'sense' | 'contrast'

/** 卡文三板斧配置 */
export interface UnblockConfig {
  method: UnblockMethod
  name: string
  description: string
  prompts: string[]
}

/** 卡文三板斧配置表 */
export const UNBLOCK_CONFIGS: Record<UnblockMethod, UnblockConfig> = {
  environment: {
    method: 'environment',
    name: '环境切入',
    description: '改变当前场景的物理环境，用环境变化倒逼角色做出反应',
    prompts: [
      '突然下雨/停电/闯入第三者/温度骤变',
      '场景中出现一个不该出现的物品',
      '环境中的某个细节突然变得异常',
      '时间突然变化（黄昏变深夜、季节跳转）',
    ],
  },
  sense: {
    method: 'sense',
    name: '感官切入',
    description: '切换感官通道，用新感官细节打破叙事僵局',
    prompts: [
      '从视觉切换到听觉：角色听到了什么？',
      '从视觉切换到嗅觉：空气中有味道吗？',
      '从视觉切换到触觉：角色碰到了什么？',
      '启用第六识"知"：角色有什么预感？',
    ],
  },
  contrast: {
    method: 'contrast',
    name: '落差对比',
    description: '引入对比元素，用反差制造新的叙事张力',
    prompts: [
      '角色此刻的状态与他过去/预期的状态之间的落差',
      '当前场景与上一场景的氛围落差',
      '角色的期望与现实的落差',
      '角色A与角色B对同一事件的不同反应',
    ],
  },
}

/**
 * 生成卡文三板斧提示
 * @param method 三板斧方法（可选，不指定则全部展示）
 * @returns 提示文本
 */
export function generateUnblockHint(method?: UnblockMethod): string {
  if (method) {
    const config = UNBLOCK_CONFIGS[method]
    const randomPrompt = config.prompts[Math.floor(Math.random() * config.prompts.length)]
    return `【卡文三板斧·${config.name}】
${config.description}

试试这个：${randomPrompt}`
  }

  // 展示全部三板斧
  const methods = Object.values(UNBLOCK_CONFIGS)
  const lines = methods.map(config => {
    const randomPrompt = config.prompts[Math.floor(Math.random() * config.prompts.length)]
    return `### ${config.name}
${config.description}
试试：${randomPrompt}`
  })

  return `【卡文三板斧】试试以下三种方法之一：

${lines.join('\n\n')}

选择一种方法，然后继续写作。`
}

/**
 * 检测是否卡文（简化版：根据用户输入关键词判断）
 * @param userInput 用户输入
 * @returns 是否是卡文求助
 */
export function isUnblockRequest(userInput: string): boolean {
  const unblockKeywords = ['卡文', '写不下去', '不知道怎么写', '卡住了', '没灵感', '写不动']
  return unblockKeywords.some(keyword => userInput.includes(keyword))
}



