// ============================================================
// 墨境 API — 合规检测
// POST /api/ai/compliance — 对文本执行合规检测
// 包装 compliance.ts 中的检测函数（check55Rule/paragraphCheck/chapterEndCheck/polishCheck）
// ============================================================

import { NextResponse } from 'next/server'
import {
  check55Rule,
  paragraphCheck,
  chapterEndCheck,
  polishCheck,
  checkCompliance,
} from '@/lib/ai/compliance'
import type { Genre } from '@/lib/ai/compliance'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      text,
      checkType = 'paragraph',
      genre = '通用',
      chapterAUsed = 0,
    }: {
      text: string
      checkType?: '55rule' | 'paragraph' | 'chapter' | 'polish' | 'full'
      genre?: string
      chapterAUsed?: number
    } = body

    if (!text?.trim()) {
      return NextResponse.json({ error: '请提供待检测文本' }, { status: 400 })
    }

    switch (checkType) {
      case '55rule': {
        const result = check55Rule(text, genre as Genre)
        return NextResponse.json({
          checkType: '55rule',
          result,
          summary: result.detail,
        })
      }

      case 'paragraph': {
        const result = paragraphCheck(text, chapterAUsed)
        return NextResponse.json({
          checkType: 'paragraph',
          result,
          summary: result.passed
            ? '✅ 通过（无阻断项）'
            : `⚠️ ${result.blockingCount}项阻断，${result.warningCount}项警告`,
        })
      }

      case 'chapter': {
        const result = chapterEndCheck(text, genre as Genre, chapterAUsed)
        return NextResponse.json({
          checkType: 'chapter',
          result,
          reportLine: result.reportLine,
          summary: `评分 ${result.score}/5 | ${result.compliant ? '✅ 合规' : '⚠️ 有违规项'}`,
        })
      }

      case 'polish': {
        const result = polishCheck(text)
        return NextResponse.json({
          checkType: 'polish',
          result,
          summary: result.passed
            ? '✅ 通过'
            : `⚠️ ${result.failCount}项未通过，${result.warningCount}项警告`,
        })
      }

      case 'full': {
        const result = checkCompliance(text, chapterAUsed)
        return NextResponse.json({
          checkType: 'full',
          result,
          summary: `A类${result.forbiddenA}次 B类${result.forbiddenB}段 C类${result.forbiddenC}次 D类${result.forbiddenD}次 | 精致句密度${result.refinedDensity}%`,
        })
      }

      default:
        return NextResponse.json({ error: `未知检测类型：${checkType}` }, { status: 400 })
    }
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '合规检测失败' },
      { status: 500 }
    )
  }
}
