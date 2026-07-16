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
    <div style={{ minHeight: '100vh', background: C.paper }}>
      <Navbar />

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
        <DeskSidebar active="/desk" />

        {/* ── Main ── */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          {/* Top bar */}
          <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', height: 56, borderBottom: `1px solid ${C.line}`, flexShrink: 0, gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.sb, borderRadius: 20, padding: '0 16px', height: 36, maxWidth: 360, flex: 1 }}>
              <span style={{ color: C.muted, fontSize: 14 }}>⌕</span>
              <input type="search" placeholder="搜作品、模板或写作心得…" style={{ border: 'none', background: 'none', outline: 'none', fontSize: 13, color: C.ink, fontFamily: 'inherit', width: '100%' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => setDlgOpen(true)} style={{ fontSize: 12, padding: '7px 18px', borderRadius: 20, background: C.pri, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, boxShadow: '0 2px 8px rgba(196,149,106,.15)', minHeight: 34, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                ＋ 开始创作
              </button>
            </div>
          </header>

          {/* Content */}
          <div style={{ padding: '32px 28px', flex: 1, overflowY: 'auto' }}>
            {/* Desk header */}
            <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 20, flexWrap: 'wrap' }}>
              <div>
                <h1 style={{ fontFamily: "'Noto Serif SC',Georgia,serif", fontSize: 28, color: C.ink, fontWeight: 700, marginBottom: 4 }}>我的书桌</h1>
                <p style={{ fontSize: 14, color: C.muted }}>案上的每一本书，都是你正在编织的世界。</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderRadius: 12, background: 'rgba(196,149,106,.06)', border: '1px solid rgba(196,149,106,.12)', flexShrink: 0 }}>
                <span style={{ fontSize: 18 }}>✎</span>
                <div>
                  <div style={{ fontSize: 11, color: C.muted }}>今日进度</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.pri, fontFamily: "'Noto Serif SC',Georgia,serif" }}>{todayDone.toLocaleString()} / {todayTarget.toLocaleString()} 字</div>
                </div>
              </div>
            </header>

            {/* 一句话创作 */}
            <section style={{ marginBottom: 36 }}>
              <div style={{ border: `1px solid ${C.line}`, borderRadius: 20, padding: 24, background: C.card }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, marginBottom: 16 }}>
                  {/* 小说题材 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>小说题材</span>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {GENRES.map(g => (
                        <button key={g} onClick={() => setQuickGenre(g)} style={{ padding: '6px 16px', borderRadius: 20, border: `1px solid ${quickGenre === g ? C.pri : C.line}`, fontSize: 12, cursor: 'pointer', background: quickGenre === g ? C.pri : C.card, color: quickGenre === g ? '#fff' : C.muted, fontFamily: 'inherit', transition: 'all .12s', minHeight: 34, fontWeight: quickGenre === g ? 600 : 400 }}>
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* 目标读者 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>目标读者</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {AUDIENCES.map(a => (
                        <button key={a} onClick={() => setQuickAudience(a)} style={{ padding: '5px 14px', borderRadius: 6, border: `1px solid ${quickAudience === a ? C.pri : C.line}`, fontSize: 11, cursor: 'pointer', background: quickAudience === a ? 'rgba(196,149,106,.08)' : C.card, color: quickAudience === a ? C.pri : C.ink, fontFamily: 'inherit', fontWeight: quickAudience === a ? 600 : 400, minHeight: 32 }}>
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* 作品视角 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>作品视角</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {PERSPECTIVES.map(p => (
                        <button key={p} onClick={() => setQuickPerspective(p)} style={{ padding: '5px 14px', borderRadius: 6, border: `1px solid ${quickPerspective === p ? C.pri : C.line}`, fontSize: 11, cursor: 'pointer', background: quickPerspective === p ? 'rgba(196,149,106,.08)' : C.card, color: quickPerspective === p ? C.pri : C.ink, fontFamily: 'inherit', fontWeight: quickPerspective === p ? 600 : 400, minHeight: 32 }}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* 篇幅长短 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>篇幅长短</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {LENGTHS.map(l => (
                        <button key={l} onClick={() => setQuickLength(l)} style={{ padding: '5px 14px', borderRadius: 6, border: `1px solid ${quickLength === l ? C.pri : C.line}`, fontSize: 11, cursor: 'pointer', background: quickLength === l ? 'rgba(196,149,106,.08)' : C.card, color: quickLength === l ? C.pri : C.ink, fontFamily: 'inherit', fontWeight: quickLength === l ? 600 : 400, minHeight: 32 }}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ border: `2px solid ${C.line}`, borderRadius: 12, padding: '14px 16px', transition: 'all .15s', marginBottom: 16 }}>
                  <textarea value={quickIdea} onChange={e => setQuickIdea(e.target.value)} maxLength={500} placeholder="一个普通外卖员发现自己拥有超能力，从此卷入一场外太空阴谋..." style={{ border: 'none', width: '100%', minHeight: 80, fontSize: 14, fontFamily: 'inherit', color: C.ink, resize: 'vertical', outline: 'none', padding: 0, lineHeight: 1.8, background: 'transparent' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, background: `linear-gradient(135deg,${C.pri},${C.priDim})`, color: '#fff' }}>墨</span>
                    <span style={{ fontSize: 11, color: C.muted }}>{quickIdea.length} / 500</span>
                  </div>
                  <button onClick={handleQuickCreate} style={{ fontSize: 13, padding: '10px 24px', borderRadius: 8, background: `linear-gradient(135deg,${C.pri},${C.priDim})`, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit', minHeight: 42, display: 'flex', alignItems: 'center', gap: 6 }}>
                    开始创作
                  </button>
                </div>
              </div>
            </section>

            {/* 继续创作 */}
            {recentProjects.length > 0 && (
              <section style={{ marginBottom: 36 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 600, color: C.ink, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 3, height: 16, borderRadius: 2, background: C.pri }} />
                    继续创作
                  </h2>
                  <Link href="/works" style={{ fontSize: 12, color: C.muted, textDecoration: 'none' }}>全部作品 ›</Link>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                  {recentProjects.map((p, i) => (
                    <article key={p.id} onClick={() => router.push(`/editor/${p.id}`)} style={{ border: `1px solid ${C.line}`, borderRadius: 12, overflow: 'hidden', background: C.card, cursor: 'pointer', transition: 'all .15s' }}>
                      <div style={{ height: 100, background: COVERS[i % COVERS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        <span style={{ position: 'absolute', top: 8, left: 8, fontSize: 9, padding: '2px 8px', borderRadius: 8, background: 'rgba(26,24,20,.55)', color: '#fff', letterSpacing: '.06em' }}>{p.genre || '未分类'}</span>
                      </div>
                      <div style={{ padding: '14px 16px 10px' }}>
                        <h3 style={{ fontSize: 13, fontWeight: 600, color: C.ink, fontFamily: "'Noto Serif SC',Georgia,serif", marginBottom: 4 }}>《{p.name}》</h3>
                        <div style={{ fontSize: 11, color: C.muted, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>{p.genre || '未分类'}</span>
                          <span>{(p.totalWords || 0).toLocaleString()}字</span>
                          <span style={{ marginLeft: 'auto' }}>✎ {new Date(p.updatedAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</span>
                        </div>
                        <div style={{ height: 3, borderRadius: 2, background: C.line, marginTop: 8, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 2, background: C.pri, width: `${Math.min(100, Math.round(((p.totalWords || 0) / 50000) * 100))}%` }} />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* 创作工坊 4宫格 */}
            <section style={{ marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: C.ink, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 3, height: 16, borderRadius: 2, background: C.pri }} />
                  创作工坊
                </h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {GATEWAYS.map((gw, i) => {
                  const Wrapper = gw.href ? 'a' : 'button'
                  return (
                    <Wrapper key={i} href={gw.href ?? undefined}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 16px', border: `1px solid ${C.line}`, borderRadius: 12, background: C.card, cursor: 'pointer', transition: 'all .2s', textDecoration: 'none' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = C.pri; e.currentTarget.style.boxShadow = '0 2px 12px rgba(26,24,20,.04)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.line; e.currentTarget.style.boxShadow = 'none' }}>
                      <span style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, background: gw.bg, color: gw.color }}>{gw.icon}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{gw.title}</span>
                        <span style={{ fontSize: 11, color: C.muted, lineHeight: 1.4 }}>{gw.desc}</span>
                      </div>
                    </Wrapper>
                  )
                })}
              </div>
            </section>

            {/* 创作数据 + 每日打卡 */}
            <section style={{ marginBottom: 36 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { val: totalWords.toLocaleString(), label: `累计字数 · ${projects.length}部作品`, delta: (monthWords.delta >= 0 ? '▲' : '▼') + ' 较上月 ' + Math.abs(monthWords.delta).toLocaleString() + '字', deltaColor: C.green },
                    { val: `${streak} 天`, label: '连续写作', accent: true, delta: (100 - streak > 0 ? '▲ 距100天还差' + (100 - streak) + '天' : '🎉 已达成100天目标！'), deltaColor: C.green },
                    { val: weekWords.toLocaleString(), label: '本周字数 · 日均 ' + Math.round(weekWords / 7).toLocaleString() },
                    { val: `${progress}%`, label: '今日目标完成度', accent: true, delta: progress >= 100 ? '🎉 今日目标已达成！' : '还需写' + (todayTarget - todayDone).toLocaleString() + '字达标', deltaColor: C.crimson },
                  ].map((s, i) => (
                    <div key={i} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontFamily: "'Noto Serif SC',Georgia,serif", fontSize: 22, fontWeight: 700, color: s.accent ? C.pri : C.ink }}>{s.val}</span>
                      <span style={{ fontSize: 10, color: C.muted, letterSpacing: '.04em' }}>{s.label}</span>
                      {s.delta && <span style={{ fontSize: 10, color: s.deltaColor, display: 'flex', alignItems: 'center', gap: 3 }}>{s.delta}</span>}
                    </div>
                  ))}
                </div>
                <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: '18px 16px', background: C.card, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>每日打卡</span>
                    <span style={{ fontSize: 10 }}>本周 {checkinDone ? 5 : 4}/7</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    {days.map((d, i) => {
                      const done = checkinDays[i] || (i === 3 && checkinDone)
                      const today = i === 3 && !checkinDone
                      return (
                        <span key={d} style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, border: `1px solid ${done ? C.pri : today ? C.pri : C.line}`, background: done ? C.pri : C.card, color: done ? '#fff' : today ? C.pri : C.muted, borderWidth: today ? 2 : 1 }}>
                          {d}
                          {done && <span style={{ fontSize: 8, lineHeight: 1 }}>+10</span>}
                          {today && <span style={{ fontSize: 8, lineHeight: 1 }}>+20</span>}
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
                  }} disabled={checkinDone} style={{ fontSize: 12, padding: '8px 0', borderRadius: C.radius, textAlign: 'center', cursor: checkinDone ? 'default' : 'pointer', fontWeight: 600, fontFamily: 'inherit', border: `1px solid ${checkinDone ? C.line : C.pri}`, background: checkinDone ? C.line : C.pri, color: checkinDone ? C.muted : '#fff', minHeight: 36 }}>
                    {checkinDone ? '✔ 已打卡！' : '✔ 今日打卡 · 得20墨点'}
                  </button>
                </div>
              </div>
            </section>

            {/* 写作模板 */}
            <section style={{ marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: C.ink, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 3, height: 16, borderRadius: 2, background: C.pri }} />
                  写作模板
                </h2>
                <Link href="/templates" style={{ fontSize: 12, color: C.muted, textDecoration: 'none' }}>全部模板 ›</Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                {TEMPLATES.map((t, i) => (
                  <article key={i} style={{ border: `1px solid ${C.line}`, borderRadius: 12, overflow: 'hidden', background: C.card, cursor: 'pointer', transition: 'all .12s' }}>
                    <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <span style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, background: t.bg, color: t.color || C.pri }}>{t.icon}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, lineHeight: 1.3, marginBottom: 2 }}>{t.title}</div>
                        <div style={{ fontSize: 10, color: C.muted }}>{t.meta}</div>
                      </div>
                    </div>
                    <div style={{ padding: '0 16px 12px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {t.tags.map(tag => <span key={tag} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: C.sb, color: C.muted }}>{tag}</span>)}
                    </div>
                    <div style={{ padding: '10px 16px', borderTop: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, color: C.muted }}>
                      <span>● {t.author}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{t.uses} 使用</span>
                        <button style={{ fontSize: 10, padding: '4px 12px', border: `1px solid ${C.pri}`, borderRadius: 12, color: C.pri, background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>使用</button>
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* 风云榜 + 创作心得 */}
            <section style={{ marginBottom: 36 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h2 style={{ fontSize: 15, fontWeight: 600, color: C.ink, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 3, height: 16, borderRadius: 2, background: C.pri }} />
                      创作风云榜
                    </h2>
                    <button style={{ fontSize: 12, color: C.muted, background: 'none', border: 'none', cursor: 'pointer' }}>本月 ›</button>
                  </div>
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <tbody>
                      {RANKERS.map((r, i) => (
                        <tr key={i}>
                          <td style={{ width: 32, fontWeight: 700, color: r.top ? C.pri : C.muted, padding: '8px 12px', borderBottom: `1px solid ${C.line}` }}>{i + 1}</td>
                          <td style={{ fontWeight: 500, color: C.ink, padding: '8px 12px', borderBottom: `1px solid ${C.line}` }}>{r.name}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: C.ink, fontFamily: "'Noto Serif SC',Georgia,serif", padding: '8px 12px', borderBottom: `1px solid ${C.line}` }}>{r.words} 字</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h2 style={{ fontSize: 15, fontWeight: 600, color: C.ink, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 3, height: 16, borderRadius: 2, background: C.pri }} />
                      创作心得
                    </h2>
                    <button style={{ fontSize: 12, color: C.muted, background: 'none', border: 'none', cursor: 'pointer' }}>更多 ›</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {TIPS.map((t, i) => (
                      <article key={i} style={{ padding: '12px 16px', border: `1px solid ${C.line}`, borderRadius: 8, background: C.card, cursor: 'pointer', transition: 'all .12s', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: C.ink, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                        <span style={{ fontSize: 10, color: C.muted, flexShrink: 0 }}>{t.date}</span>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,.3)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && setDlgOpen(false)}>
          <div style={{ background: C.card, borderRadius: 16, padding: 32, maxWidth: 560, width: 'calc(100% - 32px)', boxShadow: '0 16px 48px rgba(26,24,20,.12)', display: 'flex', flexDirection: 'column', gap: 20, position: 'relative' }}>
            <button onClick={() => setDlgOpen(false)} aria-label="关闭" style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: '50%', border: 'none', background: C.sb, cursor: 'pointer', fontSize: 16, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            <h3 style={{ fontSize: 18, fontFamily: "'Noto Serif SC',Georgia,serif", fontWeight: 700, color: C.ink }}>一句话生成故事</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>一句话描述你想写的故事</label>
              <textarea value={dlgIdea} onChange={e => setDlgIdea(e.target.value)} maxLength={500} placeholder="一个退隐杀手回到故乡，却发现整座小镇的人都在等他…" style={{ width: '100%', padding: '10px 14px', border: `1px solid ${C.line}`, borderRadius: C.radius, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: C.sb, resize: 'vertical', minHeight: 80, lineHeight: 1.6 }} />
              <span style={{ fontSize: 10, color: C.muted, textAlign: 'right' }}>{dlgIdea.length} / 500</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: '题材', value: dlgGenre, set: setDlgGenre, opts: ['都市', '玄幻', '悬疑', '科幻', '历史', '灵异', '言情', '竞技'] },
                { label: '视角', value: dlgPerspective, set: setDlgPerspective, opts: ['第一人称', '第三人称', '多视角'] },
                { label: '篇幅', value: dlgLength, set: setDlgLength, opts: ['短篇（<2万字）', '中篇（2-8万字）', '长篇连载（>8万字）'] },
                { label: '目标读者', value: dlgAudience, set: setDlgAudience, opts: ['不限', '男性向', '女性向'] },
              ].map(field => (
                <div key={field.label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>{field.label}</label>
                  <select value={field.value} onChange={e => field.set(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: `1px solid ${C.line}`, borderRadius: C.radius, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: C.sb }}>
                    {field.opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: C.radius, background: 'rgba(196,149,106,.04)', border: '1px dashed rgba(196,149,106,.15)' }}>
              <span style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(135deg,${C.pri},${C.priDim})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, color: '#fff' }}>墨</span>
              <span style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>「墨灵」将根据你的设定，自动生成大纲、人物关系和开篇第一章。</span>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={() => setDlgOpen(false)} style={{ fontSize: 12, padding: '7px 18px', borderRadius: 20, border: `1px solid ${C.line}`, background: C.card, cursor: 'pointer', color: C.ink, fontFamily: 'inherit', minHeight: 34 }}>取消</button>
              <button onClick={handleDlgCreate} style={{ fontSize: 12, padding: '7px 18px', borderRadius: 20, background: C.pri, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 500, boxShadow: '0 2px 8px rgba(196,149,106,.15)', fontFamily: 'inherit', minHeight: 34 }}>☙ 开始生成</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
