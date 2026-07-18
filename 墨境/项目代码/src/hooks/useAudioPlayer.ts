'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * 统一音频播放 Hook
 * 提供 Play/Pause 切换、播放状态管理、自动清理
 * 
 * 使用示例：
 *   const { isPlaying, toggle, play, stop } = useAudioPlayer()
 *   <button onClick={toggle}>{isPlaying ? <Pause/> : <Play/>}</button>
 */

interface UseAudioPlayerOptions {
  onEnded?: () => void
}

export function useAudioPlayer(options?: UseAudioPlayerOptions) {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  // 清理 Object URL
  const revokeUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }, [])

  // 停止播放
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    revokeUrl()
    setIsPlaying(false)
  }, [revokeUrl])

  // 切换播放/暂停（用于已有 audio 元素的场景，如底部播放器）
  const toggle = useCallback(() => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play().catch(() => setIsPlaying(false))
      setIsPlaying(true)
    }
  }, [isPlaying])

  // 播放 base64 音频
  const playBase64 = useCallback((base64: string, mime = 'audio/wav') => {
    // 停止当前播放
    if (audioRef.current) {
      audioRef.current.pause()
    }
    revokeUrl()

    // 解码 base64 → Blob → Object URL
    const bin = atob(base64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const blob = new Blob([bytes], { type: mime })
    const url = URL.createObjectURL(blob)
    objectUrlRef.current = url

    if (audioRef.current) {
      audioRef.current.src = url
      audioRef.current.play().catch(() => setIsPlaying(false))
      setIsPlaying(true)
    }
  }, [revokeUrl])

  // 播放 Object URL
  const playUrl = useCallback((url: string) => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    revokeUrl()
    objectUrlRef.current = url

    if (audioRef.current) {
      audioRef.current.src = url
      audioRef.current.play().catch(() => setIsPlaying(false))
      setIsPlaying(true)
    }
  }, [revokeUrl])

  // 监听播放结束
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleEnded = () => {
      setIsPlaying(false)
      revokeUrl()
      options?.onEnded?.()
    }

    audio.addEventListener('ended', handleEnded)
    return () => {
      audio.removeEventListener('ended', handleEnded)
    }
  }, [options?.onEnded, revokeUrl])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      revokeUrl()
    }
  }, [revokeUrl])

  return {
    isPlaying,
    setIsPlaying,
    audioRef,
    toggle,
    playBase64,
    playUrl,
    stop,
  }
}
