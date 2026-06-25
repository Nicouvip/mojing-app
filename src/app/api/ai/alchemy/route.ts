import { NextResponse } from 'next/server'
import { fetchWithTimeout } from '@/lib/utils/fetch-with-timeout'

const API_KEY = process.env.DEEPSEEK_API_KEY
const API_URL = 'https://api.deepseek.com/chat/completions'

export async function POST(req: Request) {
  try {
    if (!API_KEY) return NextResponse.json({ error: 'DEEPSEEK_API_KEY 未配置' }, { status: 500 })

    const {
      genre = '通用',
      keywords = '',
      style = '',
      count = 5,
    }: {
      genre?: string
      keywords?: string
      style?: string
      count?: number
    } = await req.json()

    const prompt = `你是专业网文编辑，专门为小说起名。请根据以下信息生成 ${Math.min(count, 10)} 个书名候选：

题材：${genre}
关键词：${keywords || '无特定关键词'}
风格：${style || '网文风格'}

要求：
1. 每个书名旁边标注类型（如：直白型/悬念型/意境型/反差型/金句型）
2. 每个书名 2-8 个字
3. 风格多样，不重复
4. 简短解释每个书名的卖点

输出格式（每行一个）：
【书名】 | 类型 | 卖点（一句话）`

    const response = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048,
        temperature: 1.1,
      }),
    })

    const data = await response.json()
    if (!response.ok) return NextResponse.json({ error: data.error?.message || 'API错误' }, { status: 500 })

    const text = data.choices?.[0]?.message?.content || ''

    // 解析出书名列表
    const titles = text
      .split('\n')
      .filter((line: string) => line.trim())
      .map((line: string) => line.replace(/^[\d\s\.\-\•\*]+/, '').trim())
      .filter((line: string) => line.length > 1)

    return NextResponse.json({ text, titles: titles.slice(0, count) })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '未知错误' }, { status: 500 })
  }
}
