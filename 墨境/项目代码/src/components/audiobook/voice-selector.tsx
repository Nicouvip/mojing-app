'use client'

import { useState } from 'react'
import {
  Mic, Sparkles, ChevronDown, ChevronUp, Play, Settings
} from 'lucide-react'

export interface VoiceOption {
  id: string
  name: string
  gender: 'female' | 'male'
  desc: string
}

export interface CustomVoice {
  id: string
  name: string
  desc: string
  audioBase64: string
}

const PRESET_VOICES: VoiceOption[] = [
  { id: '冰糖', name: '冰糖', gender: 'female', desc: '甜美女声·旁白' },
  { id: '茉莉', name: '茉莉', gender: 'female', desc: '温柔女声·对话' },
  { id: '苏打', name: '苏打', gender: 'male', desc: '阳光男声·青年' },
  { id: '白桦', name: '白桦', gender: 'male', desc: '沉稳男声·中年' },
  { id: 'Mia', name: 'Mia', gender: 'female', desc: 'English Female' },
  { id: 'Chloe', name: 'Chloe', gender: 'female', desc: 'English Gentle' },
  { id: 'Milo', name: 'Milo', gender: 'male', desc: 'English Male' },
  { id: 'Dean', name: 'Dean', gender: 'male', desc: 'English Deep' },
]

export interface VoiceSelectorProps {
  defaultVoice: string
  onVoiceChange: (voiceId: string) => void
  designedVoices?: CustomVoice[]
  clonedVoices?: CustomVoice[]
  onPreview?: (voiceId: string) => void
  onShowDesign?: () => void
  onShowClone?: () => void
  onPlayCustom?: (audioBase64: string) => void
}

export function VoiceSelector({
  defaultVoice, onVoiceChange,
  designedVoices = [], clonedVoices = [],
  onPreview, onShowDesign, onShowClone, onPlayCustom,
}: VoiceSelectorProps) {
  const [expanded, setExpanded] = useState(false)

  const allCustom = [
    ...designedVoices,
    ...clonedVoices.map(v => ({ id: v.id, name: v.name, desc: v.desc, audioBase64: v.audioBase64 })),
  ]

  return (
    <div className="border-b border-border">
      {/* 折叠头 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Settings className="w-3.5 h-3.5" />
          音色管理
        </span>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* 操作按钮 */}
          <div className="flex items-center gap-2">
            {onShowDesign && (
              <button onClick={onShowDesign}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-md text-xs text-foreground hover:bg-secondary transition-colors">
                <Sparkles className="w-3 h-3" /> 设计音色
              </button>
            )}
            {onShowClone && (
              <button onClick={onShowClone}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-md text-xs hover:bg-primary/90 transition-colors">
                <Mic className="w-3 h-3" /> 克隆声音
              </button>
            )}
          </div>

          {/* 默认音色选择 */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-muted-foreground">默认音色：</span>
            <div className="flex flex-wrap gap-2">
              {PRESET_VOICES.map(v => (
                <button key={v.id}
                  onClick={() => onVoiceChange(v.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs transition-all border ${
                    defaultVoice === v.id
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-card border-border text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  <Mic className="w-3 h-3" />
                  <span className="font-medium">{v.name}</span>
                  {onPreview && (
                    <Play className="w-2.5 h-2.5 opacity-60 hover:opacity-100"
                      onClick={e => { e.stopPropagation(); onPreview(v.id) }} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 自定义音色列表 */}
          {allCustom.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {allCustom.map(v => (
                <div key={v.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-md text-xs">
                  <span className="font-medium text-foreground">{v.name}</span>
                  <span className="text-muted-foreground">{v.desc}</span>
                  {onPlayCustom && (
                    <button onClick={() => onPlayCustom(v.audioBase64)}
                      className="px-2 py-0.5 border border-border rounded text-primary bg-card hover:bg-secondary transition-colors">
                      <Play className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
