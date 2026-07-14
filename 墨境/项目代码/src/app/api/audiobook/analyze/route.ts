import { NextRequest, NextResponse } from 'next/server'
import { buildAnalysisPrompt, type AnalysisResult } from '@/lib/audiobook/prompts'
import { DEEPSEEK_API_URL } from '@/lib/ai/constants'

/**
 * POST /api/audiobook/analyze
 * AI 文本分析——自动识别角色、情绪、音色推荐
 *
 * Body: { text: string }
 *
 * 调用 DeepSeek V4 Flash 分析小说文本，返回结构化分析结果：
 * - 角色列表（性别、年龄、性格、推荐音色）
 * - 段落分析（情绪、音色、语速、演播指导）
 * - 旁白风格建议
 */

/** 分析专用模型：V4 Flash 速度快，JSON 输出稳定 */
const ANALYZE_MODEL = 'deepseek-v4-flash'

async function callDeepSeek(prompt: string, retryHint?: string): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY is required')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 120_000) // 120秒超时

  const systemContent = retryHint
    || '你是一位资深的有声书演播导演。请严格按照用户要求的 JSON 格式输出分析结果，不要添加任何其他文字或markdown代码块标记。只输出纯JSON。'

  try {
    console.log(`[Analyze API] 调用 ${ANALYZE_MODEL}, prompt长度: ${prompt.length} chars`)
    const t0 = Date.now()
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: ANALYZE_MODEL,
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 8000,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)
    console.log(`[Analyze API] 响应耗时: ${Date.now() - t0}ms, status: ${response.status}`)

    if (!response.ok) {
      const error = await response.text()
      console.error(`[Analyze API] 错误: ${error}`)
      throw new Error(`DeepSeek API error: ${response.status} - ${error}`)
    }

    const result = await response.json()
    const content = result.choices?.[0]?.message?.content || ''
    console.log(`[Analyze API] 返回内容长度: ${content.length} chars`)
    return content
  } catch (err) {
    clearTimeout(timeout)
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('DeepSeek API request timeout (120s)')
    }
    throw err
  }
}

/**
 * 用嵌套计数法提取最外层 JSON 对象
 * 比贪婪匹配更准确，不会跨对象畸形匹配
 */
function extractOutermostJSON(text: string): string | null {
  const start = text.indexOf('{')
  if (start === -1) return null

  let depth = 0
  let inString = false
  let escape = false

  for (let i = start; i < text.length; i++) {
    const ch = text[i]

    if (escape) {
      escape = false
      continue
    }

    if (ch === '\\' && inString) {
      escape = true
      continue
    }

    if (ch === '"') {
      inString = !inString
      continue
    }

    if (inString) continue

    if (ch === '{') depth++
    if (ch === '}') {
      depth--
      if (depth === 0) {
        return text.slice(start, i + 1)
      }
    }
  }

  return null
}

/** 从 AI 响应中提取 JSON（增强版） */
function extractJSON(text: string): Record<string, unknown> | null {
  // 1. 尝试直接解析
  try {
    return JSON.parse(text)
  } catch { /* 继续 */ }

  // 2. 尝试提取 ```json ... ``` 中的内容
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1].trim())
    } catch { /* 继续 */ }
  }

  // 3. 用嵌套计数法提取最外层 { ... }
  const extracted = extractOutermostJSON(text)
  if (extracted) {
    try {
      return JSON.parse(extracted)
    } catch { /* 继续 */ }
  }

  return null
}

/** 验证分析结果结构 */
function isValidResult(parsed: Record<string, unknown>): parsed is AnalysisResult & Record<string, unknown> {
  return Array.isArray(parsed.characters) && Array.isArray(parsed.segments)
}

const MAX_RETRIES = 2

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

    let rawResponse = ''
    let parsed: Record<string, unknown> | null = null

    // 带重试的调用
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const retryHint = attempt > 0
        ? '你上次返回的内容无法解析为合法JSON。请只输出纯JSON，不要添加任何解释、前缀、后缀或markdown标记。必须以 { 开头，以 } 结尾。'
        : undefined

      try {
        rawResponse = await callDeepSeek(prompt, retryHint)
      } catch (err) {
        // 网络/API 错误，最后一次直接抛出
        if (attempt === MAX_RETRIES - 1) throw err
        continue
      }

      parsed = extractJSON(rawResponse)
      if (parsed && isValidResult(parsed)) {
        break // 成功，跳出重试循环
      }

      // 解析失败，如果不是最后一次，继续重试
      if (attempt < MAX_RETRIES - 1) {
        console.warn(`[Analyze API] 第${attempt + 1}次解析失败，重试中...`)
        continue
      }
    }

    if (!parsed || !isValidResult(parsed)) {
      return NextResponse.json({
        error: 'AI 返回的分析结果格式异常（已重试2次）',
        raw: rawResponse.slice(0, 500),
      }, { status: 500 })
    }

    const result = parsed as unknown as AnalysisResult

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
