'use client'

import { Pause, Play } from 'lucide-react'
import type { Chapter } from '@/lib/db/types'

interface BottomPlayerProps {
  playingChapterId: string
  chapters: Chapter[]
  isPlaying: boolean
  currentTime: number
  duration: number
  defaultVoice: string
  audioRef: React.RefObject<HTMLAudioElement | null>
  onTogglePlay: (chapterId: string) => void
  onClose: () => void
}

export function BottomPlayer({
  playingChapterId,
  chapters,
  isPlaying,
  currentTime,
  duration,
  defaultVoice,
  audioRef,
  onTogglePlay,
  onClose,
}: BottomPlayerProps) {
  const chapter = chapters.find(c => c.id === playingChapterId)

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    audioRef.current.currentTime = ratio * duration
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-14 bg-card border-t border-border flex items-center px-4 gap-3 z-[100] shadow-[0_-2px_12px_rgba(0,0,0,.04)]">
      <button
        onClick={() => onTogglePlay(playingChapterId)}
        className="w-8 h-8 rounded-full bg-primary border-none cursor-pointer flex items-center justify-center text-white shrink-0 hover:bg-primary-hover transition-colors"
      >
        {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-card-foreground">{chapter?.title || ''}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-muted-foreground">{Math.floor(currentTime)}s / {Math.floor(duration)}s</span>
          <div className="flex-1 h-[3px] bg-border rounded-sm cursor-pointer" onClick={handleSeek}>
            <div
              className="h-full bg-primary rounded-sm transition-[width] duration-100"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">{defaultVoice}</span>
        </div>
      </div>
      <button
        onClick={onClose}
        className="px-3 py-1.5 bg-transparent border border-border rounded-md text-[11px] text-muted-foreground cursor-pointer font-inherit hover:bg-muted transition-colors"
      >
        关闭
      </button>
    </div>
  )
}
