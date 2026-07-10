// ============================================================
// 墨境 API — AI 深度检测
// POST /api/ai/deep-check — 单项目或批量分析
// 复用现有 DeepSeek API 管道
// ============================================================

import { NextResponse } from 'next/server'
import {
  getPromptById,
  buildBatchPrompt,
  extractSample,
  AI_CHECK_IDS,
} from '@/lib/ai/deep-check-prompt'
import { fetchWithTimeout } from '@/lib/utils/fetch-with-timeout'
import { promises as fsp } from 'fs'
import path from 'path'

const API_KEY = process.env.DEEPSEEK_API_KEY
const API_URL = 'https://api.deepseek.com/chat/completions'

// 用量文件路径
const USAGE_FILE = path.join(process.cwd(), '.mojing_ai_usage.json')

/** 原子递增用量计数（文件锁简单实现：写临时文件 → rename） */
async function trackUsage() {
  try {
    const tmp = USAGE_FILE + '.tmp'
    let usage: { count: number; lastAt: number }
    try {
      const raw = await fsp.readFile(USAGE_FILE, 'utf-8')
      usage = JSON.parse(raw)
    } catch {
      usage = { count: 0, lastAt: 0 }
    }
    usage.count++
    usage.lastAt = Date.now()
    // 写临时文件 → 原子 rename（同一磁盘分区保证原子性）
    await fsp.writeFile(tmp, JSON.stringify(usage), 'utf-8')
    await fsp.rename(tmp, USAGE_FILE)
  } catch { /* 用量记录非关键路径，静默失败 */ }
}

/** 从 AI 回复中提取并解析 JSON */
function extractJson(raw: string): Record<string, unknown> | null {
  try {
    // 支持 markdown 代码块
    let text = raw
    const mdMatch = raw.match(/```(?:json)?\s*\n([\s\S]*?)\n```/)
    if (mdMatch) text = mdMatch[1]
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1))
    }
  } catch { /* 解析失败返回 null */ }
  return null
}

/** 调 DeepSeek 并返回文本 */
async function callDeepSeek(
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  maxTokens: number = 800,
) {
  const response = await fetchWithTimeout(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature,
    }),
  }, 60_000) // 批量分析可能需要更长时间

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}))
    throw new Error(errData.error?.message || `AI 服务错误 (HTTP ${response.status})`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

export async function POST(req: Request) {
  try {
    if (!API_KEY) {
      return NextResponse.json({ error: 'DEEPSEEK_API_KEY 未配置' }, { status: 500 })
    }

    const body = await req.json()
    const { text, checkId, batch }: {
      text: string
      checkId?: number
      batch?: boolean
    } = body

    if (!text?.trim()) {
      return NextResponse.json({ error: '请提供待检测文本' }, { status: 400 })
    }

    // 后台上报用量（不阻塞响应）
    trackUsage().catch(() => {})

    // === 批量模式：一次分析 12 项 ===
    if (batch) {
      const bp = buildBatchPrompt(text)
      const aiContent = await callDeepSeek(bp.systemPrompt, bp.userPrompt, 0.3, 2000)
      const parsed = extractJson(aiContent)
      const rawResults = (parsed?.results as Array<{ id: number; status: string; reason: string; detail: string }>) || []

      // 如果 AI 返回项数不足，补全为 warning
      const results = AI_CHECK_IDS.map(id => {
        const found = rawResults.find(r => r.id === id)
        return found
          ? { checkId: found.id, status: found.status || 'warning', reason: found.reason || 'AI 分析完成', detail: found.detail || '' }
          : { checkId: id, status: 'warning', reason: 'AI 未覆盖此项', detail: '建议单独检测' }
      })

      return NextResponse.json({
        mode: 'batch',
        results,
        raw: aiContent,
      })
    }

    // === 单项目模式 ===
    if (!checkId) {
      return NextResponse.json({ error: '请提供 checkId 或启用 batch 模式' }, { status: 400 })
    }

    const prompt = getPromptById(checkId)
    if (!prompt) {
      return NextResponse.json({ error: `未知检查项 ID: ${checkId}` }, { status: 400 })
    }

    const sample = extractSample(text, prompt.sampleMode, 2000)
    const userPrompt = prompt.userTemplate.replace('{{text}}', sample)
    const aiContent = await callDeepSeek(prompt.systemPrompt, userPrompt, prompt.temperature, 500)
    const parsed = extractJson(aiContent)

    return NextResponse.json({
      mode: 'single',
      checkId,
      name: prompt.name,
      status: parsed?.status || 'warning',
      reason: parsed?.reason || 'AI 分析完成',
      detail: parsed?.detail || aiContent.slice(0, 150),
      raw: aiContent,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '未知错误'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
