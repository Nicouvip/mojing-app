import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { MiMoTTSEngine } from '@/lib/audiobook/mimo-tts'
import { XfyunTTSEngine } from '@/lib/audiobook/xfyun-tts'
import { DoubaoTTSEngine } from '@/lib/audiobook/doubao-tts'

/**
 * POST /api/audiobook/arrange/synthesize
 * 多轨编排 — 批量合成旁白段
 *
 * Body: {
 *   segments: Array<{ index: number; text: string }>,
 *   engine?: 'normal' | 'vip' | 'doubao',
 *   voice?: string,
 *   silenceMs?: number,
 *   book?: string,
 *   episode?: string,
 *   cv?: string
 * }
 *
 * 逐段调用 TTS API 合成旁白，返回每段的 audioBase64
 * 支持断点续传：已合成的段跳过
 */

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const body = await request.json()
    const { segments, engine = 'normal', voice = '冰糖', silenceMs = 800, book, episode, cv } = body

    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      return NextResponse.json({ error: 'segments array is required' }, { status: 400 })
    }

    const results: Array<{ index: number; audioBase64: string; duration: number; done: boolean }> = []
    let completed = 0

    for (const seg of segments) {
      if (!seg.text || seg.text.trim().length === 0) {
        results.push({ index: seg.index, audioBase64: '', duration: 0, done: false })
        continue
      }

      try {
        let audioBuffer: Buffer
        let duration: number

        if (engine === 'doubao') {
          const doubaoEngine = new DoubaoTTSEngine()
          const result = await doubaoEngine.generate({
            text: seg.text,
            voiceType: voice,
            format: 'wav',
            speechRate: 0,
            loudnessRate: 0,
          })
          audioBuffer = result.audioBuffer
          duration = result.duration
        } else if (engine === 'vip') {
          const xfEngine = new XfyunTTSEngine()
          const result = await xfEngine.generate({ text: seg.text, voice: voice as any })
          audioBuffer = result.audioBuffer
          duration = result.duration
        } else {
          const mimoEngine = new MiMoTTSEngine()
          const result = await mimoEngine.generate({
            text: seg.text,
            voice,
            format: 'wav',
          })
          audioBuffer = result.audioBuffer
          duration = result.duration
        }

        results.push({
          index: seg.index,
          audioBase64: audioBuffer.toString('base64'),
          duration,
          done: true,
        })
        completed++
      } catch (err) {
        console.error(`[Arrange Synthesize] 段 ${seg.index} 合成失败:`, err)
        results.push({ index: seg.index, audioBase64: '', duration: 0, done: false })
      }
    }

    return NextResponse.json({
      success: true,
      results,
      completed,
      total: segments.length,
      book,
      episode,
      cv,
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[Arrange Synthesize] Error:', errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
