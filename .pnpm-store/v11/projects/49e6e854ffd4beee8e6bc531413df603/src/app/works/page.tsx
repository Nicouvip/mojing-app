'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { getProjects, deleteProject } from '@/lib/db/store'
import type { Project } from '@/lib/db/types'
import { Plus, Trash2, ArrowRight, BookOpen, LayoutGrid, List, Search, Clock, BookMarked, FileText } from 'lucide-react'
import Navbar from '@/components/navbar'

const GENRE_OPTIONS = ['全部', '都市', '悬疑', '玄幻', '言情', '科幻', '仙侠', '灵异']
const SORT_OPTIONS = [
  { key: 'updatedAt', label: '最近更新' },
  { key: 'createdAt', label: '创建时间' },
  { key: 'name', label: '作品名称' },
  { key: 'totalWords', label: '字数排序' },
] as const

type SortKey = (typeof SORT_OPTIONS)[number]['key']

export default function WorksPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [search, setSearch] = useState('')
  const [genreFilter, setGenreFilter] = useState('全部')
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { setProjects(getProjects()) }, [])

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation()
    if (confirm(`确认删除《${name}》？此操作不可恢复。`)) {
      setDeletingId(id)
      setTimeout(() => {
        deleteProject(id)
        setProjects(getProjects())
        setDeletingId(null)
      }, 200)
    }
  }

  const filtered = useMemo(() => {
    let list = [...projects]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(q))
    }
    if (genreFilter !== '全部') {
      list = list.filter(p => p.genre === genreFilter)
    }
    list.sort((a, b) => {
      if (sortKey === 'updatedAt') return b.updatedAt - a.updatedAt
      if (sortKey === 'createdAt') return b.createdAt - a.createdAt
      if (sortKey === 'name') return a.name.localeCompare(b.name)
      if (sortKey === 'totalWords') return (b.totalWords || 0) - (a.totalWords || 0)
      return 0
    })
    return list
  }, [projects, search, genreFilter, sortKey])

  const totalWords = useMemo(() => projects.reduce((s, p) => s + (p.totalWords || 0), 0), [projects])

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        extraRight={
          <div className="flex items-center gap-2">
            <button onClick={() => setView('grid')} className={`p-1.5 rounded-lg ${view === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}><LayoutGrid size={16} /></button>
            <button onClick={() => setView('list')} className={`p-1.5 rounded-lg ${view === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}><List size={16} /></button>
            <Button size="sm" onClick={() => router.push('/')}><Plus size={16} className="mr-1" />新建</Button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* 头部统计 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold">我的作品</h1>
            <p className="text-sm text-muted-foreground mt-1">共 {projects.length} 部作品 · 累计 {(totalWords / 10000).toFixed(1)} 万字</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-card rounded-xl px-4 py-3 border border-border shadow-card flex items-center gap-3">
              <BookMarked className="w-5 h-5 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">作品数</div>
                <div className="text-lg font-semibold">{projects.length}</div>
              </div>
            </div>
            <div className="bg-card rounded-xl px-4 py-3 border border-border shadow-card flex items-center gap-3">
              <FileText className="w-5 h-5 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">总字数</div>
                <div className="text-lg font-semibold">{(totalWords / 10000).toFixed(1)}万</div>
              </div>
            </div>
          </div>
        </div>

        {/* 筛选栏 */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索作品名称…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-border bg-background text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground/60"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {GENRE_OPTIONS.map(g => (
              <button key={g} onClick={() => setGenreFilter(g)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${genreFilter === g ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground hover:bg-primary-light'}`}>
                {g}
              </button>
            ))}
          </div>
          <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
            className="h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground outline-none focus:border-primary">
            {SORT_OPTIONS.map(s => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* 作品列表 */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 mx-auto mb-6 text-primary/15" />
            <p className="text-xl font-medium mb-2" style={{ fontFamily: "'Noto Serif SC', serif" }}>
              {projects.length === 0 ? '案头尚无字，待君著新篇' : '没有匹配的作品'}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              {projects.length === 0 ? '点击下方按钮，开始你的第一部作品吧' : '试试调整筛选条件'}
            </p>
            {projects.length === 0 && (
              <Button onClick={() => router.push('/')}><Plus size={16} className="mr-1" />开始创作</Button>
            )}
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map(p => (
              <div key={p.id}
                onClick={() => router.push(`/editor/${p.id}`)}
                className={`bg-card rounded-2xl p-5 border border-border shadow-card hover:shadow-hover hover:-translate-y-0.5 transition-all duration-300 ease cursor-pointer group ${deletingId === p.id ? 'opacity-0 scale-95 pointer-events-none' : ''}`}>
                <div className="w-full h-2 rounded-full mb-4 bg-gradient-to-r from-primary/30 via-primary/20 to-primary/10" />
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{p.name}</h3>
                    <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[11px] bg-primary-light text-primary">{p.genre}</span>
                  </div>
                  <button onClick={e => handleDelete(e, p.id, p.name)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-destructive ml-2">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{p.chapterCount} 章 · {(p.totalWords || 0).toLocaleString()} 字</span>
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {new Date(p.updatedAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-border/50 flex justify-end">
                  <span className="flex items-center gap-0.5 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-all">
                    继续创作 <ArrowRight size={13} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(p => (
              <div key={p.id}
                onClick={() => router.push(`/editor/${p.id}`)}
                className={`flex items-center justify-between p-4 rounded-xl bg-card border border-border cursor-pointer hover:shadow-card transition-all group ${deletingId === p.id ? 'opacity-0 scale-95 pointer-events-none' : ''}`}>
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-1.5 h-12 rounded-full bg-primary/30 shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-medium truncate">{p.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span className="bg-primary-light text-primary px-1.5 py-0.5 rounded text-[11px] mr-2">{p.genre}</span>
                      {p.chapterCount} 章 · {(p.totalWords || 0).toLocaleString()} 字
                      <span className="ml-3 text-muted-foreground/60">
                        <Clock size={11} className="inline mr-0.5" />
                        {new Date(p.updatedAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
