'use client'

import { useState, useMemo } from 'react'

/**
 * 合成前核对清单
 * 技能包 SKILL.md 核心规则：全部打勾后才能开始合成
 *
 * 7项核对：
 * 1. 每行旁白都有cot标签
 * 2. context_texts三层齐全
 * 3. cot加了"全程保持匀速"
 * 4. 夹角色音全部标注
 * 5. 每处间隔≥800ms
 * 6. 段间有淡入淡出≥80ms
 * 7. 确认开始合成
 */

interface Segment {
  type: 'narration' | 'dialogue'
  characterName?: string
  text: string
}

interface Props {
  segments: Segment[]
  onConfirm?: () => void
}

interface ChecklistItem {
  id: string
  label: string
  auto: boolean
  check?: (segs: Segment[]) => boolean
}

const CHECKLIST: ChecklistItem[] = [
  {
    id: 'cot',
    label: '每行旁白都有cot标签',
    auto: true,
    check: (segs) => {
      const narrations = segs.filter(s => s.type === 'narration')
      return narrations.length === 0 || narrations.every(s => s.text.includes('<cot'))
    },
  },
  {
    id: 'context',
    label: 'context_texts三层齐全（前情+笔记+指导）',
    auto: false,
  },
  {
    id: 'steady',
    label: 'cot加了"全程保持匀速"',
    auto: true,
    check: (segs) => {
      const narrations = segs.filter(s => s.type === 'narration' && s.text.includes('<cot'))
      return narrations.length === 0 || narrations.every(s => s.text.includes('全程保持匀速'))
    },
  },
  {
    id: 'marked',
    label: '夹角色音全部标注',
    auto: false,
  },
  {
    id: 'gap',
    label: '每处间隔≥800ms',
    auto: false,
  },
  {
    id: 'fade',
    label: '段间有淡入淡出≥80ms',
    auto: false,
  },
  {
    id: 'confirm',
    label: '确认开始合成',
    auto: false,
  },
]

export function SynthesisChecklist({ segments, onConfirm }: Props) {
  const [checked, setChecked] = useState<Set<string>>(() => {
    // Auto-check items that can be verified
    const initial = new Set<string>()
    CHECKLIST.forEach(item => {
      if (item.auto && item.check && item.check(segments)) {
        initial.add(item.id)
      }
    })
    return initial
  })

  const toggle = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allChecked = CHECKLIST.every(item => checked.has(item.id))
  const checkedCount = CHECKLIST.filter(item => checked.has(item.id)).length

  return (
    <div style={{
      marginBottom: 12,
      padding: '10px 12px',
      background: allChecked ? 'rgba(122,158,122,.06)' : 'rgba(26,24,20,.02)',
      border: `1px solid ${allChecked ? '#7a9e7a' : 'rgba(26,24,20,.08)'}`,
      borderRadius: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(26,24,20,.7)' }}>
          ✅ 合成前核对清单
        </span>
        <span style={{ fontSize: 10, color: allChecked ? '#7a9e7a' : 'rgba(26,24,20,.4)' }}>
          {checkedCount}/{CHECKLIST.length}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {CHECKLIST.map(item => (
          <label
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 10,
              color: checked.has(item.id) ? 'rgba(26,24,20,.7)' : 'rgba(26,24,20,.4)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={checked.has(item.id)}
              onChange={() => toggle(item.id)}
              style={{ accentColor: '#c4956a', width: 13, height: 13, cursor: 'pointer' }}
            />
            <span style={{ textDecoration: checked.has(item.id) ? 'line-through' : 'none' }}>
              {item.label}
            </span>
            {item.auto && <span style={{ fontSize: 8, color: 'rgba(26,24,20,.25)' }}>自动</span>}
          </label>
        ))}
      </div>

      {onConfirm && (
        <button
          onClick={onConfirm}
          disabled={!allChecked}
          style={{
            marginTop: 8,
            width: '100%',
            padding: '6px 0',
            fontSize: 11,
            fontWeight: 600,
            border: 'none',
            borderRadius: 6,
            background: allChecked ? '#c4956a' : 'rgba(26,24,20,.08)',
            color: allChecked ? '#fff' : 'rgba(26,24,20,.3)',
            cursor: allChecked ? 'pointer' : 'default',
            fontFamily: 'inherit',
            transition: 'all .15s',
          }}
        >
          {allChecked ? '🎵 开始合成' : `请完成全部核对 (${checkedCount}/${CHECKLIST.length})`}
        </button>
      )}
    </div>
  )
}
