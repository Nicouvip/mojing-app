'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

const templates = [
  { id: 1, title: '都市异能开局', genre: '都市', desc: '主角在都市生活中觉醒异能，从日常切入超凡', words: '3,000' },
  { id: 2, title: '古言权谋宫斗', genre: '古言', desc: '深宫之中的暗流涌动，权谋与情感交织', words: '5,000' },
  { id: 3, title: '悬疑刑侦探案', genre: '悬疑', desc: '连环命案背后隐藏的惊天真相', words: '4,000' },
  { id: 4, title: '玄幻修炼成长', genre: '玄幻', desc: '从废柴到巅峰，逆天改命的修炼之路', words: '6,000' },
  { id: 5, title: '科幻末世求生', genre: '科幻', desc: '末日降临，人类在废墟中重建文明', words: '4,500' },
  { id: 6, title: '仙侠问道长生', genre: '仙侠', desc: '御剑乘风，问道求长生的修行之旅', words: '5,500' },
]

export default function TemplatesPage() {
  const router = useRouter()
  const [genre, setGenre] = useState('全部')

  const genres = ['全部', '都市', '古言', '悬疑', '玄幻', '科幻', '仙侠']
  const filtered = genre === '全部' ? templates : templates.filter(t => t.genre === genre)

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 h-14 px-6 flex items-center justify-between glass-panel border-b border-border">
        <div className="flex items-center gap-6">
          <Link href="/"><Image src="/assets/brand/mojing-logo-nav.png" alt="墨境" width={160} height={36} className="h-9 w-auto" priority /></Link>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link href="/" className="px-3 py-1.5 rounded-lg hover:bg-secondary hover:text-foreground transition-colors">首页</Link>
            <Link href="/templates" className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-medium">模板中心</Link>
          </div>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-2">模板中心</h1>
        <p className="text-muted-foreground mb-8">选择一个创作结构，开始你的下一部作品</p>
        <div className="flex flex-wrap gap-2 mb-8">
          {genres.map(g => (
            <button key={g} onClick={() => setGenre(g)} className={`px-4 py-2 rounded-full text-sm transition-colors ${genre === g ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground hover:bg-primary-light'}`}>{g}</button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(t => (
            <div key={t.id} className="bg-card rounded-2xl p-6 border border-border shadow-card hover:shadow-hover transition-all duration-300 ease group cursor-pointer" onClick={() => router.push('/')}>
              <div className="w-full aspect-[3/4] rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 mb-4 flex items-center justify-center">
                <span className="text-4xl font-serif text-primary/20">{t.genre.slice(0,1)}</span>
              </div>
              <h3 className="font-semibold mb-1">{t.title}</h3>
              <p className="text-xs text-muted-foreground mb-3">{t.desc}</p>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">约 {t.words} 字大纲</span>
                <span className="text-sm text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">使用模板 <ArrowRight size={14} /></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
