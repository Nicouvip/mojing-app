import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

/**
 * POST /api/audiobook/import
 * 导入小说文本到有声书项目
 * 
 * Body: { projectId, text, title?, splitMode? }
 * - text: 小说文本内容
 * - title: 可选，导入后的标题
 * - splitMode: 'auto' | 'manual' | 'none'
 *   - auto: 按"第X章"等标题自动分章
 *   - manual: 按换行符分章
 *   - none: 整体作为一个章节
 */

/** 按章节标题自动分割 */
function splitByChapterTitle(text: string): Array<{ title: string; content: string }> {
  // 匹配常见的章节标题模式
  const patterns = [
    /^第[一二三四五六七八九十百千万\d]+章[^\n]*/gm,           // 第一章 xxx
    /^第[一二三四五六七八九十百千万\d]+节[^\n]*/gm,           // 第一节 xxx
    /^第[一二三四五六七八九十百千万\d]+[^\n]*/gm,             // 第一xxx
    /^Chapter\s+\d+[^\n]*/gim,                                // Chapter 1
    /^CHAPTER\s+\d+[^\n]*/gim,                                // CHAPTER 1
    /^\d+\.\s+[^\n]+/gm,                                     // 1. Title
    /^【[^】]+】/gm,                                          // 【番外】
    /^序章[^\n]*/gm,                                          // 序章
    /^楔子[^\n]*/gm,                                          // 楔子
    /^尾声[^\n]*/gm,                                          // 尾声
    /^后记[^\n]*/gm,                                          // 后记
  ]

  // 找到所有匹配的章节标题位置
  const matches: Array<{ start: number; title: string; lineIndex: number }> = []
  const lines = text.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    for (const pattern of patterns) {
      pattern.lastIndex = 0
      if (pattern.test(line)) {
        matches.push({
          start: i,
          title: line.slice(0, 50), // 标题最长50字
          lineIndex: i,
        })
        break
      }
    }
  }

  // 如果没找到章节标题，尝试按空行分割
  if (matches.length < 2) {
    return splitByEmptyLine(text)
  }

  const chapters: Array<{ title: string; content: string }> = []
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].lineIndex
    const end = i + 1 < matches.length ? matches[i + 1].lineIndex : lines.length
    const chapterText = lines.slice(start, end).join('\n').trim()

    if (chapterText.length > 10) {
      chapters.push({
        title: matches[i].title,
        content: chapterText,
      })
    }
  }

  return chapters
}

/** 按空行分割 */
function splitByEmptyLine(text: string): Array<{ title: string; content: string }> {
  const blocks = text.split(/\n\s*\n/).filter(b => b.trim().length > 20)
  return blocks.map((block, i) => ({
    title: `第 ${i + 1} 段`,
    content: block.trim(),
  }))
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }
    const body = await request.json()
    const { projectId, text, title, splitMode = 'auto' } = body

    if (!projectId || !text) {
      return NextResponse.json({ error: 'projectId and text are required' }, { status: 400 })
    }

    if (text.length < 10) {
      return NextResponse.json({ error: '文本内容过短' }, { status: 400 })
    }

    let chapters: Array<{ title: string; content: string }> = []

    switch (splitMode) {
      case 'auto':
        chapters = splitByChapterTitle(text)
        // 如果自动分割失败，退回按空行分割
        if (chapters.length < 2) {
          chapters = splitByEmptyLine(text)
        }
        break
      case 'manual':
        chapters = splitByEmptyLine(text)
        break
      case 'none':
        chapters = [{
          title: title || '导入文本',
          content: text,
        }]
        break
      default:
        chapters = splitByChapterTitle(text)
    }

    // 如果还是只有一个章节且没有标题，用默认标题
    if (chapters.length === 1 && !title) {
      chapters[0].title = '导入文本'
    }

    const totalWords = text.replace(/\s/g, '').length
    const totalChars = text.length

    return NextResponse.json({
      success: true,
      projectId,
      chapters,
      stats: {
        totalChapters: chapters.length,
        totalChars: totalChars,
        totalWords: totalWords,
        avgChapterLength: Math.round(totalChars / Math.max(chapters.length, 1)),
      },
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[Import API] Error:', errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
