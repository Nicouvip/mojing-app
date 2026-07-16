'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import type { Chapter } from '@/lib/db/types'
import { processAnalysisResult } from '@/lib/audiobook/merge-segments'
import {
  type CharacterAnalysis,
  type SegmentAnalysis,
  type AnalysisResult,
  AVAILABLE_VOICES,
  EMOTION_PRESETS,
} from '@/lib/audiobook/prompts'

/* ── 颜色系统 ── */
const C = {
  pri: '#c4956a',
  ink: '#1a1814',
  muted: 'rgba(26,24,20,.45)',
  line: 'rgba(26,24,20,.06)',
  card: '#fff',
  indigo: '#3a5279',
  crimson: '#b5454a',
  green: '#7a9e7a',
  radius: 8,
}

const SEGMENT_COLORS = {
  narration: '#999',
  dialogue: '#c4956a',
}

/* ── 段落快照类型（撤回/重做用） ── */
type SegSnapshot = {
  segments: SegmentAnalysis[]
  characters: CharacterAnalysis[]
}

interface Props {
  chapter: Chapter
  defaultVoice: string
  defaultEmotion: string
}

export function DialogueMode({ chapter, defaultVoice, defaultEmotion }: Props) {
  /* ── 状态 ── */
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzingElapsed, setAnalyzingElapsed] = useState(0)
  const [analyzeError, setAnalyzeError] = useState('')
  const [editedSegments, setEditedSegments] = useState<SegmentAnalysis[]>([])
  const [editedCharacters, setEditedCharacters] = useState<CharacterAnalysis[]>([])

  /* ── 筛选 + 多选 ── */
  const [filterTab, setFilterTab] = useState<string>('all')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  /* ── 撤回/重做栈 ── */
  const [undoStack, setUndoStack] = useState<SegSnapshot[]>([])
  const [redoStack, setRedoStack] = useState<SegSnapshot[]>([])

  /* ── 分析结果缓存（localStorage） ── */
  const CACHE_KEY = `mojing_analysis_${chapter.id}`

  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const data = JSON.parse(cached)
        setAnalysisResult(data)
        setEditedCharacters(data.characters || [])
        setEditedSegments(data.segments || [])
      }
    } catch { /* ignore corrupted cache */ }
  }, [chapter.id])

  /* ── 生成状态 ── */
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [audioCache, setAudioCache] = useState<Record<string, { audioBase64: string; duration: number }>>({})
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioUrlRef = useRef<string | null>(null)

  const segments = editedSegments.length > 0 ? editedSegments : []
  const characters = editedCharacters.length > 0 ? editedCharacters : []

  /* ── 分析计时器 ── */
  useEffect(() => {
    if (!analyzing) { setAnalyzingElapsed(0); return }
    const t = setInterval(() => setAnalyzingElapsed(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [analyzing])

  /* ── 筛选后的段落列表 ── */
  const filteredSegments = useMemo(() => {
    if (filterTab === 'all') return segments
    if (filterTab === 'narration') return segments.filter(s => s.type === 'narration')
    return segments.filter(s => s.type === 'dialogue' && s.characterName === filterTab)
  }, [segments, filterTab])

  /* ── 筛选 Tab 列表 ── */
  const filterTabs = useMemo(() => {
    const tabs: Array<{ id: string; label: string; count: number }> = [
      { id: 'all', label: '全部', count: segments.length },
      { id: 'narration', label: '🎙️ 旁白', count: segments.filter(s => s.type === 'narration').length },
    ]
    const charNames = [...new Set(segments.filter(s => s.type === 'dialogue' && s.characterName).map(s => s.characterName!))].filter(Boolean)
    for (const name of charNames) {
      tabs.push({ id: name, label: name, count: segments.filter(s => s.characterName === name).length })
    }
    return tabs
  }, [segments])

  /* ── 撤回/重做 ── */
  const pushUndo = useCallback(() => {
    setUndoStack(prev => [...prev.slice(-30), { segments: [...editedSegments], characters: [...editedCharacters] }])
    setRedoStack([])
  }, [editedSegments, editedCharacters])

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return
    const last = undoStack[undoStack.length - 1]
    setRedoStack(prev => [...prev, { segments: [...editedSegments], characters: [...editedCharacters] }])
    setEditedSegments(last.segments)
    setEditedCharacters(last.characters)
    setUndoStack(prev => prev.slice(0, -1))
  }, [undoStack, editedSegments, editedCharacters])

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return
    const next = redoStack[redoStack.length - 1]
    setUndoStack(prev => [...prev, { segments: [...editedSegments], characters: [...editedCharacters] }])
    setEditedSegments(next.segments)
    setEditedCharacters(next.characters)
    setRedoStack(prev => prev.slice(0, -1))
  }, [redoStack, editedSegments, editedCharacters])

  /* ── 多选操作 ── */
  const toggleSelect = (idx: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }
  const selectAll = () => setSelectedIds(new Set(filteredSegments.map(s => s.index)))
  const clearSelection = () => setSelectedIds(new Set())

  /* ── 导出功能 ── */
  const exportText = (segs: SegmentAnalysis[], title: string) => {
    const lines = segs.map(s => {
      const prefix = s.type === 'dialogue' ? `「${s.characterName || '未知'}」` : '【旁白】'
      return `${prefix}${s.text}`
    })
    const text = `=== ${title} ===\n角色数：${characters.length}，段落数：${segs.length}\n\n${lines.join('\n\n')}`
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${chapter.title}-${title}.txt`; a.click()
    URL.revokeObjectURL(url)
  }
  const exportCurrentFilter = () => exportText(filteredSegments, filterTab === 'all' ? '全部' : filterTab === 'narration' ? '旁白' : filterTab)
  const exportAllByOrder = () => exportText(segments, '全部（按顺序）')
  const exportSelected = () => {
    const sel = segments.filter(s => selectedIds.has(s.index))
    if (sel.length === 0) { alert('请先勾选要导出的段落'); return }
    exportText(sel, '选中段落')
  }

  /* ── Step 1: AI 分析 ── */
  const handleAnalyze = async () => {
    if (!chapter.content) { alert('该章节暂无内容'); return }
    setAnalyzing(true)
    setAnalyzeError('')
    try {
      const res = await fetch('/api/audiobook/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: chapter.content }),
      })
      const data = await res.json()
      if (data.success) {
        const processed = processAnalysisResult(data.segments || [], data.characters || [])
        setAnalysisResult({ ...data, segments: processed.segments, characters: processed.characters })
        setEditedCharacters(processed.characters || [])
        setEditedSegments(processed.segments || [])
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)) } catch { /* quota exceeded */ }
      } else {
        setAnalyzeError(data.error || '分析失败')
      }
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : '网络错误')
    } finally {
      setAnalyzing(false)
    }
  }

  /* ── 手动设置模式：按行拆段，默认旁白 ── */
  const handleManualSetup = () => {
    if (!chapter.content) { alert('该章节暂无内容'); return }
    const lines = chapter.content.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    const newSegments: SegmentAnalysis[] = lines.map((line, i) => ({
      index: i,
      type: 'narration' as const,
      text: line,
      emotion: defaultEmotion || '平静',
      emotionIntensity: 5,
      speed: 'normal' as const,
      needsPause: false,
      pauseAfter: 'short' as const,
      specialNote: '',
      recommendedVoice: defaultVoice,
      recommendedEmotion: defaultEmotion || '平静',
      characterName: undefined,
    }))
    const defaultChar: CharacterAnalysis = {
      name: '旁白',
      personality: '',
      gender: 'female',
      age: 'adult',
      recommendedVoice: defaultVoice,
      recommendedEmotion: defaultEmotion || '平静',
    }
    setAnalysisResult({ characters: [defaultChar], segments: newSegments, narrationStyle: { overallTone: '平静', suggestedNarratorVoice: defaultVoice, pacing: 'normal' } })
    setEditedCharacters([defaultChar])
    setEditedSegments(newSegments)
    setUndoStack([])
    setRedoStack([])
  }

  /* ── Step 2: 用户微调角色音色 ── */
  const updateCharacterVoice = (name: string, voiceId: string) => {
    pushUndo()
    setEditedCharacters(prev => prev.map(c => c.name === name ? { ...c, recommendedVoice: voiceId } : c))
    setEditedSegments(prev => prev.map(s => s.characterName === name ? { ...s, recommendedVoice: voiceId } : s))
  }

  const updateCharacterEmotion = (name: string, emotion: string) => {
    pushUndo()
    setEditedCharacters(prev => prev.map(c => c.name === name ? { ...c, recommendedEmotion: emotion } : c))
  }

  /* ── Step 2b: 用户微调单段 ── */
  const updateSegmentEmotion = (index: number, emotion: string) => {
    pushUndo()
    setEditedSegments(prev => prev.map((s, i) => i === index ? { ...s, emotion } : s))
  }
  const updateSegmentVoice = (index: number, voiceId: string) => {
    pushUndo()
    setEditedSegments(prev => prev.map((s, i) => i === index ? { ...s, recommendedVoice: voiceId } : s))
  }
  const updateSegmentSpeed = (index: number, speed: 'slow' | 'normal' | 'fast') => {
    pushUndo()
    setEditedSegments(prev => prev.map((s, i) => i === index ? { ...s, speed } : s))
  }
  const updateSegmentIntensity = (index: number, intensity: number) => {
    setEditedSegments(prev => prev.map((s, i) => i === index ? { ...s, emotionIntensity: Math.max(1, Math.min(10, intensity)) } : s))
  }
  const updateSegmentText = (index: number, text: string) => {
    setEditedSegments(prev => prev.map((s, i) => i === index ? { ...s, text } : s))
  }
  const updateSegmentType = (index: number, type: 'narration' | 'dialogue', characterName?: string) => {
    pushUndo()
    setEditedSegments(prev => prev.map((s, i) => i === index ? { ...s, type, characterName: type === 'narration' ? undefined : (characterName || s.characterName) } : s))
  }

  /* ── Step 3: 生成单段 ── */
  const generateOne = async (seg: SegmentAnalysis) => {
    if (generatingId) return
    const segKey = `seg-${seg.index}`
    setGeneratingId(segKey)
    try {
      const voice = seg.recommendedVoice || defaultVoice
      const emotion = seg.emotion || defaultEmotion
      const res = await fetch('/api/audiobook/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: seg.text,
          voice,
          emotion: emotion !== '平静' ? emotion : undefined,
          emotionIntensity: seg.emotionIntensity,
          speed: seg.speed,
          specialNote: seg.specialNote,
        }),
      })
      const data = await res.json()
      if (data.success && data.audio) {
        setAudioCache(prev => ({ ...prev, [segKey]: { audioBase64: data.audio, duration: data.duration } }))
      }
    } catch (err) {
      console.error('Generate failed:', err)
    } finally {
      setGeneratingId(null)
    }
  }

  /* ── 全部生成 ── */
  const [batchGenerating, setBatchGenerating] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 })
  /* ── 合并导出 ── */
  const [merging, setMerging] = useState(false)
  const [generatingPersonas, setGeneratingPersonas] = useState(false)
  const [personaProgress, setPersonaProgress] = useState({ current: 0, total: 0, currentName: '' })
  const [designedVoices, setDesignedVoices] = useState<Array<{ id: string; name: string; voiceDesc: string; audioBase64: string }>>([])
  const [exportFormat, setExportFormat] = useState<'wav' | 'mp3'>('wav')

  const handleGenerateAll = async () => {
    if (batchGenerating) return
    setBatchGenerating(true)
    const todo = segments.filter(s => !audioCache[`seg-${s.index}`])
    setBatchProgress({ current: 0, total: todo.length })
    for (let i = 0; i < todo.length; i++) {
      setBatchProgress({ current: i + 1, total: todo.length })
      await generateOne(todo[i])
    }
    setBatchGenerating(false)
  }

  /* ── 合并全部并导出 ── */
  const handleMergeExport = async () => {
    const audioKeys = Object.keys(audioCache)
    if (audioKeys.length === 0) { alert('请先生成音频'); return }
    setMerging(true)
    try {
      const segs = audioKeys.map(k => ({ audioBase64: audioCache[k].audioBase64, duration: audioCache[k].duration }))
      const res = await fetch('/api/audiobook/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segments: segs, format: exportFormat }),
      })
      const data = await res.json()
      if (data.success && data.audio) {
        const mime = exportFormat === 'mp3' ? 'audio/mpeg' : 'audio/wav'
        const ext = exportFormat === 'mp3' ? 'mp3' : 'wav'
        const bin = atob(data.audio)
        const bytes = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
        const blob = new Blob([bytes], { type: mime })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `${chapter.title || '有声书'}.${ext}`; a.click()
        URL.revokeObjectURL(url)
      } else {
        alert('合并失败：' + (data.error || '未知错误'))
      }
    } catch (err) {
      alert('合并失败：' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setMerging(false)
    }
  }

  /* ── 人格自动生成音色 ── */
  const handleGeneratePersonas = async () => {
    const chars = characters.filter(c => c.name !== '旁白' && c.personality)
    if (chars.length === 0) { alert('没有可生成的角色（需要角色有性格描述）'); return }
    setGeneratingPersonas(true)
    setPersonaProgress({ current: 0, total: chars.length, currentName: '' })
    const newVoices: Array<{ id: string; name: string; voiceDesc: string; audioBase64: string }> = []

    for (const ch of chars) {
      setPersonaProgress({ current: newVoices.length, total: chars.length, currentName: ch.name })
      const gender = ch.gender === 'male' ? '男性' : '女性'
      const ageMap: Record<string, string> = { child: '少年', young: '青年', adult: '中年', elderly: '老年' }
      const age = ageMap[ch.age] || '成年'
      const desc = `${gender}，${age}，性格${ch.personality}。请生成一个与角色性格匹配的专属音色。`

      try {
        const res = await fetch('/api/audiobook/voices/design', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: desc, text: `我是${ch.name}，这是我的声音。` }),
        })
        const data = await res.json()
        if (data.success && data.audio) {
          const id = `persona-${ch.name}-${Date.now()}`
          newVoices.push({ id, name: ch.name, voiceDesc: desc.slice(0, 50), audioBase64: data.audio })
          // 自动推荐给角色
          updateCharacterVoice(ch.name, id)
        }
      } catch (err) {
        console.error(`Persona generation failed for ${ch.name}:`, err)
      }
    }

    setDesignedVoices(prev => [...prev, ...newVoices])
    setGeneratingPersonas(false)
    if (newVoices.length > 0) {
      alert(`已为 ${newVoices.length} 个角色生成专属音色：${newVoices.map(v => v.name).join('、')}`)
    } else {
      alert('音色生成失败，请检查 API 连接后重试')
    }
  }

  /* ── 播放 ── */
  const playBase64 = useCallback((base64: string, id: string) => {
    const bin = atob(base64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }))
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    audioUrlRef.current = url
    if (audioRef.current) {
      audioRef.current.src = url
      audioRef.current.play()
      setPlayingId(id)
    }
  }, [])

  const getCharColor = (name: string) => {
    const idx = characters.findIndex(c => c.name === name)
    return ['#c4956a', '#3a5279', '#b5454a', '#7a9e7a', '#8e63ce', '#d4a0a0', '#4a86e8', '#eaa041'][idx % 8]
  }


  /* ── 导入画本（TXT/JSON/DOCX） ── */
  const importBookRef = useRef<HTMLInputElement>(null)
  const [importBookLoading, setImportBookLoading] = useState(false)

  const handleImportBook = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportBookLoading(true)
    try {
      const isDocx = file.name.endsWith('.docx')

      if (isDocx) {
        /* ── DOCX：通过 FormData 上传二进制文件 ── */
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/audiobook/import-docx', { method: 'POST', body: formData })
        const data = await res.json()
        if (data.success) {
          const processed = processAnalysisResult(data.segments || [], data.characters || [])
          setAnalysisResult({ ...data, segments: processed.segments, characters: processed.characters })
          setEditedCharacters(processed.characters || [])
          setEditedSegments(processed.segments || [])
          try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)) } catch {}
        } else {
          alert('导入画本失败：' + (data.error || '格式错误'))
        }
      } else {
        /* ── TXT/JSON：原有逻辑 ── */
        const arrayBuf = await file.arrayBuffer()
        let fileContent = new TextDecoder('utf-8').decode(arrayBuf)
        const ffdCount = (fileContent.match(/\uFFFD/g) || []).length
        if (ffdCount > 10) fileContent = new TextDecoder('gbk').decode(arrayBuf)
        const isJson = file.name.endsWith('.json')
        const res = await fetch('/api/audiobook/import-book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ format: isJson ? 'json' : 'txt', content: fileContent }),
        })
        const data = await res.json()
        if (data.success) {
          const processed = processAnalysisResult(data.segments || [], data.characters || [])
          setAnalysisResult({ ...data, segments: processed.segments, characters: processed.characters })
          setEditedCharacters(processed.characters || [])
          setEditedSegments(processed.segments || [])
          try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)) } catch {}
        } else {
          alert('导入画本失败：' + (data.error || '格式错误'))
        }
      }
    } catch (err) {
      alert('导入失败：' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setImportBookLoading(false)
      if (importBookRef.current) importBookRef.current.value = ''
    }
  }

  /* ═══════════════════════════════════════════════════════════
     UI：三选一入口（空状态）
     ═══════════════════════════════════════════════════════════ */
  if (!analysisResult) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📖</div>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: C.ink, margin: '0 0 8px' }}>选择配音方式</h3>
        <p style={{ fontSize: 13, color: C.muted, margin: '0 0 32px' }}>
          为「{chapter.title}」选择一种开始方式
        </p>

        {/* 三选一卡片 */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 700, margin: '0 auto' }}>
          {/* AI 分析 */}
          <button onClick={handleAnalyze} disabled={analyzing}
            style={{
              width: 200, padding: '32px 20px', background: C.card,
              border: `1px solid ${C.line}`, borderRadius: 12,
              cursor: analyzing ? 'default' : 'pointer', fontFamily: 'inherit', textAlign: 'center',
              transition: 'all .15s', boxShadow: '0 2px 8px rgba(0,0,0,.04)',
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>🤖</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 6 }}>
              {analyzing ? `AI 分析中… ${analyzingElapsed}s` : 'AI 分析'}
            </div>
            <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
              自动识别角色<br />推荐音色和情绪
            </div>
          </button>

          {/* 手动设置 */}
          <button onClick={handleManualSetup}
            style={{
              width: 200, padding: '32px 20px', background: C.card,
              border: `1px solid ${C.line}`, borderRadius: 12,
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
              transition: 'all .15s', boxShadow: '0 2px 8px rgba(0,0,0,.04)',
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>✏️</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 6 }}>手动设置</div>
            <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
              按行拆段<br />默认全部旁白
            </div>
          </button>

          {/* 导入画本 */}
          <button onClick={() => importBookRef.current?.click()} disabled={importBookLoading}
            style={{
              width: 200, padding: '32px 20px', background: C.card,
              border: `1px solid ${C.line}`, borderRadius: 12,
              cursor: importBookLoading ? 'default' : 'pointer', fontFamily: 'inherit', textAlign: 'center',
              transition: 'all .15s', boxShadow: '0 2px 8px rgba(0,0,0,.04)',
              opacity: importBookLoading ? 0.6 : 1,
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 6 }}>
              {importBookLoading ? '导入中...' : '导入画本'}
            </div>
            <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
              TXT / JSON / DOCX<br />跳过 AI 分析
            </div>
          </button>
        </div>

        <input ref={importBookRef} type="file" accept=".txt,.json,.docx" onChange={handleImportBook} style={{ display: 'none' }} />

        {/* 分析错误 */}
        {analyzing && (
          <p style={{ fontSize: 11, color: C.muted, margin: '16px 0 0', textAlign: 'center' }}>
            DeepSeek V4 Flash 正在分析章节文本，预计 30-60 秒，请耐心等待…
          </p>
        )}
        {analyzeError && (
          <div style={{ marginTop: 16, padding: 12, background: 'rgba(181,69,74,.08)', borderRadius: 8, fontSize: 12, color: C.crimson, maxWidth: 400, margin: '16px auto 0' }}>
            ❌ {analyzeError}
          </div>
        )}

        <div style={{ marginTop: 32, fontSize: 11, color: C.muted, maxWidth: 400, margin: '32px auto 0', lineHeight: 1.8 }}>
          <p style={{ margin: '0 0 4px' }}>💡 完成后，你可以：</p>
          <p style={{ margin: 0 }}>• 修改每个段落的文本、角色、情绪</p>
          <p style={{ margin: 0 }}>• 调整情绪强度（1-10滑动条）</p>
          <p style={{ margin: 0 }}>• 撤回/重做操作（Ctrl+Z / Ctrl+Y）</p>
          <p style={{ margin: 0 }}>• 单段生成、试听、导出</p>
        </div>
      </div>
    )
  }

  /* ═══════════════════════════════════════════════════════════
     UI：分析完成后 — 左角色列表 + 右段落列表
     ═══════════════════════════════════════════════════════════ */
  return (
    <div style={{ display: 'flex', gap: 20, minHeight: 500 }} onKeyDown={e => {
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); handleUndo() }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); handleRedo() }
    }}>
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} />

      {/* ═══ 左侧：角色列表 + 旁白 ═══ */}
      <div style={{ width: 260, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: C.ink, margin: 0 }}>🎭 角色音色</h3>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={handleUndo} disabled={undoStack.length === 0}
              style={{ padding: '4px 8px', fontSize: 11, border: `1px solid ${C.line}`, borderRadius: 4, background: C.card, color: undoStack.length > 0 ? C.ink : C.muted, cursor: undoStack.length > 0 ? 'pointer' : 'default', fontFamily: 'inherit' }}
              title="撤回 (Ctrl+Z)">↩️</button>
            <button onClick={handleRedo} disabled={redoStack.length === 0}
              style={{ padding: '4px 8px', fontSize: 11, border: `1px solid ${C.line}`, borderRadius: 4, background: C.card, color: redoStack.length > 0 ? C.ink : C.muted, cursor: redoStack.length > 0 ? 'pointer' : 'default', fontFamily: 'inherit' }}
              title="重做 (Ctrl+Y)">↪️</button>
            <button onClick={() => { setAnalysisResult(null); setEditedCharacters([]); setEditedSegments([]); setAudioCache({}); setUndoStack([]); setRedoStack([]); try { localStorage.removeItem(CACHE_KEY) } catch {} }}
              style={{ padding: '4px 10px', fontSize: 11, border: `1px solid ${C.line}`, borderRadius: 4, background: C.card, color: C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
              重新选择
            </button>
          </div>
        </div>

        {/* 旁白 */}
        <div style={{ padding: 10, background: 'rgba(26,24,20,.02)', border: `1px solid ${C.line}`, borderRadius: C.radius, marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.ink, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#999' }} />
            旁白
          </div>
          <select
            value={characters.find(c => c.name === '旁白')?.recommendedVoice || defaultVoice}
            onChange={e => updateCharacterVoice('旁白', e.target.value)}
            style={{ width: '100%', padding: '4px 6px', border: `1px solid ${C.line}`, borderRadius: 4, fontSize: 11, fontFamily: 'inherit', marginBottom: 4 }}
          >
            {AVAILABLE_VOICES.map(v => <option key={v.id} value={v.id}>{v.name} — {v.style.split('，')[0]}</option>)}
          </select>
        </div>

        {/* 角色列表 */}
        {characters.filter(c => c.name !== '旁白').map(ch => (
          <div key={ch.name} style={{ padding: 10, background: 'rgba(26,24,20,.02)', border: `1px solid ${C.line}`, borderRadius: C.radius, marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: getCharColor(ch.name), marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: getCharColor(ch.name) }} />
              {ch.name}
              <span style={{ fontWeight: 400, color: C.muted }}>({ch.gender === 'male' ? '男' : '女'}·{ch.age === 'young' ? '青年' : ch.age === 'adult' ? '中年' : ch.age === 'child' ? '少年' : '老年'})</span>
            </div>
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>{ch.personality}</div>
            <select value={ch.recommendedVoice} onChange={e => updateCharacterVoice(ch.name, e.target.value)} style={{ width: '100%', padding: '4px 6px', border: `1px solid ${C.line}`, borderRadius: 4, fontSize: 11, fontFamily: 'inherit', marginBottom: 4 }}>
              {AVAILABLE_VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <select value={ch.recommendedEmotion} onChange={e => updateCharacterEmotion(ch.name, e.target.value)} style={{ width: '100%', padding: '4px 6px', border: `1px solid ${C.line}`, borderRadius: 4, fontSize: 11, fontFamily: 'inherit' }}>
              {EMOTION_PRESETS.map(em => <option key={em.id} value={em.id}>{em.label}</option>)}
            </select>
          </div>
        ))}

        {/* 操作按钮 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
          <button onClick={handleGeneratePersonas} disabled={generatingPersonas || characters.length === 0}
            style={{ padding: '8px 0', background: '#8e63ce', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, color: '#fff', cursor: generatingPersonas || characters.length === 0 ? 'default' : 'pointer', fontFamily: 'inherit', opacity: generatingPersonas || characters.length === 0 ? 0.6 : 1 }}>
            {generatingPersonas ? `🎭 ${personaProgress.current}/${personaProgress.total} ${personaProgress.currentName}` : '🎭 生成角色音色'}
          </button>
          <button onClick={handleGenerateAll} disabled={batchGenerating || segments.length === 0} style={{ padding: '8px 0', background: C.pri, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, color: '#fff', cursor: batchGenerating ? 'default' : 'pointer', fontFamily: 'inherit', opacity: batchGenerating || segments.length === 0 ? 0.6 : 1 }}>
            {batchGenerating ? `⏳ ${batchProgress.current}/${batchProgress.total}` : '🎵 一键生成全部'}
          </button>
          {/* 合并导出 */}
          <div style={{ display: 'flex', gap: 4 }}>
            <select value={exportFormat} onChange={e => setExportFormat(e.target.value as 'wav' | 'mp3')}
              style={{ padding: '4px 6px', border: `1px solid ${C.line}`, borderRadius: 4, fontSize: 10, fontFamily: 'inherit', color: C.ink, background: C.card, flex: 1 }}>
              <option value="wav">WAV 无损</option>
              <option value="mp3">MP3 压缩</option>
              <option value="m4b">M4B 有声书</option>
            </select>
            <button onClick={handleMergeExport} disabled={merging || Object.keys(audioCache).length === 0}
              style={{ padding: '8px 12px', background: C.indigo, border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 500, color: '#fff', cursor: merging || Object.keys(audioCache).length === 0 ? 'default' : 'pointer', fontFamily: 'inherit', opacity: merging || Object.keys(audioCache).length === 0 ? 0.6 : 1, flex: 2 }}>
              {merging ? '⏳ 合并中...' : `🔗 合并导出 (${Object.keys(audioCache).length}段)`}
            </button>
          </div>
        </div>

        {/* 统计 */}
        <div style={{ marginTop: 12, padding: 10, background: 'rgba(26,24,20,.02)', borderRadius: C.radius, fontSize: 11, color: C.muted }}>
          <div>段落：{segments.length}</div>
          <div>对话：{segments.filter(s => s.type === 'dialogue').length}</div>
          <div>叙述：{segments.filter(s => s.type === 'narration').length}</div>
          <div>已生成：{Object.keys(audioCache).length}/{segments.length}</div>
        </div>
      </div>

      {/* ═══ 右侧：筛选Tab + 导出 + 段落列表 ═══ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, overflow: 'hidden' }}>
        {/* 筛选 Tab 栏 */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', padding: '0 0 8px', borderBottom: `1px solid ${C.line}` }}>
          {filterTabs.map(tab => (
            <button key={tab.id} onClick={() => { setFilterTab(tab.id); clearSelection() }}
              style={{ padding: '4px 12px', borderRadius: 14, fontSize: 11, border: 'none', background: filterTab === tab.id ? C.pri : 'rgba(26,24,20,.04)', color: filterTab === tab.id ? '#fff' : C.muted, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', fontWeight: filterTab === tab.id ? 600 : 400 }}>
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* 导出按钮行 + 多选控制 */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={exportCurrentFilter} style={{ padding: '4px 10px', fontSize: 11, border: `1px solid ${C.line}`, borderRadius: 4, background: C.card, color: C.ink, cursor: 'pointer', fontFamily: 'inherit' }}>
            📋 导出当前筛选
          </button>
          <button onClick={exportAllByOrder} style={{ padding: '4px 10px', fontSize: 11, border: `1px solid ${C.line}`, borderRadius: 4, background: C.card, color: C.ink, cursor: 'pointer', fontFamily: 'inherit' }}>
            📋 按顺序导出全部
          </button>
          <button onClick={selectAll} style={{ padding: '4px 10px', fontSize: 11, border: `1px solid ${C.line}`, borderRadius: 4, background: C.card, color: C.ink, cursor: 'pointer', fontFamily: 'inherit' }}>
            ☑️ 全选当前
          </button>
          <button onClick={clearSelection} style={{ padding: '4px 10px', fontSize: 11, border: `1px solid ${C.line}`, borderRadius: 4, background: C.card, color: C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
            取消全选
          </button>
          {selectedIds.size > 0 && (
            <button onClick={exportSelected} style={{ padding: '4px 10px', fontSize: 11, border: 'none', borderRadius: 4, background: C.indigo, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
              📋 导出选中 ({selectedIds.size})
            </button>
          )}
        </div>

        {/* 段落列表 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, overflow: 'auto' }}>
          {filteredSegments.map((seg) => {
            const globalIdx = segments.findIndex(s => s.index === seg.index)
            const isDialogue = seg.type === 'dialogue'
            const color = isDialogue && seg.characterName ? getCharColor(seg.characterName) : SEGMENT_COLORS.narration
            const segKey = `seg-${seg.index}`
            const audio = audioCache[segKey]
            const isPlaying = playingId === segKey
            const isGen = generatingId === segKey
            const isSelected = selectedIds.has(seg.index)

            return (
              <div key={seg.index} style={{
                padding: '10px 14px',
                background: isSelected ? `${color}10` : isPlaying ? `${color}10` : C.card,
                borderTop: `1px solid ${isSelected ? color : isPlaying ? color : C.line}`,
                borderRight: `1px solid ${isSelected ? color : isPlaying ? color : C.line}`,
                borderBottom: `1px solid ${isSelected ? color : isPlaying ? color : C.line}`,
                borderLeft: `3px solid ${color}`,
                borderRadius: C.radius,
                transition: 'all .12s',
              }}>
                {/* 标签行 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                  {/* 多选复选框 */}
                  <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(seg.index)}
                    style={{ accentColor: C.pri, width: 14, height: 14, cursor: 'pointer', flexShrink: 0 }} />

                  {/* 类型切换 */}
                  <select value={seg.type} onChange={e => updateSegmentType(globalIdx, e.target.value as 'narration' | 'dialogue')}
                    style={{ padding: '1px 4px', border: `1px solid ${C.line}`, borderRadius: 3, fontSize: 10, fontFamily: 'inherit', color: C.ink, background: C.card }}>
                    <option value="narration">叙述</option>
                    <option value="dialogue">对话</option>
                  </select>

                  {isDialogue && seg.characterName ? (
                    <span style={{ fontSize: 10, padding: '1px 6px', background: `${color}18`, borderRadius: 8, color, fontWeight: 600 }}>{seg.characterName}</span>
                  ) : (
                    <span style={{ fontSize: 10, padding: '1px 6px', background: 'rgba(26,24,20,.06)', borderRadius: 8, color: C.muted }}>叙述</span>
                  )}

                  {/* 情绪微调 */}
                  <select value={seg.emotion} onChange={e => updateSegmentEmotion(globalIdx, e.target.value)} style={{ padding: '1px 4px', border: `1px solid ${C.line}`, borderRadius: 3, fontSize: 10, fontFamily: 'inherit', color: C.ink, background: C.card }}>
                    {EMOTION_PRESETS.map(em => <option key={em.id} value={em.id}>{em.label}</option>)}
                  </select>

                  {/* 情绪强度滑动条 */}
                  <span style={{ fontSize: 10, color: C.muted, whiteSpace: 'nowrap' }}>强度</span>
                  <input type="range" min={1} max={10} step={1} value={seg.emotionIntensity}
                    onChange={e => updateSegmentIntensity(globalIdx, parseInt(e.target.value))}
                    style={{ width: 60, accentColor: C.pri, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 10, color: C.ink, minWidth: 14, textAlign: 'center' }}>{seg.emotionIntensity}</span>

                  <select value={seg.speed} onChange={e => updateSegmentSpeed(globalIdx, e.target.value as 'slow' | 'normal' | 'fast')} style={{ padding: '1px 4px', border: `1px solid ${C.line}`, borderRadius: 3, fontSize: 10, fontFamily: 'inherit', color: C.ink, background: C.card }}>
                    <option value="slow">慢速</option>
                    <option value="normal">正常</option>
                    <option value="fast">快速</option>
                  </select>

                  {seg.needsPause && <span style={{ fontSize: 10, color: C.muted }}>⏸停顿</span>}
                  {seg.specialNote && <span style={{ fontSize: 10, color: C.indigo }} title={seg.specialNote}>📝</span>}

                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: 10, color: C.muted }}>#{seg.index + 1}</span>
                  {audio && <span style={{ fontSize: 10, color: C.green }}>✓ {Math.floor(audio.duration)}s</span>}
                </div>

                {/* 文本（textarea 可编辑） */}
                <textarea
                  value={isDialogue ? `「${seg.text}」` : seg.text}
                  onChange={e => {
                    let val = e.target.value
                    if (isDialogue) {
                      // 保持「」包裹
                      if (val.startsWith('「') && val.endsWith('」')) val = val.slice(1, -1)
                    }
                    updateSegmentText(globalIdx, val)
                  }}
                  rows={seg.text.length > 80 ? 3 : seg.text.length > 40 ? 2 : 1}
                  style={{
                    width: '100%', fontSize: 13, lineHeight: 1.7, color: C.ink,
                    border: 'none', background: 'transparent', resize: 'vertical',
                    fontFamily: 'inherit', padding: 0, outline: 'none',
                  }}
                />

                {/* 操作行：生成/重新生成 + 播放/暂停 + 导出 */}
                <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
                  {audio ? (
                    /* 已生成 → 重新生成 + 播放 + 导出 */
                    <>
                      <button onClick={() => generateOne(seg)} disabled={isGen || !!generatingId}
                        style={{ padding: '2px 8px', fontSize: 11, border: `1px solid ${C.line}`, borderRadius: 4, background: C.card, color: isGen ? C.pri : C.muted, cursor: isGen ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                        {isGen ? '⏳...' : '🔄 重新生成'}
                      </button>
                      <button onClick={() => playBase64(audio.audioBase64, segKey)}
                        style={{ padding: '2px 8px', fontSize: 11, border: `1px solid ${isPlaying ? C.pri : C.line}`, borderRadius: 4, background: isPlaying ? 'rgba(196,149,106,.12)' : C.card, color: isPlaying ? C.pri : C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {isPlaying ? '⏸' : '▶ 播放'}
                      </button>
                      <button onClick={() => {
                        // 单段导出
                        const bin = atob(audio.audioBase64)
                        const bytes = new Uint8Array(bin.length)
                        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
                        const blob = new Blob([bytes], { type: 'audio/wav' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url; a.download = `${chapter.title || '段落'}-${seg.index + 1}.wav`; a.click()
                        URL.revokeObjectURL(url)
                      }}
                        style={{ padding: '2px 8px', fontSize: 11, border: `1px solid ${C.line}`, borderRadius: 4, background: C.card, color: C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
                        📥 导出
                      </button>
                    </>
                  ) : (
                    /* 未生成 → 生成按钮 */
                    <button onClick={() => generateOne(seg)} disabled={isGen || !!generatingId}
                      style={{ padding: '2px 8px', fontSize: 11, border: `1px solid ${C.line}`, borderRadius: 4, background: C.card, color: isGen ? C.pri : C.muted, cursor: isGen ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                      {isGen ? '⏳...' : '🎵 生成'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
