'use client'

import { useMemo } from 'react'

/**
 * 情绪曲线可视化组件
 * 数据源：segments[].emotionIntensity（1-10）
 * 点击节点跳转到对应段落
 * 颜色按情绪类型变化
 */

interface SegLike {
  index: number
  type: 'narration' | 'dialogue'
  text: string
  emotion: string
  emotionIntensity: number
  characterName?: string
}

interface Props {
  segments: SegLike[]
  currentIndex?: number
  onSegmentClick?: (index: number) => void
}

const EMOTION_COLORS: Record<string, string> = {
  '平静': '#6b7280',
  '开心': '#f59e0b',
  '悲伤': '#6b7280',
  '愤怒': '#ef4444',
  '恐惧': '#8b5cf6',
  '温柔': '#ec4899',
  '严肃': '#374151',
  '冷漠': '#9ca3af',
  '惊讶': '#f97316',
  '兴奋': '#10b981',
}

function getEmotionColor(emotion: string): string {
  return EMOTION_COLORS[emotion] || '#6b7280'
}

export function EmotionChart({ segments, currentIndex, onSegmentClick }: Props) {
  const { points, path, width, height } = useMemo(() => {
    if (segments.length === 0) return { points: [], path: '', width: 0, height: 0 }

    const W = Math.max(segments.length * 48, 300)
    const H = 80
    const padX = 24
    const padY = 12
    const usableW = W - padX * 2
    const usableH = H - padY * 2

    const pts = segments.map((seg, i) => {
      const x = padX + (segments.length === 1 ? usableW / 2 : (i / (segments.length - 1)) * usableW)
      const y = padY + usableH - ((seg.emotionIntensity - 1) / 9) * usableH
      return { x, y, seg, i }
    })

    // Build SVG path
    let d = `M ${pts[0].x} ${pts[0].y}`
    for (let j = 1; j < pts.length; j++) {
      // Smooth curve using quadratic bezier
      const prev = pts[j - 1]
      const curr = pts[j]
      const midX = (prev.x + curr.x) / 2
      d += ` Q ${prev.x + (curr.x - prev.x) * 0.3} ${prev.y}, ${midX} ${(prev.y + curr.y) / 2}`
      d += ` Q ${prev.x + (curr.x - prev.x) * 0.7} ${curr.y}, ${curr.x} ${curr.y}`
    }

    return { points: pts, path: d, width: W, height: H }
  }, [segments])

  if (segments.length === 0) return null

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: 'rgba(26,24,20,.45)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontWeight: 600 }}>📈 情绪曲线</span>
        <span>{segments.length} 段</span>
        <span>峰值 {Math.max(...segments.map(s => s.emotionIntensity))}</span>
        <span>谷值 {Math.min(...segments.map(s => s.emotionIntensity))}</span>
      </div>
      <div style={{ overflowX: 'auto', background: 'rgba(26,24,20,.02)', border: '1px solid rgba(26,24,20,.06)', borderRadius: 8, padding: '8px 4px' }}>
        <svg width={width} height={height} style={{ display: 'block' }}>
          {/* Grid lines */}
          {[3, 5, 7].map(v => {
            const y = 12 + 56 - ((v - 1) / 9) * 56
            return (
              <g key={v}>
                <line x1={24} y1={y} x2={width - 24} y2={y} stroke="rgba(26,24,20,.06)" strokeDasharray="4 4" />
                <text x={18} y={y + 3} textAnchor="end" fontSize={8} fill="rgba(26,24,20,.25)">{v}</text>
              </g>
            )
          })}

          {/* Path */}
          <path d={path} fill="none" stroke="rgba(26,24,20,.15)" strokeWidth={2} />

          {/* Data points */}
          {points.map(({ x, y, seg, i }) => {
            const isActive = currentIndex === seg.index
            const color = getEmotionColor(seg.emotion)
            return (
              <g
                key={seg.index}
                onClick={() => onSegmentClick?.(seg.index)}
                style={{ cursor: 'pointer' }}
              >
                {/* Highlight ring for active */}
                {isActive && (
                  <circle cx={x} cy={y} r={8} fill="none" stroke={color} strokeWidth={2} opacity={0.3} />
                )}
                {/* Point */}
                <circle
                  cx={x}
                  cy={y}
                  r={isActive ? 5 : 3.5}
                  fill={isActive ? color : '#fff'}
                  stroke={color}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                {/* Segment number label */}
                <text
                  x={x}
                  y={height - 2}
                  textAnchor="middle"
                  fontSize={8}
                  fill={isActive ? 'rgba(26,24,20,.8)' : 'rgba(26,24,20,.3)'}
                  fontWeight={isActive ? 600 : 400}
                >
                  #{i + 1}
                </text>
                {/* Emotion label on hover/active */}
                {isActive && (
                  <text x={x} y={y - 10} textAnchor="middle" fontSize={9} fill={color} fontWeight={600}>
                    {seg.emotion} {seg.emotionIntensity}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
