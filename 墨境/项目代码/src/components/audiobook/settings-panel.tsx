'use client'

import { Settings } from 'lucide-react'
import { EmotionPicker } from '@/components/audiobook/emotion-picker'

interface SettingsPanelProps {
  defaultVoice: string
  onDefaultVoiceChange: (voice: string) => void
  defaultEmotion: string
  onDefaultEmotionChange: (emotion: string) => void
  allVoices: Array<{ id: string; name: string; desc: string }>
}

export function SettingsPanel({
  defaultVoice,
  onDefaultVoiceChange,
  defaultEmotion,
  onDefaultEmotionChange,
  allVoices,
}: SettingsPanelProps) {
  return (
    <div className="max-w-xl">
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-medium text-card-foreground mb-1.5">默认旁白音色</label>
          <select
            value={defaultVoice}
            onChange={e => onDefaultVoiceChange(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md text-[13px] text-card-foreground bg-card font-inherit"
          >
            {allVoices.map(v => <option key={v.id} value={v.id}>{v.name} — {v.desc}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-card-foreground mb-1.5">默认情绪</label>
          <EmotionPicker selected={defaultEmotion} onSelect={onDefaultEmotionChange} />
        </div>
        <div className="p-4 bg-muted/50 border border-border rounded-lg">
          <h3 className="text-[13px] font-semibold text-card-foreground m-0 mb-3">
            <Settings className="inline h-4 w-4 mr-1" />音频质量
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">采样率</label>
              <select defaultValue="24000" className="w-full px-2.5 py-1.5 border border-border rounded-md text-xs text-card-foreground bg-card font-inherit">
                <option value="8000">8,000 Hz（电话音质）</option>
                <option value="16000">16,000 Hz（语音识别）</option>
                <option value="22050">22,050 Hz（FM 广播）</option>
                <option value="24000">24,000 Hz（标准，推荐）</option>
                <option value="44100">44,100 Hz（CD 音质）</option>
                <option value="48000">48,000 Hz（专业音频）</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">位深度</label>
              <select defaultValue="16" className="w-full px-2.5 py-1.5 border border-border rounded-md text-xs text-card-foreground bg-card font-inherit">
                <option value="8">8-bit（低质量，文件小）</option>
                <option value="16">16-bit（标准，推荐）</option>
                <option value="24">24-bit（高质量）</option>
                <option value="32">32-bit（录音室级别）</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">比特率（MP3 导出时生效）</label>
            <div className="flex gap-1.5 flex-wrap">
              {[64, 96, 128, 160, 192, 224, 256, 320].map(br => (
                <button key={br} className={`px-2.5 py-1 rounded-full text-[11px] font-inherit cursor-pointer transition-colors ${
                  br === 192
                    ? 'border border-primary bg-primary/10 text-primary font-semibold'
                    : 'border border-border bg-card text-muted-foreground font-normal'
                }`}>{br} kbps</button>
              ))}
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">导出格式</label>
            <div className="flex gap-1.5">
              {[
                { key: 'wav', label: 'WAV（无损）' },
                { key: 'mp3-128', label: 'MP3 128k' },
                { key: 'mp3-192', label: 'MP3 192k' },
                { key: 'mp3-320', label: 'MP3 320k' },
              ].map(f => (
                <button key={f.key} className={`px-2.5 py-1 rounded-full text-[11px] font-inherit cursor-pointer transition-colors ${
                  f.key === 'wav'
                    ? 'border border-primary bg-primary/10 text-primary font-semibold'
                    : 'border border-border bg-card text-muted-foreground font-normal'
                }`}>{f.label}</button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-card-foreground mb-1.5">对话间隔</label>
          <select defaultValue="500" className="w-full px-3 py-2 border border-border rounded-md text-[13px] text-card-foreground bg-card font-inherit">
            <option value="300">0.3 秒（紧凑）</option>
            <option value="500">0.5 秒（正常）</option>
            <option value="800">0.8 秒（舒缓）</option>
            <option value="1000">1.0 秒（缓慢）</option>
          </select>
        </div>
      </div>
    </div>
  )
}
