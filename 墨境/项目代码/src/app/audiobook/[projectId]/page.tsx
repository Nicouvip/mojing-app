'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/navbar'
import DeskSidebar from '@/components/desk-sidebar'
import { getProject, getChapters } from '@/lib/db/store'
import type { Project, Chapter } from '@/lib/db/types'

/* ── 设计令牌 ── */
const C = {
  pri: '#c4956a',
  priDim: '#b08050',
  ink: '#1a1814',
  muted: 'rgba(26,24,20,.45)',
  line: 'rgba(26,24,20,.06)',
  paper: '#f5f2ed',
  sb: '#f5f2ed',
  card: '#fff',
  indigo: '#3a5279',
  crimson: '#b5454a',
  green: '#7a9e7a',
  radius: 8,
} as const

/* ── 预置音色（MiMo V2.5） ── */
const PRESET_VOICES = [
  { id: '冰糖', name: '冰糖', gender: 'female', desc: '甜美女声·旁白', icon: '🎤' },
  { id: '茉莉', name: '茉莉', gender: 'female', desc: '温柔女声·对话', icon: '🗣️' },
  { id: '苏打', name: '苏打', gender: 'male', desc: '阳光男声·青年', icon: '🎤' },
  { id: '白桦', name: '白桦', gender: 'male', desc: '沉稳男声·中年', icon: '🗣️' },
] as const

const EMOTIONS = ['平静', '开心', '悲伤', '愤怒', '温柔', '严肃', '恐惧', '惊讶', '冷漠']

export default function AudiobookProjectPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const [project, setProject] = useState<Project | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set())
  const [defaultVoice, setDefaultVoice] = useState('冰糖')
  const [defaultEmotion, setDefaultEmotion] = useState('平静')
  const [generating, setGenerating] = useState(false)
  const [generatedChapters, setGeneratedChapters] = useState<Set<string>>(new Set())
  const [previewVoice, setPreviewVoice] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'chapters' | 'voices' | 'settings'>('chapters')

  // 播放器状态
  const [playingChapterId, setPlayingChapterId] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (!projectId || projectId === 'demo-1') {
      // demo-1 用默认数据
      setProject({ id: 'demo-1', name: '未命名作品', genre: '都市', description: '', createdAt: Date.now(), updatedAt: Date.now(), chapterCount: 3, totalWords: 9000 })
      setChapters([
        { id: 'ch-1', projectId: 'demo-1', title: '第一章 楔子', content: '她没敲门。门虚掩着。推开时带进一阵走廊的风。', order: 1, wordCount: 3000, createdAt: Date.now(), updatedAt: Date.now(), status: 'draft' },
        { id: 'ch-2', projectId: 'demo-1', title: '第二章 夜雨', content: '窗外的雨声突然变大了。他放下手中的笔，望向窗外。', order: 2, wordCount: 3000, createdAt: Date.now(), updatedAt: Date.now(), status: 'draft' },
        { id: 'ch-3', projectId: 'demo-1', title: '第三章 归途', content: '她站在门口，没有再往前走。空气里弥漫着旧书的味道。', order: 3, wordCount: 3000, createdAt: Date.now(), updatedAt: Date.now(), status: 'draft' },
      ])
      return
    }
    const p = getProject(projectId)
    if (p) {
      setProject(p)
      setChapters(getChapters(projectId))
    }
  }, [projectId])

  const toggleChapter = (id: string) => {
    setSelectedChapters(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selectedChapters.size === chapters.length) {
      setSelectedChapters(new Set())
    } else {
      setSelectedChapters(new Set(chapters.map(c => c.id)))
    }
  }

  /** 试听音色 */
  const handlePreviewVoice = async (voiceId: string) => {
    setPreviewVoice(voiceId)
    setPreviewLoading(true)
    try {
      const res = await fetch('/api/audiobook/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '你好，这是音色试听。很高兴为你服务。',
          voice: voiceId,
        }),
      })
      const data = await res.json()
      if (data.success && data.audio) {
        const bin = atob(data.audio)
        const bytes = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
        const blob = new Blob([bytes], { type: 'audio/wav' })
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audio.play()
        audio.onended = () => { URL.revokeObjectURL(url); setPreviewVoice(null) }
      }
    } catch (err) {
      console.error('Preview failed:', err)
      alert('试听失败：' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setPreviewLoading(false)
    }
  }

  /** 生成选定章节 */
  const handleGenerate = async () => {
    if (selectedChapters.size === 0) {
      alert('请先选择要生成的章节')
      return
    }
    setGenerating(true)
    const newGenerated = new Set(generatedChapters)

    for (const chapterId of selectedChapters) {
      const chapter = chapters.find(c => c.id === chapterId)
      if (!chapter) continue

      try {
        const text = chapter.content || chapter.title
        const res = await fetch('/api/audiobook/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voice: defaultVoice,
            emotion: defaultEmotion !== '平静' ? defaultEmotion : undefined,
          }),
        })
        const data = await res.json()
        if (data.success) {
          newGenerated.add(chapterId)
        }
      } catch (err) {
        console.error(`Generate failed for ${chapterId}:`, err)
      }
    }

    setGeneratedChapters(newGenerated)
    setGenerating(false)
    setSelectedChapters(new Set())
  }

  /** 播放章节音频 */
  const handlePlay = async (chapterId: string) => {
    if (playingChapterId === chapterId && isPlaying) {
      audioRef.current?.pause()
      setIsPlaying(false)
      return
    }

    const chapter = chapters.find(c => c.id === chapterId)
    if (!chapter) return

    setPlayingChapterId(chapterId)
    setIsPlaying(true)

    try {
      const text = chapter.content || chapter.title
      const res = await fetch('/api/audiobook/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: defaultVoice, emotion: defaultEmotion !== '平静' ? defaultEmotion : undefined }),
      })
      const data = await res.json()
      if (data.success && data.audio) {
        const bin = atob(data.audio)
        const bytes = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
        const blob = new Blob([bytes], { type: 'audio/wav' })
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)

        if (audioRef.current) {
          audioRef.current.src = url
          audioRef.current.play()
        }
      }
    } catch (err) {
      console.error('Play failed:', err)
      setIsPlaying(false)
    }
  }

  if (!project) {
    return (
      <div style={{ minHeight: '100vh', background: C.paper }}>
        <Navbar />
        <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
          <DeskSidebar active="/audiobook" />
          <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: C.muted }}>加载中...</p>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: C.paper }}>
      <Navbar />
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
        <DeskSidebar active="/audiobook" />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          {/* ── 顶栏 ── */}
          <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', height: 56, borderBottom: `1px solid ${C.line}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Link href="/audiobook" style={{ fontSize: 12, color: C.muted, textDecoration: 'none' }}>← 返回</Link>
              <span style={{ color: C.line }}>|</span>
              <span style={{ fontSize: 20 }}>🎧</span>
              <h1 style={{ fontSize: 15, fontWeight: 600, color: C.ink, margin: 0 }}>{project.name} · 有声书</h1>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: C.muted }}>{chapters.length} 章 · {generatedChapters.size} 已生成</span>
              <button
                onClick={handleGenerate}
                disabled={generating || selectedChapters.size === 0}
                style={{
                  padding: '7px 18px',
                  background: generating ? '#ccc' : C.pri,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: generating ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                  opacity: selectedChapters.size === 0 && !generating ? 0.5 : 1,
                }}
              >
                {generating ? '⏳ 生成中...' : `🎵 生成选中 (${selectedChapters.size})`}
              </button>
            </div>
          </header>

          {/* ── Tab 切换 ── */}
          <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.line}`, padding: '0 28px', flexShrink: 0 }}>
            {[
              { key: 'chapters' as const, label: '章节管理', icon: '📖' },
              { key: 'voices' as const, label: '音色选择', icon: '🎤' },
              { key: 'settings' as const, label: '生成设置', icon: '⚙️' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '10px 16px',
                  fontSize: 12,
                  fontWeight: activeTab === tab.key ? 600 : 400,
                  color: activeTab === tab.key ? C.pri : C.muted,
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab.key ? `2px solid ${C.pri}` : '2px solid transparent',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── 内容 ── */}
          <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px' }}>

            {/* ═══ 章节管理 ═══ */}
            {activeTab === 'chapters' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
                    勾选章节 → 选择音色 → 点击「生成」
                  </p>
                  <button onClick={selectAll} style={{ fontSize: 11, color: C.pri, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {selectedChapters.size === chapters.length ? '取消全选' : '全选'}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {chapters.map(ch => {
                    const isSelected = selectedChapters.has(ch.id)
                    const isGenerated = generatedChapters.has(ch.id)
                    const isPlayingThis = playingChapterId === ch.id && isPlaying

                    return (
                      <div
                        key={ch.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '14px 16px',
                          background: C.card,
                          border: `1px solid ${isSelected ? C.pri : C.line}`,
                          borderRadius: C.radius,
                          cursor: 'pointer',
                          transition: 'all .12s',
                        }}
                        onClick={() => toggleChapter(ch.id)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleChapter(ch.id)}
                          onClick={e => e.stopPropagation()}
                          style={{ accentColor: C.pri, width: 16, height: 16, cursor: 'pointer' }}
                        />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: C.ink }}>{ch.title}</div>
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                            {(ch.wordCount || 0).toLocaleString()} 字
                          </div>
                        </div>

                        {isGenerated && (
                          <span style={{ fontSize: 10, padding: '2px 8px', background: 'rgba(122,158,122,.12)', color: C.green, borderRadius: 10 }}>
                            ✓ 已生成
                          </span>
                        )}

                        <button
                          onClick={(e) => { e.stopPropagation(); handlePlay(ch.id) }}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: isPlayingThis ? 'rgba(196,149,106,.15)' : 'rgba(26,24,20,.04)',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                            flexShrink: 0,
                          }}
                          title={isPlayingThis ? '暂停' : '播放'}
                        >
                          {isPlayingThis ? '⏸' : '▶'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ═══ 音色选择 ═══ */}
            {activeTab === 'voices' && (
              <div>
                <p style={{ fontSize: 12, color: C.muted, margin: '0 0 16px' }}>
                  选择默认旁白音色，点击「试听」可以听到效果
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {PRESET_VOICES.map(v => {
                    const isSelected = defaultVoice === v.id
                    const isPreviewing = previewVoice === v.id
                    return (
                      <div
                        key={v.id}
                        onClick={() => setDefaultVoice(v.id)}
                        style={{
                          padding: 16,
                          background: C.card,
                          border: `2px solid ${isSelected ? C.pri : C.line}`,
                          borderRadius: C.radius,
                          cursor: 'pointer',
                          transition: 'all .12s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: v.gender === 'male' ? 'rgba(58,82,121,.1)' : 'rgba(181,69,74,.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 16,
                          }}>
                            {v.icon}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{v.name}</div>
                            <div style={{ fontSize: 11, color: C.muted }}>{v.desc}</div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePreviewVoice(v.id) }}
                          disabled={previewLoading && isPreviewing}
                          style={{
                            width: '100%',
                            padding: '6px 0',
                            background: isSelected ? 'rgba(196,149,106,.12)' : 'rgba(26,24,20,.04)',
                            border: 'none',
                            borderRadius: 4,
                            fontSize: 11,
                            color: isSelected ? C.pri : C.muted,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          {isPreviewing && previewLoading ? '⏳ 生成中...' : '▶ 试听'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ═══ 生成设置 ═══ */}
            {activeTab === 'settings' && (
              <div style={{ maxWidth: 400 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.ink, marginBottom: 6 }}>默认旁白音色</label>
                    <select
                      value={defaultVoice}
                      onChange={e => setDefaultVoice(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 13, color: C.ink, background: C.card, fontFamily: 'inherit' }}
                    >
                      {PRESET_VOICES.map(v => <option key={v.id} value={v.id}>{v.name} — {v.desc}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.ink, marginBottom: 6 }}>默认情绪</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {EMOTIONS.map(em => (
                        <button
                          key={em}
                          onClick={() => setDefaultEmotion(em)}
                          style={{
                            padding: '5px 12px',
                            borderRadius: 14,
                            fontSize: 12,
                            border: `1px solid ${defaultEmotion === em ? C.pri : C.line}`,
                            background: defaultEmotion === em ? 'rgba(196,149,106,.12)' : C.card,
                            color: defaultEmotion === em ? C.pri : C.muted,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.ink, marginBottom: 6 }}>对话间隔</label>
                    <select
                      defaultValue="500"
                      style={{ width: '100%', padding: '8px 12px', border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 13, color: C.ink, background: C.card, fontFamily: 'inherit' }}
                    >
                      <option value="300">0.3 秒（紧凑）</option>
                      <option value="500">0.5 秒（正常）</option>
                      <option value="800">0.8 秒（舒缓）</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.ink, marginBottom: 6 }}>导出格式</label>
                    <select
                      defaultValue="wav"
                      style={{ width: '100%', padding: '8px 12px', border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 13, color: C.ink, background: C.card, fontFamily: 'inherit' }}
                    >
                      <option value="wav">WAV（无损）</option>
                      <option value="pcm16">PCM16（原始）</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── 底部播放器 ── */}
      {playingChapterId && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: 64,
            background: C.card,
            borderTop: `1px solid ${C.line}`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 28px',
            gap: 16,
            zIndex: 100,
            boxShadow: '0 -2px 12px rgba(0,0,0,.04)',
          }}
        >
          <button
            onClick={() => handlePlay(playingChapterId)}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: C.pri,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.ink }}>
              {chapters.find(c => c.id === playingChapterId)?.title || ''}
            </div>
            <div style={{ fontSize: 11, color: C.muted }}>
              {defaultVoice} · {defaultEmotion}
            </div>
          </div>

          <button
            onClick={() => {
              audioRef.current?.pause()
              setPlayingChapterId(null)
              setIsPlaying(false)
              setAudioUrl(null)
            }}
            style={{
              padding: '6px 12px',
              background: 'none',
              border: `1px solid ${C.line}`,
              borderRadius: 6,
              fontSize: 11,
              color: C.muted,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            关闭
          </button>
        </div>
      )}

      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />
    </div>
  )
}
