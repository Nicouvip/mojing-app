/**
 * MiMo-V2.5-TTS 引擎
 * 
 * API 文档：https://mimo.mi.com/docs/zh-CN/quick-start/usage-guide/audio/speech-synthesis-v2.5
 * 
 * 功能：
 * - 8 款预置音色（冰糖/茉莉/苏打/白桦/Mia/Chloe/Milo/Dean）
 * - 精细情绪控制（开心/悲伤/愤怒/复合情绪等）
 * - 风格标签（低语/嘶吼/哽咽等）
 * - 唱歌模式
 */

// ── 预置音色定义 ──
export const PRESET_VOICES = [
  { id: '冰糖', name: '冰糖', gender: 'female' as const, language: 'zh', desc: '甜美女声，适合旁白' },
  { id: '茉莉', name: '茉莉', gender: 'female' as const, language: 'zh', desc: '温柔女声，适合对话' },
  { id: '苏打', name: '苏打', gender: 'male' as const, language: 'zh', desc: '阳光男声，适合青年角色' },
  { id: '白桦', name: '白桦', gender: 'male' as const, language: 'zh', desc: '沉稳男声，适合中年角色' },
  { id: 'Mia', name: 'Mia', gender: 'female' as const, language: 'en', desc: 'Sweet female voice' },
  { id: 'Chloe', name: 'Chloe', gender: 'female' as const, language: 'en', desc: 'Gentle female voice' },
  { id: 'Milo', name: 'Milo', gender: 'male' as const, language: 'en', desc: 'Warm male voice' },
  { id: 'Dean', name: 'Dean', gender: 'male' as const, language: 'en', desc: 'Deep male voice' },
] as const

export type PresetVoiceId = typeof PRESET_VOICES[number]['id']

export const EMOTION_TAGS = {
  basic: ['开心', '悲伤', '愤怒', '恐惧', '惊讶', '兴奋', '委屈', '平静', '冷漠'] as const,
  complex: ['怅然', '欣慰', '无奈', '愧疚', '释然', '嫉妒', '厌倦', '忐忑', '动情'] as const,
  tone: ['温柔', '高冷', '活泼', '严肃', '慵懒', '俏皮', '深沉', '干练', '凌厉'] as const,
  timbre: ['磁性', '醇厚', '清亮', '空灵', '稚嫩', '苍老', '甜美', '沙哑', '醇雅'] as const,
  style: ['夹子音', '御姐音', '正太音', '大叔音', '台湾腔'] as const,
  dialect: ['东北话', '四川话', '河南话', '粤语'] as const,
  character: ['孙悟空', '林黛玉'] as const,
} as const

export const AUDIO_TAGS = {
  rhythm: ['吸气', '深呼吸', '叹气', '长叹一口气', '喘息', '屏息'] as const,
  emotion: ['紧张', '害怕', '激动', '疲惫', '委屈', '撒娇', '心虚', '震惊', '不耐烦'] as const,
  voice: ['颤抖', '声音颤抖', '变调', '破音', '鼻音', '气声', '沙哑'] as const,
  laugh: ['笑', '轻笑', '大笑', '冷笑', '抽泣', '呜咽', '哽咽', '嚎啕大哭'] as const,
} as const

export interface MiMoTTSParams {
  text: string
  voice: PresetVoiceId | string
  emotion?: string
  style?: string
  format?: 'wav' | 'pcm16'
  stream?: boolean
  emotionIntensity?: number  // 情绪强度 1-10
  speed?: 'slow' | 'normal' | 'fast'  // 语速
  specialNote?: string  // 特殊演播指导（低语、气声等）
}

export interface MiMoTTSResponse {
  audioBuffer: Buffer
  duration: number
  format: string
}

/**
 * 带超时和重试的 fetch
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  timeoutMs = 90000,
  maxRetries = 2,
): Promise<Response> {
  let lastError: Error | null = null
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const resp = await fetch(url, { ...options, signal: controller.signal })
      clearTimeout(timer)
      return resp
    } catch (err) {
      clearTimeout(timer)
      lastError = err instanceof Error ? err : new Error(String(err))
      if (lastError.name === 'AbortError') {
        console.warn(`[MiMo] attempt ${attempt + 1} timed out after ${timeoutMs}ms, retrying...`)
      } else {
        console.warn(`[MiMo] attempt ${attempt + 1} failed: ${lastError.message}, retrying...`)
      }
    }
  }
  throw lastError ?? new Error('fetchWithRetry failed')
}

/**
 * MiMo TTS 引擎类
 */
export class MiMoTTSEngine {
  private baseUrl = 'https://token-plan-cn.xiaomimimo.com/v1'
  private apiKey: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.MIMO_API_KEY || ''
    if (!this.apiKey) {
      throw new Error('MIMO_API_KEY is required')
    }
  }

  /**
   * 生成语音
   */
  async generate(params: MiMoTTSParams): Promise<MiMoTTSResponse> {
    const messages: Array<{ role: string; content: string }> = []

    // 构建风格指导文本：情绪 + 情绪强度 + 语速 + 特殊演播指导
    const styleParts: string[] = []
    if (params.emotion) styleParts.push(params.emotion)
    if (params.emotionIntensity && params.emotionIntensity > 5) styleParts.push(`情感强度${params.emotionIntensity}/10`)
    if (params.speed === 'slow') styleParts.push('语速缓慢')
    if (params.speed === 'fast') styleParts.push('语速加快')
    if (params.specialNote) styleParts.push(params.specialNote)
    if (params.style) styleParts.push(params.style)

    if (styleParts.length > 0) {
      messages.push({ role: 'user', content: styleParts.join('，') })
    }

    messages.push({ role: 'assistant', content: params.text })

    const body = {
      model: 'mimo-v2.5-tts',
      messages,
      audio: {
        format: params.format || 'wav',
        voice: params.voice,
      },
      stream: false,
    }

    const response = await fetchWithRetry(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`MiMo TTS error: ${response.status} - ${error}`)
    }

    const result = await response.json()
    const audioData = result.choices?.[0]?.message?.audio?.data
    if (!audioData) {
      throw new Error('No audio data in response: ' + JSON.stringify(result).slice(0, 500))
    }

    const audioBuffer = Buffer.from(audioData, 'base64')
    const duration = audioBuffer.length / (24000 * 2)

    return { audioBuffer, duration, format: params.format || 'wav' }
  }

  /**
   * 流式生成语音
   */
  async *generateStream(params: MiMoTTSParams): AsyncGenerator<Buffer> {
    const messages: Array<{ role: string; content: string }> = []

    if (params.emotion || params.style) {
      const styleText = [params.emotion, params.style].filter(Boolean).join('，')
      messages.push({ role: 'user', content: styleText })
    }

    messages.push({ role: 'assistant', content: params.text })

    const body = {
      model: 'mimo-v2.5-tts',
      messages,
      audio: {
        format: params.format || 'wav',
        voice: params.voice,
      },
      stream: true,
    }

    const response = await fetchWithRetry(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`MiMo TTS stream error: ${response.status} - ${error}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n').filter(line => line.trim())
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') return
          try {
            const parsed = JSON.parse(data)
            const audioData = parsed.choices?.[0]?.delta?.audio?.data
            if (audioData) yield Buffer.from(audioData, 'base64')
          } catch { /* 忽略 */ }
        }
      }
    }
  }

  getVoices() {
    return PRESET_VOICES
  }
}

export default MiMoTTSEngine
