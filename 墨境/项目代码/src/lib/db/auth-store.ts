/**
 * Supabase Auth 适配层 —— 替代原内存用户存储
 *
 * 对外保持相同函数签名，内部调用 Supabase Auth Admin API（需要 SUPABASE_SERVICE_ROLE_KEY）
 * verifyPassword 使用 getSupabase()（anon key）的 signInWithPassword
 *
 * 当 Supabase 不可用（环境变量为 placeholder）时，自动降级到内存 Map + localStorage 双写，
 * 确保本地开发环境可以正常运行登录/注册流程。
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

// ── 本地降级存储（内存 Map + localStorage 双写） ──────────────────────

const LOCAL_KEY = 'mojing-auth-users'
const SALT_ROUNDS = 10

/** 内存 Map — 供服务端（API route / NextAuth）使用 */
const memUsers = new Map<string, UserRecord>()

function isSupabaseAvailable(): boolean {
  return getSupabase() !== null
}

function loadLocalUsers(): UserRecord[] {
  // 先尝试从内存加载
  const mem = Array.from(memUsers.values())
  if (mem.length > 0) return mem

  // 再尝试从 localStorage 加载（仅客户端）
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(LOCAL_KEY)
      if (raw) {
        const users = JSON.parse(raw) as UserRecord[]
        // 同步回内存
        for (const u of users) memUsers.set(u.email, u)
        return users
      }
    }
  } catch { /* ignore */ }
  return []
}

function saveLocalUsers(users: UserRecord[]) {
  // 内存 Map — 服务端和客户端都要写
  for (const u of users) memUsers.set(u.email, u)
  // localStorage — 仅客户端
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(users))
    }
  } catch { /* ignore */ }
}

// ── 对外 API ──────────────────────────────────────────────────────

/** 通过 Supabase Auth signInWithPassword 校验凭证 */
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

  // Supabase 不可用 → 本地降级
  const users = loadLocalUsers()
  const user = users.find(u => u.email === email)
  if (!user) return null
  if (user.banned) return null

  const ok = bcrypt.compareSync(password, user.passwordHash)
  if (!ok) return null

  return { ...user, passwordHash: '' }
}

/** 通过 Supabase Auth Admin API 创建用户 */
export async function createUser(email: string, password: string, name?: string): Promise<UserRecord> {
  const admin = getAdminSupabase()
  if (admin) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: name || email.split('@')[0] },
    })
    if (error) throw error
    return {
      id: data.user.id,
      email: data.user.email!,
      name: data.user.user_metadata?.name ?? email.split('@')[0],
      passwordHash: '',
      createdAt: new Date(data.user.created_at).getTime(),
      banned: false,
    }
  }

  // Supabase 不可用 → 本地降级
  const users = loadLocalUsers()
  if (users.some(u => u.email === email)) {
    throw new Error('该邮箱已注册')
  }

  const hash = bcrypt.hashSync(password, SALT_ROUNDS)
  const record: UserRecord = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    email,
    name: name || email.split('@')[0],
    passwordHash: hash,
    createdAt: Date.now(),
    banned: false,
  }
  users.push(record)
  saveLocalUsers(users)
  return { ...record, passwordHash: '' }
}

/** 检查邮箱是否已注册 */
export async function userExists(email: string): Promise<boolean> {
  const admin = getAdminSupabase()
  if (admin) {
    try {
      const { data } = await admin.auth.admin.listUsers()
      return data.users.some(u => u.email === email)
    } catch {
      return false
    }
  }

  // 本地降级
  const users = loadLocalUsers()
  return users.some(u => u.email === email)
}

/** 获取所有用户（不含密码哈希） */
export async function getAllUsers(): Promise<Omit<UserRecord, 'passwordHash'>[]> {
  const admin = getAdminSupabase()
  if (admin) {
    const { data } = await admin.auth.admin.listUsers()
    return data.users.map(u => ({
      id: u.id,
      email: u.email!,
      name: u.user_metadata?.name ?? u.email!.split('@')[0],
      createdAt: new Date(u.created_at).getTime(),
      banned: !!u.banned_until,
    }))
  }

  // 本地降级
  const users = loadLocalUsers()
  return users.map(({ passwordHash: _, ...rest }) => rest)
}

/** 设置用户禁用/启用（通过 ban_duration） */
export async function setUserBanned(email: string, banned: boolean): Promise<boolean> {
  const admin = getAdminSupabase()
  if (admin) {
    try {
      const { data: list } = await admin.auth.admin.listUsers()
      const user = list.users.find(u => u.email === email)
      if (!user) return false
      await admin.auth.admin.updateUserById(user.id, {
        ban_duration: banned ? '876000h' : '0h',
      })
      return true
    } catch {
      return false
    }
  }

  // 本地降级
  const users = loadLocalUsers()
  const idx = users.findIndex(u => u.email === email)
  if (idx === -1) return false
  users[idx].banned = banned
  saveLocalUsers(users)
  return true
}
