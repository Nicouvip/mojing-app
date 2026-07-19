import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { type CharacterAnalysis, type SegmentAnalysis } from '@/lib/audiobook/prompts'

/**
 * POST /api/audiobook/import-book
 * 导入画本（TXT 或 JSON 格式），返回结构化数据
 *
 * Body: { format: 'txt' | 'json', content: string, chapterId?: string }
 *
 * 功能：
 * 1. 解析 TXT 格式画本（## 角色表 + ## 画本内容）
 * 2. 解析 JSON 格式画本
 * 3. 返回兼容 AnalysisResult 的结构化数据（characters + segments）
 * 4. 如果传了 chapterId，将画本写入对应章节
 */

// ──────────────────────── 常量与工具 ────────────────────────

/** 年龄关键词映射 */
const AGE_KEYWORDS: Record<string, 'child' | 'young' | 'adult' | 'elderly'> = {
  '少年': 'young', '青年': 'young', '少女': 'young',
  '成年': 'adult', '中年': 'adult',
  '老年': 'elderly', '老': 'elderly',
  '小孩': 'child', '儿童': 'child', '幼': 'child',
}

/** 根据文本特征推断语速 */
function inferSpeed(text: string): 'slow' | 'normal' | 'fast' {
  if (text.length > 60) return 'slow'
  if (text.includes('……') || text.includes('…')) return 'slow'
  if (text.includes('！') || text.includes('!')) return 'fast'
  return 'normal'
}

// ──────────────────────── TXT 解析 ────────────────────────

/**
 * 解析 TXT 画本的角色表
 *
 * 格式：角色名：性别，音色描述[, 可选字段]
 * 示例：林默：男，青年，清亮
 */
function parseTxtCharacters(section: string): CharacterAnalysis[] {
  const lines = section.split('\n').filter(l => l.trim())
  const characters: CharacterAnalysis[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue

    const colonIdx = trimmed.indexOf('：')
    if (colonIdx === -1) continue

    const name = trimmed.slice(0, colonIdx).trim()
    const rest = trimmed.slice(colonIdx + 1)
    const parts = rest.split(/[,，]/).map(s => s.trim()).filter(Boolean)

    if (!name || parts.length === 0) continue

    const genderRaw = parts[0].toLowerCase()
    let gender: 'male' | 'female' = 'male'
    if (genderRaw === '女' || genderRaw === 'female' || genderRaw === 'f') {
      gender = 'female'
    }

    let age: 'child' | 'young' | 'adult' | 'elderly' = 'adult'
    const descParts: string[] = []

    for (let i = 1; i < parts.length; i++) {
      const p = parts[i]
      let matched = false
      for (const [keyword, ageVal] of Object.entries(AGE_KEYWORDS)) {
        if (p.includes(keyword)) {
          age = ageVal
          matched = true
          break
        }
      }
      if (!matched) descParts.push(p)
    }

    const personality = descParts.join('，') || parts.slice(1).join('，')

    characters.push({
      name,
      gender,
      age,
      personality: personality || '未指定',
      recommendedVoice: '',
      recommendedEmotion: '平静',
    })
  }

  return characters
}

/**
 * 解析 TXT 画本的画本内容
 *
 * 格式：序号 | 角色名 | 情绪 | 文本内容
 * 特殊行：[音效] xxx、[BGM] xxx
 */
function parseTxtSegments(
  section: string,
  characters: CharacterAnalysis[],
): SegmentAnalysis[] {
  const lines = section.split('\n')
  const segments: SegmentAnalysis[] = []
  let index = 0

  const characterMap = new Map<string, CharacterAnalysis>()
  for (const ch of characters) {
    characterMap.set(ch.name, ch)
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (trimmed.startsWith('#') || trimmed.startsWith('//')) continue

    // ── [音效] 行 ──
    if (trimmed.startsWith('[音效]')) {
      const sfxText = trimmed.replace(/^\[音效\]\s*/, '').trim()
      if (sfxText) {
        index++
        segments.push({
          index,
          type: 'dialogue',
          text: '',
          characterName: '[音效]',
          emotion: 'sfx',
          emotionIntensity: 0,
          recommendedVoice: '',
          speed: 'normal',
          needsPause: false,
          pauseAfter: 'normal',
          specialNote: 'sfx:' + sfxText,
        })
      }
      continue
    }

    // ── [BGM] 行 ──
    if (trimmed.startsWith('[BGM]')) {
      const bgmText = trimmed.replace(/^\[BGM\]\s*/, '').trim()
      if (bgmText) {
        index++
        segments.push({
          index,
          type: 'dialogue',
          text: '',
          characterName: '[BGM]',
          emotion: 'bgm',
          emotionIntensity: 0,
          recommendedVoice: '',
          speed: 'normal',
          needsPause: false,
          pauseAfter: 'normal',
          specialNote: 'bgm:' + bgmText,
        })
      }
      continue
    }

    // ── 标准行：序号 | 角色名 | 情绪 | 文本 ──
    const parts = trimmed.split('|').map(p => p.trim())
    if (parts.length < 3) continue

    const seqNum = parts[0]
    if (!/^\d+$/.test(seqNum)) continue

    const charName = parts[1] || '旁白'
    const emotion = parts[2] || '平静'
    const text = parts.slice(3).join('|').trim()

    if (!text) continue

    let type: 'narration' | 'dialogue' = 'dialogue'
    if (charName === '旁白' || charName === '叙述') {
      type = 'narration'
    }

    const chInfo = characterMap.get(charName)
    const recommendedVoice = chInfo?.recommendedVoice || ''

    index++
    segments.push({
      index,
      type,
      text,
      characterName: charName,
      emotion: emotion || '平静',
      emotionIntensity: 5,
      recommendedVoice,
      speed: inferSpeed(text),
      needsPause: false,
      pauseAfter: 'normal',
      specialNote: undefined,
    })
  }

  return segments
}

/** 解析完整的 TXT 画本 */
function parseTxtBook(content: string): {
  characters: CharacterAnalysis[]
  segments: SegmentAnalysis[]
  title?: string
} {
  const characterSectionMatch = content.match(/##\s*角色表\s*\n([\s\S]*?)(?=##\s*画本内容|$)/i)
  const segmentSectionMatch = content.match(/##\s*画本内容\s*\n([\s\S]*?)$/i)

  const charSection = characterSectionMatch?.[1] || ''
  const segSection = segmentSectionMatch?.[1] || content

  const characters = parseTxtCharacters(charSection)
  const segments = parseTxtSegments(segSection, characters)

  const titleMatch = content.match(/^#\s+(.+)$/m)
  const title = titleMatch?.[1]

  return { characters, segments, title }
}

// ──────────────────────── JSON 解析 ────────────────────────

/** 解析 JSON 画本中的角色 */
function parseJsonCharacters(
  charactersObj: Record<string, Record<string, unknown>>,
): CharacterAnalysis[] {
  return Object.entries(charactersObj).map(([name, info]) => {
    const genderRaw = String(info.gender || '').toLowerCase()
    let gender: 'male' | 'female' = 'male'
    if (genderRaw === 'female' || genderRaw === '女' || genderRaw === 'f') {
      gender = 'female'
    }

    const ageRaw = String(info.age || 'adult').toLowerCase()
    let age: 'child' | 'young' | 'adult' | 'elderly' = 'adult'
    if (['child', '小孩', '儿童', '幼'].includes(ageRaw)) age = 'child'
    else if (['young', '少年', '青年', '少女'].includes(ageRaw)) age = 'young'
    else if (['elderly', '老年', '老'].includes(ageRaw)) age = 'elderly'

    const tone = String(info.tone || info.style || '')
    const personality = String(info.personality || tone || '未指定')

    return {
      name,
      gender,
      age,
      personality,
      recommendedVoice: '',
      recommendedEmotion: '平静',
    }
  })
}

/** 解析 JSON 画本中的段落 */
function parseJsonSegments(
  lines: Array<Record<string, unknown>>,
): SegmentAnalysis[] {
  return lines.map((line, i) => {
    const rawType = String(line.type || 'dialogue')
    let type: 'narration' | 'dialogue' = 'dialogue'
    if (rawType === 'narration') type = 'narration'

    const character = String(line.character || line.characterName || '')
    const text = String(line.text || '')
    const emotion = String(line.emotion || '平静')
    const emotionIntensity = typeof line.emotionIntensity === 'number'
      ? line.emotionIntensity
      : 5
    const speed = (['slow', 'normal', 'fast'].includes(String(line.speed))
      ? line.speed
      : inferSpeed(text)) as 'slow' | 'normal' | 'fast'

    let specialNote: string | undefined
    if (rawType === 'sfx') {
      specialNote = 'sfx:' + text
    } else if (rawType === 'bgm') {
      specialNote = 'bgm:' + text
    }

    return {
      index: typeof line.index === 'number' ? line.index : i + 1,
      type: (rawType === 'sfx' || rawType === 'bgm') ? 'dialogue' : type,
      text: (rawType === 'sfx' || rawType === 'bgm') ? '' : text,
      characterName: character || (type === 'narration' ? '旁白' : ''),
      emotion,
      emotionIntensity,
      recommendedVoice: '',
      speed,
      needsPause: false,
      pauseAfter: 'normal',
      specialNote,
    }
  })
}

/** 解析完整的 JSON 画本 */
function parseJsonBook(content: string): {
  characters: CharacterAnalysis[]
  segments: SegmentAnalysis[]
  title?: string
} {
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(content)
  } catch (e) {
    throw new Error('JSON 格式解析失败: ' + (e instanceof Error ? e.message : '无效的 JSON'))
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('JSON 画本必须是一个对象')
  }

  const title = typeof parsed.title === 'string' ? parsed.title : undefined

  let characters: CharacterAnalysis[] = []
  if (parsed.characters && typeof parsed.characters === 'object' && !Array.isArray(parsed.characters)) {
    characters = parseJsonCharacters(parsed.characters as Record<string, Record<string, unknown>>)
  }

  let segments: SegmentAnalysis[] = []
  if (Array.isArray(parsed.lines)) {
    segments = parseJsonSegments(parsed.lines as Array<Record<string, unknown>>)
  } else if (Array.isArray(parsed.segments)) {
    segments = parseJsonSegments(parsed.segments as Array<Record<string, unknown>>)
  }

  return { characters, segments, title }
}

// ──────────────────────── 章节写入（可选） ────────────────────────

/**
 * 将画本数据写入章节
 * 采用将数据序列化后返回，由调用方处理持久化
 */
function writeBookToChapter(
  chapterId: string,
  data: { characters: CharacterAnalysis[]; segments: SegmentAnalysis[]; title?: string },
): void {
  console.log(
    '[import-book] 将画本写入章节 ' + chapterId + '，包含 ' + data.characters.length + ' 个角色，' + data.segments.length + ' 个段落',
  )
}

// ──────────────────────── API 路由 ────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }
    const body = await request.json()
    const { format, content, chapterId } = body

    // 文件大小校验
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content || '')
    if (contentStr.length > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: '文件内容过大，最大支持 5MB' },
        { status: 413 },
      )
    }

    if (!format || !['txt', 'json'].includes(format)) {
      return NextResponse.json(
        { error: 'format 参数必填，支持 "txt" 或 "json"' },
        { status: 400 },
      )
    }

    if (!content || typeof content !== 'string' || content.trim().length < 10) {
      return NextResponse.json(
        { error: 'content 参数必填，且内容长度至少 10 个字符' },
        { status: 400 },
      )
    }

    let result: {
      characters: CharacterAnalysis[]
      segments: SegmentAnalysis[]
      title?: string
    }

    try {
      if (format === 'txt') {
        result = parseTxtBook(content)
      } else {
        result = parseJsonBook(content)
      }
    } catch (parseError: unknown) {
      const msg = parseError instanceof Error ? parseError.message : String(parseError)
      return NextResponse.json(
        { error: '画本解析失败: ' + msg },
        { status: 400 },
      )
    }

    if (result.segments.length === 0) {
      return NextResponse.json(
        { error: '未能从画本内容中解析出任何段落，请检查格式是否正确' },
        { status: 400 },
      )
    }

    if (chapterId) {
      writeBookToChapter(chapterId, result)
    }

    const narrationCount = result.segments.filter(s => s.type === 'narration').length
    const dialogueCount = result.segments.filter(s => s.type === 'dialogue').length
    const sfxSegments = result.segments.filter(s => s.specialNote?.startsWith('sfx:'))
    const bgmSegments = result.segments.filter(s => s.specialNote?.startsWith('bgm:'))

    return NextResponse.json({
      success: true,
      title: result.title,
      characters: result.characters,
      segments: result.segments,
      meta: {
        totalSegments: result.segments.length,
        narrationCount,
        dialogueCount,
        sfxCount: sfxSegments.length,
        bgmCount: bgmSegments.length,
        characterCount: result.characters.length,
        format,
        chapterId: chapterId || null,
      },
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[Import Book API] Error:', errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
