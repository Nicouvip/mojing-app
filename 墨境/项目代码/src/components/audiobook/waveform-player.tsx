'use client'

import { Play, Pause, SkipBack, SkipForward, Download, Repeat } from 'lucide-react'
import { useState, useRef, useEffect, useCallback } from 'react'

export interface WaveformPlayerProps {
  audioUrl?: string
  audioBase64?: string
  mime?: string
  isPlaying: boolean
  onPlay: () => void
  onPause: () => void
  onSpeedChange?: (speed: number) => void
  onDownload?: () => void
  speeds?: number[]
  currentSpeed?: number
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

export function WaveformPlayer({
  audioUrl, audioBase64, mime = 'audio/wav',
  isPlaying, onPlay, onPause,
  onSpeedChange, onDownload,
}: WaveformPlayerProps) {
  const [speed, setSpeed] = useState(1)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [loop, setLoop] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const animRef = useRef<number>(0)

  // Create URL from base64
  const resolvedUrl = audioUrl || (audioBase64 ? (() => {
    const bin = atob(audioBase64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return URL.createObjectURL(new Blob([bytes], { type: mime }))
  })() : undefined)

  // Update playback speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed
    }
  }, [speed])

  // Handle play/pause
  useEffect(() => {
    if (!audioRef.current || !resolvedUrl) return
    if (isPlaying) {
      audioRef.current.play().catch(() => onPause())
    } else {
      audioRef.current.pause()
    }
  }, [isPlaying, resolvedUrl])

  // Draw waveform visualization
  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)

      // Draw bars
      const barCount = 40
      const barWidth = w / barCount - 2
      const progressIdx = Math.floor(progress * barCount)

      for (let i = 0; i < barCount; i++) {
        const barHeight = 8 + Math.sin(i * 0.3) * 12 + Math.cos(i * 0.7) * 6
        const x = i * (barWidth + 2)
        const y = h / 2 - barHeight / 2

        ctx.fillStyle = i <= progressIdx
          ? 'rgba(196, 149, 106, 0.8)'
          : 'rgba(196, 149, 106, 0.2)'
        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, barHeight, 2)
        ctx.fill()
      }
    }

    draw()
    if (isPlaying) {
      const animate = () => {
        draw()
        animRef.current = requestAnimationFrame(animate)
      }
      animRef.current = requestAnimationFrame(animate)
    }

    return () => cancelAnimationFrame(animRef.current)
  }, [progress, isPlaying])

  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return
    setCurrentTime(audioRef.current.currentTime)
    setProgress(audioRef.current.currentTime / (audioRef.current.duration || 1))
  }, [])

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = x / rect.width
    audioRef.current.currentTime = pct * audioRef.current.duration
  }, [])

  const toggleSpeed = useCallback(() => {
    const idx = SPEEDS.indexOf(speed)
    const next = SPEEDS[(idx + 1) % SPEEDS.length]
    setSpeed(next)
    onSpeedChange?.(next)
  }, [speed, onSpeedChange])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-xl">
      {/* Audio element */}
      {resolvedUrl && (
        <audio
          ref={audioRef}
          src={resolvedUrl}
          loop={loop}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => {
            if (audioRef.current) setDuration(audioRef.current.duration)
          }}
          onEnded={() => { if (!loop) onPause() }}
        />
      )}

      {/* Play/Pause */}
      <button onClick={isPlaying ? onPause : onPlay}
        className="w-9 h-9 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90 transition-colors shrink-0">
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>

      {/* Time */}
      <span className="text-[11px] text-muted-foreground tabular-nums w-10 shrink-0">
        {formatTime(currentTime)}
      </span>

      {/* Waveform / Progress bar */}
      <div className="flex-1 relative cursor-pointer" onClick={handleSeek}>
        <canvas ref={canvasRef} width={200} height={32} className="w-full h-8" />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      {/* Duration */}
      <span className="text-[11px] text-muted-foreground tabular-nums w-10 shrink-0">
        {formatTime(duration)}
      </span>

      {/* Speed */}
      <button onClick={toggleSpeed}
        className="px-1.5 py-0.5 text-[10px] font-medium bg-secondary rounded-md hover:bg-secondary/80 transition-colors shrink-0">
        {speed}x
      </button>

      {/* Loop */}
      <button onClick={() => setLoop(!loop)}
        className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors shrink-0 ${
          loop ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
        }`}>
        <Repeat className="w-3.5 h-3.5" />
      </button>

      {/* Download */}
      {onDownload && (
        <button onClick={onDownload}
          className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <Download className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
