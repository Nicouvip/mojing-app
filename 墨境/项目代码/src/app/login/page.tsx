'use client'

import { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

import { signIn } from 'next-auth/react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showRegistered, setShowRegistered] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (searchParams.get('registered') === '1') {
      setShowRegistered(true)
      // 5 秒后自动消失
      const timer = setTimeout(() => setShowRegistered(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })
      if (result?.error) {
        setError(result.error === 'CredentialsSignin' ? '邮箱或密码错误' : result.error)
        return
      }
      // 同步用户信息到 localStorage（供 auth-context / 导航栏使用）
      try {
        const sessionRes = await fetch('/api/auth/session')
        const session = await sessionRes.json()
        if (session?.user?.email) {
          localStorage.setItem('mojing_auth', JSON.stringify({
            user: { id: session.user.id || session.user.email, name: session.user.name || session.user.email.split('@')[0], email: session.user.email },
            token: 'nextauth-session',
          }))
        }
      } catch {}
      router.push('/desk')
    } catch {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* 左侧品牌区 — 暖金色渐变 */}
      <div className="hidden md:flex w-[480px] items-center justify-center flex-col gap-6 p-12 relative overflow-hidden" style={{ background: 'radial-gradient(ellipse 70% 60% at 25% 45%, rgba(196,149,106,0.35) 0%, rgba(196,149,106,0.12) 35%, transparent 70%), linear-gradient(160deg, #c4956a 0%, #d4a878 25%, #e0c4a0 50%, #ede0d0 80%, #f5f0e8 100%)' }}>
        {/* 暖金色光晕装饰 */}
        <div className="absolute top-1/4 -left-12 w-48 h-48 rounded-full" style={{ background: 'radial-gradient(circle, rgba(196,149,106,0.20) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="absolute bottom-1/3 -right-8 w-36 h-36 rounded-full" style={{ background: 'radial-gradient(circle, rgba(212,168,120,0.15) 0%, transparent 70%)', filter: 'blur(30px)' }} />
        <Image src="/assets/brand/mojing-logo-main.png" alt="墨境" width={200} height={100} priority />
        <Image src="/assets/brand/mojing-wave.png" alt="小墨团挥手" width={140} height={140} className="mt-2" />
        <p className="text-muted-foreground text-sm text-center max-w-xs" style={{ color: 'rgba(80,60,40,0.85)' }}>欢迎回来</p>
      </div>

      {/* 右侧表单卡片 — 暖金色玻璃态 */}
      <div className="flex-1 flex items-center justify-center p-8" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(196,149,106,0.10) 0%, rgba(196,149,106,0.04) 40%, transparent 70%), linear-gradient(180deg, rgba(245,242,237,0.5) 0%, rgba(245,242,237,1) 100%)' }}>
        <div className="w-full max-w-sm p-8 space-y-6 rounded-[20px]" style={{ background: 'linear-gradient(145deg, rgba(196,149,106,0.20) 0%, rgba(196,149,106,0.08) 100%)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(196,149,106,0.25)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 8px 40px rgba(196,149,106,0.18), 0 0 80px rgba(196,149,106,0.06)' }}>
          {/* 移动端 Logo */}
          <div className="md:hidden text-center">
            <Image src="/assets/brand/mojing-logo-nav.png" alt="墨境" width={160} height={36} className="mx-auto mb-4" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-foreground">登录</h1>
            <p className="text-sm text-muted-foreground mt-1">欢迎回到墨境</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {showRegistered && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20 text-success text-sm">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 10l3 3 7-7" /></svg>
                注册成功！请使用新账号登录
              </div>
            )}
            <button
              type="button"
              onClick={() => signIn('google', { callbackUrl: '/desk' })}
              className="w-full h-10 rounded-lg border border-border bg-white hover:bg-secondary transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google 登录
            </button>
            <div className="flex items-center gap-3">
              <span className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">或</span>
              <span className="flex-1 h-px bg-border" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">邮箱</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full mt-1 h-10 px-3 text-sm rounded-lg border border-border bg-background outline-none focus:border-primary transition-colors"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">密码</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full mt-1 h-10 px-3 text-sm rounded-lg border border-border bg-background outline-none focus:border-primary transition-colors"
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="submit" disabled={loading}
              className="w-full h-10 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            还没有账号？{' '}
            <Link href="/register" className="text-primary hover:underline">注册</Link>
          </div>

          <div className="text-center">
            <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">← 返回首页</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted-foreground">加载中...</div>}>
      <LoginForm />
    </Suspense>
  )
}
