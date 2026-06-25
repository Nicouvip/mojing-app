import { NextResponse } from 'next/server'
import { buildPrompt } from '@/lib/prompts'
import { fetchWithTimeout } from '@/lib/utils/fetch-with-timeout'
const KEY = process.env.DEEPSEEK_API_KEY
const URL = 'https://api.deepseek.com/chat/completions'

export async function POST(req: Request) {
  try {
    if (!KEY) return NextResponse.json({ error: 'DEEPSEEK_API_KEY 未配置，请在 .env 中设置' }, { status: 500 })
    const { 
      text, 
      instruction, 
      conflictLevel, 
      style, 
      genre 
    }: { 
      text: string; 
      instruction?: string;
      conflictLevel?: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
      style?: '冷峻白描' | '快消口语' | '感官极值';
      genre?: string;
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
    })

    const r = await fetchWithTimeout(URL, { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
      body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: prompt }], max_tokens: params.maxTokens, temperature: params.temperature }) })
    const d = await r.json()
    if (!r.ok) return NextResponse.json({ error: d.error?.message }, { status: 500 })
    return NextResponse.json({ text: d.choices?.[0]?.message?.content || '' })
  } catch (e: unknown) { return NextResponse.json({ error: e instanceof Error ? e.message : '未知错误' }, { status: 500 }) }
}
