import { NextResponse } from 'next/server'
import { buildPrompt } from '@/lib/prompts'
import { fetchWithTimeout } from '@/lib/utils/fetch-with-timeout'

const API_KEY = process.env.DEEPSEEK_API_KEY
const API_URL = 'https://api.deepseek.com/chat/completions'

export async function POST(req: Request) {
  try {
    if (!API_KEY) return NextResponse.json({ error: 'DEEPSEEK_API_KEY 未配置，请在 .env 中设置' }, { status: 500 })
    const { 
      context, 
      instruction, 
      conflictLevel, 
      style, 
      chapterIndex, 
      genre 
    }: { 
      context: string; 
      instruction?: string;
      conflictLevel?: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
      style?: '冷峻白描' | '快消口语' | '感官极值';
      chapterIndex?: number;
      genre?: string;
    } = await req.json()

    const { prompt, params } = buildPrompt({
      templateId: 'mojing-continue-v1',
      type: 'continue',
      context,
      instruction,
      conflictLevel,
      style,
      chapterIndex,
      genre,
    })

    const response = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: params.maxTokens,
        temperature: params.temperature,
      }),
    })

    const data = await response.json()
    if (!response.ok) return NextResponse.json({ error: data.error?.message || 'API错误' }, { status: 500 })

    const text = data.choices?.[0]?.message?.content || ''
    return NextResponse.json({ text })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '未知错误' }, { status: 500 })
  }
}
