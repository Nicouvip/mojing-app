import { createClient, SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null
let adminClient: SupabaseClient | null = null

/** 判断 Supabase 是否可用（环境变量不为 placeholder 且非空） */
function isRealEnv(value: string | undefined): boolean {
  return !!value && !value.startsWith('placeholder') && value.length > 10
}

export function getSupabase(): SupabaseClient | null {
  if (client) return client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!isRealEnv(url) || !isRealEnv(key)) {
    return null
  }

  client = createClient(url!, key!)
  return client
}

/** 服务端管理客户端（需要 SUPABASE_SERVICE_ROLE_KEY），用于 Admin API 操作 */
export function getAdminSupabase(): SupabaseClient | null {
  if (adminClient) return adminClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!isRealEnv(url) || !isRealEnv(key)) {
    return null
  }

  adminClient = createClient(url!, key!, { auth: { autoRefreshToken: false, persistSession: false } })
  return adminClient
}
