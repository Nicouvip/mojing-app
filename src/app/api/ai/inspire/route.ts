import { NextResponse } from 'next/server'
import { fetchWithTimeout } from '@/lib/utils/fetch-with-timeout'

const API_KEY = process.env.DEEPSEEK_API_KEY
const API_URL = 'https://api.deepseek.com/chat/completions'

const MODE_PROMPTS: Record<string, string> = {
  'three-questions': `你是一位创意写作导师。请用「三问收束法」帮作者突破卡文：
1. 提炼当前情节最核心的 3 个问题
2. 针对每个问题，给出 2-3 个可能的走向
3. 推荐最佳走向，并给出开篇第一句

输出格式：
【核心三问】
1. ...
2. ...
3. ...

【走向分支】
问题1 → a) ... b) ...
问题2 → a) ... b) ...
问题3 → a) ... b) ...

【推荐走向】
...（含开篇第一句）`,

  'direct-diverge': `你是一位创意写作导师。请用「直接发散法」为作者提供灵感：
1. 基于当前设定，随机生成 5 个完全不同的剧情走向
2. 每个走向附带一个「意外变量」——出乎预料但合理的转折
3. 给每个走向标注星难度（⭐~⭐⭐⭐⭐⭐）

输出简短，每个走向 2-3 句话。`,

  'refine': `你是一位创意写作导师。请用「精炼提炼法」帮作者深化创意：
1. 分析当前创意的核心亮点
2. 找出可以深化的 3 个维度（人物/冲突/世界观/情感）
3. 在每个维度上给出具体建议

输出简短有力。`,

  'imitate': `你是一位创意写作导师。请用「范文仿写法」提供灵感：
1. 按指定题材推荐 2 部经典作品
2. 分析它们的开篇技巧和节奏
3. 给出「如何将此技巧应用到当前作品」的具体建议

输出格式：
【参考作品】
1. 《...》— 技巧：...
2. 《...》— 技巧：...

【可迁移技巧】
1. ...
2. ...`,
}

export async function POST(req: Request) {
  try {
    if (!API_KEY) return NextResponse.json({ error: 'DEEPSEEK_API_KEY 未配置' }, { status: 500 })

    const { mode = 'direct-diverge', context = '', genre = '通用' }:
      { mode?: string; context?: string; genre?: string } = await req.json()

    const basePrompt = MODE_PROMPTS[mode] || MODE_PROMPTS['direct-diverge']
    const prompt = `${basePrompt}\n\n当前题材：${genre}\n当前上下文：${context || '无特定上下文'}`

    const response = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048,
        temperature: 1.0,
      }),
    })

    const data = await response.json()
    if (!response.ok) return NextResponse.json({ error: data.error?.message || 'API错误' }, { status: 500 })

    const text = data.choices?.[0]?.message?.content || ''
    return NextResponse.json({ text, mode })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '未知错误' }, { status: 500 })
  }
}
