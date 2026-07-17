/**
 * 音频编码工具函数 — 共用模块
 * 从 audiobook/page.tsx 和 audiobook/[projectId]/page.tsx 提取
 */

/** 将 AudioBuffer 编码为 WAV Blob */
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
