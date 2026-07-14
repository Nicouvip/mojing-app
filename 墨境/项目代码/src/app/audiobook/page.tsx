'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/navbar'
import DeskSidebar from '@/components/desk-sidebar'
import { getProjects, getChapters } from '@/lib/db/store'
import type { Project, Chapter } from '@/lib/db/types'

/* ── 设计令牌 ── */
const C = {
  pri: '#c4956a',
  priDim: '#b08050',
  ink: '#1a1814',
  muted: 'rgba(26,24,20,.45)',
  line: 'rgba(26,24,20,.06)',
  paper: '#f5f2ed',
  card: '#fff',
  indigo: '#3a5279',
  crimson: '#b5454a',
  green: '#7a9e7a',
  radius: 8,
} as const

const GENRES = ['全部', '都市', '玄幻', '悬疑', '科幻', '历史', '灵异', '言情', '竞技'] as const

const COVER_GRADS = [
  'linear-gradient(135deg,#e8dfd2,#d5c8b5)',
  'linear-gradient(135deg,#d9d4cb,#c7bfb2)',
  'linear-gradient(135deg,#cfc8bc,#b8afa2)',
  'linear-gradient(135deg,#c4b090,#a88860)',
  'linear-gradient(135deg,#b8a898,#908070)',
  'linear-gradient(135deg,#a89888,#887060)',
  'linear-gradient(135deg,#3a5279,#2a3a55)',
  'linear-gradient(135deg,#b5454a,#8a2a2a)',
]

const GENRE_ICONS: Record<string, string> = {
  '都市': '🏙️', '玄幻': '🐉', '悬疑': '🔍', '科幻': '🚀',
  '历史': '📜', '灵异': '👻', '言情': '💕', '竞技': '⚡',
}

interface ProjectWithChapters extends Project {
  chapters: Chapter[]
}

export default function AudiobookPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectWithChapters[]>([])
  const [search, setSearch] = useState('')
  const [genreFilter, setGenreFilter] = useState('全部')
  const [showImport, setShowImport] = useState(false)
  const [importFiles, setImportFiles] = useState<FileList | null>(null)
  const [importTarget, setImportTarget] = useState<string>('')
  const [importLoading, setImportLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const projs = getProjects().filter(p => !p.deletedAt).sort((a, b) => b.updatedAt - a.updatedAt)
    const withChapters = projs.map(p => ({
      ...p,
      chapters: getChapters(p.id).filter(c => !c.deletedAt).sort((a, b) => a.order - b.order),
    }))
    setProjects(withChapters)
  }, [])

  const filtered = projects.filter(p => {
    if (genreFilter !== '全部' && p.genre !== genreFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!p.name.toLowerCase().includes(q) && !p.genre.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q)) return false
    }
    return true
  })

  /** 导入音频文件 */
  const handleImport = async () => {
    if (!importFiles || !importTarget) { alert('请选择文件和目标作品'); return }
    setImportLoading(true)

    for (let i = 0; i < importFiles.length; i++) {
      const file = importFiles[i]
      try {
        const base64 = await file.arrayBuffer().then(buf => {
          const bytes = new Uint8Array(buf)
          let binary = ''
          for (let j = 0; j < bytes.length; j++) binary += String.fromCharCode(bytes[j])
          return btoa(binary)
        })

        const res = await fetch('/api/audiobook/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: importTarget,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || 'audio/mpeg',
            audioBase64: base64,
          }),
        })
        const data = await res.json()
        if (!data.success) console.error(`Import failed for ${file.name}:`, data.error)
      } catch (err) {
        console.error(`Import failed for ${file.name}:`, err)
      }
    }

    setImportLoading(false)
    setShowImport(false)
    setImportFiles(null)
    alert('导入完成')
  }

  return (
    <div style={{ minHeight: '100vh', background: C.paper }}>
      <Navbar />
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
        <DeskSidebar active="/audiobook" />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

          {/* ── 顶栏 ── */}
          <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', height: 56, borderBottom: `1px solid ${C.line}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>🎧</span>
              <h1 style={{ fontSize: 16, fontWeight: 600, color: C.ink, margin: 0 }}>有声书工坊</h1>
              <span style={{ fontSize: 11, color: C.muted, padding: '2px 8px', background: 'rgba(26,24,20,.04)', borderRadius: 10 }}>{projects.length} 部作品</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.card, border: `1px solid ${C.line}`, borderRadius: 20, padding: '0 14px', height: 34 }}>
                <span style={{ color: C.muted, fontSize: 13 }}>🔍</span>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="搜索作品..."
                  style={{ border: 'none', background: 'none', outline: 'none', fontSize: 12, color: C.ink, width: 180, fontFamily: 'inherit' }}
                />
              </div>
              <button onClick={() => setShowImport(true)} style={{ padding: '7px 16px', background: C.card, border: `1px solid ${C.line}`, borderRadius: 20, fontSize: 12, color: C.ink, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
                📥 导入有声书
              </button>
            </div>
          </header>

          {/* ── 题材筛选 ── */}
          <div style={{ display: 'flex', gap: 6, padding: '12px 28px', borderBottom: `1px solid ${C.line}`, flexShrink: 0, overflowX: 'auto' }}>
            {GENRES.map(g => (
              <button
                key={g}
                onClick={() => setGenreFilter(g)}
                style={{
                  padding: '5px 14px', borderRadius: 14, fontSize: 12, border: 'none',
                  background: genreFilter === g ? C.pri : 'rgba(26,24,20,.04)',
                  color: genreFilter === g ? '#fff' : C.muted,
                  cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                }}
              >
                {g}
              </button>
            ))}
          </div>

          {/* ── 作品列表 ── */}
          <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🎧</div>
                <p style={{ fontSize: 14, color: C.muted, margin: '0 0 16px' }}>
                  {search || genreFilter !== '全部' ? '没有找到匹配的作品' : '还没有作品'}
                </p>
                <Link href="/desk" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 24px', background: C.pri, color: '#fff', borderRadius: 20, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                  ✏️ 去创作
                </Link>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {filtered.map((project, idx) => {
                  const isExpanded = expandedId === project.id
                  const totalWords = project.totalWords || project.chapters.reduce((s, c) => s + (c.wordCount || 0), 0)
                  const chapterCount = project.chapterCount || project.chapters.length
                  const recentChapters = project.chapters.slice(0, 3)

                  return (
                    <div
                      key={project.id}
                      style={{
                        background: C.card,
                        border: `1px solid ${C.line}`,
                        borderRadius: 12,
                        overflow: 'hidden',
                        transition: 'box-shadow .15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,.06)')}
                      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                    >
                      {/* 封面 */}
                      <div style={{
                        height: 100,
                        background: COVER_GRADS[idx % COVER_GRADS.length],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                      }}>
                        <span style={{ fontSize: 32 }}>{GENRE_ICONS[project.genre] || '📖'}</span>
                        <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 4 }}>
                          <span style={{ fontSize: 10, padding: '2px 8px', background: 'rgba(255,255,255,.85)', borderRadius: 10, color: C.ink, fontWeight: 500 }}>
                            {project.genre}
                          </span>
                        </div>
                      </div>

                      {/* 内容 */}
                      <div style={{ padding: '14px 16px' }}>
                        <h3 style={{ fontSize: 15, fontWeight: 600, color: C.ink, margin: '0 0 6px', lineHeight: 1.3 }}>{project.name}</h3>
                        {project.description && (
                          <p style={{ fontSize: 11, color: C.muted, margin: '0 0 8px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {project.description}
                          </p>
                        )}

                        {/* 统计 */}
                        <div style={{ display: 'flex', gap: 12, fontSize: 11, color: C.muted, marginBottom: 12 }}>
                          <span>📖 {chapterCount} 章</span>
                          <span>📝 {totalWords.toLocaleString()} 字</span>
                          <span>🕐 {new Date(project.updatedAt).toLocaleDateString('zh-CN')}</span>
                        </div>

                        {/* 章节预览 */}
                        {recentChapters.length > 0 && (
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 500 }}>章节预览</div>
                            {recentChapters.map(ch => (
                              <div key={ch.id} style={{ fontSize: 11, color: C.ink, padding: '4px 8px', background: 'rgba(26,24,20,.02)', borderRadius: 4, marginBottom: 3, display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{ch.title}</span>
                                <span style={{ color: C.muted, marginLeft: 8, flexShrink: 0 }}>{(ch.wordCount || 0).toLocaleString()} 字</span>
                              </div>
                            ))}
                            {chapterCount > 3 && (
                              <div style={{ fontSize: 10, color: C.muted, textAlign: 'center', marginTop: 4 }}>还有 {chapterCount - 3} 章...</div>
                            )}
                          </div>
                        )}

                        {/* 内容摘要 */}
                        {recentChapters[0]?.content && (
                          <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontStyle: 'italic', padding: '8px 10px', background: 'rgba(196,149,106,.04)', borderRadius: 6, borderLeft: `3px solid ${C.pri}30` }}>
                            「{recentChapters[0].content.slice(0, 100)}...」
                          </div>
                        )}

                        {/* 操作按钮 */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                          <Link
                            href={`/audiobook/${project.id}`}
                            style={{
                              flex: 1, padding: '9px 0', background: C.pri, color: '#fff', borderRadius: 8,
                              fontSize: 12, fontWeight: 500, textAlign: 'center', textDecoration: 'none',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                            }}
                          >
                            🎧 进入有声书
                          </Link>
                          <Link
                            href={`/editor/${project.id}`}
                            style={{
                              padding: '9px 14px', background: 'rgba(26,24,20,.04)', borderRadius: 8,
                              fontSize: 12, color: C.muted, textDecoration: 'none',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                            title="编辑章节"
                          >
                            ✏️
                          </Link>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : project.id)}
                            style={{
                              padding: '9px 14px', background: 'rgba(26,24,20,.04)', borderRadius: 8,
                              fontSize: 12, color: C.muted, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                            }}
                            title="展开全部章节"
                          >
                            {isExpanded ? '▲' : '▼'}
                          </button>
                        </div>

                        {/* 展开全部章节 */}
                        {isExpanded && project.chapters.length > 3 && (
                          <div style={{ marginTop: 12, padding: '10px', background: 'rgba(26,24,20,.02)', borderRadius: 8 }}>
                            {project.chapters.slice(3).map(ch => (
                              <div key={ch.id} style={{ fontSize: 11, color: C.ink, padding: '4px 8px', marginBottom: 2, display: 'flex', justifyContent: 'space-between' }}>
                                <span>{ch.title}</span>
                                <span style={{ color: C.muted }}>{(ch.wordCount || 0).toLocaleString()} 字</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ═══ 导入有声书弹窗 ═══ */}
      {showImport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowImport(false)}>
          <div style={{ width: '100%', maxWidth: 520, background: C.card, borderRadius: 12, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,.12)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: C.ink, margin: 0 }}>📥 导入有声书</h2>
              <button onClick={() => setShowImport(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.muted }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* 选择作品 */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.ink, marginBottom: 6 }}>选择目标作品</label>
                <select
                  value={importTarget}
                  onChange={e => setImportTarget(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13, color: C.ink, background: C.card, fontFamily: 'inherit', boxSizing: 'border-box' }}
                >
                  <option value="">请选择作品...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.genre})</option>)}
                </select>
              </div>

              {/* 上传文件 */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.ink, marginBottom: 6 }}>选择音频文件</label>
                <div
                  style={{
                    padding: 32, border: `2px dashed ${importFiles ? C.pri : C.line}`, borderRadius: 8,
                    textAlign: 'center', cursor: 'pointer', background: importFiles ? 'rgba(196,149,106,.04)' : 'transparent',
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🎵</div>
                  {importFiles ? (
                    <p style={{ fontSize: 12, color: C.ink, margin: 0 }}>已选择 {importFiles.length} 个文件</p>
                  ) : (
                    <>
                      <p style={{ fontSize: 12, color: C.ink, margin: '0 0 4px' }}>点击或拖拽上传音频文件</p>
                      <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>支持 MP3 / WAV / M4A，可多选</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    multiple
                    onChange={e => setImportFiles(e.target.files)}
                    style={{ display: 'none' }}
                  />
                </div>
                {importFiles && (
                  <div style={{ marginTop: 8 }}>
                    {Array.from(importFiles).map((f, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '4px 0', color: C.muted }}>
                        <span>{f.name}</span>
                        <span>{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 说明 */}
              <div style={{ padding: 12, background: 'rgba(58,82,121,.06)', borderRadius: 8, fontSize: 11, color: C.indigo, lineHeight: 1.6 }}>
                <strong>导入说明：</strong>
                <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                  <li>每个音频文件将创建一个新章节</li>
                  <li>文件名将作为章节标题（可后期修改）</li>
                  <li>支持 MP3 / WAV / M4A 格式</li>
                  <li>音频数据将存储在本地浏览器中</li>
                </ul>
              </div>

              {/* 按钮 */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowImport(false)} style={{ padding: '9px 20px', background: 'none', border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13, color: C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
                  取消
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importFiles || !importTarget || importLoading}
                  style={{
                    padding: '9px 20px', background: !importFiles || !importTarget ? '#ccc' : C.pri,
                    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#fff',
                    cursor: !importFiles || !importTarget ? 'default' : 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {importLoading ? '⏳ 导入中...' : '📥 开始导入'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
