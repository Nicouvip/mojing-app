/**
 * 讯飞 TTS 引擎
 *
 * API: 讯飞大模型语音合成 HTTP 接口
 * 认证: HMAC-SHA256 签名（APIKey + APISecret + baseString）
 *
 * 前端显示为"专业版"，不显示"讯飞"字眼
 */

import crypto from 'crypto'

// ── 讯飞预置音色 ──
export const XFYUN_VOICES = [
  { id: 'x5_lingxiaoxuan', name: '灵小萱', gender: 'female' as const, language: 'zh', desc: '温柔知性女声' },
  { id: 'x5_yezi', name: '叶子', gender: 'female' as const, language: 'zh', desc: '清新自然女声' },
  { id: 'x5_xiaoxiao', name: '晓晓', gender: 'female' as const, language: 'zh', desc: '温柔女声，适合旁白' },
  { id: 'x5_xiaomeng', name: '晓梦', gender: 'female' as const, language: 'zh', desc: '活泼女声' },
  { id: 'x5_yunxi', name: '云希', gender: 'male' as const, language: 'zh', desc: '阳光男声' },
  { id: 'x5_yunyang', name: '云扬', gender: 'male' as const, language: 'zh', desc: '播音男声' },
  { id: 'x5_xiaochen', name: '晓辰', gender: 'male' as const, language: 'zh', desc: '磁性男声' },
  { id: 'x5_xiaogang', name: '晓刚', gender: 'male' as const, language: 'zh', desc: '沉稳男声' },
  { id: 'x5_ailun', name: '艾伦', gender: 'male' as const, language: 'zh', desc: '有声书旁白' },
] as const

export type XfyunVoiceId = typeof XFYUN_VOICES[number]['id']

export interface XfyunTTSParams {
  text: string
  voice?: XfyunVoiceId | string
  speed?: number  // 语速 0.5-2.0，默认1.0
  volume?: number  // 音量 0-100，默认50
  pitch?: number  // 音高 0-100，默认50
}

export interface XfyunTTSResponse {
  audioBuffer: Buffer
  duration: number
  format: string
}

/**
 * 构建讯飞 HTTP 认证参数
 */
function buildAuthParams(appid: string, apisecret: string, apiKey: string): {
  authorization: string
  xCurTime: string
} {
  const curTime = Math.floor(Date.now() / 1000).toString()
  const baseString = appid + curTime
  const sha256 = crypto.createHmac('sha256', apisecret).update(baseString).digest('hex')
  const authorization = `api_key="${apiKey}" algorithm="hmac-sha256", headers="host date request-line", signature="${sha256}"`
  return { authorization: `Bearer ${authorization}`, xCurTime: curTime }
}

/**
 * 讯飞 TTS 引擎
 */
export class XfyunTTSEngine {
  private appid: string
  private apiKey: string
  private apiSecret: string

  constructor() {
    this.appid = process.env.XFYUN_APPID || ''
    this.apiKey = process.env.XFYUN_API_KEY || ''
    this.apiSecret = process.env.XFYUN_API_SECRET || ''
    if (!this.appid || !this.apiKey || !this.apiSecret) {
      throw new Error('XFYUN_APPID, XFYUN_API_KEY, XFYUN_API_SECRET are required')
    }
  }

  async generate(params: XfyunTTSParams): Promise<XfyunTTSResponse> {
    const text = params.text || ''
    const voiceId = params.voice || 'x5_xiaoxiao'
    const speed = params.speed ?? 1.0
    const volume = params.volume ?? 50
    const pitch = params.pitch ?? 50

    const { authorization, xCurTime } = buildAuthParams(this.appid, this.apiSecret, this.apiKey)

    const url = new URL('https://api.xfyun.cn/v2/tts')
    url.searchParams.set('text', encodeURIComponent(text))
    url.searchParams.set('aue', 'raw')  // raw=WAV, lame=MP3
    url.searchParams.set('auf', 'audio/L16;rate=16000')
    url.searchParams.set('vcn', voiceId)
    url.searchParams.set('speed', String(speed))
    url.searchParams.set('volume', String(volume))
    url.searchParams.set('pitch', String(pitch))
    url.searchParams.set('bgs', '0')  // 无背景音乐
    url.searchParams.set('tte', 'UTF8')

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
        'Authorization': authorization,
        'X-CurTime': xCurTime,
      },
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`讯飞TTS错误 (${response.status}): ${errText}`)
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer())

    // 计算时长（16kHz 16bit mono）
    const duration = audioBuffer.length / (16000 * 2)

    return { audioBuffer, duration, format: 'wav' }
  }
}
