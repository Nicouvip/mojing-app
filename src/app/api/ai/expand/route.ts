import { NextResponse } from 'next/server'
import { buildPrompt } from '@/lib/prompts'
import { fetchWithTimeout, FetchRetryError } from '@/lib/utils/fetch-with-timeout'
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

    const response = await fetchWithTimeout(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: params.maxTokens,
        temperature: params.temperature,
        stream: true,
      }),
    }, 60_000)

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      return NextResponse.json({ error: errData.error?.message || 'API错误' }, { status: 500 })
    }

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader()
        if (!reader) {
          controller.enqueue(encoder.encode(JSON.stringify({ error: '无法读取流' })))
          controller.close()
          return
        }

        const decoder = new TextDecoder()
        let buffer = ''

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              const trimmed = line.trim()
              if (!trimmed || !trimmed.startsWith('data: ')) continue
              const data = trimmed.slice(6)
              if (data === '[DONE]') continue

              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices?.[0]?.delta?.content || ''
                if (content) {
                  controller.enqueue(encoder.encode(JSON.stringify({ text: content }) + '\n'))
                }
              } catch {
                // skip parse errors for partial lines
              }
            }
          }
        } catch (e) {
          controller.enqueue(encoder.encode(JSON.stringify({ error: e instanceof Error ? e.message : '流读取错误' }) + '\n'))
        } finally {
          reader.releaseLock()
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '未知错误'
    const retryCount = e instanceof FetchRetryError ? e.retryCount : undefined
    return NextResponse.json({ error: message, ...(retryCount !== undefined ? { retryCount } : {}) }, { status: 500 })
  }
}
