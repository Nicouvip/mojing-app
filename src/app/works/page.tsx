'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { getProjects } from '@/lib/db/store'
import type { Project } from '@/lib/db/types'
import { Plus, Trash2, ArrowRight, BookOpen, LayoutGrid, List } from 'lucide-react'

export default function WorksPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [view, setView] = useState<'grid' | 'list'>('grid')

  useEffect(() => { setProjects(getProjects()) }, [])

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 h-14 px-6 flex items-center justify-between glass-panel border-b border-border">
        <div className="flex items-center gap-6">
          <Link href="/dashboard"><Image src="/assets/brand/mojing-logo-nav.png" alt="墨境" width={160} height={36} className="h-9 w-auto" priority /></Link>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link href="/dashboard" className="px-3 py-1.5 rounded-lg hover:bg-secondary hover:text-foreground transition-colors">工作台</Link>
            <Link href="/works" className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-medium">我的作品</Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setView('grid')} className={`p-1.5 rounded-lg ${view === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}><LayoutGrid size={16} /></button>
          <button onClick={() => setView('list')} className={`p-1.5 rounded-lg ${view === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}><List size={16} /></button>
          <Button size="sm" onClick={() => router.push('/')}><Plus size={16} className="mr-1" />新建</Button>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-8">我的作品</h1>
        {projects.length === 0 ? (
          <div className="text-center py-20"><BookOpen className="w-16 h-16 mx-auto mb-6 text-primary/15" /><p className="text-xl font-medium mb-2" style={{ fontFamily: "'Noto Serif SC', serif" }}>案头尚无字，待君著新篇</p></div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {projects.map(p => (
              <div key={p.id} onClick={() => router.push(`/editor/${p.id}`)} className="bg-card rounded-2xl p-5 border border-border shadow-card hover:shadow-hover hover:-translate-y-0.5 transition-all duration-300 ease cursor-pointer">
                <div className="w-full h-2 rounded-full mb-3 bg-primary/20" />
                <h3 className="font-semibold truncate">{p.name}</h3>
                <p className="text-xs text-muted-foreground mt-2">{p.genre} · {p.chapterCount} 章 · {(p.totalWords||0).toLocaleString()} 字</p>
                <div className="mt-3 text-[11px] text-muted-foreground/60">{new Date(p.updatedAt).toLocaleDateString('zh-CN',{month:'short',day:'numeric'})}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map(p => (
              <div key={p.id} onClick={() => router.push(`/editor/${p.id}`)} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border cursor-pointer hover:shadow-card transition-all">
                <div className="flex items-center gap-4"><div className="w-1 h-10 rounded-full bg-primary/30" /><div><h3 className="font-medium">{p.name}</h3><p className="text-xs text-muted-foreground">{p.genre} · {p.chapterCount} 章 · {(p.totalWords||0).toLocaleString()} 字</p></div></div>
                <ArrowRight size={16} className="text-muted-foreground" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
