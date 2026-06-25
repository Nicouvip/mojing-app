'use client'
import Link from 'next/link'
import Image from 'next/image'
import { Sparkles, PenLine, ShieldCheck, BookOpen, Zap, Lightbulb, FileSearch, Rocket, Brain } from 'lucide-react'

const tools = [
  { icon: <PenLine className="w-6 h-6" />, title: 'AI 续写', desc: '基于前文语境智能续写', phase: '创作中', color: 'text-primary bg-primary-light' },
  { icon: <Sparkles className="w-6 h-6" />, title: 'AI 润色', desc: '文风优化与表达升级', phase: '创作中', color: 'text-purple-600 bg-purple-50' },
  { icon: <Zap className="w-6 h-6" />, title: 'AI 扩写', desc: '从一句到一段的细节展开', phase: '创作中', color: 'text-amber-600 bg-amber-50' },
  { icon: <Lightbulb className="w-6 h-6" />, title: '脑洞喷射', desc: '零门槛脑洞生成器', phase: '创作前', color: 'text-orange-600 bg-orange-50' },
  { icon: <BookOpen className="w-6 h-6" />, title: '书名炼金术', desc: '智能书名策划', phase: '创作前', color: 'text-blue-600 bg-blue-50' },
  { icon: <Brain className="w-6 h-6" />, title: '灵感爆裂', desc: '深度创意发散引擎', phase: '创作前', color: 'text-pink-600 bg-pink-50' },
  { icon: <ShieldCheck className="w-6 h-6" />, title: '合规检测', desc: '过稿级全维度质检', phase: '创作后', color: 'text-green-600 bg-green-50' },
  { icon: <FileSearch className="w-6 h-6" />, title: '开篇评分', desc: '黄金三章质量评估', phase: '创作后', color: 'text-teal-600 bg-teal-50' },
  { icon: <Rocket className="w-6 h-6" />, title: '一键发布', desc: '多平台格式适配', phase: '创作后', color: 'text-indigo-600 bg-indigo-50' },
]

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 h-14 px-6 flex items-center justify-between glass-panel border-b border-border">
        <div className="flex items-center gap-6">
          <Link href="/dashboard"><Image src="/assets/brand/mojing-logo-nav.png" alt="墨境" width={160} height={36} className="h-9 w-auto" priority /></Link>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link href="/dashboard" className="px-3 py-1.5 rounded-lg hover:bg-secondary hover:text-foreground transition-colors">工作台</Link>
            <Link href="/tools" className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-medium">工具广场</Link>
          </div>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-2">AI 工具广场</h1>
        <p className="text-muted-foreground mb-2">把创作流程整理成可复用的写作助手</p>
        {/* 按阶段分组 */}
        {['创作前', '创作中', '创作后'].map(phase => {
          const phaseTools = tools.filter(t => t.phase === phase)
          return (
            <div key={phase} className="mb-10">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">{phase}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {phaseTools.map((t, i) => (
                  <div key={i} className="bg-card rounded-2xl p-5 border border-border shadow-card hover:shadow-hover transition-all duration-300 ease cursor-pointer group">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${t.color}`}>{t.icon}</div>
                    <h3 className="font-semibold mb-1">{t.title}</h3>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
