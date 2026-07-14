'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import { parseChapterText, extractCharacters, CHAR_COLORS, type TextSegment, type DetectedCharacter } from '@/lib/audiobook/text-parser'
import type { Chapter } from '@/lib/db/types'

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

const VOICES = [
  { id: '冰糖', name: '冰糖', desc: '甜美女声' },
  { id: '茉莉', name: '茉莉', desc: '温柔女声' },
  { id: '苏打', name: '苏打', desc: '阳光男声' },
  { id: '白桦', name: '白桦', desc: '沉稳男声' },
  { id: 'Mia', name: 'Mia', desc: 'English Female' },
  { id: 'Chloe', name: 'Chloe', desc: 'English Gentle' },
  { id: 'Milo', name: 'Milo', desc: 'English Male' },
  { id: 'Dean', name: 'Dean', desc: 'English Deep' },
]

interface SegmentAudio {
  audioBase64: string
  duration: number
}

interface Props {
  chapter: Chapter
  defaultVoice: string
  defaultEmotion: string
}

export function DialogueMode({ chapter, defaultVoice, defaultEmotion }: Props) {
  const segments = useMemo(() => {
    if (!chapter.content) return []
    return parseChapterText(chapter.content)
  }, [chapter.content])

  const characters = useMemo(() => extractCharacters(segments), [segments])

  const [charVoices, setCharVoices] = useState<Record<string, string>>({})
  const [narratorVoice, setNarratorVoice] = useState(defaultVoice)
  const [narratorEmotion, setNarratorEmotion] = useState(defaultEmotion)
  const [audioCache, setAudioCache] = useState<Record<string, SegmentAudio>>({})
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioUrlRef = useRef<string | null>(null)

  const getColor = (name: string) => {
    const idx = characters.findIndex(c => c.name === name)
    return idx >= 0 ? CHAR_COLORS[idx % CHAR_COLORS.length] : C.muted
  }

  const getVoice = (seg: TextSegment) => {
    if (seg.type === 'narration') return narratorVoice
    return (seg.characterName && charVoices[seg.characterName]) || narratorVoice
  }

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

  const generateOne = async (seg: TextSegment) => {
    if (generatingId) return
    setGeneratingId(seg.id)
    try {
      const res = await fetch('/api/audiobook/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: seg.text, voice: getVoice(seg), emotion: seg.type === 'narration' ? narratorEmotion : undefined }),
      })
      const data = await res.json()
      if (data.success && data.audio) {
        setAudioCache(prev => ({ ...prev, [seg.id]: { audioBase64: data.audio, duration: data.duration } }))
      }
    } catch (err) {
      console.error('Generate failed:', err)
    } finally {
      setGeneratingId(null)
    }
  }

  const generateAll = async () => {
    const todo = segments.filter(s => !audioCache[s.id])
    for (let i = 0; i < todo.length; i++) {
      setGeneratingId('batch')
      await generateOne(todo[i])
    }
    setGeneratingId(null)
  }

  if (segments.length === 0) return <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>该章节暂无内容</div>

  return (
    <div style={{ display: 'flex', gap: 20 }}>
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} />

      {/* 左侧：角色列表 */}
      <div style={{ width: 220, flexShrink: 0 }}>
        <div style={{ padding: 10, background: 'rgba(26,24,20,.02)', border: `1px solid ${C.line}`, borderRadius: C.radius, marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.ink, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.muted }} />
            旁白
          </div>
          <select value={narratorVoice} onChange={e => setNarratorVoice(e.target.value)} style={{ width: '100%', padding: '4px 6px', border: `1px solid ${C.line}`, borderRadius: 4, fontSize: 11, fontFamily: 'inherit', marginBottom: 4 }}>
            {VOICES.map(v => <option key={v.id} value={v.id}>{v.name} — {v.desc}</option>)}
          </select>
          <select value={narratorEmotion} onChange={e => setNarratorEmotion(e.target.value)} style={{ width: '100%', padding: '4px 6px', border: `1px solid ${C.line}`, borderRadius: 4, fontSize: 11, fontFamily: 'inherit' }}>
            {['平静', '开心', '悲伤', '愤怒', '温柔', '严肃'].map(em => <option key={em} value={em}>{em}</option>)}
          </select>
        </div>

        {characters.map(ch => (
          <div key={ch.name} style={{ padding: 8, background: 'rgba(26,24,20,.02)', border: `1px solid ${C.line}`, borderRadius: C.radius, marginBottom: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: getColor(ch.name), marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: getColor(ch.name) }} />
              {ch.name} <span style={{ fontWeight: 400, color: C.muted }}>({ch.count}句)</span>
            </div>
            <select value={charVoices[ch.name] || ''} onChange={e => setCharVoices(p => ({ ...p, [ch.name]: e.target.value || defaultVoice }))} style={{ width: '100%', padding: '4px 6px', border: `1px solid ${C.line}`, borderRadius: 4, fontSize: 11, fontFamily: 'inherit' }}>
              <option value="">跟随旁白</option>
              {VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
        ))}

        <button onClick={generateAll} disabled={!!generatingId} style={{ width: '100%', padding: '8px 0', background: C.pri, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, color: '#fff', cursor: generatingId ? 'default' : 'pointer', fontFamily: 'inherit', marginTop: 10, opacity: generatingId ? 0.6 : 1 }}>
          {generatingId === 'batch' ? '⏳ 生成中...' : '🎵 全部生成'}
        </button>

        <div style={{ marginTop: 12, fontSize: 11, color: C.muted }}>
          <div>段落 {segments.length} · 对话 {segments.filter(s => s.type === 'dialogue').length} · 已生成 {Object.keys(audioCache).length}</div>
        </div>
      </div>

      {/* 右侧：段落列表 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {segments.map(seg => {
          const isDialogue = seg.type === 'dialogue'
          const color = isDialogue && seg.characterName ? getColor(seg.characterName) : C.muted
          const audio = audioCache[seg.id]
          const isPlaying = playingId === seg.id
          const isGen = generatingId === seg.id

          return (
            <div key={seg.id} style={{
              padding: '8px 12px', background: isPlaying ? `${color}10` : C.card,
              border: `1px solid ${isPlaying ? color : C.line}`,
              borderLeft: `3px solid ${color}`, borderRadius: C.radius, transition: 'all .12s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                {isDialogue ? (
                  <span style={{ fontSize: 10, padding: '1px 6px', background: `${color}18`, borderRadius: 8, color, fontWeight: 600 }}>{seg.characterName}</span>
                ) : (
                  <span style={{ fontSize: 10, padding: '1px 6px', background: 'rgba(26,24,20,.06)', borderRadius: 8, color: C.muted }}>叙述</span>
                )}
                <div style={{ flex: 1 }} />
                {audio && <span style={{ fontSize: 10, color: C.green }}>✓ {Math.floor(audio.duration)}s</span>}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.7, color: C.ink }}>{isDialogue ? `「${seg.text}」` : seg.text}</div>
              <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
                <button onClick={() => generateOne(seg)} disabled={isGen || !!generatingId} style={{ padding: '2px 8px', fontSize: 11, border: `1px solid ${C.line}`, borderRadius: 4, background: C.card, color: isGen ? C.pri : C.muted, cursor: isGen ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                  {isGen ? '⏳...' : '🎵 生成'}
                </button>
                {audio && (
                  <button onClick={() => playBase64(audio.audioBase64, seg.id)} style={{ padding: '2px 8px', fontSize: 11, border: `1px solid ${isPlaying ? C.pri : C.line}`, borderRadius: 4, background: isPlaying ? 'rgba(196,149,106,.12)' : C.card, color: isPlaying ? C.pri : C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {isPlaying ? '⏸' : '▶'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
