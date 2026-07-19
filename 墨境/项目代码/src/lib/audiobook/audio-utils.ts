/**
 * 音频编码工具函数 — 共用模块
 * 从 audiobook/page.tsx 和 audiobook/[projectId]/page.tsx 提取
 */

/** 简易混响：生成衰减噪声脉冲作为卷积核 */
function createReverbImpulse(duration: number, decay: number, sampleRate: number): Float32Array {
  const len = Math.floor(sampleRate * duration)
  const impulse = new Float32Array(len)
  for (let i = 0; i < len; i++) {
    impulse[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
  }
  return impulse
}

/** 用 Web Audio 离线渲染对音频应用效果链 */
export async function applyEffectsToBase64(
  audioBase64: string,
  preset: 'polish' | 'radio' | 'spacious' | 'deep',
): Promise<string> {
  const bin = atob(audioBase64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const audioCtx = new OfflineAudioContext(1, 1, 24000)
  const decoded = await audioCtx.decodeAudioData(bytes.buffer.slice(0) as ArrayBuffer)

  // 重建解码
  ;(audioCtx as unknown as AudioContext).close()
  const offlineCtx = new OfflineAudioContext(1, decoded.length, decoded.sampleRate)
  const src = offlineCtx.createBufferSource()
  src.buffer = decoded

  let chainEnd: AudioNode = src

  if (preset === 'polish') {
    // 压缩 + 轻微混响
    const comp = offlineCtx.createDynamicsCompressor()
    comp.threshold.value = -20; comp.ratio.value = 3
    const conv = offlineCtx.createConvolver()
    const imp = createReverbImpulse(0.3, 3, decoded.sampleRate)
    conv.buffer = offlineCtx.createBuffer(1, imp.length, decoded.sampleRate)!
    // @ts-expect-error Float32Array<ArrayBufferLike> vs ArrayBuffer
    
    conv.buffer.copyToChannel(imp as unknown as Float32Array, 0)
    const dry = offlineCtx.createGain(); dry.gain.value = 0.92
    const wet = offlineCtx.createGain(); wet.gain.value = 0.08
    const merger = offlineCtx.createGain()
    chainEnd.connect(comp); comp.connect(dry); dry.connect(merger)
    comp.connect(conv); conv.connect(wet); wet.connect(merger)
    chainEnd = merger as any
  } else if (preset === 'radio') {
    // 高通300 + 低通3500 + 压缩 + 增益
    const hp = offlineCtx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 300
    const lp = offlineCtx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3500
    const comp = offlineCtx.createDynamicsCompressor(); comp.threshold.value = -24; comp.ratio.value = 4
    const gain = offlineCtx.createGain(); gain.gain.value = 2.0
    chainEnd.connect(hp); hp.connect(lp); lp.connect(comp); comp.connect(gain)
    chainEnd = gain
  } else if (preset === 'spacious') {
    // 大混响 + 延迟
    const conv = offlineCtx.createConvolver()
    const imp = createReverbImpulse(1.5, 1.5, decoded.sampleRate)
    conv.buffer = offlineCtx.createBuffer(1, imp.length, decoded.sampleRate)!
    // @ts-expect-error Float32Array<ArrayBufferLike> vs ArrayBuffer
    
    conv.buffer.copyToChannel(imp as unknown as Float32Array, 0)
    const dry = offlineCtx.createGain(); dry.gain.value = 0.6
    const wet = offlineCtx.createGain(); wet.gain.value = 0.4
    const delay = offlineCtx.createDelay(1); delay.delayTime.value = 0.2
    const feedback = offlineCtx.createGain(); feedback.gain.value = 0.3
    const merger = offlineCtx.createGain()
    chainEnd.connect(dry); dry.connect(merger)
    chainEnd.connect(conv); conv.connect(wet); wet.connect(merger)
    chainEnd.connect(delay); delay.connect(feedback); feedback.connect(delay)
    feedback.connect(merger)
    chainEnd = merger as any
  } else if (preset === 'deep') {
    // 降调 - 通过播放速率实现
    // 注意：BiquadFilter 不能变调，用 playbackRate 近似
    const lp = offlineCtx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6000
    const comp = offlineCtx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 2.5
    const gain = offlineCtx.createGain(); gain.gain.value = 0.85
    chainEnd.connect(comp); comp.connect(lp); lp.connect(gain)
    chainEnd = gain
  }

  chainEnd.connect(offlineCtx.destination)
  src.start()
  const rendered = await offlineCtx.startRendering()
  const wav = encodeWAV(rendered)
  const reader = new FileReader()
  return new Promise((resolve) => {
    reader.onloadend = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.readAsDataURL(wav)
  })
}
export function encodeWAV(audioBuf: AudioBuffer): Blob {
  const numCh = audioBuf.numberOfChannels
  const sampleRate = audioBuf.sampleRate
  const format = 1
  const bitsPerSample = 16
  const bytesPerSample = bitsPerSample / 8
  const blockAlign = numCh * bytesPerSample
  const dataLength = audioBuf.length * blockAlign
  const buffer = new ArrayBuffer(44 + dataLength)
  const view = new DataView(buffer)
  const writeStr = (offset: number, str: string) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)) }
  writeStr(0, 'RIFF'); view.setUint32(4, 36 + dataLength, true); writeStr(8, 'WAVE')
  writeStr(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, format, true); view.setUint16(22, numCh, true)
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * blockAlign, true); view.setUint16(32, blockAlign, true); view.setUint16(34, bitsPerSample, true)
  writeStr(36, 'data'); view.setUint32(40, dataLength, true)
  const channels: Float32Array[] = []
  for (let ch = 0; ch < numCh; ch++) channels.push(audioBuf.getChannelData(ch))
  let offset = 44
  for (let i = 0; i < audioBuf.length; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
      offset += 2
    }
  }
  return new Blob([buffer], { type: 'audio/wav' })
}

/** 播放 base64 音频 */
export function playBase64Audio(base64: string, mime: string): HTMLAudioElement {
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const blob = new Blob([bytes], { type: mime })
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  audio.play()
  return audio
}
