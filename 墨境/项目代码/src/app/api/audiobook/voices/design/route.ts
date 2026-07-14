import { NextRequest, NextResponse } from 'next/server'
import { MiMoVoiceDesignEngine } from '@/lib/audiobook/mimo-voice-design'

/**
 * POST /api/audiobook/voices/design
 * VoiceDesign - 通过自然语言描述生成定制化音色
 * 
 * Body: { description: string, text?: string, optimizeText?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { description, text, optimizeText } = body

    if (!description) {
      return NextResponse.json({ error: 'description is required' }, { status: 400 })
    }

    const engine = new MiMoVoiceDesignEngine()
    const result = await engine.design({
      description,
      text,
      optimizeText,
      format: 'wav',
    })

    // 将音频转为 Base64 返回
    const base64Audio = result.audioBuffer.toString('base64')

    return NextResponse.json({
      success: true,
      audio: base64Audio,
      duration: result.duration,
      format: result.format,
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[VoiceDesign API] Error:', errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
