import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

/**
 * POST /api/audiobook/arrange/effects
 * 多轨编排 — 后处理润色（压缩/混响）
 *
 * Body: {
 *   audioBase64: string,
 *   compression?: { threshold: number; ratio: number },
 *   reverb?: { roomSize: number; dryWet: number }
 * }
 *
 * 注意：服务端没有 pedalboard，使用 Web Audio API 在前端处理
 * 此 API 只做参数校验和透传，实际效果在前端 apply
 *
 * 未来可接入 pedalboard（Python）做服务端后处理
 */

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const body = await request.json()
    const { audioBase64, compression, reverb } = body

    if (!audioBase64) {
      return NextResponse.json({ error: 'audioBase64 is required' }, { status: 400 })
    }

    // 当前版本：直接透传音频，参数由前端 Web Audio API 处理
    // 未来可接入 Python pedalboard 做服务端后处理
    return NextResponse.json({
      success: true,
      audio: audioBase64,
      effects: {
        compression: compression || null,
        reverb: reverb || null,
      },
      note: '后处理在前端 Web Audio API 应用',
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[Arrange Effects] Error:', errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
