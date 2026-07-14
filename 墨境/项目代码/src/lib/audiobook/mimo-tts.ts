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
  // 中文音色
  { id: '冰糖', name: '冰糖', gender: 'female' as const, language: 'zh', desc: '甜美女声，适合旁白' },
  { id: '茉莉', name: '茉莉', gender: 'female' as const, language: 'zh', desc: '温柔女声，适合对话' },
  { id: '苏打', name: '苏打', gender: 'male' as const, language: 'zh', desc: '阳光男声，适合青年角色' },
  { id: '白桦', name: '白桦', gender: 'male' as const, language: 'zh', desc: '沉稳男声，适合中年角色' },
  // 英文音色
  { id: 'Mia', name: 'Mia', gender: 'female' as const, language: 'en', desc: 'Sweet female voice' },
  { id: 'Chloe', name: 'Chloe', gender: 'female' as const, language: 'en', desc: 'Gentle female voice' },
  { id: 'Milo', name: 'Milo', gender: 'male' as const, language: 'en', desc: 'Warm male voice' },
  { id: 'Dean', name: 'Dean', gender: 'male' as const, language: 'en', desc: 'Deep male voice' },
] as const

export type PresetVoiceId = typeof PRESET_VOICES[number]['id']

// ── 情绪标签定义 ──
export const EMOTION_TAGS = {
  // 基础情绪
  basic: ['开心', '悲伤', '愤怒', '恐惧', '惊讶', '兴奋', '委屈', '平静', '冷漠'] as const,
  // 复合情绪
  complex: ['怅然', '欣慰', '无奈', '愧疚', '释然', '嫉妒', '厌倦', '忐忑', '动情'] as const,
  // 整体语调
  tone: ['温柔', '高冷', '活泼', '严肃', '慵懒', '俏皮', '深沉', '干练', '凌厉'] as const,
  // 音色定位
  timbre: ['磁性', '醇厚', '清亮', '空灵', '稚嫩', '苍老', '甜美', '沙哑', '醇雅'] as const,
  // 人设腔调
  style: ['夹子音', '御姐音', '正太音', '大叔音', '台湾腔'] as const,
  // 方言
  dialect: ['东北话', '四川话', '河南话', '粤语'] as const,
  // 角色扮演
  character: ['孙悟空', '林黛玉'] as const,
} as const

// ── 音频标签（细粒度控制） ──
export const AUDIO_TAGS = {
  // 语速与节奏
  rhythm: ['吸气', '深呼吸', '叹气', '长叹一口气', '喘息', '屏息'] as const,
  // 情绪状态
  emotion: ['紧张', '害怕', '激动', '疲惫', '委屈', '撒娇', '心虚', '震惊', '不耐烦'] as const,
  // 语音特征
  voice: ['颤抖', '声音颤抖', '变调', '破音', '鼻音', '气声', '沙哑'] as const,
  // 哭笑表达
  laugh: ['笑', '轻笑', '大笑', '冷笑', '抽泣', '呜咽', '哽咽', '嚎啕大哭'] as const,
} as const

// ── TTS 参数类型 ──
export interface MiMoTTSParams {
  text: string
  voice: PresetVoiceId | string
  emotion?: string
  style?: string
  format?: 'wav' | 'pcm16'
  stream?: boolean
}

// ── TTS 响应类型 ──
export interface MiMoTTSResponse {
  audioBuffer: Buffer
  duration: number
  format: string
}

/**
 * MiMo TTS 引擎类
 */
export class MiMoTTSEngine {
  private baseUrl = 'https://api.xiaomimimo.com/v1'
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

    // 如果有情绪/风格控制，放在 user 消息中
    if (params.emotion || params.style) {
      const styleText = [params.emotion, params.style].filter(Boolean).join('，')
      messages.push({ role: 'user', content: styleText })
    }

    // 目标文本放在 assistant 消息中
    messages.push({ role: 'assistant', content: params.text })

    const body = {
      model: 'mimo-v2.5-tts',
      messages,
      audio: {
        format: params.format || 'wav',
        voice: params.voice,
      },
      stream: params.stream || false,
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
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
    
    // 解析音频数据
    const audioData = result.choices?.[0]?.message?.audio?.data
    if (!audioData) {
      throw new Error('No audio data in response')
    }

    // Base64 解码
    const audioBuffer = Buffer.from(audioData, 'base64')
    
    // 估算时长（24kHz PCM16 mono = 2 bytes per sample）
    const duration = audioBuffer.length / (24000 * 2)

    return {
      audioBuffer,
      duration,
      format: params.format || 'wav',
    }
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

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
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
    if (!reader) {
      throw new Error('No response body')
    }

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
            if (audioData) {
              yield Buffer.from(audioData, 'base64')
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }
  }

  /**
   * 获取预置音色列表
   */
  getVoices() {
    return PRESET_VOICES
  }
}

// 默认导出
export default MiMoTTSEngine
