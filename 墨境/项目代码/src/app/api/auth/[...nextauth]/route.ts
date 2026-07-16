import { handlers } from '@/auth'
import { readUsersFromFile, writeUsersToFile } from '@/lib/db/auth-store-server'
import { loadUsersIntoMemory, exportUsersFromMemory } from '@/lib/db/auth-store'

// 从磁盘加载用户数据（每次请求前）
function ensureUsersLoaded() {
  try {
    const users = readUsersFromFile()
    if (users.length > 0) loadUsersIntoMemory(users)
  } catch { /* ignore */ }
}

// 登录成功后同步到磁盘
function syncUsersToDisk() {
  try { writeUsersToFile(exportUsersFromMemory()) } catch { /* ignore */ }
}

// 包装 NextAuth handlers：请求前加载、POST 后同步
const origPOST = handlers.POST
handlers.POST = async (request: Request) => {
  ensureUsersLoaded()
  const response = await origPOST(request)
  syncUsersToDisk()
  return response
}

const origGET = handlers.GET
handlers.GET = async (request: Request) => {
  ensureUsersLoaded()
  return origGET(request)
}

export const { GET, POST } = handlers
