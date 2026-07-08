'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { listPages, loadPage, deletePage, exportPage, importPage, applyPage } from '@/lib/page-builder/store'
import type { PageData } from '@/lib/page-builder/types'
import { FileEdit, Eye, Download, Upload, Trash2, Zap, Plus } from 'lucide-react'

const BUILTIN = ['/', '/login', '/dashboard']

export default function PagesAdmin() {
  const router = useRouter()
  const [edited, setEdited] = useState<string[]>([])
  const [showNew, setShowNew] = useState(false)
  const [newPath, setNewPath] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    fetch('/init-pages.json').then(r => r.json()).then((d: Record<string, unknown>) => {
      const pages: Record<string, unknown> = (d.pages as Record<string, unknown>) || d
      Object.entries(pages).forEach(([k, v]: [string, unknown]) => {
        const existing = localStorage.getItem('mojing_page_' + k)
        const newJson = JSON.stringify(v)
        if (!existing || JSON.parse(existing).components.length < (v as { components: unknown[] }).components.length) {
          localStorage.setItem('mojing_page_' + k, newJson)
        }
      })
      setEdited(listPages())
    }).catch(() => setEdited(listPages()))
  }, [refresh])

  const resetAll = () => {
    if (!confirm('重置所有页面为默认？已编辑的内容将丢失。')) return
    ;['/','/login','/dashboard'].forEach(p => localStorage.removeItem('mojing_page_' + p))
    localStorage.removeItem('mojing_page_backups_/')
    localStorage.removeItem('mojing_page_backups_/login')
    localStorage.removeItem('mojing_page_backups_/dashboard')
    setRefresh(r => r + 1)
  }

  const handleImport = (path: string) => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try { const text = await file.text(); importPage(path, text); setRefresh(r => r + 1); alert('导入成功') }
      catch { alert('导入失败：JSON格式无效') }
    }; input.click()
  }

  const handleExport = (path: string) => {
    const json = exportPage(path)
    if (!json) return
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${path.replace(/\//g,'_')}.json`; a.click()
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">页面编辑器</h1>
        <div className="flex items-center gap-2">
          <button onClick={resetAll} className="px-3 py-1.5 rounded-lg border text-xs text-muted-foreground hover:bg-secondary">🔄 重置为默认</button>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm"><Plus size={16} />新建页面</button>
        </div>
      </div>

      {showNew && (
        <div className="mb-6 p-6 rounded-xl border bg-card flex items-end gap-3">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">页面路径</label>
            <input value={newPath} onChange={e => setNewPath(e.target.value)} placeholder="/new-page" className="w-full px-3 py-2 rounded-lg border text-sm" />
          </div>
          <button onClick={() => { if (newPath) { router.push(`/page-editor.html?path=${encodeURIComponent(newPath)}`) } }}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm">创建</button>
          <button onClick={() => setShowNew(false)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground">取消</button>
        </div>
      )}

      {/* 已生效页面 */}
      <h2 className="text-sm font-semibold text-muted-foreground mb-3">已生效页面</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {BUILTIN.map(path => {
          const isEdited = edited.includes(path)
          return (
            <div key={path} className="p-5 rounded-xl border bg-card">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-semibold">{path === '/' ? '首页' : path}</div>
                  <div className="text-xs text-muted-foreground">{isEdited ? '✅ 已编辑' : '默认模板'}</div>
                </div>
                {isEdited && <span className="px-2 py-0.5 rounded-full text-[10px] bg-green-50 text-green-700">生效中</span>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Link href={`/page-editor.html?path=${encodeURIComponent(path)}`} className="px-2.5 py-1 rounded text-xs bg-primary-light text-primary hover:bg-primary/10"><FileEdit size={12} className="inline mr-1" />编辑</Link>
                <a href={path} target="_blank" className="px-2.5 py-1 rounded text-xs border text-muted-foreground hover:bg-secondary"><Eye size={12} className="inline mr-1" />预览</a>
                {isEdited && <><button onClick={() => handleExport(path)} className="px-2.5 py-1 rounded text-xs border text-muted-foreground hover:bg-secondary"><Download size={12} className="inline mr-1" />导出</button>
                <button onClick={() => handleImport(path)} className="px-2.5 py-1 rounded text-xs border text-muted-foreground hover:bg-secondary"><Upload size={12} className="inline mr-1" />导入</button>
                <button onClick={() => { applyPage(path); setRefresh(r => r + 1) }} className="px-2.5 py-1 rounded text-xs bg-primary text-white"><Zap size={12} className="inline mr-1" />生效</button>
                <button onClick={() => { if (confirm('删除此页面的自定义数据？')) { deletePage(path); setRefresh(r => r + 1) } }} className="px-2.5 py-1 rounded text-xs text-destructive hover:bg-destructive/5"><Trash2 size={12} className="inline mr-1" />删除</button></>}
              </div>
            </div>
          )
        })}
      </div>

      {/* 草稿页面 */}
      {edited.filter(p => !BUILTIN.includes(p)).length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">草稿页面</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {edited.filter(p => !BUILTIN.includes(p)).map(path => (
              <div key={path} className="p-5 rounded-xl border bg-card">
                <div className="font-semibold mb-3">{path}</div>
                <div className="flex flex-wrap gap-1.5">
                  <Link href={`/page-editor.html?path=${encodeURIComponent(path)}`} className="px-2.5 py-1 rounded text-xs bg-primary-light text-primary"><FileEdit size={12} className="inline mr-1" />编辑</Link>
                  <a href={path} target="_blank" className="px-2.5 py-1 rounded text-xs border text-muted-foreground"><Eye size={12} className="inline mr-1" />预览</a>
                  <button onClick={() => handleExport(path)} className="px-2.5 py-1 rounded text-xs border text-muted-foreground"><Download size={12} className="inline mr-1" />导出</button>
                  <button onClick={() => handleImport(path)} className="px-2.5 py-1 rounded text-xs border text-muted-foreground"><Upload size={12} className="inline mr-1" />导入</button>
                  <button onClick={() => { applyPage(path); setRefresh(r => r + 1) }} className="px-2.5 py-1 rounded text-xs bg-primary text-white"><Zap size={12} className="inline mr-1" />生效</button>
                  <button onClick={() => { if (confirm('确定删除？')) { deletePage(path); setRefresh(r => r + 1) } }} className="px-2.5 py-1 rounded text-xs text-destructive"><Trash2 size={12} className="inline mr-1" />删除</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
