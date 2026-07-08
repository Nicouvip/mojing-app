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
          <div className="lg:col-span-2">
            {bookCount > 3 ? (
            /* 7角度扇形布局（4本以上） */
            <div className="book-perspective h-[420px] flex items-end justify-center relative">
              {[
                { deg: -35, left: 'calc(50% - 336px)', z: 4, cls: '' },
                { deg: -25, left: 'calc(50% - 246px)', z: 5, cls: 'dark' },
                { deg: -12, left: 'calc(50% - 151px)', z: 6, cls: 'dark' },
                { deg: 0, left: 'calc(50% - 56px)', z: 10, cls: 'primary' },
                { deg: 12, left: 'calc(50% + 39px)', z: 6, cls: 'dark' },
                { deg: 25, left: 'calc(50% + 134px)', z: 5, cls: 'dark' },
                { deg: 35, left: 'calc(50% + 224px)', z: 4, cls: '' },
              ].map((pos, i) => (
                <div key={i}
                  className={`book-item ${pos.cls} absolute w-28 h-80 rounded-sm shadow-md cursor-pointer transition-all duration-300`}
                  style={{ transform: `rotateY(${pos.deg}deg)`, left: pos.left, zIndex: pos.z }}
                  onClick={() => books[i] && router.push(`/editor/${books[i].id}`)}
                >
                  <div className="w-full h-full rounded-sm border border-border/50 flex flex-col p-4">
                    <div className="text-xs opacity-70">{String(i+1).padStart(2,'0')}</div>
                    <div className="mt-auto">
                      <div className="font-medium text-sm" style={{ fontFamily: "'Noto Serif SC', serif" }}>{books[i]?.name || '空书位'}</div>
                      <div className="text-xs mt-1 opacity-60">{books[i] ? `${((books[i].totalWords || 0) / 10000).toFixed(1)}万字` : '—'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            ) : (
            /* 少书模式（≤3本）：居中紧凑排列 */
            <div className="h-[420px] flex items-end justify-center gap-6 pb-8">
              {bookCount > 0 ? books.map((book, i) => (
                <div key={book.id}
                  className="book-item w-32 h-80 rounded-sm shadow-md cursor-pointer transition-all duration-300"
                  style={{ transform: `rotateY(${(i - (bookCount-1)/2) * 12}deg)`, zIndex: 10 - i }}
                  onClick={() => router.push(`/editor/${book.id}`)}
                >
                  <div className="w-full h-full rounded-sm border border-border/50 flex flex-col p-4">
                    <div className="text-xs opacity-70">{String(i+1).padStart(2,'0')}</div>
                    <div className="mt-auto">
                      <div className="font-medium text-sm" style={{ fontFamily: "'Noto Serif SC', serif" }}>{book.name}</div>
                      <div className="text-xs mt-1 opacity-60">{((book.totalWords || 0) / 10000).toFixed(1)}万字</div>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center text-muted-foreground animate-[desk-breathe_3s_ease-in-out_infinite]">
                  <p className="text-2xl font-serif italic mb-2">案头尚无字，待君著新篇</p>
                  <p className="text-sm">点击上方「新建作品」开始写作</p>
                </div>
              )}
            </div>
            )}
          </div>

          {/* ===== 右侧：灵感推荐 + 脑洞喷射 ===== */}
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
