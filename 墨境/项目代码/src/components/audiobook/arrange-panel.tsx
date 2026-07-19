'use client'

import { useState, useMemo, useRef } from 'react'
import { toast } from 'sonner'

/**
 * 多轨编排面板
 *
 * 流程：上传画本 → 解析编排清单 → 可视化预览 → 调整间隔 → 批量合成 → 拼接打标 → 后处理润色
 * 移植自 scripts/narrate-arrange.py 的 Web 端实现
 */

type SegmentType = 'narration' | 'dialog_marker' | 'silence'

interface ArrangeSegment {
  type: SegmentType
  text?: string
  label?: string
  note?: string
  ms?: number
}

interface ParseResult {
  segments: ArrangeSegment[]
  stats: {
    total: number
    narration: number
    dialogMarker: number
    silence: number
    totalChars: number
  }
}

interface SynthesizeResult {
  success: boolean
  results: Array<{ index: number; audioBase64: string; duration: number; done: boolean }>
  completed: number
  total: number
}

interface ConcatenateResult {
  success: boolean
  audio: string
  duration: number
  format: string
  filename: string
  segments: number
  markers: number
}

type EffectsPreset = 'none' | 'polish' | 'radio' | 'spacious' | 'deep'

interface Props {
  chapterTitle?: string
  chapterContent?: string
}

const C = {
  pri: '#c4956a',
  ink: '#1a1814',
  muted: 'rgba(26,24,20,.45)',
  line: 'rgba(26,24,20,.06)',
  card: '#fff',
  indigo: '#3a5279',
  green: '#7a9e7a',
  radius: 8,
}

const EFFECTS_PRESETS: { id: EffectsPreset; label: string; icon: string; desc: string }[] = [
  { id: 'none', label: '跳过', icon: '⏭️', desc: '不应用任何效果' },
  { id: 'polish', label: '润色', icon: '✨', desc: '轻微压缩+暖声，适合大多数场景' },
  { id: 'radio', label: '电台', icon: '📻', desc: '中频增强+轻微混响，适合对话' },
  { id: 'spacious', label: '空旷', icon: '🏛️', desc: '大房间混响，适合宏大场景' },
  { id: 'deep', label: '低沉', icon: '🌊', desc: '低频增强+厚重感，适合深沉旁白' },
]

/** Play base64 audio via temporary audio element */
function playBase64Audio(base64: string, mime: string = 'audio/wav') {
  try {
    const bin = atob(base64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const blob = new Blob([bytes], { type: mime })
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audio.onended = () => URL.revokeObjectURL(url)
    audio.play().catch(() => {})
  } catch { /* ignore */ }
}

/** Download base64 as file */
function downloadBase64(base64: string, filename: string, mime: string = 'audio/wav') {
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const blob = new Blob([bytes], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ArrangePanel({ chapterTitle, chapterContent }: Props) {
  const [mode, setMode] = useState<'auto' | 'annotated'>('auto')
  const [silenceMs, setSilenceMs] = useState(800)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState('')
  const [inputText, setInputText] = useState(chapterContent || '')

  /* Step 3: 合成状态 */
  const [engine, setEngine] = useState<'normal' | 'vip' | 'doubao'>('normal')
  const [voice, setVoice] = useState('冰糖')
  const [synthesizing, setSynthesizing] = useState(false)
  const [synthProgress, setSynthProgress] = useState({ current: 0, total: 0 })
  const [synthesizedData, setSynthesizedData] = useState<Map<number, { audioBase64: string; duration: number }>>(new Map())
  const synthAbortRef = useRef(false)

  /* Step 4: 拼接状态 */
  const [concatenating, setConcatenating] = useState(false)
  const [concatenatedAudio, setConcatenatedAudio] = useState<string | null>(null)
  const [concatenatedDuration, setConcatenatedDuration] = useState(0)
  const [concatenatedFilename, setConcatenatedFilename] = useState('')

  /* Step 5: 润色状态 */
  const [effectsPreset, setEffectsPreset] = useState<EffectsPreset>('none')
  const [applyingEffects, setApplyingEffects] = useState(false)
  const [effectedAudio, setEffectedAudio] = useState<string | null>(null)
  const [effectsApplied, setEffectsApplied] = useState(false)

  const handleParse = async () => {
    const text = inputText.trim()
    if (!text) {
      toast.error('请输入或上传画本文本')
      return
    }
    setParsing(true)
    setParseError('')
    try {
      const res = await fetch('/api/audiobook/arrange/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, mode, silenceMs }),
      })
      const data = await res.json()
      if (data.success) {
        setParseResult({ segments: data.segments, stats: data.stats })
        toast.success(`解析完成：${data.stats.narration}段旁白 + ${data.stats.dialogMarker}个对话位`)
      } else {
        setParseError(data.error || '解析失败')
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : '网络错误')
    } finally {
      setParsing(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setInputText(text)
  }

  /* ── Step 3: 批量合成 ── */
  const handleSynthesize = async () => {
    if (!parseResult) return
    const narrationSegs = parseResult.segments
      .filter(s => s.type === 'narration' && s.text)
      .map(s => ({ index: parseResult.segments.indexOf(s), text: s.text! }))

    if (narrationSegs.length === 0) {
      toast.error('没有可合成的旁白段')
      return
    }

    setSynthesizing(true)
    setSynthProgress({ current: 0, total: narrationSegs.length })
    synthAbortRef.current = false
    const results = new Map<number, { audioBase64: string; duration: number }>()

    // 分批发送，每批5段
    const batchSize = 5
    for (let i = 0; i < narrationSegs.length; i += batchSize) {
      if (synthAbortRef.current) break
      const batch = narrationSegs.slice(i, i + batchSize)

      try {
        const res = await fetch('/api/audiobook/arrange/synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            segments: batch,
            engine,
            voice,
            silenceMs,
            book: chapterTitle || '有声书',
            episode: chapterTitle || '章节',
          }),
        })
        const data: SynthesizeResult = await res.json()
        if (data.success) {
          for (const r of data.results) {
            if (r.done) results.set(r.index, { audioBase64: r.audioBase64, duration: r.duration })
          }
          setSynthProgress({ current: Math.min(i + batchSize, narrationSegs.length), total: narrationSegs.length })
        } else {
          toast.error(`第${i + 1}批合成失败`)
        }
      } catch (err) {
        toast.error(`第${i + 1}批合成网络错误`)
      }
    }

    setSynthesizedData(results)
    setSynthesizing(false)
    if (results.size > 0) {
      toast.success(`合成完成：${results.size}/${narrationSegs.length} 段`)
    }
  }

  /* ── Step 4: 拼接+AU打标 ── */
  const handleConcatenate = async () => {
    if (synthesizedData.size === 0) {
      toast.error('请先完成批量合成')
      return
    }

    setConcatenating(true)
    try {
      const audioSegments: Array<{ audioBase64: string; duration: number }> = []
      const markers: Array<{ label: string; positionMs: number }> = []
      let currentPosMs = 0

      for (const seg of parseResult!.segments) {
        if (seg.type === 'narration') {
          const idx = parseResult!.segments.indexOf(seg)
          const audio = synthesizedData.get(idx)
          if (audio) {
            audioSegments.push({ audioBase64: audio.audioBase64, duration: audio.duration })
            currentPosMs += audio.duration
          }
        } else if (seg.type === 'dialog_marker') {
          markers.push({ label: seg.label || `对话_${seg.note || ''}`, positionMs: currentPosMs })
          currentPosMs += silenceMs
        } else if (seg.type === 'silence') {
          currentPosMs += seg.ms || silenceMs
        }
      }

      const res = await fetch('/api/audiobook/arrange/concatenate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments: audioSegments,
          silenceMs,
          fadeMs: 80,
          markers,
          book: chapterTitle || '有声书',
          episode: chapterTitle || '章节',
        }),
      })
      const data: ConcatenateResult = await res.json()
      if (data.success) {
        setConcatenatedAudio(data.audio)
        setConcatenatedDuration(data.duration)
        setConcatenatedFilename(data.filename)
        setEffectedAudio(data.audio)
        setEffectsApplied(false)
        toast.success(`拼接完成：${data.segments}段 + ${data.markers}个标记，共${Math.round(data.duration)}秒`)
      } else {
        toast.error('拼接失败')
      }
    } catch (err) {
      toast.error('拼接网络错误')
    } finally {
      setConcatenating(false)
    }
  }

  /* ── Step 5: 后处理润色 ── */
  const handleApplyEffects = async () => {
    if (!concatenatedAudio && !effectedAudio) {
      toast.error('请先完成拼接')
      return
    }
    if (effectsPreset === 'none') {
      setEffectsApplied(true)
      toast.success('已跳过润色')
      return
    }

    setApplyingEffects(true)
    try {
      const res = await fetch('/api/audiobook/arrange/effects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: concatenatedAudio || effectedAudio,
          compression: { threshold: -16, ratio: 2.5 },
          reverb: effectsPreset === 'radio' ? { roomSize: 0.3, dryWet: 0.3 }
            : effectsPreset === 'spacious' ? { roomSize: 0.8, dryWet: 0.5 }
            : effectsPreset === 'deep' ? { roomSize: 0.4, dryWet: 0.2 }
            : undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setEffectedAudio(data.audio)
        setEffectsApplied(true)
        toast.success(`已应用「${EFFECTS_PRESETS.find(p => p.id === effectsPreset)?.label}」效果`)
      } else {
        toast.error('效果应用失败')
      }
    } catch (err) {
      toast.error('效果应用网络错误')
    } finally {
      setApplyingEffects(false)
    }
  }

  const handleDownloadFinal = () => {
    const audio = effectsApplied && effectedAudio ? effectedAudio : concatenatedAudio
    if (!audio) {
      toast.error('没有可下载的音频')
      return
    }
    const name = effectsApplied && effectsPreset !== 'none'
      ? concatenatedFilename.replace('.wav', `_${effectsPreset}.wav`)
      : concatenatedFilename || 'arranged-output.wav'
    downloadBase64(audio, name)
  }

  const narrationSegments = useMemo(() =>
    parseResult?.segments.filter(s => s.type === 'narration') || [],
    [parseResult]
  )

  return (
    <div style={{ padding: '20px 0' }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: C.ink, margin: '0 0 4px' }}>
          🎬 多轨编排
        </h3>
        <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
          解析画本 → 生成编排清单 → 批量合成旁白 → 自动拼接+AU打标 → 后处理润色
        </p>
      </div>

      {/* Step 1: 上传画本 */}
      <div style={{ marginBottom: 16, padding: 14, background: 'rgba(26,24,20,.02)', border: `1px solid ${C.line}`, borderRadius: C.radius }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 8 }}>
          Step 1：上传画本
        </div>

        {/* 模式选择 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <button
            onClick={() => setMode('auto')}
            style={{
              flex: 1, padding: '6px 12px', fontSize: 11, borderRadius: 6,
              border: mode === 'auto' ? `2px solid ${C.pri}` : `1px solid ${C.line}`,
              background: mode === 'auto' ? `${C.pri}10` : C.card,
              color: mode === 'auto' ? C.pri : C.muted,
              cursor: 'pointer', fontFamily: 'inherit', fontWeight: mode === 'auto' ? 600 : 400,
            }}
          >
            自动解析（【角色-CV】格式）
          </button>
          <button
            onClick={() => setMode('annotated')}
            style={{
              flex: 1, padding: '6px 12px', fontSize: 11, borderRadius: 6,
              border: mode === 'annotated' ? `2px solid ${C.pri}` : `1px solid ${C.line}`,
              background: mode === 'annotated' ? `${C.pri}10` : C.card,
              color: mode === 'annotated' ? C.pri : C.muted,
              cursor: 'pointer', fontFamily: 'inherit', fontWeight: mode === 'annotated' ? 600 : 400,
            }}
          >
            手动标注（|旁白_START|格式）
          </button>
        </div>

        {/* 上传/输入 */}
        <div style={{ marginBottom: 10 }}>
          <input type="file" accept=".txt" onChange={handleFileUpload} style={{ fontSize: 11, marginBottom: 8 }} />
          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={mode === 'auto'
              ? '粘贴标准画本格式：\n【旁白-墨染】"叙述文字..."\n【角色名-CV】"对话内容..."'
              : '粘贴手动标注格式：\n|旁白_START|\n旁白内容...\n|旁白_END|\n|角色_标记01|'
            }
            rows={5}
            style={{
              width: '100%', padding: '8px 10px', fontSize: 12, fontFamily: 'inherit',
              border: `1px solid ${C.line}`, borderRadius: 6, resize: 'vertical',
              color: C.ink, background: C.card, boxSizing: 'border-box',
            }}
          />
        </div>

        {/* 标记位间隔 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: C.muted }}>标记位间隔</span>
          <input
            type="range"
            min={200}
            max={3000}
            step={100}
            value={silenceMs}
            onChange={e => setSilenceMs(parseInt(e.target.value))}
            style={{ width: 120, accentColor: C.pri }}
          />
          <span style={{ fontSize: 11, color: C.ink, minWidth: 50 }}>{silenceMs}ms</span>
        </div>

        {/* 解析按钮 */}
        <button
          onClick={handleParse}
          disabled={parsing || !inputText.trim()}
          style={{
            width: '100%', padding: '8px 0', fontSize: 12, fontWeight: 600,
            border: 'none', borderRadius: 6, background: C.pri, color: '#fff',
            cursor: parsing ? 'default' : 'pointer', fontFamily: 'inherit',
            opacity: parsing || !inputText.trim() ? 0.6 : 1,
          }}
        >
          {parsing ? '⏳ 解析中...' : '📑 解析画本'}
        </button>

        {parseError && (
          <p style={{ fontSize: 11, color: '#b5454a', marginTop: 8 }}>❌ {parseError}</p>
        )}
      </div>

      {/* Step 2: 编排预览 */}
      {parseResult && (
        <div style={{ marginBottom: 16, padding: 14, background: 'rgba(26,24,20,.02)', border: `1px solid ${C.line}`, borderRadius: C.radius }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 8 }}>
            Step 2：编排预览
          </div>

          {/* 统计 */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 11, color: C.muted }}>
            <span>总段数：{parseResult.stats.total}</span>
            <span>旁白：{parseResult.stats.narration}</span>
            <span>对话标记：{parseResult.stats.dialogMarker}</span>
            <span>静音：{parseResult.stats.silence}</span>
            <span>总字符：{parseResult.stats.totalChars}</span>
          </div>

          {/* 编排清单 */}
          <div style={{ maxHeight: 300, overflowY: 'auto', border: `1px solid ${C.line}`, borderRadius: 6 }}>
            {parseResult.segments.map((seg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 10px', borderBottom: i < parseResult.segments.length - 1 ? `1px solid ${C.line}` : 'none',
                  fontSize: 11,
                }}
              >
                <span style={{ minWidth: 30, color: C.muted, fontSize: 10 }}>#{i + 1}</span>
                {seg.type === 'narration' && (
                  <>
                    <span style={{ padding: '1px 6px', background: 'rgba(153,153,153,.1)', borderRadius: 4, fontSize: 10, color: '#999' }}>旁白</span>
                    <span style={{ flex: 1, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {seg.text?.slice(0, 60)}{seg.text && seg.text.length > 60 ? '...' : ''}
                    </span>
                    <span style={{ fontSize: 10, color: C.muted }}>{seg.text?.length || 0}字</span>
                  </>
                )}
                {seg.type === 'dialog_marker' && (
                  <>
                    <span style={{ padding: '1px 6px', background: `${C.pri}18`, borderRadius: 4, fontSize: 10, color: C.pri }}>{seg.label}</span>
                    <span style={{ flex: 1, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {seg.note}
                    </span>
                  </>
                )}
                {seg.type === 'silence' && (
                  <>
                    <span style={{ padding: '1px 6px', background: 'rgba(26,24,20,.04)', borderRadius: 4, fontSize: 10, color: C.muted }}>静音</span>
                    <span style={{ color: C.muted }}>{seg.ms}ms</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: 批量合成 */}
      {parseResult && parseResult.stats.narration > 0 && (
        <div style={{ marginBottom: 16, padding: 14, background: 'rgba(26,24,20,.02)', border: `1px solid ${C.line}`, borderRadius: C.radius }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 8 }}>
            Step 3：批量合成旁白
          </div>

          {/* 引擎 + 音色选择 */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 10, color: C.muted, display: 'block', marginBottom: 3 }}>引擎</label>
              <select
                value={engine}
                onChange={e => setEngine(e.target.value as 'normal' | 'vip' | 'doubao')}
                style={{ width: '100%', padding: '4px 6px', border: `1px solid ${C.line}`, borderRadius: 4, fontSize: 11, fontFamily: 'inherit' }}
              >
                <option value="normal">🎙️ 标准版（MiMo）</option>
                <option value="vip">⚡ 专业版（讯飞）</option>
                <option value="doubao">🚀 旗舰版（豆包Expressive）</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 10, color: C.muted, display: 'block', marginBottom: 3 }}>音色</label>
              <select
                value={voice}
                onChange={e => setVoice(e.target.value)}
                style={{ width: '100%', padding: '4px 6px', border: `1px solid ${C.line}`, borderRadius: 4, fontSize: 11, fontFamily: 'inherit' }}
              >
                <option value="冰糖">🍬 冰糖（甜美女声·旁白）</option>
                <option value="茉莉">🌸 茉莉（温柔女声·对话）</option>
                <option value="苏打">🥤 苏打（阳光男声·青年）</option>
                <option value="白桦">🌲 白桦（沉稳男声·中年）</option>
                <option value="Mia">✨ Mia (English Female)</option>
                <option value="Chloe">🌙 Chloe (English Gentle)</option>
                <option value="Milo">☀️ Milo (English Male)</option>
                <option value="Dean">🏔️ Dean (English Deep)</option>
              </select>
            </div>
          </div>

          {/* 进度 + 按钮 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <button
              onClick={handleSynthesize}
              disabled={synthesizing}
              style={{
                flex: 1, padding: '8px 0', fontSize: 12, fontWeight: 600,
                border: 'none', borderRadius: 6, background: C.pri, color: '#fff',
                cursor: synthesizing ? 'default' : 'pointer', fontFamily: 'inherit',
                opacity: synthesizing ? 0.6 : 1,
              }}
            >
              {synthesizing
                ? `⏳ 合成中 ${synthProgress.current}/${synthProgress.total}`
                : synthesizedData.size > 0
                  ? `🔄 重新合成 (已有${synthesizedData.size}段)`
                  : '🎵 开始批量合成'}
            </button>
          </div>

          {/* 进度条 */}
          {synthesizing && (
            <div style={{ width: '100%', height: 4, background: C.line, borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', background: C.pri, borderRadius: 2,
                transition: 'width 0.3s',
                width: `${synthProgress.total > 0 ? (synthProgress.current / synthProgress.total) * 100 : 0}%`,
              }} />
            </div>
          )}

          {/* 合成结果统计 */}
          {synthesizedData.size > 0 && (
            <div style={{ marginTop: 6, fontSize: 10, color: '#7a9e7a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>✅ 已合成 {synthesizedData.size} 段</span>
              <span style={{ color: C.muted }}>
                总时长 ≈ {Math.round(Array.from(synthesizedData.values()).reduce((sum, a) => sum + a.duration, 0))}秒
              </span>
            </div>
          )}

          {/* 段级状态概览 */}
          {synthesizedData.size > 0 && (
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {narrationSegments.map((seg, i) => {
                const idx = parseResult.segments.indexOf(seg)
                const done = synthesizedData.has(idx)
                return (
                  <span key={i} style={{
                    padding: '1px 5px', fontSize: 9, borderRadius: 3,
                    background: done ? 'rgba(122,158,122,.15)' : C.line,
                    color: done ? '#7a9e7a' : C.muted,
                  }}>
                    #{i + 1}{done ? '✅' : '⏳'}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 4: 拼接+AU打标 */}
      {synthesizedData.size > 0 && (
        <div style={{ marginBottom: 16, padding: 14, background: 'rgba(26,24,20,.02)', border: `1px solid ${C.line}`, borderRadius: C.radius }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 8 }}>
            Step 4：拼接 + AU 打标
          </div>
          <p style={{ fontSize: 11, color: C.muted, margin: '0 0 10px' }}>
            将 {synthesizedData.size} 段旁白按编排顺序拼接，段间插入 {silenceMs}ms 静音，
            在对话标记位写入 AU Cue 标记
          </p>

          <button
            onClick={handleConcatenate}
            disabled={concatenating}
            style={{
              width: '100%', padding: '8px 0', fontSize: 12, fontWeight: 600,
              border: 'none', borderRadius: 6, background: C.indigo, color: '#fff',
              cursor: concatenating ? 'default' : 'pointer', fontFamily: 'inherit',
              opacity: concatenating ? 0.6 : 1,
            }}
          >
            {concatenating
              ? '⏳ 拼接中...'
              : concatenatedAudio
                ? '🔄 重新拼接'
                : '🔗 开始拼接'}
          </button>

          {concatenating && (
            <div style={{ marginTop: 8, fontSize: 10, color: C.muted, textAlign: 'center' }}>
              正在拼接 {synthesizedData.size} 段音频...
            </div>
          )}

          {concatenatedAudio && (
            <div style={{ marginTop: 8, fontSize: 10, color: '#7a9e7a' }}>
              ✅ 拼接完成：{concatenatedFilename}（{Math.round(concatenatedDuration)}秒）
              <button
                onClick={() => playBase64Audio(concatenatedAudio!)}
                style={{
                  marginLeft: 8, padding: '2px 8px', fontSize: 10, borderRadius: 4,
                  border: `1px solid ${C.pri}`, background: `${C.pri}10`,
                  color: C.pri, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                ▶ 试听
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 5: 后处理润色 */}
      {concatenatedAudio && (
        <div style={{ marginBottom: 16, padding: 14, background: 'rgba(26,24,20,.02)', border: `1px solid ${C.line}`, borderRadius: C.radius }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 8 }}>
            Step 5：后处理润色
          </div>

          {/* 预设卡片 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 6, marginBottom: 10 }}>
            {EFFECTS_PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => setEffectsPreset(p.id)}
                style={{
                  padding: '8px 6px', borderRadius: 8, textAlign: 'center', cursor: 'pointer',
                  border: effectsPreset === p.id ? `2px solid ${C.pri}` : `1px solid ${C.line}`,
                  background: effectsPreset === p.id ? `${C.pri}10` : C.card,
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: 16, marginBottom: 2 }}>{p.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: effectsPreset === p.id ? C.pri : C.ink }}>{p.label}</div>
                <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{p.desc}</div>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleApplyEffects}
              disabled={applyingEffects || effectsApplied}
              style={{
                flex: 1, padding: '8px 0', fontSize: 12, fontWeight: 600,
                border: 'none', borderRadius: 6,
                background: effectsApplied ? '#7a9e7a' : C.pri,
                color: '#fff',
                cursor: applyingEffects || effectsApplied ? 'default' : 'pointer',
                fontFamily: 'inherit', opacity: applyingEffects ? 0.6 : 1,
              }}
            >
              {applyingEffects
                ? '⏳ 应用中...'
                : effectsApplied
                  ? `✅ 已应用「${EFFECTS_PRESETS.find(p => p.id === effectsPreset)?.label}」`
                  : '✨ 应用效果'}
            </button>

            {/* 下载最终文件 */}
            <button
              onClick={handleDownloadFinal}
              disabled={!concatenatedAudio}
              style={{
                padding: '8px 16px', fontSize: 12, fontWeight: 600,
                border: 'none', borderRadius: 6, background: C.ink, color: '#fff',
                cursor: concatenatedAudio ? 'pointer' : 'default',
                fontFamily: 'inherit', opacity: concatenatedAudio ? 1 : 0.4,
              }}
            >
              📥 下载
            </button>
          </div>

          {/* 当前状态 */}
          <div style={{ marginTop: 8, fontSize: 10, color: C.muted, display: 'flex', gap: 12 }}>
            <span>预设：{EFFECTS_PRESETS.find(p => p.id === effectsPreset)?.label}</span>
            <span>状态：{effectsApplied ? '✅ 已应用' : '⏳ 待应用'}</span>
          </div>
        </div>
      )}
    </div>
  )
}
