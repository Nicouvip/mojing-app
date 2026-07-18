'use client'

import { Mic } from 'lucide-react'

const EMOTIONS = ['平静', '开心', '悲伤', '愤怒', '温柔', '严肃', '恐惧', '惊讶', '冷漠'] as const

export interface EmotionPickerProps {
  selected: string
  onSelect: (emotion: string) => void
}

export function EmotionPicker({ selected, onSelect }: EmotionPickerProps) {
  return (
    <div className="space-y-1.5">
      <span className="text-[11px] text-muted-foreground">默认情绪：</span>
      <div className="flex flex-wrap gap-1.5">
        {EMOTIONS.map(em => (
          <button key={em}
            onClick={() => onSelect(em)}
            className={`px-2.5 py-1 rounded-full text-xs transition-all border ${
              selected === em
                ? 'bg-primary text-white border-primary'
                : 'bg-card border-border text-muted-foreground hover:border-primary/40'
            }`}>
            {em}
          </button>
        ))}
      </div>
    </div>
  )
}
