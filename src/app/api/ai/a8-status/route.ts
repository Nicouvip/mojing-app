// A-8创作状态 API — 包装 generateA8Status
import { NextResponse } from 'next/server'
import { generateA8Status, generateSimpleA8Status, type A8StatusParams } from '@/lib/prompts/builder'
import type { ConflictLevel } from '@/lib/prompts'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const chapter = parseInt(searchParams.get('chapter') || '1')
    const conflictLevel = searchParams.get('conflictLevel') as ConflictLevel | null

    const statusLine = generateSimpleA8Status(chapter, conflictLevel || undefined)
    return NextResponse.json({ statusLine })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '生成 A-8 创作状态失败' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const params: Partial<A8StatusParams> = await req.json()
    const statusLine = generateA8Status({
      chapter: params.chapter || 1,
      outlineNode: params.outlineNode,
      activeForeshadows: params.activeForeshadows,
      foreshadowWarning: params.foreshadowWarning,
      conflictLevel: params.conflictLevel,
      style: params.style,
      recommendedTechnique: params.recommendedTechnique,
      recommendedSense: params.recommendedSense,
      anomalies: params.anomalies,
      isGoldenChapter: params.isGoldenChapter ?? (params.chapter || 1) <= 3,
      coolingSnapshot: params.coolingSnapshot,
      defenseViolations: params.defenseViolations,
    })
    return NextResponse.json({ statusLine })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '未知错误' },
      { status: 500 }
    )
  }
}
