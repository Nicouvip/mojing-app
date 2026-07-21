'use client'

import Link from 'next/link'
import type { Project, Chapter } from '@/lib/db/types'

/* ── 设计令牌 ── */
const C = {
  pri: '#c4956a',
  ink: '#1a1814',
  muted: 'rgba(26,24,20,.45)',
  dim: 'rgba(26,24,20,.3)',
  line: 'rgba(26,24,20,.06)',
  card: '#fff',
  indigo: '#3a5279',
  crimson: '#b5454a',
  green: '#7a9e7a',
  radius: 10,
}

const COLOR_BARS = [
  '#c4956a', '#3a5279', '#b5454a', '#7a9e7a',
  '#8e63ce', '#d4965a', '#4a86b8', '#c45a5a',
]

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

/* ── 内联 SVG 图标 ── */
const IconBook  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
const IconFile  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
const IconClock = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
const IconMusic = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
const IconPlay = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5,3 19,12 5,21"/></svg>
const IconEdit = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
const IconDown = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6,9 12,15 18,9"/></svg>
const IconUp   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18,15 12,9 6,15"/></svg>

export function ProjectCard({ project, idx, audioProgress, isExpanded, onToggleExpand }: ProjectCardProps) {
  const totalWords = project.totalWords || project.chapters.reduce((s, c) => s + (c.wordCount || 0), 0)
  const chapterCount = project.chapterCount || project.chapters.length
  const recentChapters = project.chapters.slice(0, 3)
  const barColor = COLOR_BARS[idx % COLOR_BARS.length]
  const progressPct = chapterCount > 0 ? Math.min(100, Math.round((audioProgress / chapterCount) * 100)) : 0

  return (
    <div style={{
      display: 'flex', background: C.card, borderRadius: C.radius,
      border: '1px solid rgba(26,24,20,.06)',
      boxShadow: '0 1px 4px rgba(0,0,0,.03)',
      overflow: 'hidden',
      transition: 'all .2s cubic-bezier(.4,0,.2,1)',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,.06)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.03)'
        e.currentTarget.style.transform = 'none'
      }}>

      {/* ── 书脊色条 ── */}
      <div style={{
        width: 4, flexShrink: 0, background: barColor,
        borderRadius: '4px 0 0 4px',
      }} />

      {/* ── 内容区 ── */}
      <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>

        {/* 顶部：标题 + 题材 */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h3 style={{
            fontSize: 14, fontWeight: 700, color: C.ink, margin: 0,
            flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            lineHeight: 1.3,
          }}>
            {project.name}
          </h3>
          <span style={{
            fontSize: 10, fontWeight: 600, color: barColor,
            padding: '2px 8px', borderRadius: 10,
            background: `${barColor}10`, whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {project.genre}
          </span>
        </div>

        {/* 描述 */}
        {project.description && (
          <p style={{
            fontSize: 11, color: C.muted, margin: 0,
            lineHeight: 1.55, display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {project.description}
          </p>
        )}

        {/* 元数据行 */}
        <div style={{ display: 'flex', gap: 14, fontSize: 11, color: C.dim, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><IconBook /> {chapterCount} 章</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><IconFile /> {(totalWords || 0).toLocaleString()} 字</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><IconClock /> {new Date(project.updatedAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</span>
        </div>

        {/* 进度条 */}
        {audioProgress > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: barColor, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <IconMusic /> {audioProgress}/{chapterCount} 已生成
              </span>
              <span style={{ fontSize: 10, color: C.dim }}>{progressPct}%</span>
            </div>
            <div style={{ width: '100%', height: 3, background: 'rgba(26,24,20,.05)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progressPct}%`, background: barColor, borderRadius: 2, transition: 'width .5s ease' }} />
            </div>
          </div>
        )}

        {/* 章节列表 */}
        {recentChapters.length > 0 && (
          <div>
            <div style={{ fontSize: 10, color: C.dim, fontWeight: 600, marginBottom: 5, letterSpacing: .5, textTransform: 'uppercase' }}>
              章节
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {recentChapters.map((ch, ri) => (
                <div key={`${ch.id}-${ri}`} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: 11, color: C.ink, padding: '3px 8px',
                  background: 'rgba(26,24,20,.02)', borderRadius: 5,
                }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {ch.title}
                  </span>
                  <span style={{ fontSize: 10, color: C.dim, marginLeft: 8, flexShrink: 0 }}>
                    {(ch.wordCount || 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            {chapterCount > 3 && (
              <div style={{ fontSize: 10, color: C.dim, textAlign: 'center', marginTop: 4 }}>
                +{chapterCount - 3} 章
              </div>
            )}
          </div>
        )}

        {/* 展开全部章节 */}
        {isExpanded && project.chapters.length > 3 && (
          <div style={{
            padding: '8px 10px', background: 'rgba(26,24,20,.015)',
            borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 3,
          }}>
            {project.chapters.slice(3).map((ch, ei) => (
              <div key={`${ch.id}-${ei}`} style={{
                display: 'flex', justifyContent: 'space-between', fontSize: 11,
                color: C.ink, padding: '2px 0',
              }}>
                <span>{ch.title}</span>
                <span style={{ color: C.dim, marginLeft: 8 }}>{(ch.wordCount || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* 操作按钮 */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Link href={`/audiobook/${project.id}`} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '8px 0', background: barColor, color: '#fff',
            borderRadius: 8, fontSize: 12, fontWeight: 600,
            textDecoration: 'none', border: 'none', cursor: 'pointer',
            transition: 'all .15s',
          }}>
            <IconPlay /> 进入有声书
          </Link>
          <Link href={`/editor/${project.id}`} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 34, height: 34, background: 'rgba(26,24,20,.03)',
            borderRadius: 8, color: C.muted, textDecoration: 'none',
            transition: 'all .15s', flexShrink: 0,
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,24,20,.07)'; e.currentTarget.style.color = C.ink }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(26,24,20,.03)'; e.currentTarget.style.color = C.muted }}
            title="编辑章节">
            <IconEdit />
          </Link>
          <button onClick={onToggleExpand} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 34, height: 34, background: 'rgba(26,24,20,.03)',
            border: 'none', borderRadius: 8, color: C.muted, cursor: 'pointer',
            transition: 'all .15s', flexShrink: 0,
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,24,20,.07)'; e.currentTarget.style.color = C.ink }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(26,24,20,.03)'; e.currentTarget.style.color = C.muted }}
            title="展开全部章节">
            {isExpanded ? <IconUp /> : <IconDown />}
          </button>
        </div>

      </div>
    </div>
  )
}
