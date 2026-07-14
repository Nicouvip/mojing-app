import { NextResponse } from 'next/server'
import { buildPrompt } from '@/lib/prompts'
import { handleDeepSeekStream } from '@/lib/ai/stream-utils'
import { DEEPSEEK_API_URL } from '@/lib/ai/constants'

const API_KEY = process.env.DEEPSEEK_API_KEY
const API_URL = DEEPSEEK_API_URL

export async function POST(req: Request) {
  try {
    if (!API_KEY) return NextResponse.json({ error: 'DEEPSEEK_API_KEY 未配置，请在 .env 中设置' }, { status: 500 })
    const { 
      context, 
      instruction, 
      conflictLevel, 
      style, 
      chapterIndex, 
      genre,
      characterProfiles,
      worldSettings,
      coolingState,
      activeForeshadows,
      lastReport,
    }: { 
      context: string; 
      instruction?: string;
      conflictLevel?: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
      style?: string;
      chapterIndex?: number;
      genre?: string;
      characterProfiles?: any[];
      worldSettings?: any[];
      coolingState?: any;
      activeForeshadows?: any[];
      lastReport?: any;
    } = await req.json()

    if (!context?.trim()) {
      return NextResponse.json({ error: '缺少前文内容（context）' }, { status: 400 })
    }

    const { prompt, params } = buildPrompt({
      templateId: 'mojing-continue-v1',
      type: 'continue',
      context,
      instruction,
      conflictLevel,
      style: style as import('@/lib/prompts/types').WritingStyle,
      chapterIndex,
      genre,
      characterProfiles,
      worldSettings,
      coolingState,
      activeForeshadows,
      lastReport,
    })

    // 流式场景：复用 stream-utils
    const response = await handleDeepSeekStream(prompt, params.maxTokens, params.temperature, 'text')
    return response


  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '未知错误'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
