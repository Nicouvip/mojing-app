import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/audiobook/merge
 * 合并多段 base64 音频为单个 WAV 文件
 *
 * Body: {
 *   segments: Array<{ audioBase64: string; duration?: number }>
 *   format?: 'wav' | 'mp3'
 * }
 *
 * 说明：
 * - 每段音频来自 MiMo TTS，格式为 24kHz/16-bit/mono PCM
 * - 合并后输出带正确 WAV 头的完整文件
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
  writeU32(16, 16) // chunk size
  writeU16(20, 1)  // PCM format
  writeU16(22, numChannels)
  writeU32(24, sampleRate)
  writeU32(28, sampleRate * numChannels * bitsPerSample / 8) // byte rate
  writeU16(32, numChannels * bitsPerSample / 8) // block align
  writeU16(34, bitsPerSample)
  writeStr(36, 'data')
  writeU32(40, dataLength)

  return buffer
}

/** 解析 base64 音频数据：如果是 WAV 格式（有 RIFF 头），去掉头取裸数据 */
function extractRawPCM(buffer: Buffer): Buffer {
  if (buffer.length >= 44 && buffer.toString('ascii', 0, 4) === 'RIFF') {
    // 有 WAV 头 → 从 data chunk 获取裸数据
    // 标准 WAV 头 44 字节后就是 data
    return buffer.subarray(44)
  }
  return buffer // 已经是裸 PCM
}

/** 估算音频时长（基于 24kHz 16-bit mono） */
function estimatePCMDuration(buffer: Buffer): number {
  return buffer.length / (24000 * 2)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { segments, format } = body

    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      return NextResponse.json({ error: 'segments array is required' }, { status: 400 })
    }

    if (segments.length === 1) {
      // 只有一段，直接返回
      return NextResponse.json({
        success: true,
        audio: segments[0].audioBase64,
        duration: segments[0].duration || 0,
        format: 'wav',
        mergedSegments: 1,
      })
    }

    const SAMPLE_RATE = 24000
    const BITS_PER_SAMPLE = 16
    const NUM_CHANNELS = 1

    // 解码所有段，提取裸 PCM 数据
    const rawChunks: Buffer[] = []
    let totalSamples = 0

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]
      if (!seg.audioBase64) continue

      try {
        const buf = Buffer.from(seg.audioBase64, 'base64')
        const raw = extractRawPCM(buf)
        rawChunks.push(raw)
        totalSamples += raw.length / (BITS_PER_SAMPLE / 8)
      } catch (err) {
        console.warn(`[Merge] 跳过第 ${i + 1} 段（解码失败）:`, err)
      }
    }

    if (rawChunks.length === 0) {
      return NextResponse.json({ error: '没有可合并的音频数据' }, { status: 400 })
    }

    // 生成静音片段（指定秒数）
    const generateSilence = (sec: number) => Buffer.alloc(Math.floor(sec * SAMPLE_RATE * (BITS_PER_SAMPLE / 8)), 0)

    // 判断两段之间是否需要插入停顿
    // 在片段间插入静音
    const chunksWithPause: Buffer[] = []
    for (let i = 0; i < rawChunks.length; i++) {
      if (i > 0) {
        // 判断角色切换 vs 同角色继续
        const prevSeg = segments[i - 1]
        const currSeg = segments[i]
        const isDifferentSpeaker = prevSeg?.characterName && currSeg?.characterName && prevSeg.characterName !== currSeg.characterName
        chunksWithPause.push(isDifferentSpeaker ? generateSilence(0.5) : generateSilence(0.25))
      }
      chunksWithPause.push(rawChunks[i])
    }

    // 合并裸 PCM 数据
    const rawDataLength = chunksWithPause.reduce((sum, c) => sum + c.length, 0)
    const mergedRaw = Buffer.concat(chunksWithPause, rawDataLength)

    // 添加 WAV 头
    const wavHeader = createWavHeader(rawDataLength, SAMPLE_RATE, NUM_CHANNELS, BITS_PER_SAMPLE)
    const wavBuffer = Buffer.concat([wavHeader, mergedRaw], 44 + rawDataLength)

    // 估算总时长
    const totalDuration = estimatePCMDuration(mergedRaw)

    // 如果请求 M4B/MP3 格式，用 ffmpeg 转码
    if (format === 'm4b' || format === 'mp3') {
      try {
        const { execSync } = await import('child_process')
        const { writeFileSync, unlinkSync, readFileSync } = await import('fs')
        const { tmpdir } = await import('os')
        const { join } = await import('path')
        const tmpDir = tmpdir()
        const wavPath = join(tmpDir, `merge_${Date.now()}.wav`)
        const outExt = format === 'm4b' ? 'm4b' : 'mp3'
        const outPath = join(tmpDir, `merge_${Date.now()}.${outExt}`)

        writeFileSync(wavPath, wavBuffer)

        // ffmpeg 转码
        const codecArgs = format === 'm4b'
          ? ['-c:a', 'aac', '-b:a', '128k', '-f', 'ipod']
          : ['-c:a', 'libmp3lame', '-b:a', '128k']

        execSync(`ffmpeg -y -i "${wavPath}" ${codecArgs.join(' ')} "${outPath}"`, { stdio: 'pipe', timeout: 30000 })

        const convertedBuf = readFileSync(outPath)

        // Clean up
        try { unlinkSync(wavPath); unlinkSync(outPath) } catch {}

        return NextResponse.json({
          success: true,
          audio: convertedBuf.toString('base64'),
          duration: totalDuration,
          format: outExt,
          mergedSegments: rawChunks.length,
          totalSegments: segments.length,
        })
      } catch (convErr) {
        console.error('M4B/MP3 conversion failed:', convErr)
      }
    }

    // 如果请求 M4B/MP3 格式，用 ffmpeg 转码
    if (format === 'm4b' || format === 'mp3') {
      try {
        const { execSync } = await import('child_process')
        const { writeFileSync, unlinkSync, readFileSync } = await import('fs')
        const { tmpdir } = await import('os')
        const { join } = await import('path')
        const tmpDir = tmpdir()
        const wavPath = join(tmpDir, `merge_${Date.now()}.wav`)
        const outExt = format === 'm4b' ? 'm4b' : 'mp3'
        const outPath = join(tmpDir, `merge_${Date.now()}.${outExt}`)

        writeFileSync(wavPath, wavBuffer)

        // ffmpeg 转码
        const codecArgs = format === 'm4b'
          ? ['-c:a', 'aac', '-b:a', '128k', '-f', 'ipod']
          : ['-c:a', 'libmp3lame', '-b:a', '128k']

        execSync(`ffmpeg -y -i "${wavPath}" ${codecArgs.join(' ')} "${outPath}"`, { stdio: 'pipe', timeout: 30000 })

        const convertedBuf = readFileSync(outPath)

        // Clean up
        try { unlinkSync(wavPath); unlinkSync(outPath) } catch {}

        return NextResponse.json({
          success: true,
          audio: convertedBuf.toString('base64'),
          duration: totalDuration,
          format: outExt,
          mergedSegments: rawChunks.length,
          totalSegments: segments.length,
        })
      } catch (convErr) {
        console.error('M4B/MP3 conversion failed:', convErr)
      }
    }

    return NextResponse.json({
      success: true,
      audio: wavBuffer.toString('base64'),
      duration: totalDuration,
      format: 'wav',
      mergedSegments: rawChunks.length,
      totalSegments: segments.length,
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[Merge API] Error:', errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
