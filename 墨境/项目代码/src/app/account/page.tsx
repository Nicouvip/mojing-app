'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getProjects, getChapters, getUserSubscription } from '@/lib/db/store'
import type { Project, UserSubscription } from '@/lib/db/types'
import { BookOpen, Crown, BarChart3, Settings, LogOut, User, Check } from 'lucide-react'
import { cn } from '@/lib/utils/utils'
import { toast } from 'sonner'

type Tab = 'works' | 'member' | 'usage' | 'settings'

function AccountContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<{ email: string; createdAt?: number } | null>(null)
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams?.get('tab')
    if (t === 'member' || t === 'usage' || t === 'settings') return t
    return 'works'
  })
  const [projects, setProjects] = useState<Project[]>([])
  const [totalWords, setTotalWords] = useState(0)
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('mojing_auth') : null

    if (!stored) {
      router.push('/login')
      return
    }

    try {
      const parsed = JSON.parse(stored)
      if (parsed.token) {
        setUser(parsed.user || null)
        const email = parsed.user?.email
        if (email) {
          const sub = getUserSubscription(email)
          if (sub) setSubscription(sub)
        }
      } else {
        router.push('/login')
        return
      }
    } catch {
      router.push('/login')
      return
    }

    const p = getProjects()
    setProjects(p)
    let w = 0
    p.forEach(proj => {
      w += getChapters(proj.id).reduce((s, c) => s + (c.wordCount || 0), 0)
    })
    setTotalWords(w)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('mojing_auth')
    router.push('/')
  }

  if (!user) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground text-sm">加载中...</p></div>

  const tabs: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'works', label: '我的作品', icon: BookOpen },
    { key: 'member', label: '会员套餐', icon: Crown },
    { key: 'usage', label: 'AI 用量', icon: BarChart3 },
    { key: 'settings', label: '设置', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* 顶栏 */}
      <header className="h-14 px-6 flex items-center justify-between border-b border-border bg-card/80">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/')} className="text-sm text-muted-foreground hover:text-foreground">← 返回</button>
          <h1 className="text-sm font-medium text-foreground">个人中心</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <User className="w-3 h-3" />{user.email}
          </span>
          <button onClick={handleLogout} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1">
            <LogOut className="w-3 h-3" />退出
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        {/* Tab 导航 */}
        <div className="flex gap-1 mb-8 border-b border-border">
          {tabs.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm transition-colors border-b-2 -mb-px",
                  tab === t.key
                    ? "border-primary text-primary font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Tab 内容 */}
        {tab === 'works' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground">作品数</p>
                <p className="text-2xl font-semibold mt-1">{projects.length}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground">总字数</p>
                <p className="text-2xl font-semibold mt-1">{totalWords.toLocaleString()}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground">注册时间</p>
                <p className="text-sm font-medium mt-1">
                  {user.createdAt ? new Date((user as { createdAt: number }).createdAt).toLocaleDateString('zh-CN') : '—'}
                </p>
              </div>
            </div>

            {projects.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground text-sm">案头尚无字，待君著新篇</p>
                <button onClick={() => router.push('/')} className="mt-4 text-sm text-primary hover:underline">← 返回首页创建作品</button>
              </div>
            ) : (
              <div className="space-y-2">
                {projects.map(p => (
                  <div key={p.id}
                    onClick={() => router.push(`/editor/${p.id}`)}
                    className="flex items-center justify-between px-4 py-3 rounded-xl bg-card border border-border hover:shadow-card transition-all cursor-pointer"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.genre} · {p.chapterCount} 章 · {p.totalWords.toLocaleString()} 字</p>
                    </div>
                    <span className="text-xs text-muted-foreground">编辑 →</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'member' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">会员套餐</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: '免费版', key: 'free', price: '0', features: ['基础 AI 续写', '1 个作品', '3 个章节'] },
                { name: '创作者', key: 'pro', price: '29/月', features: ['无限 AI 续写', '10 个作品', '素材库', '导出 TXT'], highlight: true },
                { name: '专业版', key: 'admin', price: '79/月', features: ['全部 Pro 模型', '无限作品', '团队协作', '优先支持'] },
              ].map(plan => {
                const isCurrent = subscription?.plan === plan.key
                return (
                <div key={plan.name}
                  className={cn(
                    "border rounded-xl p-5 text-center transition-all",
                    plan.highlight && !isCurrent ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-card",
                    isCurrent && "ring-2 ring-success/50"
                  )}
                >
                  {isCurrent && <span className="inline-block px-2 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-medium mb-2">当前套餐</span>}
                  <p className="text-sm font-semibold">{plan.name}</p>
                  <p className="text-2xl font-bold mt-2">¥{plan.price}</p>
                  <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                    {plan.features.map(f => <li key={f}>{f}</li>)}
                  </ul>
                  <button
                    disabled={isCurrent || !user?.email}
                    onClick={() => {
                      if (!user?.email) return
                      import('@/lib/db/store').then(({ setUserSubscription }) => {
                        setUserSubscription(user.email!, {
                          plan: plan.key as 'free' | 'pro' | 'admin',
                          startedAt: Date.now(),
                          monthlyAiQuota: plan.key === 'free' ? 100 : 999999,
                          monthlyAiUsed: 0,
                        })
                        setSubscription({
                          plan: plan.key as 'free' | 'pro' | 'admin',
                          startedAt: Date.now(),
                          monthlyAiQuota: plan.key === 'free' ? 100 : 999999,
                          monthlyAiUsed: 0,
                        })
                        toast.success(`已升级到 ${plan.name} 套餐`)
                      })
                    }}
                    className={cn(
                      "mt-4 w-full py-2 rounded-lg text-sm font-medium transition-colors",
                      plan.highlight && !isCurrent ? "bg-primary text-white hover:bg-primary/90" : "border border-border text-muted-foreground hover:bg-secondary",
                      isCurrent && "bg-secondary text-muted-foreground cursor-not-allowed"
                    )}
                  >
                    {isCurrent ? '当前套餐' : '升级'}
                  </button>
                </div>
              )})}
            </div>
          </div>
        )}

        {tab === 'usage' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">AI 用量统计</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground">本月调用</p>
                <p className="text-2xl font-bold mt-1">{subscription?.monthlyAiUsed ?? '—'}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground">本月限额</p>
                <p className="text-2xl font-bold mt-1">{subscription?.monthlyAiQuota === 999999 ? '∞' : subscription?.monthlyAiQuota ?? '—'}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground">当前套餐</p>
                <p className="text-2xl font-bold mt-1 capitalize">{subscription?.plan ?? '—'}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground">状态</p>
                <p className="text-2xl font-bold mt-1 text-success">{(subscription?.monthlyAiUsed ?? 0) < (subscription?.monthlyAiQuota ?? 0) ? '正常' : '已达限额'}</p>
              </div>
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="space-y-6 max-w-md">
            <h2 className="text-lg font-semibold">账户设置</h2>
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">邮箱</span>
                <span className="text-sm text-muted-foreground">{user.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">密码</span>
                <button className="text-sm text-primary hover:underline">修改</button>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">默认模型</span>
                <span className="text-sm text-muted-foreground">deepseek-v4-pro</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full py-2 rounded-lg border border-destructive/30 text-destructive text-sm hover:bg-destructive/5 transition-colors"
            >
              退出登录
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
export default function AccountPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">加载中...</div>}>
      <AccountContent />
    </Suspense>
  )
}