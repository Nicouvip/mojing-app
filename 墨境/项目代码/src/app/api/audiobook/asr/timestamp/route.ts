import { NextRequest, NextResponse } from 'next/server'
import { MiMoASREngine } from '@/lib/audiobook/mimo-asr'

/**
 * POST /api/audiobook/asr/timestamp
 * ASR - 识别音频并返回时间戳
 * 
 * Body: { audioBase64: string, mimeType: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { audioBase64, mimeType } = body

    if (!audioBase64) {
      return NextResponse.json({ error: 'audioBase64 is required' }, { status: 400 })
    }

    // 从 Base64 中提取 Buffer
    const base64Data = audioBase64.replace(/^data:[^;]+;base64,/, '')
    const audioBuffer = Buffer.from(base64Data, 'base64')

    const engine = new MiMoASREngine()
    const result = await engine.transcribe({
      audioBuffer,
      mimeType: (mimeType as 'audio/mpeg' | 'audio/wav') || 'audio/mpeg',
    })

    return NextResponse.json({
      success: true,
      text: result.text,
      timestamps: result.timestamps,
      duration: result.duration,
      lrc: engine.generateLRC(result.timestamps),
      srt: engine.generateSRT(result.timestamps),
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[ASR API] Error:', errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
