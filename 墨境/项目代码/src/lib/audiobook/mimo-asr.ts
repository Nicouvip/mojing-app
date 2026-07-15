/**
 * MiMo-V2.5-ASR 引擎
 * 
 * 功能：语音识别（ASR）
 * - 中英双语+方言支持
 * - 歌词转写
 * - 复杂声学环境表现稳健
 * 
 * 定价：¥ 0.5 / 小时（按输入音频时长计费）
 */

// ── ASR 参数类型 ──
export interface MiMoASRParams {
  audioBuffer: Buffer
  mimeType: 'audio/mpeg' | 'audio/wav' | 'audio/mp3'
  language?: 'zh' | 'en' | 'auto'
}

// ── ASR 时间戳 ──
export interface ASRTimestamp {
  start: number
  end: number
  text: string
}

// ── ASR 响应类型 ──
export interface MiMoASRResponse {
  text: string
  timestamps: ASRTimestamp[]
  duration: number
}

/**
 * MiMo ASR 引擎类
 */
export class MiMoASREngine {
  private baseUrl = 'https://token-plan-cn.xiaomimimo.com/v1'
  private apiKey: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.MIMO_API_KEY || ''
    if (!this.apiKey) {
      throw new Error('MIMO_API_KEY is required')
    }
  }

  /**
   * 识别音频并返回时间戳
   */
  async transcribe(params: MiMoASRParams): Promise<MiMoASRResponse> {
    // 转换为 Base64
    const base64Audio = `data:${params.mimeType};base64,${params.audioBuffer.toString('base64')}`

    const body = {
      model: 'mimo-v2.5-asr',
      messages: [
        { role: 'user', content: base64Audio }
      ],
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
      throw new Error(`MiMo ASR error: ${response.status} - ${error}`)
    }

    const result = await response.json()
    
    // 解析识别结果
    const content = result.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('No transcription in response')
    }

    // 尝试解析 JSON 格式的时间戳
    let text = content
    let timestamps: ASRTimestamp[] = []

    try {
      const parsed = JSON.parse(content)
      text = parsed.text || content
      timestamps = parsed.timestamps || []
    } catch {
      // 如果不是 JSON，直接使用文本
      text = content
    }

    // 估算音频时长
    const duration = params.audioBuffer.length / (16000 * 2) // 假设 16kHz 16bit

    return {
      text,
      timestamps,
      duration,
    }
  }

  /**
   * 批量识别多个音频段落
   */
  async transcribeBatch(params: Array<{ audioBuffer: Buffer; mimeType: 'audio/mpeg' | 'audio/wav' | 'audio/mp3' }>): Promise<MiMoASRResponse[]> {
    const results: MiMoASRResponse[] = []
    
    for (const param of params) {
      const result = await this.transcribe(param)
      results.push(result)
    }
    
    return results
  }

  /**
   * 生成 LRC 格式字幕
   */
  generateLRC(timestamps: ASRTimestamp[]): string {
    const lines: string[] = []
    
    for (const ts of timestamps) {
      const minutes = Math.floor(ts.start / 60)
      const seconds = Math.floor(ts.start % 60)
      const milliseconds = Math.floor((ts.start % 1) * 100)
      
      const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(2, '0')}`
      lines.push(`[${timeStr}]${ts.text}`)
    }
    
    return lines.join('\n')
  }

  /**
   * 生成 SRT 格式字幕
   */
  generateSRT(timestamps: ASRTimestamp[]): string {
    const lines: string[] = []
    
    for (let i = 0; i < timestamps.length; i++) {
      const ts = timestamps[i]
      
      const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = Math.floor(seconds % 60)
        const ms = Math.floor((seconds % 1) * 1000)
        
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`
      }
      
      lines.push(`${i + 1}`)
      lines.push(`${formatTime(ts.start)} --> ${formatTime(ts.end)}`)
      lines.push(ts.text)
      lines.push('')
    }
    
    return lines.join('\n')
  }
}

// 默认导出
export default MiMoASREngine
