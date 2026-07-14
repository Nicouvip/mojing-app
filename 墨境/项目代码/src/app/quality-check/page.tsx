'use client'
import Link from 'next/link'
import Image from 'next/image'
import { ShieldCheck, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'

export default function QualityCheckPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 h-14 px-6 flex items-center justify-between glass-panel border-b border-border">
        <div className="flex items-center gap-6">
          <Link href="/"><Image src="/assets/brand/mojing-logo-nav.png" alt="墨境" width={160} height={36} className="h-9 w-auto" priority /></Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← 返回首页</Link>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">投稿质检中心</h1>
        <p className="text-muted-foreground mb-8">全维度过稿体检，帮你的作品达到投稿标准</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-card rounded-2xl p-8 border border-border shadow-card text-center">
            <ShieldCheck className="w-16 h-16 mx-auto mb-4 text-primary/30" />
            <h2 className="text-xl font-semibold mb-3">选择作品开始检测</h2>
            <p className="text-sm text-muted-foreground mb-4">从编辑器进入质检，或选择已有作品进行全面体检</p>
            <Link href="/works" className="text-sm text-primary hover:underline">前往我的作品</Link>
          </div>
          <div className="space-y-4">
            {[
              { icon: <CheckCircle className="w-5 h-5" />, title: '合规红线检测', desc: '敏感词/违规内容/低俗风险', status: '已就绪', color: 'text-green-600' },
              { icon: <AlertTriangle className="w-5 h-5" />, title: '开篇质量评估', desc: '黄金三章评分/钩子密度/节奏', status: '即将上线', color: 'text-amber-600' },
              { icon: <RefreshCw className="w-5 h-5" />, title: '人设一致性', desc: '前后章节人物OOC风险检测', status: '即将上线', color: 'text-blue-600' },
            ].map((item, i) => (
              <div key={i} className="bg-card rounded-xl p-5 border border-border shadow-card flex items-center gap-4">
                <div className={item.color}>{item.icon}</div>
                <div className="flex-1"><h3 className="font-medium">{item.title}</h3><p className="text-xs text-muted-foreground">{item.desc}</p></div>
                <span className="text-xs text-muted-foreground">{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
