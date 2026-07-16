/**
 * MiMo-V2.5-TTS-VoiceClone 引擎
 * 
 * 功能：通过音频样本精准复刻音色
 * 
 * 样本音频要求：
 * - 格式：mp3 或 wav
 * - 大小：Base64 编码后 ≤ 10 MB
 * - 前缀：data:{MIME_TYPE};base64,$BASE64_AUDIO
 * - 样本数量：少量音频样本即可高保真复刻
 */

// ── 声音克隆参数 ──
export interface VoiceCloneParams {
  sampleAudioBuffer: Buffer
  sampleMimeType: 'audio/mpeg' | 'audio/wav'
  text: string
  emotion?: string
  style?: string
  voice?: string
  format?: 'wav' | 'pcm16'
}

// ── 声音克隆响应 ──
export interface VoiceCloneResponse {
  audioBuffer: Buffer
  duration: number
  format: string
}

/**
 * MiMo VoiceClone 引擎类
 */
export class MiMoVoiceCloneEngine {
  private baseUrl = 'https://token-plan-cn.xiaomimimo.com/v1'
  private apiKey: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.MIMO_API_KEY || ''
    if (!this.apiKey) {
      throw new Error('MIMO_API_KEY is required')
    }
  }

  /**
   * 克隆声音并生成语音
   */
  async clone(params: VoiceCloneParams): Promise<VoiceCloneResponse> {
    // 转换为 Base64 并添加前缀
    const base64Audio = `data:${params.sampleMimeType};base64,${params.sampleAudioBuffer.toString('base64')}`

    // 音频样本仅通过 audio.voice 字段传递，messages 中只放文本指令
    const styleText = [params.emotion, params.style].filter(Boolean).join('，')
    const systemHint = styleText ? `请用${styleText}的风格` : ''
    const userContent = systemHint
      ? `请基于提供的音频样本，${systemHint}朗读以下内容。`
      : `请基于提供的音频样本，自然地朗读以下内容。`

    const messages: Array<{ role: string; content: string }> = [
      { role: 'user', content: userContent },
      { role: 'assistant', content: params.text },
    ]

    const body = {
      model: 'mimo-v2.5-tts-voiceclone',
      messages,
      audio: {
        voice: base64Audio,
        format: params.format || 'wav',
      },
    }

    // 指数退避重试（429 + 网络错误均重试，最多3次）
    const maxRetries = 3
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const waitMs = Math.min(10000 * Math.pow(2, attempt - 1), 40000)
        console.warn(`[VoiceClone] retry ${attempt}/${maxRetries} after ${waitMs}ms`)
        await new Promise(r => setTimeout(r, waitMs))
      }

      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'api-key': this.apiKey },
          body: JSON.stringify(body),
        })

        if (response.ok) {
          const result = await response.json()
          const audioData = result.choices?.[0]?.message?.audio?.data
          if (!audioData) throw new Error('No audio data in response')
          const audioBuffer = Buffer.from(audioData, 'base64')
          return { audioBuffer, duration: audioBuffer.length / (24000 * 2), format: params.format || 'wav' }
        }

        if (response.status === 429 && attempt < maxRetries) continue
        throw new Error(`MiMo VoiceClone error: ${response.status} - ${await response.text()}`)
      } catch (err) {
        if (attempt < maxRetries && !(err as Error)?.message?.startsWith('MiMo VoiceClone error:')) {
          continue // 网络错误等重试
        }
        throw err
      }
    }
    throw new Error('MiMo VoiceClone failed after retries')
  }

  /**
   * 验证音频样本
   */
  validateSample(buffer: Buffer, mimeType: string): { valid: boolean; error?: string } {
    const maxSize = 7.5 * 1024 * 1024
    if (buffer.length > maxSize) {
      return { valid: false, error: `音频文件过大，最大支持 ${maxSize / 1024 / 1024}MB` }
    }

    const supportedFormats = ['audio/mpeg', 'audio/mp3', 'audio/wav']
    if (!supportedFormats.includes(mimeType)) {
      return { valid: false, error: `不支持的音频格式: ${mimeType}，支持 mp3/wav` }
    }

    return { valid: true }
  }

  /**
   * 获取样本建议
   */
  getSampleAdvice(): string[] {
    return [
      '时长建议 10 秒 - 1 分钟，太短可能影响复刻质量',
      '内容建议：朗读一段文字，保持自然语速和语调',
      '环境要求：无背景噪音，人声清晰',
      '格式要求：mp3 或 wav 格式',
      '质量建议：采样率 16kHz 以上，16bit 以上',
    ]
  }
}

// 默认导出
export default MiMoVoiceCloneEngine
