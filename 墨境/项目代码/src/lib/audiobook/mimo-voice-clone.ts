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
  private baseUrl = 'https://api.xiaomimimo.com/v1'
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
    // （同时放到 messages 中会导致 tokens 远超 context length 8192 限制）
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

    // 带指数退避的重试逻辑（应对 429 频率限制）
    const maxRetries = 3
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        // 指数退避：1s → 2s → 4s
        const waitMs = Math.min(1000 * Math.pow(2, attempt - 1), 4000)
        console.warn(`[VoiceClone] 429 rate limited, retry ${attempt}/${maxRetries} after ${waitMs}ms`)
        await new Promise(r => setTimeout(r, waitMs))
      }

      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': this.apiKey,
          },
          body: JSON.stringify(body),
        })

        if (response.ok) {
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

        // 429 频率限制 → 重试
        if (response.status === 429 && attempt < maxRetries) {
          const errorText = await response.text()
          lastError = new Error(`MiMo VoiceClone error: ${response.status} - ${errorText}`)
          continue
        }

        // 其他错误 → 直接抛出
        const error = await response.text()
        throw new Error(`MiMo VoiceClone error: ${response.status} - ${error}`)
      } catch (err) {
        // 429 已经被上面捕获并设置了 lastError，这里跳过
        if (err instanceof Error && err.message.startsWith('MiMo VoiceClone error: 429')) {
          continue
        }
        // 非 429 错误直接抛出
        if (!(err instanceof Error && err.message.startsWith('MiMo VoiceClone'))) {
          // 网络错误等 → 重试
          if (attempt < maxRetries) {
            console.warn(`[VoiceClone] network error, retry ${attempt + 1}/${maxRetries}:`, err)
            lastError = err instanceof Error ? err : new Error(String(err))
            continue
          }
        }
        throw err
      }
    }

    throw lastError || new Error('VoiceClone failed after retries')
  }

  /**
   * 验证音频样本
   */
  validateSample(buffer: Buffer, mimeType: string): { valid: boolean; error?: string } {
    // 检查大小（Base64 后 ≤ 10MB，原始文件约 7.5MB）
    const maxSize = 7.5 * 1024 * 1024
    if (buffer.length > maxSize) {
      return { valid: false, error: `音频文件过大，最大支持 ${maxSize / 1024 / 1024}MB` }
    }

    // 检查格式
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
