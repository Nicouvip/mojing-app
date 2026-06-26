import { NextResponse } from 'next/server'
import { fetchWithTimeout } from '@/lib/utils/fetch-with-timeout'

const API_KEY = process.env.DEEPSEEK_API_KEY
const API_URL = 'https://api.deepseek.com/chat/completions'

export async function POST(req: Request) {
  try {
    if (!API_KEY) return NextResponse.json({ error: 'DEEPSEEK_API_KEY 未配置' }, { status: 500 })

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: '请求体不是有效的 JSON' }, { status: 400 })
    }

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
    } = body as any

    // 校验 count 为有效正数
    const validCount = typeof count === 'number' && count > 0 && Number.isFinite(count)
      ? Math.min(Math.floor(count), 10)
      : 5
    if (typeof genre !== 'string') {
      return NextResponse.json({ error: 'genre 必须是字符串' }, { status: 400 })
    }
    if (typeof keywords !== 'string') {
      return NextResponse.json({ error: 'keywords 必须是字符串' }, { status: 400 })
    }
    if (typeof style !== 'string') {
      return NextResponse.json({ error: 'style 必须是字符串' }, { status: 400 })
    }

    const prompt = `你是专业网文编辑，专门为小说起名。请根据以下信息生成 ${validCount} 个书名候选：

题材：${genre}
关键词：${keywords || '无特定关键词'}
风格：${style || '网文风格'}

要求：
1. 每个书名旁边标注类型（如：直白型/悬念型/意境型/反差型/金句型）
2. 每个书名 2-8 个字
3. 风格多样，不重复
4. 简短解释每个书名的卖点

输出格式（必须严格遵守）：
先输出一个 JSON 数组，格式如：["书名1","书名2","书名3"]
然后再用自然语言分行解释每个书名的类型和卖点。

请确保 JSON 数组是合法的 JSON 格式，书名用双引号包裹。`

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

    // 解析出书名列表 — 优先 JSON 数组提取，降级到【】括号匹配，最后行级解析
    let titles: string[] = []

    // 策略1：从文本中提取 JSON 数组（用贪婪匹配避免被首个]截断）
    const jsonMatch = text.match(/\[[\s\S]*?\]\s*[\r\n]/) || text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0].replace(/[\r\n].*$/, ''))
        if (Array.isArray(parsed) && parsed.length > 0) {
          titles = parsed.filter((t: unknown) => typeof t === 'string' && t.length > 1)
        }
      } catch { /* JSON 解析失败，降级 */ }
    }

    // 策略2：从【书名】格式提取
    if (titles.length === 0) {
      const bracketMatches = [...text.matchAll(/【([^】]+)】/g)]
      const bracketTitles = bracketMatches
        .map((m) => m[1].trim())
        .filter((t) => t.length > 1)
      if (bracketTitles.length > 0) {
        titles = bracketTitles
      }
    }

    // 策略3：行级解析（降级兜底）
    if (titles.length === 0) {
      // 先统一清洗：去掉 Markdown 加粗/斜体标记
      const cleaned = text
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
      titles = cleaned
        .split('\n')
        .filter((line: string) => line.trim())
        .map((line: string) => {
          let t = line.trim()
          // 去掉行首序号/符号（1. 2、- • ✅ ▶）
          t = t.replace(/^[\d\s\.\-\•\*▶✅]+/, '')
          // 去掉行首引号
          t = t.replace(/^["""''「」『』】]/, '')
          // 去掉行尾引号
          t = t.replace(/["""''「」『』【】]\s*$/, '')
          // 去掉类型标注如（直白型）（悬念型）— 保留书名
          t = t.replace(/[（(][^）)]*[型法式][）)]/, '')
          // 去掉「类型：」前缀
          t = t.replace(/^[^：]+：/, '')
          return t.trim()
        })
        .filter((line: string) => line.length > 1 && line.length < 30)
    }

    return NextResponse.json({ text, titles: titles.slice(0, validCount) })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '未知错误' }, { status: 500 })
  }
}
