import { NextResponse } from 'next/server'
import { createUser, userExists, exportUsersFromMemory } from '@/lib/db/auth-store'
import { writeUsersToFile } from '@/lib/db/auth-store-server'

export async function POST(req: Request) {
  try {
    let body: { email?: string; password?: string; name?: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: '请求体不是有效的 JSON' }, { status: 400 })
    }

    const { email, password, name: rawName } = body

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

    const name = (rawName || '').trim() || email.split('@')[0]
    const user = await createUser(email, password, name)

    // P0-fix: 注册后同步写入磁盘文件，确保登录时也能读到
    writeUsersToFile(exportUsersFromMemory())

    return NextResponse.json({ success: true, message: '注册成功', email: user.email, name: user.name })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '未知错误' }, { status: 500 })
  }
}
