'use client'
import { Users, Globe, Bookmark, ListTree, Settings } from 'lucide-react'
import Navbar from '@/components/navbar'
import Link from 'next/link'
import Image from 'next/image'

const categories = [
  { icon: <Users className="w-5 h-5" />, title: '人物素材', count: 0, href: '/library/characters', color: 'text-warning bg-warning-light' },
  { icon: <Globe className="w-5 h-5" />, title: '世界观设定', count: 0, href: '/library/worldbuilding', color: 'text-blue-600 bg-blue-50' },
  { icon: <ListTree className="w-5 h-5" />, title: '大纲管理', count: 0, href: '/library/outline', color: 'text-purple-600 bg-purple-50' },
  { icon: <Settings className="w-5 h-5" />, title: '素材库设置', count: 0, href: '/library/settings', color: 'text-green-600 bg-green-50' },
]

export default function LibraryPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
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
