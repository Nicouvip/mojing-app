/**
 * 认证存储层（客户端安全）
 *
 * 注意：此文件通过 auth.ts → admin-auth.ts → navbar.tsx 被拉入客户端 bundle，
 * 因此不能 import 'server-only'、fs、path 等 Node.js 模块。
 *
 * 服务端文件持久化通过 auth-store-server.ts 在 API route 层单独处理。
 */

import { getSupabase, getAdminSupabase } from '@/lib/db/supabase'
import bcrypt from 'bcryptjs'

interface UserRecord {
  id: string
  email: string
  name: string
  passwordHash: string
  createdAt: number
  banned: boolean
}

const SALT_ROUNDS = 10

/** 内存 Map — 供服务端（API route / NextAuth）使用 */
const memUsers = new Map<string, UserRecord>()

// ── 对外 API ──────────────────────────────────────────────────────

export async function verifyPassword(email: string, password: string): Promise<UserRecord | null> {
  // 优先走 Supabase
  const supabase = getSupabase()
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) return null
    return {
      id: data.user.id,
      email: data.user.email ?? email,
      name: data.user.user_metadata?.name ?? email.split('@')[0],
      passwordHash: '',
      createdAt: new Date(data.user.created_at).getTime(),
      banned: !!data.user.banned_until,
    }
  }
  // 本地降级
  const user = memUsers.get(email)
  if (!user || user.banned) return null
  if (!bcrypt.compareSync(password, user.passwordHash)) return null
  return { ...user, passwordHash: '' }
}

export async function createUser(email: string, password: string, name?: string): Promise<UserRecord> {
  const admin = getAdminSupabase()
  if (admin) {
    const { data, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { name: name || email.split('@')[0] },
    })
    if (error) throw error
    return {
      id: data.user.id, email: data.user.email!,
      name: data.user.user_metadata?.name ?? email.split('@')[0],
      passwordHash: '', createdAt: new Date(data.user.created_at).getTime(), banned: false,
    }
  }
  if (memUsers.has(email)) throw new Error('该邮箱已注册')
  const hash = bcrypt.hashSync(password, SALT_ROUNDS)
  const record: UserRecord = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    email, name: name || email.split('@')[0], passwordHash: hash,
    createdAt: Date.now(), banned: false,
  }
  memUsers.set(email, record)
  return { ...record, passwordHash: '' }
}

export async function userExists(email: string): Promise<boolean> {
  const admin = getAdminSupabase()
  if (admin) {
    try {
      const { data } = await admin.auth.admin.listUsers()
      return data.users.some(u => u.email === email)
    } catch { return false }
  }
  return memUsers.has(email)
}

export async function getAllUsers(): Promise<Omit<UserRecord, 'passwordHash'>[]> {
  const admin = getAdminSupabase()
  if (admin) {
    const { data } = await admin.auth.admin.listUsers()
    return data.users.map(u => ({
      id: u.id, email: u.email!,
      name: u.user_metadata?.name ?? u.email!.split('@')[0],
      createdAt: new Date(u.created_at).getTime(), banned: !!u.banned_until,
    }))
  }
  return Array.from(memUsers.values()).map(({ passwordHash: _, ...rest }) => rest)
}

export async function setUserBanned(email: string, banned: boolean): Promise<boolean> {
  const admin = getAdminSupabase()
  if (admin) {
    try {
      const { data: list } = await admin.auth.admin.listUsers()
      const user = list.users.find(u => u.email === email)
      if (!user) return false
      await admin.auth.admin.updateUserById(user.id, { ban_duration: banned ? '876000h' : '0h' })
      return true
    } catch { return false }
  }
  const user = memUsers.get(email)
  if (!user) return false
  user.banned = banned
  return true
}

// ── 持久化接口（由 auth-store-server.ts 在 API route 层调用） ──────

export function loadUsersIntoMemory(users: UserRecord[]): void {
  for (const u of users) memUsers.set(u.email, u)
}

export function exportUsersFromMemory(): UserRecord[] {
  return Array.from(memUsers.values())
}
