// ============================================================
// 墨境 AI 流式响应工具
// 提取自 brainstorm/continue/expand/polish 四个路由的重复 SSE 流代码
// ============================================================

import { DEEPSEEK_API_URL, DEEPSEEK_MODEL, STREAM_TIMEOUT } from './constants'
import { fetchWithTimeout } from '@/lib/utils/fetch-with-timeout'

/**
 * 调用 DeepSeek 并返回 SSE 流式 Response
 * @param prompt 发送给 AI 的提示词
 * @param maxTokens 最大 token 数
 * @param temperature 温度参数
 * @param fieldName JSON 流中每个数据块使用的字段名（如 'text'、'ideas'）
 * @returns SSE Response 对象
 */
export function callDeepSeekStream(
  prompt: string,
  maxTokens: number,
  temperature: number,
  fieldName: string = 'text',
): Promise<Response> {
  return fetchWithTimeout(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}` },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature,
      stream: true,
    }),
  }, STREAM_TIMEOUT)
}

/**
 * 从 SSE 流响应创建 ReadableStream，用于 AI 流式输出
 * @param response fetch 的 Response 对象
 * @param fieldName 每个数据块中的字段名（默认 'text'）
 * @param onError 流错误时的回调（可选）
 * @returns ReadableStream
 */
export function createSSEStream(
  response: Response,
  fieldName: string = 'text',
  onError?: (error: unknown) => void,
): ReadableStream {
  const encoder = new TextEncoder()

  return new ReadableStream({
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
                controller.enqueue(encoder.encode(JSON.stringify({ [fieldName]: content }) + '\n'))
              }
            } catch {
              // 跳过不完整的行
            }
          }
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : '流读取错误'
        controller.enqueue(encoder.encode(JSON.stringify({ error: message }) + '\n'))
        onError?.(e)
      } finally {
        reader.releaseLock()
        controller.close()
      }
    },
  })
}

/**
 * 处理 DeepSeek 流式响应：调用 + 创建流一步完成
 * @param prompt 提示词
 * @param maxTokens 最大 token 数
 * @param temperature 温度
 * @param fieldName 字段名
 * @param onError 错误回调
 * @returns SSE Response
 */
export async function handleDeepSeekStream(
  prompt: string,
  maxTokens: number,
  temperature: number,
  fieldName: string = 'text',
  onError?: (error: unknown) => void,
): Promise<Response> {
  const response = await callDeepSeekStream(prompt, maxTokens, temperature, fieldName)

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}))
    throw new Error(errData.error?.message || `API 错误 (HTTP ${response.status})`)
  }

  const stream = createSSEStream(response, fieldName, onError)

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
