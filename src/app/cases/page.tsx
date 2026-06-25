'use client'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

const cases = [
  { id: 1, title: '《长安夜行人》', genre: '悬疑古风', desc: '通过 AI 续写+合规检测，完成 32 章 12.8 万字长篇，过稿番茄小说', before: '大理寺少卿萧珩接下一桩离奇命案', after: '雨夜，大理寺少卿萧珩蹲在血迹斑斑的青石板上，指尖触到一枚刻着兰花纹的玉扣。他抬起头，望向街角那间从未亮过灯的纸扎铺——门，虚掩着。' },
  { id: 2, title: '《星际拾荒者》', genre: '科幻末世', desc: '使用人设管理+世界观库构建完整科幻宇宙，获起点科幻频道推荐', before: '主角在废船中发现神秘信号', after: '头盔里的氧气还有最后四分钟。陈渡的手指在布满锈迹的操作台上飞快跳跃，废弃空间站的深处，那个每隔七秒闪烁一次的信号，频率越来越快——像心跳。' },
  { id: 3, title: '《市井诡事录》', genre: '都市灵异', desc: '用灵感爆裂生成 20 个单元故事灵感，用模板中心搭建系列框架', before: '主角在老街开了一家照相馆', after: '老街的尽头，楚辞的照相馆开了整一年。直到那个穿红嫁衣的女人出现在取景框里——她的影子，朝向和所有人都相反。' },
]

export default function CasesPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 h-14 px-6 flex items-center justify-between glass-panel border-b border-border">
        <div className="flex items-center gap-6">
          <Link href="/"><Image src="/assets/brand/mojing-logo-nav.png" alt="墨境" width={160} height={36} className="h-9 w-auto" priority /></Link>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link href="/" className="px-3 py-1.5 rounded-lg hover:bg-secondary hover:text-foreground transition-colors">首页</Link>
            <Link href="/cases" className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-medium">写作案例</Link>
          </div>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-2">写作案例</h1>
        <p className="text-muted-foreground mb-8">看看其他作者如何用墨境写出精彩故事</p>
        <div className="space-y-6">
          {cases.map(c => (
            <div key={c.id} className="bg-card rounded-2xl p-8 border border-border shadow-card">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold mb-1">{c.title}</h3>
                  <span className="inline-block px-3 py-1 bg-primary-light text-primary text-xs rounded-full">{c.genre}</span>
                </div>
                <span className="text-xs text-muted-foreground">{c.desc}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-2">写作前</p>
                  <div className="bg-background rounded-xl p-4 text-sm text-muted-foreground italic">{c.before}</div>
                </div>
                <div>
                  <p className="text-xs text-primary font-medium mb-2">经 AI 润色后</p>
                  <div className="bg-primary-light rounded-xl p-4 text-sm leading-relaxed" style={{ fontFamily: "'Noto Serif SC', serif" }}>{c.after}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
