import { NextResponse } from 'next/server'
import { verifyPassword } from '@/lib/db/auth-store'

export async function POST(req: Request) {
  try {
    const { email, password }: { email: string; password: string } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: '邮箱和密码不能为空' }, { status: 400 })
    }

    const user = await verifyPassword(email, password)
    if (!user) {
      return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 })
    }

    // Mock token（生产必须用 JWT / NextAuth session）
    const token = Buffer.from(`${email}:${Date.now()}`).toString('base64')

    return NextResponse.json({
      success: true,
      token,
      user: { email: user.email, createdAt: user.createdAt },
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '未知错误' }, { status: 500 })
  }
}
