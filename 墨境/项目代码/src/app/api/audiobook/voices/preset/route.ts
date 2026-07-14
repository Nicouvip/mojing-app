import { NextResponse } from 'next/server'
import { PRESET_VOICES } from '@/lib/audiobook/mimo-tts'

/**
 * GET /api/audiobook/voices/preset
 * 获取 MiMo 预置音色列表
 */
export async function GET() {
  return NextResponse.json({
    voices: PRESET_VOICES,
    total: PRESET_VOICES.length,
  })
}
