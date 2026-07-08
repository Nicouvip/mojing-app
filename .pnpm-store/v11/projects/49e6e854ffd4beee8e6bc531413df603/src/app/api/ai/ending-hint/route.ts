// 章末收束建议 API — 包装 generateEndingHint
import { NextResponse } from 'next/server'
import { generateEndingHint, ENDING_TYPES } from '@/lib/prompts/builder'

export async function GET() {
  try {
    // 不传冷却参数时返回全部收束类型 + 随机推荐
    const hint = generateEndingHint()
    const allTypes = ENDING_TYPES.map(e => ({ id: e.id, name: e.name, desc: e.desc }))

    return NextResponse.json({
      total: allTypes.length,
      available: allTypes,
      recommendation: hint,
    })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '获取章末收束建议失败' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const { coolingEndings }: { coolingEndings?: string[] } = await req.json()
    const hint = generateEndingHint(coolingEndings)
    return NextResponse.json({ hint })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '未知错误' },
      { status: 500 }
    )
  }
}
