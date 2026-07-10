'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getProjects } from '@/lib/db/store'
import type { Project } from '@/lib/db/types'
import { Sparkles, PenLine, ChevronRight } from 'lucide-react'
import { BrainstormModal } from '@/components/brainstorm-modal'
import Navbar from '@/components/navbar'

export default function DeskPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [showBrainstorm, setShowBrainstorm] = useState(false)
  const [bsGenre, setBsGenre] = useState('都市')
  const [bsResult, setBsResult] = useState('')
  const [bsLoading, setBsLoading] = useState(false)

  const handleBrainstorm = async () => {
    setBsLoading(true); setBsResult('')
    try {
      const res = await fetch('/api/ai/brainstorm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ genre: bsGenre }) })
      const d = await res.json()
      setBsResult(d.ideas || d.error || '生成失败')
    } catch { setBsResult('请求失败') }
    finally { setBsLoading(false) }
  }

  useEffect(() => { setProjects(getProjects()) }, [])

  const books = projects.slice(0, 7)
  const bookCount = books.length
  const todayDone = 800
  const todayTarget = 2000
  const progress = Math.min(100, Math.round((todayDone / todayTarget) * 100))

  return (
    <div className="min-h-screen bg-background font-serif">
      <Navbar />

      {/* ===== 进度条 ===== */}
      <div className="max-w-7xl mx-auto px-6 pt-4 flex items-center gap-3">
        <span className="text-sm font-medium text-foreground">✍️ 今日写作</span>
        <div className="flex-1 max-w-xs h-2 bg-primary-light rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs text-muted-foreground">{todayDone}/{todayTarget}</span>
      </div>

      {/* ===== 主体 ===== */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-3 font-serif">我的书桌</h1>
          <p className="text-lg text-muted-foreground font-serif italic">案上的每一本书，都是你正在编织的世界</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ===== 左 + 中：扇形书架 ===== */}

          {/* ===== 左 + 中：层叠书架 ===== */}
          <div className="lg:col-span-2">
            {bookCount > 0 ? (
            <div className="relative h-[340px] flex items-end justify-center" style={{ perspective: '1200px', perspectiveOrigin: 'center bottom' }}>
              {(() => {
                const colors = [
                  { bg: 'linear-gradient(150deg, #4a3028, #6a4a3e 40%, #5a3a30)', fg: '#f0e8d8' },
                  { bg: 'linear-gradient(145deg, #2a3848, #3a4e5c 45%, #304050)', fg: '#dce4ec' },
                  { bg: 'linear-gradient(160deg, #3a5040, #5a6e5e 45%, #4a604e)', fg: '#e0ece0' },
                  { bg: 'linear-gradient(150deg, #4a2a2e, #6a3a3e 40%, #5a3034)', fg: '#f8ece8' },
                  { bg: 'linear-gradient(145deg, #3a3836, #504a3e 35%, #423e3a)', fg: '#e8e6e2' },
                  { bg: 'linear-gradient(150deg, #3a2e38, #503e48 40%, #42303e)', fg: '#ece0e8' },
                ]
                const positions = [
                  { x: -210, r: -14, z: 1 },
                  { x: -135, r: -8, z: 2 },
                  { x: -50, r: -2, z: 3 },
                  { x: 50, r: 5, z: 5 },
                  { x: 135, r: 10, z: 4 },
                  { x: 210, r: 16, z: 3 },
                ]
                return books.slice(0, 6).map((book, i) => {
                  const c = colors[i % colors.length]
                  const p = positions[i]
                  const isMain = i === 3
                  return (
                    <div key={book.id}
                      className="group absolute bottom-0 cursor-pointer"
                      style={{
                        width: 148, height: 200,
                        borderRadius: '4px 12px 12px 4px',
                        transform: `translateX(${p.x}px) rotate(${p.r}deg)`,
                        transformOrigin: 'center bottom',
                        zIndex: p.z,
                        background: c.bg, color: c.fg,
                        boxShadow: isMain ? '0 6px 24px rgba(196,149,106,0.12), 0 1px 3px rgba(0,0,0,0.06)' : undefined,
                        transition: 'transform 0.45s cubic-bezier(0.25,1,0.5,1), box-shadow 0.45s ease, filter 0.45s ease',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = `translateX(${p.x}px) rotate(${p.r}deg) translateY(-10px) scale(1.03)`
                        e.currentTarget.style.zIndex = '20'
                        e.currentTarget.style.boxShadow = '0 16px 40px rgba(196,149,106,0.18), 0 4px 12px rgba(0,0,0,0.08)'
                        e.currentTarget.style.filter = 'brightness(1.08)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = `translateX(${p.x}px) rotate(${p.r}deg)`
                        e.currentTarget.style.zIndex = String(p.z)
                        e.currentTarget.style.boxShadow = isMain ? '0 6px 24px rgba(196,149,106,0.12), 0 1px 3px rgba(0,0,0,0.06)' : ''
                        e.currentTarget.style.filter = ''
                      }}
                      onClick={() => router.push(`/editor/${book.id}`)}
                    >
                      {isMain && (
                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: 'linear-gradient(to bottom, rgba(196,149,106,0.4), rgba(196,149,106,0.05))', borderRadius: '4px 0 0 4px' }} />
                      )}
                      <div style={{ position: 'relative', zIndex: 1, padding: '16px 14px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 9, letterSpacing: '0.12em', opacity: 0.5, marginBottom: 6 }}>{book.genre || '未分类'}</span>
                        <span style={{ fontFamily: "'Noto Serif SC', serif", fontSize: 18, fontWeight: 700, lineHeight: 1.25 }}>{book.name}</span>
                        <span style={{ marginTop: 'auto', fontSize: 9, opacity: 0.4 }}>{book.chapterCount || 0}章 · {(book.totalWords || 0) >= 10000 ? ((book.totalWords||0)/10000).toFixed(1)+'万字' : (book.totalWords||0)+'字'}</span>
                      </div>
                    </div>
                  )
                })
              })()}
              {/* 桌面线 */}
              <div style={{ position: 'absolute', bottom: 0, left: '5%', right: '5%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(196,149,106,0.12) 30%, rgba(196,149,106,0.18) 50%, rgba(196,149,106,0.12) 70%, transparent)' }} />
            </div>
            ) : (
            <div className="h-[340px] flex items-center justify-center">
              <div className="text-center text-muted-foreground opacity-40" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                <p className="text-2xl italic mb-3">案头尚无字，待君著新篇</p>
                <p className="text-sm">点击右上角「开始创作」写下第一个字</p>
              </div>
            </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-card rounded-2xl p-6 border border-border shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-4 font-serif">今日灵感推荐</h3>
              <div className="space-y-3">
                <div className="p-3 bg-secondary rounded-xl text-xs text-muted-foreground leading-relaxed font-serif">
                  &ldquo;尝试用嗅觉描写开场——雨后的街道，潮湿的泥土混合着远处飘来的炊烟&rdquo;
                </div>
                <div className="p-3 bg-secondary rounded-xl text-xs text-muted-foreground leading-relaxed font-serif">
                  &ldquo;给反派一个让读者犹豫的理由：他不是纯粹的恶，只是做出了不同的选择&rdquo;
                </div>
              </div>
            </div>
            <button onClick={() => setShowBrainstorm(true)}
              className="w-full bg-card rounded-2xl p-6 border border-border shadow-card hover:shadow-hover hover:-translate-y-0.5 transition-all duration-200 text-center group">
              <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/10 transition-colors">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-1 font-serif">脑洞喷射</h3>
              <p className="text-xs text-muted-foreground font-serif">没有灵感？让 AI 帮你开个头</p>
              <ChevronRight className="w-4 h-4 text-primary mt-2 mx-auto opacity-0 group-hover:opacity-100 transition-all duration-200" />
            </button>

            {/* 层叠书页装饰 */}
            <div className="relative h-12">
              {[0, 1, 2, 3].map(i => (
                <div key={i}
                  className="stack-page absolute bottom-0 rounded-lg bg-card border border-border/50 shadow-sm"
                  style={{
                    width: `calc(100% - ${i * 14}px)`,
                    height: `calc(100% - ${i * 4}px)`,
                    left: `${i * 7}px`,
                    opacity: 1 - i * 0.2,
                    zIndex: 4 - i,
                    transition: 'opacity 0.3s ease',
                  }} />
              ))}
            </div>
          </div>
        </div>

        {/* ===== 底部：本周创作数据 ===== */}
        <div className="mt-12 bg-primary rounded-2xl p-8 text-white shadow-modal overflow-hidden relative">
          {/* 右侧层叠装饰 */}
          <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
            {[0, 1, 2].map(i => (
              <div key={i} className="absolute bottom-0 right-0 rounded-md bg-white"
                style={{
                  width: '80px', height: '100px',
                  transform: `rotate(${i * 8 - 8}deg)`,
                  zIndex: 3 - i,
                  right: `${i * 6}px`,
                }} />
            ))}
          </div>

          <h2 className="text-xl font-semibold mb-6 relative z-10 font-serif">本周创作数据</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
            {[
              { label: '连续写作', value: '12 天' },
              { label: '本周总字数', value: '1.2 万' },
              { label: '平均时速', value: '1,860 字' },
              { label: '今日进度', value: `${progress}%` },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <p className="text-sm text-white/60 mb-1 font-serif">{item.label}</p>
                <p className="text-2xl font-bold font-serif" style={{ fontFamily: "'Noto Serif SC', serif" }}>{item.value}</p>
              </div>
            ))}
          </div>
          {/* 分页圆点 + 右侧层叠装饰 */}
          <div className="flex justify-center gap-2 mt-6 relative z-10">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === 0 ? 'bg-white scale-125' : 'bg-white/30'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* BrainstormModal */}
      <BrainstormModal show={showBrainstorm} onClose={() => setShowBrainstorm(false)} bsGenre={bsGenre} onGenreChange={setBsGenre} onGenerate={handleBrainstorm} bsLoading={bsLoading} bsResult={bsResult} />
    </div>
  )
}
