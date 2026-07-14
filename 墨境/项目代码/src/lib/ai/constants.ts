// ============================================================
// 墨境 AI 常量配置
// 统一管理 DeepSeek API 端点和模型名称
// ============================================================

/** DeepSeek API 基础 URL */
export const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'

/** DeepSeek 模型名称 */
export const DEEPSEEK_MODEL = 'deepseek-chat'

/** 默认超时时间（毫秒） */
export const DEFAULT_TIMEOUT = 30_000

/** 流式超时时间（毫秒） */
export const STREAM_TIMEOUT = 60_000

/** 最大重试次数 */
export const MAX_RETRIES = 3
