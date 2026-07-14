import { NextResponse } from 'next/server'
import { buildPrompt } from '@/lib/prompts'
import { fetchWithTimeout, FetchRetryError } from '@/lib/utils/fetch-with-timeout'
import { DEEPSEEK_API_URL, DEEPSEEK_MODEL } from '@/lib/ai/constants'
import { handleDeepSeekStream } from '@/lib/ai/stream-utils'
const KEY = process.env.DEEPSEEK_API_KEY
const URL = DEEPSEEK_API_URL

export async function POST(req: Request) {
  try {
    if (!KEY) return NextResponse.json({ error: 'DEEPSEEK_API_KEY 未配置，请在 .env 中设置' }, { status: 500 })
    const { 
      text, 
      instruction, 
      conflictLevel, 
      style, 
      genre,
      characterProfiles,
      worldSettings,
      coolingState,
      activeForeshadows,
      lastReport,
    }: { 
      text: string; 
      instruction?: string;
      conflictLevel?: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
      style?: '冷峻白描' | '快消口语' | '感官极值';
      genre?: string;
      characterProfiles?: any[];
      worldSettings?: any[];
      coolingState?: any;
      activeForeshadows?: any[];
      lastReport?: any;
    } = await req.json()
    if (!text?.trim()) return NextResponse.json({ error: '请选中要扩写的文字' }, { status: 400 })

    const { prompt, params } = buildPrompt({
      templateId: 'mojing-expand-v1',
      type: 'expand',
      context: text,
      instruction,
      conflictLevel,
      style,
      genre,
      characterProfiles,
      worldSettings,
      coolingState,
      activeForeshadows,
      lastReport,
    })

    const response = await handleDeepSeekStream(prompt, params.maxTokens, params.temperature, 'text')
    return response


  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '未知错误'
    const retryCount = e instanceof FetchRetryError ? e.retryCount : undefined
    return NextResponse.json({ error: message, ...(retryCount !== undefined ? { retryCount } : {}) }, { status: 500 })
  }
}
