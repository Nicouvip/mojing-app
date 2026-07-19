'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'

/**
 * 三层演播指导编辑器
 * 技能包核心：context-design.md + voice-prompt-guide.md
 *
 * 三层：前情摘要 + 剧本笔记 + 表演指导
 * 四维度：语气基调 + 情绪状态 + 生理特征 + 场景暗示
 * cot标签：<cot text="描述">内容</cot>
 */

interface ContextData {
  summary: string    // 前情摘要
  note: string       // 剧本笔记
  direction: string  // 表演指导
  cotTag: string     // cot标签
}

interface Props {
  segmentIndex: number
  segmentText: string
  emotion?: string
  characterName?: string
  previousSummary?: string
  context: ContextData
  onChange: (ctx: ContextData) => void
}

const TONE_OPTIONS = ['低沉', '沙哑', '轻柔', '明亮', '冷峻', '急促', '压抑', '克制']
const EMOTION_OPTIONS = ['沧桑', '绝望', '隐忍', '焦虑', '期待', '怀念', '悲痛', '愤怒', '温柔', '平静']
const PHYSIO_OPTIONS = ['颤抖', '哭腔', '呼吸急促', '声音放轻', '语速缓慢', '咬牙切齿', '哽咽', '气声']
const SCENE_OPTIONS = ['像在深夜独白', '像刚得知噩耗', '像在奔跑', '像在回忆往事', '像在忍着不爆发', '像在强忍泪水']

const C = {
  pri: '#c4956a',
  ink: '#1a1814',
  muted: 'rgba(26,24,20,.45)',
  line: 'rgba(26,24,20,.06)',
  card: '#fff',
  radius: 8,
}

export function ContextEditor({
  segmentIndex, segmentText, emotion, characterName,
  previousSummary, context, onChange,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const handleAutoGenerate = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/audiobook/context-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: segmentText,
          previousSummary,
          emotion,
          characterName,
        }),
      })
      const data = await res.json()
      if (data.success) {
        onChange({
          summary: data.summary || '',
          note: data.note || '',
          direction: data.direction || '',
          cotTag: data.cotTag || '全程保持匀速',
        })
        toast.success('三层指导已生成')
      } else {
        toast.error('生成失败：' + (data.error || '未知错误'))
      }
    } catch (err) {
      toast.error('生成失败：' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setLoading(false)
    }
  }, [segmentText, previousSummary, emotion, characterName, onChange])

  const hasContent = context.summary || context.note || context.direction

  return (
    <div style={{
      marginTop: 8,
      padding: '8px 10px',
      background: 'rgba(26,24,20,.02)',
      border: `1px solid ${C.line}`,
      borderRadius: C.radius,
      fontSize: 11,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: expanded ? 8 : 0 }}>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            fontSize: 11, fontWeight: 600, color: hasContent ? C.pri : C.muted,
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          {expanded ? '▼' : '▶'} 🎬 演播指导
          {hasContent && !expanded && <span style={{ fontWeight: 400, color: C.muted }}>（已生成）</span>}
        </button>
        <button
          onClick={handleAutoGenerate}
          disabled={loading}
          style={{
            padding: '2px 8px', fontSize: 10, borderRadius: 4,
            border: `1px solid ${C.pri}`, background: loading ? 'rgba(196,149,106,.05)' : 'rgba(196,149,106,.1)',
            color: C.pri, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit',
          }}
        >
          {loading ? '⏳ 生成中...' : '🤖 AI自动生成'}
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          {/* Layer 1: 前情摘要 */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: C.ink, display: 'block', marginBottom: 3 }}>
              第一层 · 前情摘要
            </label>
            <textarea
              value={context.summary}
              onChange={e => onChange({ ...context, summary: e.target.value })}
              placeholder="上文发生了什么关键事件？主角心理状态？（50字以内）"
              rows={2}
              style={{
                width: '100%', padding: '4px 6px', fontSize: 11, fontFamily: 'inherit',
                border: `1px solid ${C.line}`, borderRadius: 4, resize: 'vertical',
                color: C.ink, background: C.card, boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Layer 2: 剧本笔记 */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: C.ink, display: 'block', marginBottom: 3 }}>
              第二层 · 剧本笔记
            </label>
            <textarea
              value={context.note}
              onChange={e => onChange({ ...context, note: e.target.value })}
              placeholder="这段在情绪弧线上是什么位置？承接/推进/转折/爆发？"
              rows={2}
              style={{
                width: '100%', padding: '4px 6px', fontSize: 11, fontFamily: 'inherit',
                border: `1px solid ${C.line}`, borderRadius: 4, resize: 'vertical',
                color: C.ink, background: C.card, boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Layer 3: 表演指导 + 四维度 */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: C.ink, display: 'block', marginBottom: 3 }}>
              第三层 · 表演指导
            </label>
            <textarea
              value={context.direction}
              onChange={e => onChange({ ...context, direction: e.target.value })}
              placeholder="用什么语气？带着什么情绪？什么生理特征？什么场景？"
              rows={2}
              style={{
                width: '100%', padding: '4px 6px', fontSize: 11, fontFamily: 'inherit',
                border: `1px solid ${C.line}`, borderRadius: 4, resize: 'vertical',
                color: C.ink, background: C.card, boxSizing: 'border-box',
              }}
            />

            {/* 四维度快速标签 */}
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                { label: '语气', options: TONE_OPTIONS },
                { label: '情绪', options: EMOTION_OPTIONS },
                { label: '生理', options: PHYSIO_OPTIONS },
                { label: '场景', options: SCENE_OPTIONS },
              ].map(group => (
                <div key={group.label} style={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
                  <span style={{ fontSize: 9, color: C.muted, minWidth: 24 }}>{group.label}</span>
                  {group.options.slice(0, 6).map(opt => (
                    <button
                      key={opt}
                      onClick={() => {
                        const cur = context.direction
                        if (!cur.includes(opt)) {
                          onChange({ ...context, direction: cur ? `${cur}，${opt}` : opt })
                        }
                      }}
                      style={{
                        padding: '1px 5px', fontSize: 9, borderRadius: 3,
                        border: `1px solid ${C.line}`, background: context.direction.includes(opt) ? `${C.pri}15` : C.card,
                        color: context.direction.includes(opt) ? C.pri : C.muted,
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* cot 标签 */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, color: C.ink, display: 'block', marginBottom: 3 }}>
              cot 标签
            </label>
            <input
              value={context.cotTag}
              onChange={e => onChange({ ...context, cotTag: e.target.value })}
              placeholder="全程保持匀速，此处略微放慢带出悲伤"
              style={{
                width: '100%', padding: '4px 6px', fontSize: 11, fontFamily: 'inherit',
                border: `1px solid ${C.line}`, borderRadius: 4,
                color: C.ink, background: C.card, boxSizing: 'border-box',
              }}
            />
            <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>
              旁白必须加"全程保持匀速"，角色音可自由变化
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
