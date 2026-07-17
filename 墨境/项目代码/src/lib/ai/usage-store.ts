// ============================================================
// AI 使用量存储（共享模块）
// Vercel Serverless 文件系统只读，写入会静默失败降级为内存计数
// 本地开发正常读写 JSON 文件
// ============================================================

import path from 'path'
import fs from 'fs'
import fsp from 'fs/promises'

/** 是否运行在只读环境（Vercel 等） */
function isReadOnlyEnv(): boolean {
  // Vercel Serverless 读写 /tmp 以外的路径都会失败
  try {
    const testPath = path.join(process.cwd(), '.mojing_write_test')
    fs.writeFileSync(testPath, '1', 'utf8')
    fs.unlinkSync(testPath)
    return false
  } catch {
    return true
  }
}

let _readOnly: boolean | null = null
function readOnly(): boolean {
  if (_readOnly === null) _readOnly = isReadOnlyEnv()
  return _readOnly
}

// 内存降级缓存（Vercel 环境仅本次冷启动有效）
let memUsage: Record<string, number> = {}

/** 使用量文件路径 */
export function getUsageFilePath(): string {
  return path.join(process.cwd(), '.mojing_ai_usage.json')
}

/** 读取使用量（文件优先，Vercel 环境降级为空） */
async function readUsage(): Promise<Record<string, number>> {
  if (readOnly()) return memUsage
  const filePath = getUsageFilePath()
  try {
    const raw = await fsp.readFile(filePath, 'utf8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

/** 原子递增使用量 */
export async function incrementUsage(type: 'deep-check' | 'chat'): Promise<void> {
  const data = await readUsage()
  data[type] = (data[type] || 0) + 1

  if (readOnly()) {
    memUsage = data
    console.warn(`[usage-store] Vercel只读环境，使用量仅存于内存: ${type}=${data[type]}`)
    return
  }

  const filePath = getUsageFilePath()
  try {
    const tmpPath = filePath + '.tmp'
    await fsp.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf8')
    await fsp.rename(tmpPath, filePath)
  } catch (err) {
    console.warn('[usage-store] 写入失败:', err)
  }
}

/** 同步读取使用量 */
export function readUsageSync(): Record<string, number> {
  if (readOnly()) return memUsage
  const filePath = getUsageFilePath()
  if (!fs.existsSync(filePath)) return {}
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return {}
  }
}

/** 获取用户本月AI调用次数（以邮箱为key） */
export function getUserAiUsage(email: string): number {
  const all = readUsageSync()
  const key = `user_${email}`
  return all[key] || 0
}

/** 检查用户是否超过AI调用限额 */
export function checkAiQuota(email: string, plan: 'free' | 'pro' | 'admin'): { allowed: boolean; used: number; limit: number } {
  const used = getUserAiUsage(email)
  // free=100次/月, pro/admin=无限
  const limit = plan === 'free' ? 100 : Infinity
  return { allowed: used < limit, used, limit }
}

/** 原子递增用户级使用量（邮箱粒度） */
export async function incrementUserUsage(email: string): Promise<void> {
  const data = await readUsage()
  const key = `user_${email}`
  data[key] = (data[key] || 0) + 1

  if (readOnly()) {
    memUsage = data
    return
  }

  const filePath = getUsageFilePath()
  try {
    const tmpPath = filePath + '.tmp'
    await fsp.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf8')
    await fsp.rename(tmpPath, filePath)
  } catch (err) {
    console.warn('[usage-store] 写入失败:', err)
  }
}
