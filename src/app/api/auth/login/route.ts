import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/db/supabase'

export async function POST(req: Request) {
  try {
    const { email, password }: { email: string; password: string } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: '邮箱和密码不能为空' }, { status: 400 })
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ error: '认证服务不可用' }, { status: 503 })
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 })
    }

    const { session, user } = data

    return NextResponse.json({
      success: true,
      token: session?.access_token ?? '',
      user: { id: user.id, email: user.email!, name: user.user_metadata?.name ?? email.split('@')[0], createdAt: new Date(user.created_at).getTime() },
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '未知错误' }, { status: 500 })
  }
}
