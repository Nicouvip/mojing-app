/**
 * Admin API 认证中间件
 *
 * 在所有 /api/admin/* 路由中调用，确保只有管理员可以访问。
 * 管理员判定策略：
 *   1. NextAuth session 存在且 user.email 在白名单中
 *   2. 白名单来自环境变量 ADMIN_EMAILS（逗号分隔），
 *      默认 fallback 为 'mojing@admin.com'
 */
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

function getAdminEmails(): string[] {
  const envEmails = process.env.ADMIN_EMAILS
  if (envEmails) return envEmails.split(',').map(e => e.trim().toLowerCase())
  return ['mojing@admin.com']
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return getAdminEmails().includes(email.toLowerCase())
}

export async function requireAdmin(): Promise<{ error?: NextResponse }> {
  try {
    const session = await auth()

    if (isAdminEmail(session?.user?.email)) {
      return {} // 已认证为管理员
    }

    // 如果 NextAuth session 存在但不是 admin
    if (session?.user) {
      return {
        error: NextResponse.json(
          { error: '无权访问，需要管理员权限' },
          { status: 403 }
        ),
      }
    }

    // 无 session → 未登录
    return {
      error: NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      ),
    }
  } catch {
    return {
      error: NextResponse.json(
        { error: '认证服务异常' },
        { status: 500 }
      ),
    }
  }
}
