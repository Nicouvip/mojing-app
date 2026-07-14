'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Save, Play } from 'lucide-react'

const presets = [
  { id: 'tomato', name: '番茄爆款风', desc: '短句节奏快，爽点密集' },
  { id: 'qidian', name: '起点正剧风', desc: '长句铺垫足，世界观完整' },
  { id: 'guyan', name: '古言细腻风', desc: '文风雅致，描写细腻' },
]

export default function RulesPage() {
  const [sentenceLength, setSentenceLength] = useState(50)
  const [descDensity, setDescDensity] = useState(40)

  const applyPreset = (id: string) => {
    switch (id) {
      case 'tomato':
        setSentenceLength(25); setDescDensity(20)
        break
      case 'qidian':
        setSentenceLength(70); setDescDensity(45)
        break
      case 'guyan':
        setSentenceLength(55); setDescDensity(75)
        break
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 h-14 px-6 flex items-center justify-between glass-panel border-b border-border">
        <div className="flex items-center gap-6">
          <Link href="/"><Image src="/assets/brand/mojing-logo-nav.png" alt="墨境" width={160} height={36} className="h-9 w-auto" priority /></Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← 返回首页</Link>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 rounded-lg text-xs border border-border text-muted-foreground hover:bg-secondary flex items-center gap-1"><Save className="w-3 h-3" />保存规则集</button>
          <button className="px-3 py-1.5 rounded-lg text-xs bg-primary text-white flex items-center gap-1"><Play className="w-3 h-3" />应用到作品</button>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-2">风格规则中心</h1>
        <p className="text-muted-foreground mb-8">可视化配置AI写作规则，让输出完全贴合你的文风</p>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">官方预设</h3>
            {presets.map((p) => (
              <button key={p.id} onClick={() => applyPreset(p.id)} className="w-full text-left p-4 rounded-xl bg-card shadow-sm hover:shadow-md transition-all border border-transparent hover:border-primary/30">
                <p className="font-medium text-sm">{p.name}</p><p className="text-xs text-muted-foreground">{p.desc}</p>
              </button>
            ))}
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card rounded-xl p-6 shadow-card border border-border">
              <h3 className="text-lg font-semibold mb-6">文风设定</h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2"><label className="text-sm font-medium">句式长短</label><span className="text-sm text-primary">{sentenceLength}%</span></div>
                  <input type="range" value={sentenceLength} onChange={e => setSentenceLength(Number(e.target.value))} className="w-full accent-primary" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>短句</span><span>长句</span></div>
                </div>
                <div>
                  <div className="flex justify-between mb-2"><label className="text-sm font-medium">描写密度</label><span className="text-sm text-primary">{descDensity}%</span></div>
                  <input type="range" value={descDensity} onChange={e => setDescDensity(Number(e.target.value))} className="w-full accent-primary" />
                </div>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-5 shadow-card border border-border">
            <h3 className="text-sm font-semibold mb-3">实时预览</h3>
            <textarea className="w-full min-h-[80px] p-3 border border-border rounded-lg text-sm mb-3" placeholder="输入测试文字..." defaultValue="他推开门，走了进去。" />
            <button className="w-full py-2 rounded-lg bg-primary text-white text-sm">生成预览</button>
            <div className="mt-4 p-3 bg-primary-light rounded-lg text-xs text-muted-foreground">指尖触到木门，冰凉的触感顺指腹蔓延。他顿了顿，终是推开了那扇尘封已久的门。</div>
          </div>
        </div>
      </div>
    </div>
  )
}
