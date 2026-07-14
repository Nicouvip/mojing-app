// ============================================================
// 墨境主题颜色令牌（Token）
// 来源：globals.css 中的变量定义，提取为可引用的常量
// 使用方式：import { C } from '@/lib/theme/tokens'
// ============================================================

/** 主色调 — 暖棕色 */
export const PRIMARY = '#c4956a'
/** 主色调悬停 */
export const PRIMARY_HOVER = '#b8895a'
/** 主色调背景（10%透明） */
export const PRIMARY_LIGHT = 'rgba(196,149,106,0.12)'

/** 成功色 — 绿色 */
export const SUCCESS = '#4caf50'
/** 成功绿色（原版暗色） */
export const SUCCESS_DARK = '#6a8a6a'
/** 成功色背景 */
export const SUCCESS_LIGHT = 'rgba(106,138,106,0.12)'

/** 警告色 — 金色 */
export const WARNING = '#b8a060'
/** 警告色背景 */
export const WARNING_LIGHT = 'rgba(184,160,96,0.15)'

/** 危险/错误色 — 红色 */
export const DESTRUCTIVE = '#b06060'
/** 危险色（亮版） */
export const DESTRUCTIVE_BRIGHT = '#ef4444'

/** 文本颜色 */
export const INK = '#2c2c2c'
/** 次要文本 */
export const MUTED = '#9e9e9e'

/** 边框色 */
export const BORDER = 'rgba(0,0,0,0.06)'
/** 背景色（浅灰） */
export const BG2 = 'rgba(196,149,106,.06)'

/** 编辑器顶栏背景 */
export const PANEL = '#fafaf9'
export const BG = '#ffffff'

/**
 * 统一颜色常量对象（兼容旧代码的 C/S 对象模式）
 * 用于替代各处硬编码的 `#c4966a`、`#9e9e9e` 等
 */
export const C = {
  pri: PRIMARY,
  priHover: PRIMARY_HOVER,
  priLight: PRIMARY_LIGHT,
  success: SUCCESS,
  successDark: SUCCESS_DARK,
  successLight: SUCCESS_LIGHT,
  warning: WARNING,
  warningLight: WARNING_LIGHT,
  dest: DESTRUCTIVE,
  destBright: DESTRUCTIVE_BRIGHT,
  ink: INK,
  muted: MUTED,
  border: BORDER,
  bg2: BG2,
  panel: PANEL,
  bg: BG,
} as const
