'use client'
import { toast } from 'sonner'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Headphones, Mic, Music, Settings, Play, Pause, X, Sparkles, FileText, MessageCircle } from 'lucide-react'
import Navbar from '@/components/navbar'
import DeskSidebar from '@/components/desk-sidebar'
import { getProject, getChapters } from '@/lib/db/store'
import type { Project, Chapter } from '@/lib/db/types'
import { DialogueMode } from '@/components/audiobook/dialogue-mode'
import { VoiceSelector } from '@/components/audiobook/voice-selector'
import { EngineSelector, type EngineType } from '@/components/audiobook/engine-selector'
import { ArrangePanel } from '@/components/audiobook/arrange-panel'
import { EmotionPicker } from '@/components/audiobook/emotion-picker'
import { generateSRT } from '@/lib/audiobook/srt-generator'
import { loadGeneratedChapters, saveGeneratedChapter, clearGeneratedChapters } from '@/lib/audiobook/audio-persistence'
import { encodeWAV } from '@/lib/audiobook/audio-utils'

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
  const [notFound, setNotFound] = useState(false)
  /* ── 选择 & 设置 ── */
  const [defaultVoice, setDefaultVoice] = useState('冰糖')
  const [defaultEmotion, setDefaultEmotion] = useState('平静')
  const [activeTab, setActiveTab] = useState<'dialogue' | 'voices' | 'settings' | 'arrange'>('dialogue')
  const [dialogueChapterId, setDialogueChapterId] = useState<string>('')

  /* ── 生成状态 ── */
  const [mergingChapters, setMergingChapters] = useState(false)
  const [chapterExportFormat, setChapterExportFormat] = useState<'wav' | 'mp3' | 'm4b'>('wav')
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
  const [polishDescLoading, setPolishDescLoading] = useState(false)
  const [originalDesc, setOriginalDesc] = useState('')

  /* ── VoiceClone 弹窗 ── */
  const [showClone, setShowClone] = useState(false)
  const [cloneSample, setCloneSample] = useState<File | null>(null)
  const [cloneName, setCloneName] = useState('')
  const [cloneLoading, setCloneLoading] = useState(false)
  const [sampleQuality, setSampleQuality] = useState<{ format: string; duration: number; sizeMB: number; sampleRate: number; valid: boolean } | null>(null)
  const [clonedVoices, setClonedVoices] = useState<Array<{ id: string; name: string; sampleName: string; audioBase64: string }>>([])

  /* ── TTS 引擎选择 ── */
  const [ttsEngine, setTtsEngine] = useState<EngineType>('normal')
  /* ── 录音范本 ── */
  const RECORDING_TEMPLATE = '春天的花开，秋天的月，夏天的风，冬天的雪。我在微风中轻轻吟唱，那是一首关于时光和记忆的歌。窗外的雨滴落在玻璃上，像是大自然写给大地的情书。'

  /* ── 在线录音状态 ── */
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])

  /* ── 样本质量检测 ── */
  useEffect(() => {
    if (!cloneSample) { setSampleQuality(null); return }
    const analyze = async () => {
      try {
        const sizeMB = cloneSample.size / (1024 * 1024)
        const format = cloneSample.name.split('.').pop()?.toUpperCase() || '未知'
        const arrayBuf = await cloneSample.arrayBuffer()
        const audioCtx = new AudioContext()
        const audioBuf = await audioCtx.decodeAudioData(arrayBuf)
        const duration = audioBuf.duration
        const sampleRate = audioBuf.sampleRate
        audioCtx.close()
        const valid = duration >= 10 && sizeMB <= 7.5
        setSampleQuality({ format, duration: Math.round(duration), sizeMB: Math.round(sizeMB * 10) / 10, sampleRate, valid })
      } catch {
        setSampleQuality({ format: cloneSample.name.split('.').pop()?.toUpperCase() || '未知', duration: 0, sizeMB: Math.round(cloneSample.size / (1024 * 1024) * 10) / 10, sampleRate: 0, valid: false })
      }
    }
    analyze()
  }, [cloneSample])
  /* ── 录音计时器 ── */
  useEffect(() => {
    if (!isRecording) { setRecordingTime(0); return }
    const t = setInterval(() => setRecordingTime(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [isRecording])

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

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }

  /* ── 加载项目 ── */
  useEffect(() => {
    if (!projectId) return
    const p = getProject(projectId)
    if (p) {
      setProject(p)
      setChapters(getChapters(projectId))
      setNotFound(false)
    } else {
      setNotFound(true)
    }
    loadGeneratedChapters(projectId).then(map => {
      if (map.size > 0) setGeneratedChapters(map)
    })
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
      toast.error('试听失败：' + (err instanceof Error ? err.message : String(err)))
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

  /* ── 播放章节 ── */
  const handlePlay = (chapterId: string) => {
    if (playingChapterId === chapterId && isPlaying) {
      audioRef.current?.pause()
      setIsPlaying(false)
      return
    }
    const gen = generatedChapters.get(chapterId)
    if (!gen) {
      toast.error('请先生成该章节的音频')
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

  /* ── 下载 SRT 字幕 ── */
  const handleDownloadSRT = (chapterId: string) => {
    const gen = generatedChapters.get(chapterId)
    if (!gen || gen.subtitles.length === 0) return
    const chapter = chapters.find(c => c.id === chapterId)
    const timestamps = gen.subtitles.map(s => ({ start: s.startSec, end: s.endSec, text: s.text }))
    const srt = generateSRT(timestamps)
    const blob = new Blob([srt], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${chapter?.title || chapterId}.srt`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ── 合并已生成章节音频 ── */
  const handleMergeChapters = async () => {
    if (generatedChapters.size === 0) { toast.error('请先生成音频'); return }
    setMergingChapters(true)
    try {
      const segments: Array<{ audioBase64: string; duration?: number }> = []
      generatedChapters.forEach((gen, chId) => {
        segments.push({ audioBase64: gen.audioBase64, duration: gen.duration })
      })
      const res = await fetch('/api/audiobook/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segments, format: chapterExportFormat }),
      })
      const data = await res.json()
      if (data.success && data.audio) {
        const mime = chapterExportFormat === 'mp3' ? 'audio/mpeg' : 'audio/wav'
        const ext = chapterExportFormat === 'mp3' ? 'mp3' : 'wav'
        const bin = atob(data.audio)
        const bytes = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
        const blob = new Blob([bytes], { type: mime })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `${project?.name || '有声书'}.${ext}`; a.click()
        URL.revokeObjectURL(url)
      } else {
        toast.error('合并失败：' + (data.error || '未知错误'))
      }
    } catch (err) {
      toast.error('合并失败：' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setMergingChapters(false)
    }
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

  /* ── 润色音色描述 ── */
  const handlePolishDesc = async () => {
    if (!designDesc.trim()) { toast.error('请先输入音色描述'); return }
    setOriginalDesc(designDesc)
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

  /* ── VoiceClone 克隆 ── */
  const handleCloneVoice = async () => {
    if (!cloneSample) { toast.error('请选择样本音频'); return }
    if (!cloneName.trim()) { toast.error('请输入名称'); return }
    setCloneLoading(true)
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1]
        const mime = cloneSample.type || 'audio/mpeg'
        const res = await fetch('/api/audiobook/voices/clone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sampleBase64: `data:${mime};base64,${base64}`, sampleMimeType: mime, text: '你好，这是克隆声音的测试。', voice: cloneName.trim() }),
        })
        const data = await res.json()
        if (data.success && data.audio) {
          const id = `clone-${Date.now()}`
          setClonedVoices(prev => [...prev, { id, name: cloneName, sampleName: cloneSample!.name, audioBase64: data.audio }])
          playBase64Audio(data.audio, 'audio/wav')
        } else {
          toast.error('克隆失败：' + (data.error || '未知错误'))
        }
        setCloneLoading(false)
      }
      reader.readAsDataURL(cloneSample)
    } catch (err) {
      toast.error('克隆失败：' + (err instanceof Error ? err.message : String(err)))
      setCloneLoading(false)
    }
  }

  /* ── 字幕同步 ── */
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

  /* P0-1: Persist generated chapters to IndexedDB */
  const persistAndSetChapters = useCallback((updater: (prev: Map<string, { audioBase64: string; duration: number; subtitles: Array<{ text: string; startSec: number; endSec: number }> }>) => Map<string, { audioBase64: string; duration: number; subtitles: Array<{ text: string; startSec: number; endSec: number }> }>) => {
    setGeneratedChapters(prev => {
      const next = updater(prev)
      next.forEach((data, chId) => {
        if (!prev.has(chId)) {
          saveGeneratedChapter(projectId, chId, data)
        }
      })
      return next
    })
  }, [projectId])

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex min-h-[calc(100vh-56px)]">
          <DeskSidebar active="/audiobook" />
          <main className="flex-1 flex flex-col items-center justify-center gap-4">
            <Headphones className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">作品不存在</p>
            <Link href="/audiobook" className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm no-underline hover:bg-primary-hover transition-colors">
              ← 返回有声书列表
            </Link>
          </main>
        </div>
      </div>
    )
  }

  const totalDuration = Array.from(generatedChapters.values()).reduce((s, g) => s + g.duration, 0)
  const activeChapters = chapters.filter(c => !c.deletedAt)

  // 项目不存在时的兜底页面
  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">📖</div>
          <h1 className="text-xl font-bold text-foreground mb-2">作品不存在</h1>
          <p className="text-sm text-muted-foreground mb-6">该有声书项目可能已被删除或链接有误</p>
          <Link href="/audiobook" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold no-underline hover:bg-primary-hover transition-colors">
            ← 返回有声书列表
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex h-[calc(100vh-56px)]">
        <DeskSidebar active="/audiobook" />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* ── 顶栏 ── */}
          <header className="flex items-center justify-between px-4 h-12 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2">
              <Link href="/audiobook" className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <span className="text-border">|</span>
              <Headphones className="h-4 w-4 text-muted-foreground" />
              <h1 className="text-sm font-semibold text-foreground m-0">{project.name}</h1>
              {generatedChapters.size > 0 && (
                <span className="text-[11px] text-success px-2 py-0.5 bg-success/10 rounded-full">
                  ✓ {generatedChapters.size}章 · {Math.floor(totalDuration / 60)}:{String(Math.floor(totalDuration % 60)).padStart(2, '0')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {generatedChapters.size > 0 && (
                <button onClick={handleMergeChapters} disabled={mergingChapters}
                  className="px-4 py-1 bg-indigo text-white border-none rounded-full text-xs font-medium cursor-pointer disabled:opacity-50 transition-opacity">
                  {mergingChapters ? '...' : `Merge (${generatedChapters.size})`}
                </button>
              )}
            </div>
          </header>

          {/* ── 三栏布局 ── */}
          <div className="flex-1 flex overflow-hidden">

            {/* ── 中栏：Tab + 内容 ── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

              {/* Tab 切换 */}
              <div className="flex border-b border-border px-4 flex-shrink-0">
                {([
                  { key: 'dialogue' as const, label: '对话模式', icon: MessageCircle },
                  { key: 'voices' as const, label: '音色管理', icon: Mic },
                  { key: 'settings' as const, label: '生成设置', icon: Settings },
                  { key: 'arrange' as const, label: '多轨编排', icon: Music },
                ]).map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-xs border-none bg-transparent cursor-pointer transition-colors ${
                      activeTab === tab.key
                        ? 'font-semibold text-primary border-b-2 border-primary'
                        : 'font-normal text-muted-foreground border-b-2 border-transparent hover:text-foreground'
                    }`}>
                    <tab.icon className="h-3.5 w-3.5" />{tab.label}
                  </button>
                ))}
              </div>

              {/* Tab 内容 */}
              <div className="flex-1 overflow-auto px-4 py-4">

                {/* ═══ 对话模式 ═══ */}
                {activeTab === 'dialogue' && (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <EngineSelector value={ttsEngine} onChange={setTtsEngine} />
                      <select value={dialogueChapterId} onChange={e => setDialogueChapterId(e.target.value)}
                        className="px-3 py-1.5 border border-border rounded-md text-xs text-card-foreground bg-card font-inherit flex-shrink-0">
                        <option value="">选择章节...</option>
                        {activeChapters.map((ch, ci) => <option key={`${ch.id}-${ci}`} value={ch.id}>{ch.title}</option>)}
                      </select>
                      <p className="text-xs text-muted-foreground m-0 flex-1">选择章节 → AI自动识别对话/叙述 → 为角色分配音色 → 逐句生成</p>
                    </div>
                    {dialogueChapterId ? (
                      <DialogueMode
                        chapter={chapters.find(c => c.id === dialogueChapterId)!}
                        defaultVoice={defaultVoice}
                        defaultEmotion={defaultEmotion}
                        ttsEngine={ttsEngine}
                        extraVoices={[
                          ...designedVoices.map(v => ({ id: v.id, name: `🎨 ${v.name}`, type: 'design' as const })),
                          ...clonedVoices.map(v => ({ id: v.id, name: `🔴 ${v.name}`, type: 'clone' as const })),
                        ]}
                      />
                    ) : (
                      <div className="text-center py-16 text-muted-foreground">
                        <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="text-[13px] m-0">请先选择一个章节，系统会自动识别对话和角色</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ═══ 音色管理 ═══ */}
                {activeTab === 'voices' && (
                  <div>
                    <p className="text-xs text-muted-foreground m-0 mb-4">选择默认音色，或设计/克隆自定义音色</p>
                    <h3 className="text-xs font-semibold text-card-foreground m-0 mb-2.5">预置音色</h3>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2.5 mb-5">
                      {PRESET_VOICES.map(v => (
                        <div key={v.id} onClick={() => setDefaultVoice(v.id)} className={`p-3 bg-card border-2 rounded-lg cursor-pointer transition-all hover:shadow-card ${
                          defaultVoice === v.id ? 'border-primary' : 'border-border'
                        }`}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{v.icon}</span>
                            <div>
                              <div className="text-xs font-semibold text-card-foreground">{v.name}</div>
                              <div className="text-[10px] text-muted-foreground">{v.desc}</div>
                            </div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); handlePreviewVoice(v.id) }} className={`w-full py-1 border-none rounded text-[11px] cursor-pointer font-inherit transition-colors ${
                            defaultVoice === v.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                          }`}>
                            <Play className="inline h-3 w-3 mr-1" />试听
                          </button>
                        </div>
                      ))}
                    </div>
                    {designedVoices.length + clonedVoices.length > 0 && (
                      <>
                        <h3 className="text-xs font-semibold text-card-foreground m-0 mb-2.5">我的自定义音色</h3>
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2.5">
                          {[...designedVoices, ...clonedVoices.map(v => ({ id: v.id, name: v.name, desc: v.sampleName, audioBase64: v.audioBase64 }))].map(v => (
                            <div key={v.id} onClick={() => setDefaultVoice(v.id)} className={`p-3 bg-card border-2 rounded-lg cursor-pointer transition-all hover:shadow-card ${
                              defaultVoice === v.id ? 'border-primary' : 'border-border'
                            }`}>
                              <div className="text-xs font-semibold text-card-foreground mb-1">{v.name}</div>
                              <div className="text-[10px] text-muted-foreground mb-2">{v.desc}</div>
                              <button onClick={(e) => { e.stopPropagation(); playBase64Audio((v as { audioBase64: string }).audioBase64, 'audio/wav') }} className="w-full py-1 bg-primary/10 border-none rounded text-[11px] text-primary cursor-pointer font-inherit transition-colors">
                                <Play className="inline h-3 w-3 mr-1" />试听
                              </button>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* ═══ 生成设置 ═══ */}
                {activeTab === 'settings' && (
                  <div className="max-w-xl">
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="block text-xs font-medium text-card-foreground mb-1.5">默认旁白音色</label>
                        <select value={defaultVoice} onChange={e => setDefaultVoice(e.target.value)} className="w-full px-3 py-2 border border-border rounded-md text-[13px] text-card-foreground bg-card font-inherit">
                          {allVoices.map(v => <option key={v.id} value={v.id}>{v.name} — {v.desc}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-card-foreground mb-1.5">默认情绪</label>
                        <EmotionPicker selected={defaultEmotion} onSelect={setDefaultEmotion} />
                      </div>
                      <div className="p-4 bg-muted/50 border border-border rounded-lg">
                        <h3 className="text-[13px] font-semibold text-card-foreground m-0 mb-3">
                          <Settings className="inline h-4 w-4 mr-1" />音频质量
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-medium text-muted-foreground mb-1">采样率</label>
                            <select defaultValue="24000" className="w-full px-2.5 py-1.5 border border-border rounded-md text-xs text-card-foreground bg-card font-inherit">
                              <option value="8000">8,000 Hz（电话音质）</option>
                              <option value="16000">16,000 Hz（语音识别）</option>
                              <option value="22050">22,050 Hz（FM 广播）</option>
                              <option value="24000">24,000 Hz（标准，推荐）</option>
                              <option value="44100">44,100 Hz（CD 音质）</option>
                              <option value="48000">48,000 Hz（专业音频）</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-muted-foreground mb-1">位深度</label>
                            <select defaultValue="16" className="w-full px-2.5 py-1.5 border border-border rounded-md text-xs text-card-foreground bg-card font-inherit">
                              <option value="8">8-bit（低质量，文件小）</option>
                              <option value="16">16-bit（标准，推荐）</option>
                              <option value="24">24-bit（高质量）</option>
                              <option value="32">32-bit（录音室级别）</option>
                            </select>
                          </div>
                        </div>
                        <div className="mt-3">
                          <label className="block text-[11px] font-medium text-muted-foreground mb-1">比特率（MP3 导出时生效）</label>
                          <div className="flex gap-1.5 flex-wrap">
                            {[64, 96, 128, 160, 192, 224, 256, 320].map(br => (
                              <button key={br} className={`px-2.5 py-1 rounded-full text-[11px] font-inherit cursor-pointer transition-colors ${
                                br === 192
                                  ? 'border border-primary bg-primary/10 text-primary font-semibold'
                                  : 'border border-border bg-card text-muted-foreground font-normal'
                              }`}>{br} kbps</button>
                            ))}
                          </div>
                        </div>
                        <div className="mt-3">
                          <label className="block text-[11px] font-medium text-muted-foreground mb-1">导出格式</label>
                          <div className="flex gap-1.5">
                            {[
                              { key: 'wav', label: 'WAV（无损）' },
                              { key: 'mp3-128', label: 'MP3 128k' },
                              { key: 'mp3-192', label: 'MP3 192k' },
                              { key: 'mp3-320', label: 'MP3 320k' },
                            ].map(f => (
                              <button key={f.key} className={`px-2.5 py-1 rounded-full text-[11px] font-inherit cursor-pointer transition-colors ${
                                f.key === 'wav'
                                  ? 'border border-primary bg-primary/10 text-primary font-semibold'
                                  : 'border border-border bg-card text-muted-foreground font-normal'
                              }`}>{f.label}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-card-foreground mb-1.5">对话间隔</label>
                        <select defaultValue="500" className="w-full px-3 py-2 border border-border rounded-md text-[13px] text-card-foreground bg-card font-inherit">
                          <option value="300">0.3 秒（紧凑）</option>
                          <option value="500">0.5 秒（正常）</option>
                          <option value="800">0.8 秒（舒缓）</option>
                          <option value="1000">1.0 秒（缓慢）</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* ═══ 多轨编排 ═══ */}
                {activeTab === 'arrange' && (
                  <ArrangePanel chapterTitle={project.name} chapterContent={chapters.find(c => c.id === dialogueChapterId)?.content || ''} />
                )}
              </div>
            </div>

            {/* ── 右栏：音色/情绪/生成控制 ── */}
            <aside className="w-64 border-l border-border flex flex-col flex-shrink-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">

                {/* 快捷音色选择 */}
                <div>
                  <h3 className="text-xs font-semibold text-card-foreground m-0 mb-2">音色</h3>
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
                </div>

                {/* 情绪选择 */}
                <div>
                  <h3 className="text-xs font-semibold text-card-foreground m-0 mb-2">情绪</h3>
                  <EmotionPicker selected={defaultEmotion} onSelect={setDefaultEmotion} />
                </div>

                {/* 快捷操作 */}
                <div className="space-y-2">
                  <button onClick={() => setShowDesign(true)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-card border border-border rounded-lg text-xs text-card-foreground cursor-pointer font-inherit hover:bg-muted transition-colors">
                    <Sparkles className="h-3.5 w-3.5" />设计音色
                  </button>
                  <button onClick={() => setShowClone(true)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground border-none rounded-lg text-xs font-medium cursor-pointer font-inherit hover:bg-primary-hover transition-colors">
                    <Mic className="h-3.5 w-3.5" />克隆声音
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>

      {/* ── 底部播放器 ── */}
      {playingChapterId && (
        <div className="fixed bottom-0 left-0 right-0 h-14 bg-card border-t border-border flex items-center px-4 gap-3 z-[100] shadow-[0_-2px_12px_rgba(0,0,0,.04)]">
          <button onClick={() => handlePlay(playingChapterId)} className="w-8 h-8 rounded-full bg-primary border-none cursor-pointer flex items-center justify-center text-white shrink-0 hover:bg-primary-hover transition-colors">
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-card-foreground">{chapters.find(c => c.id === playingChapterId)?.title || ''}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground">{Math.floor(currentTime)}s / {Math.floor(duration)}s</span>
              <div className="flex-1 h-[3px] bg-border rounded-sm cursor-pointer" onClick={(e) => {
                if (!audioRef.current) return
                const rect = e.currentTarget.getBoundingClientRect()
                const ratio = (e.clientX - rect.left) / rect.width
                audioRef.current.currentTime = ratio * duration
              }}>
                <div className="h-full bg-primary rounded-sm transition-[width] duration-100" style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }} />
              </div>
              <span className="text-[10px] text-muted-foreground">{defaultVoice}</span>
            </div>
          </div>
          <button onClick={() => { audioRef.current?.pause(); setPlayingChapterId(null); setIsPlaying(false) }}
            className="px-3 py-1.5 bg-transparent border border-border rounded-md text-[11px] text-muted-foreground cursor-pointer font-inherit hover:bg-muted transition-colors">关闭</button>
        </div>
      )}

      <audio ref={audioRef} />

      {/* ═══ VoiceDesign 弹窗 ═══ */}
      {showDesign && (
        <div className="fixed inset-0 bg-overlay flex items-center justify-center z-[1000] modal-enter" onClick={() => setShowDesign(false)}>
          <div className="w-full max-w-[560px] bg-card rounded-xl p-6 shadow-modal max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-[15px] font-semibold text-card-foreground m-0">
                <Sparkles className="inline h-4 w-4 mr-1" />设计新音色
              </h2>
              <button onClick={() => setShowDesign(false)} className="bg-transparent border-none cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {/* 快速模板 */}
              <div>
                <label className="block text-xs font-medium text-card-foreground mb-1.5">快速模板（点击填入）</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { icon: '👨', label: '青年男性', desc: '年轻男性，声音清亮，充满活力' },
                    { icon: '👨', label: '中年男性', desc: '中年男性，声音低沉稳重，适合长辈' },
                    { icon: '👨', label: '老年男性', desc: '老年男性，声音苍老但有力量，适合智者' },
                    { icon: '👧', label: '青年女性', desc: '年轻女性，声音甜美，充满活力' },
                    { icon: '👩', label: '中年女性', desc: '中年女性，声音温暖，有母性的光辉' },
                    { icon: '👵', label: '老年女性', desc: '老年女性，声音慈祥，像是在讲睡前故事' },
                    { icon: '👶', label: '儿童', desc: '八岁的小男孩，声音稚嫩，充满好奇心' },
                    { icon: '🎙️', label: '旁白', desc: '专业旁白，声音沉稳，语速适中，适合有声书' },
                  ].map(t => (
                    <button key={t.label} onClick={() => setDesignDesc(t.desc)}
                      className="p-2 border border-border rounded-md text-center cursor-pointer bg-card hover:bg-muted transition-colors">
                      <div className="text-sm">{t.icon}</div>
                      <div className="text-[10px] font-medium text-card-foreground">{t.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-card-foreground mb-1">音色描述（1-4句）</label>
                <textarea value={designDesc} onChange={e => setDesignDesc(e.target.value)} placeholder="例：年轻女性，声音清亮，充满活力，适合旁白" className="w-full px-3 py-2 border border-border rounded-md text-[13px] text-card-foreground font-inherit min-h-[70px] resize-y box-border" />
                <button onClick={handlePolishDesc} disabled={polishDescLoading} className="mt-1.5 px-4 py-1.5 bg-[#8e63ce] border-none rounded-md text-xs font-medium text-white cursor-pointer font-inherit disabled:opacity-60 disabled:cursor-default transition-opacity">
                  {polishDescLoading ? '⏳ 润色中...' : '✨ 润色描述'}
                </button>
              </div>

              {/* 润色前后对比 */}
              {originalDesc && originalDesc !== designDesc && (
                <div className="p-3 bg-muted/50 rounded-lg text-[11px]">
                  <p className="font-medium text-card-foreground mb-1.5">✨ 润色对比</p>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <p className="text-muted-foreground mb-0.5">原文：</p>
                      <p className="text-foreground leading-relaxed">{originalDesc}</p>
                    </div>
                    <div className="w-px bg-border" />
                    <div className="flex-1">
                      <p className="text-primary mb-0.5">润色后：</p>
                      <p className="text-foreground leading-relaxed">{designDesc}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-card-foreground mb-1">预览文本</label>
                <input value={designText} onChange={e => setDesignText(e.target.value)} className="w-full px-3 py-2 border border-border rounded-md text-[13px] text-card-foreground font-inherit box-border" />
              </div>
              <button onClick={handleDesignVoice} disabled={designLoading} className="py-2.5 bg-primary border-none rounded-md text-[13px] font-medium text-white cursor-pointer font-inherit disabled:opacity-60 disabled:cursor-default hover:bg-primary-hover transition-all">
                {designLoading ? '⏳ 生成中...' : '🎵 生成并试听'}
              </button>

              {/* 已设计音色列表 */}
              {designedVoices.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-card-foreground mb-1.5">已设计音色（{designedVoices.length}）</label>
                  <div className="space-y-1.5">
                    {designedVoices.map(v => (
                      <div key={v.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-card-foreground truncate">{v.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{v.desc}</p>
                        </div>
                        <div className="flex gap-1 ml-2 shrink-0">
                          <button onClick={() => playBase64Audio(v.audioBase64, 'audio/wav')}
                            className="w-6 h-6 flex items-center justify-center rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer border-none">
                            <Play className="w-3 h-3" />
                          </button>
                          <button onClick={() => setDefaultVoice(v.id)}
                            className="px-2 py-0.5 text-[10px] rounded bg-primary text-white hover:bg-primary-hover transition-colors cursor-pointer border-none font-inherit">
                            选用
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}