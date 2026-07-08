// 冷却记录 API — 包装 recordUsage
import { NextResponse } from 'next/server'
import { createCoolingState, recordUsage } from '@/lib/ai/cooling'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      type,
      id,
      chapter = 1,
    }: {
      type: 'scene' | 'ending' | 'hook' | 'sense' | 'emotion' | 'sentence'
      id: string
      chapter?: number
    } = body

    if (!type || !id) {
      return NextResponse.json({ error: '请提供 type 和 id' }, { status: 400 })
    }

    // 创建默认冷却状态（实际应用中应从持久化存储读取）
    const state = createCoolingState()

    // 记录使用
    const newState = recordUsage(state, {
      type,
      id,
      chapter,
      timestamp: Date.now(),
    }, chapter)

    return NextResponse.json({
      recorded: { type, id, chapter },
      state: newState,
    })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '冷却记录失败' },
      { status: 500 }
    )
  }
}
