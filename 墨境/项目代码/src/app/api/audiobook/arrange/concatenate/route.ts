import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

/**
 * POST /api/audiobook/arrange/concatenate
 * 多轨编排 — 拼接音频 + 写入 AU 标记
 *
 * Body: {
 *   segments: Array<{ audioBase64: string; duration?: number }>,
 *   silenceMs?: number,
 *   fadeMs?: number,
 *   markers?: Array<{ label: string; positionMs: number }>,
 *   book?: string,
 *   episode?: string,
 *   cv?: string
 * }
 *
 * 拼接规则（移植自 scripts/narrate_arrange_lib/concatenator.py）：
 * - 段间插入静音（silenceMs 默认 800ms）
 * - 每段前后加淡入淡出（fadeMs 默认 80ms）
 * - 可选写入 AU Cue 标记
 */

/** 生成 WAV 头（44 字节 PCM 格式） */
function createWavHeader(dataLength: number, sampleRate: number, numChannels: number, bitsPerSample: number): Buffer {
  const buffer = Buffer.alloc(44)
  const writeStr = (offset: number, str: string) => { for (let i = 0; i < str.length; i++) buffer.writeUInt8(str.charCodeAt(i), offset + i) }
  const writeU16 = (offset: number, v: number) => buffer.writeUInt16LE(v, offset)
  const writeU32 = (offset: number, v: number) => buffer.writeUInt32LE(v, offset)

  writeStr(0, 'RIFF')
  writeU32(4, 36 + dataLength)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  writeU32(16, 16)
  writeU16(20, 1)  // PCM
  writeU16(22, numChannels)
  writeU32(24, sampleRate)
  writeU32(28, sampleRate * numChannels * bitsPerSample / 8)
  writeU16(32, numChannels * bitsPerSample / 8)
  writeU16(34, bitsPerSample)
  writeStr(36, 'data')
  writeU32(40, dataLength)

  return buffer
}

/** 解析 base64 音频数据：去掉 WAV 头取裸 PCM */
function extractRawPCM(buffer: Buffer): Buffer {
  if (buffer.length >= 44 && buffer.toString('ascii', 0, 4) === 'RIFF') {
    return buffer.subarray(44)
  }
  return buffer
}

/** 生成静音 PCM 数据 */
function generateSilence(ms: number, sampleRate: number): Buffer {
  const samples = Math.floor(ms / 1000 * sampleRate)
  return Buffer.alloc(samples * 2) // 16-bit = 2 bytes per sample
}

/** 淡入淡出处理 */
function applyFade(pcm: Buffer, fadeInMs: number, fadeOutMs: number, sampleRate: number): Buffer {
  const result = Buffer.from(pcm)
  const fadeSamplesIn = Math.floor(fadeInMs / 1000 * sampleRate)
  const fadeSamplesOut = Math.floor(fadeOutMs / 1000 * sampleRate)
  const totalSamples = result.length / 2

  for (let i = 0; i < Math.min(fadeSamplesIn, totalSamples); i++) {
    const gain = i / fadeSamplesIn
    const sample = result.readInt16LE(i * 2)
    result.writeInt16LE(Math.round(sample * gain), i * 2)
  }

  for (let i = 0; i < Math.min(fadeSamplesOut, totalSamples); i++) {
    const idx = totalSamples - 1 - i
    const gain = i / fadeSamplesOut
    const sample = result.readInt16LE(idx * 2)
    result.writeInt16LE(Math.round(sample * gain), idx * 2)
  }

  return result
}

/** 写入 AU Cue 标记到 WAV */
function addCueMarkers(wavBuffer: Buffer, markers: Array<{ label: string; positionMs: number }>, sampleRate: number): Buffer {
  if (markers.length === 0) return wavBuffer

  const cueChunks: Buffer[] = []
  for (let i = 0; i < markers.length; i++) {
    const samplePos = Math.floor(markers[i].positionMs / 1000 * sampleRate)
    // cue chunk: ID(4) + size(4) + data
    const cueData = Buffer.alloc(24)
    cueData.writeUInt32LE(i + 1, 0)           // cue ID
    cueData.writeUInt32LE(samplePos, 4)        // sample position
    cueData.write('data', 8)                   // data chunk ID
    cueData.writeUInt32LE(0, 12)               // chunk start
    cueData.writeUInt32LE(0, 16)               // block start
    cueData.writeUInt32LE(samplePos, 20)       // sample offset
    cueChunks.push(cueData)
  }

  // Build cue chunk
  const cueChunkData = Buffer.concat(cueChunks)
  const cueChunk = Buffer.alloc(8 + cueChunkData.length)
  cueChunk.write('cue ', 0)
  cueChunk.writeUInt32LE(cueChunkData.length, 4)
  cueChunkData.copy(cueChunk, 8)

  // Build LIST/adtl chunk with labl subchunks
  const adtlParts: Buffer[] = []
  for (let i = 0; i < markers.length; i++) {
    const label = markers[i].label
    const labelBytes = Buffer.from(label, 'utf-8')
    const lablData = Buffer.alloc(4 + labelBytes.length + 1) // ID + label + null terminator
    lablData.writeUInt32LE(i + 1, 0)
    labelBytes.copy(lablData, 4)
    lablData.writeUInt8(0, 4 + labelBytes.length)

    const lablChunk = Buffer.alloc(8 + lablData.length)
    lablChunk.write('labl', 0)
    lablChunk.writeUInt32LE(lablData.length, 4)
    lablData.copy(lablChunk, 8)
    adtlParts.push(lablChunk)
  }

  const adtlData = Buffer.concat([Buffer.from('adtl'), ...adtlParts])
  const listChunk = Buffer.alloc(8 + adtlData.length)
  listChunk.write('LIST', 0)
  listChunk.writeUInt32LE(adtlData.length, 4)
  adtlData.copy(listChunk, 8)

  // Append to WAV (after data chunk)
  const result = Buffer.concat([wavBuffer, cueChunk, listChunk])
  // Update RIFF size
  result.writeUInt32LE(result.length - 8, 4)

  return result
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const body = await request.json()
    const { segments, silenceMs = 800, fadeMs = 80, markers = [], book, episode, cv } = body

    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      return NextResponse.json({ error: 'segments array is required' }, { status: 400 })
    }

    const SAMPLE_RATE = 24000
    const BITS_PER_SAMPLE = 16

    // 解码所有段，提取裸 PCM
    const rawChunks: Buffer[] = []
    for (const seg of segments) {
      if (!seg.audioBase64) continue
      const buf = Buffer.from(seg.audioBase64, 'base64')
      const raw = extractRawPCM(buf)
      // 淡入淡出
      const faded = applyFade(raw, fadeMs, fadeMs, SAMPLE_RATE)
      rawChunks.push(faded)
    }

    if (rawChunks.length === 0) {
      return NextResponse.json({ error: '没有可拼接的音频数据' }, { status: 400 })
    }

    // 拼接：段 + 静音
    const silence = generateSilence(silenceMs, SAMPLE_RATE)
    const chunksWithPause: Buffer[] = []
    for (let i = 0; i < rawChunks.length; i++) {
      if (i > 0) chunksWithPause.push(silence)
      chunksWithPause.push(rawChunks[i])
    }

    const mergedRaw = Buffer.concat(chunksWithPause)
    const wavHeader = createWavHeader(mergedRaw.length, SAMPLE_RATE, 1, BITS_PER_SAMPLE)
    let wavBuffer: Buffer = Buffer.concat([wavHeader, mergedRaw])

    // 写入 AU 标记
    if (markers.length > 0) {
      wavBuffer = addCueMarkers(wavBuffer, markers, SAMPLE_RATE) as Buffer
    }

    const totalDuration = mergedRaw.length / (SAMPLE_RATE * (BITS_PER_SAMPLE / 8))

    const outputFilename = book && episode
      ? `${book}-${episode}${cv ? `-${cv}` : ''}-旁白-编排版.wav`
      : 'arranged-output.wav'

    return NextResponse.json({
      success: true,
      audio: wavBuffer.toString('base64'),
      duration: totalDuration,
      format: 'wav',
      filename: outputFilename,
      segments: rawChunks.length,
      markers: markers.length,
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[Arrange Concatenate] Error:', errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
