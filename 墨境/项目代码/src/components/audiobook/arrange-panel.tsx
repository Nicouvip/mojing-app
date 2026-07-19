'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'

/**
 * 多轨编排面板
 *
 * 流程：上传画本 → 解析编排清单 → 可视化预览 → 调整间隔 → 批量合成
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
  radius: 8,
}

export function ArrangePanel({ chapterTitle, chapterContent }: Props) {
  const [mode, setMode] = useState<'auto' | 'annotated'>('auto')
  const [silenceMs, setSilenceMs] = useState(800)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState('')
  const [inputText, setInputText] = useState(chapterContent || '')

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

  return (
    <div style={{ padding: '20px 0' }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: C.ink, margin: '0 0 4px' }}>
          🎬 多轨编排
        </h3>
        <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
          解析画本 → 生成编排清单 → 批量合成旁白 → 自动拼接+AU打标
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
    </div>
  )
}
