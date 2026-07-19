import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

/**
 * POST /api/audiobook/arrange/parse
 * 多轨编排 — 画本解析
 *
 * Body: { text: string, mode?: 'auto' | 'annotated', silenceMs?: number }
 *
 * 解析画本文本为编排清单（旁白段 + 对话标记位 + 静音段）
 * 移植自 scripts/narrate_arrange_lib/parser.py
 */

type SegmentType = 'narration' | 'dialog_marker' | 'silence'

interface ArrangeSegment {
  type: SegmentType
  text?: string
  label?: string
  note?: string
  ms?: number
}

// ── 中文引号常量 ──
const QT = '\u201c'    // "
const QT_END = '\u201d' // "

// ── 正则模式 ──
const PATTERN_DIALOG_FULL = new RegExp(`【[^】]+】(?:${QT}|")[^${QT_END}"]*(?:${QT_END}|")`, 'g')
const PATTERN_NARRATION_WRAP = new RegExp(`【旁白[^】]*】(?:${QT}|")([^${QT_END}"]*)(?:${QT_END}|")`, 'g')
const PATTERN_ROLE_TAG = /【[^】]+】/g
const PATTERN_DIALOG_EXTRACT = new RegExp(`【([^】]+?)(?:-[^】]*)?】(?:${QT}|")([^${QT_END}"]*)(?:${QT_END}|")`, 'g')

// 模式B正则
const PATTERN_ANNOTATED = /\|旁白_START\|\s*([\s\S]*?)\s*\|旁白_END\|/g
const PATTERN_MARKER = /\|角色[ _]*(.+?)\|/g

/**
 * 模式A：自动解析标准画本格式
 */
function parseAuto(text: string): ArrangeSegment[] {
  const segments: ArrangeSegment[] = []
  const lines = text.split('\n')
  let markerCounter = 0
  let pendingNarration: string[] = []

  const flushNarration = () => {
    if (pendingNarration.length > 0) {
      const combined = pendingNarration.join('').trim()
      if (combined) {
        segments.push({ type: 'narration', text: combined })
      }
      pendingNarration = []
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // 检查 【旁白-CV】"内容" 包裹格式
    const nWrap = new RegExp(PATTERN_NARRATION_WRAP.source, PATTERN_NARRATION_WRAP.flags)
    const nMatch = nWrap.exec(line)
    if (nMatch) {
      flushNarration()
      const content = nMatch[1]?.trim()
      if (content) {
        segments.push({ type: 'narration', text: content })
      }
      continue
    }

    // 检查是否包含 【角色-CV】"对话"
    const dFull = new RegExp(PATTERN_DIALOG_FULL.source, PATTERN_DIALOG_FULL.flags)
    if (dFull.test(line)) {
      flushNarration()

      // 提取角色名和对话内容
      const dExtract = new RegExp(PATTERN_DIALOG_EXTRACT.source, PATTERN_DIALOG_EXTRACT.flags)
      let dm: RegExpExecArray | null
      while ((dm = dExtract.exec(line)) !== null) {
        const role = dm[1]?.trim()
        const dialogText = dm[2]?.trim()

        // 跳过旁白标记行
        if (role?.startsWith('旁白')) continue

        markerCounter++
        const note = dialogText ? `${role}：${dialogText}` : role || ''
        segments.push({
          type: 'dialog_marker',
          label: `标记${String(markerCounter).padStart(2, '0')}`,
          note,
        })
      }

      // 检查行内是否有旁白残留
      let remaining = line
      remaining = remaining.replace(new RegExp(PATTERN_DIALOG_FULL.source, 'g'), '').trim()
      remaining = remaining.replace(PATTERN_ROLE_TAG, '').trim()
      if (remaining && remaining !== '"' && remaining !== '」' && remaining !== '「') {
        pendingNarration.push(remaining)
      }
      continue
    }

    // 纯文字行 → 作为旁白累积
    const clean = line.replace(PATTERN_ROLE_TAG, '').trim()
    if (clean) {
      pendingNarration.push(clean)
    }
  }

  // 收尾累积旁白
  flushNarration()

  // 去掉末尾多余的静音段
  while (segments.length > 0 && segments[segments.length - 1].type === 'silence') {
    segments.pop()
  }

  return segments
}

/**
 * 模式B：手动标注格式
 */
function parseAnnotated(text: string): ArrangeSegment[] {
  const segments: ArrangeSegment[] = []
  let lastEnd = 0

  let m: RegExpExecArray | null
  const annotRe = new RegExp(PATTERN_ANNOTATED.source, PATTERN_ANNOTATED.flags)
  while ((m = annotRe.exec(text)) !== null) {
    // 旁白段前的内容 → 可能有角色标记
    const before = text.slice(lastEnd, m.index).trim()
    if (before) {
      const markerRe = new RegExp(PATTERN_MARKER.source, PATTERN_MARKER.flags)
      let mm: RegExpExecArray | null
      while ((mm = markerRe.exec(before)) !== null) {
        const raw = mm[1]?.trim() || ''
        const code = raw.replace('标记', '').trim()
        segments.push({
          type: 'dialog_marker',
          label: `标记${code}`,
          note: raw,
        })
      }
    }

    // 旁白段
    const narrationText = m[1]?.trim()
    if (narrationText) {
      segments.push({ type: 'narration', text: narrationText })
    }

    lastEnd = m.index + m[0].length
  }

  // 尾部剩余标记
  const tail = text.slice(lastEnd).trim()
  if (tail) {
    const markerRe = new RegExp(PATTERN_MARKER.source, PATTERN_MARKER.flags)
    let mm: RegExpExecArray | null
    while ((mm = markerRe.exec(tail)) !== null) {
      const raw = mm[1]?.trim() || ''
      const code = raw.replace('标记', '').trim()
      segments.push({
        type: 'dialog_marker',
        label: `标记${code}`,
        note: raw,
      })
    }
  }

  return segments
}

/**
 * 在旁白段和对话标记之间插入静音段
 */
function insertSilence(segments: ArrangeSegment[], silenceMs: number): ArrangeSegment[] {
  const result: ArrangeSegment[] = []
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    // 在非首段且前段不是静音时，插入静音
    if (i > 0 && seg.type !== 'silence' && result.length > 0 && result[result.length - 1].type !== 'silence') {
      result.push({ type: 'silence', ms: silenceMs })
    }
    result.push(seg)
  }
  return result
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const body = await request.json()
    const { text, mode = 'auto', silenceMs = 800 } = body

    if (!text || text.trim().length < 10) {
      return NextResponse.json({ error: '画本内容过短' }, { status: 400 })
    }

    // 解析
    const rawSegments = mode === 'annotated' ? parseAnnotated(text) : parseAuto(text)

    // 插入静音段
    const arranged = insertSilence(rawSegments, silenceMs)

    // 统计
    const narrationCount = arranged.filter(s => s.type === 'narration').length
    const markerCount = arranged.filter(s => s.type === 'dialog_marker').length
    const silenceCount = arranged.filter(s => s.type === 'silence').length
    const totalChars = arranged
      .filter(s => s.type === 'narration')
      .reduce((sum, s) => sum + (s.text?.length || 0), 0)

    return NextResponse.json({
      success: true,
      segments: arranged,
      stats: {
        total: arranged.length,
        narration: narrationCount,
        dialogMarker: markerCount,
        silence: silenceCount,
        totalChars,
      },
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[Arrange Parse] Error:', errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
