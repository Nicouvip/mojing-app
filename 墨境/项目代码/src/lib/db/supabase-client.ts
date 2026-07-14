/**
 * Supabase 客户端 — 统一入口
 *
 * 原本存在两个独立的客户端文件（supabase-client.ts 和 supabase.ts），
 * 现在统一为从 supabase.ts 导出，保持 supabase-client.ts 作为兼容层。
 *
 * 新代码推荐直接 from '@/lib/db/supabase'
 */
export { supabase, isSupabaseAvailable } from './supabase'
export { getSupabase, getAdminSupabase } from './supabase'
