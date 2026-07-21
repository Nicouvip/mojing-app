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
import { Headphones, Search, Plus, Mic, Upload, X, ChevronLeft } from 'lucide-react'

/* ── 颜色系统 ── */
const C = {
  pri: '#c4956a',
  priBg: 'rgba(196,149,106,.08)',
  ink: '#1a1814',
  muted: 'rgba(26,24,20,.45)',
  dim: 'rgba(26,24,20,.25)',
  line: 'rgba(26,24,20,.06)',
  lineStrong: 'rgba(26,24,20,.1)',
  card: '#fff',
  bg: '#f5f2ed',
  indigo: '#3a5279',
  crimson: '#b5454a',
  green: '#7a9e7a',
  radius: 10,
  radiusSm: 6,
}

const GENRES = ['全部', '都市', '玄幻', '悬疑', '科幻', '历史', '灵异', '言情', '竞技'] as const

const GENRE_COLORS: Record<string, string> = {
  '都市': '#3a5279', '玄幻': '#8e63ce', '悬疑': '#b5454a',
  '科幻': '#4a86e8', '历史': '#c4956a', '灵异': '#7a9e7a',
  '言情': '#eaa041', '竞技': '#d4a0a0',
}

/* ── 音色常量 ── */
const PRESET_VOICES = [
  { id: '冰糖', name: '冰糖', gender: 'female', desc: '甜美女声·旁白' },
  { id: '茉莉', name: '茉莉', gender: 'female', desc: '温柔女声·对话' },
  { id: '苏打', name: '苏打', gender: 'male', desc: '阳光男声·青年' },
  { id: '白桦', name: '白桦', gender: 'male', desc: '沉稳男声·中年' },
  { id: 'Mia', name: 'Mia', gender: 'female', desc: 'English Female' },
  { id: 'Chloe', name: 'Chloe', gender: 'female', desc: 'English Gentle' },
  { id: 'Milo', name: 'Milo', gender: 'male', desc: 'English Male' },
  { id: 'Dean', name: 'Dean', gender: 'male', desc: 'English Deep' },
] as const

const EMOTIONS = ['平静', '开心', '悲伤', '愤怒', '温柔', '严肃', '恐惧', '惊讶', '冷漠']
const RECORDING_TEMPLATE = '春天的花开，秋天的月，夏天的风，冬天的雪。我在微风中轻轻吟唱，那是一首关于时光和记忆的歌。'

interface ProjectWithChapters extends Project { chapters: Chapter[] }
interface ParsedChapter { title: string; content: string; wordCount: number }

export default function AudiobookPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectWithChapters[]>([])
  const [search, setSearch] = useState('')
  const [genreFilter, setGenreFilter] = useState('全部')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({})

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

  const [showVoicePanel, setShowVoicePanel] = useState(false)
  const [defaultVoice, setDefaultVoice] = useState('冰糖')
  const [defaultEmotion, setDefaultEmotion] = useState('平静')

  const [showDesign, setShowDesign] = useState(false)
  const [designDesc, setDesignDesc] = useState('')
  const [designText, setDesignText] = useState('你好，这是音色预览。')
  const [designLoading, setDesignLoading] = useState(false)
  const [designedVoices, setDesignedVoices] = useState<Array<{ id: string; name: string; desc: string; audioBase64: string }>>([])
  const [polishDescLoading, setPolishDescLoading] = useState(false)

  const [showClone, setShowClone] = useState(false)
  const [cloneSample, setCloneSample] = useState<File | null>(null)
  const [cloneName, setCloneName] = useState('')
  const [cloneLoading, setCloneLoading] = useState(false)
  const [clonedVoices, setClonedVoices] = useState<Array<{ id: string; name: string; sampleName: string; audioBase64: string }>>([])

  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])

  useEffect(() => { if (!isRecording) { setRecordingTime(0); return }; const t = setInterval(() => setRecordingTime(s => s + 1), 1000); return () => clearInterval(t) }, [isRecording])

  useEffect(() => {
    if (projects.length === 0) return; let cancelled = false
    ;(async () => {
      const map: Record<string, number> = {}
      await Promise.all(projects.map(async (p) => {
        try { const m = await loadGeneratedChapters(p.id); map[p.id] = m.size } catch { map[p.id] = 0 }
      }))
      if (!cancelled) setAudioProgress(map)
    })()
    return () => { cancelled = true }
  }, [projects])

  const audioUrlRef = useRef<string | null>(null)
  const playBase64Audio = (base64: string, mime: string) => {
    const bin = atob(base64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const blob = new Blob([bytes], { type: mime })
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    const url = URL.createObjectURL(blob)
    audioUrlRef.current = url
    new Audio(url).play()
  }

  const handlePreviewVoice = async (voiceId: string) => {
    try {
      const res = await fetch('/api/audiobook/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: '你好，这是音色试听。很高兴为你服务。', voice: voiceId }) })
      const data = await res.json()
      if (data.success && data.audio) playBase64Audio(data.audio, 'audio/wav')
    } catch (err) { toast.error('试听失败：' + (err instanceof Error ? err.message : String(err))) }
  }

  const startRecording = async () => { /* ... kept identical for brevity, unchanged ... */
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
          setCloneSample(new File([wavBlob], `录音-${new Date().toLocaleTimeString('zh-CN')}.wav`, { type: 'audio/wav' }))
        } catch {
          setCloneSample(new File([webmBlob], `录音-${new Date().toLocaleTimeString('zh-CN')}.webm`, { type: 'audio/webm' }))
          toast.error('wav转换失败，已保存为webm')
        }
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
    } catch { toast.error('无法访问麦克风') }
  }
  const stopRecording = () => { mediaRecorderRef.current?.stop(); setIsRecording(false) }

  const handlePolishDesc = async () => {
    if (!designDesc.trim()) { toast.error('请先输入音色描述'); return }
    setPolishDescLoading(true)
    try { const res = await fetch('/api/audiobook/voices/polish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description: designDesc }) }); const data = await res.json(); if (data.success && data.polished) setDesignDesc(data.polished); else toast.error('润色失败') } catch {}
    finally { setPolishDescLoading(false) }
  }
  const handleDesignVoice = async () => {
    if (!designDesc.trim()) { toast.error('请输入音色描述'); return }; setDesignLoading(true)
    try { const res = await fetch('/api/audiobook/voices/design', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description: designDesc, text: designText }) }); const data = await res.json(); if (data.success && data.audio) { const id = `design-${Date.now()}`; setDesignedVoices(prev => [...prev, { id, name: designDesc.slice(0, 20), desc: designDesc, audioBase64: data.audio }]); playBase64Audio(data.audio, 'audio/wav') } else toast.error('设计失败') } catch {}
    finally { setDesignLoading(false) }
  }
  const handleCloneVoice = async () => {
    if (!cloneSample) { toast.error('请先上传或录制音频样本'); return }; if (!cloneName.trim()) { toast.error('请输入音色名称'); return }; setCloneLoading(true)
    try { const reader = new FileReader(); reader.readAsDataURL(cloneSample); reader.onload = async () => { const sampleBase64 = reader.result as string; try { const res = await fetch('/api/audiobook/voices/clone', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sampleBase64, sampleMimeType: cloneSample.type, text: designText || '你好，这是克隆音色试听。', voice: sampleBase64 }) }); const data = await res.json(); if (data.success && data.audio) { const id = `clone-${Date.now()}`; setClonedVoices(prev => [...prev, { id, name: cloneName.trim(), sampleName: cloneSample.name, audioBase64: data.audio }]); playBase64Audio(data.audio, 'audio/wav') } else toast.error('克隆失败') } catch {} finally { setCloneLoading(false) } } } catch {}
  }

  const loadProjects = () => {
    const projs = getProjects().filter(p => !p.deletedAt).sort((a, b) => b.updatedAt - a.updatedAt)
    setProjects(projs.map(p => ({ ...p, chapters: getChapters(p.id).filter(c => !c.deletedAt).sort((a, b) => a.order - b.order) })))
  }
  useEffect(() => { loadProjects(); const onVisible = () => { if (document.visibilityState === 'visible') loadProjects() }; document.addEventListener('visibilitychange', onVisible); return () => document.removeEventListener('visibilitychange', onVisible) }, [])

  const filtered = projects.filter(p => {
    if (genreFilter !== '全部' && p.genre !== genreFilter) return false
    if (search.trim()) { const q = search.toLowerCase(); if (!p.name.toLowerCase().includes(q) && !p.genre.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q)) return false }
    return true
  })

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setImportFileName(file.name); const text = await file.text(); setImportText(text)
    try { const res = await fetch('/api/audiobook/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: 'preview', text, splitMode: importSplitMode }) }); const data = await res.json(); if (data.success) setImportParsed(data.chapters) } catch {}
  }
  const handleReparse = async () => { if (!importText) return; try { const res = await fetch('/api/audiobook/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: 'preview', text: importText, splitMode: importSplitMode }) }); const data = await res.json(); if (data.success) setImportParsed(data.chapters) } catch {} }
  useEffect(() => { handleReparse() }, [importSplitMode])

  const handleConfirmImport = () => {
    if (!importParsed) { toast.error('请先上传文本文件'); return }; if (!importTarget) { toast.error('请选择目标作品'); return }; setImportLoading(true)
    let targetId = importTarget
    if (importTarget === '__new__') { if (!importNewName.trim()) { toast.error('请输入作品名称'); setImportLoading(false); return }; const newProj = createProject(importNewName.trim(), importNewGenre); targetId = newProj.id }
    for (const ch of importParsed) { const created = createChapter(targetId, ch.title); if (created && ch.content) updateChapterContent(created.id, ch.content) }
    setImportLoading(false); setImportStep('done')
    setTimeout(() => { setShowImport(false); setImportStep('upload'); setImportParsed(null); setImportText(''); setImportFileName(''); loadProjects() }, 1500)
  }

  /* ════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════ */
  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <Navbar />
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 48px)' }}>
        <DeskSidebar active="/audiobook" />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

          {/* ── Top Bar ── */}
          <header style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 32px', height: 60, background: '#fff',
            borderBottom: `1px solid ${C.line}`, flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: C.radiusSm,
                background: `linear-gradient(135deg, ${C.pri}, #a07850)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', boxShadow: `0 2px 8px rgba(196,149,106,.25)`,
              }}>
                <Headphones size={20} />
              </div>
              <div>
                <h1 style={{ fontSize: 16, fontWeight: 700, color: C.ink, margin: 0, letterSpacing: '-0.2px' }}>
                  有声书工坊
                </h1>
                <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
                  {projects.length} 部作品 · {projects.reduce((s,p) => s + p.chapters.length, 0)} 章节
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: C.bg, border: `1px solid ${C.lineStrong}`,
                borderRadius: 22, padding: '0 16px', height: 38,
                transition: 'border-color .2s',
              }}>
                <Search size={14} style={{ color: C.dim }} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="搜索作品…"
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: C.ink, width: 160, fontFamily: 'inherit' }} />
              </div>
              <button onClick={() => setShowVoicePanel(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '0 18px', height: 38,
                  borderRadius: 22, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                  border: showVoicePanel ? 'none' : `1px solid ${C.lineStrong}`,
                  background: showVoicePanel ? C.pri : C.card,
                  color: showVoicePanel ? '#fff' : C.ink,
                  transition: 'all .15s',
                }}>
                <Mic size={14} /> 音色
              </button>
              <button onClick={() => { setShowImport(true); setImportStep('upload'); setImportParsed(null); setImportText(''); setImportFileName('') }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '0 22px', height: 38,
                  borderRadius: 22, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  border: 'none', background: C.pri, color: '#fff',
                  boxShadow: `0 2px 10px rgba(196,149,106,.3)`,
                  transition: 'all .15s',
                }}>
                <Upload size={14} /> 导入小说
              </button>
            </div>
          </header>

          {/* ── Genre Filter ── */}
          <div style={{
            display: 'flex', gap: 6, padding: '10px 32px',
            background: 'rgba(255,255,255,.5)', backdropFilter: 'blur(8px)',
            borderBottom: `1px solid ${C.line}`, flexShrink: 0, overflowX: 'auto',
          }}>
            {GENRES.map(g => {
              const isActive = genreFilter === g
              const genreColor = g === '全部' ? C.pri : (GENRE_COLORS[g] || C.pri)
              return (
                <button key={g} onClick={() => setGenreFilter(g)}
                  style={{
                    padding: '5px 18px', borderRadius: 18, fontSize: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    fontWeight: isActive ? 600 : 400,
                    background: isActive ? genreColor : 'transparent',
                    color: isActive ? '#fff' : C.muted,
                    whiteSpace: 'nowrap', transition: 'all .15s',
                  }}>{g}</button>
              )
            })}
          </div>

          {/* ── Voice Panel ── */}
          {showVoicePanel && (
            <div style={{ padding: '18px 32px', borderBottom: `1px solid ${C.line}`, background: '#fff' }}>
              <VoiceSelector defaultVoice={defaultVoice} onVoiceChange={setDefaultVoice}
                designedVoices={designedVoices}
                clonedVoices={clonedVoices.map(v => ({ id: v.id, name: v.name, desc: v.sampleName, audioBase64: v.audioBase64 }))}
                onPreview={handlePreviewVoice} onShowDesign={() => setShowDesign(true)} onShowClone={() => setShowClone(true)}
                onPlayCustom={(b64) => playBase64Audio(b64, 'audio/wav')} />
              <div style={{ marginTop: 12 }}>
                <EmotionPicker selected={defaultEmotion} onSelect={setDefaultEmotion} />
              </div>
            </div>
          )}

          {/* ── Content ── */}
          <div style={{ flex: 1, overflow: 'auto', padding: '28px 32px' }}>
            {filtered.length === 0 ? (
              /* Empty State */
              <div style={{ textAlign: 'center', padding: '80px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                <div style={{ width: 88, height: 88, borderRadius: 44, background: C.priBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Headphones size={40} style={{ color: C.pri, opacity: .6 }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 700, color: C.ink, margin: '0 0 4px' }}>
                    {search || genreFilter !== '全部' ? '未找到匹配作品' : '书架尚空'}
                  </h2>
                  <p style={{ fontSize: 13, color: C.muted, margin: 0, maxWidth: 300, lineHeight: 1.6 }}>
                    {search || genreFilter !== '全部' ? '试试换个关键词，或清除筛选条件' : '导入你的第一本小说，开始制作有声书'}
                  </p>
                </div>
                {!(search || genreFilter !== '全部') && (
                  <button onClick={() => { setShowImport(true); setImportStep('upload'); setImportParsed(null); setImportText(''); setImportFileName('') }}
                    style={{ padding: '10px 28px', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', border: 'none', borderRadius: 8, background: C.pri, color: '#fff', cursor: 'pointer', marginTop: 4 }}>
                    导入第一本小说
                  </button>
                )}
              </div>
            ) : (
              /* Project Grid */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 24 }}>
                {filtered.map((project, idx) => (
                  <ProjectCard key={project.id} project={project} idx={idx}
                    audioProgress={audioProgress[project.id] || 0}
                    isExpanded={expandedId === project.id}
                    onToggleExpand={() => setExpandedId(expandedId === project.id ? null : project.id)} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ═══ Import Modal (unchanged) ═══ */}
      {showImport && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.35)' }}
          onClick={() => { setShowImport(false); setImportStep('upload'); setImportParsed(null) }}>
          <div style={{ width: '100%', maxWidth: 560, maxHeight: '85vh', overflow: 'auto', background: '#fff', borderRadius: 14, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,.15)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: C.ink, margin: 0 }}>📥 导入小说</h2>
              <button onClick={() => { setShowImport(false); setImportStep('upload'); setImportParsed(null) }}
                style={{ background: 'none', border: 'none', fontSize: 20, color: C.muted, cursor: 'pointer' }}>×</button>
            </div>
            {/* ... import steps kept for compatibility ... */}
            {importStep === 'done' ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <p style={{ fontSize: 15, fontWeight: 600, color: C.ink, margin: '0 0 4px' }}>导入成功！</p>
                <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>已将 {importParsed?.length || 0} 个章节写入作品</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 6 }}>目标作品</label>
                  <select value={importTarget} onChange={e => setImportTarget(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: `1px solid ${C.lineStrong}`, borderRadius: C.radiusSm, fontSize: 13, fontFamily: 'inherit', color: C.ink, background: '#fff' }}>
                    <option value="">请选择作品…</option>
                    <option value="__new__">✨ 新建作品</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.genre})</option>)}
                  </select>
                  {importTarget === '__new__' && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <input value={importNewName} onChange={e => setImportNewName(e.target.value)} placeholder="作品名称"
                        style={{ flex: 1, padding: '8px 12px', border: `1px solid ${C.lineStrong}`, borderRadius: C.radiusSm, fontSize: 13, fontFamily: 'inherit', color: C.ink }} />
                      <select value={importNewGenre} onChange={e => setImportNewGenre(e.target.value)}
                        style={{ width: 100, padding: '8px 12px', border: `1px solid ${C.lineStrong}`, borderRadius: C.radiusSm, fontSize: 13, fontFamily: 'inherit', color: C.ink }}>
                        {GENRES.filter(g => g !== '全部').map(g => <option key={g}>{g}</option>)}
                      </select>
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 6 }}>上传文件</label>
                  <div onClick={() => fileInputRef.current?.click()}
                    style={{ padding: '32px 20px', border: `2px dashed ${importText ? C.pri : C.lineStrong}`, borderRadius: C.radius, textAlign: 'center', cursor: 'pointer', background: importText ? C.priBg : 'transparent', transition: 'all .15s' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>{importText ? '📄' : '📁'}</div>
                    <p style={{ fontSize: 12, color: importText ? C.pri : C.muted, margin: 0 }}>
                      {importText ? `✓ ${importFileName} (${(importText.length / 1000).toFixed(1)}k 字)` : '点击上传 TXT 文件'}
                    </p>
                    <input ref={fileInputRef} type="file" accept=".txt,.text,.md,text/plain" onChange={handleFileSelect} style={{ display: 'none' }} />
                  </div>
                </div>
                <button onClick={handleConfirmImport} disabled={!importText || !importTarget || importLoading}
                  style={{ width: '100%', padding: '10px 0', border: 'none', borderRadius: C.radiusSm, fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
                    background: (!importText || !importTarget) ? C.lineStrong : C.pri, color: (!importText || !importTarget) ? C.dim : '#fff', cursor: (!importText || !importTarget) ? 'default' : 'pointer' }}>
                  {importLoading ? '⏳ 导入中…' : '确认导入'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
