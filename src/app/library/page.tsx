'use client'
import Link from 'next/link'
import Image from 'next/image'
import { Users, Globe, Bookmark, Package, Search, Plus, ChevronRight } from 'lucide-react'

const categories = [
  { icon: <Users className="w-5 h-5" />, title: '人物素材', count: 0, href: '/library/characters', color: 'text-warning bg-warning-light' },
  { icon: <Globe className="w-5 h-5" />, title: '世界观设定', count: 0, href: '/library/world', color: 'text-blue-600 bg-blue-50' },
  { icon: <Bookmark className="w-5 h-5" />, title: '桥段金句', count: 0, href: '/library/bits', color: 'text-purple-600 bg-purple-50' },
  { icon: <Package className="w-5 h-5" />, title: '官方素材包', count: 0, href: '/library/packs', color: 'text-green-600 bg-green-50' },
]

export default function LibraryPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 h-14 px-6 flex items-center justify-between glass-panel border-b border-border">
        <div className="flex items-center gap-6">
          <Link href="/dashboard"><Image src="/assets/brand/mojing-logo-nav.png" alt="墨境" width={160} height={36} className="h-9 w-auto" priority /></Link>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link href="/dashboard" className="px-3 py-1.5 rounded-lg hover:bg-secondary hover:text-foreground transition-colors">工作台</Link>
            <Link href="/library" className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-medium">素材库</Link>
          </div>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-2">素材库</h1>
        <p className="text-muted-foreground mb-8">你的创作资产中心，所有人物、世界观、桥段都沉淀在这里</p>

        {/* 分类卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {categories.map((c, i) => (
            <Link key={i} href={c.href} className="bg-card rounded-2xl p-6 border border-border shadow-card hover:shadow-hover hover:-translate-y-0.5 transition-all duration-300 ease">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${c.color}`}>{c.icon}</div>
              <h3 className="font-semibold mb-1">{c.title}</h3>
              <p className="text-xs text-muted-foreground">{c.count} 项</p>
            </Link>
          ))}
        </div>

        {/* 最近使用 — 空状态 */}
        <div>
          <h2 className="text-xl font-semibold mb-4">最近使用</h2>
          <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border">
            <Bookmark className="w-12 h-12 mx-auto mb-4 text-primary/15" />
            <p className="text-muted-foreground" style={{ fontFamily: "'Noto Serif SC', serif" }}>素材库尚空，点滴灵感都可珍藏</p>
          </div>
        </div>
      </div>
    </div>
  )
}
