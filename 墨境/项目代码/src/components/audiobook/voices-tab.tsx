'use client'

import { Play } from 'lucide-react'

const PRESET_VOICES = [
  { id: '冰糖', name: '冰糖', gender: 'female', desc: '甜美女声·旁白', icon: '🎤' },
  { id: '茉莉', name: '茉莉', gender: 'female', desc: '温柔女声·对话', icon: '🗣️' },
  { id: '苏打', name: '苏打', gender: 'male', desc: '阳光男声·青年', icon: '🎤' },
  { id: '白桦', name: '白桦', gender: 'male', desc: '沉稳男声·中年', icon: '🗣️' },
  { id: 'Mia', name: 'Mia', gender: 'female', desc: 'English Female', icon: '🎤' },
  { id: 'Chloe', name: 'Chloe', gender: 'female', desc: 'English Gentle', icon: '🗣️' },
  { id: 'Milo', name: 'Milo', gender: 'male', desc: 'English Male', icon: '🎤' },
  { id: 'Dean', name: 'Dean', gender: 'male', desc: 'English Deep', icon: '🗣️' },
] as const

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

interface VoicesTabProps {
  defaultVoice: string
  onDefaultVoiceChange: (voiceId: string) => void
  designedVoices: DesignedVoice[]
  clonedVoices: ClonedVoice[]
  onPreviewVoice: (voiceId: string) => void
  onPlayAudio: (base64: string, mime: string) => void
}

export function VoicesTab({
  defaultVoice,
  onDefaultVoiceChange,
  designedVoices,
  clonedVoices,
  onPreviewVoice,
  onPlayAudio,
}: VoicesTabProps) {
  return (
    <div>
      <p className="text-xs text-muted-foreground m-0 mb-4">选择默认音色，或设计/克隆自定义音色</p>
      <h3 className="text-xs font-semibold text-card-foreground m-0 mb-2.5">预置音色</h3>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2.5 mb-5">
        {PRESET_VOICES.map(v => (
          <div
            key={v.id}
            onClick={() => onDefaultVoiceChange(v.id)}
            className={`p-3 bg-card border-2 rounded-lg cursor-pointer transition-all hover:shadow-card ${
              defaultVoice === v.id ? 'border-primary' : 'border-border'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{v.icon}</span>
              <div>
                <div className="text-xs font-semibold text-card-foreground">{v.name}</div>
                <div className="text-[10px] text-muted-foreground">{v.desc}</div>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onPreviewVoice(v.id) }}
              className={`w-full py-1 border-none rounded text-[11px] cursor-pointer font-inherit transition-colors ${
                defaultVoice === v.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              }`}
            >
              <Play className="inline h-3 w-3 mr-1" />试听
            </button>
          </div>
        ))}
      </div>
      {designedVoices.length + clonedVoices.length > 0 && (
        <>
          <h3 className="text-xs font-semibold text-card-foreground m-0 mb-2.5">我的自定义音色</h3>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2.5">
            {[...designedVoices, ...clonedVoices.map(v => ({ id: v.id, name: v.name, desc: v.sampleName, audioBase64: v.audioBase64 }))].map(v => (
              <div
                key={v.id}
                onClick={() => onDefaultVoiceChange(v.id)}
                className={`p-3 bg-card border-2 rounded-lg cursor-pointer transition-all hover:shadow-card ${
                  defaultVoice === v.id ? 'border-primary' : 'border-border'
                }`}
              >
                <div className="text-xs font-semibold text-card-foreground mb-1">{v.name}</div>
                <div className="text-[10px] text-muted-foreground mb-2">{v.desc}</div>
                <button
                  onClick={(e) => { e.stopPropagation(); onPlayAudio((v as { audioBase64: string }).audioBase64, 'audio/wav') }}
                  className="w-full py-1 bg-primary/10 border-none rounded text-[11px] text-primary cursor-pointer font-inherit transition-colors"
                >
                  <Play className="inline h-3 w-3 mr-1" />试听
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
