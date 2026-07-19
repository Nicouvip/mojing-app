/**
 * 豆包语音合成引擎（Expressive 版）
 *
 * API: 火山引擎豆包语音 V3 SSE 接口
 * 资源ID: seed-icl-2.0（声音复刻2.0）
 * 模型: seed-tts-2.0-expressive（表现力增强版，支持 context_texts + cot 标签）
 *
 * 关键踩坑（来自 engine-config.md）：
 * - additions 必须是 JSON 字符串，不是对象！
 * - 旁白 cot 标签全部加"全程保持匀速"
 * - 夹角色音处插入≥800ms静音
 * - 输出必须是立体声(-ac 2)
 * - WAV格式没有比特率参数，转MP3才用-b:a 192k
 */

const SSE_URL = 'https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse'

/** 豆包音色速查 */
export const DOUBAO_VOICES = [
  { id: 'zh_female_meilinvyou_moon_bigtts', name: '魅力女友', gender: 'female', desc: '甜美女声·通用' },
  { id: 'zh_female_sajiaonvyou_moon_bigtts', name: '柔美女友', gender: 'female', desc: '温柔女声·对话' },
  { id: 'zh_female_yuanqinvyou_moon_bigtts', name: '撒娇学妹', gender: 'female', desc: '活泼女声·青年' },
  { id: 'zh_male_shenyeboke_moon_bigtts', name: '深夜播客', gender: 'male', desc: '磁性男声·旁白' },
  { id: 'zh_male_shaonianzixin_moon_bigtts', name: '少年梓辛', gender: 'male', desc: '清朗男声·少年' },
  { id: 'zh_female_wanqudashu_moon_bigtts', name: '湾区大叔', gender: 'male', desc: '沉稳男声·中年' },
  { id: 'zh_female_daimengchuanmei_moon_bigtts', name: '呆萌川妹', gender: 'female', desc: '方言女声·四川' },
  { id: 'zh_male_beijingxiaoye_moon_bigtts', name: '北京小爷', gender: 'male', desc: '方言男声·北京' },
  { id: 'zh_male_guozhoudege_moon_bigtts', name: '广州德哥', gender: 'male', desc: '方言男声·粤语' },
  { id: 'zh_male_haoyuxiaoge_moon_bigtts', name: '浩宇小哥', gender: 'male', desc: '阳光男声·通用' },
] as const

export interface DoubaoTTSParams {
  text: string
  voiceType?: string          // 音色ID，默认 zh_female_meilinvyou_moon_bigtts
  format?: 'mp3' | 'wav' | 'ogg_opus' | 'pcm'
  sampleRate?: number         // 8000/16000/22050/24000/32000/44100/48000
  speechRate?: number         // -50 ~ 100（0=正常，-50=0.5倍，100=2倍）
  loudnessRate?: number       // -50 ~ 100（0=正常）
  pitch?: number              // -12 ~ 12（0=正常）
  /** [expressive] 语音指令，如"用低沉压抑的语气讲述" */
  contextTexts?: string
  /** [expressive] 开启cot标签，可在text中嵌入 <cot text=描述>内容</cot> */
  useTagParser?: boolean
}

export interface DoubaoTTSResult {
  audioBuffer: Buffer
  duration: number
  format: string
}

/**
 * 豆包 Expressive TTS 引擎类
 */
export class DoubaoTTSEngine {
  private appId: string
  private accessToken: string
  private resourceId: string

  constructor(options?: { appId?: string; accessToken?: string; resourceId?: string }) {
    this.appId = options?.appId || process.env.DOUBAO_VOICE_APP_ID || '7083389501'
    this.accessToken = options?.accessToken || process.env.DOUBAO_VOICE_ACCESS_TOKEN || 'beUEfo3fRJ6MXkLD_AQgxQo460MklZmq'
    this.resourceId = options?.resourceId || process.env.DOUBAO_VOICE_RESOURCE_ID || 'seed-tts-1.0'
  }

  /**
   * 生成语音（SSE 流式接收，拼接为完整音频）
   */
  async generate(params: DoubaoTTSParams): Promise<DoubaoTTSResult> {
    const {
      text,
      voiceType = 'zh_female_meilinvyou_moon_bigtts',
      format = 'wav',
      sampleRate = 24000,
      speechRate = 0,
      loudnessRate = 0,
      pitch = 0,
      contextTexts,
      useTagParser,
    } = params

    // 构建 additions（必须是 JSON 字符串！）
    const additionsDict: Record<string, unknown> = {}
    if (speechRate !== 0) additionsDict.speech_rate = speechRate
    if (loudnessRate !== 0) additionsDict.loudness_rate = loudnessRate
    if (pitch !== 0) additionsDict.post_process = { pitch }
    if (contextTexts) additionsDict.context_texts = [contextTexts]
    if (useTagParser) additionsDict.use_tag_parser = true

    const payload = {
      user: { uid: 'reasonix' },
      req_params: {
        text,
        speaker: voiceType,
        audio_params: {
          format,
          sample_rate: sampleRate,
        },
        model: 'seed-tts-2.0-expressive',
        ...(Object.keys(additionsDict).length > 0
          ? { additions: JSON.stringify(additionsDict) }
          : {}),
      },
    }

    const headers = {
      'X-Api-App-Id': this.appId,
      'X-Api-Access-Key': this.accessToken,
      'X-Api-Resource-Id': this.resourceId,
      'Content-Type': 'application/json',
    }

    console.log(`[Doubao TTS] 调用 SSE, text长度: ${text.length}, voice: ${voiceType}`)
    const t0 = Date.now()

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 120_000)

    try {
      const response = await fetch(SSE_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Doubao TTS error: HTTP ${response.status} - ${errorText.slice(0, 200)}`)
      }

      // SSE 流式接收
      const audioChunks: Buffer[] = []
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data: ')) continue

          try {
            const data = JSON.parse(trimmed.slice(6))
            const code = data.code ?? -1
            if (code === 0) {
              const b64 = data.data || ''
              if (b64) audioChunks.push(Buffer.from(b64, 'base64'))
            } else if (audioChunks.length === 0) {
              throw new Error(data.message || `错误码: ${code}`)
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue // 跳过非JSON行
            throw e
          }
        }
      }

      if (audioChunks.length === 0) {
        throw new Error('未生成音频数据')
      }

      const audioBuffer = Buffer.concat(audioChunks)
      const duration = audioBuffer.length / (sampleRate * 2) // 16bit mono

      console.log(`[Doubao TTS] 完成, 耗时: ${Date.now() - t0}ms, 大小: ${audioBuffer.length} bytes, 时长: ${duration.toFixed(1)}s`)

      return { audioBuffer, duration, format }
    } catch (err) {
      clearTimeout(timeout)
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Doubao TTS 请求超时（120秒）')
      }
      throw err
    }
  }
}

export default DoubaoTTSEngine
