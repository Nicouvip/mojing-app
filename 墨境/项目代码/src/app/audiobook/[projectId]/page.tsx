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
  { id: 'Mia', name: 'Mia', gender: 'female', desc: 'English Female', icon: '🎤' },
  { id: 'Chloe', name: 'Chloe', gender: 'female', desc: 'English Gentle', icon: '🗣️' },
  { id: 'Milo', name: 'Milo', gender: 'male', desc: 'English Male', icon: '🎤' },
  { id: 'Dean', name: 'Dean', gender: 'male', desc: 'English Deep', icon: '🗣️' },
] as const

const EMOTIONS = ['平静', '开心', '悲伤', '愤怒', '温柔', '严肃', '恐惧', '惊讶', '冷漠']

/* ── 字幕行类型 ── */
interface SubtitleLine {
  text: string
  startSec: number
  endSec: number
}

export default function AudiobookProjectPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  /* ── 项目数据 ── */
  const [project, setProject] = useState<Project | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])

  /* ── 选择 & 设置 ── */
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set())
  const [defaultVoice, setDefaultVoice] = useState('冰糖')
  const [defaultEmotion, setDefaultEmotion] = useState('平静')
  const [activeTab, setActiveTab] = useState<'chapters' | 'voices' | 'settings'>('chapters')

  /* ── 生成状态 ── */
  const [generating, setGenerating] = useState(false)
  const [generateProgress, setGenerateProgress] = useState({ current: 0, total: 0, currentChapter: '' })
  const [generatedChapters, setGeneratedChapters] = useState<Map<string, { audioBase64: string; duration: number; subtitles: SubtitleLine[] }>>(new Map())

  /* ── 播放器 ── */
  const [playingChapterId, setPlayingChapterId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioUrlRef = useRef<string | null>(null)

  /* ── VoiceDesign 弹窗 ── */
  const [showDesign, setShowDesign] = useState(false)
  const [designDesc, setDesignDesc] = useState('')
  const [designText, setDesignText] = useState('你好，这是音色预览。')
  const [designLoading, setDesignLoading] = useState(false)
  const [designedVoices, setDesignedVoices] = useState<Array<{ id: string; name: string; desc: string; audioBase64: string }>>([])

  /* ── VoiceClone 弹窗 ── */
  const [showClone, setShowClone] = useState(false)
  const [cloneSample, setCloneSample] = useState<File | null>(null)
  const [cloneName, setCloneName] = useState('')
  const [cloneLoading, setCloneLoading] = useState(false)
  const [clonedVoices, setClonedVoices] = useState<Array<{ id: string; name: string; sampleName: string; audioBase64: string }>>([])

  /* ── 加载项目 ── */
  useEffect(() => {
    if (!projectId || projectId === 'demo-1') {
      setProject({ id: 'demo-1', name: '未命名作品', genre: '都市', description: '', createdAt: Date.now(), updatedAt: Date.now(), chapterCount: 3, totalWords: 9000 })
      setChapters([
        { id: 'ch-1', projectId: 'demo-1', title: '第一章 楔子', content: '她没敲门。门虚掩着。推开时带进一阵走廊的风，桌上的纸被掀起一角，又落回去。', order: 1, wordCount: 3000, createdAt: Date.now(), updatedAt: Date.now(), status: 'draft' },
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

  /* ── 音频时间更新 ── */
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => setCurrentTime(audio.currentTime)
    const onDur = () => setDuration(audio.duration || 0)
    const onEnd = () => { setIsPlaying(false); setPlayingChapterId(null) }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onDur)
    audio.addEventListener('ended', onEnd)
    return () => { audio.removeEventListener('timeupdate', onTime); audio.removeEventListener('loadedmetadata', onDur); audio.removeEventListener('ended', onEnd) }
  }, [])

  /* ── 章节选择 ── */
  const toggleChapter = (id: string) => {
    setSelectedChapters(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }
  const selectAll = () => {
    if (selectedChapters.size === chapters.length) setSelectedChapters(new Set())
    else setSelectedChapters(new Set(chapters.map(c => c.id)))
  }

  /* ── 试听音色 ── */
  const handlePreviewVoice = async (voiceId: string) => {
    try {
      const res = await fetch('/api/audiobook/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: '你好，这是音色试听。很高兴为你服务。', voice: voiceId }),
      })
      const data = await res.json()
      if (data.success && data.audio) {
        playBase64Audio(data.audio, 'audio/wav')
      }
    } catch (err) {
      alert('试听失败：' + (err instanceof Error ? err.message : String(err)))
    }
  }

  /* ── 播放 Base64 音频 ── */
  const playBase64Audio = (base64: string, mime: string) => {
    const bin = atob(base64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const blob = new Blob([bytes], { type: mime })
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    const url = URL.createObjectURL(blob)
    audioUrlRef.current = url
    if (audioRef.current) {
      audioRef.current.src = url
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  /* ── 生成章节（支持进度 + ASR 字幕） ── */
  const handleGenerate = async () => {
    if (selectedChapters.size === 0) { alert('请先选择要生成的章节'); return }
    setGenerating(true)
    const total = selectedChapters.size
    let current = 0
    const newGenerated = new Map(generatedChapters)

    for (const chapterId of selectedChapters) {
      const chapter = chapters.find(c => c.id === chapterId)
      if (!chapter) continue
      setGenerateProgress({ current, total, currentChapter: chapter.title })

      try {
        const text = chapter.content || chapter.title
        const res = await fetch('/api/audiobook/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice: defaultVoice, emotion: defaultEmotion !== '平静' ? defaultEmotion : undefined }),
        })
        const data = await res.json()

        if (data.success && data.audio) {
          /* ASR 字幕 */
          let subtitles: SubtitleLine[] = []
          try {
            const asrRes = await fetch('/api/audiobook/asr/timestamp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioBase64: data.audio, mimeType: 'audio/wav' }),
            })
            const asrData = await asrRes.json()
            if (asrData.success && asrData.timestamps?.length > 0) {
              subtitles = asrData.timestamps.map((t: { start: number; end: number; text: string }) => ({
                text: t.text, startSec: t.start, endSec: t.end,
              }))
            }
          } catch { /* ASR 可选，失败不阻断 */ }

          /* 如果 ASR 没返回时间戳，按句号分割模拟 */
          if (subtitles.length === 0) {
            const sentences = text.split(/[。！？\n]/).filter(s => s.trim())
            const estDuration = data.duration || 3
            const perSentence = estDuration / Math.max(sentences.length, 1)
            subtitles = sentences.map((s, i) => ({
              text: s.trim(), startSec: i * perSentence, endSec: (i + 1) * perSentence,
            }))
          }

          newGenerated.set(chapterId, { audioBase64: data.audio, duration: data.duration, subtitles })
        }
      } catch (err) {
        console.error(`Generate failed for ${chapterId}:`, err)
      }
      current++
    }

    setGeneratedChapters(newGenerated)
    setGenerating(false)
    setGenerateProgress({ current: 0, total: 0, currentChapter: '' })
    setSelectedChapters(new Set())
  }

  /* ── 播放章节 ── */
  const handlePlay = (chapterId: string) => {
    if (playingChapterId === chapterId && isPlaying) {
      audioRef.current?.pause()
      setIsPlaying(false)
      return
    }
    const gen = generatedChapters.get(chapterId)
    if (!gen) {
      alert('请先生成该章节的音频')
      return
    }
    setPlayingChapterId(chapterId)
    playBase64Audio(gen.audioBase64, 'audio/wav')
  }

  /* ── 下载音频 ── */
  const handleDownload = (chapterId: string) => {
    const gen = generatedChapters.get(chapterId)
    if (!gen) return
    const chapter = chapters.find(c => c.id === chapterId)
    const bin = atob(gen.audioBase64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const blob = new Blob([bytes], { type: 'audio/wav' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${chapter?.title || chapterId}.wav`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ── 下载字幕 ── */
  const handleDownloadSubtitle = (chapterId: string) => {
    const gen = generatedChapters.get(chapterId)
    if (!gen || gen.subtitles.length === 0) return
    const chapter = chapters.find(c => c.id === chapterId)
    const lrc = gen.subtitles.map(s => {
      const m = Math.floor(s.startSec / 60)
      const sec = Math.floor(s.startSec % 60)
      const ms = Math.floor((s.startSec % 1) * 100)
      return `[${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms).padStart(2, '0')}]${s.text}`
    }).join('\n')
    const blob = new Blob([lrc], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${chapter?.title || chapterId}.lrc`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ── VoiceDesign 生成 ── */
  const handleDesignVoice = async () => {
    if (!designDesc.trim()) { alert('请输入音色描述'); return }
    setDesignLoading(true)
    try {
      const res = await fetch('/api/audiobook/voices/design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: designDesc, text: designText }),
      })
      const data = await res.json()
      if (data.success && data.audio) {
        const id = `design-${Date.now()}`
        setDesignedVoices(prev => [...prev, { id, name: designDesc.slice(0, 20), desc: designDesc, audioBase64: data.audio }])
        playBase64Audio(data.audio, 'audio/wav')
      } else {
        alert('设计失败：' + (data.error || '未知错误'))
      }
    } catch (err) {
      alert('设计失败：' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setDesignLoading(false)
    }
  }

  /* ── VoiceClone 克隆 ── */
  const handleCloneVoice = async () => {
    if (!cloneSample) { alert('请选择样本音频'); return }
    if (!cloneName.trim()) { alert('请输入名称'); return }
    setCloneLoading(true)
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1]
        const mime = cloneSample.type || 'audio/mpeg'
        const res = await fetch('/api/audiobook/voices/clone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sampleBase64: `data:${mime};base64,${base64}`, sampleMimeType: mime, text: '你好，这是克隆声音的测试。' }),
        })
        const data = await res.json()
        if (data.success && data.audio) {
          const id = `clone-${Date.now()}`
          setClonedVoices(prev => [...prev, { id, name: cloneName, sampleName: cloneSample!.name, audioBase64: data.audio }])
          playBase64Audio(data.audio, 'audio/wav')
        } else {
          alert('克隆失败：' + (data.error || '未知错误'))
        }
        setCloneLoading(false)
      }
      reader.readAsDataURL(cloneSample)
    } catch (err) {
      alert('克隆失败：' + (err instanceof Error ? err.message : String(err)))
      setCloneLoading(false)
    }
  }

  /* ── 字幕同步：找到当前时间对应的行 ── */
  const getCurrentSubtitleIndex = (chapterId: string): number => {
    const gen = generatedChapters.get(chapterId)
    if (!gen) return -1
    return gen.subtitles.findIndex(s => currentTime >= s.startSec && currentTime < s.endSec)
  }

  /* ── 所有可用音色 ── */
  const allVoices = [
    ...PRESET_VOICES.map(v => ({ id: v.id, name: v.name, desc: v.desc, source: 'preset' })),
    ...designedVoices.map(v => ({ id: v.id, name: v.name, desc: v.desc, source: 'designed' })),
    ...clonedVoices.map(v => ({ id: v.id, name: v.name, desc: `克隆自 ${v.sampleName}`, source: 'cloned' })),
  ]

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

  const totalDuration = Array.from(generatedChapters.values()).reduce((s, g) => s + g.duration, 0)

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
              {generatedChapters.size > 0 && (
                <span style={{ fontSize: 11, color: C.green, padding: '2px 8px', background: 'rgba(122,158,122,.12)', borderRadius: 10 }}>
                  ✓ {generatedChapters.size} 章已生成 · {Math.floor(totalDuration / 60)}:{String(Math.floor(totalDuration % 60)).padStart(2, '0')}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={handleGenerate}
                disabled={generating || selectedChapters.size === 0}
                style={{
                  padding: '7px 18px',
                  background: generating ? '#ccc' : C.pri,
                  color: '#fff', border: 'none', borderRadius: 20, fontSize: 12, fontWeight: 500,
                  cursor: generating ? 'default' : 'pointer', fontFamily: 'inherit',
                  opacity: selectedChapters.size === 0 && !generating ? 0.5 : 1,
                }}
              >
                {generating ? `⏳ ${generateProgress.current}/${generateProgress.total}` : `🎵 生成 (${selectedChapters.size})`}
              </button>
            </div>
          </header>

          {/* ── 生成进度条 ── */}
          {generating && (
            <div style={{ padding: '8px 28px', background: 'rgba(196,149,106,.06)', borderBottom: `1px solid ${C.line}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted, marginBottom: 4 }}>
                <span>正在生成：{generateProgress.currentChapter}</span>
                <span>{generateProgress.current}/{generateProgress.total}</span>
              </div>
              <div style={{ height: 4, background: C.line, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(generateProgress.current / Math.max(generateProgress.total, 1)) * 100}%`, background: C.pri, borderRadius: 2, transition: 'width .3s' }} />
              </div>
            </div>
          )}

          {/* ── Tab 切换 ── */}
          <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.line}`, padding: '0 28px', flexShrink: 0 }}>
            {([
              { key: 'chapters' as const, label: '章节管理', icon: '📖' },
              { key: 'voices' as const, label: '音色管理', icon: '🎤' },
              { key: 'settings' as const, label: '生成设置', icon: '⚙️' },
            ]).map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                padding: '10px 16px', fontSize: 12, fontWeight: activeTab === tab.key ? 600 : 400,
                color: activeTab === tab.key ? C.pri : C.muted, background: 'none', border: 'none',
                borderBottom: activeTab === tab.key ? `2px solid ${C.pri}` : '2px solid transparent',
                cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span>{tab.icon}</span>{tab.label}
              </button>
            ))}
          </div>

          {/* ── 内容 ── */}
          <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px', paddingBottom: playingChapterId ? 80 : 20 }}>

            {/* ═══ 章节管理 ═══ */}
            {activeTab === 'chapters' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>勾选章节 → 选择音色 → 点击「生成」→ 播放/下载</p>
                  <button onClick={selectAll} style={{ fontSize: 11, color: C.pri, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {selectedChapters.size === chapters.length ? '取消全选' : '全选'}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {chapters.map(ch => {
                    const isSelected = selectedChapters.has(ch.id)
                    const gen = generatedChapters.get(ch.id)
                    const isPlayingThis = playingChapterId === ch.id && isPlaying
                    const subIdx = isPlayingThis ? getCurrentSubtitleIndex(ch.id) : -1

                    return (
                      <div key={ch.id} style={{
                        padding: '14px 16px', background: C.card,
                        border: `1px solid ${isSelected ? C.pri : isPlayingThis ? C.pri : C.line}`,
                        borderRadius: C.radius, transition: 'all .12s',
                        borderLeftWidth: isPlayingThis ? 3 : 1,
                      }}>
                        {/* 标题行 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => toggleChapter(ch.id)}>
                          <input type="checkbox" checked={isSelected} onChange={() => toggleChapter(ch.id)} onClick={e => e.stopPropagation()} style={{ accentColor: C.pri, width: 16, height: 16, cursor: 'pointer' }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: C.ink }}>{ch.title}</div>
                            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{(ch.wordCount || 0).toLocaleString()} 字{gen ? ` · ${Math.floor(gen.duration)}秒` : ''}</div>
                          </div>

                          {gen && (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={(e) => { e.stopPropagation(); handlePlay(ch.id) }} style={{ width: 28, height: 28, borderRadius: '50%', background: isPlayingThis ? 'rgba(196,149,106,.15)' : 'rgba(26,24,20,.04)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }} title={isPlayingThis ? '暂停' : '播放'}>
                                {isPlayingThis ? '⏸' : '▶'}
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleDownload(ch.id) }} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(26,24,20,.04)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }} title="下载音频">📥</button>
                              <button onClick={(e) => { e.stopPropagation(); handleDownloadSubtitle(ch.id) }} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(26,24,20,.04)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }} title="下载字幕">📝</button>
                            </div>
                          )}

                          {gen && <span style={{ fontSize: 10, padding: '2px 8px', background: 'rgba(122,158,122,.12)', color: C.green, borderRadius: 10, flexShrink: 0 }}>✓</span>}
                        </div>

                        {/* 字幕同步显示 */}
                        {isPlayingThis && gen && gen.subtitles.length > 0 && (
                          <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(196,149,106,.04)', borderRadius: 6, maxHeight: 120, overflow: 'auto' }}>
                            {gen.subtitles.map((sub, i) => (
                              <p key={i} style={{
                                margin: '0 0 4px', fontSize: 12, lineHeight: '1.6',
                                color: i === subIdx ? C.pri : C.muted,
                                fontWeight: i === subIdx ? 600 : 400,
                                transition: 'all .2s',
                              }}>
                                {sub.text}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ═══ 音色管理 ═══ */}
            {activeTab === 'voices' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>选择默认音色，或设计/克隆自定义音色</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setShowDesign(true)} style={{ padding: '6px 14px', background: C.card, border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 12, color: C.ink, cursor: 'pointer', fontFamily: 'inherit' }}>✨ 设计音色</button>
                    <button onClick={() => setShowClone(true)} style={{ padding: '6px 14px', background: C.pri, border: 'none', borderRadius: 6, fontSize: 12, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>🎤 克隆声音</button>
                  </div>
                </div>

                {/* 预置音色 */}
                <h3 style={{ fontSize: 12, fontWeight: 600, color: C.ink, margin: '0 0 10px' }}>预置音色</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 20 }}>
                  {PRESET_VOICES.map(v => (
                    <div key={v.id} onClick={() => setDefaultVoice(v.id)} style={{ padding: 12, background: C.card, border: `2px solid ${defaultVoice === v.id ? C.pri : C.line}`, borderRadius: C.radius, cursor: 'pointer', transition: 'all .12s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 18 }}>{v.icon}</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>{v.name}</div>
                          <div style={{ fontSize: 10, color: C.muted }}>{v.desc}</div>
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handlePreviewVoice(v.id) }} style={{ width: '100%', padding: '4px 0', background: defaultVoice === v.id ? 'rgba(196,149,106,.12)' : 'rgba(26,24,20,.04)', border: 'none', borderRadius: 4, fontSize: 11, color: defaultVoice === v.id ? C.pri : C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>▶ 试听</button>
                    </div>
                  ))}
                </div>

                {/* 自定义音色 */}
                {designedVoices.length + clonedVoices.length > 0 && (
                  <>
                    <h3 style={{ fontSize: 12, fontWeight: 600, color: C.ink, margin: '0 0 10px' }}>我的自定义音色</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                      {[...designedVoices, ...clonedVoices.map(v => ({ id: v.id, name: v.name, desc: v.sampleName, audioBase64: v.audioBase64 }))].map(v => (
                        <div key={v.id} onClick={() => setDefaultVoice(v.id)} style={{ padding: 12, background: C.card, border: `2px solid ${defaultVoice === v.id ? C.pri : C.line}`, borderRadius: C.radius, cursor: 'pointer', transition: 'all .12s' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 4 }}>{v.name}</div>
                          <div style={{ fontSize: 10, color: C.muted, marginBottom: 8 }}>{v.desc}</div>
                          <button onClick={(e) => { e.stopPropagation(); playBase64Audio((v as { audioBase64: string }).audioBase64, 'audio/wav') }} style={{ width: '100%', padding: '4px 0', background: 'rgba(196,149,106,.12)', border: 'none', borderRadius: 4, fontSize: 11, color: C.pri, cursor: 'pointer', fontFamily: 'inherit' }}>▶ 试听</button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ═══ 生成设置 ═══ */}
            {activeTab === 'settings' && (
              <div style={{ maxWidth: 400 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.ink, marginBottom: 6 }}>默认旁白音色</label>
                    <select value={defaultVoice} onChange={e => setDefaultVoice(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 13, color: C.ink, background: C.card, fontFamily: 'inherit' }}>
                      {allVoices.map(v => <option key={v.id} value={v.id}>{v.name} — {v.desc}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.ink, marginBottom: 6 }}>默认情绪</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {EMOTIONS.map(em => (
                        <button key={em} onClick={() => setDefaultEmotion(em)} style={{ padding: '5px 12px', borderRadius: 14, fontSize: 12, border: `1px solid ${defaultEmotion === em ? C.pri : C.line}`, background: defaultEmotion === em ? 'rgba(196,149,106,.12)' : C.card, color: defaultEmotion === em ? C.pri : C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>{em}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.ink, marginBottom: 6 }}>导出格式</label>
                    <select defaultValue="wav" style={{ width: '100%', padding: '8px 12px', border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 13, color: C.ink, background: C.card, fontFamily: 'inherit' }}>
                      <option value="wav">WAV（无损）</option>
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
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 64, background: C.card, borderTop: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', padding: '0 28px', gap: 16, zIndex: 100, boxShadow: '0 -2px 12px rgba(0,0,0,.04)' }}>
          <button onClick={() => handlePlay(playingChapterId)} style={{ width: 36, height: 36, borderRadius: '50%', background: C.pri, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#fff', flexShrink: 0 }}>
            {isPlaying ? '⏸' : '▶'}
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.ink }}>{chapters.find(c => c.id === playingChapterId)?.title || ''}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <span style={{ fontSize: 10, color: C.muted }}>{Math.floor(currentTime)}s / {Math.floor(duration)}s</span>
              <div style={{ flex: 1, height: 3, background: C.line, borderRadius: 2, cursor: 'pointer' }} onClick={(e) => {
                if (!audioRef.current) return
                const rect = e.currentTarget.getBoundingClientRect()
                const ratio = (e.clientX - rect.left) / rect.width
                audioRef.current.currentTime = ratio * duration
              }}>
                <div style={{ height: '100%', width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`, background: C.pri, borderRadius: 2, transition: 'width .1s' }} />
              </div>
              <span style={{ fontSize: 10, color: C.muted }}>{defaultVoice}</span>
            </div>
          </div>
          <button onClick={() => { audioRef.current?.pause(); setPlayingChapterId(null); setIsPlaying(false) }} style={{ padding: '6px 12px', background: 'none', border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 11, color: C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>关闭</button>
        </div>
      )}

      <audio ref={audioRef} />

      {/* ═══ VoiceDesign 弹窗 ═══ */}
      {showDesign && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowDesign(false)}>
          <div style={{ width: '100%', maxWidth: 460, background: C.card, borderRadius: 12, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,.12)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: C.ink, margin: 0 }}>✨ 设计新音色</h2>
              <button onClick={() => setShowDesign(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: C.muted }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.ink, marginBottom: 4 }}>音色描述（1-4句）</label>
                <textarea value={designDesc} onChange={e => setDesignDesc(e.target.value)} placeholder="例：年轻女性，声音清亮，充满活力，适合旁白" style={{ width: '100%', padding: '8px 12px', border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 13, color: C.ink, fontFamily: 'inherit', minHeight: 80, resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.ink, marginBottom: 4 }}>预览文本</label>
                <input value={designText} onChange={e => setDesignText(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 13, color: C.ink, fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <button onClick={handleDesignVoice} disabled={designLoading} style={{ padding: '10px 0', background: C.pri, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, color: '#fff', cursor: designLoading ? 'default' : 'pointer', fontFamily: 'inherit', opacity: designLoading ? 0.6 : 1 }}>
                {designLoading ? '⏳ 生成中...' : '🎵 生成并试听'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ VoiceClone 弹窗 ═══ */}
      {showClone && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowClone(false)}>
          <div style={{ width: '100%', maxWidth: 460, background: C.card, borderRadius: 12, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,.12)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: C.ink, margin: 0 }}>🎤 克隆声音</h2>
              <button onClick={() => setShowClone(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: C.muted }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: 20, border: `2px dashed ${C.line}`, borderRadius: 8, textAlign: 'center' }}>
                <p style={{ fontSize: 12, color: C.muted, margin: '0 0 8px' }}>上传样本音频（MP3/WAV，10秒-1分钟）</p>
                <input type="file" accept="audio/*" onChange={e => setCloneSample(e.target.files?.[0] || null)} style={{ fontSize: 12 }} />
                {cloneSample && <p style={{ fontSize: 11, color: C.green, margin: '8px 0 0' }}>✓ {cloneSample.name}</p>}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.ink, marginBottom: 4 }}>名称</label>
                <input value={cloneName} onChange={e => setCloneName(e.target.value)} placeholder="例：我的声音" style={{ width: '100%', padding: '8px 12px', border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 13, color: C.ink, fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <button onClick={handleCloneVoice} disabled={cloneLoading || !cloneSample} style={{ padding: '10px 0', background: C.pri, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, color: '#fff', cursor: cloneLoading ? 'default' : 'pointer', fontFamily: 'inherit', opacity: cloneLoading || !cloneSample ? 0.6 : 1 }}>
                {cloneLoading ? '⏳ 克隆中...' : '🎵 克隆并试听'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
