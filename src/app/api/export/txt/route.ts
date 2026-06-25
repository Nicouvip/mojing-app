import { NextResponse } from 'next/server'

interface ChapterData {
  title: string
  content: string
  order: number
}

export async function POST(req: Request) {
  try {
    const { projectName, chapters }: { projectName: string; chapters: ChapterData[] } = await req.json()

    if (!chapters || chapters.length === 0) {
      return NextResponse.json({ error: '没有章节可导出' }, { status: 400 })
    }

    // 按 order 排序，合并章节
    const sorted = [...chapters].sort((a, b) => a.order - b.order)

    const lines: string[] = []
    lines.push(`《${projectName || '未命名作品'}》`)
    lines.push(`导出时间：${new Date().toLocaleString('zh-CN')}`)
    lines.push(`共 ${sorted.length} 章 · ${sorted.reduce((s, c) => s + (c.content?.length || 0), 0).toLocaleString()} 字`)
    lines.push('')
    lines.push('═'.repeat(50))
    lines.push('')

    for (const ch of sorted) {
      lines.push(`第${ch.order}章  ${ch.title || '无标题'}`)
      lines.push('─'.repeat(40))
      lines.push('')
      lines.push(ch.content || '')
      lines.push('')
      lines.push('')
    }

    const txt = lines.join('\n')

    return new NextResponse(txt, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(projectName || '作品')}.txt"`,
      },
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '未知错误' }, { status: 500 })
  }
}
