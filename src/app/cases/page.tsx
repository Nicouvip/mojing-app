'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Search, BookOpen, TrendingUp, Star, Clock, Sparkles, BookMarked, ChevronDown, ChevronUp } from 'lucide-react'

interface CaseStudy {
  id: number
  title: string
  genre: string
  desc: string
  before: string
  after: string
  tools: string[]
  chapters: number
  words: string
  result: string
  difficulty: string
}

const cases: CaseStudy[] = [
  {
    id: 1, title: '《长安夜行人》', genre: '悬疑古风',
    desc: '通过 AI 续写+合规检测，完成 32 章 12.8 万字长篇，过稿番茄小说',
    before: '大理寺少卿萧珩接下一桩离奇命案',
    after: '雨夜，大理寺少卿萧珩蹲在血迹斑斑的青石板上，指尖触到一枚刻着兰花纹的玉扣。他抬起头，望向街角那间从未亮过灯的纸扎铺——门，虚掩着。',
    tools: ['AI 续写', '合规检测', '状态快照'], chapters: 32, words: '12.8 万',
    result: '番茄小说签约 · 悬疑频道推荐', difficulty: '进阶',
  },
  {
    id: 2, title: '《星际拾荒者》', genre: '科幻末世',
    desc: '使用人设管理+世界观库构建完整科幻宇宙，获起点科幻频道推荐',
    before: '主角在废船中发现神秘信号',
    after: '头盔里的氧气还有最后四分钟。陈渡的手指在布满锈迹的操作台上飞快跳跃，废弃空间站的深处，那个每隔七秒闪烁一次的信号，频率越来越快——像心跳。',
    tools: ['人设管理', '世界观库', 'AI 润色'], chapters: 45, words: '18.5 万',
    result: '起点科幻频道推荐 · 月票榜 Top 50', difficulty: '挑战',
  },
  {
    id: 3, title: '《市井诡事录》', genre: '都市灵异',
    desc: '用灵感爆裂生成 20 个单元故事灵感，用模板中心搭建系列框架',
    before: '主角在老街开了一家照相馆',
    after: '老街的尽头，楚辞的照相馆开了整一年。直到那个穿红嫁衣的女人出现在取景框里——她的影子，朝向和所有人都相反。',
    tools: ['灵感爆裂', '模板中心', 'AI 补全'], chapters: 28, words: '11.2 万',
    result: '掌阅签约 · 灵异类月票 Top 10', difficulty: '进阶',
  },
  {
    id: 4, title: '《剑破苍穹》', genre: '玄幻修仙',
    desc: '从大纲到全文，AI 辅助完成百万字长篇，稳定日更 6000 字',
    before: '少年林北在宗门测试中觉醒废灵根',
    after: '测试石碑上，林北的名字黯淡如灰——下等废灵根。满堂哄笑中，只有他看见石碑深处那道裂痕里，有一缕金光正在苏醒。',
    tools: ['AI 续写', '人设管理', '状态快照', '合规检测'], chapters: 256, words: '86.3 万',
    result: '起点精品频道 · 完本好评率 92%', difficulty: '挑战',
  },
  {
    id: 5, title: '《她说谎的时候》', genre: '都市悬疑',
    desc: '用开篇评分反复打磨前三章，编辑一眼相中直接签约',
    before: '林微月第一次撒谎的时候只有七岁',
    after: '林微月第一次撒谎的时候只有七岁。她告诉妈妈冰箱上的花瓶是猫碰碎的。妈妈信了。从那以后她明白一件事——只要谎话足够从容，世界就会相信你。二十年后，她坐在审讯室里，对面是全市最擅长识破谎言的刑警队长。',
    tools: ['开篇评分', 'AI 润色', '灵感爆裂'], chapters: 18, words: '7.6 万',
    result: '豆瓣阅读签约 · 悬疑热门榜', difficulty: '入门',
  },
  {
    id: 6, title: '《我在古代搞基建》', genre: '穿越古言',
    desc: '世界观库+AI 扩写，让穿越种田文的细节丰富度提升 3 倍',
    before: '苏棠穿越到古代，决定开一家酒楼',
    after: '贞观十七年，长安西市最偏僻的角落里，苏棠用最后半两银子租下一间漏雨的铺面。三个月后，"醉仙楼"的招牌挂起来那天，整个长安的达官贵人都在打听——那个连灶台都要现砌的女掌柜，到底从哪里弄来的"烈火烹油"法？',
    tools: ['世界观库', 'AI 扩写', '书名炼金术'], chapters: 67, words: '24.2 万',
    result: '晋江古言金榜 · 收藏 3.2 万', difficulty: '入门',
  },
  {
    id: 7, title: '《深渊回响》', genre: '悬疑刑侦',
    desc: 'AI 对话生成+人设管理，塑造了 5 个让读者过目不忘的角色',
    before: '刑警张队长审讯嫌疑人',
    after: '张北川把卷宗往桌上一放，不急着说话。他盯着对面那个男人看了整整三十秒——右手无名指内侧的茧，左手腕上三道平行的旧疤痕，还有对方在坐下之前下意识理了理衣领的动作。"你前两次口供的时间线都对不上，"他终于开口，声音很轻，"是因为你不在案发现场——你在保护一个人。"',
    tools: ['对话生成', '人设管理', 'AI 审读'], chapters: 38, words: '15.4 万',
    result: '爱奇艺小说签约 · 影视改编洽谈中', difficulty: '进阶',
  },
  {
    id: 8, title: '《异能收容所》', genre: '都市异能',
    desc: '使用模板中心+灵感爆裂，3 天完成开篇 2 万字投稿',
    before: '主角发现自己是异能者',
    after: '我被关进那间白色房间的时候，手腕上的抑制环还在发烫。对面坐着一个穿制服的女人，她翻着我的档案，表情就像在看一份过期的外卖订单。"D 级异能——情绪感知。范围三米。危险等级：无。"她合上文件夹，"恭喜，你被分配到了收容所后勤部。"后来我才知道，整个后勤部全是"无害"的D级——某种意义上，我们是这座疯狂收容所里最危险的人。',
    tools: ['模板中心', '灵感爆裂', 'AI 续写', '合规检测'], chapters: 24, words: '9.8 万',
    result: '番茄小说签约 · 在读人数 2.1 万', difficulty: '入门',
  },
  {
    id: 9, title: '《余生为期》', genre: '言情现代',
    desc: 'AI 润色+对话生成，让甜宠文的情绪线更细腻动人',
    before: '男主和女主在咖啡厅偶遇',
    after: '咖啡洒在那份合同上的时候，陆衍舟甚至没有皱一下眉。他只是看着对面那个慌慌张张的女孩——她的睫毛在颤，像蝴蝶翅膀被雨打湿了。"对不起对不起！"她手忙脚乱地抽纸巾。"没关系，"他说，"反正我也不打算签了。"这是她入职的第一天，也是她后来花了一整年才明白的事情：陆衍舟从来不在咖啡厅谈正事——他是专门来的。',
    tools: ['AI 润色', '对话生成', '开篇评分'], chapters: 52, words: '20.6 万',
    result: '晋江言情金榜 · 积分 5.8 亿', difficulty: '入门',
  },
  {
    id: 10, title: '《矩阵迷踪》', genre: '科幻赛博',
    desc: '世界观库构建硬核赛博宇宙，AI 审读全程逻辑检查',
    before: '黑客主角闯入虚拟空间',
    after: '虹膜扫描通过。声纹匹配通过。神经链接协议握手完成。陈屿的意识沉入矩阵的瞬间，整个世界变成了一条由 0 和 1 构成的河流。但在数据洪流的底层，他看到了不该存在的东西——一段非算法的、有温度的、像是呼吸一样的信号。有人在矩阵里活着。',
    tools: ['世界观库', 'AI 审读', 'AI 续写', '状态快照'], chapters: 36, words: '16.1 万',
    result: '起点科幻精品 · 读者评分 9.2', difficulty: '挑战',
  },
]

const ALL_GENRES = ['全部', '悬疑古风', '科幻末世', '都市灵异', '玄幻修仙', '都市悬疑', '穿越古言', '悬疑刑侦', '都市异能', '言情现代', '科幻赛博']
const ALL_DIFFICULTIES = ['全部', '入门', '进阶', '挑战']

export default function CasesPage() {
  const [search, setSearch] = useState('')
  const [genreFilter, setGenreFilter] = useState('全部')
  const [difficultyFilter, setDifficultyFilter] = useState('全部')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const filtered = useMemo(() => {
    let list = [...cases]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c => c.title.toLowerCase().includes(q) || c.genre.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q))
    }
    if (genreFilter !== '全部') list = list.filter(c => c.genre === genreFilter)
    if (difficultyFilter !== '全部') list = list.filter(c => c.difficulty === difficultyFilter)
    return list
  }, [search, genreFilter, difficultyFilter])

  const difficultyColor: Record<string, string> = {
    '入门': 'bg-green-50 text-green-600',
    '进阶': 'bg-amber-50 text-amber-600',
    '挑战': 'bg-rose-50 text-rose-600',
  }

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
        {/* 头部 */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">写作案例</h1>
            <p className="text-muted-foreground">看看其他作者如何用墨境写出精彩故事</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-card rounded-xl px-4 py-3 border border-border shadow-card flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">案例数</div>
                <div className="text-lg font-semibold">{cases.length}</div>
              </div>
            </div>
            <div className="bg-card rounded-xl px-4 py-3 border border-border shadow-card flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <div>
                <div className="text-xs text-muted-foreground">签约率</div>
                <div className="text-lg font-semibold">100%</div>
              </div>
            </div>
          </div>
        </div>

        {/* 筛选栏 */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索案例名称、题材…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-border bg-background text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground/60"
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="flex gap-2 flex-wrap">
            {ALL_GENRES.map(g => (
              <button key={g} onClick={() => setGenreFilter(g)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${genreFilter === g ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground hover:bg-primary-light'}`}>
                {g}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            {ALL_DIFFICULTIES.map(d => (
              <button key={d} onClick={() => setDifficultyFilter(d)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${difficultyFilter === d ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground hover:bg-primary-light'}`}>
                {d === '全部' ? '全部难度' : d}
              </button>
            ))}
          </div>
        </div>

        {/* 案例列表 */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 mx-auto mb-6 text-primary/15" />
            <p className="text-xl font-medium mb-2" style={{ fontFamily: "'Noto Serif SC', serif" }}>没有匹配的案例</p>
            <p className="text-sm text-muted-foreground">试试调整筛选条件</p>
          </div>
        ) : (
          <div className="space-y-5">
            {filtered.map(c => {
              const isExpanded = expandedId === c.id
              return (
                <div key={c.id}
                  className={`bg-card rounded-2xl border border-border shadow-card transition-all duration-300 ${isExpanded ? 'ring-2 ring-primary/20' : 'hover:shadow-hover'}`}>
                  {/* 头部 */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                    className="p-6 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-xl font-bold">{c.title}</h3>
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium ${difficultyColor[c.difficulty]}`}>
                            {c.difficulty}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{c.desc}</p>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <span className="inline-block px-3 py-1 bg-primary-light text-primary text-xs rounded-full whitespace-nowrap">{c.genre}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>

                    {/* 统计数据 */}
                    <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><BookMarked size={12} /> {c.chapters} 章</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {c.words} 字</span>
                      <span className="flex items-center gap-1"><Star size={12} className="text-amber-500" /> {c.result}</span>
                    </div>

                    {/* 使用工具 */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {c.tools.map((tool, ti) => (
                        <span key={ti} className="px-2 py-0.5 rounded-md bg-secondary text-[11px] text-muted-foreground">{tool}</span>
                      ))}
                    </div>
                  </div>

                  {/* 展开的 before/after 对比 */}
                  {isExpanded && (
                    <div className="px-6 pb-6 border-t border-border/50 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <p className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1.5">
                            <Sparkles size={12} /> 写作前
                          </p>
                          <div className="bg-background rounded-xl p-4 text-sm text-muted-foreground italic leading-relaxed min-h-[80px]">
                            {c.before}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-primary font-medium mb-2 flex items-center gap-1.5">
                            <Sparkles size={12} /> 经 AI 润色后
                          </p>
                          <div className="bg-primary-light rounded-xl p-4 text-sm leading-relaxed min-h-[80px]" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                            {c.after}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Link href="/" className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                          用墨境写出你的故事 <ArrowRight size={12} />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* 底部CTA */}
        <div className="text-center mt-12 bg-primary/5 rounded-3xl p-10 border border-primary/10">
          <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "'Noto Serif SC', serif" }}>每个好故事都值得被写出来</h2>
          <p className="text-sm text-muted-foreground mb-5">墨境帮你从第一个字开始，到完本签约</p>
          <Link href="/" className="inline-flex items-center gap-2 h-11 px-7 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover hover:-translate-y-0.5 transition-all duration-300 shadow-card hover:shadow-hover">
            开始创作 <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  )
}
