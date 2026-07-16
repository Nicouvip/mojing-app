/**
 * story-parser.ts
 * 画本标记解析器 — 支持有声喵DOCX格式及通用格式
 *
 * 有声喵DOCX格式：
 * - 角色定义区：【cv名】【角色名】【性别】【角色描述】【出场数】
 * - 对话标记：旁白文本【角色名-cv名】"对话内容"
 * - 旁白：不含标记的普通文本
 *
 * 通用格式：
 * - 角色名："对话内容"
 * - 【角色名】对话内容
 */

import type { CharacterAnalysis, SegmentAnalysis } from '@/lib/audiobook/prompts'

// ── 类型 ──

export interface StoryCharacter {
  name: string         // 角色名
  cvName: string       // cv名
  gender: string       // 性别
  description: string  // 角色描述
  voicePriority: number // 出场数/优先级
}

export interface StorySegment {
  type: 'narration' | 'dialogue'
  characterName?: string
  cvName?: string
  text: string
}

// ── 角色定义区解析 ──

/**
 * 解析有声喵角色定义区
 * 格式：【cv名】【角色名】【性别】【角色描述】【出场数】
 */
export function parseStoryCharacterDefs(text: string): StoryCharacter[] {
  const characters: StoryCharacter[] = []
  // 匹配完整角色定义行：5个【】
  const defPattern = /【([^】]+)】【([^】]+)】【([^】]+)】【([^】]+)】【(\d+)】/g

  let match
  while ((match = defPattern.exec(text)) !== null) {
    characters.push({
      cvName: match[1].trim(),
      name: match[2].trim(),
      gender: match[3].trim(),
      description: match[4].trim(),
      voicePriority: parseInt(match[5], 10),
    })
  }

  return characters
}

// ── 对话标记解析 ──

/**
 * 解析单行文本，分离旁白和对话
 *
 * 格式1（有声喵）：旁白文本【角色名-cv名】"对话内容"
 * 格式2（混合）：【角色名-cv名】"对话"旁白【角色名-cv名】"对话"
 */
export function parseStoryLine(line: string, knownCharacters?: Map<string, StoryCharacter>): StorySegment[] {
  const segments: StorySegment[] = []
  const trimmed = line.trim()
  if (!trimmed) return segments

  // 正则匹配【角色名-cv名】标记
  const markerPattern = /【([^】]+)-([^】]+)】/g
  let lastIndex = 0
  let match

  while ((match = markerPattern.exec(trimmed)) !== null) {
    const markerStart = match.index
    const markerEnd = match.index + match[0].length

    // 标记前的旁白文本
    if (markerStart > lastIndex) {
      const narrationText = trimmed.slice(lastIndex, markerStart).trim()
      if (narrationText) {
        segments.push({
          type: 'narration',
          text: narrationText,
        })
      }
    }

    const characterName = match[1].trim()
    const cvName = match[2].trim()

    // 找引号内的对话内容
    const afterMarker = trimmed.slice(markerEnd)
    const quoteStart = afterMarker.search(/[""「]/)

    if (quoteStart !== -1) {
      // 找到引号，提取对话内容
      const quoteChar = afterMarker[quoteStart]
      let quoteEnd: number

      if (quoteChar === '"') {
        quoteEnd = afterMarker.indexOf('"', quoteStart + 1)
      } else if (quoteChar === '「') {
        quoteEnd = afterMarker.indexOf('」', quoteStart + 1)
      } else {
        quoteEnd = afterMarker.indexOf('"', quoteStart + 1)
      }

      if (quoteEnd !== -1) {
        const dialogueText = afterMarker.slice(quoteStart + 1, quoteEnd).trim()
        if (dialogueText) {
          segments.push({
            type: 'dialogue',
            characterName,
            cvName,
            text: dialogueText,
          })
        }
        lastIndex = markerEnd + quoteEnd + 1
      } else {
        // 引号未闭合，取标记后所有文本作为对话
        const dialogueText = afterMarker.slice(quoteStart + 1).trim()
        if (dialogueText) {
          segments.push({
            type: 'dialogue',
            characterName,
            cvName,
            text: dialogueText,
          })
        }
        lastIndex = trimmed.length
      }
    } else {
      // 没有引号，标记后文本可能在同一行紧跟无引号台词
      const rest = afterMarker.trim()
      // 检查是否有下一个标记
      const nextMarkerMatch = rest.match(/【[^】]+-[^】]+】/)
      if (nextMarkerMatch) {
        // 下一个标记之前的内容作为对话
        const dialogueText = rest.slice(0, nextMarkerMatch.index).trim()
        if (dialogueText) {
          segments.push({
            type: 'dialogue',
            characterName,
            cvName,
            text: dialogueText,
          })
        }
        lastIndex = markerEnd + (nextMarkerMatch.index || 0)
      } else if (rest) {
        segments.push({
          type: 'dialogue',
          characterName,
          cvName,
          text: rest,
        })
        lastIndex = trimmed.length
      } else {
        lastIndex = markerEnd
      }
    }
  }

  // 剩余旁白
  if (lastIndex < trimmed.length) {
    const remaining = trimmed.slice(lastIndex).trim()
    if (remaining) {
      segments.push({
        type: 'narration',
        text: remaining,
      })
    }
  }

  // 如果没有匹配到任何标记，整段作为旁白
  if (segments.length === 0 && trimmed) {
    segments.push({
      type: 'narration',
      text: trimmed,
    })
  }

  return segments
}

// ── 完整画本解析 ──

/**
 * 解析完整的画本文本（有声喵DOCX格式或通用格式）
 *
 * 1. 识别角色定义区（开头几行连续的角色定义）
 * 2. 跳过分隔线和章节标题
 * 3. 解析正文段落（旁白+对话分离）
 */
export function parseStoryBook(content: string): {
  characters: CharacterAnalysis[]
  segments: SegmentAnalysis[]
  title?: string
} {
  const lines = content.split('\n').map(l => l.trim())
  const characters: StoryCharacter[] = []
  const segments: SegmentAnalysis[] = []
  let chapterTitle = ''
  let bodyStartIdx = 0

  // ── 阶段1：提取角色定义区 ──
  // 角色定义区在开头，连续出现【xxx】【xxx】... 的行
  // 可能重复两次（有声喵格式）
  const seenRoles = new Set<string>()

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue

    // 检测角色定义行（5个方括号）
    const defMatch = line.match(/【([^】]+)】【([^】]+)】【([^】]+)】【([^】]+)】【(\d+)】/)
    if (defMatch) {
      const role = defMatch[2].trim()
      if (!seenRoles.has(role)) {
        seenRoles.add(role)
        characters.push({
          cvName: defMatch[1].trim(),
          name: role,
          gender: defMatch[3].trim(),
          description: defMatch[4].trim(),
          voicePriority: parseInt(defMatch[5], 10),
        })
      }
      bodyStartIdx = i + 1
      continue
    }

    // 检测分隔线
    if (line.match(/^-{3,}$/)) {
      bodyStartIdx = i + 1
      continue
    }

    // 检测章节标题
    const titleMatch = line.match(/^第\d+章\s*(.+)/)
    if (titleMatch) {
      chapterTitle = line
      bodyStartIdx = i + 1
      continue
    }

    // 如果不是空行、不是角色定义、不是分隔线、不是标题，认为正文开始
    if (line && bodyStartIdx <= i) {
      // 向前回退，检查之前是否有角色定义
      if (characters.length > 0) {
        // 已经有角色定义，当前行是正文
        bodyStartIdx = i
      }
      break
    }
  }

  // ── 阶段2：构建角色映射 ──
  const characterMap = new Map<string, StoryCharacter>()
  for (const ch of characters) {
    characterMap.set(ch.name, ch)
  }

  // ── 阶段3：解析正文段落 ──
  let segIndex = 0

  for (let i = bodyStartIdx; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    // 跳过分隔线
    if (line.match(/^-{3,}$/)) continue
    // 跳过重复的章节标题
    if (line.match(/^第\d+章/)) {
      if (!chapterTitle) chapterTitle = line
      continue
    }

    const lineSegments = parseStoryLine(line, characterMap)

    for (const seg of lineSegments) {
      const character = seg.characterName ? characterMap.get(seg.characterName) : undefined

      segments.push({
        index: segIndex++,
        type: seg.type,
        text: seg.text,
        characterName: seg.type === 'dialogue' ? seg.characterName : undefined,
        emotion: '平静',
        emotionIntensity: 5,
        recommendedVoice: '',
        speed: inferSpeed(seg.text),
        needsPause: false,
        pauseAfter: 'normal',
        specialNote: seg.cvName ? `cv:${seg.cvName}` : undefined,
      })
    }
  }

  // ── 阶段4：转换为标准角色格式 ──
  const stdCharacters: CharacterAnalysis[] = characters.map(ch => ({
    name: ch.name,
    gender: ch.gender === '男' ? 'male' as const : 'female' as const,
    age: 'adult' as const,
    personality: ch.description || '未指定',
    recommendedVoice: '',
    recommendedEmotion: '平静',
  }))

  // 如果有旁白段落但没有"旁白"角色，添加一个
  const hasNarration = segments.some(s => s.type === 'narration')
  if (hasNarration && !stdCharacters.find(c => c.name === '旁白')) {
    stdCharacters.unshift({
      name: '旁白',
      gender: 'female',
      age: 'adult',
      personality: '旁白叙述',
      recommendedVoice: '',
      recommendedEmotion: '平静',
    })
  }

  return {
    characters: stdCharacters,
    segments,
    title: chapterTitle || undefined,
  }
}

// ── 工具函数 ──

function inferSpeed(text: string): 'slow' | 'normal' | 'fast' {
  if (text.length > 60) return 'slow'
  if (text.includes('……') || text.includes('…')) return 'slow'
  if (text.includes('！') || text.includes('!')) return 'fast'
  return 'normal'
}
