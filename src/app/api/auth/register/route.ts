import { NextResponse } from 'next/server'
import { createUser, userExists } from '@/lib/db/auth-store'

export async function POST(req: Request) {
  try {
    const { email, password }: { email: string; password: string } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: '邮箱和密码不能为空' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: '密码至少 6 位' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 })
    }
    if (await userExists(email)) {
      return NextResponse.json({ error: '该邮箱已注册' }, { status: 409 })
    }

    const name = email.split('@')[0]
    const user = await createUser(email, password, name)
    return NextResponse.json({ success: true, message: '注册成功', email: user.email, name: user.name })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '未知错误' }, { status: 500 })
  }
}
