'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { getProjects, getChapters, getTrash } from '@/lib/db/store'
import type { Project } from '@/lib/db/types'
import { FileText, BookOpen, Hash, Cpu, Trash2, Clock } from 'lucide-react'

const CODE_STATS = {
  files: 23,
  lines: 2840,
  components: 3,
  apiRoutes: 4,
}

export default function AdminDashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [totalChapters, setTotalChapters] = useState(0)
  const [totalWords, setTotalWords] = useState(0)
  const [trashCount, setTrashCount] = useState(0)

  useEffect(() => {
    const p = getProjects()
    setProjects(p)
    let chCount = 0
    let wCount = 0
    p.forEach(proj => {
      const chs = getChapters(proj.id)
      chCount += chs.length
      wCount += chs.reduce((s, c) => s + (c.wordCount || 0), 0)
    })
    setTotalChapters(chCount)
    setTotalWords(wCount)
    setTrashCount(getTrash().length)
  }, [])

  const statsCards = [
    { label: '作品数', value: projects.length, icon: BookOpen, color: 'text-primary', bg: 'bg-primary-light' },
    { label: '章节总数', value: totalChapters, icon: FileText, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: '总字数', value: totalWords.toLocaleString(), icon: Hash, color: 'text-violet-500', bg: 'bg-violet-50' },
    { label: '回收站', value: trashCount, icon: Trash2, color: 'text-amber-500', bg: 'bg-amber-50' },
  ]

  const recentProjects = [...projects]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 10)

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map(card => {
          const Icon = card.icon
          return (
            <Card key={card.label} className="hover:shadow-elevated transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{card.label}</p>
                    <p className="text-3xl font-semibold text-foreground tabular-nums">{card.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 两栏内容 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 最近作品 */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                最近作品
              </h2>
              {recentProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">暂无作品</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="pb-2 font-medium text-muted-foreground text-xs">作品名</th>
                        <th className="pb-2 font-medium text-muted-foreground text-xs">题材</th>
                        <th className="pb-2 font-medium text-muted-foreground text-xs text-right">章节</th>
                        <th className="pb-2 font-medium text-muted-foreground text-xs text-right">字数</th>
                        <th className="pb-2 font-medium text-muted-foreground text-xs text-right">最后更新</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentProjects.map(p => (
                        <tr key={p.id} className="border-b border-border/40 hover:bg-secondary/50 transition-colors">
                          <td className="py-2.5 font-medium text-foreground">{p.name}</td>
                          <td className="py-2.5 text-muted-foreground">{p.genre}</td>
                          <td className="py-2.5 text-muted-foreground text-right tabular-nums">{p.chapterCount}</td>
                          <td className="py-2.5 text-muted-foreground text-right tabular-nums">{p.totalWords.toLocaleString()}</td>
                          <td className="py-2.5 text-muted-foreground text-right text-xs">
                            {new Date(p.updatedAt).toLocaleDateString('zh-CN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 系统信息 */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-muted-foreground" />
                前端代码量
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">源文件</span><span className="text-sm font-medium tabular-nums">{CODE_STATS.files} 个</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">代码行数</span><span className="text-sm font-medium tabular-nums">{CODE_STATS.lines.toLocaleString()} 行</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">组件</span><span className="text-sm font-medium tabular-nums">{CODE_STATS.components} 个</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">API 路由</span><span className="text-sm font-medium tabular-nums">{CODE_STATS.apiRoutes} 个</span></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold text-foreground mb-3">系统信息</h2>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between"><span>Next.js</span><span className="font-mono">16.2.9</span></div>
                <div className="flex justify-between"><span>React</span><span className="font-mono">19.2</span></div>
                <div className="flex justify-between"><span>TypeScript</span><span className="font-mono">6.0</span></div>
                <div className="flex justify-between"><span>构建工具</span><span>Turbopack</span></div>
                <div className="flex justify-between"><span>数据存储</span><span>localStorage</span></div>
              </div>
            </CardContent>
          </Card>

          {trashCount > 0 && (
            <div className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="font-medium text-amber-700 mb-1">⏳ 回收站提醒</p>
              <p>回收站有 {trashCount} 个章节，30 天后将自动清除</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
