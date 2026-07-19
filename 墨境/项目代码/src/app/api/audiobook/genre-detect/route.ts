import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { DEEPSEEK_API_URL } from '@/lib/ai/constants'

/**
 * POST /api/audiobook/genre-detect
 * 题材自动识别——判断文本的文学题材类型
 *
 * Body: { text: string }
 *
 * 调用 DeepSeek V4 Flash 识别题材：
 * 都市/仙侠/悬疑/言情/历史/科幻/恐怖/喜剧/现实/其他
 * 返回题材标签 + 建议演播风格
 */

const GENRE_MODEL = 'deepseek-v4-flash'

const GENRE_PROMPT = `你是一位资深的有声书演播导演。请分析以下文本的题材类型。

## 题材类型（只能选一个最匹配的）
- 都市：现代都市生活、职场、商战
- 仙侠：修仙、武侠、玄幻
- 悬疑：推理、破案、悬疑惊悚
- 言情：爱情、恋爱、情感
- 历史：历史故事、宫廷、古代
- 科幻：科幻、未来、太空
- 恐怖：恐怖、灵异、鬼怪
- 喜剧：搞笑、幽默、轻松
- 现实：现实主义、社会、家庭
- 其他：无法归入以上类别

## 输出格式（纯JSON，不加任何其他文字）
{"genre":"题材名称","confidence":"high/medium/low","suggestedStyle":"建议的演播风格描述（1-2句话）","suggestedPacing":"slow/normal/fast"}

## 文本
`

interface GenreResult {
  genre: string
  confidence: 'high' | 'medium' | 'low'
  suggestedStyle: string
  suggestedPacing: 'slow' | 'normal' | 'fast'
}

const VALID_GENRES = ['都市', '仙侠', '悬疑', '言情', '历史', '科幻', '恐怖', '喜剧', '现实', '其他']

function isValidGenreResult(obj: Record<string, unknown>): boolean {
  return typeof obj.genre === 'string'
    && VALID_GENRES.includes(obj.genre)
    && typeof obj.suggestedStyle === 'string'
    && typeof obj.suggestedPacing === 'string'
    && ['slow', 'normal', 'fast'].includes(obj.suggestedPacing)
}

function extractJSON(text: string): Record<string, unknown> | null {
  try { return JSON.parse(text) } catch { /* continue */ }
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (jsonMatch) { try { return JSON.parse(jsonMatch[1].trim()) } catch { /* continue */ } }
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end > start) { try { return JSON.parse(text.slice(start, end + 1)) } catch { /* continue */ } }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }
    const body = await request.json()
    const { text } = body

    if (!text || text.trim().length < 20) {
      return NextResponse.json({ error: '文本内容过短，至少需要20个字符' }, { status: 400 })
    }

    // 截断过长文本（只需前3000字即可判断题材）
    const maxText = text.length > 3000 ? text.slice(0, 3000) : text

    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) throw new Error('DEEPSEEK_API_KEY is required')

    console.log(`[Genre Detect] 调用 ${GENRE_MODEL}, 文本长度: ${maxText.length} chars`)
    const t0 = Date.now()

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GENRE_MODEL,
        messages: [
          { role: 'user', content: GENRE_PROMPT + maxText },
        ],
        temperature: 0.1,
      }),
    })

    console.log(`[Genre Detect] 响应耗时: ${Date.now() - t0}ms, status: ${response.status}`)

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`DeepSeek API error: ${response.status} - ${error}`)
    }

    const result = await response.json()
    const content = result.choices?.[0]?.message?.content || ''

    const parsed = extractJSON(content)
    if (!parsed || !isValidGenreResult(parsed)) {
      // 降级：返回"其他"
      return NextResponse.json({
        success: true,
        genre: '其他',
        confidence: 'low',
        suggestedStyle: '平稳叙述，情绪克制',
        suggestedPacing: 'normal',
      })
    }

    return NextResponse.json({
      success: true,
      genre: parsed.genre,
      confidence: parsed.confidence,
      suggestedStyle: parsed.suggestedStyle,
      suggestedPacing: parsed.suggestedPacing,
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[Genre Detect] Error:', errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
