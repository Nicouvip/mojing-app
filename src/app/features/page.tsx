'use client'
import Link from 'next/link'
import Image from 'next/image'
import { ShieldCheck, PenLine, Sparkles, BookOpen, Palette, FileText } from 'lucide-react'

const features = [
  { icon: <PenLine className="w-8 h-8" />, title: 'AI 续写', desc: '基于前文语境自动续写，支持风格控制与多轮迭代', color: 'bg-primary-light text-primary' },
  { icon: <ShieldCheck className="w-8 h-8" />, title: '合规检测', desc: '45项过稿级质检，覆盖敏感词/人设一致/AI味浓度', color: 'bg-green-50 text-green-600' },
  { icon: <BookOpen className="w-8 h-8" />, title: '人设管理', desc: '人物卡牌+关系图谱，长篇多角色不OOC', color: 'bg-amber-50 text-amber-600' },
  { icon: <Palette className="w-8 h-8" />, title: '四套主题', desc: 'Light/Dark/Warm/Cool 一键切换，全站适配', color: 'bg-purple-50 text-purple-600' },
  { icon: <FileText className="w-8 h-8" />, title: '模板中心', desc: '开箱即用的创作框架，点一下就能开始', color: 'bg-blue-50 text-blue-600' },
  { icon: <Sparkles className="w-8 h-8" />, title: '灵感工具', desc: '脑洞喷射+书名炼金术+灵感爆裂，卡文救星', color: 'bg-orange-50 text-orange-600' },
]

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 h-14 px-6 flex items-center justify-between glass-panel border-b border-border">
        <div className="flex items-center gap-6">
          <Link href="/"><Image src="/assets/brand/mojing-logo-nav.png" alt="墨境" width={160} height={36} className="h-9 w-auto" priority /></Link>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link href="/" className="px-3 py-1.5 rounded-lg hover:bg-secondary hover:text-foreground transition-colors">首页</Link>
            <Link href="/features" className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-medium">产品功能</Link>
          </div>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">为长篇创作而生的效率工具</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">从灵感捕捉到过稿质检，覆盖网文创作全流程。不是替代你的写作，是让你写得更好更快。</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="bg-card rounded-2xl p-8 border border-border shadow-card hover:shadow-hover transition-all duration-300 ease">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 ${f.color}`}>{f.icon}</div>
              <h3 className="text-xl font-semibold mb-3">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
