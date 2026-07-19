'use client'

import { useState } from 'react'

/**
 * 引擎选择面板
 * 三引擎卡片切换：标准版(MiMo) / 专业版(讯飞) / 旗舰版(豆包Expressive)
 */

export type EngineType = 'normal' | 'vip' | 'doubao'

interface EngineOption {
  key: EngineType
  label: string
  icon: string
  desc: string
  features: string[]
  pricing: string
}

const ENGINES: EngineOption[] = [
  {
    key: 'normal',
    label: '标准版',
    icon: '🎙️',
    desc: 'MiMo V2.5',
    features: ['8种预置音色', '情绪标签控制', '风格标签', '方言支持'],
    pricing: '免费',
  },
  {
    key: 'vip',
    label: '专业版',
    icon: '⚡',
    desc: '讯飞大模型语音合成',
    features: ['9种高品质音色', '5档情感控制', '多风格x6', '声音复刻'],
    pricing: '按量计费',
  },
  {
    key: 'doubao',
    label: '旗舰版',
    icon: '🌟',
    desc: '豆包 Expressive',
    features: ['context_texts 三层指导', 'cot标签局部微调', 'QA语音指令', '最强表现力'],
    pricing: '按量计费',
  },
]

interface Props {
  value: EngineType
  onChange: (engine: EngineType) => void
}

export function EngineSelector({ value, onChange }: Props) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(26,24,20,.6)', marginBottom: 6 }}>
        🔊 TTS 引擎
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {ENGINES.map(eng => {
          const isActive = value === eng.key
          return (
            <button
              key={eng.key}
              onClick={() => onChange(eng.key)}
              style={{
                flex: 1,
                padding: '8px 6px',
                background: isActive ? 'rgba(196,149,106,.08)' : '#fff',
                border: isActive ? '2px solid #c4956a' : '1px solid rgba(26,24,20,.08)',
                borderRadius: 8,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'center',
                transition: 'all .15s',
              }}
            >
              <div style={{ fontSize: 18, marginBottom: 2 }}>{eng.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? '#c4956a' : '#1a1814' }}>
                {eng.label}
              </div>
              <div style={{ fontSize: 9, color: 'rgba(26,24,20,.4)', marginTop: 1 }}>
                {eng.desc}
              </div>
              <div style={{ fontSize: 8, color: eng.pricing === '免费' ? '#7a9e7a' : 'rgba(26,24,20,.35)', marginTop: 3 }}>
                {eng.pricing}
              </div>
            </button>
          )
        })}
      </div>

      {/* 特性标签 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 6 }}>
        {ENGINES.find(e => e.key === value)?.features.map(f => (
          <span key={f} style={{
            padding: '1px 6px',
            fontSize: 9,
            borderRadius: 4,
            background: 'rgba(26,24,20,.04)',
            color: 'rgba(26,24,20,.5)',
          }}>
            {f}
          </span>
        ))}
      </div>
    </div>
  )
}
