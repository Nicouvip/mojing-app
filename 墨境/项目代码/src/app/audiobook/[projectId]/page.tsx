'use client'
import { toast } from 'sonner'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Headphones, Mic, Music, Settings, MessageCircle } from 'lucide-react'
import Navbar from '@/components/navbar'
import DeskSidebar from '@/components/desk-sidebar'
import { getProject, getChapters } from '@/lib/db/store'
import type { Project, Chapter } from '@/lib/db/types'
import { DialogueMode } from '@/components/audiobook/dialogue-mode'
import { EngineSelector, type EngineType } from '@/components/audiobook/engine-selector'
import { ArrangePanel } from '@/components/audiobook/arrange-panel'
import { VoiceDesignModal } from '@/components/audiobook/voice-design-modal'
import { BottomPlayer } from '@/components/audiobook/bottom-player'
import { VoicesTab } from '@/components/audiobook/voices-tab'
import { SettingsPanel } from '@/components/audiobook/settings-panel'
import { AudiobookSidebar } from '@/components/audiobook/audiobook-sidebar'
import { generateSRT } from '@/lib/audiobook/srt-generator'
import { loadGeneratedChapters, saveGeneratedChapter, clearGeneratedChapters } from '@/lib/audiobook/audio-persistence'
import { encodeWAV } from '@/lib/audiobook/audio-utils'

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
  const [designedVoices, setDesignedVoices] = useState<Array<{ id: string; name: string; desc: string; audioBase64: string }>>([])

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
    ...([
      { id: '冰糖', name: '冰糖', desc: '甜美女声·旁白' },
      { id: '茉莉', name: '茉莉', desc: '温柔女声·对话' },
      { id: '苏打', name: '苏打', desc: '阳光男声·青年' },
      { id: '白桦', name: '白桦', desc: '沉稳男声·中年' },
      { id: 'Mia', name: 'Mia', desc: 'English Female' },
      { id: 'Chloe', name: 'Chloe', desc: 'English Gentle' },
      { id: 'Milo', name: 'Milo', desc: 'English Male' },
      { id: 'Dean', name: 'Dean', desc: 'English Deep' },
    ] as const).map(v => ({ id: v.id, name: v.name, desc: v.desc, source: 'preset' as const })),
    ...designedVoices.map(v => ({ id: v.id, name: v.name, desc: v.desc, source: 'designed' as const })),
    ...clonedVoices.map(v => ({ id: v.id, name: v.name, desc: `克隆自 ${v.sampleName}`, source: 'cloned' as const })),
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
                  <VoicesTab
                    defaultVoice={defaultVoice}
                    onDefaultVoiceChange={setDefaultVoice}
                    designedVoices={designedVoices}
                    clonedVoices={clonedVoices}
                    onPreviewVoice={handlePreviewVoice}
                    onPlayAudio={playBase64Audio}
                  />
                )}

                {/* ═══ 生成设置 ═══ */}
                {activeTab === 'settings' && (
                  <SettingsPanel
                    defaultVoice={defaultVoice}
                    onDefaultVoiceChange={setDefaultVoice}
                    defaultEmotion={defaultEmotion}
                    onDefaultEmotionChange={setDefaultEmotion}
                    allVoices={allVoices}
                  />
                )}

                {/* ═══ 多轨编排 ═══ */}
                {activeTab === 'arrange' && (
                  <ArrangePanel chapterTitle={project.name} chapterContent={chapters.find(c => c.id === dialogueChapterId)?.content || ''} />
                )}
              </div>
            </div>

            {/* ── 右栏：音色/情绪/生成控制 ── */}
            <AudiobookSidebar
              defaultVoice={defaultVoice}
              onDefaultVoiceChange={setDefaultVoice}
              defaultEmotion={defaultEmotion}
              onDefaultEmotionChange={setDefaultEmotion}
              designedVoices={designedVoices}
              clonedVoices={clonedVoices}
              onPreviewVoice={handlePreviewVoice}
              onPlayCustom={playBase64Audio}
              onShowDesign={() => setShowDesign(true)}
              onShowClone={() => setShowClone(true)}
            />
          </div>
        </main>
      </div>

      {/* ── 底部播放器 ── */}
      {playingChapterId && (
        <BottomPlayer
          playingChapterId={playingChapterId}
          chapters={chapters}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          defaultVoice={defaultVoice}
          audioRef={audioRef}
          onTogglePlay={handlePlay}
          onClose={() => { audioRef.current?.pause(); setPlayingChapterId(null); setIsPlaying(false) }}
        />
      )}

      <audio ref={audioRef} />

      {/* ═══ VoiceDesign 弹窗 ═══ */}
      <VoiceDesignModal
        open={showDesign}
        onClose={() => setShowDesign(false)}
        designedVoices={designedVoices}
        onVoiceDesigned={(voice) => setDesignedVoices(prev => [...prev, voice])}
        onUseVoice={(voiceId) => setDefaultVoice(voiceId)}
      />
    </div>
  )
}