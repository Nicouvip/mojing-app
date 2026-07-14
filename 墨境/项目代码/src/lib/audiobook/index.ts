/**
 * 墨境有声书模块 — 统一导出
 * 
 * 基于 MiMo V2.5 语音模型套件
 * - MiMo-V2.5-TTS：预置音色文字转语音
 * - MiMo-V2.5-TTS-VoiceDesign：声音设计
 * - MiMo-V2.5-TTS-VoiceClone：声音克隆
 * - MiMo-V2.5-ASR：语音识别
 */

// ── TTS 引擎 ──
export { MiMoTTSEngine, PRESET_VOICES, EMOTION_TAGS, AUDIO_TAGS } from './mimo-tts'
export type { MiMoTTSParams, MiMoTTSResponse, PresetVoiceId } from './mimo-tts'

// ── VoiceDesign 引擎 ──
export { MiMoVoiceDesignEngine } from './mimo-voice-design'
export type { VoiceDesignParams, VoiceDesignResponse } from './mimo-voice-design'

// ── VoiceClone 引擎 ──
export { MiMoVoiceCloneEngine } from './mimo-voice-clone'
export type { VoiceCloneParams, VoiceCloneResponse } from './mimo-voice-clone'

// ── ASR 引擎 ──
export { MiMoASREngine } from './mimo-asr'
export type { MiMoASRParams, MiMoASRResponse, ASRTimestamp } from './mimo-asr'

// ── 数据类型 ──
export interface VoiceProfile {
  id: string
  name: string
  type: 'preset' | 'designed' | 'cloned'
  gender: 'male' | 'female' | 'neutral'
  age: 'child' | 'young' | 'adult' | 'elderly'
  style: 'narration' | 'dialogue' | 'storytelling'
  presetVoiceId?: string
  designDescription?: string
  cloneSampleUrl?: string
  cloneSampleDuration?: number
  pitch: number
  speed: number
  volume: number
  emotionPresets?: {
    happy?: string
    sad?: string
    angry?: string
    neutral?: string
  }
  isBuiltIn: boolean
  userId?: string
  createdAt: number
}

export interface AudiobookProject {
  id: string
  projectId: string
  status: 'draft' | 'generating' | 'ready' | 'error' | 'partial'
  totalDuration: number
  totalSegments: number
  generatedSegments: number
  defaultVoiceId: string
  settings: AudiobookSettings
  createdAt: number
  updatedAt: number
}

export interface AudioChapter {
  id: string
  audiobookProjectId: string
  chapterId: string
  status: 'pending' | 'generating' | 'asr' | 'ready' | 'error'
  audioUrl: string
  duration: number
  subtitleUrl?: string
  segmentCount: number
  generatedAt: number
}

export interface AudioSegment {
  id: string
  audioChapterId: string
  segmentIndex: number
  text: string
  type: 'narration' | 'dialogue' | 'description' | 'pause'
  characterId?: string
  voiceProfileId: string
  emotion?: string
  audioUrl: string
  duration: number
  startTime: number
  timestamps?: { start: number; end: number }
  status: 'pending' | 'generating' | 'asr' | 'ready' | 'error'
}

export interface VoiceRoleBinding {
  id: string
  projectId: string
  characterId: string
  voiceProfileId: string
  isAutoAssigned: boolean
  emotionMapping?: {
    happy?: string
    sad?: string
    angry?: string
    neutral?: string
  }
}

export interface AudiobookSettings {
  pauseBetweenDialogue: number
  pauseBetweenParagraph: number
  pauseBetweenChapter: number
  defaultSpeed: number
  defaultEmotion: string
  enableASR: boolean
  exportFormat: 'mp3' | 'wav'
  exportQuality: 'low' | 'medium' | 'high'
}
