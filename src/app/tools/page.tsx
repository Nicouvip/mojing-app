'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { PenLine, ShieldCheck, BookOpen, Zap, Lightbulb, FileSearch, Rocket, Brain, Wand2, Search, MessageSquare, Combine, BookMarked, Star } from 'lucide-react'

const tools = [
  // ── 创作前 ──
  { icon: <Lightbulb className="w-6 h-6" />, title: '脑洞喷射', desc: '零门槛脑洞生成器。选一个流派，AI 在 10 秒内给你 5 个让人眼前一亮的故事开篇。', phase: '创作前', color: 'text-orange-600 bg-orange-50', featured: true },
  { icon: <BookOpen className="w-6 h-6" />, title: '书名炼金术', desc: '智能书名策划。输入关键词、风格偏好，AI 生成 20+ 个精选书名，附带数据分析。', phase: '创作前', color: 'text-blue-600 bg-blue-50', featured: true },
  { icon: <Brain className="w-6 h-6" />, title: '灵感爆裂', desc: '深度创意发散引擎。从一个核心设定出发，延展出完整的故事脉络、人物关系和世界观雏形。', phase: '创作前', color: 'text-pink-600 bg-pink-50' },
  { icon: <Combine className="w-6 h-6" />, title: '世界观生成', desc: '构建完整的故事世界：年代、地理、势力、规则、科技树——给几个关键词，AI 帮你搭框架。', phase: '创作前', color: 'text-cyan-600 bg-cyan-50' },

  // ── 创作中 ──
  { icon: <PenLine className="w-6 h-6" />, title: 'AI 续写', desc: '基于前文语境智能续写。支持人称锁定、风格控制、多轮迭代——写不下去就交给 AI。', phase: '创作中', color: 'text-primary bg-primary-light', featured: true },
  { icon: <Wand2 className="w-6 h-6" />, title: 'AI 润色', desc: '文风优化与表达升级。平淡的句子变惊艳，啰嗦的段落变精炼。支持仿写名家风格。', phase: '创作中', color: 'text-purple-600 bg-purple-50', featured: true },
  { icon: <Zap className="w-6 h-6" />, title: 'AI 扩写', desc: '从一句到一段的细节展开。"他推开门" → 三百字的环境描写+心理活动+感官渲染。', phase: '创作中', color: 'text-amber-600 bg-amber-50' },
  { icon: <Search className="w-6 h-6" />, title: 'AI 补全', desc: '写作中途卡壳？AI 分析上下文，自动推荐 3 个合理的续写方向，选一个继续。', phase: '创作中', color: 'text-indigo-600 bg-indigo-50' },
  { icon: <MessageSquare className="w-6 h-6" />, title: '对话生成', desc: '根据角色性格和场景，自动生成符合人设的对话。避免"全员一个说话风格"的尴尬。', phase: '创作中', color: 'text-teal-600 bg-teal-50' },

  // ── 创作后 ──
  { icon: <ShieldCheck className="w-6 h-6" />, title: '合规检测', desc: '过稿级全维度质检。45 项检测维度：敏感词、人设一致性、AI 味浓度、逻辑漏洞、节奏问题。', phase: '创作后', color: 'text-green-600 bg-green-50', featured: true },
  { icon: <FileSearch className="w-6 h-6" />, title: '开篇评分', desc: '黄金三章质量评估。模拟编辑视角，从钩子强度、节奏密度、情绪张力等 8 个维度打分。', phase: '创作后', color: 'text-teal-600 bg-teal-50', featured: true },
  { icon: <Rocket className="w-6 h-6" />, title: '一键发布', desc: '多平台格式适配。番茄、起点、晋江——一次排版，多平台发布，格式零焦虑。', phase: '创作后', color: 'text-indigo-600 bg-indigo-50' },
  { icon: <BookMarked className="w-6 h-6" />, title: '状态快照', desc: '每次修改自动生成版本快照。随时对比回退，再也不怕改废了。', phase: '创作后', color: 'text-rose-600 bg-rose-50' },
  { icon: <Star className="w-6 h-6" />, title: 'AI 审读', desc: '全文审读报告：节奏分析、角色弧光评估、伏笔回收检视——AI 编辑给你一份专业审稿意见。', phase: '创作后', color: 'text-violet-600 bg-violet-50' },
]

export default function ToolsPage() {
  const [selectedTool, setSelectedTool] = useState<number | null>(null)

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
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2">AI 工具广场</h1>
          <p className="text-muted-foreground">把创作流程整理成可复用的写作助手，覆盖从灵感到发布的全链路</p>
        </div>

        {/* 按阶段分组 */}
        {(['创作前', '创作中', '创作后'] as const).map(phase => {
          const phaseTools = tools.filter(t => t.phase === phase)
          const phaseIcon = phase === '创作前' ? <Lightbulb className="w-4 h-4" /> : phase === '创作中' ? <PenLine className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />
          return (
            <div key={phase} className="mb-12 last:mb-0">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 rounded-lg bg-primary-light flex items-center justify-center text-primary">
                  {phaseIcon}
                </div>
                <h2 className="text-base font-semibold">{phase}</h2>
                <span className="text-xs text-muted-foreground">{phaseTools.length} 个工具</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {phaseTools.map((t, i) => (
                  <div key={i}
                    onClick={() => setSelectedTool(selectedTool === i ? null : i)}
                    className={`bg-card rounded-2xl p-5 border border-border shadow-card hover:shadow-hover hover:-translate-y-0.5 transition-all duration-300 ease cursor-pointer group relative ${selectedTool === i ? 'ring-2 ring-primary/30' : ''}`}>
                    {/* Featured 标签 */}
                    {t.featured && (
                      <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">热门</span>
                    )}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${t.color}`}>
                      {t.icon}
                    </div>
                    <h3 className="font-semibold mb-1.5 text-sm">{t.title}</h3>
                    <p className={`text-xs text-muted-foreground leading-relaxed transition-all duration-200 ${selectedTool === i ? '' : 'line-clamp-2'}`}>
                      {t.desc}
                    </p>
                    {selectedTool === i && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <span className="text-xs text-primary font-medium">了解更多 →</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* 底部提示 */}
        <div className="mt-12 bg-primary-light rounded-2xl p-6 border border-primary/10 text-center">
          <p className="text-sm text-primary font-medium" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            所有工具均基于 AI 大模型，点开即可使用。持续更新中，敬请期待更多创作利器。
          </p>
        </div>
      </div>
    </div>
  )
}
