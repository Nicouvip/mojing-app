'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Clock, BookText, Sparkles } from 'lucide-react'
import Navbar from '@/components/navbar'

const templates = [
  { id: 1, title: '都市异能开局', genre: '都市', desc: '主角在都市生活中觉醒异能，从日常切入超凡。适合快节奏、代入感强的开篇。', words: '3,000', difficulty: '入门', chapters: '3-5', icon: 'C' },
  { id: 2, title: '古言权谋宫斗', genre: '古言', desc: '深宫之中的暗流涌动，权谋与情感交织。从选秀入宫到步步为营的晋升之路。', words: '5,000', difficulty: '进阶', chapters: '5-8', icon: 'G' },
  { id: 3, title: '悬疑刑侦探案', genre: '悬疑', desc: '连环命案背后隐藏的惊天真相。每章一个线索，抽丝剥茧，层层推进。', words: '4,000', difficulty: '进阶', chapters: '4-6', icon: 'X' },
  { id: 4, title: '玄幻修炼成长', genre: '玄幻', desc: '从废柴到巅峰，逆天改命的修炼之路。经典升级流框架，爽点密集。', words: '6,000', difficulty: '入门', chapters: '5-10', icon: 'X' },
  { id: 5, title: '科幻末世求生', genre: '科幻', desc: '末日降临，人类在废墟中重建文明。资源收集、基地建设、人性拷问。', words: '4,500', difficulty: '进阶', chapters: '6-8', icon: 'K' },
  { id: 6, title: '仙侠问道长生', genre: '仙侠', desc: '御剑乘风，问道求长生的修行之旅。宗门、秘境、天劫——传统仙侠的完整框架。', words: '5,500', difficulty: '进阶', chapters: '6-10', icon: 'X' },
  { id: 7, title: '都市职场逆袭', genre: '都市', desc: '从底层小透明到职场王者。办公室政治、商业博弈、情感纠葛交织的成长故事。', words: '3,500', difficulty: '入门', chapters: '4-6', icon: 'C' },
  { id: 8, title: '灵异单元剧', genre: '灵异', desc: '每3-5章一个独立灵异事件，主线串联。适合短篇集、悬疑灵异爱好者。', words: '4,000', difficulty: '入门', chapters: '3-5', icon: 'L' },
  { id: 9, title: '穿越经商致富', genre: '古言', desc: '现代商业思维穿越到古代，从摆摊到富甲天下。轻松爽文向，节奏明快。', words: '4,000', difficulty: '入门', chapters: '4-7', icon: 'G' },
  { id: 10, title: '系统流无限流', genre: '玄幻', desc: '绑定系统，穿越不同副本世界。任务、奖励、升级——游戏化的叙事结构。', words: '5,000', difficulty: '入门', chapters: '5-8', icon: 'X' },
  { id: 11, title: '言情甜宠日常', genre: '言情', desc: '甜蜜轻松的恋爱故事。从欢喜冤家到双向奔赴，甜而不腻的日常向节奏。', words: '3,000', difficulty: '入门', chapters: '3-5', icon: 'Y' },
  { id: 12, title: '硬核科幻设定', genre: '科幻', desc: '基于科学原理的硬科幻创作。AI觉醒、星际殖民、时间悖论——脑洞大开的同时逻辑自洽。', words: '6,000', difficulty: '挑战', chapters: '6-12', icon: 'K' },
  { id: 13, title: '民国谍战风云', genre: '悬疑', desc: '民国时期的谍战悬疑。潜伏、暗杀、情报战——每个人都在刀尖上行走。', words: '4,500', difficulty: '进阶', chapters: '5-8', icon: 'X' },
  { id: 14, title: '网游竞技文', genre: '都市', desc: '以电竞/网游为背景的竞技热血故事。战队组建、比赛对决、冠军之路。', words: '4,000', difficulty: '入门', chapters: '4-7', icon: 'C' },
]

const genres = ['全部', '都市', '古言', '悬疑', '玄幻', '科幻', '仙侠', '言情', '灵异']
const difficulties = ['全部', '入门', '进阶', '挑战']

export default function TemplatesPage() {
  const router = useRouter()
  const [genre, setGenre] = useState('全部')
  const [difficulty, setDifficulty] = useState('全部')
  const [hoveredId, setHoveredId] = useState<number | null>(null)

  const filtered = templates.filter(t => {
    if (genre !== '全部' && t.genre !== genre) return false
    if (difficulty !== '全部' && t.difficulty !== difficulty) return false
    return true
  })

  const difficultyColor: Record<string, string> = {
    '入门': 'bg-green-50 text-green-600',
    '进阶': 'bg-amber-50 text-amber-600',
    '挑战': 'bg-rose-50 text-rose-600',
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">模板中心</h1>
            <p className="text-muted-foreground">选择一个创作结构，开始你的下一部作品</p>
          </div>
          <div className="text-sm text-muted-foreground">
            共 {filtered.length} 个模板
          </div>
        </div>

        {/* 筛选栏 */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="flex gap-2 flex-wrap">
            {genres.map(g => (
              <button key={g} onClick={() => setGenre(g)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${genre === g ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground hover:bg-primary-light'}`}>
                {g}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            {difficulties.map(d => (
              <button key={d} onClick={() => setDifficulty(d)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${difficulty === d ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground hover:bg-primary-light'}`}>
                {d === '全部' ? '全部难度' : d}
              </button>
            ))}
          </div>
        </div>

        {/* 模板列表 */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <BookText className="w-16 h-16 mx-auto mb-6 text-primary/15" />
            <p className="text-lg text-muted-foreground" style={{ fontFamily: "'Noto Serif SC', serif" }}>没有匹配的模板，试试调整筛选条件</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map(t => (
              <div key={t.id}
                onClick={() => router.push('/desk')}
                onMouseEnter={() => setHoveredId(t.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="bg-card rounded-2xl p-6 border border-border shadow-card hover:shadow-hover hover:-translate-y-0.5 transition-all duration-300 ease group cursor-pointer relative">
                {/* 封面字母 */}
                <div className="w-full aspect-[3/4] rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 mb-4 flex items-center justify-center relative overflow-hidden">
                  <span className="text-5xl font-serif text-primary/15 font-bold">{t.icon}</span>
                  <div className={`absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                </div>

                {/* 难度标签 */}
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium mb-2 ${difficultyColor[t.difficulty]}`}>
                  {t.difficulty}
                </span>

                <h3 className="font-semibold mb-1">{t.title}</h3>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed line-clamp-2">{t.desc}</p>

                {/* 元数据 */}
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock size={11} /> 约 {t.words} 字大纲
                  </span>
                  <span className="flex items-center gap-1">
                    <Sparkles size={11} /> {t.chapters} 章
                  </span>
                </div>

                {/* Hover 操作 */}
                <div className="mt-3 pt-3 border-t border-border/50 flex justify-between items-center">
                  <span className="text-[11px] text-muted-foreground/60">{t.genre}</span>
                  <span className={`flex items-center gap-1 text-xs font-medium text-primary transition-all duration-200 ${hoveredId === t.id ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'}`}>
                    使用模板 <ArrowRight size={13} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
