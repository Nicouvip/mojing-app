import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/audiobook/voices/polish
 * 用 DeepSeek 润色音色描述文本
 * Body: { description: string }
 * 返回: { polished: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { description } = await request.json()
    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: '请输入音色描述' }, { status: 400 })
    }

    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'DEEPSEEK_API_KEY 未配置' }, { status: 500 })
    }

    const prompt = `你是一个语音合成专家。用户描述了一个想要的音色，请帮用户润色这段描述，补充专业的语音特征术语（音高、共振峰、语速、情感色彩等），保持用户的原始意图不变，输出1-4句中文描述。

用户描述：${description}`

    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: prompt }], max_tokens: 300, temperature: 0.7 }),
    })

    const data = await res.json()
    const polished = data.choices?.[0]?.message?.content?.trim()

    if (!polished) {
      return NextResponse.json({ error: '润色失败，请重试' }, { status: 500 })
    }

    return NextResponse.json({ success: true, polished })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
