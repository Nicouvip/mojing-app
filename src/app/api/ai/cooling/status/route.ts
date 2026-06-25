// 冷却状态 API — 包装冷却系统函数
import { NextResponse } from 'next/server'
import { getCoolingSnapshot, getAvailableTechniques, getCoolingViolations, createCoolingState, isCooling, validateSceneSelection } from '@/lib/ai/cooling'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const chapter = parseInt(searchParams.get('chapter') || '1')

    // 创建默认冷却状态（实际应用中应从持久化存储读取）
    const state = createCoolingState()

    const snapshot = getCoolingSnapshot(state, chapter)
    const violations = getCoolingViolations(state, chapter)

    const available = {
      scenes: getAvailableTechniques(state, 'scene', chapter),
      endings: getAvailableTechniques(state, 'ending', chapter),
      hooks: getAvailableTechniques(state, 'hook', chapter),
      senses: getAvailableTechniques(state, 'sense', chapter),
    }

    return NextResponse.json({
      chapter,
      snapshot,
      violations,
      available,
    })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '冷却状态读取失败' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      type,
      id,
      chapter = 1,
      lastUsedScene,
    }: {
      type: 'scene' | 'ending' | 'hook' | 'sense' | 'sentence'
      id: string
      chapter?: number
      lastUsedScene?: string
    } = body

    if (!type || !id) {
      return NextResponse.json({ error: '请提供 type 和 id' }, { status: 400 })
    }

    const state = createCoolingState()

    // 检查冷却状态
    const cooling = isCooling(state, type, id, chapter)

    // 场景方法验证
    let validation = null
    if (type === 'scene' && lastUsedScene) {
      validation = validateSceneSelection(
        id as any,
        lastUsedScene as any,
        state,
        chapter
      )
    }

    return NextResponse.json({
      type,
      id,
      chapter,
      cooling,
      validation,
    })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '冷却检测失败' },
      { status: 500 }
    )
  }
}
