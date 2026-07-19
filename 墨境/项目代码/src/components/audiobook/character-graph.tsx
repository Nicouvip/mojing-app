'use client'

import { useMemo } from 'react'

/**
 * 角色关系图组件
 * 数据源：characters[] + segments[] 的对话关系
 * 显示角色间对话交互次数、音色分配
 */

interface CharLike {
  name: string
  gender: 'male' | 'female'
  age: 'child' | 'young' | 'adult' | 'elderly'
  recommendedVoice: string
  recommendedEmotion: string
}

interface SegLike {
  type: 'narration' | 'dialogue'
  characterName?: string
  text: string
}

interface Props {
  characters: CharLike[]
  segments: SegLike[]
}

const GENDER_ICON: Record<string, string> = {
  'male': '👨',
  'female': '👩',
}

const AGE_LABEL: Record<string, string> = {
  'child': '少年',
  'young': '青年',
  'adult': '中年',
  'elderly': '老年',
}

const COLORS = ['#c4956a', '#3a5279', '#b5454a', '#7a9e7a', '#8e63ce', '#d4a0a0', '#4a86e8', '#eaa041']

export function CharacterGraph({ characters, segments }: Props) {
  const { dialoguePairs, charStats } = useMemo(() => {
    // Count dialogue interactions between character pairs
    const pairMap = new Map<string, number>()
    const dialogueSegs = segments.filter(s => s.type === 'dialogue' && s.characterName)

    for (let i = 0; i < dialogueSegs.length - 1; i++) {
      const curr = dialogueSegs[i].characterName
      const next = dialogueSegs[i + 1].characterName
      if (curr && next && curr !== next) {
        const key = [curr, next].sort().join('→')
        pairMap.set(key, (pairMap.get(key) || 0) + 1)
      }
    }

    // Per-character stats
    const stats = new Map<string, { count: number; index: number }>()
    characters.forEach((ch, i) => {
      const count = segments.filter(s => s.type === 'dialogue' && s.characterName === ch.name).length
      stats.set(ch.name, { count, index: i })
    })

    return { dialoguePairs: pairMap, charStats: stats }
  }, [characters, segments])

  const nonNarrator = characters.filter(c => c.name !== '旁白')
  const narrator = characters.find(c => c.name === '旁白')

  if (characters.length === 0) return null

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: 'rgba(26,24,20,.45)', marginBottom: 6, fontWeight: 600 }}>
        🎭 角色分析 · {nonNarrator.length} 个角色 · {segments.filter(s => s.type === 'dialogue').length} 条对话
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 6,
      }}>
        {/* Narrator card */}
        {narrator && (
          <div style={{
            padding: '6px 8px',
            background: 'rgba(153,153,153,.06)',
            border: '1px solid rgba(153,153,153,.15)',
            borderRadius: 6,
            fontSize: 10,
            color: 'rgba(26,24,20,.6)',
          }}>
            <div style={{ fontWeight: 600, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#999', display: 'inline-block' }} />
              旁白
            </div>
            <div style={{ opacity: 0.7 }}>{narrator.recommendedVoice} · {segments.filter(s => s.type === 'narration').length}段</div>
          </div>
        )}

        {/* Character cards */}
        {nonNarrator.map((ch, i) => {
          const color = COLORS[i % COLORS.length]
          const stats = charStats.get(ch.name)
          const dialogueCount = stats?.count || 0

          return (
            <div key={ch.name} style={{
              padding: '6px 8px',
              background: `${color}08`,
              border: `1px solid ${color}30`,
              borderRadius: 6,
              fontSize: 10,
            }}>
              <div style={{ fontWeight: 600, color, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>{GENDER_ICON[ch.gender] || '👤'}</span>
                <span>{ch.name}</span>
              </div>
              <div style={{ color: 'rgba(26,24,20,.5)', lineHeight: 1.5 }}>
                <div>{AGE_LABEL[ch.age] || ch.age} · {ch.gender === 'male' ? '男' : '女'}</div>
                <div>{ch.recommendedVoice} · {dialogueCount}句对话</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Dialogue pairs */}
      {dialoguePairs.size > 0 && (
        <div style={{ marginTop: 8, fontSize: 10, color: 'rgba(26,24,20,.4)' }}>
          <span style={{ fontWeight: 600 }}>对话交互：</span>
          {Array.from(dialoguePairs.entries()).sort((a, b) => b[1] - a[1]).map(([key, count], i) => (
            <span key={key} style={{
              display: 'inline-block',
              margin: '2px 4px 2px 0',
              padding: '1px 6px',
              background: 'rgba(26,24,20,.04)',
              borderRadius: 8,
              fontSize: 10,
            }}>
              {key.replace('→', ' ↔ ')} ({count})
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
