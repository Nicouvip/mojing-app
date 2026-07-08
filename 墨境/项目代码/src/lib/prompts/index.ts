// ============================================================
// 墨境提示词系统 — 统一导出
// 版本：v1.0.1
// ============================================================

// 类型
export type {
  PromptTemplate,
  BuildOptions,
  BuildResult,
  PromptLayer,
  ToolType,
  GenerationParams,
  TemplateEntry,
  ConflictLevel,    // P0-2 新增
  WritingStyle,     // P1-7 预埋
  ConflictLevelConfig,
} from './types'

export { GENRE_MAP, CONFLICT_LEVELS } from './types'

// 铁律层
export {
  SYSTEM_IRON_RULES,
  FORBIDDEN_WORDS_REMINDER,
  BRAINSTORM_QUALITY_RULES,
} from './iron-rules'

// 注册表
export { registry } from './registry'

// 构建器
export { buildPrompt } from './builder'

// 模板
export {
  continueTemplate,
  polishTemplate,
  expandTemplate,
  brainstormTemplate,
} from './templates'

// 合规同步（单一数据源）
export {
  A_CLASS_PATTERNS,
  B_CLASS_WORDS,
  C_CLASS_WORDS,
  D_CLASS_WORDS,
  EXPLANATION_WORDS,
  BODY_ACTION_WORDS,
  REFINED_WORD_INDICATORS,
  generateForbiddenWordsReminder,
  CHECK_NAMES,
  // P0-6 新增
  EXPRESSION_REPLACEMENTS,
  getReplacementSummary,
  // P0-8 新增
  AI_FREQ_CLASS_1,
  AI_FREQ_CLASS_2,
  AI_FREQ_CLASS_3,
  AI_FREQ_CLASS_4_PATTERNS,
  AI_FREQ_CLASS_5,
  checkAIFreqWords,
} from './compliance-sync'

export type {
  // P0-6 新增
  ExpressionReplacement,
  // P0-8 新增
  AIFreqCheckResult,
} from './compliance-sync'

// 反馈闭环
export type {
  PromptFeedback,
  SatisfactionScore,
  AdoptionStatus,
  TemplateStats,
} from './feedback'

export { feedbackCollector, createFeedback } from './feedback'

// A/B 测试
export type {
  ABExperiment,
  ABGroup,
  TrafficSplit,
  ExperimentStatus,
  ExperimentMetric,
  ExperimentResult,
} from './ab-test'

export { abTestManager } from './ab-test'
