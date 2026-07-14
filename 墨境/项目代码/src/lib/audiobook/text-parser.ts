/**
 * 文本解析器 — 识别对话/叙述/角色名
 */

export interface TextSegment {
  id: string
  type: 'narration' | 'dialogue'
  text: string
  characterName?: string
  index: number
}

export interface DetectedCharacter {
  name: string
  count: number
  firstDialogueIndex: number
}

const CHAR_COLORS = ['#c4956a', '#3a5279', '#b5454a', '#7a9e7a', '#8e63ce', '#d4a0a0', '#4a86e8', '#eaa041']

/**
 * 解析文本为结构化段落（识别「」""''中的对话）
 */
export function parseTextToSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = []
  let idx = 0

  // 按段落分割
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim())

  for (const para of paragraphs) {
    const lines = para.trim().split('\n').filter(l => l.trim())
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      // 匹配引号对话
      const quotePattern = /[「『""](.+?)[」』""]/g
      let lastEnd = 0
      let m: RegExpExecArray | null

      while ((m = quotePattern.exec(trimmed)) !== null) {
        // 引号前的叙述
        if (m.index > lastEnd) {
          const before = trimmed.slice(lastEnd, m.index).trim()
          if (before) segments.push({ id: `s-${idx++}`, type: 'narration', text: before, index: idx })
        }
        // 对话内容
        const charName = extractCharName(trimmed.slice(Math.max(0, m.index - 10), m.index))
        segments.push({ id: `s-${idx++}`, type: 'dialogue', text: m[1], characterName: charName || '未知角色', index: idx })
        lastEnd = m.index + m[0].length
      }
      // 引号后的叙述
      if (lastEnd < trimmed.length) {
        const rest = trimmed.slice(lastEnd).trim()
        if (rest) segments.push({ id: `s-${idx++}`, type: 'narration', text: rest, index: idx })
      }
      // 没有引号整行是叙述
      if (lastEnd === 0) {
        segments.push({ id: `s-${idx++}`, type: 'narration', text: trimmed, index: idx })
      }
    }
  }
  return segments
}

/** 别名 */
export const parseChapterText = parseTextToSegments

/** 从引号前提取角色名 */
function extractCharName(text: string): string | null {
  if (!text) return null
  const match = text.match(/([^\s，。！？]{1,6})(?:说|道|问|喊|笑|叹|冷|怒|低|轻|沉|厉|淡淡|缓缓|温和|温柔|严肃|焦急|惊讶|疑惑|得意|无奈|感慨|心疼|微微笑|轻轻|淡淡一)/)
  if (match) return match[1]
  return null
}

/** 获取角色列表 */
export function extractCharacters(segments: TextSegment[]): DetectedCharacter[] {
  const map = new Map<string, DetectedCharacter>()
  for (const seg of segments) {
    if (seg.type === 'dialogue' && seg.characterName) {
      const existing = map.get(seg.characterName)
      if (existing) existing.count++
      else map.set(seg.characterName, { name: seg.characterName, count: 1, firstDialogueIndex: seg.index })
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count)
}

export { CHAR_COLORS }
