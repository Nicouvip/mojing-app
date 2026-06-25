import { NextRequest, NextResponse } from 'next/server'
import { getAllUsers, setUserBanned } from '@/lib/db/auth-store'

/**
 * GET /api/admin/users
 * 返回所有用户列表（不含密码哈希）
 */
export async function GET() {
  const users = getAllUsers()
  return NextResponse.json({ users })
}

/**
 * PATCH /api/admin/users
 * 禁用/启用用户
 * Body: { email: string, banned: boolean }
 */
export async function PATCH(req: NextRequest) {
  try {
    const { email, banned }: { email: string; banned: boolean } = await req.json()
    if (!email) {
      return NextResponse.json({ error: '缺少 email 参数' }, { status: 400 })
    }
    const ok = await setUserBanned(email, banned)
    if (!ok) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }
    return NextResponse.json({ success: true, email, banned })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '未知错误' },
      { status: 500 }
    )
  }
}
