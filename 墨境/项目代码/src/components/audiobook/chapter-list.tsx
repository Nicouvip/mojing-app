'use client'

import type { Chapter } from '@/lib/db/types'
import { BookOpen, FileText } from 'lucide-react'

export interface ChapterListProps {
  chapters: Chapter[]
  maxHeight?: number
}

export function ChapterList({ chapters, maxHeight = 300 }: ChapterListProps) {
  if (chapters.length === 0) return null

  return (
    <div className="space-y-1" style={{ maxHeight, overflowY: 'auto' }}>
      {chapters.map((ch, i) => (
        <div key={`${ch.id}-${i}`}
          className="flex items-center justify-between text-xs text-foreground px-2 py-1.5 bg-foreground/[0.02] rounded-md">
          <span className="flex items-center gap-1.5 flex-1 truncate">
            <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
            {ch.title}
          </span>
          <span className="text-muted-foreground ml-2 shrink-0">
            {(ch.wordCount || 0).toLocaleString()} 字
          </span>
        </div>
      ))}
    </div>
  )
}
