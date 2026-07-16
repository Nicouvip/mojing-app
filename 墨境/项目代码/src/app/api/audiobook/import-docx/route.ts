import { NextRequest, NextResponse } from 'next/server'
import { parseDocxBuffer } from '@/lib/audiobook/docx-parser'

/**
 * POST /api/audiobook/import-docx
 * 上传 DOCX 文件（FormData），解析有声喵画本格式
 *
 * Body: multipart/form-data { file: File (.docx) }
 * 返回: { success, characters, segments, title, meta }
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: '请上传 DOCX 文件' }, { status: 400 })
    }

    if (!file.name.endsWith('.docx')) {
      return NextResponse.json({ error: '文件格式必须为 .docx' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const result = await parseDocxBuffer(buffer)

    if (result.segments.length === 0) {
      return NextResponse.json({ error: '未能从 DOCX 中解析出任何段落，请检查格式' }, { status: 400 })
    }

    const narrationCount = result.segments.filter((s: { type: string }) => s.type === 'narration').length
    const dialogueCount = result.segments.filter((s: { type: string }) => s.type === 'dialogue').length

    return NextResponse.json({
      success: true,
      title: result.title,
      characters: result.characters,
      segments: result.segments,
      meta: {
        totalSegments: result.segments.length,
        narrationCount,
        dialogueCount,
        characterCount: result.characters.length,
        format: 'docx',
        fileName: file.name,
      },
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[Import DOCX API] Error:', errorMessage)
    return NextResponse.json({ error: 'DOCX 解析失败: ' + errorMessage }, { status: 500 })
  }
}
