'use client'

import { useState, useMemo } from 'react'
import { Mic, Sparkles, Search, Play, Pause, Volume2 } from 'lucide-react'

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

const VOICE_ICONS: Record<string, string> = {
  '冰糖': '🍬', '茉莉': '🌸', '苏打': '🥤', '白桦': '🌲',
  'Mia': '✨', 'Chloe': '🌙', 'Milo': '☀️', 'Dean': '🏔️',
}

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
  const [voiceTab, setVoiceTab] = useState<'standard' | 'custom'>('standard')
  const [searchQuery, setSearchQuery] = useState('')
  const [previewPlaying, setPreviewPlaying] = useState<string | null>(null)

  const allCustom = useMemo(() => [
    ...designedVoices.map(v => ({ ...v, source: 'design' as const })),
    ...clonedVoices.map(v => ({ ...v, source: 'clone' as const })),
  ], [designedVoices, clonedVoices])

  // 过滤音色列表
  const filteredVoices = useMemo(() => {
    const list = voiceTab === 'standard' ? PRESET_VOICES : allCustom
    if (!searchQuery.trim()) return list
    const q = searchQuery.toLowerCase()
    return list.filter(v =>
      v.name.toLowerCase().includes(q) ||
      (v.desc && v.desc.toLowerCase().includes(q))
    )
  }, [voiceTab, allCustom, searchQuery])

  const handlePreview = (voiceId: string) => {
    setPreviewPlaying(voiceId)
    onPreview?.(voiceId)
    // 3秒后自动恢复（实际应监听音频结束事件）
    setTimeout(() => setPreviewPlaying(null), 3000)
  }

  return (
    <div className="space-y-3">
      {/* Tab 切换 */}
      <div className="flex gap-1 p-0.5 bg-muted rounded-lg">
        <button
          onClick={() => { setVoiceTab('standard'); setSearchQuery('') }}
          className={`flex-1 py-1.5 text-xs rounded-md transition-all ${
            voiceTab === 'standard'
              ? 'bg-card text-foreground font-medium shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          标准版
        </button>
        <button
          onClick={() => { setVoiceTab('custom'); setSearchQuery('') }}
          className={`flex-1 py-1.5 text-xs rounded-md transition-all ${
            voiceTab === 'custom'
              ? 'bg-card text-foreground font-medium shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          我的音色 {allCustom.length > 0 && `(${allCustom.length})`}
        </button>
      </div>

      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="搜索音色..."
          className="w-full pl-8 pr-3 py-1.5 border border-border rounded-md text-xs bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* 卡片网格 */}
      <div className="grid grid-cols-2 gap-2">
        {filteredVoices.map(v => {
          const isSelected = defaultVoice === v.id
          const isPlaying = previewPlaying === v.id
          const isCustom = voiceTab === 'custom'

          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onVoiceChange(v.id)}
              className={`relative p-2.5 rounded-lg text-left transition-all border ${
                isSelected
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border bg-card hover:border-primary/30 hover:shadow-sm'
              }`}
            >
              {/* 图标 + 名称 */}
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">{isCustom ? '🎤' : (VOICE_ICONS[v.id] || '🎤')}</span>
                <span className="text-xs font-semibold text-foreground truncate">{v.name}</span>
              </div>

              {/* 描述 */}
              <div className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                {isCustom ? (v as CustomVoice).desc : (v as VoiceOption).desc}
              </div>

              {/* 试听按钮 */}
              {(onPreview || onPlayCustom) && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={e => {
                    e.stopPropagation()
                    if (isCustom && onPlayCustom) {
                      onPlayCustom((v as CustomVoice).audioBase64)
                    } else {
                      handlePreview(v.id)
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      e.stopPropagation()
                      if (isCustom && onPlayCustom) {
                        onPlayCustom((v as CustomVoice).audioBase64)
                      } else {
                        handlePreview(v.id)
                      }
                    }
                  }}
                  className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                    isPlaying
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
                  }`}
                >
                  {isPlaying
                    ? <Pause className="w-2.5 h-2.5" />
                    : <Play className="w-2.5 h-2.5 ml-0.5" />}
                </span>
              )}

              {/* 选中标记 */}
              {isSelected && (
                <div className="absolute bottom-1.5 right-2">
                  <Volume2 className="w-3 h-3 text-primary" />
                </div>
              )}
            </button>
          )
        })}

        {/* 空状态 */}
        {filteredVoices.length === 0 && (
          <div className="col-span-2 py-6 text-center text-xs text-muted-foreground">
            {searchQuery ? '未找到匹配的音色' : (voiceTab === 'custom' ? '暂无自定义音色' : '暂无音色')}
          </div>
        )}
      </div>

      {/* 当前选中 */}
      {defaultVoice && (
        <div className="flex items-center gap-2 px-2 py-1.5 bg-muted/50 rounded-md">
          <Volume2 className="w-3 h-3 text-primary shrink-0" />
          <span className="text-[11px] text-foreground">
            当前：<span className="font-medium">{defaultVoice}</span>
          </span>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-2">
        {onShowDesign && (
          <button onClick={onShowDesign}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-card border border-border rounded-lg text-xs text-foreground hover:bg-muted transition-colors">
            <Sparkles className="w-3 h-3" /> 设计音色
          </button>
        )}
        {onShowClone && (
          <button onClick={onShowClone}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground border-none rounded-lg text-xs font-medium hover:bg-primary-hover transition-colors">
            <Mic className="w-3 h-3" /> 克隆声音
          </button>
        )}
      </div>
    </div>
  )
}
