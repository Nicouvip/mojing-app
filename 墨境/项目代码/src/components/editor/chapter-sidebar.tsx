'use client'

import { useState } from 'react'
import type { Chapter, Volume } from '@/lib/db/types'

interface Props {
  chapters: Chapter[]
  volumes: Volume[]
  activeChapterId: string | null
  selectedVolumes: Set<string>
  workspaceTab: string
  chView: 'main' | 'draft' | 'outline'
  searchTerm: string
  saveStatus: string
  S: Record<string, string>
  onSelectChapter: (id: string) => void
  onAddChapter: () => void
  onToggleVolume: (id: string) => void
  onSearchChange: (v: string) => void
  onChViewChange: (v: 'main' | 'draft' | 'outline') => void
  onDeleteChapter?: (id: string) => void
}

export function ChapterSidebar({
  chapters, volumes, activeChapterId, selectedVolumes,
  workspaceTab, chView, searchTerm, saveStatus, S,
  onSelectChapter, onAddChapter, onToggleVolume,
  onSearchChange, onChViewChange, onDeleteChapter,
}: Props) {
  const [hoveredCh, setHoveredCh] = useState<string | null>(null)

  const chTabs: { key: 'main' | 'draft' | 'outline'; label: string }[] = [
    { key: 'main', label: '正文' },
    { key: 'draft', label: '草稿' },
    { key: 'outline', label: '细纲' },
  ]

  const filtered = chapters.filter(c =>
    !c.deletedAt &&
    (chView === 'main' ? c.status === 'writing' || c.status === 'completed' :
     chView === 'draft' ? c.status === 'draft' : true) &&
    (!searchTerm || c.title.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <aside className="flex flex-col overflow-hidden shrink-0 transition-all duration-300 max-lg:hidden"
      style={{ width: 240, borderRight: '1px solid ' + S.border, background: S.card }}>

      {/* Side views */}
      <div className="flex border-b shrink-0" style={{ borderColor: S.border, background: S.bg2 }}>
        {chTabs.map(t => (
          <button key={t.key} onClick={() => onChViewChange(t.key)}
            className="flex-1 py-2.5 text-xs text-center border-b-2 transition-all"
            style={chView === t.key ? { color: S.pri, borderBottomColor: S.pri, fontWeight: 600 } : { color: S.muted, borderBottomColor: 'transparent' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="p-2.5 border-b shrink-0" style={{ borderColor: S.border }}>
        <input placeholder="搜索章节…" value={searchTerm} onChange={e => onSearchChange(e.target.value)}
          className="w-full px-2.5 py-2 text-xs rounded border outline-none" style={{ borderColor: S.border, background: S.bg2 }} />
      </div>

      {/* Chapter tree */}
      {workspaceTab === 'write' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 text-[10px] font-semibold tracking-wider uppercase shrink-0" style={{ color: S.muted }}>
            <span>章节目录</span>
            <button onClick={onAddChapter}
              className="flex items-center justify-center w-[26px] h-[26px] rounded text-sm"
              style={{ border: '1px solid ' + S.border, borderRadius: 6, color: S.muted }}>+</button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {volumes.map(vol => (
              <div key={vol.id}>
                <div className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold cursor-pointer rounded"
                  style={{ color: S.ink }}
                  onClick={() => onToggleVolume(vol.id)}>
                  <span className="text-[9px]" style={{ color: S.muted, width: 14, textAlign: 'center' }}>
                    {selectedVolumes.has(vol.id) ? '▼' : '▶'}
                  </span>
                  {vol.name}
                  <span className="text-[10px] ml-auto" style={{ color: S.muted, fontWeight: 400 }}>
                    {filtered.filter(c => c.volumeId === vol.id).reduce((s, c) => s + (c.wordCount || 0), 0).toLocaleString()} 字
                  </span>
                </div>
                {selectedVolumes.has(vol.id) && filtered.filter(c => c.volumeId === vol.id).map(ch => (
                  <div key={ch.id}
                    onMouseEnter={() => setHoveredCh(ch.id)}
                    onMouseLeave={() => setHoveredCh(null)}
                    onClick={() => onSelectChapter(ch.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 ml-3 rounded text-xs cursor-pointer transition-all"
                    style={{
                      background: activeChapterId === ch.id ? 'rgba(196,149,106,.1)' : 'transparent',
                      color: activeChapterId === ch.id ? S.pri : S.muted,
                    }}>
                    <span style={{ color: ch.status === 'completed' ? S.success : ch.status === 'draft' ? S.muted : S.ink, fontSize: 8 }}>●</span>
                    <span className="truncate flex-1">{ch.title}</span>
                    <span className="text-[9px]" style={{ color: S.muted }}>{(ch.wordCount || 0).toLocaleString()}</span>
                    {hoveredCh === ch.id && onDeleteChapter && (
                      <button onClick={e => { e.stopPropagation(); onDeleteChapter(ch.id) }}
                        className="text-[9px] p-0.5 rounded" style={{ color: S.dest }}>✕</button>
                    )}
                  </div>
                ))}
              </div>
            ))}
            {/* 未分类章节 */}
            {(() => {
              const unassigned = filtered.filter(c => !c.volumeId || !volumes.some(v => v.id === c.volumeId))
              if (unassigned.length === 0) return null
              return (
                <div>
                  <div className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold" style={{ color: S.ink }}>
                    <span className="text-[9px]" style={{ color: S.muted, width: 14, textAlign: 'center' }}>▼</span>
                    未分类
                  </div>
                  {unassigned.map(ch => (
                    <div key={ch.id} onClick={() => onSelectChapter(ch.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 ml-3 rounded text-xs cursor-pointer"
                      style={{ background: activeChapterId === ch.id ? 'rgba(196,149,106,.1)' : 'transparent', color: activeChapterId === ch.id ? S.pri : S.muted }}>
                      <span style={{ color: ch.status === 'completed' ? S.success : S.muted, fontSize: 8 }}>●</span>
                      <span className="truncate flex-1">{ch.title}</span>
                      <span className="text-[9px]" style={{ color: S.muted }}>{(ch.wordCount || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* workspace: other tabs (outline/notes) */}
      {workspaceTab !== 'write' && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs" style={{ color: S.muted }}>功能开发中</p>
        </div>
      )}
    </aside>
  )
}
