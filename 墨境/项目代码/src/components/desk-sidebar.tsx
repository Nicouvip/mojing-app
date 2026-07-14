'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/db/auth-context'
import { getProjects } from '@/lib/db/store'
import { useEffect, useState } from 'react'
import type { Project } from '@/lib/db/types'

interface NavItem {
  href: string
  label: string
  icon: string
  showBadge?: boolean
  disabled?: boolean
}

/* ── 侧边栏链接定义 ── */
const MAIN_NAV: NavItem[] = [
  { href: '/desk', label: '首页', icon: '🏠' },
  { href: '/works', label: '我的作品', icon: '📚', showBadge: true },
]

const WRITE_NAV: NavItem[] = [
  { href: '/editor/demo-1', label: '小说写作', icon: '✍️' },
  { href: '#', label: '剧本写作', icon: '🎭', disabled: true },
  { href: '#', label: '漫剧视频', icon: '▶️', disabled: true },
  { href: '#', label: '通用写作', icon: '🖊️', disabled: true },
]

const PRODUCT_NAV: NavItem[] = [
  { href: '/features', label: '产品功能', icon: '⭐' },
  { href: '/templates', label: '模板中心', icon: '⚒️' },
  { href: '/tools', label: '工具广场', icon: '☀️' },
  { href: '/cases', label: '写作案例', icon: '📖' },
  { href: '/library', label: '素材库', icon: '🗂️' },
]

const LEARN_NAV: NavItem[] = [
  { href: '#', label: '墨境课堂', icon: '🎓', disabled: true },
  { href: '#', label: '使用教程', icon: '📋', disabled: true },
  { href: '#', label: '创作心得', icon: '📝', disabled: true },
]

const TOOL_NAV: NavItem[] = [
  { href: '#', label: 'AI工具', icon: '🤖', disabled: true },
  { href: '#', label: '技能库', icon: '🌟', disabled: true },
  { href: '#', label: '投稿中心', icon: '✉️', disabled: true },
]

/* ── 设计令牌（来自 v13.html）── */
const C = {
  pri: '#c4956a',
  priDim: '#b08050',
  ink: '#1a1814',
  muted: 'rgba(26,24,20,.45)',
  line: 'rgba(26,24,20,.06)',
  paper: '#f5f2ed',
  sb: '#f5f2ed',
  card: '#fff',
  radius: '8px',
  navW: '220px',
} as const

export interface DeskSidebarProps {
  /** 当前高亮的导航项 href */
  activeHref?: string
  /** 快捷方式：直接传路径字符串 */
  active?: string
}

export default function DeskSidebar({ activeHref, active }: DeskSidebarProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    setProjects(getProjects())
    // 定期刷新作品数（创建/删除作品后 badge 自动更新）
    const timer = setInterval(() => { setProjects(getProjects()) }, 5000)
    return () => clearInterval(timer)
  }, [])

  const current = activeHref ?? active ?? pathname
  const isActive = (href: string) => current === href || current.startsWith(href + '/')
  const userName = user?.name || user?.email?.split('@')[0] || '墨友'
  const avatarChar = userName.charAt(0).toUpperCase()

  return (
    <aside
      className="hidden lg:flex flex-col shrink-0 min-h-screen"
      style={{
        width: C.navW,
        minWidth: C.navW,
        background: C.sb,
        borderRight: `1px solid ${C.line}`,
      }}
      aria-label="主导航"
    >
      {/* Logo */}
      <Link
        href="/desk"
        className="flex items-center gap-2 no-underline"
        style={{
          padding: '28px 20px 16px',
          fontFamily: "Georgia, 'Noto Serif SC', serif",
          fontSize: 20,
          fontWeight: 700,
          color: C.ink,
          letterSpacing: '.02em',
        }}
      >
        <span
          className="inline-block shrink-0"
          style={{ width: 9, height: 9, borderRadius: '50%', background: C.pri }}
        />
        墨境
      </Link>

      {/* 导航 */}
      <nav className="flex-1 overflow-y-auto" style={{ padding: '0 12px' }} aria-label="功能导航">
        {/* 主入口 */}
        <NavGroup>
          {MAIN_NAV.map(item => (
            <NavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={isActive(item.href)}
              badge={item.showBadge ? projects.length : undefined}
            />
          ))}
        </NavGroup>

        <Divider />

        {/* 写作类型 */}
        <NavGroup>
          {WRITE_NAV.map(item => (
            <NavItem
              key={item.label}
              href={item.disabled ? undefined : item.href}
              icon={item.icon}
              label={item.label}
              active={isActive(item.href)}
              disabled={item.disabled}
            />
          ))}
        </NavGroup>

        <Divider />

        {/* 产品入口 */}
        <NavGroup>
          {PRODUCT_NAV.map(item => (
            <NavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={isActive(item.href)}
            />
          ))}
        </NavGroup>

        <Divider />

        {/* 学习 */}
        <NavGroup>
          {LEARN_NAV.map(item => (
            <NavItem
              key={item.label}
              href={item.disabled ? undefined : item.href}
              icon={item.icon}
              label={item.label}
              disabled={item.disabled}
            />
          ))}
        </NavGroup>

        <Divider />

        {/* 工具 */}
        <NavGroup>
          {TOOL_NAV.map(item => (
            <NavItem
              key={item.label}
              href={item.disabled ? undefined : item.href}
              icon={item.icon}
              label={item.label}
              disabled={item.disabled}
            />
          ))}
        </NavGroup>
      </nav>

      {/* 底部用户 */}
      <div
        className="flex items-center gap-3"
        style={{ padding: '12px 20px', borderTop: `1px solid ${C.line}` }}
      >
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${C.pri}, ${C.priDim})`,
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {avatarChar}
        </div>
        <span
          className="overflow-hidden text-ellipsis whitespace-nowrap"
          style={{ fontSize: 12, color: C.ink }}
        >
          {userName}
        </span>
      </div>
    </aside>
  )
}

/* ── 子组件 ── */

function NavGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col" style={{ gap: 2 }}>{children}</div>
}

function Divider() {
  return <div style={{ height: 1, background: 'rgba(26,24,20,.06)', margin: '10px 8px' }} />
}

interface NavItemProps {
  href?: string
  icon: string
  label: string
  active?: boolean
  badge?: number
  disabled?: boolean
}

function NavItem({ href, icon, label, active, badge, disabled }: NavItemProps) {
  const baseStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '9px 12px',
    borderRadius: 8,
    fontSize: 13,
    color: active ? '#c4956a' : disabled ? 'rgba(26,24,20,.25)' : 'rgba(26,24,20,.45)',
    cursor: disabled ? 'default' : 'pointer',
    textDecoration: 'none',
    border: 'none',
    background: active ? 'rgba(196,149,106,.1)' : 'none',
    fontFamily: 'inherit',
    width: '100%',
    textAlign: 'left' as const,
    minHeight: 38,
    fontWeight: active ? 600 : 400,
    transition: 'all .12s',
    opacity: disabled ? 0.5 : 1,
  }

  const inner = (
    <>
      <span className="shrink-0 flex items-center justify-center" style={{ width: 16, height: 16, fontSize: 14 }}>
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className="shrink-0"
          style={{
            fontSize: 10,
            marginLeft: 'auto',
            background: active ? 'rgba(196,149,106,.2)' : '#ebebeb',
            color: active ? '#c4956a' : '#1a1814',
            padding: '1px 7px',
            borderRadius: 10,
            fontWeight: 600,
          }}
        >
          {badge}
        </span>
      )}
    </>
  )

  if (!href || disabled) {
    return <div style={baseStyle} aria-disabled="true" title="即将上线">{inner}</div>
  }

  return (
    <Link href={href} style={baseStyle} className="hover:opacity-80 transition-opacity">
      {inner}
    </Link>
  )
}
