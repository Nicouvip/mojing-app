import { NextResponse } from 'next/server'
import { verifyPassword } from '@/lib/db/auth-store'

export async function POST(req: Request) {
  try {
    let body: { email?: string; password?: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: '请求体不是有效的 JSON' }, { status: 400 })
    }

    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: '邮箱和密码不能为空' }, { status: 400 })
    }

    const user = await verifyPassword(email, password)

    if (!user) {
      return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      token: `session-${user.id}-${Date.now()}`,
      user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '未知错误' }, { status: 500 })
  }
}
