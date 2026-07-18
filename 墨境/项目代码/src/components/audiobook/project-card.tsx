'use client'

import Link from 'next/link'
import type { Project, Chapter } from '@/lib/db/types'
import {
  BookOpen, FileText, Clock, Headphones, PenLine,
  ChevronDown, ChevronUp, Music
} from 'lucide-react'

/* ── 设计令牌 ── */
const COVER_GRADS = [
  'linear-gradient(135deg,#e8dfd2,#d5c8b5)',
  'linear-gradient(135deg,#d9d4cb,#c7bfb2)',
  'linear-gradient(135deg,#cfc8bc,#b8afa2)',
  'linear-gradient(135deg,#c4b090,#a88860)',
  'linear-gradient(135deg,#b8a898,#908070)',
  'linear-gradient(135deg,#a89888,#887060)',
  'linear-gradient(135deg,#3a5279,#2a3a55)',
  'linear-gradient(135deg,#b5454a,#8a2a2a)',
]

const GENRE_ICONS: Record<string, React.ReactNode> = {
  '都市': <span className="text-3xl">🏙️</span>,
  '玄幻': <span className="text-3xl">🐉</span>,
  '悬疑': <span className="text-3xl">🔍</span>,
  '科幻': <span className="text-3xl">🚀</span>,
  '历史': <span className="text-3xl">📜</span>,
  '灵异': <span className="text-3xl">👻</span>,
  '言情': <span className="text-3xl">💕</span>,
  '竞技': <span className="text-3xl">⚡</span>,
}

interface ProjectWithChapters extends Project {
  chapters: Chapter[]
}

export interface ProjectCardProps {
  project: ProjectWithChapters
  idx: number
  audioProgress: number
  isExpanded: boolean
  onToggleExpand: () => void
}

export function ProjectCard({ project, idx, audioProgress, isExpanded, onToggleExpand }: ProjectCardProps) {
  const totalWords = project.totalWords || project.chapters.reduce((s, c) => s + (c.wordCount || 0), 0)
  const chapterCount = project.chapterCount || project.chapters.length
  const recentChapters = project.chapters.slice(0, 3)

  return (
    <div className="group bg-card border border-border rounded-xl overflow-hidden transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,.06)]">
      {/* 封面 */}
      <div className="relative flex items-center justify-center h-[100px]"
        style={{ background: COVER_GRADS[idx % COVER_GRADS.length] }}>
        {GENRE_ICONS[project.genre] || <BookOpen className="w-8 h-8 text-foreground/40" />}
        <span className="absolute top-2.5 right-2.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/85 text-foreground">
          {project.genre}
        </span>
      </div>

      {/* 内容 */}
      <div className="p-4">
        <h3 className="text-[15px] font-semibold text-foreground leading-snug mb-1.5 line-clamp-1">
          {project.name}
        </h3>

        {project.description && (
          <p className="text-[11px] text-muted-foreground mb-2 leading-relaxed line-clamp-2">
            {project.description}
          </p>
        )}

        {/* 元数据 */}
        <div className="flex gap-3 text-[11px] text-muted-foreground mb-3">
          <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{chapterCount} 章</span>
          <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{(totalWords || 0).toLocaleString()} 字</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(project.updatedAt).toLocaleDateString('zh-CN')}</span>
        </div>

        {/* 音频进度 */}
        {audioProgress > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-2 text-[11px] text-primary mb-1">
              <Music className="w-3 h-3" />
              {audioProgress}/{chapterCount} 已生成
            </div>
            <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min(100, (audioProgress / chapterCount) * 100)}%` }} />
            </div>
          </div>
        )}

        {/* 章节预览 */}
        {recentChapters.length > 0 && (
          <div className="mb-3">
            <div className="text-[11px] text-muted-foreground mb-1.5 font-medium">章节预览</div>
            {recentChapters.map((ch, ri) => (
              <div key={`${ch.id}-${ri}`}
                className="flex items-center justify-between text-[11px] text-foreground px-2 py-1 bg-foreground/[0.02] rounded mb-0.5">
                <span className="flex-1 truncate">{ch.title}</span>
                <span className="text-muted-foreground ml-2 shrink-0">{(ch.wordCount || 0).toLocaleString()} 字</span>
              </div>
            ))}
            {chapterCount > 3 && (
              <div className="text-[10px] text-muted-foreground text-center mt-1">
                还有 {chapterCount - 3} 章...
              </div>
            )}
          </div>
        )}

        {/* 内容预览 */}
        {recentChapters[0]?.content && (
          <div className="text-[11px] text-muted-foreground leading-relaxed italic px-2.5 py-2 bg-primary/[0.04] rounded border-l-[3px] border-primary/30 mb-3 line-clamp-2">
            「{recentChapters[0].content.slice(0, 100)}...」
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Link href={`/audiobook/${project.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors no-underline">
            <Headphones className="w-3.5 h-3.5" /> 进入有声书
          </Link>
          <Link href={`/editor/${project.id}`}
            className="flex items-center justify-center px-3.5 py-2 bg-foreground/[0.04] rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors no-underline"
            title="编辑章节">
            <PenLine className="w-3.5 h-3.5" />
          </Link>
          <button onClick={onToggleExpand}
            className="flex items-center justify-center px-3.5 py-2 bg-foreground/[0.04] rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer border-none"
            title="展开全部章节">
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* 展开全部章节 */}
        {isExpanded && project.chapters.length > 3 && (
          <div className="mt-3 p-2.5 bg-foreground/[0.02] rounded-lg">
            {project.chapters.slice(3).map((ch, ei) => (
              <div key={`${ch.id}-${ei}`}
                className="flex items-center justify-between text-[11px] text-foreground px-2 py-1 mb-0.5">
                <span>{ch.title}</span>
                <span className="text-muted-foreground">{(ch.wordCount || 0).toLocaleString()} 字</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
