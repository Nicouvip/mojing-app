'use client'

import { useState, useMemo } from 'react'
import {
  createCoolingState,
  isCooling,
  type SceneMethod,
  type EndingType,
  type HookType,
} from '@/lib/ai/cooling'

interface CoolingMatrixProps {
  /** 当前章节号 */
  currentChapter: number
}

// 注意：COOLING_REQUIREMENTS 中 scene=3, ending=3, hook=5

const SCENE_IDS: SceneMethod[] = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']
const ENDING_IDS: EndingType[] = ['E1','E2','E3','E4','E5','E6','E7','E8','E9','E10','E11','E12']
const HOOK_IDS: HookType[] = ['H01','H02','H03','H04','H05','H06','H07','H08','H09','H10','H11','H12','H13']

export function CoolingMatrix({ currentChapter }: CoolingMatrixProps) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'scene' | 'ending' | 'hook'>('scene')

  const state = useMemo(() => {
    const s = createCoolingState()
    s.scenes.S1 = [currentChapter - 2]
    s.scenes.S3 = [currentChapter - 1]
    s.endings.E4 = [currentChapter - 1]
    s.hooks.H07 = [currentChapter - 3]
    return s
  }, [currentChapter])

  const coolingReqs: Record<string, number> = { scene: 3, ending: 3, hook: 5 }

  return (
    <div className="border-t border-border">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="10" cy="10" r="6.5" />
            <path d="M10 6V10.5L13 12" />
            <path d="M4 15.5L5 14" /><path d="M15 5L16 4.5" />
            <path d="M8 5L9 7" /><path d="M12 5L11 7" />
          </svg>
          冷却矩阵
        </span>
        <svg className={`h-2.5 w-2.5 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 1L5 5L9 1" /></svg>
      </button>

      {open && (
        <div className="px-3 pb-3">
          {/* Tab 切换 */}
          <div className="flex gap-1 mb-2">
            {(['scene', 'ending', 'hook'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-2 py-1 text-[10px] rounded-md transition-colors ${
                  tab === t ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'scene' ? '场景' : t === 'ending' ? '收束' : '钩子'}
              </button>
            ))}
          </div>

          {/* 场景 S1-S6 */}
          {tab === 'scene' && (
            <div className="grid grid-cols-2 gap-1">
              {SCENE_IDS.map(id => {
                const cooling = isCooling(state, 'scene', id, currentChapter)
                return (
                  <div key={id} className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs ${
                    cooling ? 'opacity-30' : 'bg-[rgba(106,138,106,0.08)] text-[#6a8a6a]'
                  }`}>
                    <span className="text-[10px]">{cooling ? '◐' : '●'}</span>
                    <span className="font-medium">{id}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* 收束 E1-E12 */}
          {tab === 'ending' && (
            <div className="grid grid-cols-3 gap-1">
              {ENDING_IDS.map(id => {
                const cooling = isCooling(state, 'ending', id, currentChapter)
                return (
                  <div key={id} className={`flex items-center gap-1 px-1.5 py-1 rounded text-[10px] ${
                    cooling ? 'opacity-25' : 'text-[#6a8a6a]'
                  }`}>
                    <span>{cooling ? '◐' : '●'}</span>
                    <span>{id}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* 钩子 H01-H13 */}
          {tab === 'hook' && (
            <div className="grid grid-cols-3 gap-1">
              {HOOK_IDS.map(id => {
                const cooling = isCooling(state, 'hook', id, currentChapter)
                return (
                  <div key={id} className={`flex items-center gap-1 px-1.5 py-1 rounded text-[10px] ${
                    cooling ? 'opacity-25' : 'text-[#6a8a6a]'
                  }`}>
                    <span>{cooling ? '◐' : '●'}</span>
                    <span>{id}</span>
                  </div>
                )
              })}
            </div>
          )}

          <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border">
            <span><span className="text-[#6a8a6a]">●</span> 可用</span>
            <span><span className="opacity-30">◐</span> 冷却中</span>
          </div>
        </div>
      )}
    </div>
  )
}
