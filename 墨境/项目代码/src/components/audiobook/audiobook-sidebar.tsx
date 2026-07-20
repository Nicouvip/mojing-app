'use client'

import { Mic, Sparkles } from 'lucide-react'
import { VoiceSelector } from '@/components/audiobook/voice-selector'
import { EmotionPicker } from '@/components/audiobook/emotion-picker'

interface DesignedVoice {
  id: string
  name: string
  desc: string
  audioBase64: string
}
interface ClonedVoice {
  id: string
  name: string
  sampleName: string
  audioBase64: string
}

interface AudiobookSidebarProps {
  defaultVoice: string
  onDefaultVoiceChange: (voice: string) => void
  defaultEmotion: string
  onDefaultEmotionChange: (emotion: string) => void
  designedVoices: DesignedVoice[]
  clonedVoices: ClonedVoice[]
  onPreviewVoice: (voiceId: string) => void
  onPlayCustom: (base64: string, mime: string) => void
  onShowDesign: () => void
  onShowClone: () => void
}

export function AudiobookSidebar({
  defaultVoice,
  onDefaultVoiceChange,
  defaultEmotion,
  onDefaultEmotionChange,
  designedVoices,
  clonedVoices,
  onPreviewVoice,
  onPlayCustom,
  onShowDesign,
  onShowClone,
}: AudiobookSidebarProps) {
  return (
    <aside className="w-64 border-l border-border flex flex-col flex-shrink-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        <div>
          <h3 className="text-xs font-semibold text-card-foreground m-0 mb-2">音色</h3>
          <VoiceSelector
            defaultVoice={defaultVoice}
            onVoiceChange={onDefaultVoiceChange}
            designedVoices={designedVoices}
            clonedVoices={clonedVoices.map(v => ({ id: v.id, name: v.name, desc: v.sampleName, audioBase64: v.audioBase64 }))}
            onPreview={onPreviewVoice}
            onShowDesign={onShowDesign}
            onShowClone={onShowClone}
            onPlayCustom={(b64) => onPlayCustom(b64, 'audio/wav')}
          />
        </div>
        <div>
          <h3 className="text-xs font-semibold text-card-foreground m-0 mb-2">情绪</h3>
          <EmotionPicker selected={defaultEmotion} onSelect={onDefaultEmotionChange} />
        </div>
        <div className="space-y-2">
          <button onClick={onShowDesign}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-card border border-border rounded-lg text-xs text-card-foreground cursor-pointer font-inherit hover:bg-muted transition-colors">
            <Sparkles className="h-3.5 w-3.5" />设计音色
          </button>
          <button onClick={onShowClone}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground border-none rounded-lg text-xs font-medium cursor-pointer font-inherit hover:bg-primary-hover transition-colors">
            <Mic className="h-3.5 w-3.5" />克隆声音
          </button>
        </div>
      </div>
    </aside>
  )
}
