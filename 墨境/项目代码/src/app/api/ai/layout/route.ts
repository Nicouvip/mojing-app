import { NextResponse } from 'next/server'
import { fetchWithTimeout, FetchRetryError } from '@/lib/utils/fetch-with-timeout'
import { DEEPSEEK_API_URL, DEEPSEEK_MODEL } from '@/lib/ai/constants'

const API_KEY = process.env.DEEPSEEK_API_KEY
const API_URL = DEEPSEEK_API_URL

export async function POST(req: Request) {
  try {
    if (!API_KEY) return NextResponse.json({ error: 'DEEPSEEK_API_KEY 未配置' }, { status: 500 })

    let body: { prompt?: string; currentHtml?: unknown }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: '请求体不是合法的 JSON' }, { status: 400 })
    }

    const { prompt, currentHtml } = body

    if (!prompt?.trim()) {
      return NextResponse.json({ error: '请提供设计需求 prompt' }, { status: 400 })
    }

    if (currentHtml !== undefined && typeof currentHtml !== 'string') {
      return NextResponse.json({ error: 'currentHtml 参数必须是字符串类型' }, { status: 400 })
    }

    const systemPrompt = `你是一个网页设计专家。

用户需求：${prompt.trim()}

${currentHtml ? `需要重新设计的页面内容：\n${currentHtml.substring(0, 3000)}` : '请生成一个页面。'}

要求：
1. 只改CSS和DOM结构，保留所有原有文字内容
2. 使用内联style属性定义样式（不要用<style>标签、不要用class）
3. 只返回<body>内部的HTML片段，不要包含<!DOCTYPE>、<html>、<head>、<body>标签
4. 不要用markdown代码块，直接返回纯HTML`

    const response = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [{ role: 'user', content: systemPrompt }],
        max_tokens: 4096,
        temperature: 0.7,
      }),
    })

    const data = await response.json()
    if (!response.ok) return NextResponse.json({ error: data.error?.message || 'API错误' }, { status: 500 })

    const text = data.choices?.[0]?.message?.content || ''
    return NextResponse.json({ html: text.trim() })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '未知错误'
    const retryCount = e instanceof FetchRetryError ? e.retryCount : undefined
    return NextResponse.json({ error: message, ...(retryCount !== undefined ? { retryCount } : {}) }, { status: 500 })
  }
}
