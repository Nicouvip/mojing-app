'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/db/auth-context'
import Navbar from '@/components/navbar'

export default function HomePage() {
  const router = useRouter()
  const { isLoggedIn } = useAuth()

  // 已登录用户直接进书桌
  useEffect(() => {
    if (isLoggedIn) router.push('/desk')
  }, [isLoggedIn, router])

  // 已登录 → 不渲染首页，等跳转
  if (isLoggedIn) return null

  return (
    <div className="min-h-screen text-foreground font-sans antialiased overflow-x-hidden"
      style={{ background: 'url(/bg-desk.jpg) center/cover no-repeat fixed, linear-gradient(170deg, #f5f2ed 0%, #ece5d8 30%, #e8dfce 60%, #f0ebe2 100%)' }}>

      {/* ═══════════ 顶栏 ═══════════ */}
      <Navbar tall landing hideThemeToggle />

      {/* ═══════════ 首屏 ═══════════ */}
      <section style={{
        position: 'relative', display: 'flex', alignItems: 'center', minHeight: '100vh', overflow: 'hidden',
      }}>
        {/* 坐高凳戴耳机图作为背景层 */}
        <div style={{
          position: 'absolute', inset: 0,
          background: "url('/assets/brand/hero-bg.webp') center/cover no-repeat",
          maskImage: 'linear-gradient(to bottom, #000 0%, #000 70%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 70%, transparent 100%)',
          pointerEvents: 'none',
        }} />
        <div className="relative z-1 px-6" style={{ width: '100%', maxWidth: 1200, margin: '0 auto', padding: '60px 80px 120px' }}>
          <div style={{ maxWidth: 500 }}>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary-light border border-primary/10 text-xs font-medium text-primary mb-6">
              <span className="w-[6px] h-[6px] rounded-full bg-primary animate-pulse" />
              已助 1,200+ 作者完成 4,600+ 章节
            </div>
            <h1 className="text-[clamp(32px,5.5vw,56px)] font-extrabold leading-tight mb-4">
              写网文，<em className="not-italic text-primary">AI 帮你</em>不卡文
            </h1>
            <p className="text-[clamp(14px,1.8vw,17px)] text-muted-foreground max-w-[520px] leading-relaxed mb-8">
              灵感→大纲→正文，一气呵成。卡住了续写，太薄了扩写，写完了引擎扫一眼质量。十版心法，一个按钮。
            </p>
            <div className="flex gap-2.5 flex-wrap justify-start">
              <Link href="/desk" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-white text-sm font-semibold shadow-[0_2px_10px_rgba(196,149,106,0.25)] hover:bg-primary-hover hover:-translate-y-px hover:shadow-[0_4px_18px_rgba(196,149,106,0.35)] transition-all no-underline">
                免费开始写作
              </Link>
              <a href="#pipeline" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-primary/25 text-foreground text-sm font-semibold hover:bg-primary/5 hover:border-primary transition-all no-underline">
                看完整创作流程
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ 编辑器预览 ═══════════ */}
      <div className="relative z-1 max-w-[960px] mx-auto mb-12 px-6">
        <div className="border border-border rounded-xl overflow-hidden bg-card/55 shadow-[0_2px_16px_rgba(26,24,20,0.03)]">
          {/* 窗口顶栏 */}
          <div className="flex items-center gap-[7px] px-3.5 py-2.5 border-b border-border bg-foreground/[0.01]">
            <div className="flex items-center gap-[7px]">
              <span className="w-2 h-2 rounded-full bg-[#d4a0a0]" />
              <span className="w-2 h-2 rounded-full bg-[#c4b888]" />
              <span className="w-2 h-2 rounded-full bg-[#90b090]" />
            </div>
            <span className="text-[11px] text-muted-foreground ml-1.5 truncate">长安不良人 · 第七章 归途</span>
          </div>
          {/* 编辑器布局 */}
          <div className="grid grid-cols-[160px_1fr_180px] max-md:grid-cols-1">
            {/* 左侧章节目录 */}
            <div className="p-2.5 border-r border-border text-[11px] text-muted-foreground max-md:hidden">
              {['长安不良人 · 楔子', '第一章 · 夜雨', '第二章 · 暗桩', '第七章 · 归途'].map((ch, i) => (
                <div key={i} className={`flex items-center gap-1.5 px-1.5 py-1 rounded cursor-pointer truncate ${i === 3 ? 'bg-primary-light text-primary font-semibold' : ''}`}>
                  <span className={`w-3.5 h-3.5 rounded text-[9px] inline-flex items-center justify-center ${i === 3 ? 'bg-primary text-white' : 'bg-foreground/5'}`}>{i + 1}</span>
                  {ch}
                </div>
              ))}
            </div>
            {/* 中间正文 */}
            <div className="p-3.5 text-[13px] leading-relaxed text-foreground/65 font-serif">
              她没敲门。门虚掩着。推开时带进一阵走廊的风，桌上的纸被掀起一角，又落回去。「你来了。」他说得很轻，像怕惊动什么。
            </div>
            {/* 右侧质量面板 */}
            <div className="p-2.5 border-l border-border text-[10px] max-md:hidden">
              <div className="flex justify-between mb-2"><span className="text-muted-foreground">动作描写占比</span><span className="font-semibold">41%</span></div>
              <div className="h-[2px] rounded bg-foreground/5 mb-1.5 overflow-hidden"><div className="h-full w-[41%] bg-[#7a9e7a] rounded" /></div>
              <div className="flex justify-between mb-2"><span className="text-muted-foreground">重复用词</span><span className="font-semibold">1处</span></div>
              <div className="h-[2px] rounded bg-foreground/5 mb-1.5 overflow-hidden"><div className="h-full w-[8%] bg-[#c4a848] rounded" /></div>
              <div className="flex justify-between mb-1"><span className="text-muted-foreground">章节字数</span><span className="font-semibold">2,847</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">待回收伏笔</span><span className="font-semibold">3条</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ 创作流程 ═══════════ */}
      <section id="pipeline" className="relative z-1 max-w-[880px] mx-auto mb-32 px-6 pt-20">
        <h2 className="text-center text-[clamp(18px,2.5vw,24px)] font-bold mb-7">一条线：从脑洞到完稿</h2>
        <div className="flex items-start justify-center gap-0 flex-wrap max-md:flex-col max-md:items-center max-md:gap-3">
          {[
            { n: 1, label: '脑洞喷射', sub: '输入关键词，出5-10个故事脑洞' },
            { n: 2, label: '灵感爆裂', sub: '选一个脑洞深度发散' },
            { n: 3, label: '灵感引擎', sub: '孵化成完整故事框架' },
            { n: 4, label: '书名炼金', sub: '生成匹配题材的书名' },
            { n: 5, label: '写作工作台', sub: 'AI写正文，引擎守质量', active: true },
          ].map((step, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 px-2.5">
              {i > 0 && <span className="text-base text-border mt-2 mx-1 max-md:rotate-90">→</span>}
              <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-bold ${step.active ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground bg-background'}`}>
                {step.n}
              </div>
              <span className="text-sm font-semibold text-foreground">{step.label}</span>
              <span className="text-[10px] text-muted-foreground text-center max-w-[90px]">{step.sub}</span>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link href="/desk" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-white text-sm font-semibold shadow-[0_2px_10px_rgba(196,149,106,0.25)] hover:bg-primary-hover transition-all no-underline">
            免费开始写作
          </Link>
        </div>
      </section>

      {/* ═══════════ 写作引擎 ═══════════ */}
      <section id="features" className="relative z-1 max-w-[960px] mx-auto px-6 pb-24 pt-20">
        <div className="text-center mb-9">
          <h2 className="text-[clamp(20px,3vw,28px)] font-bold mb-2">写的时候，引擎帮你看什么</h2>
          <p className="text-sm text-muted-foreground max-w-[500px] mx-auto">十版心法迭代，变成八个实时检查项。每写完一段，自动扫。</p>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3">
          {[
            { icon: '✍️', title: '用身体写情绪', desc: '不会写"她很生气"——写攥紧的拳头、加速的呼吸、咬住的嘴唇。' },
            { icon: '⚡', title: '开篇见冲突', desc: '每章开头必须有动作或悬念。前三章要求更严——网文读者没有耐心。' },
            { icon: '🎭', title: '套路不重复', desc: '上章视觉开场，这章换听觉。引擎记着你的技法库，保持新鲜感。' },
            { icon: '🔪', title: '写了动作别解释', desc: '动作句禁止接"因为""他意识到"。话少，力量大。' },
          ].map((card, i) => (
            <div key={i} className="p-6 border border-border rounded-lg bg-card/40 hover:border-primary/15 hover:shadow-[0_2px_12px_rgba(26,24,20,0.02)] transition-all">
              <div className="text-xl mb-2.5">{card.icon}</div>
              <h3 className="text-sm font-semibold mb-1.5">{card.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link href="/desk" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-white text-sm font-semibold shadow-[0_2px_10px_rgba(196,149,106,0.25)] hover:bg-primary-hover transition-all no-underline">
            免费开始写作
          </Link>
        </div>
      </section>

      {/* ═══════════ 方案价格 ═══════════ */}
      <section id="pricing" className="relative z-1 max-w-[960px] mx-auto px-6 pb-24 pt-20 text-center">
        <h2 className="text-[clamp(20px,3vw,28px)] font-bold mb-2">所有方案都带完整引擎</h2>
        <p className="text-sm text-muted-foreground mb-8">差别只在 AI 调用次数。合规引擎、冷却矩阵、章末自检——全部方案标配。</p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3 max-w-[800px] mx-auto">
          {[
            { name: '初墨', amt: '免费', desc: '每天20次 AI 调用。够写完一章，跑一遍自检。', feats: ['完整合规引擎', '四阶段工作流', '最多3部作品', '基础角色管理', '章末自检报告'], popular: false },
            { name: '入墨', amt: '¥29', sub: '/月', coming: true, desc: '每天200次。日更两章也够用。', feats: ['完整合规引擎', '四阶段工作流', '无限作品', '冷却矩阵可视化', '角色@上下文注入', '优先级 AI 响应'], popular: true },
            { name: '醉墨', amt: '¥79', sub: '/月', coming: true, desc: '每天1000次。批量生成章节。', feats: ['完整合规引擎', '批量章节生成', '自定义规则集', 'API 接口访问', '优先技术支持', '导出 EPUB/PDF'], popular: false },
          ].map((plan, i) => (
            <div key={i} className={`relative p-[26px_20px] border rounded-lg bg-card/40 text-left transition-all hover:border-primary/20 ${plan.popular ? 'border-primary border-2' : 'border-border'}`}>
              {plan.popular && <span className="absolute -top-[9px] left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">推荐</span>}
              <div className="text-sm font-semibold mb-2.5">{plan.name}</div>
              <div className="text-[30px] font-extrabold mb-0.5">{plan.amt}<sub className="text-xs font-normal text-muted-foreground">{plan.sub}</sub></div>
              <div className="text-[11px] text-muted-foreground mb-3.5">{plan.desc}</div>
              <ul className="list-none text-xs leading-8 text-foreground mb-4">
                {plan.feats.map((f, j) => <li key={j} className="before:content-['✓_'] before:text-primary before:font-bold">{f}</li>)}
              </ul>
              {(plan as any).coming ? (
                <span className="inline-flex items-center justify-center w-full px-6 py-3 rounded-lg text-sm font-semibold border border-dashed border-muted-foreground/30 text-muted-foreground/60 cursor-default">
                  即将上线
                </span>
              ) : (
                <Link href="/desk"
                  className={`inline-flex items-center justify-center w-full gap-2 px-6 py-3 rounded-lg text-sm font-semibold no-underline transition-all ${(plan as any).popular ? 'bg-primary text-white shadow-[0_2px_10px_rgba(196,149,106,0.25)] hover:bg-primary-hover' : 'border border-primary/25 text-foreground hover:bg-primary/5 hover:border-primary'}`}>
                  {plan.name === '初墨' ? '免费开始' : '立即使用'}
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ 结尾 CTA ═══════════ */}
      <section className="relative z-1 text-center px-6 pb-20">
        <h2 className="text-[clamp(20px,3vw,28px)] font-bold mb-2.5">输入一个关键词，AI 出脑洞</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-[480px] mx-auto">选一个喜欢的，让 AI 写第一章。写完了，引擎帮你扫一眼。你只管做决定。</p>
        <Link href="/desk" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-white text-sm font-semibold shadow-[0_2px_10px_rgba(196,149,106,0.25)] hover:bg-primary-hover hover:-translate-y-px hover:shadow-[0_4px_18px_rgba(196,149,106,0.35)] transition-all no-underline">
          免费开始写作
        </Link>
      </section>

      {/* ═══════════ 页脚 ═══════════ */}
      <footer className="border-t border-border px-[clamp(16px,4vw,32px)] py-6 flex justify-between flex-wrap gap-3 text-[11px] text-muted-foreground items-center">
        <span className="flex items-center gap-2 flex-wrap">
          <strong>墨境 MoJing</strong> · 十版心法，一个按钮 · 沪ICP备2024000001号
        </span>
        <span className="flex items-center gap-1 flex-wrap">
          <a href="mailto:hello@inkrealm.cn" className="text-muted-foreground hover:text-foreground no-underline px-2 py-1.5 rounded">hello@inkrealm.cn</a>
          <button type="button" className="text-muted-foreground hover:text-foreground px-2 py-1.5 rounded bg-none border-none cursor-pointer font-sans text-[11px]">帮助中心</button>
          <button type="button" className="text-muted-foreground hover:text-foreground px-2 py-1.5 rounded bg-none border-none cursor-pointer font-sans text-[11px]">用户协议</button>
          <button type="button" className="text-muted-foreground hover:text-foreground px-2 py-1.5 rounded bg-none border-none cursor-pointer font-sans text-[11px]">隐私政策</button>
        </span>
      </footer>
    </div>
  )
}
