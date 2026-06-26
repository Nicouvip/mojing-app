'use client'
import Link from 'next/link'
import Image from 'next/image'
import { ShieldCheck, PenLine, Sparkles, BookOpen, Palette, FileText, Brain, Search, Users, Wand2, BookMarked } from 'lucide-react'

interface FeatureGroup {
  title: string
  desc: string
  items: { icon: React.ReactNode; title: string; desc: string; color: string; tag?: string }[]
}

const featureGroups: FeatureGroup[] = [
  {
    title: 'AI 写作引擎',
    desc: '基于大语言模型深度调优，为网文创作场景量身打造',
    items: [
      { icon: <PenLine className="w-7 h-7" />, title: 'AI 续写', desc: '基于前文语境自动续写，支持风格控制、人称锁定、多轮迭代。给三句话，还你三千字。', color: 'bg-primary-light text-primary', tag: '核心' },
      { icon: <Wand2 className="w-7 h-7" />, title: 'AI 润色', desc: '文风优化与表达升级。从平淡到惊艳，一键提升文字质感，支持仿写名家风格。', color: 'bg-purple-50 text-purple-600', tag: '热门' },
      { icon: <Sparkles className="w-7 h-7" />, title: 'AI 扩写', desc: '从一句到一段的细节展开。把"他推开门"变成三百字的氛围渲染。', color: 'bg-warning-light text-warning' },
      { icon: <Search className="w-7 h-7" />, title: 'AI 补全', desc: '写作途中突然跑偏？让 AI 分析上下文，自动补全合理的情节走向。', color: 'bg-blue-50 text-blue-600' },
    ],
  },
  {
    title: '过稿质量保障',
    desc: '不只是写，还要写得对、拿得出手',
    items: [
      { icon: <ShieldCheck className="w-7 h-7" />, title: '合规检测', desc: '45 项过稿级质检维度：敏感词、人设一致性、AI 味浓度、逻辑漏洞、节奏问题——一次扫描全部标出。', color: 'bg-green-50 text-green-600', tag: '核心' },
      { icon: <FileText className="w-7 h-7" />, title: '开篇评分', desc: '黄金三章质量评估。模拟编辑视角，从钩子强度、节奏密度、情绪张力等维度打分并给出优化建议。', color: 'bg-teal-50 text-teal-600' },
      { icon: <BookMarked className="w-7 h-7" />, title: '状态快照', desc: '每次修改自动生成版本快照，随时对比回退，告别"改废了"的焦虑。', color: 'bg-indigo-50 text-indigo-600' },
    ],
  },
  {
    title: '创作管理',
    desc: '长篇写作不是一蹴而就，我们帮你管好每一个细节',
    items: [
      { icon: <BookOpen className="w-7 h-7" />, title: '人设管理', desc: '人物卡牌系统 + 关系图谱。姓名、性格、外貌、背景、成长弧线一目了然，长篇多角色也不 OOC。', color: 'bg-warning-light text-warning', tag: '核心' },
      { icon: <Brain className="w-7 h-7" />, title: '灵感工具', desc: '脑洞喷射 + 书名炼金术 + 灵感爆裂。三大创意引擎，卡文时的救命稻草。', color: 'bg-warning-light text-warning' },
      { icon: <Users className="w-7 h-7" />, title: '世界观库', desc: '构建你的故事世界：地理、势力、年代、规则——所有设定都沉淀下来，永不丢失。', color: 'bg-rose-50 text-rose-600' },
    ],
  },
  {
    title: '体验与定制',
    desc: '让写作工具适应你，而不是你去适应工具',
    items: [
      { icon: <Palette className="w-7 h-7" />, title: '四套主题', desc: 'Light / Dark / Warm / Cool 一键切换。全站适配，从编辑器到仪表盘，每个角落都与你当下的状态同频。', color: 'bg-purple-50 text-purple-600' },
      { icon: <FileText className="w-7 h-7" />, title: '模板中心', desc: '开箱即用的创作框架：都市开局、古言权谋、悬疑探案……点一下就能开始。', color: 'bg-blue-50 text-blue-600' },
      { icon: <Sparkles className="w-7 h-7" />, title: '书桌式工作台', desc: '灵感推荐 + 脑洞喷射 + 写作数据看板。打开书桌，就像走入自己的书房。', color: 'bg-pink-50 text-pink-600' },
    ],
  },
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
        {/* 标题 */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">为长篇创作而生的效率工具</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">从灵感捕捉到过稿质检，覆盖网文创作全流程。不是替代你的写作，是让你写得更好更快。</p>
        </div>

        {/* 功能分组 */}
        {featureGroups.map((group, gi) => (
          <div key={gi} className="mb-16 last:mb-0">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-2">{group.title}</h2>
              <p className="text-sm text-muted-foreground">{group.desc}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {group.items.map((f, i) => (
                <div key={i} className="bg-card rounded-2xl p-6 border border-border shadow-card hover:shadow-hover hover:-translate-y-0.5 transition-all duration-300 ease group relative">
                  {f.tag && (
                    <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary text-white">{f.tag}</span>
                  )}
                  <div className={`w-13 h-13 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                    {f.icon}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* 底部CTA */}
        <div className="text-center mt-20 bg-primary/5 rounded-3xl p-12 border border-primary/10">
          <h2 className="text-2xl font-bold mb-4">准备好开始了吗？</h2>
          <p className="text-muted-foreground mb-6">所有功能免费体验，无需下载，打开浏览器就能写</p>
          <Link href="/" className="inline-flex items-center gap-2 h-12 px-8 rounded-xl bg-primary text-white font-medium hover:bg-primary-hover hover:-translate-y-0.5 transition-all duration-300 shadow-card hover:shadow-hover">
            开始创作
          </Link>
        </div>
      </div>
    </div>
  )
}
