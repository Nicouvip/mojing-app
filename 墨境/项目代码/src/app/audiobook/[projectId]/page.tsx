'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/navbar'
import DeskSidebar from '@/components/desk-sidebar'
import { getProject, getChapters } from '@/lib/db/store'
import type { Project, Chapter } from '@/lib/db/types'
import { DialogueMode } from '@/components/audiobook/dialogue-mode'
import { generateSRT } from '@/lib/audiobook/srt-generator'

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
  const [defaultVoice, setDefaultVoice] = useState('冰糖')
  const [defaultEmotion, setDefaultEmotion] = useState('平静')
  const [activeTab, setActiveTab] = useState<'dialogue' | 'voices' | 'settings'>('dialogue')
  const [dialogueChapterId, setDialogueChapterId] = useState<string>('')

  /* ── 生成状态 ── */
  /* ── 合并导出章节音频 ── */
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

  /* ── VoiceClone 弹窗 ── */
  const [showClone, setShowClone] = useState(false)
  const [cloneSample, setCloneSample] = useState<File | null>(null)
  const [cloneName, setCloneName] = useState('')
  const [cloneLoading, setCloneLoading] = useState(false)
  const [clonedVoices, setClonedVoices] = useState<Array<{ id: string; name: string; sampleName: string; audioBase64: string }>>([])

  /* ── WAV 编码器 ── */
  function encodeWAV(audioBuf: AudioBuffer): Blob {
    const numCh = audioBuf.numberOfChannels
    const sampleRate = audioBuf.sampleRate
    const format = 1 // PCM
    const bitsPerSample = 16
    const bytesPerSample = bitsPerSample / 8
    const blockAlign = numCh * bytesPerSample
    const dataLength = audioBuf.length * blockAlign
    const buffer = new ArrayBuffer(44 + dataLength)
    const view = new DataView(buffer)
    const writeStr = (offset: number, str: string) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)) }
    writeStr(0, 'RIFF'); view.setUint32(4, 36 + dataLength, true); writeStr(8, 'WAVE')
    writeStr(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, format, true); view.setUint16(22, numCh, true)
    view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * blockAlign, true); view.setUint16(32, blockAlign, true); view.setUint16(34, bitsPerSample, true)
    writeStr(36, 'data'); view.setUint32(40, dataLength, true)
    const channels: Float32Array[] = []
    for (let ch = 0; ch < numCh; ch++) channels.push(audioBuf.getChannelData(ch))
    let offset = 44
    for (let i = 0; i < audioBuf.length; i++) {
      for (let ch = 0; ch < numCh; ch++) {
        const sample = Math.max(-1, Math.min(1, channels[ch][i]))
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
        offset += 2
      }
    }
    return new Blob([buffer], { type: 'audio/wav' })
  }

  /* ── 录音范本 ── */
  const RECORDING_TEMPLATE = '春天的花开，秋天的月，夏天的风，冬天的雪。我在微风中轻轻吟唱，那是一首关于时光和记忆的歌。窗外的雨滴落在玻璃上，像是大自然写给大地的情书。'

  /* ── 在线录音状态 ── */
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])

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
          // webm → wav 转换
          const arrayBuf = await webmBlob.arrayBuffer()
          const audioCtx = new AudioContext()
          const audioBuf = await audioCtx.decodeAudioData(arrayBuf)
          const wavBlob = encodeWAV(audioBuf)
          audioCtx.close()
          const file = new File([wavBlob], `录音-${new Date().toLocaleTimeString('zh-CN')}.wav`, { type: 'audio/wav' })
          setCloneSample(file)
        } catch {
          // 转换失败则直接用 webm
          const file = new File([webmBlob], `录音-${new Date().toLocaleTimeString('zh-CN')}.webm`, { type: 'audio/webm' })
          setCloneSample(file)
          alert('wav转换失败，已保存为webm格式')
        }
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
    } catch {
      alert('无法访问麦克风，请检查浏览器权限设置')
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

  /* ── 下载 LRC 字幕 ── */
  /* ── 合并已生成章节音频 ── */
  const handleMergeChapters = async () => {
    if (generatedChapters.size === 0) { alert('请先生成音频'); return }
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
        alert('合并失败：' + (data.error || '未知错误'))
      }
    } catch (err) {
      alert('合并失败：' + (err instanceof Error ? err.message : String(err)))
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
    if (!designDesc.trim()) { alert('请先输入音色描述'); return }
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
        alert('润色失败：' + (data.error || '未知错误'))
      }
    } catch (err) {
      alert('润色失败：' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setPolishDescLoading(false)
    }
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
          body: JSON.stringify({ sampleBase64: `data:${mime};base64,${base64}`, sampleMimeType: mime, text: '你好，这是克隆声音的测试。', voice: cloneName.trim() }),
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
                            {generatedChapters.size > 0 && (
                <button
                  onClick={handleMergeChapters}
                  disabled={mergingChapters}
                  style={{
                    padding: '7px 18px',
                    background: mergingChapters ? '#ccc' : C.indigo,
                    color: '#fff', border: 'none', borderRadius: 20, fontSize: 12, fontWeight: 500,
                    cursor: mergingChapters ? 'default' : 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {mergingChapters ? '...' : `Merge (${generatedChapters.size})`}
                </button>
              )}
            </div>
          </header>

          {/* ── Tab 切换 ── */}
          <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.line}`, padding: '0 28px', flexShrink: 0 }}>
            {([
              { key: 'dialogue' as const, label: '对话模式', icon: '🎭' },
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

            {/* ═══ 对话模式 ═══ */}
            {activeTab === 'dialogue' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <p style={{ fontSize: 12, color: C.muted, margin: 0, flex: 1 }}>选择章节 → 自动识别对话/叙述 → 为角色分配音色 → 逐句生成</p>
                  <select value={dialogueChapterId} onChange={e => setDialogueChapterId(e.target.value)} style={{ padding: '6px 12px', border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 12, color: C.ink, background: C.card, fontFamily: 'inherit' }}>
                    <option value="">选择章节...</option>
                    {chapters.filter(c => !c.deletedAt).map((ch, ci) => <option key={`${ch.id}-${ci}`} value={ch.id}>{ch.title}</option>)}
                  </select>
                </div>
                {dialogueChapterId ? (
                  <DialogueMode
                    chapter={chapters.find(c => c.id === dialogueChapterId)!}
                    defaultVoice={defaultVoice}
                    defaultEmotion={defaultEmotion}
                    extraVoices={[
                      ...designedVoices.map(v => ({ id: v.id, name: `🎨 ${v.name}`, type: 'design' as const })),
                      ...clonedVoices.map(v => ({ id: v.id, name: `🔴 ${v.name}`, type: 'clone' as const })),
                    ]}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>🎭</div>
                    <p style={{ fontSize: 13, margin: 0 }}>请先选择一个章节，系统会自动识别对话和角色</p>
                  </div>
                )}
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
              <div style={{ maxWidth: 480 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* 音色 */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.ink, marginBottom: 6 }}>默认旁白音色</label>
                    <select value={defaultVoice} onChange={e => setDefaultVoice(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 13, color: C.ink, background: C.card, fontFamily: 'inherit' }}>
                      {allVoices.map(v => <option key={v.id} value={v.id}>{v.name} — {v.desc}</option>)}
                    </select>
                  </div>

                  {/* 情绪 */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.ink, marginBottom: 6 }}>默认情绪</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {EMOTIONS.map(em => (
                        <button key={em} onClick={() => setDefaultEmotion(em)} style={{ padding: '5px 12px', borderRadius: 14, fontSize: 12, border: `1px solid ${defaultEmotion === em ? C.pri : C.line}`, background: defaultEmotion === em ? 'rgba(196,149,106,.12)' : C.card, color: defaultEmotion === em ? C.pri : C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>{em}</button>
                      ))}
                    </div>
                  </div>

                  {/* ── 音频质量 ── */}
                  <div style={{ padding: 16, background: 'rgba(26,24,20,.02)', border: `1px solid ${C.line}`, borderRadius: C.radius }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, color: C.ink, margin: '0 0 12px' }}>🎛️ 音频质量</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: C.muted, marginBottom: 4 }}>采样率</label>
                        <select defaultValue="24000" style={{ width: '100%', padding: '6px 10px', border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 12, color: C.ink, background: C.card, fontFamily: 'inherit' }}>
                          <option value="8000">8,000 Hz（电话音质）</option>
                          <option value="16000">16,000 Hz（语音识别）</option>
                          <option value="22050">22,050 Hz（FM 广播）</option>
                          <option value="24000">24,000 Hz（标准，推荐）</option>
                          <option value="44100">44,100 Hz（CD 音质）</option>
                          <option value="48000">48,000 Hz（专业音频）</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: C.muted, marginBottom: 4 }}>位深度</label>
                        <select defaultValue="16" style={{ width: '100%', padding: '6px 10px', border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 12, color: C.ink, background: C.card, fontFamily: 'inherit' }}>
                          <option value="8">8-bit（低质量，文件小）</option>
                          <option value="16">16-bit（标准，推荐）</option>
                          <option value="24">24-bit（高质量）</option>
                          <option value="32">32-bit（录音室级别）</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: C.muted, marginBottom: 4 }}>比特率（MP3 导出时生效）</label>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {[64, 96, 128, 160, 192, 224, 256, 320].map(br => (
                          <button key={br} style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', border: `1px solid ${br === 192 ? C.pri : C.line}`, background: br === 192 ? 'rgba(196,149,106,.12)' : C.card, color: br === 192 ? C.pri : C.muted, fontWeight: br === 192 ? 600 : 400 }}>{br} kbps</button>
                        ))}
                      </div>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: C.muted, marginBottom: 4 }}>导出格式</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {[
                          { key: 'wav', label: 'WAV（无损）' },
                          { key: 'mp3-128', label: 'MP3 128k' },
                          { key: 'mp3-192', label: 'MP3 192k' },
                          { key: 'mp3-320', label: 'MP3 320k' },
                        ].map(f => (
                          <button key={f.key} style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', border: `1px solid ${f.key === 'wav' ? C.pri : C.line}`, background: f.key === 'wav' ? 'rgba(196,149,106,.12)' : C.card, color: f.key === 'wav' ? C.pri : C.muted, fontWeight: f.key === 'wav' ? 600 : 400 }}>{f.label}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 间隔 */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.ink, marginBottom: 6 }}>对话间隔</label>
                    <select defaultValue="500" style={{ width: '100%', padding: '8px 12px', border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 13, color: C.ink, background: C.card, fontFamily: 'inherit' }}>
                      <option value="300">0.3 秒（紧凑）</option>
                      <option value="500">0.5 秒（正常）</option>
                      <option value="800">0.8 秒（舒缓）</option>
                      <option value="1000">1.0 秒（缓慢）</option>
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
                {/* 上传 */}
                <div style={{ flex: 1, padding: 16, border: `2px dashed ${C.line}`, borderRadius: 8, textAlign: 'center' }}>
                  <p style={{ fontSize: 12, color: C.muted, margin: '0 0 8px' }}>📁 上传音频文件</p>
                  <input type="file" accept="audio/*" onChange={e => { setCloneSample(e.target.files?.[0] || null); if (isRecording) stopRecording() }} style={{ fontSize: 11 }} />
                  {cloneSample && !isRecording && !cloneSample.name.startsWith('录音') && <p style={{ fontSize: 11, color: C.green, margin: '8px 0 0' }}>✓ {cloneSample.name}</p>}
                </div>
                {/* 录音 */}
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
