// 服务端内存用户存储（重启即丢）
// 生产环境必须替换为 Supabase Auth 或数据库

import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

interface UserRecord {
  id: string
  email: string
  name: string
  /** bcrypt 哈希后的密码 */
  passwordHash: string
  createdAt: number
  /** 是否被管理员禁用 */
  banned: boolean
}

const users: UserRecord[] = []

// 初始化一个管理员默认用户
const ADMIN_EMAIL = 'admin@mojing.app'
const DEMO_USERS: { email: string; name: string; password: string }[] = [
  { email: ADMIN_EMAIL, name: '管理员', password: 'admin123' },
  { email: 'zhangsan@test.com', name: '张三', password: '123456' },
  { email: 'lisi@test.com', name: '李四', password: '123456' },
  { email: 'wangwu@test.com', name: '王五', password: '123456' },
  { email: 'zhaoliu@test.com', name: '赵六', password: '123456' },
]

// 异步初始化种子用户
;(async () => {
  for (const du of DEMO_USERS) {
    if (!(await userExists(du.email))) {
      await createUser(du.email, du.password, du.name)
    }
  }
})()

export async function findUser(email: string): Promise<UserRecord | undefined> {
  return users.find(u => u.email === email)
}

export async function createUser(email: string, password: string, name?: string): Promise<UserRecord> {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  const user: UserRecord = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    email,
    name: name || email.split('@')[0],
    passwordHash,
    createdAt: Date.now(),
    banned: false,
  }
  users.push(user)
  return user
}

export async function userExists(email: string): Promise<boolean> {
  return users.some(u => u.email === email)
}

/** 获取所有用户（不含密码哈希），供后台使用 */
export function getAllUsers(): Omit<UserRecord, 'passwordHash'>[] {
  return users.map(({ passwordHash, ...rest }) => rest)
}

/** 设置用户禁用/启用状态 */
export async function setUserBanned(email: string, banned: boolean): Promise<boolean> {
  const user = users.find(u => u.email === email)
  if (!user) return false
  user.banned = banned
  return true
}

export async function verifyPassword(email: string, password: string): Promise<UserRecord | null> {
  const user = users.find(u => u.email === email)
  if (!user) return null
  const ok = await bcrypt.compare(password, user.passwordHash)
  return ok ? user : null
}
