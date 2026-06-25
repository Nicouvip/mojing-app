'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils/utils'
import { Button } from '@/components/ui/button'
import { getProjects } from '@/lib/db/store'
import type { Project } from '@/lib/db/types'
import { BookOpen, Sparkles, ShieldCheck, Library, ChevronRight, PenLine, Plus, ArrowRight, Circle, Flame, Clock, User, LayoutGrid } from 'lucide-react'

const COVER_COLORS = ['#6b8c6e', '#d4cfc4', '#e5e7eb']
const GENRE_MAP: Record<string, string> = {
  '都市': '#6b8c6e', '悬疑': '#6b8c6e', '玄幻': '#d4cfc4',
  '言情': '#e5e7eb', '科幻': '#6b8c6e', '仙侠': '#d4cfc4', '灵异': '#e5e7eb',
}

const RECENT_LIMIT = 3

import { loadPage } from '@/lib/page-builder/store'
import { PageRenderer } from '@/lib/page-builder/renderer'

export default function DashboardPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [tab, setTab] = useState<string>('overview')

  useEffect(() => { setProjects(getProjects()) }, [])

  const todayTarget = 2000
  const todayDone = 900
  const todayPercent = projects.length > 0 ? Math.round((todayDone / todayTarget) * 100) : 0
  const isDone = todayPercent >= 100
  const recentWorks = projects.slice(0, RECENT_LIMIT)

  const quickTools = [
    { icon: <PenLine className="h-5 w-5" />, title: '继续写作', desc: '进入编辑器', action: () => router.push('/editor') },
    { icon: <Plus className="h-5 w-5" />, title: '新建作品', desc: '从空白开始', action: () => router.push('/') },
    { icon: <Library className="h-5 w-5" />, title: '素材库', desc: '人设世界观', action: () => router.push('/library/characters') },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* ===== 顶栏 ===== */}
      <nav className="sticky top-0 z-50 h-14 px-6 flex items-center justify-between glass-panel border-b border-border">
        <div className="flex items-center gap-6">
          <Link href="/dashboard">
            <Image src="/assets/brand/mojing-logo-nav.png" alt="墨境" width={160} height={36} className="h-9 w-auto" priority />
          </Link>
          <div className="flex items-center gap-1 text-sm">
            <Link href="/dashboard" className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-medium">工作台</Link>
            <Link href="/tools" className="px-3 py-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">工具广场</Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/account" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <User className="w-4 h-4" />个人中心
          </Link>
        </div>
      </nav>

      {/* ===== 主体 ===== */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* 欢迎语 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">欢迎回来，继续你的创作</h1>
          <p className="text-muted-foreground">今天是你连续写作的第 12 天</p>
        </div>

        {/* Tab 栏 */}
        <div className="flex gap-1 mb-8 border-b border-border pb-0">
          {([
            { key: 'overview', label: '工作台总览' },
            { key: 'works', label: '我的作品' },
            { key: 'usage', label: '用量' },
            { key: 'settings', label: '设置' },
          ] as const).map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={cn("px-4 py-2.5 text-sm rounded-t-lg transition-colors -mb-[1px]",
                tab === key ? 'bg-card border border-border border-b-card text-foreground font-medium' : 'text-muted-foreground hover:text-foreground')}>
              {label}
            </button>
          ))}
        </div>

        {/* 工作台总览 Tab */}
        {tab === 'overview' && (<>

        {/* 今日目标 — 苔绿镂空圆形标记 */}
        {projects.length > 0 && (
          <div className="bg-card rounded-xl p-6 shadow-card mb-8 border border-border">
            <div className="flex items-center gap-4">
              {/* 苔绿镂空圆 ≤40px */}
              <svg width="40" height="40" viewBox="0 0 40 40" className="shrink-0">
                <circle cx="20" cy="20" r="17" fill="none" stroke="#6b8c6e" strokeWidth="2.5" />
                {isDone && <circle cx="20" cy="20" r="17" fill="none" stroke="#6b8c6e" strokeWidth="2.5" strokeDasharray={`${(todayPercent / 100) * 107} 107`} strokeLinecap="round" transform="rotate(-90 20 20)" />}
                {!isDone && <circle cx="20" cy="20" r="17" fill="none" stroke="#6b8c6e" strokeWidth="2.5" strokeDasharray={`${(todayPercent / 100) * 107} 107`} strokeLinecap="round" transform="rotate(-90 20 20)" />}
              </svg>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">今日目标：{todayTarget.toLocaleString()} 字</span>
                  {isDone && <span className="text-xs text-primary bg-primary-light px-2 py-0.5 rounded-full">已达成</span>}
                </div>
                <p className="text-2xl font-bold text-primary">{todayDone.toLocaleString()}<span className="text-sm text-muted-foreground font-normal"> / {todayTarget.toLocaleString()}</span></p>
              </div>
            </div>
          </div>
        )}

        {/* 无作品空状态 */}
        {projects.length === 0 && (
          <div className="text-center py-20 mb-8">
            <BookOpen className="w-16 h-16 mx-auto mb-6 text-primary/15" />
            <p className="text-xl font-medium text-foreground mb-2" style={{ fontFamily: "'Noto Serif SC', serif" }}>案头尚无字，待君著新篇</p>
            <p className="text-sm text-muted-foreground mb-6">创建你的第一部作品，开启沉浸式写作之旅</p>
            <Button size="lg" onClick={() => router.push('/')}><Plus className="w-5 h-5 mr-2" />开始创作</Button>
          </div>
        )}

        {/* 主体两栏布局 */}
        {projects.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* 左侧：最近作品 + 全部作品入口 */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">最近作品</h2>
                <Link href="/works" className="text-sm text-primary flex items-center gap-1">
                  全部作品 <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="space-y-3">
                {recentWorks.map((work, idx) => (
                  <div
                    key={work.id}
                    onClick={() => router.push(`/editor/${work.id}`)}
                    className="block bg-card rounded-xl shadow-card hover:-translate-y-0.5 transition-all duration-300 ease overflow-hidden border border-border cursor-pointer"
                    style={{ transition: 'transform 0.3s ease, box-shadow 0.3s ease' }}
                  >
                    <div className="flex">
                      {/* 封面色条（仅苔绿/米白/浅灰） */}
                      <div className="w-2 flex-shrink-0" style={{ backgroundColor: COVER_COLORS[idx % COVER_COLORS.length] }} />
                      <div className="flex-1 p-5 flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold mb-1">{work.name}</h3>
                          <p className="text-sm text-muted-foreground">{work.genre} · {work.chapterCount} 章</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-medium">{(work.totalWords || 0).toLocaleString()} 字</p>
                          <p className="text-xs text-muted-foreground">总字数</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 全部作品入口（当作品超过3个时） */}
              {projects.length > RECENT_LIMIT && (
                <Link href="/works"
                  className="mt-3 block text-center py-3 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                  <LayoutGrid className="w-4 h-4 inline mr-1" />查看全部 {projects.length} 部作品
                </Link>
              )}
            </div>

            {/* 右侧：最近素材 + 快捷入口 */}
            <div className="space-y-4">
              {/* 最近素材卡片 */}
              <div className="bg-card rounded-xl p-5 shadow-card border border-border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">最近素材</h3>
                  <Link href="/library/characters" className="text-xs text-primary hover:underline">查看全部</Link>
                </div>
                <p className="text-xs text-muted-foreground">素材库尚空，点滴灵感都可珍藏</p>
              </div>

              {/* 快捷入口 */}
              <h3 className="text-sm font-semibold text-muted-foreground pt-2">快捷入口</h3>
              <div className="space-y-2">
                {quickTools.map((tool, idx) => (
                  <button key={idx} onClick={tool.action}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:shadow-card hover:-translate-y-0.5 transition-all duration-300 ease text-left"
                    style={{ transition: 'transform 0.3s ease, box-shadow 0.3s ease' }}
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center text-primary">
                      {tool.icon}
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{tool.title}</h4>
                      <p className="text-xs text-muted-foreground">{tool.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 创作数据概览 */}
        {projects.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">本周创作数据</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card rounded-xl p-5 shadow-card border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-4 h-4 text-primary" />
                  <p className="text-sm text-muted-foreground">连续写作</p>
                </div>
                <p className="text-3xl font-bold text-primary">12 天</p>
              </div>
              <div className="bg-card rounded-xl p-5 shadow-card border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <p className="text-sm text-muted-foreground">本周总字数</p>
                </div>
                <p className="text-3xl font-bold">1.2 万</p>
              </div>
              <div className="bg-card rounded-xl p-5 shadow-card border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <p className="text-sm text-muted-foreground">平均时速</p>
                </div>
                <p className="text-3xl font-bold">1,860 字</p>
              </div>
            </div>
          </div>
        )}
        </>)}

        {/* 我的作品 Tab */}
        {tab === 'works' && (
          <div>
            {projects.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-primary/15" />
                <p className="text-muted-foreground" style={{ fontFamily: "'Noto Serif SC', serif" }}>案头尚无字，待君著新篇</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {projects.map(p => (
                  <div key={p.id} onClick={() => router.push(`/editor/${p.id}`)}
                    className="bg-card rounded-xl p-5 shadow-card border border-border cursor-pointer hover:-translate-y-0.5 transition-all duration-300 ease">
                    <div className="w-full h-1.5 rounded-full mb-3" style={{ backgroundColor: COVER_COLORS[0] }} />
                    <h3 className="font-semibold text-foreground truncate">{p.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{p.genre} · {p.chapterCount} 章 · {(p.totalWords || 0).toLocaleString()} 字</p>
                    <div className="mt-3 text-[11px] text-muted-foreground/60">
                      {new Date(p.updatedAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 用量 Tab */}
        {tab === 'usage' && (
          <div className="text-center py-16 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-4 text-primary/15" />
            <p className="font-medium text-foreground mb-1">AI 用量统计</p>
            <p className="text-sm">功能即将上线，敬请期待</p>
          </div>
        )}

        {/* 设置 Tab */}
        {tab === 'settings' && (
          <div className="max-w-md space-y-4">
            <div className="bg-card rounded-xl p-5 shadow-card border border-border">
              <h3 className="font-medium text-foreground mb-3">数据管理</h3>
              <p className="text-xs text-muted-foreground mb-4">作品保存在浏览器本地，清除缓存可能导致数据丢失。建议定期导出备份。</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  const data = JSON.stringify(projects, null, 2)
                  const blob = new Blob([data], { type: 'application/json' })
                  const a = document.createElement('a')
                  a.href = URL.createObjectURL(blob); a.download = 'mojing-backup.json'; a.click()
                }}>导出备份</Button>
                <Button variant="outline" size="sm" className="text-destructive border-destructive/40 hover:bg-destructive/10"
                  onClick={() => { if (confirm('确定清除所有本地数据？此操作不可恢复。')) { localStorage.clear(); window.location.reload() } }}>清除数据</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
