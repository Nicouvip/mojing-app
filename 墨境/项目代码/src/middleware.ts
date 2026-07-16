import { NextResponse } from 'next/server'
import { auth } from '@/auth'

/**
 * Next.js Middleware — 保护需要登录的路由
 * 
 * P1-11: /desk 等路由需要登录才能访问
 * 其他公开路由（/、/login、/register、/api/auth）不拦截
 */

const PROTECTED_ROUTES = ['/desk', '/admin', '/works', '/library']

export default auth((req) => {
  const { pathname } = req.nextUrl

  // 检查是否是需要保护的路由
  const isProtected = PROTECTED_ROUTES.some(route => pathname.startsWith(route))
  if (!isProtected) return NextResponse.next()

  // 未登录 → 跳转到登录页
  if (!req.auth?.user) {
    const loginUrl = new URL('/login', req.nextUrl.origin)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/desk/:path*', '/admin/:path*', '/works/:path*', '/library/:path*'],
}
