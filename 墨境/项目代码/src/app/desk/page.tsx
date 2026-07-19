'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getProjects, getChapters, createProject } from '@/lib/db/store'
import type { Project } from '@/lib/db/types'
import { getTodayWords, getStreak, loadGoals } from '@/lib/ai/goals-store'
import Navbar from '@/components/navbar'
import DeskSidebar from '@/components/desk-sidebar'

/* ── 设计系统 token ── */
const C = {
  pri: '#c4956a',
  priDim: '#b08050',
  ink: '#1a1814',
  muted: 'rgba(26,24,20,.45)',
  line: 'rgba(26,24,20,.06)',
  paper: '#f5f2ed',
  sb: '#f5f2ed',
  card: '#fff',
  indigo: '#3a5279',
  crimson: '#b5454a',
  green: '#7a9e7a',
  radius: 8,
}

// P2-1: Get current week's Monday as YYYY-MM-DD string
function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  return monday.toISOString().slice(0, 10);
}

const GENRES = ['都市', '玄幻', '悬疑', '科幻', '历史', '灵异', '言情', '竞技'] as const
const AUDIENCES = ['男频', '全频', '女频'] as const
const PERSPECTIVES = ['第一人称', '第三人称'] as const
const LENGTHS = ['短篇', '长篇'] as const

const GATEWAYS = [
  { icon: '✎', title: '小说写作', desc: '三栏沉浸编辑器，AI 辅助续写润色', bg: 'rgba(196,149,106,.1)', color: C.pri, href: '/' },
  { icon: '☺', title: '角色工坊', desc: '构建角色、设定世界观和故事大纲', bg: 'rgba(58,82,121,.1)', color: C.indigo, href: '/features' },
  { icon: '▶', title: '灵感市集', desc: '浏览社区创作灵感与写作素材', bg: 'rgba(181,69,74,.08)', color: C.crimson, href: null },
  { icon: '★', title: '墨境课堂', desc: '从入门到精通的写作教程系列', bg: 'rgba(122,158,122,.1)', color: C.green, href: null },
]

const TEMPLATES = [
  { icon: '⚒', bg: 'rgba(196,149,106,.08)', title: '都市异能开篇模板', meta: '含3种冲突模式 + 5个角色原型', tags: ['都市', '开篇', '男频'], author: '墨境官方', uses: '1.2k' },
  { icon: '☙', bg: 'rgba(122,158,122,.1)', color: C.green, title: '古言虐恋大纲架构', meta: '三步构建情感冲突主线', tags: ['古言', '大纲', '女频'], author: '墨境官方', uses: '890' },
  { icon: '☺', bg: 'rgba(58,82,121,.1)', color: C.indigo, title: '悬疑反转三幕结构', meta: '钩子→误导→真相，经典模板', tags: ['悬疑', '结构', '通用'], author: '云中漫步', uses: '430' },
  { icon: '✎', bg: 'rgba(196,149,106,.08)', title: '万字短篇完稿流程', meta: '从脑洞到成稿，一步到位', tags: ['短篇', '全流程', '新人友好'], author: '墨境官方', uses: '2.1k' },
]

const RANKERS = [
  { name: '柳成荫', words: '186,200', top: true },
  { name: '笔下风雷', words: '152,840', top: true },
  { name: '云中漫步', words: '126,800', top: true },
  { name: '墨染青衣', words: '98,450' },
  { name: '山海经年', words: '87,120' },
]

const TIPS = [
  { title: '从零到日更万字——我的AI协作心法', date: '2026-07-10' },
  { title: '如何用墨境写出第一篇签约作品', date: '2026-07-08' },
  { title: '人物对话平淡？试试墨境的角色视角注入', date: '2026-07-05' },
  { title: '悬疑小说伏笔管理：墨境大纲工作流分享', date: '2026-07-02' },
]

const COVERS = [
  'linear-gradient(135deg,#e8dfd2,#d5c8b5)',
  'linear-gradient(135deg,#d9d4cb,#c7bfb2)',
  'linear-gradient(135deg,#cfc8bc,#b8afa2)',
  'linear-gradient(135deg,#c4b090,#a88860)',
  'linear-gradient(135deg,#b8a898,#908070)',
  'linear-gradient(135deg,#a89888,#887060)',
]

export default function DeskPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [dlgOpen, setDlgOpen] = useState(false)
  const [quickGenre, setQuickGenre] = useState('都市')
  const [quickAudience, setQuickAudience] = useState('全频')
  const [quickPerspective, setQuickPerspective] = useState('第三人称')
  const [quickLength, setQuickLength] = useState('长篇')
  const [quickIdea, setQuickIdea] = useState('')
  const [dlgIdea, setDlgIdea] = useState('')
  const [dlgGenre, setDlgGenre] = useState('都市')
  const [dlgPerspective, setDlgPerspective] = useState('第三人称')
  const [dlgLength, setDlgLength] = useState('长篇连载（>8万字）')
  const [dlgAudience, setDlgAudience] = useState('不限')
  // P2-1: checkin persistence via localStorage
  const [checkinDone, setCheckinDone] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      const raw = localStorage.getItem('mojing_checkin')
      if (raw) {
        const saved = JSON.parse(raw)
        if (saved.weekStart === getWeekStart()) return saved.days[3] === true
      }
    } catch {}
    return false
  })
  const [checkinDays, setCheckinDays] = useState<boolean[]>(() => {
    if (typeof window === 'undefined') return [false, false, false, false, false, false, false]
    try {
      const raw = localStorage.getItem('mojing_checkin')
      if (raw) {
        const saved = JSON.parse(raw)
        if (saved.weekStart === getWeekStart()) return saved.days
      }
    } catch {}
    return [false, false, false, false, false, false, false]
  })

  useEffect(() => { setProjects(getProjects()) }, [])

  const todayDone = getTodayWords()
  const goals = loadGoals()
  const todayTarget = goals.enabled ? goals.dailyWordTarget : 3000
  const streak = getStreak()

  const weekWords = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    let total = 0
    for (const p of projects) {
      const chs = getChapters(p.id)
      for (const ch of chs) {
        if ((ch.updatedAt || ch.createdAt || 0) >= weekAgo) {
          total += ch.wordCount || 0
        }
      }
    }
    return total
  }, [projects])

  const totalWords = useMemo(() => projects.reduce((s, p) => s + (p.totalWords || 0), 0), [projects])
  
  // P2-2: Real month-over-month word count
  const monthWords = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime()
    let thisMonth = 0, lastMonth = 0
    for (const p of projects) {
      const chs = getChapters(p.id)
      for (const ch of chs) {
        const ts = (ch as any).updatedAt || (ch as any).createdAt || 0
        const wc = ch.wordCount || 0
        if (ts >= monthStart) thisMonth += wc
        else if (ts >= lastMonthStart && ts < monthStart) lastMonth += wc
      }
    }
    return { thisMonth, lastMonth, delta: thisMonth - lastMonth }
  }, [projects])

  const recentProjects = projects.filter(p => !p.deletedAt).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3)

  const handleQuickCreate = () => {
    const name = quickIdea.trim() || '未命名作品'
    const p = createProject(name, quickGenre, {
      audience: quickAudience,
      perspective: quickPerspective,
      length: quickLength,
      idea: quickIdea.trim() || undefined,
    })
    router.push(`/editor/${p.id}`)
  }

  const handleDlgCreate = () => {
    const name = dlgIdea.trim() || '未命名作品'
    const p = createProject(name, dlgGenre)
    setDlgOpen(false)
    router.push(`/editor/${p.id}`)
  }

  const progress = Math.min(100, Math.round((todayDone / todayTarget) * 100))
  const days = ['一', '二', '三', '四', '五', '六', '日']
  // checkinDays is now useState above (P2-1)

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="flex min-h-[calc(100vh-56px)]">
        <DeskSidebar active="/desk" />

        {/* ── Main ── */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top bar */}
          <header className="flex items-center justify-between px-7 h-14 border-b border-border shrink-0 gap-4">
            <div className="flex items-center gap-2 bg-background rounded-[20px] px-4 h-9 max-w-360 flex-1">
              <span className="text-muted-foreground text-sm">⌕</span>
              <input type="search" placeholder="搜作品、模板或写作心得…" className="border-none bg-transparent outline-none text-sm text-foreground font-inherit w-full" />
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setDlgOpen(true)} className="text-xs px-[18px] py-[7px] rounded-[20px] bg-primary text-white border-none cursor-pointer font-inherit font-medium shadow-[0_2px_8px_rgba(196,149,106,.15)] min-h-[34px] inline-flex items-center gap-1">
                ＋ 开始创作
              </button>
            </div>
          </header>

          {/* Content */}
          <div className="px-7 py-8 flex-1 overflow-y-auto">
            {/* Desk header */}
            <header className="flex items-start justify-between mb-7 gap-5 flex-wrap">
              <div>
                <h1 className="font-serif text-3xl text-foreground font-bold mb-1" style={{ fontFamily: "'Noto Serif SC',Georgia,serif" }}>我的书桌</h1>
                <p className="text-sm text-muted-foreground">案上的每一本书，都是你正在编织的世界。</p>
              </div>
              <div className="flex items-center gap-2.5 px-[18px] py-[10px] rounded-xl shrink-0" style={{ background: 'rgba(196,149,106,.06)', border: '1px solid rgba(196,149,106,.12)' }}>
                <span className="text-lg">✎</span>
                <div>
                  <div className="text-xs text-muted-foreground">今日进度</div>
                  <div className="text-base font-bold text-primary font-serif" style={{ fontFamily: "'Noto Serif SC',Georgia,serif" }}>{todayDone.toLocaleString()} / {todayTarget.toLocaleString()} 字</div>
                </div>
              </div>
            </header>

            {/* 一句话创作 */}
            <section className="mb-9">
              <div className="border border-border rounded-[20px] p-6 bg-card">
                <div className="flex items-start flex-wrap gap-5 mb-4">
                  {/* 小说题材 */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-muted-foreground font-medium">小说题材</span>
                    <div className="flex gap-1 flex-wrap">
                      {GENRES.map(g => (
                        <button key={g} onClick={() => setQuickGenre(g)} style={{ padding: '6px 16px', borderRadius: 20, border: `1px solid ${quickGenre === g ? C.pri : C.line}`, fontSize: 12, cursor: 'pointer', background: quickGenre === g ? C.pri : C.card, color: quickGenre === g ? '#fff' : C.muted, transition: 'all .12s', minHeight: 34, fontWeight: quickGenre === g ? 600 : 400 }}>
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* 目标读者 */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-muted-foreground font-medium">目标读者</span>
                    <div className="flex gap-1">
                      {AUDIENCES.map(a => (
                        <button key={a} onClick={() => setQuickAudience(a)} style={{ padding: '5px 14px', borderRadius: 6, border: `1px solid ${quickAudience === a ? C.pri : C.line}`, fontSize: 11, cursor: 'pointer', background: quickAudience === a ? 'rgba(196,149,106,.08)' : C.card, color: quickAudience === a ? C.pri : C.ink, fontWeight: quickAudience === a ? 600 : 400, minHeight: 32 }}>
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* 作品视角 */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-muted-foreground font-medium">作品视角</span>
                    <div className="flex gap-1">
                      {PERSPECTIVES.map(p => (
                        <button key={p} onClick={() => setQuickPerspective(p)} style={{ padding: '5px 14px', borderRadius: 6, border: `1px solid ${quickPerspective === p ? C.pri : C.line}`, fontSize: 11, cursor: 'pointer', background: quickPerspective === p ? 'rgba(196,149,106,.08)' : C.card, color: quickPerspective === p ? C.pri : C.ink, fontWeight: quickPerspective === p ? 600 : 400, minHeight: 32 }}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* 篇幅长短 */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-muted-foreground font-medium">篇幅长短</span>
                    <div className="flex gap-1">
                      {LENGTHS.map(l => (
                        <button key={l} onClick={() => setQuickLength(l)} style={{ padding: '5px 14px', borderRadius: 6, border: `1px solid ${quickLength === l ? C.pri : C.line}`, fontSize: 11, cursor: 'pointer', background: quickLength === l ? 'rgba(196,149,106,.08)' : C.card, color: quickLength === l ? C.pri : C.ink, fontWeight: quickLength === l ? 600 : 400, minHeight: 32 }}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="border-2 border-border rounded-xl px-4 py-3.5 transition-all mb-4">
                  <textarea value={quickIdea} onChange={e => setQuickIdea(e.target.value)} maxLength={500} placeholder="一个普通外卖员发现自己拥有超能力，从此卷入一场外太空阴谋..." className="border-none w-full min-h-20 text-sm font-inherit text-foreground resize-y outline-none p-0 leading-relaxed bg-transparent" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 text-white" style={{ background: `linear-gradient(135deg,${C.pri},${C.priDim})` }}>墨</span>
                    <span className="text-xs text-muted-foreground">{quickIdea.length} / 500</span>
                  </div>
                  <button onClick={handleQuickCreate} className="text-sm px-6 py-2.5 rounded-lg text-white border-none cursor-pointer font-semibold font-inherit min-h-[42px] flex items-center gap-1.5" style={{ background: `linear-gradient(135deg,${C.pri},${C.priDim})` }}>
                    开始创作
                  </button>
                </div>
              </div>
            </section>

            {/* 继续创作 */}
            {recentProjects.length > 0 && (
              <section className="mb-9">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <span className="w-[3px] h-4 rounded-sm bg-primary" />
                    继续创作
                  </h2>
                  <Link href="/works" className="text-xs text-muted-foreground no-underline">全部作品 ›</Link>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                  {recentProjects.map((p, i) => (
                    <article key={p.id} onClick={() => router.push(`/editor/${p.id}`)} className="border border-border rounded-xl overflow-hidden bg-card cursor-pointer transition-all">
                      <div className="h-25 flex items-center justify-center relative" style={{ background: COVERS[i % COVERS.length] }}>
                        <span className="absolute top-2 left-2 text-[9px] px-2 py-0.5 rounded-lg tracking-wide" style={{ background: 'rgba(26,24,20,.55)', color: '#fff' }}>{p.genre || '未分类'}</span>
                      </div>
                      <div className="px-4 py-[10px]">
                        <h3 className="text-sm font-semibold text-foreground font-serif mb-1" style={{ fontFamily: "'Noto Serif SC',Georgia,serif" }}>《{p.name}》</h3>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>{p.genre || '未分类'}</span>
                          <span>{(p.totalWords || 0).toLocaleString()}字</span>
                          <span className="ml-auto">✎ {new Date(p.updatedAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</span>
                        </div>
                        <div className="h-[3px] rounded-sm bg-border mt-2 overflow-hidden">
                          <div className="h-full rounded-sm bg-primary" style={{ width: `${Math.min(100, Math.round(((p.totalWords || 0) / 50000) * 100))}%` }} />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* 创作工坊 4宫格 */}
            <section className="mb-9">
              <div className="flex items-center mb-4">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <span className="w-[3px] h-4 rounded-sm bg-primary" />
                  创作工坊
                </h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {GATEWAYS.map((gw, i) => {
                  const Wrapper = gw.href ? 'a' : 'button'
                  return (
                    <Wrapper key={i} href={gw.href ?? undefined}
                      className="flex items-center gap-3.5 px-4 py-[18px] border border-border rounded-xl bg-card cursor-pointer transition-all no-underline"
                      onMouseEnter={e => { e.currentTarget.style.borderColor = C.pri; e.currentTarget.style.boxShadow = '0 2px 12px rgba(26,24,20,.04)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.line; e.currentTarget.style.boxShadow = 'none' }}>
                      <span className="w-10 h-10 rounded-[10px] flex items-center justify-center text-lg shrink-0" style={{ background: gw.bg, color: gw.color }}>{gw.icon}</span>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold text-foreground">{gw.title}</span>
                        <span className="text-xs text-muted-foreground leading-relaxed">{gw.desc}</span>
                      </div>
                    </Wrapper>
                  )
                })}
              </div>
            </section>

            {/* 创作数据 + 每日打卡 */}
            <section className="mb-9">
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { val: totalWords.toLocaleString(), label: `累计字数 · ${projects.length}部作品`, delta: (monthWords.delta >= 0 ? '▲' : '▼') + ' 较上月 ' + Math.abs(monthWords.delta).toLocaleString() + '字', deltaColor: C.green },
                    { val: `${streak} 天`, label: '连续写作', accent: true, delta: (100 - streak > 0 ? '▲ 距100天还差' + (100 - streak) + '天' : '🎉 已达成100天目标！'), deltaColor: C.green },
                    { val: weekWords.toLocaleString(), label: '本周字数 · 日均 ' + Math.round(weekWords / 7).toLocaleString() },
                    { val: `${progress}%`, label: '今日目标完成度', accent: true, delta: progress >= 100 ? '🎉 今日目标已达成！' : '还需写' + (todayTarget - todayDone).toLocaleString() + '字达标', deltaColor: C.crimson },
                  ].map((s, i) => (
                    <div key={i} className="bg-card border border-border rounded-xl px-3.5 py-4 flex flex-col gap-1">
                      <span className="font-serif text-2xl font-bold" style={{ fontFamily: "'Noto Serif SC',Georgia,serif", color: s.accent ? C.pri : C.ink }}>{s.val}</span>
                      <span className="text-[10px] text-muted-foreground tracking-wide">{s.label}</span>
                      {s.delta && <span className="text-[10px] flex items-center gap-[3px]" style={{ color: s.deltaColor }}>{s.delta}</span>}
                    </div>
                  ))}
                </div>
                <div className="border border-border rounded-xl px-4 py-[18px] bg-card flex flex-col justify-between">
                  <div className="text-xs text-muted-foreground mb-2.5 flex items-center justify-between">
                    <span>每日打卡</span>
                    <span className="text-[10px]">本周 {checkinDone ? 5 : 4}/7</span>
                  </div>
                  <div className="flex gap-2 mb-3.5">
                    {days.map((d, i) => {
                      const done = checkinDays[i] || (i === 3 && checkinDone)
                      const today = i === 3 && !checkinDone
                      return (
                        <span key={d} className="w-9 h-9 rounded-full flex flex-col items-center justify-center text-xs font-semibold" style={{ border: `1px solid ${done ? C.pri : today ? C.pri : C.line}`, background: done ? C.pri : C.card, color: done ? '#fff' : today ? C.pri : C.muted, borderWidth: today ? 2 : 1 }}>
                          {d}
                          {done && <span className="text-[8px] leading-none">+10</span>}
                          {today && <span className="text-[8px] leading-none">+20</span>}
                        </span>
                      )
                    })}
                  </div>
                  <button onClick={() => {
                    setCheckinDone(true)
                    const newDays = [...checkinDays]
                    newDays[3] = true // Wednesday = index 3
                    setCheckinDays(newDays)
                    localStorage.setItem('mojing_checkin', JSON.stringify({ weekStart: getWeekStart(), days: newDays }))
                  }} disabled={checkinDone} className="text-xs py-2 text-center cursor-pointer font-semibold font-inherit rounded-lg min-h-9" style={{ borderRadius: C.radius, cursor: checkinDone ? 'default' : 'pointer', border: `1px solid ${checkinDone ? C.line : C.pri}`, background: checkinDone ? C.line : C.pri, color: checkinDone ? C.muted : '#fff' }}>
                    {checkinDone ? '✔ 已打卡！' : '✔ 今日打卡 · 得20墨点'}
                  </button>
                </div>
              </div>
            </section>

            {/* 写作模板 */}
            <section className="mb-9">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <span className="w-[3px] h-4 rounded-sm bg-primary" />
                  写作模板
                </h2>
                <Link href="/templates" className="text-xs text-muted-foreground no-underline">全部模板 ›</Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                {TEMPLATES.map((t, i) => (
                  <article key={i} className="border border-border rounded-xl overflow-hidden bg-card cursor-pointer transition-all">
                    <div className="px-4 pt-3.5 pb-2.5 flex items-start gap-2.5">
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0" style={{ background: t.bg, color: t.color || C.pri }}>{t.icon}</span>
                      <div>
                        <div className="text-sm font-semibold text-foreground leading-tight mb-0.5">{t.title}</div>
                        <div className="text-[10px] text-muted-foreground">{t.meta}</div>
                      </div>
                    </div>
                    <div className="px-4 pb-3 flex gap-1.5 flex-wrap">
                      {t.tags.map(tag => <span key={tag} className="text-[10px] px-2 py-0.5 rounded-[10px] bg-background text-muted-foreground">{tag}</span>)}
                    </div>
                    <div className="px-4 py-2.5 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>● {t.author}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{t.uses} 使用</span>
                        <button className="text-[10px] px-3 py-1 border border-border rounded-xl text-primary bg-transparent cursor-pointer font-inherit" style={{ borderColor: C.pri, color: C.pri }}>使用</button>
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* 风云榜 + 创作心得 */}
            <section className="mb-9">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                      <span className="w-[3px] h-4 rounded-sm bg-primary" />
                      创作风云榜
                    </h2>
                    <button className="text-xs text-muted-foreground bg-transparent border-none cursor-pointer">本月 ›</button>
                  </div>
                  <table className="w-full text-xs border-collapse">
                    <tbody>
                      {RANKERS.map((r, i) => (
                        <tr key={i}>
                          <td className="w-8 font-bold px-3 py-2 border-b border-border" style={{ color: r.top ? C.pri : C.muted, borderColor: C.line }}>{i + 1}</td>
                          <td className="font-medium text-foreground px-3 py-2 border-b border-border">{r.name}</td>
                          <td className="text-right font-semibold px-3 py-2 border-b border-border font-serif" style={{ color: C.ink, fontFamily: "'Noto Serif SC',Georgia,serif", borderColor: C.line }}>{r.words} 字</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                      <span className="w-[3px] h-4 rounded-sm bg-primary" />
                      创作心得
                    </h2>
                    <button className="text-xs text-muted-foreground bg-transparent border-none cursor-pointer">更多 ›</button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {TIPS.map((t, i) => (
                      <article key={i} className="px-4 py-3 border border-border rounded-lg bg-card cursor-pointer transition-all flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-foreground flex-1 overflow-hidden whitespace-nowrap" style={{ textOverflow: 'ellipsis' }}>{t.title}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{t.date}</span>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* 创建对话框 */}
      {dlgOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(26,24,20,.3)' }} onClick={e => e.target === e.currentTarget && setDlgOpen(false)}>
          <div className="bg-card rounded-2xl p-8 max-w-560 w-[calc(100%-32px)] flex flex-col gap-5 relative" style={{ boxShadow: '0 16px 48px rgba(26,24,20,.12)' }}>
            <button onClick={() => setDlgOpen(false)} aria-label="关闭" className="absolute top-4 right-4 w-8 h-8 rounded-full border-none bg-background cursor-pointer text-base text-muted-foreground flex items-center justify-center">×</button>
            <h3 className="text-lg font-bold text-foreground font-serif" style={{ fontFamily: "'Noto Serif SC',Georgia,serif" }}>一句话生成故事</h3>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">一句话描述你想写的故事</label>
              <textarea value={dlgIdea} onChange={e => setDlgIdea(e.target.value)} maxLength={500} placeholder="一个退隐杀手回到故乡，却发现整座小镇的人都在等他…" className="w-full px-3.5 py-2.5 text-sm font-inherit outline-none bg-background resize-y min-h-20 leading-relaxed rounded-lg" style={{ border: `1px solid ${C.line}`, borderRadius: C.radius }} />
              <span className="text-[10px] text-muted-foreground text-right">{dlgIdea.length} / 500</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: '题材', value: dlgGenre, set: setDlgGenre, opts: ['都市', '玄幻', '悬疑', '科幻', '历史', '灵异', '言情', '竞技'] },
                { label: '视角', value: dlgPerspective, set: setDlgPerspective, opts: ['第一人称', '第三人称', '多视角'] },
                { label: '篇幅', value: dlgLength, set: setDlgLength, opts: ['短篇（<2万字）', '中篇（2-8万字）', '长篇连载（>8万字）'] },
                { label: '目标读者', value: dlgAudience, set: setDlgAudience, opts: ['不限', '男性向', '女性向'] },
              ].map(field => (
                <div key={field.label} className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">{field.label}</label>
                  <select value={field.value} onChange={e => field.set(e.target.value)} className="w-full px-3.5 py-2.5 text-sm font-inherit outline-none bg-background rounded-lg" style={{ border: `1px solid ${C.line}`, borderRadius: C.radius }}>
                    {field.opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ background: 'rgba(196,149,106,.04)', border: '1px dashed rgba(196,149,106,.15)', borderRadius: C.radius }}>
              <span className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 text-white" style={{ background: `linear-gradient(135deg,${C.pri},${C.priDim})` }}>墨</span>
              <span className="text-xs text-muted-foreground leading-relaxed">「墨灵」将根据你的设定，自动生成大纲、人物关系和开篇第一章。</span>
            </div>
            <div className="flex gap-2.5 justify-end mt-1">
              <button onClick={() => setDlgOpen(false)} className="text-xs px-[18px] py-[7px] rounded-[20px] bg-card cursor-pointer text-foreground font-inherit min-h-[34px]" style={{ border: `1px solid ${C.line}` }}>取消</button>
              <button onClick={handleDlgCreate} className="text-xs px-[18px] py-[7px] rounded-[20px] bg-primary text-white border-none cursor-pointer font-medium font-inherit min-h-[34px]" style={{ boxShadow: '0 2px 8px rgba(196,149,106,.15)' }}>☙ 开始生成</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
