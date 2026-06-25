'use client'

import { cn, toPlainText as toPlain } from '@/lib/utils/utils'
import { Button } from '@/components/ui/button'
import { calcBodyDensity, checkCompliance, check55Rule } from '@/lib/ai/compliance'
import { D_CLASS_CHECK_WORDS } from '@/lib/prompts/compliance-sync'

interface Props {
  show: boolean
  onClose: () => void
  content: string
  onSave: () => void
}

export function ReportModal({ show, onClose, content, onSave }: Props) {
  if (!show) return null
  const plain = toPlain(content)
  const r = checkCompliance(plain)
  const fiftyFive = check55Rule(plain)
  const has55 = fiftyFive.passed
  const d = calcBodyDensity(plain)
  const aiFreqCount = D_CLASS_CHECK_WORDS.reduce((c, w) => { const m = plain.match(new RegExp(w, 'g')); return c + (m ? m.length : 0) }, 0)
  const score = Math.max(1, 5 - (r.forbiddenB > 0 ? 1 : 0) - (r.blockedItems.length > 0 ? 1 : 0) - (d < 40 || d > 55 ? 1 : 0) - (!has55 ? 1 : 0))
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-[20px] shadow-modal max-w-lg w-full mx-4 p-6 max-h-[80vh] overflow-y-auto modal-enter" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">章末自检报告</h3>
          <span className={cn("text-3xl font-bold", score >= 4 ? 'text-success' : score >= 3 ? 'text-warning' : 'text-destructive')}>{score}/5</span>
        </div>
        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between py-1 border-b"><span>字数</span><span>{plain.length}</span></div>
          <div className="flex justify-between py-1 border-b"><span>身体密度</span><span className={d >= 40 && d <= 55 ? 'text-success' : 'text-warning'}>{d}% {d < 40 ? '⚠️偏低' : d > 55 ? '⚠️偏高' : '✅'}</span></div>
          <div className="flex justify-between py-1 border-b"><span>55字生死线</span><span className={has55 ? 'text-success' : 'text-destructive'}>{has55 ? '✅' : '❌ 前55字无冲突/悬念'}</span></div>
          <div className="flex justify-between py-1 border-b"><span>B类禁用词</span><span className={r.forbiddenB === 0 ? 'text-success' : 'text-warning'}>{r.forbiddenB > 0 ? `⚠️ ${r.forbiddenB}段违规` : '✅'}</span></div>
          <div className="flex justify-between py-1 border-b"><span>阻断项</span><span className={r.blockedItems.length === 0 ? 'text-success' : 'text-warning'}>{r.blockedItems.length > 0 ? `⚠️ ${r.blockedItems.length}项` : '✅'}</span></div>
          <div className="flex justify-between py-1 border-b"><span>AI 高频词</span><span className={aiFreqCount === 0 ? 'text-success' : 'text-warning'}>{(aiFreqCount > 0 ? `⚠️ ${aiFreqCount} 处` : '✅')}</span></div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>返回修改</Button>
          <Button variant="outline" size="sm" onClick={onClose}>强制通过</Button>
          <Button size="sm" onClick={() => { onSave(); onClose() }}>通过</Button>
        </div>
      </div>
    </div>
  )
}
