import { NextRequest, NextResponse } from 'next/server'
import { buildAnalysisPrompt, type AnalysisResult } from '@/lib/audiobook/prompts'

/**
 * POST /api/audiobook/analyze
 * AI 文本分析——自动识别角色、情绪、音色推荐
 * 
 * Body: { text: string }
 * 
 * 调用 DeepSeek 分析小说文本，返回结构化分析结果：
 * - 角色列表（性别、年龄、性格、推荐音色）
 * - 段落分析（情绪、音色、语速、演播指导）
 * - 旁白风格建议
 */

/** DeepSeek API 配置 */
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com'
const DEEPSEEK_MODEL = 'deepseek-chat'

async function callDeepSeek(prompt: string): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY is required')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 120000) // 120秒超时（分析可能较慢）

  try {
    const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          {
            role: 'system',
            content: '你是一位资深的有声书演播导演。请严格按照用户要求的 JSON 格式输出分析结果，不要添加任何其他文字或markdown代码块标记。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // 低温度，确保分析稳定
        max_tokens: 8000,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`DeepSeek API error: ${response.status} - ${error}`)
    }

    const result = await response.json()
    return result.choices?.[0]?.message?.content || ''
  } catch (err) {
    clearTimeout(timeout)
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('DeepSeek API request timeout (120s)')
    }
    throw err
  }
}

/** 从 AI 响应中提取 JSON */
function extractJSON(text: string): Record<string, unknown> | null {
  // 尝试直接解析
  try {
    return JSON.parse(text)
  } catch {
    // 尝试提取 ```json ... ``` 中的内容
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1])
      } catch {
        // 继续尝试
      }
    }
    // 尝试提取第一个 { ... } 块
    const braceMatch = text.match(/\{[\s\S]*\}/)
    if (braceMatch) {
      try {
        return JSON.parse(braceMatch[0])
      } catch {
        // 继续尝试
      }
    }
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text } = body

    if (!text || text.trim().length < 20) {
      return NextResponse.json({ error: '文本内容过短，至少需要20个字符' }, { status: 400 })
    }

    // 截断过长文本（DeepSeek 上下文限制）
    const maxText = text.length > 15000 ? text.slice(0, 15000) + '\n\n[文本过长，已截断]' : text

    // 构建分析提示词
    const prompt = buildAnalysisPrompt(maxText)

    // 调用 DeepSeek
    const rawResponse = await callDeepSeek(prompt)

    // 解析 JSON
    const parsed = extractJSON(rawResponse)
    if (!parsed) {
      return NextResponse.json({ error: 'AI 返回的分析结果格式异常', raw: rawResponse.slice(0, 500) }, { status: 500 })
    }

    // 验证必要字段
    const result = parsed as unknown as AnalysisResult
    if (!result.characters || !result.segments) {
      return NextResponse.json({ error: 'AI 返回的分析结果缺少必要字段', raw: JSON.stringify(parsed).slice(0, 500) }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      characters: result.characters,
      segments: result.segments,
      narrationStyle: result.narrationStyle || {
        overallTone: '平静',
        suggestedNarratorVoice: '冰糖',
        pacing: 'normal',
      },
      meta: {
        textLength: text.length,
        segmentCount: result.segments.length,
        characterCount: result.characters.length,
      },
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[Analyze API] Error:', errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
