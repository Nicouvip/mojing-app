'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getProjects, createProject, deleteProject } from '@/lib/db/store'
import type { Project } from '@/lib/db/types'
import Navbar from '@/components/navbar'
import DeskSidebar from '@/components/desk-sidebar'

/* ── 设计系统 token ── */
const C = {
  pri: '#c4956a',
  priDim: '#b08050',
  ink: '#1a1814',
  muted: 'rgba(26,24,20,.45)',
  line: 'rgba(26,24,20,.06)',
  paper: '#f5f2ed',
  sb: '#f5f2ed',
  card: '#fff',
  green: '#7a9e7a',
  radius: 8,
} as const

const FILTERS = ['全部', '长篇', '中篇', '短篇'] as const
const SORT_OPTIONS = [
  { key: 'updatedAt', label: '最近编辑' },
  { key: 'totalWords', label: '字数最多' },
  { key: 'name', label: '名称排序' },
] as const

type SortKey = (typeof SORT_OPTIONS)[number]['key']

/* ── 封面配色 ── */
const COVER_GRADS = [
  'linear-gradient(160deg,#d4c5a9,#b8a080)',
  'linear-gradient(160deg,#b8b4aa,#958f80)',
  'linear-gradient(160deg,#b8a898,#908070)',
  'linear-gradient(160deg,#c4b090,#a88860)',
  'linear-gradient(160deg,#a89888,#887060)',
  'linear-gradient(160deg,#706058,#504038)',
]

export default function WorksPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('全部')
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt')
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newGenre, setNewGenre] = useState('都市')

  useEffect(() => { setProjects(getProjects()) }, [])

  const filtered = useMemo(() => {
    let list = [...projects]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(q))
    }
    if (filter === '长篇') list = list.filter(p => (p.totalWords || 0) >= 80000)
    else if (filter === '中篇') list = list.filter(p => (p.totalWords || 0) >= 20000 && (p.totalWords || 0) < 80000)
    else if (filter === '短篇') list = list.filter(p => (p.totalWords || 0) < 20000)
    list.sort((a, b) => {
      if (sortKey === 'updatedAt') return b.updatedAt - a.updatedAt
      if (sortKey === 'totalWords') return (b.totalWords || 0) - (a.totalWords || 0)
      return a.name.localeCompare(b.name)
    })
    return list
  }, [projects, search, filter, sortKey])

  const handleCreate = () => {
    if (!newName.trim()) return
    const p = createProject(newName.trim(), newGenre)
    setShowNew(false); setNewName('')
    router.push(`/editor/${p.id}`)
  }

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation()
    if (confirm(`确认删除《${name}》？`)) { deleteProject(id); setProjects(getProjects()) }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.paper, color: C.ink, fontFamily: "'PingFang SC','Microsoft YaHei','Noto Sans SC',sans-serif", fontSize: 13, lineHeight: 1.5 }}>
      {/* 顶部导航栏 — 保留 Landing 一致的产品链接 */}
      <Navbar />

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
        {/* 侧边栏 */}
        <DeskSidebar active="works" />

        {/* 主内容区 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: C.card, overflowY: 'auto' }}>
          {/* 顶栏 */}
          <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', height: 56, borderBottom: `1px solid ${C.line}`, flexShrink: 0, gap: 16 }}>
            {/* 搜索 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.sb, borderRadius: 20, padding: '0 16px', height: 36, maxWidth: 300, flex: '0 1 300px' }}>
              <span style={{ color: C.muted, fontSize: 14, flexShrink: 0 }}>⌕</span>
              <input
                type="search"
                placeholder="搜索作品名…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ border: 'none', background: 'none', outline: 'none', fontSize: 13, color: C.ink, fontFamily: 'inherit', width: '100%' }}
              />
            </div>

            {/* 筛选 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {FILTERS.map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  style={{ padding: '5px 14px', borderRadius: 20, border: `1px solid ${filter === f ? C.pri : C.line}`, fontSize: 12, cursor: 'pointer', background: filter === f ? C.pri : C.card, color: filter === f ? '#fff' : C.muted, fontFamily: 'inherit', transition: 'all .12s', minHeight: 32, fontWeight: filter === f ? 600 : 400 }}>
                  {f}
                </button>
              ))}
            </div>

            {/* 排序 + 新建 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
                style={{ border: `1px solid ${C.line}`, borderRadius: C.radius, padding: '6px 12px', fontSize: 12, fontFamily: 'inherit', color: C.ink, background: C.card, outline: 'none', cursor: 'pointer' }}>
                {SORT_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              <button onClick={() => setShowNew(true)}
                style={{ fontSize: 12, padding: '7px 18px', border: `1px solid ${C.pri}`, borderRadius: 20, background: C.pri, cursor: 'pointer', color: '#fff', fontFamily: 'inherit', fontWeight: 500, minHeight: 34, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                ＋ 新建作品
              </button>
            </div>
          </header>

          {/* 内容区 */}
          <div style={{ padding: 28, flex: 1, overflowY: 'auto' }}>
            {/* 标题 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h1 style={{ fontFamily: "'Noto Serif SC',Georgia,serif", fontSize: 24, fontWeight: 700, color: C.ink, margin: 0 }}>我的作品</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: C.muted }}>
                <span>{projects.length} 部作品</span>
              </div>
            </div>

            {/* 书架网格 */}
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <p style={{ fontFamily: "'Noto Serif SC',Georgia,serif", fontSize: 20, color: C.ink, opacity: 0.4, marginBottom: 12 }}>
                  {projects.length === 0 ? '案头尚无字，待君著新篇' : '没有匹配的作品'}
                </p>
                <p style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>
                  {projects.length === 0 ? '点击「新建作品」开始你的第一部' : '试试调整筛选条件'}
                </p>
                {projects.length === 0 && (
                  <button onClick={() => setShowNew(true)}
                    style={{ fontSize: 13, padding: '10px 24px', borderRadius: C.radius, background: C.pri, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>
                    新建作品
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 20 }}>
                {filtered.map((p, i) => {
                  const coverGrad = COVER_GRADS[i % COVER_GRADS.length]
                  const progress = Math.min(100, Math.round(((p.totalWords || 0) / 80000) * 100))
                  const firstChar = p.name.charAt(0)
                  const isLong = (p.totalWords || 0) >= 80000
                  const typeLabel = isLong ? '长篇' : (p.totalWords || 0) >= 20000 ? '中篇' : '短篇'

                  return (
                    <article key={p.id} onClick={() => router.push(`/editor/${p.id}`)}
                      aria-label={`《${p.name}》${typeLabel} ${(p.totalWords||0).toLocaleString()}字 第${p.chapterCount}章`}
                      style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'all .2s' }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)' }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}>
                      {/* 封面 */}
                      <div style={{ aspectRatio: '3/4', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', fontSize: 28, fontFamily: "'Noto Serif SC',Georgia,serif", fontWeight: 700, color: 'rgba(255,255,255,.7)', boxShadow: '0 4px 16px rgba(26,24,20,.08)', background: coverGrad }}>
                        <span style={{ position: 'absolute', top: 8, left: 8, fontSize: 9, padding: '2px 8px', borderRadius: 8, background: 'rgba(26,24,20,.55)', color: '#fff', letterSpacing: '.06em', fontWeight: 500, fontFamily: "'PingFang SC',sans-serif" }}>{typeLabel}</span>
                        <span style={{ position: 'absolute', bottom: 10, right: 10, fontSize: 9, color: 'rgba(255,255,255,.5)', fontWeight: 400 }}>第{p.chapterCount}章</span>
                        {firstChar}
                      </div>
                      {/* 阴影 */}
                      <div style={{ width: '90%', height: 12, borderRadius: '50%', background: 'rgba(26,24,20,.06)', margin: '0 auto', filter: 'blur(8px)', opacity: 0.3, transition: 'opacity .2s' }} />
                      {/* 信息 */}
                      <div style={{ padding: '10px 2px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <h2 style={{ fontSize: 13, fontWeight: 600, color: C.ink, fontFamily: "'Noto Serif SC',Georgia,serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                          《{p.name}》
                        </h2>
                        <div style={{ fontSize: 11, color: C.muted, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>{p.genre || '未分类'}</span>
                          <span>{(p.totalWords || 0).toLocaleString()}字</span>
                        </div>
                        {/* 进度条 */}
                        <div style={{ height: 3, borderRadius: 2, background: C.line, marginTop: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 2, background: progress >= 90 ? C.green : C.pri, width: `${progress}%` }} />
                        </div>
                        {/* 操作 */}
                        <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                          <button onClick={e => { e.stopPropagation(); router.push(`/editor/${p.id}`) }}
                            style={{ fontSize: 10, padding: '3px 10px', border: `1px solid ${C.line}`, borderRadius: 10, background: 'none', color: C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
                            继续写
                          </button>
                          <button onClick={e => { e.stopPropagation(); router.push(`/audiobook/${p.id}`) }}
                            style={{ fontSize: 10, padding: '3px 10px', border: `1px solid ${C.pri}`, borderRadius: 10, background: 'rgba(196,149,106,.08)', color: C.pri, cursor: 'pointer', fontFamily: 'inherit' }}>
                            🎧 有声书
                          </button>
                          <button onClick={e => handleDelete(e, p.id, p.name)}
                            style={{ fontSize: 10, padding: '3px 10px', border: `1px solid ${C.line}`, borderRadius: 10, background: 'none', color: C.muted, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#b5454a'; e.currentTarget.style.color = '#b5454a' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = C.line; e.currentTarget.style.color = C.muted }}>
                            🗑 删除
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 新建作品弹窗 */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,.3)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setShowNew(false) }}>
          <div style={{ background: C.card, borderRadius: 16, padding: 32, maxWidth: 480, width: 'calc(100% - 32px)', boxShadow: '0 16px 48px rgba(26,24,20,.12)', display: 'flex', flexDirection: 'column', gap: 20, position: 'relative' }}>
            <button onClick={() => setShowNew(false)} aria-label="关闭"
              style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: '50%', border: 'none', background: C.sb, cursor: 'pointer', fontSize: 16, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            <h3 style={{ fontSize: 18, fontFamily: "'Noto Serif SC',Georgia,serif", fontWeight: 700, color: C.ink, margin: 0 }}>创建新作品</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>作品名称</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="给你的故事起个名字…" maxLength={50}
                style={{ width: '100%', padding: '10px 14px', border: `1px solid ${C.line}`, borderRadius: C.radius, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: C.sb, color: C.ink }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>题材</label>
              <select value={newGenre} onChange={e => setNewGenre(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', border: `1px solid ${C.line}`, borderRadius: C.radius, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: C.sb, color: C.ink }}>
                {['都市','玄幻','悬疑','科幻','历史','灵异','言情','竞技'].map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: C.radius, background: 'rgba(196,149,106,.04)', border: '1px dashed rgba(196,149,106,.15)' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(135deg,${C.pri},${C.priDim})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, color: '#fff' }}>墨</div>
              <span style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>墨灵将自动生成大纲、人物关系和开篇第一章。</span>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={() => setShowNew(false)}
                style={{ fontSize: 12, padding: '7px 18px', border: `1px solid ${C.line}`, borderRadius: 20, background: C.card, cursor: 'pointer', color: C.ink, fontFamily: 'inherit', minHeight: 34 }}>取消</button>
              <button onClick={handleCreate}
                style={{ fontSize: 12, padding: '7px 18px', border: `1px solid ${C.pri}`, borderRadius: 20, background: C.pri, cursor: 'pointer', color: '#fff', fontFamily: 'inherit', fontWeight: 500, minHeight: 34 }}>✦ 开始创作</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
