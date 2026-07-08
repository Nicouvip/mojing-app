import { calcBodyDensity, checkCompliance } from '@/lib/ai/compliance'
import type { ComplianceResult } from '@/lib/ai/compliance'

/** 合规面板使用的完整数据类型 */
export interface CompliancePanelData {
  metrics: {
    bodyDensity: number
    conflictLevel: 1 | 2 | 3 | 4 | 5
    wordCount: number
    dialoguePercent: number
  }
  compliance: {
    classA: { count: number; max: number }
    classB: { violations: number }
    classC: { count: number }
    classD: { count: number }
    postActionExplain: { count: number }
  }
  engine: {
    scenes: SceneStatus[]
    senses: SenseStatus[]
    style: string
  }
  story: {
    activeForeshadowing: { name: string; status: string }[]
    charactersInScene: number
    totalCharacters: number
  }
}

export interface SceneStatus {
  id: string
  status: 'available' | 'unused' | 'cooling' | 'disabled'
}

export interface SenseStatus {
  id: string
  label: string
  active: boolean
  icon: 'eye' | 'hand' | 'ear' | 'nose' | 'mouth'
}

/** 默认空数据 */
export function emptyPanelData(): CompliancePanelData {
  return {
    metrics: { bodyDensity: 0, conflictLevel: 1, wordCount: 0, dialoguePercent: 0 },
    compliance: {
      classA: { count: 0, max: 1 },
      classB: { violations: 0 },
      classC: { count: 0 },
      classD: { count: 0 },
      postActionExplain: { count: 0 },
    },
    engine: {
      scenes: [],
      senses: [],
      style: '—',
    },
    story: {
      activeForeshadowing: [],
      charactersInScene: 0,
      totalCharacters: 0,
    },
  }
}

/** 从编辑器文本计算合规面板数据 */
export function computePanelData(
  content: string,
  options?: {
    conflictLevel?: 1 | 2 | 3 | 4 | 5
    charactersInScene?: number
    totalCharacters?: number
  }
): CompliancePanelData {
  const cr: ComplianceResult = checkCompliance(content)

  // 字数
  const cleanText = content.replace(/\s/g, '')
  const wordCount = cleanText.length

  // 对话占比 —— 粗略估算引号内字符比例
  const dialogueChars = (content.match(/「[^」]*」|『[^』]*』/g) || []).join('').length
  const totalChars = content.replace(/\s/g, '').length || 1
  const dialoguePercent = Math.round((dialogueChars / totalChars) * 100)

  // 身体密度
  const bodyDensity = calcBodyDensity(content)

  // 检测动作后解释
  const explanationCount = countPostActionExplanations(content)

  return {
    metrics: {
      bodyDensity,
      conflictLevel: options?.conflictLevel ?? 3,
      wordCount,
      dialoguePercent,
    },
    compliance: {
      classA: { count: cr.forbiddenA, max: 1 },
      classB: { violations: cr.forbiddenB },
      classC: { count: cr.forbiddenC },
      classD: { count: cr.forbiddenD },
      postActionExplain: { count: explanationCount },
    },
    engine: {
      scenes: getDefaultScenes(),
      senses: getDefaultSenses(),
      style: detectStyle(bodyDensity, dialoguePercent),
    },
    story: {
      activeForeshadowing: [],
      charactersInScene: options?.charactersInScene ?? 0,
      totalCharacters: options?.totalCharacters ?? 0,
    },
  }
}

function countPostActionExplanations(text: string): number {
  const paragraphs = text.split('\n').filter(p => p.trim().length > 0)
  let count = 0
  for (let i = 1; i < paragraphs.length; i++) {
    const prev = paragraphs[i - 1].trim()
    const curr = paragraphs[i].trim()
    // 如果上一段有动作描写（含动词），下一段以"他""她""它"开头且包含心理/解释词
    if (/[了着过]。$/.test(prev) && /^[他她它]/.test(curr)) {
      const explainWords = ['因为', '所以', '觉得', '感到', '知道', '明白', '意识到', '不想', '想要', '应该', '必须']
      if (explainWords.some(w => curr.includes(w))) {
        count++
      }
    }
  }
  return count
}

function getDefaultScenes(): SceneStatus[] {
  const ids = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']
  return ids.map((id, i) => ({
    id,
    status: i === 0 ? 'available' : i === 2 ? 'cooling' : 'unused'
  } as SceneStatus))
}

function getDefaultSenses(): SenseStatus[] {
  return [
    { id: '视觉', label: '视觉', active: true, icon: 'eye' },
    { id: '触觉', label: '触觉', active: false, icon: 'hand' },
    { id: '听觉', label: '听觉', active: false, icon: 'ear' },
    { id: '嗅觉', label: '嗅觉', active: false, icon: 'nose' },
    { id: '味觉', label: '味觉', active: false, icon: 'mouth' },
  ]
}

function detectStyle(bodyDensity: number, dialogPercent: number): string {
  if (dialogPercent >= 35) return '快消口语'
  if (bodyDensity >= 40) return '冷峻白描'
  if (bodyDensity >= 25) return '感官极值'
  return '常规叙事'
}
