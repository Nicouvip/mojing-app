import { NextResponse } from 'next/server'
import { buildPrompt } from '@/lib/prompts'
import { fetchWithTimeout, FetchRetryError } from '@/lib/utils/fetch-with-timeout'

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
      style?: string;
      chapterIndex?: number;
      genre?: string;
    } = await req.json()

    const { prompt, params } = buildPrompt({
      templateId: 'mojing-continue-v1',
      type: 'continue',
      context,
      instruction,
      conflictLevel,
      style: style as import('@/lib/prompts/types').WritingStyle,
      chapterIndex,
      genre,
    })

    // 流式场景：fetchWithTimeout 内部重试，如果最终失败则抛出异常
    const response = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: params.maxTokens,
        temperature: params.temperature,
        stream: true,
      }),
    }, 60_000) // 流式场景用更长的超时

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
