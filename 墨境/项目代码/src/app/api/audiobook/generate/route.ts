import { NextRequest, NextResponse } from 'next/server'
import { MiMoTTSEngine } from '@/lib/audiobook/mimo-tts'

/**
 * POST /api/audiobook/generate
 * 生成有声书音频（SSE 流式）
 * 
 * Body: { text: string, voice: string, emotion?: string, style?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, voice, emotion, style, format } = body

    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }
    if (!voice) {
      return NextResponse.json({ error: 'voice is required' }, { status: 400 })
    }

    const engine = new MiMoTTSEngine()
    const result = await engine.generate({
      text,
      voice,
      emotion,
      style,
      format: format || 'wav',
    })

    const base64Audio = result.audioBuffer.toString('base64')

    return NextResponse.json({
      success: true,
      audio: base64Audio,
      duration: result.duration,
      format: result.format,
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[Generate API] Error:', errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
