// 卡文助手 API — 包装 generateUnblockHint + isUnblockRequest
import { NextResponse } from 'next/server'
import { generateUnblockHint, isUnblockRequest, type UnblockMethod } from '@/lib/prompts/builder'

export async function POST(req: Request) {
  try {
    const { text, method }: { text?: string; method?: UnblockMethod } = await req.json()

    // 如果传入文本，先检测是否卡文
    if (text && !isUnblockRequest(text)) {
      return NextResponse.json({
        isBlocked: false,
        message: '未检测到卡文信号，继续写作吧',
      })
    }

    // 生成卡文提示
    const hint = generateUnblockHint(method)

    return NextResponse.json({
      isBlocked: true,
      hint,
    })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '未知错误' },
      { status: 500 }
    )
  }
}
