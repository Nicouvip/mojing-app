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

    const messages: Array<{ role: string; content: string }> = []

    // 音频样本放在 user 消息中
    messages.push({ role: 'user', content: base64Audio })

    // 如果有情绪/风格控制，也放在 user 消息中（追加）
    if (params.emotion || params.style) {
      const styleText = [params.emotion, params.style].filter(Boolean).join('，')
      messages[messages.length - 1].content += `\n\n请用${styleText}的风格朗读以下内容`
    }

    // 目标文本放在 assistant 消息中
    messages.push({ role: 'assistant', content: params.text })

    const body = {
      model: 'mimo-v2.5-tts-voiceclone',
      messages,
      audio: {
        format: params.format || 'wav',
      },
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
      throw new Error(`MiMo VoiceClone error: ${response.status} - ${error}`)
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
