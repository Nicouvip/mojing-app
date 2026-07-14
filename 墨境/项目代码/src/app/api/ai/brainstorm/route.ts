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
    const { genre = '通用', count = 5 }: { genre?: string; count?: number } = await req.json()

    const { prompt, params } = buildPrompt({
      templateId: 'mojing-brainstorm-v1',
      type: 'brainstorm',
      genre,
      count,
      enableIronRules: false,
      enableForbiddenWordsReminder: false,
    })

    const response = await handleDeepSeekStream(prompt, params.maxTokens, params.temperature, 'ideas')
    return response


  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '未知错误'
    const retryCount = e instanceof FetchRetryError ? e.retryCount : undefined
    return NextResponse.json({ error: message, ...(retryCount !== undefined ? { retryCount } : {}) }, { status: 500 })
  }
}
