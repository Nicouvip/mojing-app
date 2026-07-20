'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) { setError('两次密码不一致'); return }
    if (password.length < 6) { setError('密码至少 6 位'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '注册失败'); return }

      router.push('/login?registered=1')
    } catch {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* 左侧品牌区 — 暖金色渐变，与首页一致 */}
      <div className="hidden md:flex w-[480px] items-center justify-center flex-col gap-6 p-12 relative overflow-hidden"
        style={{ background: 'radial-gradient(ellipse 70% 60% at 25% 45%, rgba(196,149,106,0.35) 0%, rgba(196,149,106,0.12) 35%, transparent 70%), linear-gradient(160deg, #c4956a 0%, #d4a878 25%, #e0c4a0 50%, #ede0d0 80%, #f5f0e8 100%)' }}>
        <Image src="/assets/brand/mojing-logo-main.png" alt="墨境" width={200} height={100} priority className="drop-shadow-lg" />
        <Image src="/assets/brand/mojing-happy.png" alt="小墨团开心" width={130} height={130} />
        <p className="text-sm text-center max-w-xs" style={{ color: 'rgba(80,60,40,0.85)' }}>开始你的创作之旅</p>
      </div>

      {/* 右侧表单 */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm space-y-6">
          <div className="md:hidden text-center">
            <Image src="/assets/brand/mojing-logo-nav.png" alt="墨境" width={160} height={36} className="mx-auto mb-4" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-foreground">注册</h1>
            <p className="text-sm text-muted-foreground mt-1">创建墨境账号，开始写作</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="至少 6 位"
                className="w-full mt-1 h-10 px-3 text-sm rounded-lg border border-border bg-background outline-none focus:border-primary transition-colors"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">确认密码</label>
              <input
                type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="再次输入密码"
                className="w-full mt-1 h-10 px-3 text-sm rounded-lg border border-border bg-background outline-none focus:border-primary transition-colors"
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="submit" disabled={loading}
              className="w-full h-10 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? '注册中...' : '注册'}
            </button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            已有账号？{' '}
            <Link href="/login" className="text-primary hover:underline">登录</Link>
          </div>

          <div className="text-center">
            <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">← 返回首页</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
