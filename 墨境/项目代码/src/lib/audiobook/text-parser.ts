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

/**
 * 解析标准画本格式：【角色名-CV名】"对话内容"
 * 适用于技能包 narration-extraction.md 定义的标准画本格式
 *
 * 示例输入：
 *   【旁白-墨染】尚某接过那份资料，翻了几页。
 *   【张三-墨染】"这个文在哪儿？"
 *   【旁白-墨染】魏总笑了。
 *
 * 返回：解析后的段落列表（旁白+对话分离）
 */
export function parseBracketDialogue(text: string): TextSegment[] {
  const segments: TextSegment[] = []
  let idx = 0

  const lines = text.split('\n').filter(l => l.trim())

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // 匹配【角色-CV】"对话" 或 【角色-CV】纯文本
    const bracketPattern = /【([^】]+?)(?:-([^】]+?))?】\s*["\u201c]?([^"]*?)["\u201d]?$/g
    let lastEnd = 0
    let m: RegExpExecArray | null

    while ((m = bracketPattern.exec(trimmed)) !== null) {
      // 标记前的旁白
      if (m.index > lastEnd) {
        const before = trimmed.slice(lastEnd, m.index).trim()
        if (before) segments.push({ id: `s-${idx++}`, type: 'narration', text: before, index: idx })
      }

      const roleName = m[1]?.trim()
      const cvName = m[2]?.trim() || ''
      const dialogue = m[3]?.trim() || ''

      if (roleName === '旁白' || !dialogue) {
        // 旁白角色 → 叙述段
        segments.push({ id: `s-${idx++}`, type: 'narration', text: dialogue || roleName, index: idx })
      } else {
        // 对话角色 → 对话段
        segments.push({ id: `s-${idx++}`, type: 'dialogue', text: dialogue, characterName: roleName, index: idx })
      }

      lastEnd = m.index + m[0].length
    }

    // 标记后的剩余旁白
    if (lastEnd < trimmed.length) {
      const rest = trimmed.slice(lastEnd).trim()
      if (rest) segments.push({ id: `s-${idx++}`, type: 'narration', text: rest, index: idx })
    }
    // 整行无标记 → 旁白
    if (lastEnd === 0) {
      segments.push({ id: `s-${idx++}`, type: 'narration', text: trimmed, index: idx })
    }
  }

  return segments
}

/**
 * 解析手动标注格式：|旁白_START|...|旁白_END| + |角色_标记NN|
 * 适用于技能包 narration-extraction.md 定义的手动标注画本格式
 *
 * 示例输入：
 *   |旁白_START|
 *   尚某接过那份资料，翻了几页。
 *   |旁白_END|
 *   |角色_标记01|
 *   |旁白_START|
 *   魏总笑了。
 *   |旁白_END|
 *
 * 返回：解析后的段落列表
 */
export function parseAnnotatedFormat(text: string): TextSegment[] {
  const segments: TextSegment[] = []
  let idx = 0

  // 按标记分割
  const parts = text.split(/(\|旁白_START\||\|旁白_END\||\|角色_标记\d+\|)/)
  let inNarration = false

  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue

    if (trimmed === '|旁白_START|') {
      inNarration = true
    } else if (trimmed === '|旁白_END|') {
      inNarration = false
    } else if (/^\|角色_标记\d+\|$/.test(trimmed)) {
      // 对话标记位 → 插入标记
      segments.push({ id: `s-${idx++}`, type: 'dialogue', text: '', characterName: '角色位', index: idx })
    } else if (inNarration) {
      segments.push({ id: `s-${idx++}`, type: 'narration', text: trimmed, index: idx })
    } else if (!trimmed.startsWith('|')) {
      segments.push({ id: `s-${idx++}`, type: 'narration', text: trimmed, index: idx })
    }
  }

  return segments
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
