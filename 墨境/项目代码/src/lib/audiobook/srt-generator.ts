/**
 * SRT 字幕生成工具
 * 从 ASR 时间戳数组生成标准 SRT 格式字幕
 */

export interface Timestamp {
  start: number  // 秒
  end: number    // 秒
  text: string
}

/** 秒数转为 SRT 时间格式：00:00:00,000 */
function formatSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`
}

/** 生成 SRT 格式字幕文本 */
export function generateSRT(timestamps: Timestamp[]): string {
  if (!timestamps || timestamps.length === 0) return ''

  const lines: string[] = []

  for (let i = 0; i < timestamps.length; i++) {
    const t = timestamps[i]
    if (!t.text || t.text.trim().length === 0) continue

    lines.push(String(i + 1))
    lines.push(`${formatSRTTime(t.start)} --> ${formatSRTTime(t.end)}`)
    lines.push(t.text.trim())
    lines.push('') // 空行分隔
  }

  return lines.join('\n')
}

/** 从段落分析结果生成模拟时间戳（用于无 ASR 时） */
export function generateFakeTimestamps(
  segments: Array<{ text: string }>,
  estimatedDurationSec: number,
): Timestamp[] {
  if (segments.length === 0) return []

  const totalChars = segments.reduce((sum, s) => sum + s.text.length, 0)
  const secPerChar = estimatedDurationSec / Math.max(totalChars, 1)

  let currentTime = 0
  return segments.map(seg => {
    const duration = seg.text.length * secPerChar
    const ts: Timestamp = {
      start: currentTime,
      end: currentTime + duration,
      text: seg.text,
    }
    currentTime += duration
    return ts
  })
}

/** 生成 LRC 格式字幕（用于音乐播放器） */
export function generateLRC(timestamps: Timestamp[]): string {
  if (!timestamps || timestamps.length === 0) return ''

  return timestamps
    .filter(t => t.text.trim())
    .map(t => {
      const m = Math.floor(t.start / 60)
      const s = Math.floor(t.start % 60)
      const ms = Math.floor((t.start % 1) * 100)
      return `[${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}]${t.text.trim()}`
    })
    .join('\n')
}
