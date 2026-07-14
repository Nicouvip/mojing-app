// ============================================================
// 墨境提示词系统 — 题材参数表
// 来源：知识库「题材参数与风格指南」→ 工具S：题材参数映射表
// 5种题材×20+参数，按需注入 prompt
// ============================================================

export interface GenreParam {
  genre: string
  /** 55字生死线检查长度 */
  fiftyFiveRuleLength: number
  /** 放宽条件说明 */
  fiftyFiveRuleCondition: string
  /** L1-L2 身体密度下限 */
  bodyDensityMinL1: number
  /** L3 身体密度下限 */
  bodyDensityMinL3: number
  /** L4-L5 身体密度下限 */
  bodyDensityMinL4: number
  /** L3 句号换行 */
  lineBreakL3: '强制' | '建议' | '不换'
  /** L4-L5 句号换行 */
  lineBreakL4: '强制' | '建议' | '不换'
  /** L1-L2 连接词限制 */
  connectiveLimitL1: '完全放开' | '标准' | '放宽'
  /** 三不原则例外 */
  threeNoExceptions: string
  /** 粗糙原则例外 */
  roughnessExceptions: string
  /** 视角切换规则 */
  perspectiveRule: string
  /** 无意义细节/章 */
  meaninglessDetails: number
  /** 重要伏笔回收时限（章） */
  foreshadowMajorLimit: number
  /** 次要伏笔回收时限（章） */
  foreshadowMinorLimit: number
  /** 情感颜色偏好 */
  emotionColorPref: string[]
  /** 收束类型偏好 */
  endingTypePref: string[]
  /** 场景方法偏好 */
  sceneMethodPref: string[]
}

export const GENRE_PARAMS: Record<string, GenreParam> = {
  '通用': {
    genre: '通用',
    fiftyFiveRuleLength: 55,
    fiftyFiveRuleCondition: '冲突/悬念/动作',
    bodyDensityMinL1: 40,
    bodyDensityMinL3: 50,
    bodyDensityMinL4: 55,
    lineBreakL3: '建议',
    lineBreakL4: '强制',
    connectiveLimitL1: '放宽',
    threeNoExceptions: '无',
    roughnessExceptions: '无',
    perspectiveRule: '禁止正文中间切换',
    meaninglessDetails: 1,
    foreshadowMajorLimit: 30,
    foreshadowMinorLimit: 10,
    emotionColorPref: ['全色'],
    endingTypePref: ['全类型'],
    sceneMethodPref: ['均衡'],
  },
  '悬疑': {
    genre: '悬疑/推理/灵异',
    fiftyFiveRuleLength: 150,
    fiftyFiveRuleCondition: '反常细节/异常现象/悬疑氛围',
    bodyDensityMinL1: 40,
    bodyDensityMinL3: 50,
    bodyDensityMinL4: 55,
    lineBreakL3: '强制',
    lineBreakL4: '强制',
    connectiveLimitL1: '标准',
    threeNoExceptions: '无',
    roughnessExceptions: '推理过程不压缩',
    perspectiveRule: '禁止',
    meaninglessDetails: 1,
    foreshadowMajorLimit: 30,
    foreshadowMinorLimit: 10,
    emotionColorPref: ['偏冷', '凉'],
    endingTypePref: ['E-6反转', 'E-12预示'],
    sceneMethodPref: ['S4时间', 'S5物品'],
  },
  '都市': {
    genre: '都市/现实/生活',
    fiftyFiveRuleLength: 55,
    fiftyFiveRuleCondition: '冲突/悬念/动作',
    bodyDensityMinL1: 25,
    bodyDensityMinL3: 50,
    bodyDensityMinL4: 55,
    lineBreakL3: '建议',
    lineBreakL4: '强制',
    connectiveLimitL1: '完全放开',
    threeNoExceptions: '无',
    roughnessExceptions: '经营过程不压缩',
    perspectiveRule: '禁止',
    meaninglessDetails: 2,
    foreshadowMajorLimit: 30,
    foreshadowMinorLimit: 10,
    emotionColorPref: ['偏暖', '凉'],
    endingTypePref: ['E-11情绪余味', 'E-5意象'],
    sceneMethodPref: ['S3对话', 'S6意识'],
  },
  '玄幻': {
    genre: '玄幻/仙侠/史诗',
    fiftyFiveRuleLength: 55,
    fiftyFiveRuleCondition: '冲突/悬念/动作',
    bodyDensityMinL1: 35,
    bodyDensityMinL3: 50,
    bodyDensityMinL4: 55,
    lineBreakL3: '建议',
    lineBreakL4: '强制',
    connectiveLimitL1: '标准',
    threeNoExceptions: '无',
    roughnessExceptions: '设定说明可保留',
    perspectiveRule: '允许同章双视角≤2次',
    meaninglessDetails: 1,
    foreshadowMajorLimit: 30,
    foreshadowMinorLimit: 10,
    emotionColorPref: ['偏热', '苍凉'],
    endingTypePref: ['E-10环境', 'E-12预示'],
    sceneMethodPref: ['S1身体', 'S4时间'],
  },
  '言情': {
    genre: '言情/情感/婚恋',
    fiftyFiveRuleLength: 100,
    fiftyFiveRuleCondition: '情感悬念/关系张力/情感冲突',
    bodyDensityMinL1: 20,
    bodyDensityMinL3: 50,
    bodyDensityMinL4: 55,
    lineBreakL3: '建议',
    lineBreakL4: '建议',
    connectiveLimitL1: '完全放开',
    threeNoExceptions: 'L1-L2可总结情绪≤2次/章，科幻设定交代不视为解释',
    roughnessExceptions: '情感铺垫不压缩',
    perspectiveRule: '禁止',
    meaninglessDetails: 2,
    foreshadowMajorLimit: 30,
    foreshadowMinorLimit: 10,
    emotionColorPref: ['偏暖', '凉'],
    endingTypePref: ['E-4沉默', 'E-11情绪余味'],
    sceneMethodPref: ['S3对话', 'S6意识'],
  },
}

/**
 * 获取题材参数
 * @param genre 题材名称
 * @returns 题材参数配置
 */
export function getGenreParams(genre: string): GenreParam {
  const key = Object.keys(GENRE_PARAMS).find(k => genre.includes(k) || k.includes(genre))
  return GENRE_PARAMS[key || '通用'] || GENRE_PARAMS['通用']
}

/**
 * 格式化题材参数为 prompt 注入文本
 * @param genre 题材名称
 * @returns 格式化的参数文本
 */
export function formatGenreParams(genre: string): string {
  const p = getGenreParams(genre)
  return `【当前题材参数：${p.genre}】
- 55字生死线：前${p.fiftyFiveRuleLength}字（${p.fiftyFiveRuleCondition}）
- 身体密度下限：L1-L2 ≥${p.bodyDensityMinL1}%，L3 ≥${p.bodyDensityMinL3}%，L4-L5 ≥${p.bodyDensityMinL4}%
- 句号换行：L3 ${p.lineBreakL3}，L4-L5 ${p.lineBreakL4}
- 连接词限制：L1-L2 ${p.connectiveLimitL1}
- 三不原则例外：${p.threeNoExceptions}
- 粗糙原则例外：${p.roughnessExceptions}
- 视角切换：${p.perspectiveRule}
- 无意义细节/章：${p.meaninglessDetails}个
- 伏笔回收时限：重要${p.foreshadowMajorLimit}章/次要${p.foreshadowMinorLimit}章
- 情感颜色偏好：${p.emotionColorPref.join('、')}
- 收束类型偏好：${p.endingTypePref.join('、')}
- 场景方法偏好：${p.sceneMethodPref.join('、')}`
}
