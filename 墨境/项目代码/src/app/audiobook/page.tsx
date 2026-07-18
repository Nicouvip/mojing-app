'use client'
import { toast } from 'sonner'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/navbar'
import DeskSidebar from '@/components/desk-sidebar'
import { getProjects, getChapters, createChapter, createProject, updateChapterContent } from '@/lib/db/store'
import type { Project, Chapter } from '@/lib/db/types'
import { encodeWAV } from '@/lib/audiobook/audio-utils'
import { loadGeneratedChapters } from '@/lib/audiobook/audio-persistence'
import { ProjectCard } from '@/components/audiobook/project-card'
import { VoiceSelector } from '@/components/audiobook/voice-selector'
import { EmotionPicker } from '@/components/audiobook/emotion-picker'
import { Headphones, Search } from 'lucide-react'

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

/* ── 音色相关常量 ── */
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

const RECORDING_TEMPLATE = '春天的花开，秋天的月，夏天的风，冬天的雪。我在微风中轻轻吟唱，那是一首关于时光和记忆的歌。窗外的雨滴落在玻璃上，像是大自然写给大地的情书。'

interface ProjectWithChapters extends Project {
  chapters: Chapter[]
}

interface ParsedChapter {
  title: string
  content: string
  wordCount: number
}

export default function AudiobookPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectWithChapters[]>([])
  const [search, setSearch] = useState('')
  const [genreFilter, setGenreFilter] = useState('全部')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({})

  /* ── 导入状态 ── */
  const [showImport, setShowImport] = useState(false)
  const [importTarget, setImportTarget] = useState('')
  const [importSplitMode, setImportSplitMode] = useState<'auto' | 'manual' | 'none'>('auto')
  const [importText, setImportText] = useState('')
  const [importFileName, setImportFileName] = useState('')
  const [importNewName, setImportNewName] = useState('')
  const [importNewGenre, setImportNewGenre] = useState('都市')
  const [importParsed, setImportParsed] = useState<ParsedChapter[] | null>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'done'>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* ── 音色管理状态 ── */
  const [showVoicePanel, setShowVoicePanel] = useState(false)
  const [defaultVoice, setDefaultVoice] = useState('冰糖')
  const [defaultEmotion, setDefaultEmotion] = useState('平静')

  /* ── VoiceDesign 弹窗 ── */
  const [showDesign, setShowDesign] = useState(false)
  const [designDesc, setDesignDesc] = useState('')
  const [designText, setDesignText] = useState('你好，这是音色预览。')
  const [designLoading, setDesignLoading] = useState(false)
  const [designedVoices, setDesignedVoices] = useState<Array<{ id: string; name: string; desc: string; audioBase64: string }>>([])
  const [polishDescLoading, setPolishDescLoading] = useState(false)

  /* ── VoiceClone 弹窗 ── */
  const [showClone, setShowClone] = useState(false)
  const [cloneSample, setCloneSample] = useState<File | null>(null)
  const [cloneName, setCloneName] = useState('')
  const [cloneLoading, setCloneLoading] = useState(false)
  const [clonedVoices, setClonedVoices] = useState<Array<{ id: string; name: string; sampleName: string; audioBase64: string }>>([])

  /* ── 录音状态 ── */
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])

  useEffect(() => { if (!isRecording) { setRecordingTime(0); return }; const t = setInterval(() => setRecordingTime(s => s + 1), 1000); return () => clearInterval(t) }, [isRecording])

  /* ── 加载各项目音频生成进度 ── */
  useEffect(() => {
    if (projects.length === 0) return
    let cancelled = false
    ;(async () => {
      const map: Record<string, number> = {}
      await Promise.all(projects.map(async (p) => {
        try { const m = await loadGeneratedChapters(p.id); map[p.id] = m.size } catch { map[p.id] = 0 }
      }))
      if (!cancelled) setAudioProgress(map)
    })()
    return () => { cancelled = true }
  }, [projects])

  /* ── 播放音频 ── */
  const audioUrlRef = useRef<string | null>(null)
  const playBase64Audio = (base64: string, mime: string) => {
    const bin = atob(base64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const blob = new Blob([bytes], { type: mime })
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    const url = URL.createObjectURL(blob)
    audioUrlRef.current = url
    const audio = new Audio(url)
    audio.play()
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
      if (data.success && data.audio) playBase64Audio(data.audio, 'audio/wav')
    } catch (err) {
      toast.error('试听失败：' + (err instanceof Error ? err.message : String(err)))
    }
  }

  /* ── 录音 ── */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      recordedChunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const webmBlob = new Blob(recordedChunksRef.current, { type: 'audio/webm' })
        try {
          const arrayBuf = await webmBlob.arrayBuffer()
          const audioCtx = new AudioContext()
          const audioBuf = await audioCtx.decodeAudioData(arrayBuf)
          const wavBlob = encodeWAV(audioBuf)
          audioCtx.close()
          const file = new File([wavBlob], `录音-${new Date().toLocaleTimeString('zh-CN')}.wav`, { type: 'audio/wav' })
          setCloneSample(file)
        } catch {
          const file = new File([webmBlob], `录音-${new Date().toLocaleTimeString('zh-CN')}.webm`, { type: 'audio/webm' })
          setCloneSample(file)
          toast.error('wav转换失败，已保存为webm格式')
        }
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
    } catch {
      toast.error('无法访问麦克风，请检查浏览器权限设置')
    }
  }

  const stopRecording = () => { mediaRecorderRef.current?.stop(); setIsRecording(false) }

  /* ── 润色音色描述 ── */
  const handlePolishDesc = async () => {
    if (!designDesc.trim()) { toast.error('请先输入音色描述'); return }
    setPolishDescLoading(true)
    try {
      const res = await fetch('/api/audiobook/voices/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: designDesc }),
      })
      const data = await res.json()
      if (data.success && data.polished) {
        setDesignDesc(data.polished)
      } else {
        toast.error('润色失败：' + (data.error || '未知错误'))
      }
    } catch (err) {
      toast.error('润色失败：' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setPolishDescLoading(false)
    }
  }

  /* ── VoiceDesign 生成 ── */
  const handleDesignVoice = async () => {
    if (!designDesc.trim()) { toast.error('请输入音色描述'); return }
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
        toast.error('设计失败：' + (data.error || '未知错误'))
      }
    } catch (err) {
      toast.error('设计失败：' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setDesignLoading(false)
    }
  }

  /* ── VoiceClone 生成 ── */
  const handleCloneVoice = async () => {
    if (!cloneSample) { toast.error('请先上传或录制音频样本'); return }
    if (!cloneName.trim()) { toast.error('请输入音色名称'); return }
    setCloneLoading(true)
    try {
      const reader = new FileReader()
      reader.readAsDataURL(cloneSample)
      reader.onload = async () => {
        const sampleBase64 = reader.result as string
        try {
          const res = await fetch('/api/audiobook/voices/clone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sampleBase64,
              sampleMimeType: cloneSample.type,
              text: designText || '你好，这是克隆音色试听。',
              voice: sampleBase64, // 传 DataURL
            }),
          })
          const data = await res.json()
          if (data.success && data.audio) {
            const id = `clone-${Date.now()}`
            setClonedVoices(prev => [...prev, { id, name: cloneName.trim(), sampleName: cloneSample.name, audioBase64: data.audio }])
            playBase64Audio(data.audio, 'audio/wav')
          } else {
            toast.error('克隆失败：' + (data.error || '未知错误'))
          }
        } catch (err) {
          toast.error('克隆失败：' + (err instanceof Error ? err.message : String(err)))
        } finally {
          setCloneLoading(false)
        }
      }
    } catch (err) {
      toast.error('克隆失败：' + (err instanceof Error ? err.message : String(err)))
      setCloneLoading(false)
    }
  }

  const loadProjects = () => {
    const projs = getProjects().filter(p => !p.deletedAt).sort((a, b) => b.updatedAt - a.updatedAt)
    const withChapters = projs.map(p => ({
      ...p,
      chapters: getChapters(p.id).filter(c => !c.deletedAt).sort((a, b) => a.order - b.order),
    }))
    setProjects(withChapters)
  }

  useEffect(() => {
    loadProjects()
    // 页面可见时自动刷新数据（从别的页面改完内容切回来）
    const onVisible = () => { if (document.visibilityState === 'visible') loadProjects() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  const filtered = projects.filter(p => {
    if (genreFilter !== '全部' && p.genre !== genreFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!p.name.toLowerCase().includes(q) && !p.genre.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q)) return false
    }
    return true
  })

  /* ── 第一步：读取文件 + 发送到 API 预览分章 ── */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportFileName(file.name)
    const text = await file.text()
    setImportText(text)

    // 解析分章，但不自动跳步，等用户点确认后再跳
    try {
      const res = await fetch('/api/audiobook/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: 'preview', text, splitMode: importSplitMode }),
      })
      const data = await res.json()
      if (data.success) {
        setImportParsed(data.chapters)
      }
    } catch (err) {
      toast.error('解析失败：' + (err instanceof Error ? err.message : String(err)))
    }
  }

  /* ── 重新分章（切换分章模式） ── */
  const handleReparse = async () => {
    if (!importText) return
    try {
      const res = await fetch('/api/audiobook/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: 'preview', text: importText, splitMode: importSplitMode }),
      })
      const data = await res.json()
      if (data.success) setImportParsed(data.chapters)
    } catch (err) {
      console.error('Reparse failed:', err)
    }
  }

  useEffect(() => { handleReparse() }, [importSplitMode])

  /* ── 第二步：确认导入，把分章结果写入 store ── */
  const handleConfirmImport = () => {
    if (!importParsed) { toast.error('请先上传文本文件'); return }
    if (!importTarget) { toast.error('请选择目标作品'); return }
    setImportLoading(true)

    // 如果选择了「新建作品」，先创建作品
    let targetId = importTarget
    if (importTarget === '__new__') {
      if (!importNewName.trim()) { toast.error('请输入作品名称'); setImportLoading(false); return }
      const newProj = createProject(importNewName.trim(), importNewGenre)
      targetId = newProj.id
    }

    for (const ch of importParsed) {
      const created = createChapter(targetId, ch.title)
      if (created && ch.content) {
        updateChapterContent(created.id, ch.content)
      }
    }

    setImportLoading(false)
    setImportStep('done')
    setTimeout(() => {
      setShowImport(false)
      setImportStep('upload')
      setImportParsed(null)
      setImportText('')
      setImportFileName('')
      // 刷新项目列表
      const projs = getProjects().filter(p => !p.deletedAt).sort((a, b) => b.updatedAt - a.updatedAt)
      setProjects(projs.map(p => ({
        ...p,
        chapters: getChapters(p.id).filter(c => !c.deletedAt).sort((a, b) => a.order - b.order),
      })))
    }, 1500)
  }

  return (
    <div style={{ minHeight: '100vh', background: C.paper }}>
      <Navbar />
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
        <DeskSidebar active="/audiobook" />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

          {/* ── 顶栏 ── */}
          <header className="flex items-center justify-between px-7 h-14 border-b border-border shrink-0">
            <div className="flex items-center gap-2.5">
              <Headphones className="w-5 h-5 text-muted-foreground" />
              <h1 className="text-base font-semibold text-foreground m-0">有声书工坊</h1>
              <span className="text-[11px] text-muted-foreground px-2 py-0.5 bg-foreground/[0.04] rounded-full">{projects.length} 部作品</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-card border border-border rounded-full px-3.5 h-[34px]">
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索作品..." className="border-none bg-transparent outline-none text-xs text-foreground w-[180px]" />
              </div>
              <button onClick={() => setShowVoicePanel(v => !v)}
                className={`flex items-center gap-1.5 px-4 py-[7px] rounded-full text-xs cursor-pointer font-inherit transition-colors ${
                  showVoicePanel ? 'bg-primary text-white border border-primary' : 'bg-card border border-border text-foreground'
                }`}>🎛️ 音色管理</button>
              <button onClick={() => { setShowImport(true); setImportStep('upload'); setImportParsed(null); setImportText(''); setImportFileName('') }}
                className="flex items-center gap-1.5 px-4 py-[7px] bg-card border border-border rounded-full text-xs text-foreground cursor-pointer font-inherit">📥 导入小说文本</button>
            </div>
          </header>

          {/* ── 题材筛选 ── */}
          <div className="flex gap-1.5 px-7 py-3 border-b border-border shrink-0 overflow-x-auto">
            {GENRES.map(g => (
              <button key={g} onClick={() => setGenreFilter(g)}
                className={`px-3.5 py-1 rounded-[14px] text-xs border-none cursor-pointer font-inherit whitespace-nowrap ${
                  genreFilter === g ? 'bg-primary text-white' : 'bg-foreground/[0.04] text-muted-foreground'
                }`}>{g}</button>
            ))}
          </div>

          {/* ═══ 音色管理面板 ═══ */}
          {showVoicePanel && (
            <div className="px-7 py-4 border-b border-border bg-primary/[0.03]">
              <VoiceSelector
                defaultVoice={defaultVoice}
                onVoiceChange={setDefaultVoice}
                designedVoices={designedVoices}
                clonedVoices={clonedVoices.map(v => ({ id: v.id, name: v.name, desc: v.sampleName, audioBase64: v.audioBase64 }))}
                onPreview={handlePreviewVoice}
                onShowDesign={() => setShowDesign(true)}
                onShowClone={() => setShowClone(true)}
                onPlayCustom={(b64) => playBase64Audio(b64, 'audio/wav')}
              />
              <div className="mt-3">
                <EmotionPicker selected={defaultEmotion} onSelect={setDefaultEmotion} />
              </div>
            </div>
          )}

          {/* ── 作品列表 ── */}
          <div className="flex-1 overflow-auto px-7 py-5">
            {filtered.length === 0 ? (
              <div className="text-center py-20">
                <Headphones className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  {search || genreFilter !== '全部' ? '没有找到匹配的作品' : '还没有作品'}
                </p>
                <Link href="/desk" className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-primary text-white rounded-full text-[13px] font-medium no-underline hover:bg-primary/90 transition-colors">✏️ 去创作</Link>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
                {filtered.map((project, idx) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    idx={idx}
                    audioProgress={audioProgress[project.id] || 0}
                    isExpanded={expandedId === project.id}
                    onToggleExpand={() => setExpandedId(expandedId === project.id ? null : project.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ═══ 导入小说文本弹窗 ═══ */}
      {showImport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => { setShowImport(false); setImportStep('upload'); setImportParsed(null) }}>
          <div style={{ width: '100%', maxWidth: 580, maxHeight: '85vh', overflow: 'auto', background: C.card, borderRadius: 12, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,.12)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: C.ink, margin: 0 }}>📥 导入小说文本 → 生成有声书</h2>
              <button onClick={() => { setShowImport(false); setImportStep('upload'); setImportParsed(null) }} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.muted }}>×</button>
            </div>

            {/* Step 1: 上传 */}
            {importStep === 'upload' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.ink, marginBottom: 6 }}>选择目标作品</label>
                  <select value={importTarget} onChange={e => setImportTarget(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13, color: C.ink, background: C.card, fontFamily: 'inherit', boxSizing: 'border-box' }}>
                    <option value="">请选择作品...</option>
                    <option value="__new__">✨ 新建作品（直接导入）</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.genre})</option>)}
                  </select>
                  {importTarget === '__new__' && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <input value={importNewName} onChange={e => setImportNewName(e.target.value)} placeholder="作品名称" style={{ flex: 1, padding: '8px 12px', border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 13, color: C.ink, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                      <select value={importNewGenre} onChange={e => setImportNewGenre(e.target.value)} style={{ width: 100, padding: '8px 12px', border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 13, color: C.ink, fontFamily: 'inherit', boxSizing: 'border-box' }}>
                        <option>都市</option><option>玄幻</option><option>悬疑</option><option>科幻</option><option>历史</option><option>灵异</option><option>言情</option><option>竞技</option>
                      </select>
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.ink, marginBottom: 6 }}>分章模式</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { key: 'auto' as const, label: '🔍 智能分章', desc: '按"第X章"等标题自动分割' },
                      { key: 'manual' as const, label: '📐 按段落分', desc: '按空行分割成段落' },
                      { key: 'none' as const, label: '📄 不分章', desc: '整体作为一个章节' },
                    ].map(mode => (
                      <div key={mode.key} onClick={() => setImportSplitMode(mode.key)} style={{ flex: 1, padding: 10, border: `2px solid ${importSplitMode === mode.key ? C.pri : C.line}`, borderRadius: 8, cursor: 'pointer', textAlign: 'center', background: importSplitMode === mode.key ? 'rgba(196,149,106,.06)' : 'transparent' }}>
                        <div style={{ fontSize: 12, fontWeight: importSplitMode === mode.key ? 600 : 400, color: importSplitMode === mode.key ? C.pri : C.ink }}>{mode.label}</div>
                        <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{mode.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.ink, marginBottom: 6 }}>上传小说文本文件</label>
                  <div onClick={() => fileInputRef.current?.click()} style={{ padding: 36, border: `2px dashed ${importText ? C.pri : C.line}`, borderRadius: 8, textAlign: 'center', cursor: 'pointer', background: importText ? 'rgba(196,149,106,.04)' : 'transparent' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                    {importText ? (
                      <p style={{ fontSize: 12, color: C.ink, margin: 0 }}>✓ {importFileName} — {(importText.length / 1000).toFixed(1)} 千字</p>
                    ) : (
                      <>
                        <p style={{ fontSize: 12, color: C.ink, margin: '0 0 4px' }}>点击上传 TXT 文件</p>
                        <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>支持 .txt / .text / .md 格式</p>
                      </>
                    )}
                    <input ref={fileInputRef} type="file" accept=".txt,.text,.md,text/plain" onChange={handleFileSelect} style={{ display: 'none' }} />
                  </div>
                </div>
                <div style={{ padding: 12, background: 'rgba(58,82,121,.06)', borderRadius: 8, fontSize: 11, color: C.indigo, lineHeight: 1.6 }}>
                  <strong>导入说明：</strong>
                  <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                    <li>上传小说 TXT 文件，系统自动按章节标题分割</li>
                    <li>分割后的文本会存入作品的章节中</li>
                    <li>然后在作品详情页点击「生成」即可用 MiMo TTS 转为有声书</li>
                    <li>支持"第X章""Chapter X"等常见章节标题格式</li>
                  </ul>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => { setShowImport(false); setImportStep('upload'); setImportParsed(null) }} style={{ padding: '9px 20px', background: 'none', border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13, color: C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>取消</button>
                  <button onClick={() => { if (!importText) { toast.error('请先上传文本文件'); return }; if (!importTarget) { toast.error('请选择目标作品'); return }; handleConfirmImport() }} disabled={!importText || !importTarget || importLoading} style={{ padding: '9px 20px', background: !importText || !importTarget ? '#ccc' : C.pri, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#fff', cursor: !importText || !importTarget ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                    {importLoading ? '⏳ 导入中...' : '📥 确认导入'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: 预览分章结果 */}
            {importStep === 'preview' && importParsed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ padding: 12, background: 'rgba(122,158,122,.08)', borderRadius: 8, fontSize: 12, color: C.green }}>
                  ✓ 已解析出 <strong>{importParsed.length}</strong> 个章节，共 <strong>{importParsed.reduce((s, c) => s + (c.wordCount || 0), 0).toLocaleString()}</strong> 字
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflow: 'auto' }}>
                  {importParsed.map((ch, i) => (
                    <div key={i} style={{ padding: '8px 12px', background: 'rgba(26,24,20,.02)', borderRadius: 6, borderLeft: `3px solid ${C.pri}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 500, color: C.ink }}>
                        <span>{ch.title}</span>
                        <span style={{ color: C.muted, fontWeight: 400 }}>{(ch.wordCount || 0).toLocaleString()} 字</span>
                      </div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 4, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{ch.content.slice(0, 120)}...</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => setImportStep('upload')} style={{ padding: '9px 20px', background: 'none', border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13, color: C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>← 返回修改</button>
                  <button onClick={handleConfirmImport} disabled={importLoading} style={{ padding: '9px 20px', background: C.pri, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#fff', cursor: importLoading ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                    {importLoading ? '⏳ 导入中...' : '✓ 确认导入'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: 完成 */}
            {importStep === 'done' && (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <p style={{ fontSize: 15, fontWeight: 600, color: C.ink, margin: '0 0 8px' }}>导入成功！</p>
                <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>已将 {importParsed?.length || 0} 个章节写入作品</p>
                <p style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>接下来：进入作品 → 勾选章节 → 生成有声书</p>
              </div>
            )}
          </div>
        </div>
      )}

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
                <button onClick={handlePolishDesc} disabled={polishDescLoading} style={{ marginTop: 6, padding: '6px 16px', background: '#8e63ce', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, color: '#fff', cursor: polishDescLoading ? 'default' : 'pointer', fontFamily: 'inherit', opacity: polishDescLoading ? 0.6 : 1 }}>
                  {polishDescLoading ? '⏳ 润色中...' : '✨ 润色描述'}
                </button>
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
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1, padding: 16, border: `2px dashed ${C.line}`, borderRadius: 8, textAlign: 'center' }}>
                  <p style={{ fontSize: 12, color: C.muted, margin: '0 0 8px' }}>📁 上传音频文件</p>
                  <input type="file" accept="audio/*" onChange={e => { setCloneSample(e.target.files?.[0] || null); if (isRecording) stopRecording() }} style={{ fontSize: 11 }} />
                  {cloneSample && !isRecording && !cloneSample.name.startsWith('录音') && <p style={{ fontSize: 11, color: C.green, margin: '8px 0 0' }}>✓ {cloneSample.name}</p>}
                </div>
                <div style={{ flex: 1, padding: 16, border: `2px dashed ${isRecording ? C.crimson : C.line}`, borderRadius: 8, textAlign: 'center', background: isRecording ? 'rgba(181,69,74,.04)' : 'transparent' }}>
                  <p style={{ fontSize: 12, color: C.muted, margin: '0 0 4px' }}>🎙️ 在线录音</p>
                  <p style={{ fontSize: 10, color: C.muted, margin: '0 0 8px' }}>最少录制 10 秒，请照以下范本朗读</p>
                  {isRecording && (
                    <div style={{ padding: '8px 10px', background: 'rgba(58,82,121,.06)', borderRadius: 6, fontSize: 11, color: C.indigo, lineHeight: 1.6, margin: '0 0 10px', textAlign: 'left', fontStyle: 'italic' }}>
                      「{RECORDING_TEMPLATE}」
                    </div>
                  )}
                  {isRecording ? (
                    <>
                      <p style={{ fontSize: 20, fontWeight: 700, color: recordingTime < 10 ? C.crimson : C.green, margin: '0 0 4px' }}>🔴 {recordingTime}s{recordingTime < 10 ? ` (还需${10 - recordingTime}s)` : ' ✓'}</p>
                      <button onClick={stopRecording} disabled={recordingTime < 3} style={{ padding: '6px 20px', background: recordingTime < 3 ? '#ccc' : C.crimson, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, color: '#fff', cursor: recordingTime < 3 ? 'default' : 'pointer', fontFamily: 'inherit' }}>⏹ 停止录音</button>
                    </>
                  ) : (
                    <button onClick={startRecording} style={{ padding: '6px 20px', background: C.indigo, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>🎙️ 开始录音</button>
                  )}
                  {cloneSample && !isRecording && cloneSample.name.startsWith('录音') && <p style={{ fontSize: 11, color: C.green, margin: '8px 0 0' }}>✓ {cloneSample.name} (已转为wav格式)</p>}
                </div>
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
