'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getProjects, getChapters } from '@/lib/db/store'
import type { Project } from '@/lib/db/types'
import { BookOpen, Crown, BarChart3, Settings, LogOut, User } from 'lucide-react'
import { cn } from '@/lib/utils/utils'

type Tab = 'works' | 'member' | 'usage' | 'settings'

export default function AccountPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ email: string; createdAt?: number } | null>(null)
  const [tab, setTab] = useState<Tab>('works')
  const [projects, setProjects] = useState<Project[]>([])
  const [totalWords, setTotalWords] = useState(0)

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('mojing_token') : null
    const savedUser = typeof window !== 'undefined' ? localStorage.getItem('mojing_user') : null

    if (!token) {
      router.push('/login')
      return
    }

    if (savedUser) {
      try { setUser(JSON.parse(savedUser)) } catch {}
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
    localStorage.removeItem('mojing_token')
    localStorage.removeItem('mojing_user')
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
                { name: '免费版', price: '0', features: ['基础 AI 续写', '1 个作品', '3 个章节'], current: true },
                { name: '创作者', price: '29/月', features: ['无限 AI 续写', '10 个作品', '素材库', '导出 TXT'], highlight: true },
                { name: '专业版', price: '79/月', features: ['全部 Pro 模型', '无限作品', '团队协作', '优先支持'] },
              ].map(plan => (
                <div key={plan.name}
                  className={cn(
                    "border rounded-xl p-5 text-center",
                    plan.highlight ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-card",
                    plan.current && "opacity-70"
                  )}
                >
                  <p className="text-sm font-semibold">{plan.name}</p>
                  <p className="text-2xl font-bold mt-2">¥{plan.price}</p>
                  <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                    {plan.features.map(f => <li key={f}>{f}</li>)}
                  </ul>
                  <button
                    disabled={plan.current}
                    className={cn(
                      "mt-4 w-full py-2 rounded-lg text-sm font-medium transition-colors",
                      plan.highlight ? "bg-primary text-white hover:bg-primary/90" : "border border-border text-muted-foreground hover:bg-secondary",
                      plan.current && "bg-secondary text-muted-foreground cursor-not-allowed"
                    )}
                  >
                    {plan.current ? '当前套餐' : '升级'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'usage' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">AI 用量统计</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground">本月调用</p>
                <p className="text-2xl font-bold mt-1">—</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground">本月 Token</p>
                <p className="text-2xl font-bold mt-1">—</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground">剩余额度</p>
                <p className="text-2xl font-bold mt-1">—</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground">成功率</p>
                <p className="text-2xl font-bold mt-1">—</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center">用量统计将在接入 AI 调用记录后启用</p>
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
