import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { MiMoVoiceCloneEngine } from '@/lib/audiobook/mimo-voice-clone'

/**
 * POST /api/audiobook/voices/clone
 * VoiceClone - 基于音频样本精准复刻音色
 * 
 * Body: { sampleBase64: string, sampleMimeType: string, text: string, emotion?: string, voice?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }
    const body = await request.json()
    const { sampleBase64, sampleMimeType, text, emotion, style, voice } = body

    if (!sampleBase64) {
      return NextResponse.json({ error: 'sampleBase64 is required' }, { status: 400 })
    }
    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    // 从 Base64 中提取 Buffer
    const base64Data = sampleBase64.replace(/^data:[^;]+;base64,/, '')
    const sampleBuffer = Buffer.from(base64Data, 'base64')

    const engine = new MiMoVoiceCloneEngine()

    // 验证音频样本
    const validation = engine.validateSample(sampleBuffer, sampleMimeType || 'audio/mpeg')
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const result = await engine.clone({
      sampleAudioBuffer: sampleBuffer,
      sampleMimeType: (sampleMimeType as 'audio/mpeg' | 'audio/wav') || 'audio/mpeg',
      text,
      emotion,
      style,
      voice: voice || 'cloned_voice',
      format: 'wav',
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
    console.error('[Clone API] Error:', errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
