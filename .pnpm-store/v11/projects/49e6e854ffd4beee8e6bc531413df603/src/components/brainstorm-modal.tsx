'use client'

import { cn } from '@/lib/utils/utils'
import { X, Lightbulb, Rocket } from 'lucide-react'

interface Props {
  show: boolean
  onClose: () => void
  bsGenre: string
  onGenreChange: (genre: string) => void
  onGenerate: () => void
  bsLoading: boolean
  bsResult: string
}

export function BrainstormModal({ show, onClose, bsGenre, onGenreChange, onGenerate, bsLoading, bsResult }: Props) {
  if (!show) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-[20px] shadow-modal w-[600px] max-h-[80vh] flex flex-col modal-enter" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b"><h2 className="font-semibold"><Lightbulb className="w-4 h-4 mr-1.5 inline" />脑洞喷射</h2><button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button></div>
        <div className="flex items-center gap-3 px-6 py-3 border-b">
          <span className="text-sm text-muted-foreground">题材:</span>
          {['都市','悬疑','玄幻','言情','科幻'].map(g => (
            <button key={g} onClick={() => onGenreChange(g)} className={cn("px-3 py-1 rounded-full text-xs", bsGenre === g ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground hover:bg-primary-light')}>{g}</button>
          ))}
          <span className="flex-1" />
          <button onClick={onGenerate} disabled={bsLoading} className="px-4 py-1.5 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 disabled:opacity-50">{bsLoading ? <>喷射中...</> : <><Rocket className="w-3.5 h-3.5 mr-1 inline" />喷射</>}</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {bsResult ? <pre className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed font-mono">{bsResult}</pre> : <div className="text-center py-10 text-muted-foreground text-sm">选择题材，点击「喷射」生成脑洞</div>}
        </div>
      </div>
    </div>
  )
}
