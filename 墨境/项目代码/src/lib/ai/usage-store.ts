// ============================================================
// AI 使用量存储（共享模块）
// 路径常量和读写逻辑统一管理，避免两个 route 文件各自硬编码
// ============================================================

import path from 'path'
import fs from 'fs'
import fsp from 'fs/promises'

/** 使用量文件路径 */
export function getUsageFilePath(): string {
  return path.join(process.cwd(), '.mojing_ai_usage.json')
}

/** 原子递增使用量 */
export async function incrementUsage(type: 'deep-check' | 'chat'): Promise<void> {
  const filePath = getUsageFilePath()
  let data: Record<string, number> = {}
  try {
    const raw = await fsp.readFile(filePath, 'utf8')
    data = JSON.parse(raw)
  } catch {
    // 文件不存在，从零开始
  }
  data[type] = (data[type] || 0) + 1

  // 原子写入：写临时文件 → rename
  const tmpPath = filePath + '.tmp'
  await fsp.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf8')
  await fsp.rename(tmpPath, filePath)
}

/** 同步读取使用量 */
export function readUsageSync(): Record<string, number> {
  const filePath = getUsageFilePath()
  if (!fs.existsSync(filePath)) return {}
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return {}
  }
}
