'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/lib/db/auth-context'
import { useTheme } from '@/lib/utils/theme-context'
import { Button } from '@/components/ui/button'
import { Menu, X, Sun, Sunrise, Moon, Snowflake, Plus } from 'lucide-react'

export interface NavbarProps {
  /** 覆盖默认的 h-14，首页使用 h-16 */
  tall?: boolean
  /** 额外右侧元素（如新建按钮） */
  extraRight?: React.ReactNode
  /** 隐藏主题切换按钮 */
  hideThemeToggle?: boolean
}

const NAV_ITEMS_LOGGED_OUT = [
  { href: '/features', label: '产品功能' },
  { href: '/templates', label: '模板中心' },
  { href: '/tools', label: '工具广场' },
  { href: '/cases', label: '写作案例' },
  { href: '/library', label: '素材库' },
  { href: '/login', label: '登录' },
] as const

const NAV_ITEMS_LOGGED_IN = [
  { href: '/dashboard', label: '工作台' },
  { href: '/works', label: '我的作品' },
  { href: '/desk', label: '书桌' },
] as const

type ThemeKey = 'light' | 'warm' | 'dark' | 'cool'

const themeIcons: Record<ThemeKey, React.ReactNode> = {
  light: <Sun className="w-3.5 h-3.5" />,
  warm: <Sunrise className="w-3.5 h-3.5" />,
  dark: <Moon className="w-3.5 h-3.5" />,
  cool: <Snowflake className="w-3.5 h-3.5" />,
}

export default function Navbar({ tall, extraRight, hideThemeToggle }: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isLoggedIn, user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // 检测管理员身份
  useEffect(() => {
    setIsAdmin(!!(user?.email && (
      user.email.includes('admin') ||
      user.email === 'mojing@admin.com'
    )))
  }, [user])

  // 路由变化时关闭抽屉
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const navItems = isLoggedIn ? NAV_ITEMS_LOGGED_IN : NAV_ITEMS_LOGGED_OUT

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  return (
    <>
      <nav className={`sticky top-0 z-50 ${tall ? 'h-16' : 'h-14'} px-6 flex items-center justify-between glass-panel border-b border-border`}>
        {/* 左侧：Logo + 导航项（桌面） */}
        <div className="flex items-center gap-6 min-w-0">
          <Link href={isLoggedIn ? '/dashboard' : '/'} className="shrink-0">
            <Image
              src="/assets/brand/mojing-logo-nav.png"
              alt="墨境"
              width={160}
              height={36}
              className="h-9 w-auto"
              priority
            />
          </Link>

          {/* 桌面导航 */}
          <div className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  isActive(item.href)
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'hover:bg-secondary hover:text-foreground'
                }`}
              >
                {item.label}
              </Link>
            ))}
            {/* 管理员入口（已登录 + 管理员可见） */}
            {isLoggedIn && isAdmin && (
              <Link
                href="/admin"
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  isActive('/admin')
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'hover:bg-secondary hover:text-foreground'
                }`}
              >
                Admin
              </Link>
            )}
          </div>
        </div>

        {/* 右侧：主题切换 + 用户操作 + 汉堡按钮 */}
        <div className="flex items-center gap-3 shrink-0">
          {/* 桌面端右侧 */}
          <div className="hidden md:flex items-center gap-3">
            {!hideThemeToggle && (
              <div className="flex items-center gap-1 mr-1">
                {(Object.keys(themeIcons) as ThemeKey[]).map(k => (
                  <button
                    key={k}
                    onClick={() => setTheme(k)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all duration-200 ${
                      theme === k
                        ? 'bg-primary text-white shadow-[0_0_12px_rgba(107,140,110,0.3)]'
                        : 'text-muted-foreground/60 hover:bg-secondary'
                    }`}
                  >
                    {themeIcons[k]}
                  </button>
                ))}
              </div>
            )}

            {isLoggedIn ? (
              <>
                <Link
                  href="/account"
                  className="text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                >
                  个人中心
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-sm text-muted-foreground/60 hover:text-destructive transition-colors"
                >
                  退出
                </button>
              </>
            ) : (
              <Link
                href="/register"
                className="text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                注册
              </Link>
            )}

            <Link
              href="/desk"
              className="h-9 px-5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover hover:-translate-y-0.5 transition-all duration-300 shadow-card hover:shadow-hover flex items-center"
            >
              开始创作
            </Link>

            {extraRight}
          </div>

          {/* 移动端汉堡按钮 */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 rounded-lg hover:bg-secondary text-muted-foreground"
            aria-label="打开菜单"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* ===== 移动端抽屉菜单 ===== */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* 遮罩 — 毛玻璃效果 */}
        <div
          className="absolute inset-0 bg-black/20 backdrop-blur-md"
          onClick={() => setMobileOpen(false)}
        />

        {/* 抽屉面板 */}
        <div
          className={`absolute top-0 right-0 w-64 h-full bg-card border-l border-border shadow-modal p-6 transition-transform duration-300 ${
            mobileOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* 抽屉头部 */}
          <div className="flex items-center justify-between mb-8">
            <Image
              src="/assets/brand/mojing-logo-nav.png"
              alt="墨境"
              height={32}
              width={110}
              className="h-8 w-auto"
            />
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"
              aria-label="关闭菜单"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 抽屉导航项 */}
          <nav className="flex flex-col gap-1">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`px-4 py-3 rounded-xl text-left text-sm transition-colors ${
                  isActive(item.href)
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                {item.label}
              </Link>
            ))}

            {/* 管理员入口（移动端） */}
            {isLoggedIn && isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className={`px-4 py-3 rounded-xl text-left text-sm transition-colors ${
                  isActive('/admin')
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                Admin
              </Link>
            )}

            <hr className="my-3 border-border" />

            {/* 用户操作（移动端） */}
            {isLoggedIn ? (
              <>
                <Link
                  href="/account"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-xl text-left text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  个人中心
                </Link>
                <button
                  onClick={() => { setMobileOpen(false); handleLogout() }}
                  className="px-4 py-3 rounded-xl text-left text-sm text-muted-foreground hover:bg-secondary hover:text-destructive transition-colors"
                >
                  退出登录
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-xl text-left text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  登录
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-xl text-left text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  注册
                </Link>
              </>
            )}

            {/* 主题切换（移动端） */}
            {!hideThemeToggle && (
              <div className="mt-4 flex gap-2">
                {(Object.keys(themeIcons) as ThemeKey[]).map(k => (
                  <button
                    key={k}
                    onClick={() => setTheme(k)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-all ${
                      theme === k ? 'bg-primary text-white' : 'text-muted-foreground/60 hover:bg-secondary'
                    }`}
                  >
                    {themeIcons[k]}
                  </button>
                ))}
              </div>
            )}
          </nav>
        </div>
      </div>
    </>
  )
}
