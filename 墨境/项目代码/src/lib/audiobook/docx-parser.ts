import { type CharacterAnalysis, type SegmentAnalysis } from '@/lib/audiobook/prompts'
import mammoth from 'mammoth'

/**
 * DOCX 画本解析器
 *
 * 用 mammoth 从 DOCX 文件提取纯文本，然后交给内部逻辑解析。
 *
 * 有声喵 DOCX 格式：
 * - 角色定义区：【cv名】【角色名】【性别】【角色描述】【出场数】
 * - 正文段落：旁白文本【角色名-cv名】"对话内容"
 */

/* ── 类型 ── */
export interface DocxParseResult {
  characters: CharacterAnalysis[]
  segments: SegmentAnalysis[]
  title?: string
  meta: {
    totalCharacters: number
    totalSegments: number
    narrationCount: number
    dialogueCount: number
    sourceFormat: 'youShengMiao' | 'plain'
  }
}

/* ── 有声喵角色定义区解析 ── */

interface RawCharacter {
  cvName: string
  name: string
  gender: string
  description: string
  count: number
}

function parseCharacterDefs(text: string): { characters: RawCharacter[]; bodyStartIdx: number } {
  const characters: RawCharacter[] = []
  const seen = new Set<string>()
  const lines = text.split('\n')
  let bodyStartIdx = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // 角色定义行：5个方括号
    const m = line.match(/^【([^】]+)】【([^】]+)】【([^】]+)】【([^】]+)】【(\d+)】$/)
    if (m) {
      const name = m[2].trim()
      if (!seen.has(name)) {
        seen.add(name)
        characters.push({
          cvName: m[1].trim(),
          name,
          gender: m[3].trim(),
          description: m[4].trim(),
          count: parseInt(m[5], 10),
        })
      }
      bodyStartIdx = i + 1
      continue
    }

    // 分隔线
    if (line.match(/^-{5,}$/)) {
      bodyStartIdx = i + 1
      continue
    }

    // 如果遇到非空非角色定义非分隔线行，正文开始
    if (characters.length > 0) break
  }

  return { characters, bodyStartIdx }
}

/* ── 正文段落解析（有声喵标记格式） ── */

function parseBodySegments(bodyText: string): SegmentAnalysis[] {
  const lines = bodyText.split('\n')
  const segments: SegmentAnalysis[] = []
  let idx = 0

  // 标记正则：【角色名-cv名】
  const markerRe = /【([^】]+)-([^】]+)】/g

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    // 跳过章节标题行
    if (line.match(/^第\d+章/)) continue
    // 跳过分隔线
    if (line.match(/^-{5,}$/)) continue

    // 检测是否有对话标记
    const markers: Array<{ charName: string; cvName: string; start: number; end: number }> = []
    let m: RegExpExecArray | null
    markerRe.lastIndex = 0
    while ((m = markerRe.exec(line)) !== null) {
      markers.push({
        charName: m[1].trim(),
        cvName: m[2].trim(),
        start: m.index,
        end: m.index + m[0].length,
      })
    }

    if (markers.length === 0) {
      // 纯旁白段落
      segments.push({
        index: idx++,
        type: 'narration',
        text: line,
        emotion: '平静',
        emotionIntensity: 5,
        recommendedVoice: '',
        speed: inferSpeed(line),
        needsPause: false,
        pauseAfter: 'normal',
      })
      continue
    }

    // 有标记的行 → 拆分旁白和对话
    let cursor = 0
    for (const mk of markers) {
      // 标记前的旁白
      if (mk.start > cursor) {
        const narrationText = line.slice(cursor, mk.start).trim()
        if (narrationText) {
          segments.push({
            index: idx++,
            type: 'narration',
            text: narrationText,
            emotion: '平静',
            emotionIntensity: 5,
            recommendedVoice: '',
            speed: inferSpeed(narrationText),
            needsPause: false,
            pauseAfter: 'normal',
          })
        }
      }

      // 标记后的对话内容（可能有引号包裹）
      const afterMarker = line.slice(mk.end)
      const quoteMatch = afterMarker.match(/^[\"""「]([^"""}」]+)[\"""」]/)
      let dialogueText: string
      let advance: number

      if (quoteMatch) {
        dialogueText = quoteMatch[1]
        advance = mk.end + quoteMatch[0].length
      } else {
        // 没有引号 → 取到下一个标记或行尾
        const nextMarkerIdx = afterMarker.search(/【[^】]+-/)
        if (nextMarkerIdx > 0) {
          dialogueText = afterMarker.slice(0, nextMarkerIdx).trim()
          advance = mk.end + nextMarkerIdx
        } else {
          dialogueText = afterMarker.trim()
          advance = line.length
        }
      }

      if (dialogueText) {
        segments.push({
          index: idx++,
          type: 'dialogue',
          text: dialogueText,
          characterName: mk.charName,
          emotion: '平静',
          emotionIntensity: 5,
          recommendedVoice: '',
          speed: inferSpeed(dialogueText),
          needsPause: false,
          pauseAfter: 'normal',
          specialNote: `cv:${mk.cvName}`,
        })
      }
      cursor = advance
    }

    // 标记后的剩余旁白
    if (cursor < line.length) {
      const rest = line.slice(cursor).trim()
      if (rest) {
        segments.push({
          index: idx++,
          type: 'narration',
          text: rest,
          emotion: '平静',
          emotionIntensity: 5,
          recommendedVoice: '',
          speed: inferSpeed(rest),
          needsPause: false,
          pauseAfter: 'normal',
        })
      }
    }
  }

  return segments
}

/* ── 普通纯文本（无有声喵标记）解析 ── */

function parsePlainText(text: string): SegmentAnalysis[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  return lines.map((line, i) => ({
    index: i,
    type: 'narration' as const,
    text: line,
    emotion: '平静',
    emotionIntensity: 5,
    recommendedVoice: '',
    speed: inferSpeed(line),
    needsPause: false,
    pauseAfter: 'normal' as const,
  }))
}

/* ── 主入口1：从DOCX二进制Buffer解析（用mammoth提取文本） ── */

export async function parseDocxBuffer(buffer: Buffer): Promise<DocxParseResult> {
  const result = await mammoth.extractRawText({ buffer })
  const plainText = result.value
  return parseDocxText(plainText)
}

/* ── 主入口2：从纯文本解析 ── */

export function parseDocxText(plainText: string): DocxParseResult {
  // 1. 检测是否是有声喵格式（有角色定义区）
  const { characters: rawChars, bodyStartIdx } = parseCharacterDefs(plainText)

  let segments: SegmentAnalysis[]
  let title: string | undefined

  if (rawChars.length > 0) {
    // 有声喵格式
    const bodyText = plainText.split('\n').slice(bodyStartIdx).join('\n')
    segments = parseBodySegments(bodyText)

    // 提取章节标题
    const titleMatch = plainText.match(/^(第\d+章.+)$/m)
    title = titleMatch?.[1]
  } else {
    // 普通纯文本
    segments = parsePlainText(plainText)
  }

  // 2. 转换角色为标准格式
  const characters: CharacterAnalysis[] = rawChars.map(ch => ({
    name: ch.name,
    gender: ch.gender === '男' ? 'male' as const : 'female' as const,
    age: 'adult' as const,
    personality: ch.description || '未指定',
    recommendedVoice: '',
    recommendedEmotion: '平静',
  }))

  // 如果有对话段落但没有旁白角色，添加一个
  const hasNarration = segments.some(s => s.type === 'narration')
  if (hasNarration && !characters.find(c => c.name === '旁白')) {
    characters.unshift({
      name: '旁白',
      gender: 'female',
      age: 'adult',
      personality: '旁白叙述',
      recommendedVoice: '',
      recommendedEmotion: '平静',
    })
  }

  // 3. 统计
  const narrationCount = segments.filter(s => s.type === 'narration').length
  const dialogueCount = segments.filter(s => s.type === 'dialogue').length

  return {
    characters,
    segments,
    title,
    meta: {
      totalCharacters: characters.length,
      totalSegments: segments.length,
      narrationCount,
      dialogueCount,
      sourceFormat: rawChars.length > 0 ? 'youShengMiao' : 'plain',
    },
  }
}

/* ── 工具 ── */

function inferSpeed(text: string): 'slow' | 'normal' | 'fast' {
  if (text.length > 60) return 'slow'
  if (text.includes('……') || text.includes('…')) return 'slow'
  if (text.includes('！') || text.includes('!')) return 'fast'
  return 'normal'
}
