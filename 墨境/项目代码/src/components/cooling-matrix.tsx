'use client'

import { useState } from 'react'
import {
  isCooling,
  type CoolingState,
  type SceneMethod,
  type EndingType,
  type HookType,
} from '@/lib/ai/cooling'

interface CoolingMatrixProps {
  currentChapter: number
  /** 来自引擎的真实冷却状态；undefined 时显示空态提示 */
  coolingState?: CoolingState
}

const SCENE_MAP: Record<SceneMethod, { label: string; desc: string }> = {
  S1: { label: '对峙', desc: '角色正面冲突' },
  S2: { label: '探索', desc: '探索未知环境' },
  S3: { label: '追逐', desc: '追逐/逃亡张力' },
  S4: { label: '回忆', desc: '回忆/闪回叙事' },
  S5: { label: '潜伏', desc: '潜伏/暗中行动' },
  S6: { label: '爆发', desc: '情感/事件爆发' },
}

const ENDING_MAP: Record<EndingType, { label: string; desc: string }> = {
  E1: { label: '意外', desc: '出人意料的转折收尾' },
  E2: { label: '升华', desc: '主题/情感升华' },
  E3: { label: '悬疑', desc: '留下悬念' },
  E4: { label: '反转', desc: '剧情反转' },
  E5: { label: '余味', desc: '余韵悠长的收尾' },
  E6: { label: '意象', desc: '以意象收尾' },
  E7: { label: '对话', desc: '以对话结束' },
  E8: { label: '动作', desc: '以动作场景收尾' },
  E9: { label: '环境', desc: '环境描写收尾' },
  E10: { label: '情感', desc: '情感高潮后收束' },
  E11: { label: '闪回', desc: '闪回/回忆收尾' },
  E12: { label: '预兆', desc: '为下一章埋下预兆' },
}

const HOOK_MAP: Record<HookType, { label: string; desc: string }> = {
  H01: { label: '对话钩', desc: '对话中埋钩' },
  H02: { label: '动作钩', desc: '动作中设悬念' },
  H03: { label: '环境钩', desc: '环境暗示' },
  H04: { label: '物品钩', desc: '关键物品' },
  H05: { label: '情感钩', desc: '情绪牵引' },
  H06: { label: '悬念钩', desc: '直接设悬' },
  H07: { label: '时间钩', desc: '时间紧迫感' },
  H08: { label: '人物钩', desc: '人物关系伏笔' },
  H09: { label: '秘密钩', desc: '隐藏的秘密' },
  H10: { label: '决定钩', desc: '关键决定' },
  H11: { label: '预警钩', desc: '危险预兆' },
  H12: { label: '意象钩', desc: '意象象征' },
  H13: { label: '转折钩', desc: '剧情转折点' },
}

const SCENE_IDS: SceneMethod[] = ['S1','S2','S3','S4','S5','S6']
const ENDING_IDS: EndingType[] = ['E1','E2','E3','E4','E5','E6','E7','E8','E9','E10','E11','E12']
const HOOK_IDS: HookType[] = ['H01','H02','H03','H04','H05','H06','H07','H08','H09','H10','H11','H12','H13']

export function CoolingMatrix({ currentChapter, coolingState }: CoolingMatrixProps) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'scene' | 'ending' | 'hook'>('scene')

  const cooling = (type: 'scene' | 'ending' | 'hook', id: string) =>
    !!coolingState && isCooling(coolingState, type, id, currentChapter)

  return (
    <div className="border-t border-border">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        aria-label={open ? '收起冷却矩阵' : '展开冷却矩阵'}
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
          <div className="flex gap-1" role="tablist">
            {(['scene','ending','hook'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                aria-label={t === 'scene' ? '场景方法' : t === 'ending' ? '章末收束' : '钩子类型'}
                className={`px-2 py-1 text-[10px] rounded-md transition-colors ${
                  tab === t ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'scene' ? '场景方法' : t === 'ending' ? '章末收束' : '钩子类型'}
              </button>
            ))}
          </div>

          {/* 空态提示：未连接引擎 */}
          {!coolingState && (
            <div className="py-6 text-center text-xs text-muted-foreground/50">
              连接引擎后生效
            </div>
          )}

          {/* 场景 S1-S6 */}
          {coolingState && tab === 'scene' && (
            <div className="space-y-0.5">
              {SCENE_IDS.map(id => {
                const c = cooling('scene', id)
                return (
                  <div key={id} className={`flex items-center justify-between px-2 py-1 rounded-md text-xs border transition-colors ${
                    c ? 'opacity-50 bg-destructive/5 border-destructive/15 text-muted-foreground' : 'bg-success/5 border-success/10 text-foreground'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] ${c ? 'text-destructive/60' : 'text-success'}`}>{c ? '⊘' : '●'}</span>
                      <span className="font-medium">{id}</span>
                      <span className="text-muted-foreground">{SCENE_MAP[id].label}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/60">{SCENE_MAP[id].desc}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* 收束 E1-E12 */}
          {coolingState && tab === 'ending' && (
            <div className="grid grid-cols-2 gap-0.5">
              {ENDING_IDS.map(id => {
                const c = cooling('ending', id)
                return (
                  <div key={id} className={`flex items-center gap-1 px-1.5 py-1 rounded text-[10px] border transition-colors ${
                    c ? 'opacity-50 bg-destructive/5 border-destructive/15' : 'bg-success/5 border-success/10'
                  }`}>
                    <span className={c ? 'text-destructive/60' : 'text-success'}>{c ? '⊘' : '●'}</span>
                    <span className="font-medium">{id}</span>
                    <span className="text-muted-foreground">{ENDING_MAP[id].label}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* 钩子 H01-H13 */}
          {coolingState && tab === 'hook' && (
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
              {HOOK_IDS.map(id => {
                const c = cooling('hook', id)
                return (
                  <div key={id} className={`flex items-center gap-1 px-1.5 py-1 rounded text-[10px] border transition-colors ${
                    c ? 'opacity-50 bg-destructive/5 border-destructive/15' : 'bg-success/5 border-success/10'
                  }`}>
                    <span className={c ? 'text-destructive/60' : 'text-success'}>{c ? '⊘' : '●'}</span>
                    <span className="font-medium">{id}</span>
                    <span className="text-muted-foreground">{HOOK_MAP[id].label}</span>
                  </div>
                )
              })}
            </div>
          )}

          <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1.5 border-t border-border">
            <span className="flex items-center gap-1"><span className="text-success">●</span> 可用</span>
            <span className="flex items-center gap-1"><span className="text-destructive/60">⊘</span> 冷却中</span>
          </div>
        </div>
      )}
    </div>
  )
}
