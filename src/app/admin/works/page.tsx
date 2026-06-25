'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getProjects, deleteProject, permanentDeleteProject, restoreProject, getChapters } from '@/lib/db/store'
import type { Project } from '@/lib/db/types'
import { FileText, Trash2, Undo2, XCircle, Search, Edit3 } from 'lucide-react'

export default function AdminWorksPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [search, setSearch] = useState('')
  const [filterDeleted, setFilterDeleted] = useState(false)

  const refresh = useCallback(() => {
    setProjects(getProjects())
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const filtered = projects.filter(p => {
    const nameMatch = p.name.toLowerCase().includes(search.toLowerCase())
    if (filterDeleted) return nameMatch && p.deletedAt
    return nameMatch && !p.deletedAt
  }).sort((a, b) => b.updatedAt - a.updatedAt)

  const handleDelete = (id: string, name: string) => {
    if (confirm(`确定删除作品「${name}」？删除后进入回收站，7天后永久清除。`)) {
      deleteProject(id)
      refresh()
    }
  }

  const handlePermanentDelete = (id: string, name: string) => {
    if (confirm(`⚠️ 确定彻底删除「${name}」？此操作不可恢复！`)) {
      permanentDeleteProject(id)
      refresh()
    }
  }

  const handleRestore = (id: string) => {
    restoreProject(id)
    refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold text-foreground">作品管理</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索作品..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 w-48 rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <Button
            variant={filterDeleted ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => setFilterDeleted(!filterDeleted)}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            {filterDeleted ? '回收站视图' : '回收站'}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-6 pt-5 pb-3 font-medium text-muted-foreground text-xs">作品名</th>
                  <th className="px-6 pt-5 pb-3 font-medium text-muted-foreground text-xs">题材</th>
                  <th className="px-6 pt-5 pb-3 font-medium text-muted-foreground text-xs text-right">章节</th>
                  <th className="px-6 pt-5 pb-3 font-medium text-muted-foreground text-xs text-right">总字数</th>
                  <th className="px-6 pt-5 pb-3 font-medium text-muted-foreground text-xs text-right">最后更新</th>
                  <th className="px-6 pt-5 pb-3 font-medium text-muted-foreground text-xs text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">
                      {filterDeleted ? '回收站为空' : '暂无作品'}
                    </td>
                  </tr>
                ) : (
                  filtered.map(p => (
                    <tr key={p.id} className={`border-b border-border/40 hover:bg-secondary/50 transition-colors ${p.deletedAt ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-3 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          {p.name}
                          {p.deletedAt && (
                            <span className="text-[10px] bg-red-50 text-red-500 rounded px-1.5 py-0.5">已删除</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">{p.genre}</td>
                      <td className="px-6 py-3 text-muted-foreground text-right tabular-nums">{p.chapterCount}</td>
                      <td className="px-6 py-3 text-muted-foreground text-right tabular-nums">{p.totalWords.toLocaleString()}</td>
                      <td className="px-6 py-3 text-muted-foreground text-right text-xs">
                        {new Date(p.updatedAt).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {p.deletedAt ? (
                            <>
                              <button
                                onClick={() => handleRestore(p.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors bg-secondary hover:bg-secondary/80 text-foreground"
                                title="恢复"
                              >
                                <Undo2 className="w-3.5 h-3.5" />
                                恢复
                              </button>
                              <button
                                onClick={() => handlePermanentDelete(p.id, p.name)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors bg-red-50 hover:bg-red-100 text-red-600"
                                title="彻底删除"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                删除
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors bg-secondary hover:bg-secondary/80 text-foreground"
                                title="编辑"
                                onClick={() => window.open(`/editor/${p.id}`, '_blank')}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                编辑
                              </button>
                              <button
                                onClick={() => handleDelete(p.id, p.name)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors bg-secondary hover:bg-secondary/80 text-foreground text-red-500 hover:text-red-600"
                                title="删除"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                删除
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground">
        共 {filtered.length} 个作品（{projects.filter(p => !p.deletedAt).length} 活跃 · {projects.filter(p => p.deletedAt).length} 在回收站）
      </div>
    </div>
  )
}
