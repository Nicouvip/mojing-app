/**
 * MiMo-V2.5-TTS-VoiceDesign 引擎
 * 
 * 功能：通过自然语言描述生成定制化音色
 * 
 * 音色描述关键维度：
 * - 性别与年龄：「年轻女性」「五十多岁的中年男性」
 * - 音色/质感：「deep and gravelly」「丝滑醇厚、带着磁性」
 * - 情绪/语气：「warm and confident」「温柔但带着一丝疲惫」
 * - 语速/节奏：「slow and deliberate」「语速极快，像连珠炮」
 * - 角色/人设：narrator, podcast host, 评书先生, 深夜电台DJ
 * - 说话风格：casual and colloquial, 一本正经地
 * - 场景描写：narrating a nature documentary
 * - 年代参照：1940s film noir, 八十年代译制片配音
 */

// ── 音色设计参数 ──
export interface VoiceDesignParams {
  description: string       // 音色描述文本，1-4句
  text?: string             // 要合成的文本（可选）
  optimizeText?: boolean    // 是否智能润色文本
  format?: 'wav' | 'pcm16'
}

// ── 音色设计响应 ──
export interface VoiceDesignResponse {
  audioBuffer: Buffer
  duration: number
  format: string
}

/**
 * MiMo VoiceDesign 引擎类
 */
export class MiMoVoiceDesignEngine {
  private baseUrl = 'https://api.xiaomimimo.com/v1'
  private apiKey: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.MIMO_API_KEY || ''
    if (!this.apiKey) {
      throw new Error('MIMO_API_KEY is required')
    }
  }

  /**
   * 设计新音色并生成音频
   */
  async design(params: VoiceDesignParams): Promise<VoiceDesignResponse> {
    const messages: Array<{ role: string; content: string }> = []

    // 音色描述放在 user 消息中（必填）
    messages.push({ role: 'user', content: params.description })

    // 目标文本放在 assistant 消息中（可选）
    if (params.text && !params.optimizeText) {
      messages.push({ role: 'assistant', content: params.text })
    }

    const body = {
      model: 'mimo-v2.5-tts-voicedesign',
      messages,
      audio: {
        format: params.format || 'wav',
        optimize_text_preview: params.optimizeText || false,
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
      throw new Error(`MiMo VoiceDesign error: ${response.status} - ${error}`)
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
   * 预览音色（生成一段测试音频）
   */
  async preview(description: string, previewText?: string): Promise<VoiceDesignResponse> {
    const defaultPreviewText = '你好，我是你的有声书配音。很高兴为你服务。'
    
    return this.design({
      description,
      text: previewText || defaultPreviewText,
      format: 'wav',
    })
  }

  /**
   * 获取音色设计建议
   */
  getDesignSuggestions(characterType: string): string[] {
    const suggestions: Record<string, string[]> = {
      '青年男性': [
        '年轻男性，声音清亮，充满活力，适合都市剧主角',
        '二十多岁的阳光青年，语速适中，带点俏皮',
        '青年男性，声音温和，略带磁性，适合旁白',
      ],
      '中年男性': [
        '五十多岁的中年男性，声音低沉稳重，适合长辈角色',
        '中年男性，声音浑厚，有威严感，适合领导角色',
        '中年男性，声音沙哑沧桑，适合有故事的角色',
      ],
      '老年男性': [
        '七十多岁的老者，声音苍老但有力量，适合智者角色',
        '老年男性，声音颤抖，带着岁月的痕迹',
        '老者，声音深沉缓慢，像是在讲述古老的故事',
      ],
      '青年女性': [
        '年轻女性，声音甜美，充满活力，适合女主角',
        '二十多岁的女性，声音温柔，略带俏皮',
        '青年女性，声音清亮，适合旁白和对话',
      ],
      '中年女性': [
        '中年女性，声音温暖，有母性的光辉',
        '四十多岁的女性，声音沉稳，适合长辈角色',
        '中年女性，声音略带沙哑，有故事感',
      ],
      '老年女性': [
        '老年女性，声音慈祥，像是在讲睡前故事',
        '七十多岁的老奶奶，声音颤抖但温暖',
        '老年女性，声音苍老，带着岁月的智慧',
      ],
      '儿童': [
        '八岁的小男孩，声音稚嫩，充满好奇心',
        '十岁的小女孩，声音清脆，活泼可爱',
        '儿童声音，稚嫩天真，适合童话故事',
      ],
      '旁白': [
        '专业旁白，声音沉稳，语速适中，适合有声书',
        '纪录片旁白风格，声音深沉，有磁性',
        '故事讲述者，声音富有感染力，能吸引听众',
      ],
    }

    return suggestions[characterType] || suggestions['旁白']
  }
}

// 默认导出
export default MiMoVoiceDesignEngine
