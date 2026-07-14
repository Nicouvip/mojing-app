'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  getCharacterProfiles,
  getWorldSettings,
  getOutlines,
  upsertOutline,
} from '@/lib/db/store'
import type { Outline } from '@/lib/db/types'

import { C } from '@/lib/theme/tokens'
const S = C

type PlanTab = 'characters' | 'world' | 'outline'

export function PlanPanel({ projectId }: { projectId: string }) {
  const [tab, setTab] = useState<PlanTab>('characters')

  const tabs: { key: PlanTab; label: string }[] = [
    { key: 'characters', label: '角色' },
    { key: 'world', label: '世界观' },
    { key: 'outline', label: '大纲' },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      {/* 子标签切换 */}
      <div className="flex gap-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-2.5 py-1 text-[10px] rounded transition-colors font-medium"
            style={{
              background: tab === t.key ? S.pri : S.bg2,
              color: tab === t.key ? '#fff' : S.muted,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'characters' && <CharacterSummary projectId={projectId} />}
      {tab === 'world' && <WorldSummary projectId={projectId} />}
      {tab === 'outline' && <OutlineSummary projectId={projectId} />}
    </div>
  )
}

/* ── 角色摘要 ── */
function CharacterSummary({ projectId }: { projectId: string }) {
  const list = getCharacterProfiles(projectId)
  return (
    <div className="space-y-2">
      <p className="text-[10px]" style={{ color: S.muted }}>共 {list.length} 个角色</p>
      <div className="space-y-1">
        {list.map(c => (
          <div key={c.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded text-xs" style={{ background: S.bg2 }}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
              style={{ background: 'rgba(196,149,106,.12)', color: S.pri }}>{c.name[0]}</span>
            <span style={{ color: S.ink }}>{c.name}</span>
            <span className="ml-auto text-[9px]" style={{ color: S.muted }}>{c.type}</span>
          </div>
        ))}
      </div>
      <Link href="/library/characters" className="block text-[10px] text-center py-1.5 rounded" style={{ background: S.bg2, color: S.pri }}>
        去素材库管理 →
      </Link>
    </div>
  )
}

/* ── 世界观摘要 ── */
function WorldSummary({ projectId }: { projectId: string }) {
  const list = getWorldSettings(projectId)
  return (
    <div className="space-y-2">
      <p className="text-[10px]" style={{ color: S.muted }}>共 {list.length} 条设定</p>
      <div className="space-y-1">
        {list.slice(0, 8).map(w => (
          <div key={w.id} className="px-2.5 py-1.5 rounded text-xs" style={{ background: S.bg2 }}>
            <div className="flex items-center justify-between">
              <span className="truncate" style={{ color: S.ink }}>{w.title}</span>
              <span className="text-[9px] shrink-0 ml-1" style={{ color: S.muted }}>{w.category}</span>
            </div>
          </div>
        ))}
        {list.length > 8 && <p className="text-[10px] text-center" style={{ color: S.muted }}>…还有 {list.length - 8} 条</p>}
      </div>
      <Link href="/library/world" className="block text-[10px] text-center py-1.5 rounded" style={{ background: S.bg2, color: S.pri }}>
        去素材库管理 →
      </Link>
    </div>
  )
}

/* ── 大纲摘要（含快速标记冲突强度） ── */
function OutlineSummary({ projectId }: { projectId: string }) {
  const [list, setList] = useState<Outline[]>([])
  const refresh = () => setList(getOutlines(projectId))
  useEffect(refresh, [projectId])

  const toggleConflict = (o: Outline) => {
    const levels: Outline['conflictLevel'][] = ['L1', 'L2', 'L3', 'L4', 'L5']
    const idx = levels.indexOf(o.conflictLevel)
    const next = levels[(idx + 1) % levels.length]
    upsertOutline({ ...o, conflictLevel: next })
    refresh()
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px]" style={{ color: S.muted }}>共 {list.length} 个节点</p>
      <div className="space-y-1">
        {list.sort((a, b) => a.chapterOrder - b.chapterOrder).map(o => (
          <div key={o.id} className="px-2.5 py-1.5 rounded text-xs cursor-pointer hover:brightness-95"
            style={{ background: S.bg2 }}
            onClick={() => toggleConflict(o)}
            title="点击切换冲突强度"
          >
            <div className="flex items-center justify-between">
              <span style={{ color: S.ink }}>第{o.chapterOrder}章</span>
              <span className="text-[9px] px-1 rounded" style={{
                background: o.conflictLevel >= 'L4' ? 'rgba(239,83,80,.12)' : S.bg2,
                color: o.conflictLevel >= 'L4' ? '#ef5350' : S.muted,
              }}>{o.conflictLevel}</span>
            </div>
            <p className="text-[9px] mt-0.5 line-clamp-1" style={{ color: S.muted }}>{o.coreEvent || '未设事件'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
