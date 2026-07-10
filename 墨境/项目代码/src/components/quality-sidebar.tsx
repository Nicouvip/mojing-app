'use client'

import { useMemo } from 'react'
import { cn, toPlainText } from '@/lib/utils/utils'
import { paragraphCheck, type ParagraphCheckItem } from '@/lib/ai/compliance'
import type { Editor } from '@tiptap/react'

interface QualitySidebarProps {
  content: string
  editorRef: React.RefObject<Editor | null>
  open: boolean
  onClose: () => void
  onOpenReport: () => void
  onOpenDashboard: () => void
}

const ITEM_MESSAGES: Record<number, { title: string; advice: string }> = {
  1: { title: '这一段写了太多件事', advice: '主语频繁切换，读者不知道该跟谁。一段只聚焦一个人物的行动。' },
  2: { title: '情绪是"说"出来的，不是"演"出来的', advice: '"他感到害怕"不如"他手心全是汗"。用身体动作代替心理描写。' },
  3: { title: '有些词连续出现太多次', advice: '同一段里某些词反复出现，读起来像卡带。换个说法或者删掉多余的。' },
  4: { title: '动作后面跟了解释', advice: '做了就做了，解释反而削弱冲击力。删掉"因为""所以"，只留动作。' },
  5: { title: '不小心写到别人心里去了', advice: '当前视角角色不可能知道别人在想什么。删掉其他角色的内心描写。' },
  6: { title: '这句有点绕，读出声试试', advice: '太书面化的句子会打断阅读节奏，改成口语化短句。' },
  7: { title: '好句子放错了地方', advice: '精彩描写要放在情绪高潮，移到动作或情感爆发点。' },
  8: { title: '这个比喻有点勉强', advice: '比喻要来自读者熟悉的日常经验，换一个立刻能懂的意象。' },
}

export function QualitySidebar({ content, editorRef, open, onClose, onOpenReport, onOpenDashboard }: QualitySidebarProps) {
  const result = useMemo(() => paragraphCheck(toPlainText(content)), [content])
  const blockingItems = result.items.filter(i => i.isBlocking)
  const warningItems = result.items.filter(i => !i.isBlocking)

  const handleJump = (item: ParagraphCheckItem) => {
    const ed = editorRef.current
    if (!ed) return
    const docText = ed.state.doc.textContent
    const keywords = [item.name, item.detail].join(' ').match(/[^\s,，、。；;:：]{2,8}/g) || []
    for (const kw of keywords) {
      const idx = docText.indexOf(kw)
      if (idx >= 0) {
        ed.chain().focus().setTextSelection({ from: idx, to: idx + kw.length }).run()
        setTimeout(() => {
          const sel = window.getSelection()
          if (sel && sel.rangeCount > 0) {
            const r = sel.getRangeAt(0)
            const container = ed.view.dom.closest('.overflow-y-auto')
            if (container) {
              const cr = container.getBoundingClientRect()
              const rr = r.getBoundingClientRect()
              container.scrollTop += rr.top - cr.top - cr.height / 3
            }
          }
        }, 30)
        return
      }
    }
  }

  return (
    <div
      className={cn(
        'h-full flex flex-col overflow-hidden transition-all duration-200 glass-panel border-l border-border',
        open ? 'w-[260px]' : 'w-0'
      )}
      style={open ? { width: '260px' } : undefined}
    >
      <div className="w-[260px] h-full flex flex-col">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 2.5L3 5V10c0 2.5 2 4.5 4 5 2-.5 4-2.5 4-5V5l-1-.5" />
            </svg>
            质量检测
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">
              {blockingItems.length > 0
                ? `${blockingItems.length}项需处理`
                : result.items.length > 0
                  ? '已通过'
                  : ''}
            </span>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 3L11 11" />
                <path d="M11 3L3 11" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {blockingItems.length > 0 && (
            <>
              <div className="text-[10px] font-medium text-destructive mb-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                需要修改
              </div>
              {blockingItems.map((item) => {
                const msg = ITEM_MESSAGES[item.id] || { title: item.name, advice: item.detail }
                return (
                  <div key={item.id} className="rounded-lg border border-destructive/20 bg-destructive/5 p-2.5">
                    <div className="flex items-start gap-1.5">
                      <span className="text-destructive text-[10px] mt-0.5">🔴</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">{msg.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{msg.advice}</p>
                        <button
                          onClick={() => handleJump(item)}
                          className="text-[10px] text-primary hover:text-primary/80 font-medium mt-1 underline underline-offset-2"
                        >
                          [跳到对应位置]
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {warningItems.length > 0 && (
            <>
              <div className="text-[10px] font-medium text-amber-600 mt-3 mb-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                建议优化
              </div>
              {warningItems.map((item) => {
                const msg = ITEM_MESSAGES[item.id] || { title: item.name, advice: item.detail }
                return (
                  <div key={item.id} className="rounded-lg border border-amber-200 bg-amber-50/50 p-2.5">
                    <div className="flex items-start gap-1.5">
                      <span className="text-amber-500 text-[10px] mt-0.5">🟡</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">{msg.title}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5 leading-relaxed">{msg.advice}</p>
                        <button
                          onClick={() => handleJump(item)}
                          className="text-[10px] text-primary hover:text-primary/80 font-medium mt-1 underline underline-offset-2"
                        >
                          [跳到对应位置]
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {blockingItems.length === 0 && warningItems.length === 0 && result.items.length > 0 && (
            <div className="text-xs text-emerald-600 text-center py-6 flex items-center justify-center gap-1">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 7.5L6 10.5L11 3.5" />
              </svg>
              这一章写得不错，没有检测到问题
            </div>
          )}

          {result.items.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-6">
              在编辑器中输入内容后自动检测
            </div>
          )}
        </div>

        <div className="border-t border-border p-3 space-y-1.5">
          <button
            onClick={onOpenReport}
            className="w-full px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
          >
            完整检测 →
          </button>
          <button
            onClick={onOpenDashboard}
            className="w-full px-3 py-1.5 rounded-lg border border-border text-muted-foreground text-xs hover:bg-secondary transition-colors flex items-center justify-center gap-1"
          >
            质量趋势
          </button>
        </div>
      </div>
    </div>
  )
}
