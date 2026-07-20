'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/db/auth-context'
import { getProjects } from '@/lib/db/store'
import { signOut } from 'next-auth/react'
import { useEffect, useState, type ReactNode } from 'react'
import type { Project } from '@/lib/db/types'
import { Home, BookOpen, PenTool, Headphones, FlaskConical, Clapperboard, PlayCircle, Pen, Star, Wrench, Sun, BookMarked, FolderOpen, GraduationCap, ClipboardList, Lightbulb, Bot, Sparkles, Mail, LogOut, Menu, X } from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: ReactNode
  showBadge?: boolean
  disabled?: boolean
}

/* ── 侧边栏链接定义 ── */
const MAIN_NAV: NavItem[] = [
  { href: '/desk', label: '首页', icon: <Home size={16} /> },
  { href: '/works', label: '我的作品', icon: <BookOpen size={16} />, showBadge: true },
]

const WRITE_NAV: NavItem[] = [
  { href: '/editor/demo-1', label: '小说写作', icon: <PenTool size={16} /> },
  { href: '/audiobook', label: '有声书', icon: <Headphones size={16} /> },
  { href: '/tools/text-analyzer', label: '文本分析', icon: <FlaskConical size={16} /> },
  { href: '#', label: '剧本写作', icon: <Clapperboard size={16} />, disabled: true },
  { href: '#', label: '漫剧视频', icon: <PlayCircle size={16} />, disabled: true },
  { href: '#', label: '通用写作', icon: <Pen size={16} />, disabled: true },
]

const PRODUCT_NAV: NavItem[] = [
  { href: '/features', label: '产品功能', icon: <Star size={16} /> },
  { href: '/templates', label: '模板中心', icon: <Wrench size={16} /> },
  { href: '/tools', label: '工具广场', icon: <Sun size={16} /> },
  { href: '/cases', label: '写作案例', icon: <BookMarked size={16} /> },
  { href: '/library', label: '素材库', icon: <FolderOpen size={16} /> },
]

const LEARN_NAV: NavItem[] = [
  { href: '#', label: '墨境课堂', icon: <GraduationCap size={16} />, disabled: true },
  { href: '#', label: '使用教程', icon: <ClipboardList size={16} />, disabled: true },
  { href: '#', label: '创作心得', icon: <Lightbulb size={16} />, disabled: true },
]

const TOOL_NAV: NavItem[] = [
  { href: '#', label: 'AI工具', icon: <Bot size={16} />, disabled: true },
  { href: '#', label: '技能库', icon: <Sparkles size={16} />, disabled: true },
  { href: '#', label: '投稿中心', icon: <Mail size={16} />, disabled: true },
]

/* ── 设计令牌：使用 CSS 变量统一主题 ── */
const C = {
  pri: 'var(--color-primary)',
  priDim: 'var(--color-primary-hover)',
  ink: 'var(--color-foreground)',
  muted: 'var(--color-muted-foreground)',
  line: 'var(--color-border)',
  paper: 'var(--color-background)',
  sb: 'var(--color-sidebar)',
  card: 'var(--color-card)',
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
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setProjects(getProjects())
    const handler = () => setProjects(getProjects())
    window.addEventListener('mojing:projects-changed', handler)
    return () => window.removeEventListener('mojing:projects-changed', handler)
  }, [])

  const current = activeHref ?? active ?? pathname
  const isActive = (href: string) => current === href || current.startsWith(href + '/')

  return (
    <>
      {/* 手机端汉堡按钮 */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 w-9 h-9 flex items-center justify-center rounded-lg bg-background/90 backdrop-blur-sm border border-border shadow-sm"
        aria-label="打开导航"
      >
        <Menu size={18} />
      </button>

      {/* 手机端抽屉遮罩 */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 手机端抽屉面板 */}
      <div
        className={`lg:hidden fixed top-0 left-0 z-50 h-full transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: C.navW, minWidth: C.navW, background: C.sb, boxShadow: '4px 0 20px rgba(0,0,0,0.08)' }}
      >
        <div className="flex items-center justify-between" style={{ padding: '28px 20px 16px' }}>
          <Link href="/desk" className="flex items-center gap-2 no-underline" style={{ fontFamily: "Georgia, 'Noto Serif SC', serif", fontSize: 20, fontWeight: 700, color: C.ink, letterSpacing: '.02em' }}>
            <span className="inline-block shrink-0" style={{ width: 9, height: 9, borderRadius: '50%', background: C.pri }} />
            墨境
          </Link>
          <button onClick={() => setMobileOpen(false)} className="p-1 rounded hover:bg-foreground/5" aria-label="关闭导航">
            <X size={18} />
          </button>
        </div>
        <nav className="overflow-y-auto" style={{ padding: '0 12px', height: 'calc(100% - 80px)' }} aria-label="手机导航">
          <SidebarNavContent projects={projects} isActive={isActive} />
        </nav>
      </div>

      {/* 桌面端侧边栏 */}
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
        <SidebarNavContent projects={projects} isActive={isActive} />
      </aside>
    </>
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
  icon: React.ReactNode
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
    <Link href={href} style={baseStyle} className="hover:opacity-80 transition-opacity" onClick={() => { /* 点击链接后关闭手机抽屉 */ const el = document.querySelector('.fixed.inset-0.z-40'); if (el) el.click(); }}>
      {inner}
    </Link>
  )
}

/* ── 共享导航内容（桌面侧边栏 + 手机抽屉共用） ── */
function SidebarNavContent({ projects, isActive }: { projects: Project[]; isActive: (href: string) => boolean }) {
  return (
    <>
      {/* Logo */}
      <Link
        href="/desk"
        className="flex items-center gap-2 no-underline"
        style={{
          padding: '28px 20px 16px',
          fontFamily: "Georgia, 'Noto Serif SC', serif",
          fontSize: 20,
          fontWeight: 700,
          color: 'var(--color-foreground)',
          letterSpacing: '.02em',
        }}
      >
        <span className="inline-block shrink-0" style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--color-primary)' }} />
        墨境
      </Link>

      {/* 导航 */}
      <nav className="flex-1 overflow-y-auto" style={{ padding: '0 12px' }} aria-label="功能导航">
        <NavGroup>
          {MAIN_NAV.map(item => (
            <NavItem key={item.href} href={item.href} icon={item.icon} label={item.label} active={isActive(item.href)} badge={item.showBadge ? projects.length : undefined} />
          ))}
        </NavGroup>
        <Divider />
        <NavGroup>
          {WRITE_NAV.map(item => (
            <NavItem key={item.label} href={item.disabled ? undefined : item.href} icon={item.icon} label={item.label} active={isActive(item.href)} disabled={item.disabled} />
          ))}
        </NavGroup>
        <Divider />
        <NavGroup>
          {PRODUCT_NAV.map(item => (
            <NavItem key={item.href} href={item.href} icon={item.icon} label={item.label} active={isActive(item.href)} />
          ))}
        </NavGroup>
        <Divider />
        <NavGroup>
          {LEARN_NAV.map(item => (
            <NavItem key={item.label} href={item.disabled ? undefined : item.href} icon={item.icon} label={item.label} disabled={item.disabled} />
          ))}
        </NavGroup>
        <Divider />
        <NavGroup>
          {TOOL_NAV.map(item => (
            <NavItem key={item.label} href={item.disabled ? undefined : item.href} icon={item.icon} label={item.label} disabled={item.disabled} />
          ))}
        </NavGroup>
      </nav>

      {/* 底部用户 */}
      <div className="flex items-center gap-3" style={{ padding: '12px 20px', borderTop: '1px solid var(--color-border)' }}>
        <UserAvatar />
        <UserLogout />
      </div>
    </>
  )
}

function UserAvatar() {
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const userName = user?.name || user?.email?.split('@')[0] || '墨友'
  const avatarChar = userName.charAt(0).toUpperCase()

  return (
    <div className="flex items-center justify-center shrink-0" style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))', color: '#fff', fontSize: 13, fontWeight: 600 }}>
      {mounted ? avatarChar : '墨'}
    </div>
  )
}

function UserLogout() {
  return (
    <button onClick={() => signOut({ callbackUrl: '/' })} className="ml-auto shrink-0 p-1 rounded transition-colors" style={{ color: 'var(--color-muted-foreground)' }} title="退出登录">
      <LogOut size={14} />
    </button>
  )
}
