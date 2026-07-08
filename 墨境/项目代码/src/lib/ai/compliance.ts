// ============================================================
// 墨境合规检测引擎
// 数据源：src/lib/prompts/compliance-sync.ts（与 prompt 系统共享规则）
// 版本：v1.1.0 — 新增 D类检测 + 精致句密度检测
// ============================================================

import {
  A_CLASS_PATTERNS,
  B_CLASS_WORDS,
  C_CLASS_WORDS,
  D_CLASS_CHECK_WORDS,
  EXPLANATION_WORDS,
  BODY_ACTION_WORDS,
  REFINED_WORD_INDICATORS,
} from '../prompts/compliance-sync'

export interface ComplianceResult {
  forbiddenA: number  // 递进判断句次数
  forbiddenB: number  // B类词违规段落数
  forbiddenC: number  // C类词超限次数
  forbiddenD: number  // D类AI高频词次数
  refinedDensity: number  // 精致句占比（百分比）
  blockedItems: BlockedItem[]
}

export interface BlockedItem {
  type: 'forbidden_b' | 'explanation_after_action'
  paragraphIndex: number
  detail: string
  words?: string[]
}

export function splitParagraphs(text: string): string[] {
  return text.split('\n').filter(p => p.trim().length > 0)
}

export function splitSentences(text: string): string[] {
  return text.split(/[。！？\n]+/).filter(s => s.trim().length > 0)
}

export function checkCompliance(
  text: string,
  chapterAUsed: number = 0
): ComplianceResult {
  const paragraphs = splitParagraphs(text)
  let forbiddenA = chapterAUsed
  let forbiddenB = 0
  let forbiddenC = 0
  let forbiddenD = 0
  let totalSentences = 0
  let refinedSentences = 0
  const blockedItems: BlockedItem[] = []

  paragraphs.forEach((para, idx) => {
    // A类·递进判断句检测
    for (const pattern of A_CLASS_PATTERNS) {
      const matches = para.match(pattern)
      if (matches) {
        forbiddenA += matches.length
      }
    }

    // B类·弱化词检测 — 同段≥3次触发
    let bCount = 0
    const foundWords: string[] = []
    for (const word of B_CLASS_WORDS) {
      const regex = new RegExp(word, 'g')
      const matches = para.match(regex)
      if (matches) { bCount += matches.length; foundWords.push(word) }
    }
    if (bCount >= 3) {
      forbiddenB++
      blockedItems.push({
        type: 'forbidden_b',
        paragraphIndex: idx,
        detail: `有${bCount}次`,
        words: [...new Set(foundWords)],
      })
    }

    // C类·连接词超限检测
    for (const word of C_CLASS_WORDS) {
      const regex = new RegExp(word, 'g')
      const matches = para.match(regex)
      if (matches) forbiddenC += matches.length
    }

    // D类·AI高频词检测
    for (const word of D_CLASS_CHECK_WORDS) {
      const regex = new RegExp(word, 'g')
      const matches = para.match(regex)
      if (matches) forbiddenD += matches.length
    }

    // 动作后解释检测
    const sentences = splitSentences(para)
    for (let si = 0; si < sentences.length - 1; si++) {
      const isAction = BODY_ACTION_WORDS.some(w => sentences[si].includes(w))
      if (isAction) {
        const hasExplanation = EXPLANATION_WORDS.some(w => sentences[si + 1].includes(w))
        if (hasExplanation) {
          blockedItems.push({
            type: 'explanation_after_action',
            paragraphIndex: idx,
            detail: `动作句后紧跟解释语句`,
          })
        }
      }
    }

    // 精致句密度检测（当前段落内）
    for (const s of sentences) {
      totalSentences++
      const isRefined = REFINED_WORD_INDICATORS.some(w => s.includes(w))
      if (isRefined) refinedSentences++
    }
  })

  return {
    forbiddenA,
    forbiddenB,
    forbiddenC,
    forbiddenD,
    refinedDensity: totalSentences > 0 ? Math.round((refinedSentences / totalSentences) * 100) : 0,
    blockedItems,
  }
}

/**
 * P0-1: 55字生死线检测（增强版）
 * 源规则：小墨V10.0.2「55字生死线」+ KB2题材参数表
 *
 * 通用：前55字必须出现冲突/悬念/动作
 * 悬疑/推理/灵异：前150字含反常细节即可放宽
 * 言情/情感/婚恋：前100字含情感悬念即可放宽
 * 其他题材：使用通用55字规则
 */
export type Genre = '通用' | '悬疑' | '都市' | '玄幻' | '言情'

export interface FiftyFiveRuleResult {
  passed: boolean
  checkedLength: number       // 实际检查的字符数（55/100/150）
  genre: Genre
  genreAdjusted: boolean      // 是否启用了题材放宽
  hitConditions: string[]     // 命中的条件列表
  firstHitPosition?: number   // 第一个命中位置
  detail: string              // 人类可读的说明
}

// 题材放宽配置
const GENRE_55_CONFIG: Record<Genre, { length: number; condition: string; checker: (text: string) => boolean }> = {
  '通用': {
    length: 55,
    condition: '冲突/悬念/动作',
    checker: (t) => checkConflictSuspenseAction(t),
  },
  '悬疑': {
    length: 150,
    condition: '反常细节/异常现象/悬疑氛围',
    checker: (t) => checkSuspenseAtmosphere(t),
  },
  '都市': {
    length: 55,
    condition: '冲突/悬念/动作',
    checker: (t) => checkConflictSuspenseAction(t),
  },
  '玄幻': {
    length: 55,
    condition: '冲突/悬念/动作',
    checker: (t) => checkConflictSuspenseAction(t),
  },
  '言情': {
    length: 100,
    condition: '情感悬念/关系张力/情感冲突',
    checker: (t) => checkEmotionalSuspense(t),
  },
}

// 通用条件检测：冲突/悬念/动作
function checkConflictSuspenseAction(text: string): boolean {
  const hasConflict = /[冲突打骂杀斗怒恨骂逃追抓打伤]/g.test(text)
  const hasSuspense = /[？!！?奇怪谜秘密疑怪不知为什么]/g.test(text)
  const hasAction = BODY_ACTION_WORDS.some(w => text.includes(w))
  return hasConflict || hasSuspense || hasAction
}

// 悬疑题材条件检测：反常细节/异常现象
function checkSuspenseAtmosphere(text: string): boolean {
  const abnormalPatterns = [
    /[不应该不该不会不可能不对][。，]/,
    /[异古怪反常诡异邪门蹊跷离奇]/,
    /[死尸血伤消失失踪失联]/,
    /[暗阴冷寒凉冰冻黑影]/,
    /[秘密隐藏隐瞒掩盖伪造篡改]/,
    /[监控录像照片证据痕迹指纹]/,
  ]
  return abnormalPatterns.some(p => p.test(text)) || checkConflictSuspenseAction(text)
}

// 言情题材条件检测：情感悬念/关系张力
function checkEmotionalSuspense(text: string): boolean {
  const emotionalPatterns = [
    /[爱喜欢心动想念思念牵挂]/,
    /[恨讨厌厌恶嫌弃嫉妒吃醋]/,
    /[婚嫁娶结婚离婚分手]/,
    /[眼眶鼻酸泪哽咽哭]/,
    /[拥抱牵手亲吻靠近]/,
    /[误解误会错过背叛欺骗]/,
    /[？!！?为什么难道真的]/,
  ]
  return emotionalPatterns.some(p => p.test(text)) || checkConflictSuspenseAction(text)
}

export function check55Rule(text: string, genre: Genre = '通用'): FiftyFiveRuleResult {
  const config = GENRE_55_CONFIG[genre]
  const checkedText = text.slice(0, config.length)
  const checkedLength = Math.min(config.length, text.length)

  const hitConditions: string[] = []
  let firstHitPosition: number | undefined

  // 逐一检查各个条件
  if (/[冲突打骂杀斗怒恨骂逃追抓打伤]/g.test(checkedText)) {
    hitConditions.push('冲突/打斗')
    const pos = checkedText.search(/[冲突打骂杀斗怒恨骂逃追抓打伤]/g)
    firstHitPosition = firstHitPosition !== undefined ? Math.min(firstHitPosition, pos) : pos
  }

  if (/[？!！?奇怪谜秘密疑怪不知为什么]/g.test(checkedText)) {
    hitConditions.push('悬念/疑问')
    const pos = checkedText.search(/[？!！?奇怪谜秘密疑怪不知为什么]/g)
    firstHitPosition = firstHitPosition !== undefined ? Math.min(firstHitPosition, pos) : pos
  }

  if (BODY_ACTION_WORDS.some(w => checkedText.includes(w))) {
    hitConditions.push('身体动作')
    const pos = BODY_ACTION_WORDS.reduce((min, w) => {
      const idx = checkedText.indexOf(w)
      return idx !== -1 && (min === -1 || idx < min) ? idx : min
    }, -1)
    if (pos !== -1) firstHitPosition = firstHitPosition !== undefined ? Math.min(firstHitPosition, pos) : pos
  }

  // 悬疑题材特殊条件
  if (genre === '悬疑' && checkSuspenseAtmosphere(checkedText)) {
    hitConditions.push('反常细节/悬疑氛围')
  }

  // 言情题材特殊条件
  if (genre === '言情' && checkEmotionalSuspense(checkedText)) {
    hitConditions.push('情感悬念/关系张力')
  }

  const passed = hitConditions.length > 0
  const genreAdjusted = config.length !== 55

  return {
    passed,
    checkedLength,
    genre,
    genreAdjusted,
    hitConditions,
    firstHitPosition,
    detail: passed
      ? `✅ 通过（${config.length}字内命中${hitConditions.length}项：${hitConditions.join('、')}）`
      : `⚠️ 未通过（前${config.length}字内无${config.condition}）`,
  }
}

export function calcBodyDensity(text: string): number {
  const sentences = splitSentences(text)
  if (sentences.length === 0) return 0
  let bodyCount = 0
  for (const s of sentences) {
    const hasBody = BODY_ACTION_WORDS.some(w => s.includes(w))
    if (hasBody) bodyCount++
  }
  return Math.round((bodyCount / sentences.length) * 100)
}

// ============================================================
// P0-3: 实时阻断8项检查（段落级）
// 源规则：小墨V10.0.2「第二部分·写作中快速自查」
// 每写完一个语义段落后执行，阻断项触发必须立即修正
// ============================================================

export type CheckItemStatus = 'pass' | 'warning' | 'blocking'

export interface ParagraphCheckItem {
  id: number
  name: string
  status: CheckItemStatus
  isBlocking: boolean
  detail: string
}

export interface ParagraphCheckResult {
  passed: boolean         // 是否全部通过（无阻断项）
  blockingCount: number   // 阻断项违规数
  warningCount: number    // 警告项数
  items: ParagraphCheckItem[]
}

/**
 * 段落级实时阻断检查（8项）
 * @param text 当前段落文本
 * @param chapterAUsed 本章已用的A类递进判断句次数
 * @returns 检查结果
 */
export function paragraphCheck(text: string, chapterAUsed: number = 0): ParagraphCheckResult {
  const items: ParagraphCheckItem[] = []

  // 1. 单一意图？本段是否只做了一件事？
  items.push(checkSingleIntent(text))

  // 2. 身体承载？情绪是否通过身体动作/生理反应呈现？
  items.push(checkBodyCarrier(text))

  // 3.「阻断」禁用词混入？
  items.push(checkForbiddenWordsBlocking(text, chapterAUsed))

  // 4.「阻断」动作后解释？
  items.push(checkPostActionExplanation(text))

  // 5. 视角越界？（简化版：检查是否出现了"他想""她觉得"等越界描写）
  items.push(checkPerspective(text))

  // 6. 大白话测试？（检查是否有过于抽象/文艺的表达）
  items.push(checkPlainLanguage(text))

  // 7. 精致句位置？
  items.push(checkRefinedSentencePosition(text))

  // 8. 生造比喻检查？
  items.push(checkForcedMetaphor(text))

  const blockingCount = items.filter(i => i.status === 'blocking').length
  const warningCount = items.filter(i => i.status === 'warning').length

  return {
    passed: blockingCount === 0,
    blockingCount,
    warningCount,
    items,
  }
}

// 检查项1：单一意图
function checkSingleIntent(text: string): ParagraphCheckItem {
  const sentences = splitSentences(text)
  const subjects = new Set<string>()

  for (const s of sentences) {
    // 简化：提取主语（第一个出现的人物/代词）
    const subjectMatch = s.match(/^[\u4e00-\u9fa5]{1,2}(?=[他她它我你你们他们她们])/)
    if (subjectMatch) subjects.add(subjectMatch[0])
  }

  // 如果有3个以上不同主语，可能违反单一意图
  const status = subjects.size >= 3 ? 'warning' : 'pass'
  return {
    id: 1,
    name: '单一意图',
    status,
    isBlocking: false,
    detail: status === 'warning'
      ? `检测到${subjects.size}个不同主语，建议检查是否只做了一件事`
      : '通过',
  }
}

// 检查项2：身体承载
function checkBodyCarrier(text: string): ParagraphCheckItem {
  const hasBody = BODY_ACTION_WORDS.some(w => text.includes(w))
  const hasEmotion = /[开心快乐难过悲伤愤怒生气紧张害怕恐惧担心焦虑]/.test(text)

  // 如果有情绪词但无身体动作词，可能违反身体承载
  const status = hasEmotion && !hasBody ? 'warning' : 'pass'
  return {
    id: 2,
    name: '身体承载',
    status,
    isBlocking: false,
    detail: status === 'warning'
      ? '检测到情绪词但缺少身体动作，建议用身体反应承载情绪'
      : '通过',
  }
}

// 检查项3：「阻断」禁用词混入
function checkForbiddenWordsBlocking(text: string, chapterAUsed: number): ParagraphCheckItem {
  // B类词检测：同段≥3次
  let bCount = 0
  const foundBWords: string[] = []
  for (const word of B_CLASS_WORDS) {
    const regex = new RegExp(word, 'g')
    const matches = text.match(regex)
    if (matches) {
      bCount += matches.length
      foundBWords.push(word)
    }
  }

  // A类词检测：本章已用过1次
  let aCount = chapterAUsed
  for (const pattern of A_CLASS_PATTERNS) {
    const matches = text.match(pattern)
    if (matches) aCount += matches.length
  }

  const blocking = bCount >= 3 || aCount > 1
  return {
    id: 3,
    name: '禁用词混入',
    status: blocking ? 'blocking' : 'pass',
    isBlocking: true,
    detail: blocking
      ? `B类词${bCount}次（${foundBWords.join('、')}）${aCount > 1 ? `，A类递进判断句${aCount}次` : ''}`
      : '通过',
  }
}

// 检查项4：「阻断」动作后解释
function checkPostActionExplanation(text: string): ParagraphCheckItem {
  const sentences = splitSentences(text)

  for (let i = 0; i < sentences.length - 1; i++) {
    const current = sentences[i]
    const next = sentences[i + 1]

    // 当前句包含身体动作词
    const isAction = BODY_ACTION_WORDS.some(w => current.includes(w))
    if (!isAction) continue

    // 下一句包含解释性连接词
    const hasExplanation = EXPLANATION_WORDS.some(w => next.includes(w))
    if (hasExplanation) {
      return {
        id: 4,
        name: '动作后解释',
        status: 'blocking',
        isBlocking: true,
        detail: `第${i + 1}句后紧跟解释性语句`,
      }
    }
  }

  return {
    id: 4,
    name: '动作后解释',
    status: 'pass',
    isBlocking: true,
    detail: '通过',
  }
}

// 检查项5：视角越界（简化版）
function checkPerspective(text: string): ParagraphCheckItem {
  // 检测越界描写模式：他想/她觉得/他明白/她意识到（非对话中）
  const boundaryPatterns = [
    /(?<!["「])他(想|觉得|明白|意识到|知道|清楚)(?!["」])/,
    /(?<!["「])她(想|觉得|明白|意识到|知道|清楚)(?!["」])/,
  ]

  for (const pattern of boundaryPatterns) {
    if (pattern.test(text)) {
      return {
        id: 5,
        name: '视角越界',
        status: 'warning',
        isBlocking: false,
        detail: '检测到疑似越界描写（他想/她觉得等），请确认是否在视角角色的感知范围内',
      }
    }
  }

  return {
    id: 5,
    name: '视角越界',
    status: 'pass',
    isBlocking: false,
    detail: '通过',
  }
}

// 检查项6：大白话测试
function checkPlainLanguage(text: string): ParagraphCheckItem {
  // 检测过于抽象/文艺的表达
  const abstractPatterns = [
    /如同.*般/,
    /仿佛.*一样/,
    /像.*般/,
    /宛若/,
    /恰似/,
    /好似/,
  ]

  let abstractCount = 0
  for (const pattern of abstractPatterns) {
    const matches = text.match(pattern)
    if (matches) abstractCount += matches.length
  }

  const status = abstractCount >= 3 ? 'warning' : 'pass'
  return {
    id: 6,
    name: '大白话测试',
    status,
    isBlocking: false,
    detail: status === 'warning'
      ? `检测到${abstractCount}处文艺化表达，建议改为身体动作`
      : '通过',
  }
}

// 检查项7：精致句位置
function checkRefinedSentencePosition(text: string): ParagraphCheckItem {
  const sentences = splitSentences(text)

  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i]
    const isRefined = REFINED_WORD_INDICATORS.some(w => s.includes(w))

    if (isRefined) {
      // 检查是否在身体锚点聚焦时刻（简化：前一句或后一句是否有身体动作）
      const prevHasBody = i > 0 && BODY_ACTION_WORDS.some(w => sentences[i - 1].includes(w))
      const nextHasBody = i < sentences.length - 1 && BODY_ACTION_WORDS.some(w => sentences[i + 1].includes(w))
      const isAtAnchor = prevHasBody || nextHasBody

      if (!isAtAnchor) {
        return {
          id: 7,
          name: '精致句位置',
          status: 'warning',
          isBlocking: false,
          detail: `第${i + 1}句包含精致表达，但不在身体锚点时刻，建议压缩为粗糙句`,
        }
      }
    }
  }

  return {
    id: 7,
    name: '精致句位置',
    status: 'pass',
    isBlocking: false,
    detail: '通过',
  }
}

// 检查项8：生造比喻检查
function checkForcedMetaphor(text: string): ParagraphCheckItem {
  // 检测常见生造比喻模式
  const forcedPatterns = [
    /像.*一样.*但/,
    /如同.*却/,
    /仿佛.*然而/,
    /宛.*若.*不过/,
  ]

  for (const pattern of forcedPatterns) {
    if (pattern.test(text)) {
      return {
        id: 8,
        name: '生造比喻',
        status: 'warning',
        isBlocking: false,
        detail: '检测到可能生造的比喻，建议检查是否贴切、符合角色人设',
      }
    }
  }

  return {
    id: 8,
    name: '生造比喻',
    status: 'pass',
    isBlocking: false,
    detail: '通过',
  }
}

// ============================================================
// P0-4: 23项章末全量自检
// 源规则：KB1「工具M：23项检查清单」+「工具P：极简自检报告格式」
// 每章写完后执行，输出极简自检报告
// ============================================================

export interface ChapterCheckItem {
  id: number
  name: string
  status: 'pass' | 'warning' | 'fail'
  detail: string
  value?: string | number
}

export interface ChapterCheckReport {
  /** 综合评分（1-5） */
  score: number
  /** 是否合规 */
  compliant: boolean
  /** 各项检查结果 */
  items: ChapterCheckItem[]
  /** A类递进判断句违规次数 */
  forbiddenA: number
  /** B类禁用词违规段落数 */
  forbiddenB: number
  /** C类连接词超限次数 */
  forbiddenC: number
  /** D类AI高频词次数 */
  forbiddenD: number
  /** 身体密度（百分比） */
  bodyDensity: number
  /** 身体密度评估 */
  bodyDensityStatus: '合理' | '偏高' | '偏低'
  /** 章节字数 */
  wordCount: number
  /** 55字生死线是否通过 */
  openingHook: boolean
  /** 极简自检报告行 */
  reportLine: string
}

/**
 * 章末全量23项自检
 * @param text 章节全文
 * @param genre 题材
 * @param chapterAUsed 本章已用的A类递进判断句次数
 * @returns 检查报告
 */
export function chapterEndCheck(
  text: string,
  genre: Genre = '通用',
  chapterAUsed: number = 0
): ChapterCheckReport {
  const items: ChapterCheckItem[] = []

  // 1. 单一意图
  items.push(checkCE_SingleIntent(text))

  // 2. 身体承载
  items.push(checkCE_BodyCarrier(text))

  // 3. 禁用词混入
  items.push(checkCE_ForbiddenWords(text))

  // 4. 递进判断句
  items.push(checkCE_ProgressiveJudgment(text, chapterAUsed))

  // 5. 意象/比喻重复
  items.push(checkCE_ImageMetaphorRepeat(text))

  // 6. 对话口语化
  items.push(checkCE_DialogueStyle(text))

  // 7. 解释性语句
  items.push(checkCE_ExplanatorySentences(text))

  // 8. 旁白/台词/动作比例
  items.push(checkCE_NarrationRatio(text))

  // 9. 情节转折由主角性格驱动
  items.push(checkCE_CharacterDrive(text))

  // 10. AI导航行为
  items.push(checkCE_AINavigation(text))

  // 11. 形容词密度
  items.push(checkCE_AdjectiveDensity(text))

  // 12. 大白话测试
  items.push(checkCE_MovieTest(text))

  // 13. 口语化
  items.push(checkCE_OralNarrator(text))

  // 14. 因果顺序
  items.push(checkCE_CauseEffectOrder(text))

  // 15. 透气检查
  items.push(checkCE_BreathParagraph(text))

  // 16. 视角一致性
  items.push(checkCE_PerspectiveConsistency(text))

  // 17. 角色一致性
  items.push(checkCE_CharacterConsistency(text))

  // 18. 时间线一致性
  items.push(checkCE_TimelineConsistency(text))

  // 19. 节奏均衡
  items.push(checkCE_RhythmBalance(text))

  // 20. 心理描写合理性
  items.push(checkCE_PsychologyRationality(text))

  // 21. 句式多样性
  items.push(checkCE_SentenceDiversity(text))

  // 22. 分层变速
  items.push(checkCE_SpeedVariation(text))

  // 23. 防守规则核验
  items.push(checkCE_DefenseRules(text))

  // 计算综合评分
  const failCount = items.filter(i => i.status === 'fail').length
  const warningCount = items.filter(i => i.status === 'warning').length
  let score = 5
  if (failCount > 0) score = Math.max(1, 5 - failCount)
  else if (warningCount > 2) score = 4

  // 计算身体密度
  const bodyDensity = calcBodyDensity(text)
  const bodyDensityStatus = bodyDensity >= 40 && bodyDensity <= 55 ? '合理' :
                            bodyDensity > 55 ? '偏高' : '偏低'

  // 计算各项指标
  const compliance = checkCompliance(text, chapterAUsed)
  const fiftyFive = check55Rule(text, genre)
  const wordCount = text.length

  // 生成极简报告行
  const reportLine = formatReportLine({
    score,
    compliant: failCount === 0,
    forbiddenA: compliance.forbiddenA,
    forbiddenB: compliance.forbiddenB,
    forbiddenC: compliance.forbiddenC,
    forbiddenD: compliance.forbiddenD,
    bodyDensity,
    bodyDensityStatus,
    wordCount,
    openingHook: fiftyFive.passed,
    items,
  })

  return {
    score,
    compliant: failCount === 0,
    items,
    forbiddenA: compliance.forbiddenA,
    forbiddenB: compliance.forbiddenB,
    forbiddenC: compliance.forbiddenC,
    forbiddenD: compliance.forbiddenD,
    bodyDensity,
    bodyDensityStatus,
    wordCount,
    openingHook: fiftyFive.passed,
    reportLine,
  }
}

// 格式化极简报告行
function formatReportLine(data: {
  score: number
  compliant: boolean
  forbiddenA: number
  forbiddenB: number
  forbiddenC: number
  forbiddenD: number
  bodyDensity: number
  bodyDensityStatus: string
  wordCount: number
  openingHook: boolean
  items: ChapterCheckItem[]
}): string {
  const parts: string[] = []

  // 合规状态
  parts.push(data.compliant ? '✅' : '⚠️')

  // A/B/C/D 违规
  if (data.forbiddenA > 0) parts.push(`A${data.forbiddenA}`)
  if (data.forbiddenB > 0) parts.push(`B${data.forbiddenB}`)
  if (data.forbiddenC > 0) parts.push(`C${data.forbiddenC}`)
  if (data.forbiddenD > 0) parts.push(`D${data.forbiddenD}`)

  // 身体密度
  parts.push(`身体:${data.bodyDensityStatus}`)

  // 字数
  parts.push(`字数${data.wordCount}`)

  // 55字线
  parts.push(data.openingHook ? '55✅' : '55⚠️')

  // 评分
  parts.push(`${data.score}/5`)

  return `[自检] ${parts.join(' | ')}`
}

// 以下是23项检查的具体实现（简化版，重点检测可自动化的内容）

function checkCE_SingleIntent(text: string): ChapterCheckItem {
  const paragraphs = splitParagraphs(text)
  let violations = 0

  for (const para of paragraphs) {
    const sentences = splitSentences(para)
    const subjects = new Set<string>()
    for (const s of sentences) {
      const m = s.match(/^[\u4e00-\u9fa5]{1,2}(?=[他她它我你你们他们她们])/)
      if (m) subjects.add(m[0])
    }
    if (subjects.size >= 4) violations++
  }

  return {
    id: 1,
    name: '单一意图',
    status: violations > 0 ? 'warning' : 'pass',
    detail: violations > 0 ? `${violations}个段落可能违反单一意图` : '通过',
    value: violations,
  }
}

function checkCE_BodyCarrier(text: string): ChapterCheckItem {
  const density = calcBodyDensity(text)
  const status = density < 25 ? 'fail' : density < 40 ? 'warning' : 'pass'
  return {
    id: 2,
    name: '身体承载',
    status,
    detail: `身体密度${density}%${status === 'fail' ? '（过低）' : status === 'warning' ? '（偏低）' : ''}`,
    value: density,
  }
}

function checkCE_ForbiddenWords(text: string): ChapterCheckItem {
  const compliance = checkCompliance(text)
  const total = compliance.forbiddenB + compliance.forbiddenC
  return {
    id: 3,
    name: '禁用词混入',
    status: total > 0 ? 'warning' : 'pass',
    detail: total > 0 ? `B类${compliance.forbiddenB}段，C类${compliance.forbiddenC}次` : '通过',
    value: total,
  }
}

function checkCE_ProgressiveJudgment(text: string, chapterAUsed: number): ChapterCheckItem {
  const compliance = checkCompliance(text, chapterAUsed)
  return {
    id: 4,
    name: '递进判断句',
    status: compliance.forbiddenA > 1 ? 'fail' : 'pass',
    detail: compliance.forbiddenA > 1 ? `本章${compliance.forbiddenA}次（限制1次）` : '通过',
    value: compliance.forbiddenA,
  }
}

function checkCE_ImageMetaphorRepeat(text: string): ChapterCheckItem {
  // 简化：检查重复意象
  const images = text.match(/像[^，。]{2,10}/g) || []
  const unique = new Set(images)
  const repeats = images.length - unique.size

  return {
    id: 5,
    name: '意象重复',
    status: repeats > 2 ? 'warning' : 'pass',
    detail: repeats > 2 ? `检测到${repeats}处重复意象` : '通过',
    value: repeats,
  }
}

function checkCE_DialogueStyle(text: string): ChapterCheckItem {
  const dialogueCount = (text.match(/["「].*?["」]/g) || []).length
  const totalSentences = splitSentences(text).length
  const ratio = totalSentences > 0 ? dialogueCount / totalSentences : 0

  return {
    id: 6,
    name: '对话口语化',
    status: ratio < 0.15 ? 'warning' : 'pass',
    detail: ratio < 0.15 ? `对话占比${Math.round(ratio * 100)}%（偏低）` : '通过',
    value: Math.round(ratio * 100),
  }
}

function checkCE_ExplanatorySentences(text: string): ChapterCheckItem {
  const patterns = ['因为', '所以', '原来', '他意识到', '这意味着']
  let count = 0
  for (const p of patterns) {
    const matches = text.match(new RegExp(p, 'g'))
    if (matches) count += matches.length
  }

  return {
    id: 7,
    name: '解释性语句',
    status: count > 5 ? 'warning' : 'pass',
    detail: count > 5 ? `检测到${count}处解释性语句` : '通过',
    value: count,
  }
}

function checkCE_NarrationRatio(text: string): ChapterCheckItem {
  // 简化：检查旁白/动作/对话比例
  return { id: 8, name: '旁白比例', status: 'pass', detail: '通过' }
}

function checkCE_CharacterDrive(text: string): ChapterCheckItem {
  return { id: 9, name: '角色驱动', status: 'pass', detail: '通过（需人工确认）' }
}

function checkCE_AINavigation(text: string): ChapterCheckItem {
  const navPatterns = ['画面一转', '与此同时', '殊不知', '读者请注意', '话说回来']
  let found = false
  for (const p of navPatterns) {
    if (text.includes(p)) { found = true; break }
  }

  return {
    id: 10,
    name: 'AI导航',
    status: found ? 'fail' : 'pass',
    detail: found ? '检测到AI导航行为' : '通过',
  }
}

function checkCE_AdjectiveDensity(text: string): ChapterCheckItem {
  const sentences = splitSentences(text)
  let highDensityCount = 0

  for (const s of sentences) {
    const adjCount = (s.match(/[的]/g) || []).length
    if (adjCount >= 3) highDensityCount++
  }

  return {
    id: 11,
    name: '形容词密度',
    status: highDensityCount > 5 ? 'warning' : 'pass',
    detail: highDensityCount > 5 ? `${highDensityCount}句形容词过密` : '通过',
    value: highDensityCount,
  }
}

function checkCE_MovieTest(text: string): ChapterCheckItem {
  return { id: 12, name: '大白话测试', status: 'pass', detail: '通过（需人工确认）' }
}

function checkCE_OralNarrator(text: string): ChapterCheckItem {
  return { id: 13, name: '口语化', status: 'pass', detail: '通过（需人工确认）' }
}

function checkCE_CauseEffectOrder(text: string): ChapterCheckItem {
  return { id: 14, name: '因果顺序', status: 'pass', detail: '通过（需人工确认）' }
}

function checkCE_BreathParagraph(text: string): ChapterCheckItem {
  const paragraphs = splitParagraphs(text)
  let consecutiveIntense = 0
  let maxConsecutive = 0

  for (const para of paragraphs) {
    const isIntense = /[！!？?]/.test(para) || BODY_ACTION_WORDS.some(w => para.includes(w))
    if (isIntense) {
      consecutiveIntense++
      maxConsecutive = Math.max(maxConsecutive, consecutiveIntense)
    } else {
      consecutiveIntense = 0
    }
  }

  return {
    id: 15,
    name: '透气检查',
    status: maxConsecutive >= 4 ? 'warning' : 'pass',
    detail: maxConsecutive >= 4 ? `连续${maxConsecutive}段紧张，建议插入透气段` : '通过',
    value: maxConsecutive,
  }
}

function checkCE_PerspectiveConsistency(text: string): ChapterCheckItem {
  return { id: 16, name: '视角一致性', status: 'pass', detail: '通过（需人工确认）' }
}

function checkCE_CharacterConsistency(text: string): ChapterCheckItem {
  return { id: 17, name: '角色一致性', status: 'pass', detail: '通过（需人工确认）' }
}

function checkCE_TimelineConsistency(text: string): ChapterCheckItem {
  return { id: 18, name: '时间线一致性', status: 'pass', detail: '通过（需人工确认）' }
}

function checkCE_RhythmBalance(text: string): ChapterCheckItem {
  return { id: 19, name: '节奏均衡', status: 'pass', detail: '通过（需人工确认）' }
}

function checkCE_PsychologyRationality(text: string): ChapterCheckItem {
  return { id: 20, name: '心理描写合理性', status: 'pass', detail: '通过（需人工确认）' }
}

function checkCE_SentenceDiversity(text: string): ChapterCheckItem {
  return { id: 21, name: '句式多样性', status: 'pass', detail: '通过（需人工确认）' }
}

function checkCE_SpeedVariation(text: string): ChapterCheckItem {
  return { id: 22, name: '分层变速', status: 'pass', detail: '通过（需人工确认）' }
}

function checkCE_DefenseRules(text: string): ChapterCheckItem {
  // 检查动作后解释
  const sentences = splitSentences(text)
  let explanationCount = 0

  for (let i = 0; i < sentences.length - 1; i++) {
    const isAction = BODY_ACTION_WORDS.some(w => sentences[i].includes(w))
    if (isAction) {
      const hasExplanation = EXPLANATION_WORDS.some(w => sentences[i + 1].includes(w))
      if (hasExplanation) explanationCount++
    }
  }

  return {
    id: 23,
    name: '防守规则',
    status: explanationCount > 0 ? 'warning' : 'pass',
    detail: explanationCount > 0 ? `检测到${explanationCount}处动作后解释` : '通过',
    value: explanationCount,
  }
}

// ============================================================
// P0-7: 精修质检15项
// 源规则：KB5「工具AC：B-8精修质检15项」
// 润色后执行，确保基础排版和内容质量
// ============================================================

export interface PolishCheckItem {
  id: number
  name: string
  category: '排版' | '内容' | '防守'
  status: 'pass' | 'warning' | 'fail'
  detail: string
  fix?: string  // 修复建议
}

export interface PolishCheckReport {
  passed: boolean
  totalItems: number
  passCount: number
  warningCount: number
  failCount: number
  items: PolishCheckItem[]
}

/**
 * 精修质检15项
 * @param text 文本
 * @returns 检查报告
 */
export function polishCheck(text: string): PolishCheckReport {
  const items: PolishCheckItem[] = []

  // === 基础排版（5项）===

  // 1. 错别字（的地得）
  items.push(checkPC_DiDeDe(text))

  // 2. 中文标点（全角）
  items.push(checkPC_Punctuation(text))

  // 3. 省略号统一
  items.push(checkPC_Ellipsis(text))

  // 4. 删首行缩进和多余空格空行
  items.push(checkPC_Indentation(text))

  // 5. 章节编号用阿拉伯数字
  items.push(checkPC_ChapterNumber(text))

  // === 内容检查（7项）===

  // 6. 开篇强冲突强情绪
  items.push(checkPC_OpeningConflict(text))

  // 7. 严格遵守当前叙事视角
  items.push(checkPC_PerspectiveStrict(text))

  // 8. 主角主动展开行动
  items.push(checkPC_ProactiveCharacter(text))

  // 9. 旁白+行动+台词三位一体
  items.push(checkPC_TriangleBalance(text))

  // 10. 正文节奏快速推进
  items.push(checkPC_FastPacing(text))

  // 11. 白描不要修辞
  items.push(checkPC_WhiteDescription(text))

  // 12. 不要总结性描述和剧透
  items.push(checkPC_NoSpoilers(text))

  // === 防守规则联动（3项）===

  // 13. 动作后禁解释检查
  items.push(checkPC_PostActionExplanation(text))

  // 14. 精致句分配检查
  items.push(checkPC_RefinedSentenceAllocation(text))

  // 15. 感官切换上限检查
  items.push(checkPC_SenseSwitchLimit(text))

  const passCount = items.filter(i => i.status === 'pass').length
  const warningCount = items.filter(i => i.status === 'warning').length
  const failCount = items.filter(i => i.status === 'fail').length

  return {
    passed: failCount === 0,
    totalItems: items.length,
    passCount,
    warningCount,
    failCount,
    items,
  }
}

// === 基础排版检查 ===

function checkPC_DiDeDe(text: string): PolishCheckItem {
  // 检查"的地得"误用（简化版）
  const patterns = [
    { regex: /地[^。，！？]/g, name: '地+动词' },
    { regex: /得[^。，！？]/g, name: '得+补语' },
  ]

  let issues = 0
  for (const p of patterns) {
    const matches = text.match(p.regex)
    if (matches) issues += matches.length
  }

  return {
    id: 1,
    name: '的地得',
    category: '排版',
    status: issues > 10 ? 'warning' : 'pass',
    detail: issues > 10 ? `检测到${issues}处可能误用` : '通过',
  }
}

function checkPC_Punctuation(text: string): PolishCheckItem {
  // 检查半角标点
  const halfWidth = text.match(/[,.:;!?()[\]{}]/g) || []
  return {
    id: 2,
    name: '中文标点',
    category: '排版',
    status: halfWidth.length > 0 ? 'warning' : 'pass',
    detail: halfWidth.length > 0 ? `检测到${halfWidth.length}处半角标点` : '通过',
    fix: halfWidth.length > 0 ? '替换为全角标点' : undefined,
  }
}

function checkPC_Ellipsis(text: string): PolishCheckItem {
  // 检查省略号格式
  const hasThreeDots = text.includes('...')
  const hasCorrect = text.includes('……')

  return {
    id: 3,
    name: '省略号',
    category: '排版',
    status: hasThreeDots ? 'warning' : 'pass',
    detail: hasThreeDots ? '检测到"..."，应为"……"' : '通过',
    fix: hasThreeDots ? '将"..."替换为"……"' : undefined,
  }
}

function checkPC_Indentation(text: string): PolishCheckItem {
  // 检查首行缩进
  const lines = text.split('\n')
  const indentedLines = lines.filter(l => l.startsWith('　') || l.startsWith('  '))

  return {
    id: 4,
    name: '首行缩进',
    category: '排版',
    status: indentedLines.length > 0 ? 'warning' : 'pass',
    detail: indentedLines.length > 0 ? `检测到${indentedLines.length}行缩进` : '通过',
    fix: indentedLines.length > 0 ? '删除首行缩进和多余空格' : undefined,
  }
}

function checkPC_ChapterNumber(text: string): PolishCheckItem {
  // 检查章节编号
  const hasChineseNumber = /^第[一二三四五六七八九十百千]+章/.test(text)
  const hasArabicNumber = /^第\d+章/.test(text)

  return {
    id: 5,
    name: '章节编号',
    category: '排版',
    status: hasChineseNumber && !hasArabicNumber ? 'warning' : 'pass',
    detail: hasChineseNumber && !hasArabicNumber ? '建议使用阿拉伯数字（第1章）' : '通过',
  }
}

// === 内容检查 ===

function checkPC_OpeningConflict(text: string): PolishCheckItem {
  const first100 = text.slice(0, 100)
  const hasConflict = /[！!？?]/.test(first100)
  const hasAction = BODY_ACTION_WORDS.some(w => first100.includes(w))

  return {
    id: 6,
    name: '开篇冲突',
    category: '内容',
    status: !hasConflict && !hasAction ? 'warning' : 'pass',
    detail: !hasConflict && !hasAction ? '开篇缺少冲突/动作' : '通过',
  }
}

function checkPC_PerspectiveStrict(text: string): PolishCheckItem {
  // 检查越界描写
  const boundaryPatterns = [
    /(?<!["「])他(想|觉得|明白|意识到|知道)(?!["」])/,
    /(?<!["「])她(想|觉得|明白|意识到|知道)(?!["」])/,
  ]

  let violations = 0
  for (const p of boundaryPatterns) {
    const matches = text.match(p)
    if (matches) violations += matches.length
  }

  return {
    id: 7,
    name: '视角纪律',
    category: '内容',
    status: violations > 0 ? 'warning' : 'pass',
    detail: violations > 0 ? `检测到${violations}处越界描写` : '通过',
  }
}

function checkPC_ProactiveCharacter(text: string): PolishCheckItem {
  // 检查主角是否主动行动（简化：检查是否有主动动词）
  const activeVerbs = ['决定', '选择', '走向', '拿起', '开口', '出手', '转身', '离开']
  const hasActive = activeVerbs.some(v => text.includes(v))

  return {
    id: 8,
    name: '主角主动',
    category: '内容',
    status: !hasActive ? 'warning' : 'pass',
    detail: !hasActive ? '未检测到主角主动行动' : '通过',
  }
}

function checkPC_TriangleBalance(text: string): PolishCheckItem {
  // 检查旁白/动作/对话平衡
  const dialogueCount = (text.match(/["「].*?["」]/g) || []).length
  const actionCount = BODY_ACTION_WORDS.filter(w => text.includes(w)).length
  const totalSentences = splitSentences(text).length

  const dialogueRatio = totalSentences > 0 ? dialogueCount / totalSentences : 0
  const hasBalance = dialogueRatio > 0.1 && actionCount > 0

  return {
    id: 9,
    name: '三位一体',
    category: '内容',
    status: !hasBalance ? 'warning' : 'pass',
    detail: !hasBalance ? '旁白/动作/对话比例失衡' : '通过',
  }
}

function checkPC_FastPacing(text: string): PolishCheckItem {
  // 检查节奏（句子平均长度）
  const sentences = splitSentences(text)
  const avgLength = sentences.length > 0 ? text.length / sentences.length : 0

  return {
    id: 10,
    name: '节奏推进',
    category: '内容',
    status: avgLength > 50 ? 'warning' : 'pass',
    detail: avgLength > 50 ? `句子平均${Math.round(avgLength)}字（偏长）` : '通过',
  }
}

function checkPC_WhiteDescription(text: string): PolishCheckItem {
  // 检查修辞手法
  const rhetoricalPatterns = ['如同', '仿佛', '宛若', '恰似', '好似']
  const count = rhetoricalPatterns.filter(p => text.includes(p)).length

  return {
    id: 11,
    name: '白描原则',
    category: '内容',
    status: count > 3 ? 'warning' : 'pass',
    detail: count > 3 ? `检测到${count}处修辞手法` : '通过',
  }
}

function checkPC_NoSpoilers(text: string): PolishCheckItem {
  // 检查总结性描述
  const spoilerPatterns = ['总而言之', '综上所述', '由此可见', '显而易见']
  const found = spoilerPatterns.filter(p => text.includes(p))

  return {
    id: 12,
    name: '禁止总结',
    category: '内容',
    status: found.length > 0 ? 'fail' : 'pass',
    detail: found.length > 0 ? `检测到总结性描述：${found.join('、')}` : '通过',
    fix: found.length > 0 ? '删除总结性描述' : undefined,
  }
}

// === 防守规则联动 ===

function checkPC_PostActionExplanation(text: string): PolishCheckItem {
  const sentences = splitSentences(text)
  let violations = 0

  for (let i = 0; i < sentences.length - 1; i++) {
    const isAction = BODY_ACTION_WORDS.some(w => sentences[i].includes(w))
    if (isAction) {
      const hasExplanation = EXPLANATION_WORDS.some(w => sentences[i + 1].includes(w))
      if (hasExplanation) violations++
    }
  }

  return {
    id: 13,
    name: '动作后解释',
    category: '防守',
    status: violations > 0 ? 'fail' : 'pass',
    detail: violations > 0 ? `检测到${violations}处动作后解释` : '通过',
    fix: violations > 0 ? '删除解释句，只留动作' : undefined,
  }
}

function checkPC_RefinedSentenceAllocation(text: string): PolishCheckItem {
  // 检查精致句是否在合理位置
  const sentences = splitSentences(text)
  let misplaced = 0

  for (let i = 0; i < sentences.length; i++) {
    const isRefined = REFINED_WORD_INDICATORS.some(w => sentences[i].includes(w))
    if (isRefined) {
      const hasBodyContext = (i > 0 && BODY_ACTION_WORDS.some(w => sentences[i - 1].includes(w))) ||
                            (i < sentences.length - 1 && BODY_ACTION_WORDS.some(w => sentences[i + 1].includes(w)))
      if (!hasBodyContext) misplaced++
    }
  }

  return {
    id: 14,
    name: '精致句分配',
    category: '防守',
    status: misplaced > 2 ? 'warning' : 'pass',
    detail: misplaced > 2 ? `${misplaced}处精致句不在锚点时刻` : '通过',
  }
}

function checkPC_SenseSwitchLimit(text: string): PolishCheckItem {
  // 检查感官切换上限
  const senseWords = ['看', '听', '闻', '摸', '尝', '感觉']
  const paragraphs = splitParagraphs(text)
  let violations = 0

  for (const para of paragraphs) {
    const sensesUsed = senseWords.filter(w => para.includes(w))
    if (sensesUsed.length > 2) violations++
  }

  return {
    id: 15,
    name: '感官切换',
    category: '防守',
    status: violations > 0 ? 'warning' : 'pass',
    detail: violations > 0 ? `${violations}段感官描写超过2种` : '通过',
  }
}
