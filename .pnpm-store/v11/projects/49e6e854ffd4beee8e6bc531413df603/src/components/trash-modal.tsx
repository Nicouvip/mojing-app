'use client'

import { cn } from '@/lib/utils/utils'
import { X } from 'lucide-react'
import type { Chapter } from '@/lib/db/types'

interface Props {
  show: boolean
  onClose: () => void
  trashChapters: Chapter[]
  selectedTrashId: string | null
  onSelect: (id: string) => void
  onRestore: (id: string) => void
  onDelete: (id: string) => void
}

export function TrashModal({ show, onClose, trashChapters, selectedTrashId, onSelect, onRestore, onDelete }: Props) {
  if (!show) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-[20px] shadow-modal border border-border w-[720px] max-h-[80vh] flex flex-col modal-enter" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">回收站</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex flex-1 min-h-0">
          <div className="w-[280px] border-r border-border overflow-y-auto p-2 space-y-0.5">
            {trashChapters.length === 0 ? <div className="text-center py-10 text-sm text-muted-foreground">回收站为空</div> : trashChapters.map(ch => (
              <div key={ch.id} onClick={() => onSelect(ch.id)}
                className={cn("px-3 py-2 rounded-lg text-sm cursor-pointer", selectedTrashId === ch.id ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary")}>
                <div className="font-medium">{ch.title}</div><div className="text-[11px] opacity-60">30天后自动清除</div>
              </div>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-6">{selectedTrashId ? <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{(trashChapters.find(c => c.id === selectedTrashId)?.content || '').slice(0, 500)}...</div> : <div className="text-center py-20 text-sm text-muted-foreground">选择左侧章节查看内容</div>}</div>
        </div>
        <div className="flex items-center justify-center gap-4 px-6 py-4 border-t border-border">
          <button onClick={() => { if (selectedTrashId) onDelete(selectedTrashId) }}
            className="px-5 py-1.5 rounded-lg border border-destructive/40 text-destructive text-sm hover:bg-destructive/10">彻底删除</button>
          <button onClick={() => { if (selectedTrashId) onRestore(selectedTrashId) }}
            className="px-5 py-1.5 rounded-lg border border-border text-muted-foreground text-sm hover:bg-secondary">恢复为草稿</button>
        </div>
        <div className="text-center text-xs text-muted-foreground pb-3">删除后30天将自动清除</div>
      </div>
    </div>
  )
}
