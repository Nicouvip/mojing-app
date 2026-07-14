// ============================================================
// 墨境 API — AI 用量统计
// GET /api/ai/usage — 返回 count + lastAt
// ============================================================

import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const file = path.join(process.cwd(), '.mojing_ai_usage.json')
    const raw = fs.existsSync(file)
      ? fs.readFileSync(file, 'utf-8')
      : '{"count":0,"lastAt":0}'
    const usage = JSON.parse(raw)
    return NextResponse.json(usage)
  } catch (e) {
    console.error('[usage] 读取用量失败:', e)
    return NextResponse.json({ error: '读取用量失败' }, { status: 500 })
  }
}
