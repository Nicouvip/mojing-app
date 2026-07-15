'use client'

import { useState, useRef, useMemo, useEffect } from 'react'
import Navbar from '@/components/navbar'
import type { CharacterAnalysis, SegmentAnalysis, AnalysisResult } from '@/lib/audiobook/prompts'

/* ── 设计令牌 ── */
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

export default function TextAnalyzerPage() {
  const [inputText, setInputText] = useState('')
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')
  const [segments, setSegments] = useState<SegmentAnalysis[]>([])
  const [characters, setCharacters] = useState<CharacterAnalysis[]>([])
  const [defaultVoice, setDefaultVoice] = useState('冰糖')
  const [defaultEmotion, setDefaultEmotion] = useState('平静')
  const [filterTab, setFilterTab] = useState<string>('all')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  /* ── 生成状态 ── */
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [audioCache, setAudioCache] = useState<Record<string, { audioBase64: string; duration: number }>>({})
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioUrlRef = useRef<string | null>(null)

  /* ── 导出格式 ── */
  const [exportFormat, setExportFormat] = useState<'text' | 'json' | 'audio'>('text')
  const [exportVoice, setExportVoice] = useState('冰糖')
  const [exportEmotion, setExportEmotion] = useState('平静')

  /* ── 分析 ── */
  const handleAnalyze = async () => {
    if (!inputText.trim()) { alert('请先输入或粘贴文本'); return }
    setAnalyzing(true)
    setAnalyzeError('')
    try {
      const res = await fetch('/api/audiobook/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      })
      const data = await res.json()
      if (data.success) {
        setAnalysisResult(data)
        setCharacters(data.characters || [])
        setSegments(data.segments || [])
      } else {
        setAnalyzeError(data.error || '分析失败')
      }
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : '网络错误')
    } finally {
      setAnalyzing(false)
    }
  }

  /* ── 筛选 ── */
  const filteredSegments = useMemo(() => {
    if (filterTab === 'all') return segments
    if (filterTab === 'narration') return segments.filter(s => s.type === 'narration')
    return segments.filter(s => s.type === 'dialogue' && s.characterName === filterTab)
  }, [segments, filterTab])

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

  const getCharColor = (name: string) => {
    const idx = characters.findIndex(c => c.name === name)
    return ['#c4956a', '#3a5279', '#b5454a', '#7a9e7a', '#8e63ce', '#d4a0a0', '#4a86e8', '#eaa041'][idx % 8]
  }

  /* ── 多选 ── */
  const toggleSelect = (idx: number) => {
    setSelectedIds(prev => { const n = new Set(prev); if (n.has(idx)) n.delete(idx); else n.add(idx); return n })
  }
  const selectAll = () => setSelectedIds(new Set(filteredSegments.map(s => s.index)))
  const clearSelection = () => setSelectedIds(new Set())

  /* ── 播放 ── */
  const playBase64 = (base64: string, id: string) => {
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
  }

  /* ── 生成单段 ── */
  const generateOne = async (seg: SegmentAnalysis) => {
    const segKey = `seg-${seg.index}`
    setGeneratingId(segKey)
    try {
      const res = await fetch('/api/audiobook/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: seg.text,
          voice: seg.recommendedVoice || defaultVoice,
          emotion: seg.emotion !== '平静' ? seg.emotion : undefined,
        }),
      })
      const data = await res.json()
      if (data.success && data.audio) {
        setAudioCache(prev => ({ ...prev, [segKey]: { audioBase64: data.audio, duration: data.duration || 3 } }))
      }
    } catch { /* ignore */ }
    setGeneratingId(null)
  }

  /* ── 导出 ── */
  const handleExport = async () => {
    const targetSegs = selectedIds.size > 0
      ? segments.filter(s => selectedIds.has(s.index))
      : filteredSegments

    if (targetSegs.length === 0) { alert('没有可导出的内容'); return }

    if (exportFormat === 'text') {
      const lines = targetSegs.map(s => {
        const prefix = s.type === 'dialogue' ? `「${s.characterName || '未知'}」` : '【旁白】'
        return `${prefix}${s.text}`
      })
      const text = `=== 文本分析导出 ===\n角色数：${characters.length}，段落数：${targetSegs.length}\n\n${lines.join('\n\n')}`
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = '文本分析导出.txt'; a.click()
      URL.revokeObjectURL(url)
    } else if (exportFormat === 'json') {
      const json = JSON.stringify({ characters, segments: targetSegs, exportedAt: new Date().toISOString() }, null, 2)
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = '文本分析导出.json'; a.click()
      URL.revokeObjectURL(url)
    } else if (exportFormat === 'audio') {
      // 批量生成并拼接
      for (let i = 0; i < targetSegs.length; i++) {
        const seg = targetSegs[i]
        const segKey = `seg-${seg.index}`
        if (!audioCache[segKey]) await generateOne(seg)
      }
      alert(`已生成 ${targetSegs.length} 段音频，可逐段试听下载`)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          {/* ── 顶栏 ── */}
          <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', height: 56, borderBottom: `1px solid ${C.line}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>🔬</span>
              <h1 style={{ fontSize: 16, fontWeight: 600, color: C.ink, margin: 0 }}>文本分析工具</h1>
              <span style={{ fontSize: 11, color: C.muted, padding: '2px 8px', background: 'rgba(26,24,20,.04)', borderRadius: 10 }}>
                AI 分析语气/情绪/音色推荐
              </span>
            </div>
          </header>

          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* ── 左栏：输入 ── */}
            <div style={{ width: '40%', borderRight: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: 16, borderBottom: `1px solid ${C.line}` }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: C.ink, margin: '0 0 8px' }}>📝 输入文本</h3>
                <textarea
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="在此粘贴小说段落、剧本对白或任意文本…&#10;&#10;AI 会自动分析：&#10;• 识别角色和对话&#10;• 推荐音色和情绪&#10;• 标注语速和停顿"
                  style={{ width: '100%', height: 280, padding: 12, border: `1px solid ${C.line}`, borderRadius: C.radius, fontSize: 13, color: C.ink, fontFamily: 'inherit', background: C.paper, resize: 'vertical', lineHeight: 1.7, boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: C.muted }}>{inputText.length} 字符</span>
                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing || !inputText.trim()}
                    style={{ padding: '7px 20px', background: C.pri, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, color: '#fff', cursor: analyzing || !inputText.trim() ? 'default' : 'pointer', fontFamily: 'inherit', opacity: analyzing || !inputText.trim() ? 0.6 : 1 }}
                  >
                    {analyzing ? '⏳ 分析中...' : '🔍 AI 分析'}
                  </button>
                </div>
                {analyzeError && <p style={{ fontSize: 11, color: C.crimson, marginTop: 6 }}>❌ {analyzeError}</p>}
              </div>

              {/* ── 参数设置 ── */}
              <div style={{ padding: 16, borderBottom: `1px solid ${C.line}` }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: C.ink, margin: '0 0 10px' }}>🎛️ 默认参数</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 500, color: C.muted, marginBottom: 4, display: 'block' }}>默认音色</label>
                    <select value={defaultVoice} onChange={e => setDefaultVoice(e.target.value)} style={{ width: '100%', padding: '6px 10px', border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 12, color: C.ink, background: C.card, fontFamily: 'inherit' }}>
                      {PRESET_VOICES.map(v => <option key={v.id} value={v.id}>{v.icon} {v.name} — {v.desc}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 500, color: C.muted, marginBottom: 4, display: 'block' }}>默认情绪</label>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {EMOTIONS.map(em => (
                        <button key={em} onClick={() => setDefaultEmotion(em)} style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, border: 'none', background: defaultEmotion === em ? C.pri : 'rgba(26,24,20,.04)', color: defaultEmotion === em ? '#fff' : C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 导出设置 ── */}
              <div style={{ padding: 16, flex: 1 }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: C.ink, margin: '0 0 10px' }}>📦 导出</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[
                      { id: 'text' as const, label: '📄 文本' },
                      { id: 'json' as const, label: '📋 JSON' },
                      { id: 'audio' as const, label: '🎵 音频' },
                    ].map(f => (
                      <button key={f.id} onClick={() => setExportFormat(f.id)} style={{ flex: 1, padding: '6px 0', borderRadius: 6, fontSize: 11, border: `1px solid ${exportFormat === f.id ? C.pri : C.line}`, background: exportFormat === f.id ? 'rgba(196,149,106,.12)' : C.card, color: exportFormat === f.id ? C.pri : C.ink, cursor: 'pointer', fontFamily: 'inherit', fontWeight: exportFormat === f.id ? 600 : 400 }}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                  {exportFormat === 'audio' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <select value={exportVoice} onChange={e => setExportVoice(e.target.value)} style={{ flex: 1, padding: '5px 8px', border: `1px solid ${C.line}`, borderRadius: 4, fontSize: 10, color: C.ink, background: C.card, fontFamily: 'inherit' }}>
                        {PRESET_VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </select>
                      <select value={exportEmotion} onChange={e => setExportEmotion(e.target.value)} style={{ flex: 1, padding: '5px 8px', border: `1px solid ${C.line}`, borderRadius: 4, fontSize: 10, color: C.ink, background: C.card, fontFamily: 'inherit' }}>
                        {EMOTIONS.map(em => <option key={em} value={em}>{em}</option>)}
                      </select>
                    </div>
                  )}
                  <button onClick={handleExport} disabled={segments.length === 0} style={{ padding: '7px 0', background: segments.length === 0 ? '#ccc' : C.pri, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, color: '#fff', cursor: segments.length === 0 ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                    📥 导出{selectedIds.size > 0 ? `选中 (${selectedIds.size})` : '当前筛选'}
                  </button>
                </div>
              </div>
            </div>

            {/* ── 右栏：结果 ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {segments.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: C.muted }}>
                  <div style={{ fontSize: 48 }}>🔬</div>
                  <p style={{ fontSize: 14 }}>在左侧输入文本，点击「AI 分析」开始</p>
                  <p style={{ fontSize: 12 }}>支持小说段落、剧本对白、散文等任意文本</p>
                </div>
              ) : (
                <>
                  {/* ── 结果统计 ── */}
                  <div style={{ padding: '10px 20px', borderBottom: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: C.muted }}>
                    <span>📊 共 {segments.length} 段 · {characters.length} 个角色 · 旁白 {segments.filter(s => s.type === 'narration').length} 段 · 对话 {segments.filter(s => s.type === 'dialogue').length} 段</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={selectAll} style={{ padding: '3px 10px', borderRadius: 4, fontSize: 10, border: `1px solid ${C.line}`, background: C.card, color: C.ink, cursor: 'pointer', fontFamily: 'inherit' }}>☑ 全选</button>
                      <button onClick={clearSelection} style={{ padding: '3px 10px', borderRadius: 4, fontSize: 10, border: `1px solid ${C.line}`, background: C.card, color: C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>取消</button>
                    </div>
                  </div>

                  {/* ── 筛选 Tab ── */}
                  <div style={{ display: 'flex', gap: 4, padding: '8px 20px', borderBottom: `1px solid ${C.line}`, overflowX: 'auto' }}>
                    {filterTabs.map(tab => (
                      <button key={tab.id} onClick={() => { setFilterTab(tab.id); clearSelection() }}
                        style={{ padding: '4px 12px', borderRadius: 14, fontSize: 11, border: 'none', background: filterTab === tab.id ? C.pri : 'rgba(26,24,20,.04)', color: filterTab === tab.id ? '#fff' : C.ink, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', fontWeight: filterTab === tab.id ? 600 : 400 }}>
                        {tab.label} ({tab.count})
                      </button>
                    ))}
                  </div>

                  {/* ── 段落列表 ── */}
                  <div style={{ flex: 1, overflow: 'auto', padding: '12px 20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {filteredSegments.map(seg => {
                        const isDialogue = seg.type === 'dialogue'
                        const color = isDialogue && seg.characterName ? getCharColor(seg.characterName) : '#999'
                        const segKey = `seg-${seg.index}`
                        const audio = audioCache[segKey]
                        const isPlaying = playingId === segKey
                        const isGen = generatingId === segKey
                        const isSelected = selectedIds.has(seg.index)

                        return (
                          <div key={seg.index} style={{
                            padding: '8px 12px',
                            background: isSelected ? `${color}10` : isPlaying ? `${color}10` : C.card,
                            borderLeft: `3px solid ${color}`,
                            borderTop: `1px solid ${isSelected ? color : C.line}`,
                            borderRight: `1px solid ${isSelected ? color : C.line}`,
                            borderBottom: `1px solid ${isSelected ? color : C.line}`,
                            borderRadius: C.radius,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                              <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(seg.index)} style={{ accentColor: C.pri, width: 13, height: 13, cursor: 'pointer' }} />
                              {isDialogue && seg.characterName ? (
                                <span style={{ fontSize: 10, padding: '1px 6px', background: `${color}18`, borderRadius: 8, color, fontWeight: 600 }}>{seg.characterName}</span>
                              ) : (
                                <span style={{ fontSize: 10, padding: '1px 6px', background: 'rgba(26,24,20,.06)', borderRadius: 8, color: C.muted }}>叙述</span>
                              )}
                              <span style={{ fontSize: 10, color: C.muted }}>情绪: {seg.emotion}</span>
                              <span style={{ fontSize: 10, color: C.muted }}>强度: {seg.emotionIntensity}</span>
                              {seg.recommendedVoice && <span style={{ fontSize: 10, color: C.indigo }}>🎤 {seg.recommendedVoice}</span>}
                              {seg.specialNote && <span style={{ fontSize: 10, color: C.indigo }} title={seg.specialNote}>📝</span>}
                              <div style={{ flex: 1 }} />
                              <span style={{ fontSize: 10, color: C.muted }}>#{seg.index + 1}</span>
                            </div>
                            <div style={{ fontSize: 13, lineHeight: 1.7, color: C.ink }}>
                              {isDialogue ? `「${seg.text}」` : seg.text}
                            </div>
                            <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
                              <button onClick={() => generateOne(seg)} disabled={isGen || !!generatingId} style={{ padding: '2px 8px', fontSize: 11, border: `1px solid ${C.line}`, borderRadius: 4, background: C.card, color: isGen ? C.pri : C.muted, cursor: isGen ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                                {isGen ? '⏳...' : '🎵 生成'}
                              </button>
                              {audio && (
                                <button onClick={() => playBase64(audio.audioBase64, segKey)} style={{ padding: '2px 8px', fontSize: 11, border: `1px solid ${isPlaying ? C.pri : C.line}`, borderRadius: 4, background: isPlaying ? 'rgba(196,149,106,.12)' : C.card, color: isPlaying ? C.pri : C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
                                  {isPlaying ? '⏸' : '▶'} 试听
                                </button>
                              )}
                              {audio && <span style={{ fontSize: 10, color: C.green, alignSelf: 'center' }}>✓ {Math.floor(audio.duration)}s</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} />
    </div>
  )
}
