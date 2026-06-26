import { NextResponse } from 'next/server'
import { buildPrompt } from '@/lib/prompts'
import { fetchWithTimeout, FetchRetryError } from '@/lib/utils/fetch-with-timeout'
const KEY = process.env.DEEPSEEK_API_KEY
const URL = 'https://api.deepseek.com/chat/completions'

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

    const r = await fetchWithTimeout(URL, { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
      body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: prompt }], ...params }) })
    const d = await r.json()
    if (!r.ok) return NextResponse.json({ error: d.error?.message }, { status: 500 })
    return NextResponse.json({ ideas: d.choices?.[0]?.message?.content || '' })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '未知错误'
    const retryCount = e instanceof FetchRetryError ? e.retryCount : undefined
    return NextResponse.json({ error: message, ...(retryCount !== undefined ? { retryCount } : {}) }, { status: 500 })
  }
}
