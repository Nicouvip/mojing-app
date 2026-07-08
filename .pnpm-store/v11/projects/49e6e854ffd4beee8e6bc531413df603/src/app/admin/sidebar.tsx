'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils/utils'
import { LayoutDashboard, Users, Settings, FileText, BarChart3, Database, ChevronRight, BookOpen, Shield, PenLine, Building2, Video, ExternalLink } from 'lucide-react'

const navItems = [
  { href: '/admin', label: '数据看板', icon: LayoutDashboard },
  { href: '/admin/prompts', label: '提示词模板', icon: BookOpen },
  { href: '/admin/compliance', label: '合规规则', icon: Shield },
  { href: '/admin/pages', label: '页面编辑器', icon: PenLine },
  { href: '/admin/users', label: '用户管理', icon: Users },
  { href: '/admin/works', label: '作品管理', icon: FileText },
  { href: '/admin/backup', label: '数据备份', icon: Database },
  { href: '/admin/stats', label: '统计报表', icon: BarChart3 },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-[240px] shrink-0 bg-card border-r border-border flex flex-col">
      <div className="h-14 px-5 flex items-center border-b border-border">
        <Link href="/" className="flex items-center">
          <Image src="/assets/brand/mojing-logo-nav.png" alt="墨境" width={160} height={32} className="h-8 w-auto" priority />
        </Link>
      </div>

      <nav className="flex-1 py-3 px-3 space-y-0.5">
        {navItems.map(item => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group",
                isActive && "bg-primary/10 text-primary font-medium",
                !isActive && "text-muted-foreground hover:bg-secondary hover:text-foreground",
                
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-3 h-3" />}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
