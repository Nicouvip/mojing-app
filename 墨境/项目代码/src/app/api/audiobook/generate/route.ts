import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { MiMoTTSEngine } from '@/lib/audiobook/mimo-tts'
import { XfyunTTSEngine } from '@/lib/audiobook/xfyun-tts'
import { DoubaoTTSEngine } from '@/lib/audiobook/doubao-tts'

/**
 * POST /api/audiobook/generate
 * 生成有声书音频
 * 
 * Body: { text, voice, emotion?, style?, format?, engine?: 'normal' | 'vip' | 'doubao',
 *         contextTexts?, useTagParser?, speechRate?, loudnessRate?, pitch? }
 * engine: normal=MiMo(默认标准版), vip=讯飞(专业版), doubao=豆包Expressive(旗舰版)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }
    const body = await request.json()
    const { text, voice, emotion, style, format, emotionIntensity, speed, specialNote, engine,
      contextTexts, useTagParser, speechRate, loudnessRate, pitch } = body

    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }
    if (!voice) {
      return NextResponse.json({ error: 'voice is required' }, { status: 400 })
    }

    let audioBuffer: Buffer
    let duration: number
    let resultFormat: string

    if (engine === 'vip') {
      // 讯飞大模型语音合成（专业版）
      const xfEngine = new XfyunTTSEngine()
      const result = await xfEngine.generate({
        text,
        voice: voice as any,
      })
      audioBuffer = result.audioBuffer
      duration = result.duration
      resultFormat = result.format
    } else if (engine === 'doubao') {
      // 豆包 Expressive（旗舰版）
      const doubaoEngine = new DoubaoTTSEngine()
      const result = await doubaoEngine.generate({
        text,
        voiceType: voice,
        format: format || 'wav',
        speechRate: speechRate ?? 0,
        loudnessRate: loudnessRate ?? 0,
        pitch: pitch ?? 0,
        contextTexts,
        useTagParser: useTagParser ?? false,
      })
      audioBuffer = result.audioBuffer
      duration = result.duration
      resultFormat = result.format
    } else {
      // MiMo（默认标准版）
      const mimoEngine = new MiMoTTSEngine()
      const result = await mimoEngine.generate({
        text, voice, emotion, style,
        format: format || 'wav',
        emotionIntensity, speed, specialNote,
      })
      audioBuffer = result.audioBuffer
      duration = result.duration
      resultFormat = result.format
    }

    const base64Audio = audioBuffer.toString('base64')

    return NextResponse.json({
      success: true,
      audio: base64Audio,
      duration,
      format: resultFormat,
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[Generate API] Error:', errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
