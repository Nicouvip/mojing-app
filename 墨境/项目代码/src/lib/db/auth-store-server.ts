/**
 * 服务端用户文件持久化（JSON 文件）
 * 只在 API route / auth.ts 中使用，不被客户端引用
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

interface UserRecord {
  id: string
  email: string
  name: string
  passwordHash: string
  createdAt: number
  banned: boolean
}

const FILE_NAME = '.mojing-auth-users.json'

function getUserFilePath(): string {
  return join(process.cwd(), FILE_NAME)
}

export function readUsersFromFile(): UserRecord[] {
  try {
    const fp = getUserFilePath()
    if (!existsSync(fp)) return []
    return JSON.parse(readFileSync(fp, 'utf8')) as UserRecord[]
  } catch { return [] }
}

export function writeUsersToFile(users: UserRecord[]): void {
  try {
    writeFileSync(getUserFilePath(), JSON.stringify(users, null, 2), 'utf8')
  } catch (e) {
    console.error('[auth-store-server] 写文件失败:', e)
  }
}
