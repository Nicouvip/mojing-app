'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getProjects, createProject, deleteProject } from '@/lib/db/store'
import { useAuth } from '@/lib/db/auth-context'
import type { Project } from '@/lib/db/types'
import { Plus, ArrowRight } from 'lucide-react'

/* ─── 品牌色常量 ─── */
const C = {
  bg: '#f5f2ed',
  text: '#1a1814',
  textSecondary: 'rgba(26,24,20,0.55)',
  textTertiary: 'rgba(26,24,20,0.3)',
  gold: '#c4956a',
  goldHover: '#b8895a',
  goldLight: 'rgba(196,149,106,0.08)',
  goldGlow: 'rgba(196,149,106,0.2)',
  border: 'rgba(26,24,20,0.06)',
  borderHover: 'rgba(26,24,20,0.12)',
  cardBg: 'rgba(255,255,255,0.7)',
}

/* ─── 动画 observer hook ─── */
function useScrollIn(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el) } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useScrollIn()
  return (
    <div
      ref={ref}
      className={`transition-all duration-800 ${className}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      {children}
    </div>
  )
}

/* ─── 类型 ─── */
const GENRES = ['都市', '悬疑', '玄幻', '言情', '科幻', '仙侠', '灵异'] as const
const GENRE_DESC: Record<string, string> = {
  '都市': '都市冷暖，人间百态', '悬疑': '迷雾重重，真相难寻', '玄幻': '逆天改命，踏破苍穹',
  '言情': '一世情缘，纸短情长', '科幻': '星辰大海，未来已来', '仙侠': '御剑乘风，问道长生', '灵异': '阴阳两界，善恶有报',
}

export default function HomePage() {
  const router = useRouter()
  const { isLoggedIn } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newGenre, setNewGenre] = useState('都市')
  const [nameError, setNameError] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showProjects, setShowProjects] = useState(false)

  useEffect(() => { setProjects(getProjects()) }, [])

  const handleCreate = () => {
    if (!newName.trim()) { setNameError(true); return }
    const p = createProject(newName.trim(), newGenre)
    setProjects(getProjects())
    setShowNew(false); setNewName(''); setNameError(false)
    router.push(`/editor/${p.id}`)
  }

  const handleDelete = (id: string, name: string) => {
    if (confirm(`确定删除《${name}》？此操作不可恢复。`)) {
      setDeletingId(id)
      setTimeout(() => { deleteProject(id); setProjects(getProjects()); setDeletingId(null) }, 200)
    }
  }

  const handleMobileNav = useCallback((path: string) => {
    setMobileOpen(false)
    router.push(path)
  }, [router])

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: "'Inter','PingFang SC',sans-serif", minHeight: '100vh' }}>
      {/* ─── 导航 ─── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 48px', height: 64,
        background: 'rgba(245,242,237,0.85)', backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Link href="/" style={{ fontFamily: "'Noto Serif SC','Songti SC',serif", fontSize: 17, fontWeight: 700, letterSpacing: '0.15em', color: C.text, textDecoration: 'none' }}>
            墨<span style={{ color: C.gold }}>境</span>
          </Link>
        </div>

        <div className="hidden md:flex" style={{ display: 'none', gap: 0 }}>
          {/* 桌面端导航（通过 media query 显示） */}
          <style>{`@media(min-width:768px){.nav-desktop{display:flex !important}}`}</style>
          <div className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {[
              { href: '/features', label: '产品功能' },
              { href: '/editor', label: '编辑器' },
              { href: '/about', label: '关于' },
            ].map(item => (
              <Link key={item.href} href={item.href} style={{
                fontSize: 13, fontWeight: 400, letterSpacing: '0.02em',
                color: C.textSecondary, textDecoration: 'none',
                padding: '8px 18px', borderRadius: 6,
                transition: 'all 0.25s ease',
              }}
                onMouseEnter={e => { e.currentTarget.style.color = C.text; e.currentTarget.style.background = C.goldLight }}
                onMouseLeave={e => { e.currentTarget.style.color = C.textSecondary; e.currentTarget.style.background = 'transparent' }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/login" style={{
            fontSize: 13, fontWeight: 400, color: C.textSecondary, textDecoration: 'none',
            padding: '8px 16px', borderRadius: 6, transition: 'color 0.25s ease',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = C.text }}
            onMouseLeave={e => { e.currentTarget.style.color = C.textSecondary }}
          >
            登录
          </Link>

          <Link href="/desk" style={{
            fontSize: 13, fontWeight: 500, letterSpacing: '0.02em',
            color: '#fff', textDecoration: 'none',
            background: C.gold, padding: '9px 24px', borderRadius: 8,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            transition: 'all 0.3s ease',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = C.goldHover; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 4px 16px ${C.goldGlow}` }}
            onMouseLeave={e => { e.currentTarget.style.background = C.gold; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
          >
            开始创作
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>

          {/* 移动端汉堡 */}
          <button onClick={() => setMobileOpen(true)} className="md:hidden" style={{
            padding: 8, border: 'none', background: 'none', cursor: 'pointer',
          }} aria-label="菜单">
            <span style={{ display: 'block', width: 20, height: 1.5, background: C.text, margin: '5px 0', borderRadius: 2 }}></span>
            <span style={{ display: 'block', width: 20, height: 1.5, background: C.text, margin: '5px 0', borderRadius: 2 }}></span>
            <span style={{ display: 'block', width: 20, height: 1.5, background: C.text, margin: '5px 0', borderRadius: 2 }}></span>
          </button>
        </div>
      </nav>

      {/* ─── 移动端抽屉 ─── */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 200,
        transition: 'opacity 0.3s ease',
        opacity: mobileOpen ? 1 : 0,
        pointerEvents: mobileOpen ? 'auto' : 'none',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)' }} onClick={() => setMobileOpen(false)} />
        <div style={{
          position: 'absolute', top: 0, right: 0, width: 256, height: '100%',
          background: '#fff', borderLeft: `1px solid ${C.border}`,
          padding: 24, transition: 'transform 0.3s ease',
          transform: mobileOpen ? 'translateX(0)' : 'translateX(100%)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <span style={{ fontFamily: "'Noto Serif SC',serif", fontSize: 16, fontWeight: 700, letterSpacing: '0.15em', color: C.text }}>墨<span style={{ color: C.gold }}>境</span></span>
            <button onClick={() => setMobileOpen(false)} style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer', color: C.textSecondary }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { href: '/features', label: '产品功能' },
              { href: '/editor', label: '编辑器' },
              { href: '/about', label: '关于' },
            ].map(item => (
              <button key={item.href} onClick={() => handleMobileNav(item.href)} style={{
                padding: '12px 16px', borderRadius: 12, border: 'none', background: 'none',
                textAlign: 'left', fontSize: 14, color: C.textSecondary, cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = C.goldLight; e.currentTarget.style.color = C.text }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.textSecondary }}
              >
                {item.label}
              </button>
            ))}
            <hr style={{ margin: '12px 0', border: 'none', borderTop: `1px solid ${C.border}` }} />
            <button onClick={() => handleMobileNav('/login')} style={{
              padding: '12px 16px', borderRadius: 12, border: 'none', background: 'none',
              textAlign: 'left', fontSize: 14, color: C.textSecondary, cursor: 'pointer',
            }}>
              登录
            </button>
            <button onClick={() => handleMobileNav('/desk')} style={{
              marginTop: 8, padding: '12px 16px', borderRadius: 12, border: 'none',
              background: C.gold, color: '#fff', textAlign: 'center', fontSize: 14, fontWeight: 500, cursor: 'pointer',
            }}>
              开始创作
            </button>
          </nav>
        </div>
      </div>

      {/* ─── HERO ─── */}
      <section style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        padding: '0 48px', marginTop: 64, position: 'relative', overflow: 'hidden',
      }}>
        {/* 背景光晕 */}
        <div style={{
          position: 'absolute', top: '50%', right: -200,
          width: 700, height: 700, transform: 'translateY(-50%)',
          background: `radial-gradient(circle, ${C.goldGlow} 0%, transparent 65%)`,
          pointerEvents: 'none',
        }} />

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80,
          alignItems: 'center', width: '100%', maxWidth: 1200, margin: '0 auto',
        }} className="hero-grid">
          {/* 左侧文案 */}
          <div style={{ position: 'relative', zIndex: 2 }}>
            <p style={{
              fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase',
              color: C.gold, fontWeight: 500, marginBottom: 24,
            }}>
              墨境 · A Realm of Ink
            </p>
            <h1 style={{
              fontFamily: "'Noto Serif SC','Songti SC',serif",
              fontSize: 'clamp(36px, 4.5vw, 52px)',
              fontWeight: 400, lineHeight: 1.2,
              color: C.text, marginBottom: 20,
            }}>
              每个写作者<br />
              <strong style={{ fontWeight: 700, color: '#000' }}>都该有一间自己的书房</strong>
            </h1>
            <p style={{
              fontSize: 16, fontWeight: 300,
              color: C.textSecondary, lineHeight: 1.8,
              marginBottom: 40, maxWidth: 440,
            }}>
              不为任何标准而写。<br />
              只为心里那一个故事。
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Link href="/desk" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 500,
                letterSpacing: '0.02em', color: '#fff', textDecoration: 'none',
                background: C.gold, padding: '14px 32px',
                border: 'none', borderRadius: 10, cursor: 'pointer',
                transition: 'all 0.35s ease',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = C.goldHover; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 28px ${C.goldGlow}` }}
                onMouseLeave={e => { e.currentTarget.style.background = C.gold; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
              >
                进入墨境
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
              <Link href="/features" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 400,
                color: C.textSecondary, textDecoration: 'none',
                padding: '14px 28px',
                border: `1px solid ${C.border}`, borderRadius: 10,
                transition: 'all 0.3s ease',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderHover; e.currentTarget.style.color = C.text; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSecondary; e.currentTarget.style.transform = 'none' }}
              >
                了解更多
              </Link>
            </div>
          </div>

          {/* 右侧编辑器预览 */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center' }} className="hero-visual">
            <div style={{
              width: '100%', maxWidth: 520,
              background: 'rgba(255,255,255,0.75)',
              backdropFilter: 'blur(8px)',
              border: `1px solid ${C.border}`,
              borderRadius: 14, overflow: 'hidden',
              boxShadow: '0 4px 32px rgba(26,24,20,0.04), 0 1px 4px rgba(26,24,20,0.04)',
              transition: 'transform 0.4s ease, box-shadow 0.4s ease',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 48px rgba(26,24,20,0.06), 0 2px 8px rgba(26,24,20,0.04)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 32px rgba(26,24,20,0.04), 0 1px 4px rgba(26,24,20,0.04)' }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px',
                borderBottom: `1px solid ${C.border}`,
              }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[0.3, 0.15, 0.08].map((o, i) => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: `rgba(196,149,106,${o})` }} />
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: C.textTertiary }}>
                  <span>第 7 章 · 归途</span>
                  <span>—</span>
                  <span>约 2,400 字</span>
                </div>
              </div>
              <div style={{
                padding: '36px 40px',
                fontFamily: "'Noto Serif SC','Songti SC',serif",
                fontSize: 15, lineHeight: 2, color: C.text, letterSpacing: '0.01em',
              }}>
                <p style={{ textIndent: '2em', marginBottom: '0.5em' }}>她没敲门。</p>
                <p style={{ textIndent: '2em', marginBottom: '0.5em' }}>门虚掩着。推开时带进一阵走廊的风。桌上的纸被掀起一角，又落回去。</p>
                <p style={{ textIndent: '2em', marginBottom: '0.5em' }}>「你来了。」</p>
                <p style={{ textIndent: '2em', marginBottom: '0.5em' }}>他说得很轻，像怕惊动什么。她没有回答，只是站在门口，让那阵风从身侧流过。</p>
                <p style={{ textIndent: '2em', marginBottom: '0.5em' }}>
                  <span style={{ background: 'rgba(196,149,106,0.06)', padding: '0 4px', borderRadius: 2 }}>屋里很暗。只有桌上一盏灯亮着，光晕把整个房间切成两极——他坐在光里，她站在暗处。</span>
                  <span style={{
                    display: 'inline-block', width: 1.5, height: '1.1em',
                    background: C.gold, verticalAlign: 'text-bottom', marginLeft: 2,
                  }} className="cursor-blink"></span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 分割线 ─── */}
      <div style={{ height: 1, maxWidth: 1200, margin: '0 auto', background: C.border }} />

      {/* ─── 品牌理念 ─── */}
      <FadeIn>
        <section style={{ padding: '100px 48px', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 100, alignItems: 'start' }}>
            <div>
              <p style={{ fontSize: 12, letterSpacing: '0.2em', fontWeight: 500, color: C.gold, marginBottom: 16 }}>
                — 01 · 理念 —
              </p>
              <h2 style={{
                fontFamily: "'Noto Serif SC','Songti SC',serif",
                fontSize: 32, fontWeight: 400, lineHeight: 1.35, color: C.text,
              }}>
                一间属于自己的<br />
                <strong style={{ fontWeight: 700, color: '#000' }}>书房</strong>
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 44 }}>
              {[
                { h: '沉浸式书写', p: '编辑器只做一件事——让你写得进去。没有浮动工具栏、没有弹窗、没有闪烁光标以外的任何打扰。' },
                { h: '角色如人', p: '人设档案、成长轨迹、伏笔网络。长篇数十万字，每个人物都有自己的生命线。' },
                { h: '引擎在侧', p: '冷却矩阵、合规检测、灵感推送——引擎在后台工作，只有你需要时它才出现。' },
                { h: '规矩即自由', p: '身体密度、禁用词、冲突强度。规矩让你不必每次做选择，把脑子留给故事本身。' },
              ].map((item, i) => (
                <FadeIn key={item.h} delay={i * 100}>
                  <div>
                    <h3 style={{ fontFamily: "'Noto Serif SC','Songti SC',serif", fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 6 }}>{item.h}</h3>
                    <p style={{ fontSize: 14, fontWeight: 300, color: C.textSecondary, lineHeight: 1.8 }}>{item.p}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      </FadeIn>

      <div style={{ height: 1, maxWidth: 1200, margin: '0 auto', background: C.border }} />

      {/* ─── 引语 ─── */}
      <FadeIn>
        <section style={{ padding: '80px 48px 60px', maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontFamily: "'Noto Serif SC',serif", fontSize: 56, lineHeight: 1, color: 'rgba(196,149,106,0.12)', marginBottom: 12 }}>「</p>
          <p style={{
            fontFamily: "'Noto Serif SC','Songti SC',serif",
            fontSize: 20, fontWeight: 300, lineHeight: 1.8, color: C.textSecondary,
          }}>
            写作不是把自己有的东西倒出来，<br />
            是走进一个还没有人去过的地方，<br />
            把它找到。
          </p>
        </section>
      </FadeIn>

      <div style={{ height: 1, maxWidth: 1200, margin: '0 auto', background: C.border }} />

      {/* ─── 功能特点 ─── */}
      <FadeIn>
        <section style={{ padding: '100px 48px', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }} className="features-grid">
            {[
              { icon: 'pen', title: '设定不丢失', desc: '人物、世界观、伏笔统一管理。长篇数十万字，每一个细节都记得住。' },
              { icon: 'book', title: '续写不跑题', desc: 'AI 基于前文语境，角色设定始终保持一致。每一章都像同一个人的笔触。' },
              { icon: 'shield', title: '质量可感知', desc: '合规检测、身体密度、冲突强度实时可见。不只写得多，还要写得好。' },
            ].map((item, i) => (
              <FadeIn key={item.title} delay={i * 120}>
                <div style={{
                  background: C.cardBg, border: `1px solid rgba(255,255,255,0.8)`, borderRadius: 14,
                  padding: '36px 32px', transition: 'all 0.35s ease', cursor: 'default',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(26,24,20,0.04)'; e.currentTarget.style.borderColor = 'rgba(196,149,106,0.15)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.8)' }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, background: C.goldLight,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
                  }}>
                    {item.icon === 'pen' ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
                    ) : item.icon === 'book' ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    )}
                  </div>
                  <h3 style={{ fontFamily: "'Noto Serif SC','Songti SC',serif", fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 6 }}>{item.title}</h3>
                  <p style={{ fontSize: 13, fontWeight: 300, color: C.textSecondary, lineHeight: 1.7 }}>{item.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>
      </FadeIn>

      <div style={{ height: 1, maxWidth: 1200, margin: '0 auto', background: C.border }} />

      {/* ─── 我的作品（仅在有作品时显示） ─── */}
      {projects.length > 0 && (
        <FadeIn>
          <section style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 48px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <button onClick={() => setShowProjects(!showProjects)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 13, color: C.textSecondary, background: 'none', border: 'none', cursor: 'pointer',
              }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: C.text }}>我的作品</span>
                <span style={{ fontSize: 12, background: C.goldLight, color: C.gold, padding: '2px 10px', borderRadius: 20 }}>{projects.length}</span>
              </button>
              <button onClick={() => setShowNew(true)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 13, color: C.textSecondary, background: 'none', border: 'none', cursor: 'pointer',
                transition: 'color 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.color = C.gold }}
                onMouseLeave={e => { e.currentTarget.style.color = C.textSecondary }}
              >
                <Plus size={14} />新建
              </button>
            </div>
            {showProjects && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {projects.map(p => (
                  <div key={p.id} onClick={() => router.push(`/editor/${p.id}`)} style={{
                    cursor: 'pointer', borderRadius: 14,
                    background: C.cardBg, border: `1px solid ${C.border}`,
                    padding: 24, transition: 'all 0.3s ease',
                    opacity: deletingId === p.id ? 0 : 1,
                    transform: deletingId === p.id ? 'scale(0.95)' : 'none',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(26,24,20,0.06)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ fontWeight: 600, fontSize: 15, color: C.text, marginBottom: 6 }}>{p.name}</h3>
                        <span style={{ fontSize: 12, background: C.goldLight, color: C.gold, padding: '2px 10px', borderRadius: 20 }}>{p.genre}</span>
                      </div>
                      <button onClick={e => { e.stopPropagation(); handleDelete(p.id, p.name) }} style={{
                        opacity: 0, padding: 6, borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', color: C.textTertiary, transition: 'all 0.2s',
                      }}
                        className="delete-btn"
                        onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
                        onMouseLeave={e => { e.currentTarget.style.color = C.textTertiary; e.currentTarget.style.background = 'none' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 20 }}>
                      <div>
                        <div style={{ fontSize: 12, color: C.textTertiary }}>{p.chapterCount} 章 · {p.totalWords} 字</div>
                        <div style={{ marginTop: 2, fontSize: 11, color: C.textTertiary }}>
                          {new Date(p.updatedAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 500, color: C.gold, transition: 'gap 0.2s' }} className="continue-link">
                        继续 <ArrowRight size={13} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </FadeIn>
      )}

      {/* ─── CTA ─── */}
      <FadeIn>
        <section style={{ padding: '80px 48px 120px', textAlign: 'center', position: 'relative' }}>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 500, height: 500, transform: 'translate(-50%,-50%)',
            background: `radial-gradient(circle, rgba(196,149,106,0.04) 0%, transparent 70%)`,
            pointerEvents: 'none',
          }} />
          <h2 style={{ fontFamily: "'Noto Serif SC','Songti SC',serif", fontSize: 28, fontWeight: 400, color: C.text, marginBottom: 10 }}>
            你的故事在等你
          </h2>
          <p style={{ fontSize: 15, color: C.textSecondary, marginBottom: 36 }}>从第一个字开始。</p>
          <Link href="/desk" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 500,
            color: '#fff', textDecoration: 'none',
            background: C.gold, padding: '14px 36px',
            border: 'none', borderRadius: 10,
            transition: 'all 0.35s ease',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = C.goldHover; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 28px ${C.goldGlow}` }}
            onMouseLeave={e => { e.currentTarget.style.background = C.gold; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
          >
            开始创作
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
        </section>
      </FadeIn>

      {/* ─── 页脚 ─── */}
      <footer style={{
        padding: '32px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderTop: `1px solid ${C.border}`, maxWidth: 1200, margin: '0 auto',
      }}>
        <span style={{ fontSize: 12, color: C.textTertiary }}>墨境 © 2026</span>
        <span style={{ fontSize: 12, color: C.textTertiary, letterSpacing: '0.03em' }}>墨境 · 沉浸式小说写作工具</span>
      </footer>

      {/* ─── 新建作品弹窗 ─── */}
      {showNew && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)',
        }} onClick={() => setShowNew(false)}>
          <div style={{
            background: '#fff', borderRadius: 20,
            border: `1px solid ${C.border}`, padding: 24, maxWidth: 400, width: '90%',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="M15 5l4 4"/></svg>
              <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>创建新作品</span>
            </div>
            <input
              type="text" placeholder="请输入作品名称"
              value={newName}
              onChange={e => { setNewName(e.target.value); if (nameError) setNameError(false) }}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              style={{
                width: '100%', height: 42, padding: '0 16px', borderRadius: 12,
                border: `1px solid ${nameError ? '#ef4444' : C.border}`,
                background: '#fafaf9', fontSize: 14, color: C.text, outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = C.gold }}
              onBlur={e => { e.currentTarget.style.borderColor = nameError ? '#ef4444' : C.border }}
              autoFocus
            />
            {nameError && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>请输入作品名称</p>}
            <select
              value={newGenre}
              onChange={e => setNewGenre(e.target.value)}
              style={{
                width: '100%', height: 42, padding: '0 16px', borderRadius: 12,
                border: `1px solid ${C.border}`, background: '#fafaf9',
                fontSize: 14, color: C.text, outline: 'none', marginTop: 12,
              }}
            >
              {GENRES.map(g => (
                <option key={g} value={g}>{g} — {GENRE_DESC[g]}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={handleCreate} style={{
                flex: 1, height: 44, borderRadius: 12, border: 'none',
                background: C.gold, color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                transition: 'background 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = C.goldHover }}
                onMouseLeave={e => { e.currentTarget.style.background = C.gold }}
              >
                创建
              </button>
              <button onClick={() => setShowNew(false)} style={{
                flex: 1, height: 44, borderRadius: 12,
                border: `1px solid ${C.border}`, background: 'transparent',
                color: C.textSecondary, fontSize: 14, cursor: 'pointer',
              }}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 全局 CSS 动画 ─── */}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .cursor-blink {
          animation: blink 1s step-end infinite;
        }
        .hero-grid {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
        }
        .features-grid {
          display: grid !important;
          grid-template-columns: repeat(3, 1fr) !important;
        }
        @media (max-width: 768px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
          }
          .hero-visual {
            display: none !important;
          }
          .features-grid {
            grid-template-columns: 1fr !important;
          }
        }
        /* hover 状态下显示删除按钮 */
        .delete-btn {
          opacity: 0 !important;
        }
        div:hover > .delete-btn {
          opacity: 1 !important;
        }
        .continue-link {
          gap: 4px !important;
        }
        div:hover .continue-link {
          gap: 8px !important;
        }
        /* 无障碍：用户偏好减少动效时关闭动画 */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  )
}
