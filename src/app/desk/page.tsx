'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getProjects } from '@/lib/db/store'
import type { Project } from '@/lib/db/types'
import { Sparkles, PenLine, ChevronRight } from 'lucide-react'
import { BrainstormModal } from '@/components/brainstorm-modal'

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
  const todayDone = 800
  const todayTarget = 2000
  const progress = Math.min(100, Math.round((todayDone / todayTarget) * 100))

  return (
    <div className="min-h-screen bg-background font-serif">
      {/* ===== 顶栏 ===== */}
      <nav className="sticky top-0 z-50 h-14 px-6 flex items-center justify-between glass-panel border-b border-border">
        <div className="flex items-center gap-6">
          <Image src="/assets/brand/mojing-logo-nav.png" alt="墨境" width={160} height={36} className="h-9 w-auto" priority />
          <span className="text-sm font-medium text-foreground">书桌式</span>
          <div className="w-32 h-2 bg-primary-light rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← 工作台</Link>
        </div>
      </nav>

      {/* ===== 主体 ===== */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-3 font-serif">我的书桌</h1>
          <p className="text-lg text-muted-foreground font-serif italic">案上的每一本书，都是你正在编织的世界</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ===== 左 + 中：扇形书架 ===== */}
          <div className="lg:col-span-2">
            <div className="book-perspective h-[420px] flex items-end justify-center relative">
              {/* 书1: -35deg */}
              <div className={`book-item absolute w-28 h-80 rounded-sm shadow-md cursor-pointer transition-all duration-300`}
                style={{ transform: 'rotateY(-35deg)', left: 'calc(50% - 336px)', zIndex: 4 }}
                onClick={() => books[0] && router.push(`/editor/${books[0].id}`)}
              >
                <div className="w-full h-full rounded-sm border border-border/50 flex flex-col p-4">
                  <div className="text-xs opacity-70">01</div>
                  <div className="mt-auto">
                    <div className="font-medium text-sm" style={{ fontFamily: "'Noto Serif SC', serif" }}>{books[0]?.name || '空书位'}</div>
                    <div className="text-xs mt-1 opacity-60">{books[0] ? `${((books[0].totalWords || 0) / 10000).toFixed(1)}万字` : '—'}</div>
                  </div>
                </div>
              </div>
              {/* 书2: -25deg */}
              <div className={`book-item dark absolute w-28 h-80 rounded-sm shadow-md cursor-pointer transition-all duration-300`}
                style={{ transform: 'rotateY(-25deg)', left: 'calc(50% - 246px)', zIndex: 5 }}
                onClick={() => books[1] && router.push(`/editor/${books[1].id}`)}
              >
                <div className="w-full h-full rounded-sm border border-border/50 flex flex-col p-4">
                  <div className="text-xs opacity-70">02</div>
                  <div className="mt-auto">
                    <div className="font-medium text-sm" style={{ fontFamily: "'Noto Serif SC', serif" }}>{books[1]?.name || '空书位'}</div>
                    <div className="text-xs mt-1 opacity-60">{books[1] ? `${((books[1].totalWords || 0) / 10000).toFixed(1)}万字` : '—'}</div>
                  </div>
                </div>
              </div>
              {/* 书3: -12deg */}
              <div className={`book-item dark absolute w-28 h-80 rounded-sm shadow-md cursor-pointer transition-all duration-300`}
                style={{ transform: 'rotateY(-12deg)', left: 'calc(50% - 151px)', zIndex: 6 }}
                onClick={() => books[2] && router.push(`/editor/${books[2].id}`)}
              >
                <div className="w-full h-full rounded-sm border border-border/50 flex flex-col p-4">
                  <div className="text-xs opacity-70">03</div>
                  <div className="mt-auto">
                    <div className="font-medium text-sm" style={{ fontFamily: "'Noto Serif SC', serif" }}>{books[2]?.name || '空书位'}</div>
                    <div className="text-xs mt-1 opacity-60">{books[2] ? `${((books[2].totalWords || 0) / 10000).toFixed(1)}万字` : '—'}</div>
                  </div>
                </div>
              </div>
              {/* 书4: 0deg 中心苔绿 */}
              <div className="book-item primary absolute w-28 h-80 rounded-sm shadow-md cursor-pointer transition-all duration-300"
                style={{ transform: 'rotateY(0deg)', left: 'calc(50% - 56px)', zIndex: 10 }}
                onClick={() => books[3] && router.push(`/editor/${books[3].id}`)}
              >
                <div className="w-full h-full rounded-sm border border-border/50 flex flex-col p-4">
                  <div className="text-xs text-white/70">04</div>
                  <div className="mt-auto">
                    <div className="font-medium text-sm text-white" style={{ fontFamily: "'Noto Serif SC', serif" }}>{books[3]?.name || '空书位'}</div>
                    <div className="text-xs mt-1 text-white/60">{books[3] ? `${((books[3].totalWords || 0) / 10000).toFixed(1)}万字` : '—'}</div>
                  </div>
                </div>
              </div>
              {/* 书5: 12deg */}
              <div className={`book-item dark absolute w-28 h-80 rounded-sm shadow-md cursor-pointer transition-all duration-300`}
                style={{ transform: 'rotateY(12deg)', left: 'calc(50% + 39px)', zIndex: 6 }}
                onClick={() => books[4] && router.push(`/editor/${books[4].id}`)}
              >
                <div className="w-full h-full rounded-sm border border-border/50 flex flex-col p-4">
                  <div className="text-xs opacity-70">05</div>
                  <div className="mt-auto">
                    <div className="font-medium text-sm" style={{ fontFamily: "'Noto Serif SC', serif" }}>{books[4]?.name || '空书位'}</div>
                    <div className="text-xs mt-1 opacity-60">{books[4] ? `${((books[4].totalWords || 0) / 10000).toFixed(1)}万字` : '—'}</div>
                  </div>
                </div>
              </div>
              {/* 书6: 25deg */}
              <div className={`book-item dark absolute w-28 h-80 rounded-sm shadow-md cursor-pointer transition-all duration-300`}
                style={{ transform: 'rotateY(25deg)', left: 'calc(50% + 134px)', zIndex: 5 }}
                onClick={() => books[5] && router.push(`/editor/${books[5].id}`)}
              >
                <div className="w-full h-full rounded-sm border border-border/50 flex flex-col p-4">
                  <div className="text-xs opacity-70">06</div>
                  <div className="mt-auto">
                    <div className="font-medium text-sm" style={{ fontFamily: "'Noto Serif SC', serif" }}>{books[5]?.name || '空书位'}</div>
                    <div className="text-xs mt-1 opacity-60">{books[5] ? `${((books[5].totalWords || 0) / 10000).toFixed(1)}万字` : '—'}</div>
                  </div>
                </div>
              </div>
              {/* 书7: 35deg */}
              <div className={`book-item absolute w-28 h-80 rounded-sm shadow-md cursor-pointer transition-all duration-300`}
                style={{ transform: 'rotateY(35deg)', left: 'calc(50% + 224px)', zIndex: 4 }}
                onClick={() => books[6] && router.push(`/editor/${books[6].id}`)}
              >
                <div className="w-full h-full rounded-sm border border-border/50 flex flex-col p-4">
                  <div className="text-xs opacity-70">07</div>
                  <div className="mt-auto">
                    <div className="font-medium text-sm" style={{ fontFamily: "'Noto Serif SC', serif" }}>{books[6]?.name || '空书位'}</div>
                    <div className="text-xs mt-1 opacity-60">{books[6] ? `${((books[6].totalWords || 0) / 10000).toFixed(1)}万字` : '—'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===== 右侧：灵感推荐 + 脑洞喷射 ===== */}
          <div className="space-y-4">
            <div className="bg-card rounded-2xl p-6 border border-border shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-4 font-serif">今日灵感推荐</h3>
              <div className="space-y-3">
                <div className="p-3 bg-secondary rounded-xl text-xs text-muted-foreground leading-relaxed font-serif">
                  "尝试用嗅觉描写开场——雨后的街道，潮湿的泥土混合着远处飘来的炊烟"
                </div>
                <div className="p-3 bg-secondary rounded-xl text-xs text-muted-foreground leading-relaxed font-serif">
                  "给反派一个让读者犹豫的理由：他不是纯粹的恶，只是做出了不同的选择"
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
