'use client'

import { useState, useMemo, useCallback } from 'react'

/**
 * 音频时间线可拖拽编辑器
 *
 * 功能：
 * - 段落卡片可拖拽排序
 * - 每对段落之间独立间隔滑块（0-2000ms）
 * - 全局间隔滑块 + "应用到全部"
 * - 淡入淡出时长滑块
 * - 总时长实时计算
 */

interface Segment {
  index: number
  type: 'narration' | 'dialogue'
  text: string
  characterName?: string
  emotion?: string
}

interface AudioSegment extends Segment {
  duration?: number
  hasAudio: boolean
}

interface Props {
  segments: AudioSegment[]
  onReorder?: (newOrder: number[]) => void
  onIntervalChange?: (intervals: number[]) => void
  onGlobalIntervalChange?: (ms: number) => void
  onFadeChange?: (fadeIn: number, fadeOut: number) => void
  onPreview?: (index: number) => void
}

const C = {
  pri: '#c4956a',
  ink: '#1a1814',
  muted: 'rgba(26,24,20,.45)',
  line: 'rgba(26,24,20,.06)',
  card: '#fff',
  radius: 8,
}

export function AudioTimeline({
  segments,
  onReorder,
  onIntervalChange,
  onGlobalIntervalChange,
  onFadeChange,
  onPreview,
}: Props) {
  const [order, setOrder] = useState<number[]>(() => segments.map((_, i) => i))
  const [intervals, setIntervals] = useState<number[]>(() =>
    segments.length > 1 ? new Array(segments.length - 1).fill(800) : []
  )
  const [globalInterval, setGlobalInterval] = useState(800)
  const [fadeIn, setFadeIn] = useState(80)
  const [fadeOut, setFadeOut] = useState(80)
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  // Recalculate order when segments change
  useMemo(() => {
    if (segments.length !== order.length) {
      setOrder(segments.map((_, i) => i))
      setIntervals(segments.length > 1 ? new Array(segments.length - 1).fill(800) : [])
    }
  }, [segments.length])

  // Total duration calculation
  const totalDuration = useMemo(() => {
    let total = 0
    for (let i = 0; i < order.length; i++) {
      const seg = segments[order[i]]
      total += seg?.duration || 0
      if (i < order.length - 1) {
        total += (intervals[i] || 0) / 1000
      }
    }
    return total
  }, [order, segments, intervals])

  const totalSegments = order.length
  const readySegments = order.filter(i => segments[i]?.hasAudio).length

  const handleDragStart = (idx: number) => setDragIdx(idx)

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    const newOrder = [...order]
    const [moved] = newOrder.splice(dragIdx, 1)
    newOrder.splice(idx, 0, moved)
    setOrder(newOrder)
    setDragIdx(idx)
    onReorder?.(newOrder)
  }

  const handleDragEnd = () => setDragIdx(null)

  const handleIntervalChange = (idx: number, value: number) => {
    const newIntervals = [...intervals]
    newIntervals[idx] = value
    setIntervals(newIntervals)
    onIntervalChange?.(newIntervals)
  }

  const handleApplyGlobalInterval = () => {
    const newIntervals = new Array(Math.max(0, segments.length - 1)).fill(globalInterval)
    setIntervals(newIntervals)
    onGlobalIntervalChange?.(globalInterval)
    onIntervalChange?.(newIntervals)
  }

  const handleFadeChange = (type: 'in' | 'out', value: number) => {
    if (type === 'in') setFadeIn(value)
    else setFadeOut(value)
    onFadeChange?.(type === 'in' ? value : fadeIn, type === 'out' ? value : fadeOut)
  }

  const getSegColor = (seg: Segment) => {
    if (seg.type === 'dialogue' && seg.characterName) {
      const colors = ['#c4956a', '#3a5279', '#b5454a', '#7a9e7a', '#8e63ce']
      const hash = seg.characterName.charCodeAt(0) % colors.length
      return colors[hash]
    }
    return '#999'
  }

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }

  if (segments.length === 0) return null

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.ink }}>
          🔗 音频时间线
        </div>
        <div style={{ fontSize: 10, color: C.muted }}>
          {readySegments}/{totalSegments} 段 · {formatTime(totalDuration)}
        </div>
      </div>

      {/* Timeline cards (draggable) */}
      <div style={{ display: 'flex', gap: 4, overflowX: 'auto', padding: '8px 0', marginBottom: 8 }}>
        {order.map((segIdx, pos) => {
          const seg = segments[segIdx]
          if (!seg) return null
          const color = getSegColor(seg)
          const isDragging = dragIdx === pos

          return (
            <div key={segIdx}>
              {/* Segment card */}
              <div
                draggable
                onDragStart={() => handleDragStart(pos)}
                onDragOver={e => handleDragOver(e, pos)}
                onDragEnd={handleDragEnd}
                onClick={() => onPreview?.(segIdx)}
                style={{
                  minWidth: 80,
                  padding: '6px 8px',
                  background: isDragging ? `${color}20` : seg.hasAudio ? `${color}10` : C.card,
                  border: `1px solid ${isDragging ? color : C.line}`,
                  borderRadius: 6,
                  cursor: 'grab',
                  fontSize: 10,
                  textAlign: 'center',
                  opacity: isDragging ? 0.5 : 1,
                  transition: 'opacity .15s',
                }}
              >
                <div style={{ fontWeight: 600, color, marginBottom: 2 }}>
                  #{pos + 1} {seg.type === 'narration' ? '旁白' : seg.characterName || '对话'}
                </div>
                <div style={{ color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>
                  {seg.text.slice(0, 15)}...
                </div>
                {seg.duration && (
                  <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>
                    {seg.duration.toFixed(1)}s
                  </div>
                )}
              </div>

              {/* Interval slider between cards */}
              {pos < order.length - 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 40, padding: '4px 0' }}>
                  <div style={{ fontSize: 9, color: C.muted }}>{intervals[pos] || 800}ms</div>
                  <input
                    type="range"
                    min={0}
                    max={2000}
                    step={100}
                    value={intervals[pos] || 800}
                    onChange={e => handleIntervalChange(pos, parseInt(e.target.value))}
                    style={{ width: 40, writingMode: 'vertical-lr', direction: 'rtl', height: 30, accentColor: C.pri }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Global controls */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', padding: '6px 10px', background: 'rgba(26,24,20,.02)', borderRadius: 6 }}>
        {/* Global interval */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: C.muted }}>全局间隔</span>
          <input
            type="range"
            min={0}
            max={2000}
            step={100}
            value={globalInterval}
            onChange={e => setGlobalInterval(parseInt(e.target.value))}
            style={{ width: 80, accentColor: C.pri }}
          />
          <span style={{ fontSize: 10, color: C.ink, minWidth: 40 }}>{globalInterval}ms</span>
          <button
            onClick={handleApplyGlobalInterval}
            style={{
              padding: '2px 8px', fontSize: 9, borderRadius: 4,
              border: `1px solid ${C.pri}`, background: `${C.pri}10`,
              color: C.pri, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            应用到全部
          </button>
        </div>

        {/* Fade in/out */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: C.muted }}>淡入</span>
          <input
            type="range"
            min={0}
            max={200}
            step={10}
            value={fadeIn}
            onChange={e => handleFadeChange('in', parseInt(e.target.value))}
            style={{ width: 60, accentColor: C.pri }}
          />
          <span style={{ fontSize: 10, color: C.ink, minWidth: 30 }}>{fadeIn}ms</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: C.muted }}>淡出</span>
          <input
            type="range"
            min={0}
            max={200}
            step={10}
            value={fadeOut}
            onChange={e => handleFadeChange('out', parseInt(e.target.value))}
            style={{ width: 60, accentColor: C.pri }}
          />
          <span style={{ fontSize: 10, color: C.ink, minWidth: 30 }}>{fadeOut}ms</span>
        </div>

        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 10, color: C.muted }}>
          总时长：<span style={{ fontWeight: 600, color: C.ink }}>{formatTime(totalDuration)}</span>
        </div>
      </div>
    </div>
  )
}
