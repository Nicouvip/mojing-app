import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { DEEPSEEK_API_URL } from '@/lib/ai/constants'

/**
 * POST /api/audiobook/context-design
 * 为每段自动生成三层演播指导（前情摘要 + 剧本笔记 + 表演指导）
 *
 * Body: { text: string, previousSummary?: string, emotion?: string, characterName?: string }
 *
 * 技能包核心逻辑：context-design.md + voice-prompt-guide.md
 * 四维度模型：语气基调 + 情绪状态 + 生理特征 + 场景暗示
 */

const MODEL = 'deepseek-v4-flash'

function buildPrompt(text: string, previousSummary?: string, emotion?: string, characterName?: string): string {
  return `你是一位资深的有声书演播导演（10年经验）。请为以下文本段落设计三层演播指导。

## 四维度语音指令模型
每句指令都应包含四个维度，叠加使用：
- 语气基调：整体声音质感（低沉/沙哑/轻柔/明亮/冷峻）
- 情绪状态：内心情感（沧桑/绝望/隐忍/焦虑/期待）
- 生理特征：身体表现（颤抖/哭腔/呼吸急促/声音放轻）
- 场景暗示：什么场景下（像在深夜独白/像刚得知噩耗时）

## 输出格式（纯JSON，不加任何其他文字）
{
  "summary": "前情摘要：上文发生了什么关键事件？主角心理状态？（50字以内）",
  "note": "剧本笔记：这段在情绪弧线上是什么位置？承接/推进/转折/爆发？（50字以内）",
  "direction": "表演指导：用{语气基调}的语气、带着{情绪状态}，{生理特征}，{场景暗示}地说（1-2句完整描述）",
  "cotTag": "全程保持匀速，此处略微[具体微调]（如：全程保持匀速，此处略微放慢带出悲伤）"
}

${previousSummary ? `前文摘要：${previousSummary}\n` : ''}
${emotion ? `目标情绪：${emotion}\n` : ''}
${characterName ? `角色：${characterName}\n` : ''}
文本段落：
${text.slice(0, 2000)}`
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
    const { text, previousSummary, emotion, characterName } = body

    if (!text || text.trim().length < 10) {
      return NextResponse.json({ error: '文本内容过短' }, { status: 400 })
    }

    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) throw new Error('DEEPSEEK_API_KEY is required')

    const prompt = buildPrompt(text, previousSummary, emotion, characterName)

    console.log(`[Context Design] 调用 ${MODEL}`)
    const t0 = Date.now()

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      }),
    })

    console.log(`[Context Design] 响应耗时: ${Date.now() - t0}ms, status: ${response.status}`)

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`DeepSeek API error: ${response.status} - ${error}`)
    }

    const result = await response.json()
    const content = result.choices?.[0]?.message?.content || ''

    const parsed = extractJSON(content)
    if (!parsed || typeof parsed.summary !== 'string') {
      // 降级：返回基本结构
      return NextResponse.json({
        success: true,
        summary: previousSummary || '（前文摘要）',
        note: '（剧本笔记待补充）',
        direction: '（表演指导待补充）',
        cotTag: '全程保持匀速',
      })
    }

    return NextResponse.json({
      success: true,
      summary: parsed.summary || '',
      note: parsed.note || '',
      direction: parsed.direction || '',
      cotTag: parsed.cotTag || '全程保持匀速',
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[Context Design] Error:', errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
