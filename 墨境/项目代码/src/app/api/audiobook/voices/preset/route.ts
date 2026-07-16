import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { PRESET_VOICES } from '@/lib/audiobook/mimo-tts'

/**
 * GET /api/audiobook/voices/preset
 * 获取 MiMo 预置音色列表
 */
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }
  return NextResponse.json({
    voices: PRESET_VOICES,
    total: PRESET_VOICES.length,
  })
}
