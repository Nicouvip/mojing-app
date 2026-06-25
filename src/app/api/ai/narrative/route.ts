// 叙事功能检测 API — 包装 detectNarrativeFunction + 相关函数
import { NextResponse } from 'next/server'
import {
  detectNarrativeFunction,
  getNarrativeFunctionPrompt,
  getSpeedAdjustment,
  type NarrativeFunction,
} from '@/lib/prompts/builder'

export async function POST(req: Request) {
  try {
    const { text, genre }: { text: string; genre?: string } = await req.json()

    if (!text?.trim()) {
      return NextResponse.json({ error: '请提供待检测文本' }, { status: 400 })
    }

    const functionType = detectNarrativeFunction(text)
    const prompt = getNarrativeFunctionPrompt(functionType)

    // 根据题材获取参数调整
    const genreParams = genre ? { bodyDensityLow: 40, lineBreakLow: '不换' } : undefined
    const adjustment = getSpeedAdjustment(functionType, genreParams)

    return NextResponse.json({
      detectedFunction: functionType,
      prompt,
      adjustment,
    })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '叙事检测失败' },
      { status: 500 }
    )
  }
}
