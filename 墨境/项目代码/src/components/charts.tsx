'use client'

/** 共享图表组件 */

export function SimpleLineChart({ data, color }: { data: { label: string; value: number; max: number }[]; color: string }) {
  const w = 300, h = 64, pad = 4
  if (data.length === 0) return <div className="text-xs text-muted-foreground py-4 text-center">暂无数据</div>
  const maxVal = Math.max(...data.map(d => d.max))
  const xStep = data.length > 1 ? w / (data.length - 1) : w / 2
  const points = data.map((d, i) => `${(i * xStep).toFixed(1)},${(h - ((d.value / maxVal) * (h - pad * 2)) - pad).toFixed(1)}`).join(' ')
  const lastX = data.length > 1 ? ((data.length - 1) * xStep).toFixed(1) : xStep.toFixed(1)
  const area = data.length >= 1 ? `0,${h} ${points} ${lastX},${h} 0,${h}` : ''
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16" preserveAspectRatio="none">
      {area && <polygon points={area} fill={color} fillOpacity={0.08} />}
      {data.length >= 1 && <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />}
      {data.map((d, i) => (
        <circle key={i} cx={(i * xStep).toFixed(1)} cy={(h - ((d.value / maxVal) * (h - pad * 2)) - pad).toFixed(1)} r={2} fill={color} />
      ))}
    </svg>
  )
}

export function SimpleBarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const h = 60
  if (data.length === 0) return <div className="text-xs text-muted-foreground py-4 text-center">暂无数据</div>
  const maxVal = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-[3px]" style={{ height: h }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
          <div
            className="w-full rounded-t transition-all duration-300"
            style={{ height: `${Math.max((d.value / maxVal) * (h - 8), 2)}px`, background: color, opacity: 0.7 + (d.value / maxVal) * 0.3 }}
          />
          <span className="text-[10px] text-muted-foreground truncate w-full text-center" title={d.label}>
            {d.label.replace(/^第/, '').slice(0, 4)}
          </span>
        </div>
      ))}
    </div>
  )
}
