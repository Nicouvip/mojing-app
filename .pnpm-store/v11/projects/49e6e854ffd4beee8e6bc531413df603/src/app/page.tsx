'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { getProjects, createProject, deleteProject } from '@/lib/db/store'
import { cn } from '@/lib/utils/utils'
import { useTheme } from '@/lib/utils/theme-context'
import { useAuth } from '@/lib/db/auth-context'
import { loadPage } from '@/lib/page-builder/store'
import { PageRenderer } from '@/lib/page-builder/renderer'
import type { Project } from '@/lib/db/types'
import { Plus, BookOpen, Trash2, ArrowRight, PenLine, Sparkles, Shield, Route, Send, Star, Sun, Sunrise, Moon, Snowflake, Menu, X } from 'lucide-react'
import Navbar from '@/components/navbar'

export default function HomePage() {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newGenre, setNewGenre] = useState('都市')
  const [nameError, setNameError] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { theme, setTheme } = useTheme()
  const { isLoggedIn } = useAuth()
  const [showProjects, setShowProjects] = useState(false)

  const genreDesc: Record<string, string> = {
    '都市': '都市冷暖，人间百态', '悬疑': '迷雾重重，真相难寻', '玄幻': '逆天改命，踏破苍穹',
    '言情': '一世情缘，纸短情长', '科幻': '星辰大海，未来已来', '仙侠': '御剑乘风，问道长生', '灵异': '阴阳两界，善恶有报',
  }

  useEffect(() => { setProjects(getProjects()) }, [])

  const handleCreate = () => {
    if (!newName.trim()) { setNameError(true); return }
    const p = createProject(newName.trim(), newGenre)
    setProjects(getProjects())
    setShowNew(false); setNewName(''); setNameError(false)
    router.push(`/editor/${p.id}`)
  }

  const handleDelete = (id: string, name: string) => { if (confirm(`确定删除《${name}》？此操作不可恢复。`)) { setDeletingId(id); setTimeout(() => { deleteProject(id); setProjects(getProjects()); setDeletingId(null) }, 200) } }

  const customPage = null // loadPage('/') — 暂禁用，等编辑器完成再开启
  if (customPage) return <PageRenderer data={customPage} />

  return (
    <div className="min-h-screen bg-[#fafaf9] flex flex-col">
      {/* ===== 顶栏 ===== */}
      <nav className="sticky top-0 z-50 h-16 px-8 flex items-center justify-between glass-panel rounded-none">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-2.5">
            <Image src="/assets/brand/mojing-logo-nav.png" alt="墨境" width={160} height={36} className="h-9 w-auto" priority />
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            {isLoggedIn ? (<>
              <button onClick={() => setShowNew(true)} className="px-3 py-1.5 rounded-lg hover:bg-secondary hover:text-foreground transition-colors">工作台</button>
              <button onClick={() => router.push('/works')} className="px-3 py-1.5 rounded-lg hover:bg-secondary hover:text-foreground transition-colors">我的作品</button>
              <button onClick={() => router.push('/editor')} className="px-3 py-1.5 rounded-lg hover:bg-secondary hover:text-foreground transition-colors">编辑器</button>
              <button onClick={() => router.push('/library')} className="px-3 py-1.5 rounded-lg hover:bg-secondary hover:text-foreground transition-colors">素材库</button>
              <button onClick={() => router.push('/tools')} className="px-3 py-1.5 rounded-lg hover:bg-secondary hover:text-foreground transition-colors">工具广场</button>
            </>) : (<>
              <button onClick={() => router.push('/features')} className="px-3 py-1.5 rounded-lg hover:bg-secondary hover:text-foreground transition-colors">产品功能</button>
              <button onClick={() => router.push('/cases')} className="px-3 py-1.5 rounded-lg hover:bg-secondary hover:text-foreground transition-colors">写作案例</button>
              <button onClick={() => router.push('/templates')} className="px-3 py-1.5 rounded-lg hover:bg-secondary hover:text-foreground transition-colors">模板中心</button>
              <button onClick={() => router.push('/tools')} className="px-3 py-1.5 rounded-lg hover:bg-secondary hover:text-foreground transition-colors">创作工具</button>
            </>)}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* 移动端汉堡按钮 */}
          <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-secondary text-muted-foreground">
            <Menu className="w-5 h-5" />
          </button>
          {/* 桌面端导航 */}
          <div className="hidden lg:flex items-center gap-3">
          <div className="flex items-center gap-1 mr-2">
            {(['light','warm','dark','cool'] as const).map(k => (
              <button key={k} onClick={() => setTheme(k)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all duration-200 ${theme === k ? 'bg-primary text-white shadow-[0_0_12px_rgba(107,140,110,0.3)]' : 'text-muted-foreground/60 hover:bg-secondary'}`}>
                {k === 'light' ? <Sun className="w-3.5 h-3.5" /> : k === 'warm' ? <Sunrise className="w-3.5 h-3.5" /> : k === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Snowflake className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
          {isLoggedIn ? (
            <span onClick={() => router.push('/account')} className="text-sm text-muted-foreground/60 hover:text-muted-foreground cursor-pointer transition-colors">个人中心</span>
          ) : (
            <span onClick={() => router.push('/login')} className="text-sm text-muted-foreground/60 hover:text-muted-foreground cursor-pointer transition-colors">登录</span>
          )}
          <Button onClick={() => setShowNew(true)} className="h-12 px-8 text-base font-medium rounded-xl shadow-card hover:shadow-hover hover:-translate-y-0.5 transition-all duration-300">
            <Plus className="w-4 h-4 mr-1.5" />开始创作
          </Button>
          </div>
        </div>
      </nav>

      {/* ===== Hero ===== */}
      <section className="relative w-full min-h-[100dvh] overflow-hidden" style={{ backgroundColor: '#f0ece4' }}>
        {/* 背景图 — 单层渐变 mask 替代复合 mask，确保跨浏览器一致 */}
        <div className="absolute inset-0" style={{ 
          backgroundImage: 'url(/assets/brand/mojing-desk-clean-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',

        }} />
        {/* 底部渐变遮罩 — 替代多层级 mask 的底部淡出，兼容所有浏览器 */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'linear-gradient(to bottom, transparent 50%, rgba(240,236,228,1) 100%), linear-gradient(to right, rgba(240,236,228,1) 0%, rgba(240,236,228,0.96) 10%, rgba(240,236,228,0.88) 20%, rgba(240,236,228,0.7) 35%, rgba(240,236,228,0.45) 50%, rgba(240,236,228,0.2) 65%, rgba(240,236,228,0) 80%)',
        }} />

        {/* 文字浮层 */}
        <div className="relative z-10 min-h-screen flex flex-col justify-center px-6">
          <div className="max-w-7xl mx-auto w-full">
            <div className="max-w-2xl" style={{ padding: '2rem 2.5rem', background: 'radial-gradient(ellipse at 30% 50%, rgba(250,249,246,0.55) 0%, rgba(250,249,246,0.15) 60%, transparent 100%)', borderRadius: '0' }}>
              <h1 className="text-3xl lg:text-[48px] font-bold leading-[1.15] text-foreground tracking-tight mb-6" style={{ fontFamily: "'Noto Serif SC', 'Songti SC', serif", textShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                写小说，进入<br />心流模式
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed mb-8" style={{ fontFamily: "'Noto Serif SC', serif", textShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                沉浸式编辑、人设管理、AI 续写、灵感生成，为长篇创作而生。
              </p>
              <div className="flex items-center gap-3 mb-8">
                <Button onClick={() => setShowNew(true)} className="h-12 px-8 text-base font-medium rounded-xl shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300" style={{ backgroundColor: '#6b8c6e', boxShadow: '0 4px 16px rgba(107,140,110,0.3), 0 1px 3px rgba(0,0,0,0.08)' }}>
                  <PenLine className="w-4 h-4 mr-1.5" />开始新章节
                </Button>
                <Button variant="outline" onClick={() => router.push('/templates')} className="h-12 px-8 text-base font-medium rounded-xl border-border hover:border-primary hover:text-primary hover:shadow-md transition-all duration-300">
                  浏览模板
                </Button>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {[
                  { icon: Shield, label: '设定不丢失' },
                  { icon: Route, label: '续写不跑题' },
                  { icon: Send, label: '发布更安心' },
                ].map(({ icon: Icon, label }) => (
                  <span key={label} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/90 border border-border text-sm text-muted-foreground shadow-sm">
                    <Icon className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />{label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 三列卖点卡片 */}
          <div className="max-w-7xl mx-auto w-full mt-12 pb-12">
            <div className="grid md:grid-cols-3 gap-5">
              {[
                { icon: Shield, title: '设定不丢失', desc: '人物、世界观、伏笔统一管理，长篇不崩' },
                { icon: Route, title: '续写不跑题', desc: 'AI 基于前文语境，角色设定始终保持一致' },
                { icon: Send, title: '发布更安心', desc: '合规检测 + 身体密度，写得好还要写得对' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="rounded-xl p-5 bg-white/65 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-400 ease cursor-default">
                  <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== 数据存储提示 ===== */}
      <footer className="max-w-6xl mx-auto w-full px-8 pb-8 text-center">
        <p className="text-xs text-muted-foreground/40">💡 作品保存在浏览器本地，清除浏览器缓存可能导致数据丢失。建议定期导出备份。</p>
      </footer>
      {projects.length > 0 && (
        <section className="max-w-6xl mx-auto w-full px-8 pb-24">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setShowProjects(!showProjects)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <span className="text-base font-semibold text-foreground">我的作品</span>
              <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">{projects.length}</span>
              <span className="text-xs">{showProjects ? '收起' : '展开'}</span>
            </button>
            <Button size="sm" variant="ghost" onClick={() => setShowNew(true)} className="text-muted-foreground hover:text-primary">
              <Plus className="w-3.5 h-3.5 mr-1" />新建
            </Button>
          </div>
          {showProjects && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map(p => (
                <div key={p.id} onClick={() => router.push(`/editor/${p.id}`)}
                  className={cn("group cursor-pointer rounded-2xl bg-card border border-border p-5 shadow-card hover:shadow-hover hover:-translate-y-0.5 transition-all duration-300", deletingId === p.id && "opacity-0 scale-95 pointer-events-none")}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{p.name}</h3>
                      <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs bg-primary-light text-primary">{p.genre}</span>
                    </div>
                    <button onClick={e => { e.stopPropagation(); handleDelete(p.id, p.name) }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-destructive">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground">{p.chapterCount} 章 · {p.totalWords} 字</div>
                      <div className="mt-1 text-[11px] text-muted-foreground/60">
                        {new Date(p.updatedAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <span className="flex items-center gap-0.5 text-sm font-medium text-primary group-hover:gap-1.5 transition-all duration-200">
                      继续 <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ===== 新建作品弹窗 ===== */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay backdrop-blur-sm" onClick={() => setShowNew(false)}>
          <div className="bg-card rounded-[20px] border border-border shadow-modal p-6 modal-enter" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-5">
              <PenLine className="w-4 h-4 text-primary" />
              <span className="text-base font-semibold text-foreground">创建新作品</span>
            </div>
            <input type="text" placeholder="请输入作品名称" value={newName}
              onChange={e => { setNewName(e.target.value); if (nameError) setNameError(false) }}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              className={`w-full h-10 px-4 rounded-xl border bg-background text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/60 ${nameError ? 'border-destructive focus:ring-2 focus:ring-destructive/20' : 'border-border focus:border-primary focus:ring-2 focus:ring-ring'}`}
              autoFocus />
            {nameError && <p className="text-xs text-destructive mt-1.5">请输入作品名称</p>}
            <select value={newGenre} onChange={e => setNewGenre(e.target.value)}
              className="w-full h-10 px-4 rounded-xl border border-border bg-background text-sm text-foreground mt-3 outline-none focus:border-primary">
              {['都市','悬疑','玄幻','言情','科幻','仙侠','灵异'].map(g => <option key={g} value={g}>{g} — {genreDesc[g]}</option>)}
            </select>
            <div className="flex gap-2 mt-5">
              <Button onClick={handleCreate} className="flex-1 h-11 rounded-xl font-medium">创建</Button>
              <Button variant="outline" onClick={() => setShowNew(false)} className="flex-1 h-11 rounded-xl">取消</Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 移动端导航抽屉 ===== */}
      <div className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        {/* 遮罩 */}
        <div className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
        {/* 抽屉面板 */}
        <div className={`absolute top-0 right-0 w-64 h-full bg-card border-l border-border shadow-modal p-6 transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between mb-8">
            <Image src="/assets/brand/mojing-logo-nav.png" alt="墨境" height={32} width={110} className="h-8 w-auto" />
            <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="flex flex-col gap-1">
            <button onClick={() => { setMobileMenuOpen(false); router.push(isLoggedIn ? '/dashboard' : '/features') }} className="px-4 py-3 rounded-xl text-left text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">{isLoggedIn ? '工作台' : '产品功能'}</button>
            <button onClick={() => { setMobileMenuOpen(false); router.push(isLoggedIn ? '/works' : '/cases') }} className="px-4 py-3 rounded-xl text-left text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">{isLoggedIn ? '我的作品' : '写作案例'}</button>
            <button onClick={() => { setMobileMenuOpen(false); router.push(isLoggedIn ? '/editor' : '/templates') }} className="px-4 py-3 rounded-xl text-left text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">{isLoggedIn ? '编辑器' : '模板中心'}</button>
            <button onClick={() => { setMobileMenuOpen(false); router.push(isLoggedIn ? '/library' : '/tools') }} className="px-4 py-3 rounded-xl text-left text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">{isLoggedIn ? '素材库' : '创作工具'}</button>
            <button onClick={() => { setMobileMenuOpen(false); router.push('/tools') }} className="px-4 py-3 rounded-xl text-left text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">工具广场</button>
            <hr className="my-3 border-border" />
            <button onClick={() => { setMobileMenuOpen(false); router.push('/account') }} className="px-4 py-3 rounded-xl text-left text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">个人中心</button>
            <button onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-xl text-left text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">登录</button>
            <div className="mt-4 flex gap-2">
              {(['light','warm','dark','cool'] as const).map(k => (
                <button key={k} onClick={() => setTheme(k)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-all ${theme === k ? 'bg-primary text-white' : 'text-muted-foreground/60 hover:bg-secondary'}`}>
                  {k === 'light' ? <Sun className="w-3.5 h-3.5" /> : k === 'warm' ? <Sunrise className="w-3.5 h-3.5" /> : k === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Snowflake className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </nav>
        </div>
      </div>

      {/* 浮动动画 + 呼吸动画 + 按钮hover动效(光晕扫过/微弹跳) */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes breathe {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(1.03); }
        }

        /* ================================================
           按钮 hover 动效：光晕扫过 + 微弹跳
           纯 CSS 实现，不侵入 JSX 结构/逻辑
           ================================================ */

        /* --- 光晕扫过（shimmer sweep）--- */
        @keyframes glow-sweep {
          0%   { background-position: 200% 0; }
          100% { background-position: -80% 0; }
        }

        /* 定位：同时拥有 h-12 + rounded-xl 的主 CTA 按钮
           (nav「开始创作」& hero「开始新章节」) */
        :global(button.h-12.rounded-xl.transition-all) {
          position: relative;
          background-image:
            linear-gradient(
              105deg,
              transparent 30%,
              rgba(255,255,255,0.20) 46%,
              rgba(255,255,255,0.35) 50%,
              rgba(255,255,255,0.20) 54%,
              transparent 70%
            ) !important;
          background-size: 250% 100% !important;
          background-repeat: no-repeat !important;
          background-position: 200% 0 !important;
          transition:
            background-position 0.75s cubic-bezier(0.23, 1, 0.32, 1),
            transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
            box-shadow 0.35s ease !important;
        }

        /* hover — 光晕从右到左扫过 */
        :global(button.h-12.rounded-xl.transition-all:hover) {
          background-position: -80% 0 !important;
        }

        /* --- 微弹跳（micro bounce）—— 更弹的 lift --- */
        /* 目标按钮原本有 hover:-translate-y-0.5，这里用 cubic-bezier 替换为弹跳曲线 */
        :global(button.h-12.rounded-xl.transition-all:hover) {
          transform: translateY(-6px) !important;
        }

        /* --- 次要按钮（浏览模板 outline）—— 微光晕 --- */
        :global(button.border-border.h-12.rounded-xl) {
          transition:
            transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
            box-shadow 0.35s ease,
            border-color 0.35s ease !important;
        }
        :global(button.border-border.h-12.rounded-xl:hover) {
          transform: translateY(-3px) !important;
          box-shadow: 0 0 24px rgba(107,140,110,0.18) !important;
        }
      `}</style>
    </div>
  )
}
