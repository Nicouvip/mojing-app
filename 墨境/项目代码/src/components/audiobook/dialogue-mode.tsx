'use client'
import { toast } from 'sonner'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import type { Chapter } from '@/lib/db/types'
import { processAnalysisResult } from '@/lib/audiobook/merge-segments'
import { saveDialogueAudioCache, loadDialogueAudioCache, clearDialogueAudioCache } from '@/lib/audiobook/audio-persistence'
import { XFYUN_VOICES } from '@/lib/audiobook/xfyun-tts'
import {
  type CharacterAnalysis,
  type SegmentAnalysis,
  type AnalysisResult,
  AVAILABLE_VOICES,
  EMOTION_PRESETS,
} from '@/lib/audiobook/prompts'
import { parseBracketDialogue, parseTextToSegments, extractCharacters } from '@/lib/audiobook/text-parser'
import { EmotionChart } from '@/components/audiobook/emotion-chart'
import { CharacterGraph } from '@/components/audiobook/character-graph'
import { ContextEditor } from '@/components/audiobook/context-editor'
import { EngineSelector, type EngineType } from '@/components/audiobook/engine-selector'

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
  extraVoices?: Array<{ id: string; name: string; type?: string }>
  ttsEngine?: EngineType
}

export function DialogueMode({ chapter, defaultVoice, defaultEmotion, extraVoices = [], ttsEngine = 'normal' }: Props) {
  /* ── 工作流步骤 ── */
  const [workflowStep, setWorkflowStep] = useState(0)
  
  /* ── 状态 ── */
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzingElapsed, setAnalyzingElapsed] = useState(0)
  const [analyzeError, setAnalyzeError] = useState('')
  const [editedSegments, setEditedSegments] = useState<SegmentAnalysis[]>([])

  /* ── 题材识别 ── */
  const [genre, setGenre] = useState<{ genre: string; confidence: string; suggestedStyle: string; suggestedPacing: string } | null>(null)
  const [genreLoading, setGenreLoading] = useState(false)
  const [editedCharacters, setEditedCharacters] = useState<CharacterAnalysis[]>([])

  /* ── 筛选 + 多选 ── */
  const [filterTab, setFilterTab] = useState<string>('all')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  /* ── 双模式导入 ── */
  const [importMode, setImportMode] = useState<'standard' | 'free'>('free')
  const [outputMode, setOutputMode] = useState<'full' | 'narration' | 'dialogue'>('full')
  const [manualText, setManualText] = useState('')
  const [dragOver, setDragOver] = useState(false)

  /* ── 撤回/重做栈 ── */
  const [undoStack, setUndoStack] = useState<SegSnapshot[]>([])
  const [redoStack, setRedoStack] = useState<SegSnapshot[]>([])

  // P0-1: 从 IndexedDB 恢复段落音频缓存
  useEffect(() => {
    if (chapter?.projectId && chapter?.id) {
      loadDialogueAudioCache(chapter.projectId, chapter.id).then(cache => {
        if (cache && Object.keys(cache).length > 0) {
          setAudioCache(cache)
        }
      })
    }
  }, [chapter?.projectId, chapter?.id])

  /* ── 分析结果缓存（localStorage） ── */
  const CACHE_KEY = `mojing_analysis_${chapter.id}`
  const BINDINGS_KEY = `mojing_voice_bindings_${chapter?.projectId}`

  // P1-2: Save voice bindings to localStorage
  const saveVoiceBindings = (chars: { name: string; recommendedVoice?: string }[]) => {
    try {
      const bindings: Record<string, string> = {}
      for (const c of chars) {
        if (c.recommendedVoice) bindings[c.name] = c.recommendedVoice
      }
      localStorage.setItem(BINDINGS_KEY, JSON.stringify(bindings))
    } catch {}
  }

  // P1-2: Load voice bindings from localStorage
  const loadVoiceBindings = <T extends { name: string; recommendedVoice?: string }>(chars: T[]): T[] => {
    try {
      const raw = localStorage.getItem(BINDINGS_KEY)
      if (!raw) return chars
      const bindings: Record<string, string> = JSON.parse(raw)
      return chars.map(c => {
        if (!c.recommendedVoice && bindings[c.name]) {
          return { ...c, recommendedVoice: bindings[c.name] }
        }
        return c
      })
    } catch { return chars }
  }

  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const data = JSON.parse(cached)
        setAnalysisResult(data)
        setEditedCharacters(loadVoiceBindings(data.characters || []))
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

  /* ── 底部参数面板 ── */
  const [showParamPanel, setShowParamPanel] = useState(false)
  const [paramSpeed, setParamSpeed] = useState<'slow' | 'normal' | 'fast'>('normal')
  const [paramIntensity, setParamIntensity] = useState(5)

  /* ── 情绪强度 + 推荐值 ── */
  const [emotionIntensities, setEmotionIntensities] = useState<Record<string, Record<string, number>>>({})
  const [recommendedEmotions, setRecommendedEmotions] = useState<Record<string, Record<string, number>>>({})
  const [narrationSpeed, setNarrationSpeed] = useState(1.0)

  /* ── 恢复角色情绪到推荐值 ── */
  const resetEmotionsForChar = (charName: string) => {
    if (recommendedEmotions[charName]) {
      setEmotionIntensities(prev => ({
        ...prev,
        [charName]: { ...recommendedEmotions[charName] }
      }))
      toast.success(`${charName} 情绪已恢复推荐值`)
    }
  }

  /* ── 设置 AI 推荐情绪 ── */
  const applyRecommendedEmotions = (characters: { name: string; recommendedEmotion?: string }[]) => {
    const rec: Record<string, Record<string, number>> = {}
    characters.forEach(ch => {
      if (ch.recommendedEmotion) {
        rec[ch.name] = { [ch.recommendedEmotion]: 7 }
      }
    })
    setRecommendedEmotions(rec)
    setEmotionIntensities(rec)
  }

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
    if (sel.length === 0) { toast.error('请先勾选要导出的段落'); return }
    exportText(sel, '选中段落')
  }

  /* ── Step 1: AI 分析 ── */
  const handleAnalyze = async () => {
    if (!chapter.content) { toast.error('该章节暂无内容'); return }
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
        setEditedCharacters(loadVoiceBindings(processed.characters || []))
        setEditedSegments(processed.segments || [])
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)) } catch { /* quota exceeded */ }
        // 题材自动识别（异步，不阻塞主流程）
        setGenreLoading(true)
        fetch('/api/audiobook/genre-detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: chapter.content }),
        }).then(r => r.json()).then(g => {
          if (g.success) setGenre({ genre: g.genre, confidence: g.confidence, suggestedStyle: g.suggestedStyle, suggestedPacing: g.suggestedPacing })
        }).catch(() => {}).finally(() => setGenreLoading(false))
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
    if (!chapter.content) { toast.error('该章节暂无内容'); return }
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
    setEditedCharacters(loadVoiceBindings([defaultChar]))
    setEditedSegments(newSegments)
    setUndoStack([])
    setRedoStack([])
  }

  /* ── Step 2: 用户微调角色音色 ── */
  const updateCharacterVoice = (name: string, voiceId: string) => {
    pushUndo()
    setEditedCharacters(prev => {
      const updated = prev.map(c => c.name === name ? { ...c, recommendedVoice: voiceId } : c)
      saveVoiceBindings(updated)
      return updated
    })
    setEditedSegments(prev => prev.map(s => s.characterName === name ? { ...s, recommendedVoice: voiceId } : s))
  }

  const updateCharacterEmotion = (name: string, emotion: string) => {
    pushUndo()
    setEditedCharacters(prev => prev.map(c => c.name === name ? { ...c, recommendedEmotion: emotion } : c))
  }

  const updateCharacterField = (name: string, field: string, value: string) => {
    pushUndo()
    setEditedCharacters(prev => prev.map(c => c.name === name ? { ...c, [field]: value } : c))
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
  const updateSegmentField = (index: number, field: string, value: string | boolean) => {
    setEditedSegments(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
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
          engine: ttsEngine,
        }),
      })
      const data = await res.json()
      if (data.success && data.audio) {
        setAudioCache(prev => {
          const next = { ...prev, [segKey]: { audioBase64: data.audio, duration: data.duration } }
          saveDialogueAudioCache(chapter.projectId, chapter.id, next)
          return next
        })
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
    if (audioKeys.length === 0) { toast.error('请先生成音频'); return }
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
        toast.error('合并失败：' + (data.error || '未知错误'))
      }
    } catch (err) {
      toast.error('合并失败：' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setMerging(false)
    }
  }

  /* ── 人格自动生成音色 ── */
  const handleGeneratePersonas = async () => {
    const chars = characters.filter(c => c.name !== '旁白' && c.personality)
    if (chars.length === 0) { toast.error('没有可生成的角色（需要角色有性格描述）'); return }
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
      toast.error(`已为 ${newVoices.length} 个角色生成专属音色：${newVoices.map(v => v.name).join('、')}`)
    } else {
      toast.error('音色生成失败，请检查 API 连接后重试')
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
          toast.error('导入画本失败：' + (data.error || '格式错误'))
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
          toast.error('导入画本失败：' + (data.error || '格式错误'))
        }
      }
    } catch (err) {
      toast.error('导入失败：' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setImportBookLoading(false)
      if (importBookRef.current) importBookRef.current.value = ''
    }
  }

  /* ═══════════════════════════════════════════════════════════
     UI：双模式导入入口（空状态）
     ═══════════════════════════════════════════════════════════ */
  if (!analysisResult) {
    return (
      <div style={{ padding: '32px 20px', maxWidth: 680, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📖</div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: C.ink, margin: '0 0 4px' }}>选择配音方式</h3>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>为「{chapter.title}」选择一种开始方式</p>
        </div>

        {/* ── 模式切换 Tab ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button onClick={() => setImportMode('standard')}
            style={{
              flex: 1, padding: '10px 16px', fontSize: 13, fontWeight: importMode === 'standard' ? 600 : 400,
              border: importMode === 'standard' ? `2px solid ${C.pri}` : `1px solid ${C.line}`,
              borderRadius: 8, background: importMode === 'standard' ? `${C.pri}10` : C.card,
              color: importMode === 'standard' ? C.pri : C.muted, cursor: 'pointer', textAlign: 'center',
            }}>
            📑 标准画本
          </button>
          <button onClick={() => setImportMode('free')}
            style={{
              flex: 1, padding: '10px 16px', fontSize: 13, fontWeight: importMode === 'free' ? 600 : 400,
              border: importMode === 'free' ? `2px solid ${C.pri}` : `1px solid ${C.line}`,
              borderRadius: 8, background: importMode === 'free' ? `${C.pri}10` : C.card,
              color: importMode === 'free' ? C.pri : C.muted, cursor: 'pointer', textAlign: 'center',
            }}>
            ✏️ 自由文本
          </button>
        </div>

        {/* ── 模式A：标准画本 ── */}
        {importMode === 'standard' && (
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 20, marginBottom: 16, background: C.card }}>
            <p style={{ fontSize: 13, color: C.ink, margin: '0 0 4px', fontWeight: 500 }}>
              上传含 <code style={{ background: '#f0f0f0', padding: '1px 4px', borderRadius: 3, fontSize: 12 }}>{'【角色-音色】"对话"'}</code> 格式的画本文件
            </p>
            <p style={{ fontSize: 11, color: C.muted, margin: '0 0 12px' }}>自动解析旁白与角色音，按角色分配音色</p>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault(); setDragOver(false)
                const file = e.dataTransfer.files[0]
                if (file) handleImportBook({ target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>)
              }}
              style={{
                border: `2px dashed ${dragOver ? C.pri : C.line}`, borderRadius: 8, padding: 24,
                textAlign: 'center', marginBottom: 12, transition: 'all .15s',
                background: dragOver ? `${C.pri}08` : 'transparent',
              }}>
              <p style={{ fontSize: 13, color: C.muted, margin: '0 0 8px' }}>📁 拖拽上传 TXT / JSON / DOCX</p>
              <button onClick={() => importBookRef.current?.click()} disabled={importBookLoading}
                style={{ padding: '6px 16px', fontSize: 12, border: `1px solid ${C.line}`, borderRadius: 6, background: C.card, color: C.ink, cursor: 'pointer', }}>
                {importBookLoading ? '导入中...' : '选择文件'}
              </button>
            </div>
            <textarea
              value={manualText}
              onChange={e => setManualText(e.target.value)}
              placeholder="或直接粘贴/输入画本内容..."
              rows={4}
              style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 12, resize: 'vertical', color: C.ink, background: C.card, boxSizing: 'border-box' }}
            />
            {manualText.trim() && (
              <button onClick={() => {
                const segs = parseBracketDialogue(manualText)
                if (segs.length === 0) { toast.error('未检测到【角色】格式内容，请检查文本格式'); return }
                const chars = extractCharacters(segs)
                setAnalysisResult({ segments: segs as unknown as SegmentAnalysis[], characters: chars as unknown as CharacterAnalysis[], narrationStyle: { overallTone: '平静', suggestedNarratorVoice: defaultVoice, pacing: 'normal' } })
                setEditedCharacters(chars as unknown as CharacterAnalysis[])
                setEditedSegments(segs as unknown as SegmentAnalysis[])
              }}
                style={{ marginTop: 8, padding: '8px 20px', fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 6, background: C.pri, color: '#fff', cursor: 'pointer', }}>
                📑 解析画本
              </button>
            )}
          </div>
        )}

        {/* ── 模式B：自由文本 ── */}
        {importMode === 'free' && (
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 20, marginBottom: 16, background: C.card }}>
            <p style={{ fontSize: 13, color: C.ink, margin: '0 0 12px', fontWeight: 500 }}>上传或输入文本，选择出音模式</p>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault(); setDragOver(false)
                const file = e.dataTransfer.files[0]
                if (file) handleImportBook({ target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>)
              }}
              style={{
                border: `2px dashed ${dragOver ? C.pri : C.line}`, borderRadius: 8, padding: 24,
                textAlign: 'center', marginBottom: 12, transition: 'all .15s',
                background: dragOver ? `${C.pri}08` : 'transparent',
              }}>
              <p style={{ fontSize: 13, color: C.muted, margin: '0 0 8px' }}>📁 拖拽上传文件</p>
              <button onClick={() => importBookRef.current?.click()} disabled={importBookLoading}
                style={{ padding: '6px 16px', fontSize: 12, border: `1px solid ${C.line}`, borderRadius: 6, background: C.card, color: C.ink, cursor: 'pointer', }}>
                {importBookLoading ? '导入中...' : '选择文件'}
              </button>
            </div>
            <textarea
              value={manualText}
              onChange={e => setManualText(e.target.value)}
              placeholder="或直接粘贴/输入文本..."
              rows={4}
              style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 12, resize: 'vertical', color: C.ink, background: C.card, boxSizing: 'border-box', marginBottom: 12 }}
            />
            <p style={{ fontSize: 12, color: C.muted, margin: '0 0 8px' }}>出音模式（三选一，互斥）：</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {[{ key: 'full', label: '全本配音', desc: '旁白+角色音混合' }, { key: 'narration', label: '纯旁白', desc: '只出旁白音' }, { key: 'dialogue', label: '纯角色音', desc: '只出角色音' }].map(m => (
                <button key={m.key} onClick={() => setOutputMode(m.key as typeof outputMode)}
                  style={{
                    flex: 1, padding: '8px 8px', fontSize: 11, textAlign: 'center',
                    border: outputMode === m.key ? `2px solid ${C.pri}` : `1px solid ${C.line}`,
                    borderRadius: 6, background: outputMode === m.key ? `${C.pri}10` : C.card,
                    color: outputMode === m.key ? C.pri : C.muted, cursor: 'pointer', fontWeight: outputMode === m.key ? 600 : 400,
                  }}>
                  {m.label}<br /><span style={{ fontSize: 10, opacity: 0.7 }}>{m.desc}</span>
                </button>
              ))}
            </div>
            {manualText.trim() && (
              <button onClick={() => {
                const segs = parseTextToSegments(manualText)
                if (segs.length === 0) { toast.error('未检测到有效段落'); return }
                const chars = extractCharacters(segs)
                setAnalysisResult({ segments: segs as unknown as SegmentAnalysis[], characters: chars as unknown as CharacterAnalysis[], narrationStyle: { overallTone: '平静', suggestedNarratorVoice: defaultVoice, pacing: 'normal' } })
                setEditedCharacters(chars as unknown as CharacterAnalysis[])
                setEditedSegments(segs as unknown as SegmentAnalysis[])
              }}
                style={{ padding: '8px 20px', fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 6, background: C.pri, color: '#fff', cursor: 'pointer', }}>
                📑 解析文本
              </button>
            )}
          </div>
        )}

        <input ref={importBookRef} type="file" accept=".txt,.json,.docx" onChange={handleImportBook} style={{ display: 'none' }} />

        {/* ── 快捷入口 ── */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 8 }}>
          <button onClick={handleAnalyze} disabled={analyzing}
            style={{ padding: '12px 24px', background: C.card, border: `1px solid ${C.line}`, borderRadius: 8, cursor: analyzing ? 'default' : 'pointer', textAlign: 'center', fontSize: 13 }}>
            🤖 {analyzing ? `AI 分析中… ${analyzingElapsed}s` : 'AI 分析章节'}
          </button>
          <button onClick={handleManualSetup}
            style={{ padding: '12px 24px', background: C.card, border: `1px solid ${C.line}`, borderRadius: 8, cursor: 'pointer', textAlign: 'center', fontSize: 13 }}>
            ✏️ 按行拆段
          </button>
        </div>

        {/* 分析错误 */}
        {analyzing && (
          <p style={{ fontSize: 11, color: C.muted, marginTop: 12, textAlign: 'center' }}>
            DeepSeek V4 Flash 正在分析章节文本，预计 30-60 秒，请耐心等待…
          </p>
        )}
        {analyzeError && (
          <div style={{ marginTop: 12, padding: 12, background: 'rgba(181,69,74,.08)', borderRadius: 8, fontSize: 12, color: C.crimson, maxWidth: 400, margin: '12px auto 0' }}>
            ❌ {analyzeError}
          </div>
        )}
      </div>
    )
  }

  /* ═══════════════════════════════════════════════════════════
     UI：分析完成后 — 左角色列表 + 右段落列表
     ═══════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col gap-0" style={{ minHeight: 500 }} onKeyDown={e => {
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); handleUndo() }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); handleRedo() }
    }}>
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} />

      {/* ═══ 6步工作流进度条 ═══ */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card/50 overflow-x-auto flex-shrink-0">
        {[
          { step: 0, label: '导入' },
          { step: 1, label: '分析' },
          { step: 2, label: '方案' },
          { step: 3, label: '引擎' },
          { step: 4, label: '合成' },
          { step: 5, label: '导出' },
        ].map(({ step, label }) => (
          <button
            key={step}
            onClick={() => setWorkflowStep(step)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border-none cursor-pointer ${
              workflowStep === step
                ? 'bg-primary text-white'
                : workflowStep > step
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {workflowStep > step ? '✓' : null}
            {step + 1}. {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 20, flex: 1, minHeight: 0 }}>

      {/* ═══ 左侧：角色列表 + 旁白 ═══ */}
      <div style={{ width: 260, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: C.ink, margin: 0 }}>🎭 角色音色</h3>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={handleUndo} disabled={undoStack.length === 0}
              style={{ padding: '4px 8px', fontSize: 11, border: `1px solid ${C.line}`, borderRadius: 4, background: C.card, color: undoStack.length > 0 ? C.ink : C.muted, cursor: undoStack.length > 0 ? 'pointer' : 'default', }}
              title="撤回 (Ctrl+Z)">↩️</button>
            <button onClick={handleRedo} disabled={redoStack.length === 0}
              style={{ padding: '4px 8px', fontSize: 11, border: `1px solid ${C.line}`, borderRadius: 4, background: C.card, color: redoStack.length > 0 ? C.ink : C.muted, cursor: redoStack.length > 0 ? 'pointer' : 'default', }}
              title="重做 (Ctrl+Y)">↪️</button>
            <button onClick={() => { setAnalysisResult(null); setEditedCharacters([]); setEditedSegments([]); setAudioCache({}); clearDialogueAudioCache(chapter.projectId, chapter.id); setUndoStack([]); setRedoStack([]); try { localStorage.removeItem(CACHE_KEY); localStorage.removeItem(BINDINGS_KEY) } catch {} }}
              style={{ padding: '4px 10px', fontSize: 11, border: `1px solid ${C.line}`, borderRadius: 4, background: C.card, color: C.muted, cursor: 'pointer', }}>
              重新选择
            </button>
          </div>
        </div>

        {/* 题材标签 */}
        {(genre || genreLoading) && (
          <div style={{ padding: '6px 10px', marginBottom: 10, background: 'rgba(26,24,20,.02)', border: `1px solid ${C.line}`, borderRadius: C.radius, fontSize: 11, color: C.muted, display: 'flex', alignItems: 'center', gap: 8 }}>
            {genreLoading ? (
              <span>🔍 题材识别中...</span>
            ) : genre && (
              <>
                <span style={{ padding: '1px 8px', background: `${C.pri}18`, borderRadius: 10, color: C.pri, fontWeight: 600 }}>{genre.genre}</span>
                <span>{genre.suggestedStyle}</span>
                <span style={{ opacity: 0.6 }}>({genre.suggestedPacing === 'slow' ? '慢速' : genre.suggestedPacing === 'fast' ? '快速' : '中速'})</span>
              </>
            )}
          </div>
        )}

        {/* 情绪曲线 */}
        <EmotionChart segments={segments} />

        {/* TTS 引擎选择 */}
        <EngineSelector value={ttsEngine} onChange={(eng) => {
          setAudioCache({})
          clearDialogueAudioCache(chapter.projectId, chapter.id)
          try { localStorage.setItem('mojing_tts_engine', eng) } catch {}
        }} />

        {/* 角色关系图 */}
        {editedCharacters.length > 0 && (
          <CharacterGraph
            characters={editedCharacters.map(c => ({
              name: c.name,
              gender: c.gender as 'male' | 'female',
              age: c.age as 'child' | 'young' | 'adult' | 'elderly',
              recommendedVoice: c.recommendedVoice || defaultVoice,
              recommendedEmotion: c.recommendedEmotion || '平静',
            }))}
            segments={segments}
          />
        )}

        {/* 旁白 */}
        <div style={{ padding: 10, background: 'rgba(26,24,20,.02)', border: `1px solid ${C.line}`, borderRadius: C.radius, marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.ink, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#999' }} />
            旁白
          </div>
          <select
            value={characters.find(c => c.name === '旁白')?.recommendedVoice || defaultVoice}
            onChange={e => updateCharacterVoice('旁白', e.target.value)}
            style={{ width: '100%', padding: '4px 6px', border: `1px solid ${C.line}`, borderRadius: 4, fontSize: 11, marginBottom: 4 }}
          >
            {AVAILABLE_VOICES.map(v => <option key={v.id} value={v.id}>{v.name} — {v.style.split('，')[0]}</option>)}
            {extraVoices.length > 0 && <optgroup label="🎨 自定义音色">
              {extraVoices.map(v => <option key={v.id} value={v.id}>{v.name} ({v.type === 'clone' ? '克隆' : '设计'})</option>)}
            </optgroup>}
          </select>
        </div>

        {/* 角色列表 */}
        {characters.filter(c => c.name !== '旁白').map(ch => (
          <div key={ch.name} style={{ padding: 10, background: 'rgba(26,24,20,.02)', border: `1px solid ${C.line}`, borderRadius: C.radius, marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: getCharColor(ch.name), marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <img src={`/avatars/${ch.gender === 'male' ? 'male' : 'female'}-${ch.age === 'young' ? 'young' : ch.age === 'elderly' ? 'elderly' : ch.age === 'child' ? 'child' : 'adult'}.svg`} alt="" style={{ width: 18, height: 18, borderRadius: '50%' }} />
              <span>{ch.name}</span>
              <span style={{ fontWeight: 400, color: C.muted }}>({ch.gender === 'male' ? '男' : '女'}·{ch.age === 'young' ? '青年' : ch.age === 'adult' ? '中年' : ch.age === 'child' ? '少年' : '老年'})</span>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: getCharColor(ch.name), flexShrink: 0 }} />
            </div>
            <textarea
              value={ch.personality}
              onChange={e => updateCharacterField(ch.name, 'personality', e.target.value)}
              placeholder="性格描述..."
              rows={2}
              style={{ width: '100%', padding: '4px 6px', border: `1px solid ${C.line}`, borderRadius: 4, fontSize: 10, resize: 'vertical', marginBottom: 4, color: C.ink, background: C.card, boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
              <select value={ch.gender} onChange={e => updateCharacterField(ch.name, 'gender', e.target.value)}
                style={{ flex: 1, padding: '3px 4px', border: `1px solid ${C.line}`, borderRadius: 4, fontSize: 10, }}>
                <option value="male">男</option>
                <option value="female">女</option>
              </select>
              <select value={ch.age} onChange={e => updateCharacterField(ch.name, 'age', e.target.value)}
                style={{ flex: 1, padding: '3px 4px', border: `1px solid ${C.line}`, borderRadius: 4, fontSize: 10, }}>
                <option value="child">少年</option>
                <option value="young">青年</option>
                <option value="adult">中年</option>
                <option value="elderly">老年</option>
              </select>
            </div>
            <select value={ch.recommendedVoice} onChange={e => updateCharacterVoice(ch.name, e.target.value)} style={{ width: '100%', padding: '4px 6px', border: `1px solid ${C.line}`, borderRadius: 4, fontSize: 11, marginBottom: 4 }}>
              {/* MiMo 音色 — 标准版可用，专业版灰色不可点 */}
              <optgroup label={ttsEngine === 'normal' ? '🎙️ 标准版音色' : '🎙️ 标准版 (不可用)'}>
                {AVAILABLE_VOICES.map(v => {
                  const disabled = ttsEngine === 'vip'
                  return <option key={v.id} value={v.id} disabled={disabled} style={disabled ? { color: '#aaa' } : undefined}>{v.name}</option>
                })}
              </optgroup>
              {/* 讯飞音色 — 专业版可用，标准版灰色不可点 */}
              <optgroup label={ttsEngine === 'vip' ? '⚡ 高品质音色' : '⚡ 高品质 (不可用)'}>
                {XFYUN_VOICES.map(v => {
                  const disabled = ttsEngine === 'normal'
                  return <option key={v.id} value={v.id} disabled={disabled} style={disabled ? { color: '#aaa' } : undefined}>{v.name}</option>
                })}
              </optgroup>
              {/* 自定义音色 — 始终可用 */}
              {extraVoices.length > 0 && <optgroup label="🎨 自定义音色">
                {extraVoices.map(v => <option key={v.id} value={v.id}>{v.name} ({v.type === 'clone' ? '克隆' : '设计'})</option>)}
              </optgroup>}
            </select>
            <div style={{ display: 'flex', gap: 4 }}>
              <select value={EMOTION_PRESETS.some(em => em.id === ch.recommendedEmotion) ? ch.recommendedEmotion : '__custom__'} onChange={e => { if (e.target.value !== '__custom__') updateCharacterEmotion(ch.name, e.target.value) }}
                style={{ flex: 1, padding: '4px 6px', border: `1px solid ${C.line}`, borderRadius: 4, fontSize: 11, }}>
                {EMOTION_PRESETS.map(em => <option key={em.id} value={em.id}>{em.label}</option>)}
                <option value="__custom__">自定义...</option>
              </select>
              {!EMOTION_PRESETS.some(em => em.id === ch.recommendedEmotion) && (
                <input
                  value={ch.recommendedEmotion}
                  onChange={e => updateCharacterEmotion(ch.name, e.target.value)}
                  placeholder="自定义情绪"
                  style={{ flex: 1, padding: '4px 6px', border: `1px solid ${C.pri}`, borderRadius: 4, fontSize: 11, color: C.pri, background: C.card }}
                />
              )}
            </div>
          </div>
        ))}

        {/* + 新增角色 */}
        <button onClick={() => {
          pushUndo()
          const newName = `角色${characters.length}`
          setEditedCharacters(prev => [...prev, {
            name: newName,
            personality: '',
            gender: 'female' as const,
            age: 'adult' as const,
            recommendedVoice: defaultVoice,
            recommendedEmotion: defaultEmotion || '平静',
          }])
        }} style={{ width: '100%', padding: '8px 0', fontSize: 12, border: `1px dashed ${C.line}`, borderRadius: C.radius, background: 'transparent', color: C.muted, cursor: 'pointer', }}>
          + 新增角色
        </button>

        {/* 操作按钮 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
          <button onClick={handleGeneratePersonas} disabled={generatingPersonas || characters.length === 0}
            style={{ padding: '8px 0', background: '#8e63ce', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, color: '#fff', cursor: generatingPersonas || characters.length === 0 ? 'default' : 'pointer', opacity: generatingPersonas || characters.length === 0 ? 0.6 : 1 }}>
            {generatingPersonas ? `🎭 ${personaProgress.current}/${personaProgress.total} ${personaProgress.currentName}` : '🎭 生成角色音色'}
          </button>
          <button onClick={handleGenerateAll} disabled={batchGenerating || segments.length === 0} style={{ padding: '8px 0', background: C.pri, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, color: '#fff', cursor: batchGenerating ? 'default' : 'pointer', opacity: batchGenerating || segments.length === 0 ? 0.6 : 1 }}>
            {batchGenerating ? `⏳ ${batchProgress.current}/${batchProgress.total}` : '🎵 一键生成全部'}
          </button>
          {/* 合并导出 */}
          <div style={{ display: 'flex', gap: 4 }}>
            <select value={exportFormat} onChange={e => setExportFormat(e.target.value as 'wav' | 'mp3')}
              style={{ padding: '4px 6px', border: `1px solid ${C.line}`, borderRadius: 4, fontSize: 10, color: C.ink, background: C.card, flex: 1 }}>
              <option value="wav">WAV 无损</option>
              <option value="mp3">MP3 压缩</option>
              <option value="m4b">M4B 有声书</option>
            </select>
            <button onClick={handleMergeExport} disabled={merging || Object.keys(audioCache).length === 0}
              style={{ padding: '8px 12px', background: C.indigo, border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 500, color: '#fff', cursor: merging || Object.keys(audioCache).length === 0 ? 'default' : 'pointer', opacity: merging || Object.keys(audioCache).length === 0 ? 0.6 : 1, flex: 2 }}>
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

        {/* P1-5: 工具栏占位按钮 */}
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 4, fontWeight: 500 }}>高级工具</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {[
              { icon: '🎵', label: '音效' },
              { icon: '🌍', label: '多语种' },
              { icon: '📈', label: '变调' },
              { icon: '🔊', label: '音量' },
              { icon: '🔤', label: '多音字' },
              { icon: '🔢', label: '数字' },
              { icon: '✅', label: '纠错' },
              { icon: '✏️', label: '改写' },
              { icon: '🌐', label: '翻译' },
              { icon: '📋', label: '文案提取' },
              { icon: '🎶', label: '背景音乐' },
              { icon: '🫧', label: '换气' },
              { icon: '⏸️', label: '停顿' },
            ].map(t => (
              <button key={t.label} disabled title="即将上线"
                style={{ padding: '3px 8px', fontSize: 10, border: `1px dashed ${C.line}`, borderRadius: 4, background: 'transparent', color: C.muted, cursor: 'default', opacity: 0.5 }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ 右侧：筛选Tab + 导出 + 段落列表 ═══ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, overflow: 'hidden' }}>
        {/* 筛选 Tab 栏 */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', padding: '0 0 8px', borderBottom: `1px solid ${C.line}` }}>
          {filterTabs.map(tab => (
            <button key={tab.id} onClick={() => { setFilterTab(tab.id); clearSelection() }}
              style={{ padding: '4px 12px', borderRadius: 14, fontSize: 11, border: 'none', background: filterTab === tab.id ? C.pri : 'rgba(26,24,20,.04)', color: filterTab === tab.id ? '#fff' : C.muted, cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: filterTab === tab.id ? 600 : 400 }}>
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* 导出按钮行 + 多选控制 */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={exportCurrentFilter} style={{ padding: '4px 10px', fontSize: 11, border: `1px solid ${C.line}`, borderRadius: 4, background: C.card, color: C.ink, cursor: 'pointer', }}>
            📋 导出当前筛选
          </button>
          <button onClick={exportAllByOrder} style={{ padding: '4px 10px', fontSize: 11, border: `1px solid ${C.line}`, borderRadius: 4, background: C.card, color: C.ink, cursor: 'pointer', }}>
            📋 按顺序导出全部
          </button>
          <button onClick={selectAll} style={{ padding: '4px 10px', fontSize: 11, border: `1px solid ${C.line}`, borderRadius: 4, background: C.card, color: C.ink, cursor: 'pointer', }}>
            ☑️ 全选当前
          </button>
          <button onClick={clearSelection} style={{ padding: '4px 10px', fontSize: 11, border: `1px solid ${C.line}`, borderRadius: 4, background: C.card, color: C.muted, cursor: 'pointer', }}>
            取消全选
          </button>
          {selectedIds.size > 0 && (
            <button onClick={exportSelected} style={{ padding: '4px 10px', fontSize: 11, border: 'none', borderRadius: 4, background: C.indigo, color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
              📋 导出选中 ({selectedIds.size})
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowParamPanel(p => !p)} style={{ padding: '4px 10px', fontSize: 11, border: `1px solid ${showParamPanel ? C.pri : C.line}`, borderRadius: 4, background: showParamPanel ? 'rgba(196,149,106,.12)' : C.card, color: showParamPanel ? C.pri : C.muted, cursor: 'pointer', }}>
            ⚡ 调参
          </button>
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
                    style={{ padding: '1px 4px', border: `1px solid ${C.line}`, borderRadius: 3, fontSize: 10, color: C.ink, background: C.card }}>
                    <option value="narration">叙述</option>
                    <option value="dialogue">对话</option>
                  </select>

                  {isDialogue && seg.characterName ? (
                    <span style={{ fontSize: 10, padding: '1px 6px', background: `${color}18`, borderRadius: 8, color, fontWeight: 600 }}>{seg.characterName}</span>
                  ) : (
                    <span style={{ fontSize: 10, padding: '1px 6px', background: 'rgba(26,24,20,.06)', borderRadius: 8, color: C.muted }}>叙述</span>
                  )}

                  {/* 情绪微调 */}
                  <select value={seg.emotion} onChange={e => updateSegmentEmotion(globalIdx, e.target.value)} style={{ padding: '1px 4px', border: `1px solid ${C.line}`, borderRadius: 3, fontSize: 10, color: C.ink, background: C.card }}>
                    {EMOTION_PRESETS.map(em => <option key={em.id} value={em.id}>{em.label}</option>)}
                  </select>

                  {/* 情绪强度滑动条 */}
                  <span style={{ fontSize: 10, color: C.muted, whiteSpace: 'nowrap' }}>强度</span>
                  <input type="range" min={1} max={10} step={1} value={seg.emotionIntensity}
                    onChange={e => updateSegmentIntensity(globalIdx, parseInt(e.target.value))}
                    style={{ width: 60, accentColor: C.pri, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 10, color: C.ink, minWidth: 14, textAlign: 'center' }}>{seg.emotionIntensity}</span>

                  <select value={seg.speed} onChange={e => updateSegmentSpeed(globalIdx, e.target.value as 'slow' | 'normal' | 'fast')} style={{ padding: '1px 4px', border: `1px solid ${C.line}`, borderRadius: 3, fontSize: 10, color: C.ink, background: C.card }}>
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
                    padding: 0, outline: 'none',
                  }}
                />
                
                {/* 演播指导 */}
                <ContextEditor
                  segmentIndex={seg.index}
                  segmentText={seg.text}
                  emotion={seg.emotion}
                  characterName={seg.characterName}
                  previousSummary={editedSegments[globalIdx === 0 ? 0 : globalIdx - 1]?.specialNote || ''}
                  context={{
                    summary: seg.specialNote || '',
                    note: '',
                    direction: '',
                    cotTag: (seg.type === 'dialogue' ? '' : '全程保持匀速'),
                  }}
                  onChange={(ctx) => {
                    // Store the context summary in specialNote for now
                    updateSegmentField(globalIdx, 'specialNote', ctx.summary)
                  }}
                />

                {/* 操作行：生成/重新生成 + 播放/暂停 + 导出 */}
                <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
                  {audio ? (
                    /* 已生成 → 重新生成 + 播放 + 导出 */
                    <>
                      <button onClick={() => generateOne(seg)} disabled={isGen || !!generatingId}
                        style={{ padding: '2px 8px', fontSize: 11, border: `1px solid ${C.line}`, borderRadius: 4, background: C.card, color: isGen ? C.pri : C.muted, cursor: isGen ? 'default' : 'pointer', }}>
                        {isGen ? '⏳...' : '🔄 重新生成'}
                      </button>
                      <button onClick={() => playBase64(audio.audioBase64, segKey)}
                        style={{ padding: '2px 8px', fontSize: 11, border: `1px solid ${isPlaying ? C.pri : C.line}`, borderRadius: 4, background: isPlaying ? 'rgba(196,149,106,.12)' : C.card, color: isPlaying ? C.pri : C.muted, cursor: 'pointer', }}>
                        {isPlaying ? '⏸' : '▶ 播放'}
                      </button>
                      <button onClick={() => {
                        // P1-3: 单段导出 - 使用共享exportFormat
                        const bin = atob(audio.audioBase64)
                        const bytes = new Uint8Array(bin.length)
                        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
                        const mime = exportFormat === 'mp3' ? 'audio/mpeg' : 'audio/wav'
                        const ext = exportFormat === 'mp3' ? 'mp3' : 'wav'
                        const blob = new Blob([bytes], { type: mime })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url; a.download = `${chapter.title || '段落'}-${seg.index + 1}.${ext}`; a.click()
                        URL.revokeObjectURL(url)
                      }}
                        style={{ padding: '2px 8px', fontSize: 11, border: `1px solid ${C.line}`, borderRadius: 4, background: C.card, color: C.muted, cursor: 'pointer', }}>
                        📥 导出
                      </button>
                    </>
                  ) : (
                    /* 未生成 → 生成按钮 */
                    <button onClick={() => generateOne(seg)} disabled={isGen || !!generatingId}
                      style={{ padding: '2px 8px', fontSize: 11, border: `1px solid ${C.line}`, borderRadius: 4, background: C.card, color: isGen ? C.pri : C.muted, cursor: isGen ? 'default' : 'pointer', }}>
                      {isGen ? '⏳...' : '🎵 生成'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ═══ 底部参数面板（参考讯飞局部变速） ═══ */}
      {showParamPanel && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          padding: '12px 24px',
          background: '#fff',
          borderTop: `1px solid ${C.line}`,
          boxShadow: '0 -4px 16px rgba(0,0,0,.08)',
        }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            {/* 语速 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: C.muted }}>🏃 语速</span>
              <select value={paramSpeed} onChange={e => setParamSpeed(e.target.value as 'slow' | 'normal' | 'fast')}
                style={{ padding: '4px 8px', border: `1px solid ${C.line}`, borderRadius: 4, fontSize: 12, }}>
                <option value="slow">慢速</option>
                <option value="normal">正常</option>
                <option value="fast">快速</option>
              </select>
            </div>
            {/* 情绪强度 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: C.muted }}>🔥 强度</span>
              <input type="range" min={1} max={10} step={1} value={paramIntensity}
                onChange={e => setParamIntensity(parseInt(e.target.value))}
                style={{ width: 100, accentColor: C.pri, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 12, color: C.ink, minWidth: 20, textAlign: 'center' }}>{paramIntensity}</span>
            </div>
            {/* 停顿 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 12, color: C.muted }}>⏸ 停顿</span>
              {[0.5, 1, 2].map(sec => (
                <button key={sec} onClick={() => {
                  pushUndo()
                  const targets = selectedIds.size > 0 ? [...selectedIds] : []
                  if (targets.length === 0) return
                  setEditedSegments(prev => prev.map(s => {
                    if (targets.includes(s.index)) {
                      return { ...s, needsPause: true, pauseAfter: sec <= 0.5 ? 'short' as const : sec <= 1 ? 'normal' as const : 'long' as const }
                    }
                    return s
                  }))
                }} style={{ padding: '4px 10px', fontSize: 11, border: `1px solid ${C.line}`, borderRadius: 4, background: C.card, color: C.ink, cursor: 'pointer', }}>
                  {sec}s
                </button>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: C.muted }}>
              {selectedIds.size > 0 ? `→ ${selectedIds.size} 个选中段落` : '请先勾选段落'}
            </span>
            <button onClick={() => { setParamSpeed('normal'); setParamIntensity(5) }}
              style={{ padding: '6px 14px', fontSize: 11, border: `1px solid ${C.line}`, borderRadius: 4, background: C.card, color: C.muted, cursor: 'pointer', }}>
              默认
            </button>
            <button onClick={() => {
              pushUndo()
              const targets = selectedIds.size > 0 ? segments.filter(s => selectedIds.has(s.index)) : []
              for (const s of targets) {
                updateSegmentSpeed(s.index, paramSpeed)
                updateSegmentIntensity(s.index, paramIntensity)
              }
              setShowParamPanel(false)
            }} style={{ padding: '6px 18px', fontSize: 12, border: 'none', borderRadius: 4, background: C.pri, color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
              ✓ 应用
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
