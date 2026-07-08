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
  currentChapter: number
}

const SCENE_MAP: Record<SceneMethod, { label: string; desc: string }> = {
  S1: { label: '对峙', desc: '角色正面冲突' },
  S2: { label: '探索', desc: '探索未知环境' },
  S3: { label: '追逐', desc: '追逐/逃亡张力' },
  S4: { label: '回忆', desc: '回忆/闪回叙事' },
  S5: { label: '潜伏', desc: '潜伏/暗中行动' },
  S6: { label: '爆发', desc: '情感/事件爆发' },
}

const ENDING_MAP: Record<EndingType, string> = {
  E1: '意外', E2: '升华', E3: '悬疑', E4: '反转',
  E5: '余味', E6: '意象', E7: '对话', E8: '动作',
  E9: '环境', E10: '情感', E11: '闪回', E12: '预兆',
}

const HOOK_MAP: Record<HookType, string> = {
  H01: '对话钩', H02: '动作钩', H03: '环境钩', H04: '物品钩',
  H05: '情感钩', H06: '悬念钩', H07: '时间钩', H08: '人物钩',
  H09: '秘密钩', H10: '决定钩', H11: '预警钩', H12: '意象钩', H13: '转折钩',
}

const SCENE_IDS: SceneMethod[] = ['S1','S2','S3','S4','S5','S6']
const ENDING_IDS: EndingType[] = ['E1','E2','E3','E4','E5','E6','E7','E8','E9','E10','E11','E12']
const HOOK_IDS: HookType[] = ['H01','H02','H03','H04','H05','H06','H07','H08','H09','H10','H11','H12','H13']

export function CoolingMatrix({ currentChapter }: CoolingMatrixProps) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'scene' | 'ending' | 'hook'>('scene')

  // 模拟数据（后续接真实引擎）
  const state = useMemo(() => {
    const s = createCoolingState()
    s.scenes.S1 = [currentChapter - 2]
    s.scenes.S4 = [currentChapter - 1]
    s.endings.E3 = [currentChapter - 1]
    s.hooks.H07 = [currentChapter - 3]
    return s
  }, [currentChapter])

  const cooling = (type: 'scene' | 'ending' | 'hook', id: string) =>
    isCooling(state, type, id, currentChapter)

  return (
    <div className="border-t border-border">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10" cy="10" r="6.5" /><path d="M10 6V10.5L13 12" /><path d="M4 15.5L5 14" /><path d="M15 5L16 4.5" /><path d="M8 5L9 7" /><path d="M12 5L11 7" /></svg>
          冷却矩阵
        </span>
        <svg className={`h-2.5 w-2.5 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 1L5 5L9 1" /></svg>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2">
          {/* Tab */}
          <div className="flex gap-1">
            {(['scene','ending','hook'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-2 py-1 text-[10px] rounded-md transition-colors ${
                  tab === t ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'scene' ? '场景方法' : t === 'ending' ? '章末收束' : '钩子类型'}
              </button>
            ))}
          </div>

          {/* 场景 S1-S6 */}
          {tab === 'scene' && (
            <div className="space-y-0.5">
              {SCENE_IDS.map(id => {
                const c = cooling('scene', id)
                return (
                  <div key={id} className={`flex items-center justify-between px-2 py-1 rounded-md text-xs ${
                    c ? 'opacity-30' : 'bg-[rgba(106,138,106,0.06)]'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] ${c ? '' : 'text-[#6a8a6a]'}`}>{c ? '◐' : '●'}</span>
                      <span className="font-medium text-foreground">{id}</span>
                      <span className="text-muted-foreground">{SCENE_MAP[id].label}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/60">{SCENE_MAP[id].desc}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* 收束 E1-E12 */}
          {tab === 'ending' && (
            <div className="grid grid-cols-2 gap-0.5">
              {ENDING_IDS.map(id => {
                const c = cooling('ending', id)
                return (
                  <div key={id} className={`flex items-center gap-1 px-1.5 py-1 rounded text-[10px] ${
                    c ? 'opacity-25' : ''
                  }`}>
                    <span className={c ? '' : 'text-[#6a8a6a]'}>{c ? '◐' : '●'}</span>
                    <span className="font-medium">{id}</span>
                    <span className="text-muted-foreground">{ENDING_MAP[id]}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* 钩子 H01-H13 */}
          {tab === 'hook' && (
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
              {HOOK_IDS.map(id => {
                const c = cooling('hook', id)
                return (
                  <div key={id} className={`flex items-center gap-1 px-1.5 py-1 rounded text-[10px] ${
                    c ? 'opacity-25' : ''
                  }`}>
                    <span className={c ? '' : 'text-[#6a8a6a]'}>{c ? '◐' : '●'}</span>
                    <span className="font-medium">{id}</span>
                    <span className="text-muted-foreground">{HOOK_MAP[id]}</span>
                  </div>
                )
              })}
            </div>
          )}

          <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1.5 border-t border-border">
            <span><span className="text-[#6a8a6a]">●</span> 可用</span>
            <span><span className="opacity-30">◐</span> 冷却中</span>
          </div>
        </div>
      )}
    </div>
  )
}
