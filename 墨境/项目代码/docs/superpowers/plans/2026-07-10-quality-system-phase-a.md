# 统一质量中心 · 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将编辑器三个分散的质量触点合并为统一的「质量中心」体验，使用用户语言呈现，视觉统一为浅色主题。

**架构:** 不改底层检测引擎，仅改前台呈现层。右侧栏合规检测从 2 项升级到 `paragraphCheck()` 全 8 项，报告弹窗加一句话总结和用户语言文案，仪表盘加进度条总览。

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, TypeScript 6, lucide-react

## 全局约束

- 不改 `src/lib/ai/compliance.ts` 检测引擎逻辑，只新增辅助函数
- 所有面向用户的文案必须用口语化中文，不得出现"B类""A类""阻断项"等技术术语
- 颜色语义：红 = 必须改，黄 = 建议改，绿 = 通过，灰 = 需人工
- 编辑器右侧栏用 `glass-panel border-l border-border` 浅色风格，与左侧栏一致

---

### Task 1: 新增 `generateChapterSummary()` 辅助函数

**Files:**
- Modify: `src/lib/ai/compliance.ts` — 在文件末尾新增函数

**Interfaces:**
- Consumes: `ChapterCheckReport` 类型（该文件已有）
- Produces: `export function generateChapterSummary(report: ChapterCheckReport): string`

- [ ] **Step 1: 在 `src/lib/ai/compliance.ts` 末尾添加函数**

在文件最后（`polishCheck` 之后），新增：

```typescript
/**
 * 根据检测报告生成一句话自然语言总结（面向用户）
 * 用于章末自检弹窗顶部
 */
export function generateChapterSummary(report: ChapterCheckReport): string {
  const { score, compliant, wordCount, bodyDensity, bodyDensityStatus, openingHook } = report
  const parts: string[] = []

  if (score >= 4 && compliant) {
    parts.push('总体不错！')
    if (openingHook) parts.push('开头悬念到位，')
    if (bodyDensityStatus === '合理') parts.push('身体密度在黄金区间，')
    else if (bodyDensityStatus === '偏低') parts.push('身体密度偏低——建议多用动作代替心理描写，')
    else parts.push('身体密度偏高——可适当加入少量心理描写调节，')

    const failItems = report.items.filter(i => i.status === 'fail')
    const warnItems = report.items.filter(i => i.status === 'warning')
    if (failItems.length === 0 && warnItems.length <= 2) {
      parts.push('整体质量不错，可以直接进入下一章。')
    } else if (failItems.length > 0) {
      parts.push(`有 ${failItems.length} 个地方需要修改，改完会更好。`)
    } else {
      parts.push(`有几个小地方可以优化，建议看一眼。`)
    }
  } else if (score >= 3) {
    parts.push('有几个地方需要注意：')
    const issues: string[] = []
    if (!openingHook) issues.push('开头的55字缺少冲突或悬念')
    if (bodyDensityStatus === '偏低') issues.push('身体密度偏低，情绪靠"说"不靠"演"')
    if (bodyDensityStatus === '偏高') issues.push('身体密度偏高，全是动作缺少心理调节')
    const failItems = report.items.filter(i => i.status === 'fail')
    if (failItems.length > 0) issues.push(`${failItems.length} 项需要修改`)
    parts.push(issues.join('；') + '。建议修改后重新检测。')
  } else {
    parts.push('这一章存在明显问题，建议逐项修改后重新检测。')
  }

  return parts.join('')
}
```

- [ ] **Step 2: 运行类型检查**

```bash
cd "D:\codexvip\墨境\项目代码" ; npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/compliance.ts
git commit -m "feat: add generateChapterSummary helper for natural language quality report"
```

---

### Task 2: 章末自检弹窗 — 用户语言 + 一句话总结

**Files:**
- Modify: `src/components/report-modal.tsx`

**Interfaces:**
- Consumes: `generateChapterSummary()` (Task 1)
- Produces: 更新后的报告弹窗

- [ ] **Step 1: 导入 `generateChapterSummary`**

在文件顶部的 `import` 块中新增：
```typescript
import { generateChapterSummary } from '@/lib/ai/compliance'
```

- [ ] **Step 2: 在评分下方添加一句话总结**

在 `report-line` 代码块之后，插入：
```tsx
{/* ─── 一句话总结 ─── */}
<div className="mx-6 mb-3 px-4 py-3 rounded-xl bg-muted/30 border border-border/40">
  <p className="text-sm text-foreground leading-relaxed">{generateChapterSummary(report)}</p>
</div>
```

- [ ] **Step 3: 替换检查项文案为用户语言**

将当前 23 项检查的标题/详情替换为 Task 1 对应的口语化文案。在 `ITEM_TIER_MAP` 中对每项加 `userTitle` 和 `userAdvice` 字段：
```typescript
export const ITEM_TIER_MAP: Record<number, {
  tier: CheckTier; label: string; desc: string;
  userTitle: string;     // 用户看到的标题
  userAdvice: string;    // 改法建议
}> = {
  1:  { tier: 'metric',    label: '量化指标',  desc: '基于主语切换次数的统计',
       userTitle: '这一段写了太多件事',  userAdvice: '主语频繁切换，读者不知道该跟谁。一段只聚焦一个人物的行动。' },
  2:  { tier: 'precise',   label: '精确检测',  desc: '基于身体动作词库的精确计算',
       userTitle: '情绪是"说"出来的，不是"演"出来的',  userAdvice: '"他感到害怕"不如"他手心全是汗"。用身体动作代替心理描写。' },
  3:  { tier: 'precise',   label: '精确检测',  desc: '基于违规词库的多层检测',
       userTitle: '有些词反复出现',  userAdvice: '同一段里某些词多次出现，读起来像卡带。换个说法或者删掉多余的。' },
  4:  { tier: 'precise',   label: '精确检测',  desc: '基于A类正则模式匹配',
       userTitle: '连续用了太多递进判断句',  userAdvice: '全章递进判断句不超过1次，建议删掉多余的。' },
  5:  { tier: 'heuristic', label: '启发式建议', desc: '基于"像…"句式的简单统计',
       userTitle: '有重复的意象',  userAdvice: '同一个比喻用了太多次，换个更有新意的表达。' },
  6:  { tier: 'metric',    label: '量化指标',  desc: '引号内文字占比计算',
       userTitle: '对话占比偏低',  userAdvice: '加上一段两人对话可以调节叙事节奏。' },
  7:  { tier: 'metric',    label: '量化指标',  desc: '基于解释性关键词统计',
       userTitle: '解释性语句偏多',  userAdvice: '"因为""所以""这意味着"太多会削弱画面感，试着直接呈现场景。' },
  8:  { tier: 'ai_needed', label: '需AI辅助',  desc: '语义分析才能准确判断',
       userTitle: '旁白·台词·动作比例',  userAdvice: '需要人工判断，建议整体读一遍感受节奏。' },
  9:  { tier: 'ai_needed', label: '需AI辅助',  desc: '需理解情节动机归属',
       userTitle: '情节由角色性格驱动',  userAdvice: '需要人工判断——情节推进是角色自己的选择，还是作者安排？' },
  10: { tier: 'precise',   label: '精确检测',  desc: '基于AI模式词库匹配',
       userTitle: '检测到 AI 常用叙事套路',  userAdvice: '"画面一转""与此同时"这类词会提醒读者这是虚构故事，建议删掉。' },
  11: { tier: 'metric',    label: '量化指标',  desc: '句中"的"字密度统计',
       userTitle: '形容词用太多了',  userAdvice: '一句里出现3个以上"的"字会让句子变重，试着删掉一些修饰词。' },
  12: { tier: 'ai_needed', label: '需AI辅助',  desc: '需理解句式是否适合朗读',
       userTitle: '大白话测试',  userAdvice: '读出声试试——太书面化的句子会打断阅读节奏。' },
  13: { tier: 'ai_needed', label: '需AI辅助',  desc: '需理解叙述语感',
       userTitle: '口语化程度',  userAdvice: '叙事者距离故事太远还是太近？需要人工感受。' },
  14: { tier: 'ai_needed', label: '需AI辅助',  desc: '需分析事件时序逻辑',
       userTitle: '因果顺序',  userAdvice: '读者应该先看到动作，再知道原因——先果后因更有冲击力。' },
  15: { tier: 'heuristic', label: '启发式建议', desc: '基于标点和动词密度的段落级分析',
       userTitle: '连续紧张段落需要"透气"',  userAdvice: '连续多段高强度的动作/对话，读者会疲劳。中间插入一段环境描写或轻松互动。' },
  16: { tier: 'ai_needed', label: '需AI辅助',  desc: '需理解叙述视角归属',
       userTitle: '视角是否一致',  userAdvice: '当前视角角色不可能知道别人在想什么？需要人工核验。' },
  17: { tier: 'ai_needed', label: '需AI辅助',  desc: '需跨段落比对角色行为一致性',
       userTitle: '角色行为是否一致',  userAdvice: '角色在前文和后文的行为逻辑是否连贯？需要人工核验。' },
  18: { tier: 'ai_needed', label: '需AI辅助',  desc: '需理解时间线前后逻辑',
       userTitle: '时间线是否连贯',  userAdvice: '注意时间标记和事件先后顺序是否一致。' },
  19: { tier: 'ai_needed', label: '需AI辅助',  desc: '需综合评估段落节奏',
       userTitle: '节奏是否均衡',  userAdvice: '整章读下来的节奏感是否舒服？快慢段落穿插如何？' },
  20: { tier: 'ai_needed', label: '需AI辅助',  desc: '需判断心理描写是否贴合情境',
       userTitle: '心理描写是否自然',  userAdvice: '角色的心理反应是否符合当时的情景和性格？' },
  21: { tier: 'ai_needed', label: '需AI辅助',  desc: '需分析句长分布多样性',
       userTitle: '句式是否多样',  userAdvice: '连续太短或太长的句子会让节奏单调。长短句交替更耐读。' },
  22: { tier: 'ai_needed', label: '需AI辅助',  desc: '需分析叙事速度变化',
       userTitle: '叙事速度',  userAdvice: '重要场景放慢细节，过渡段落加快节奏——变速是否合理？' },
  23: { tier: 'precise',   label: '精确检测',  desc: '基于动作词+解释词上下文检测',
       userTitle: '动作后跟了解释',  userAdvice: '做了就做了，不需要解释原因。删掉"因为""所以"保留纯粹的动作。' },
}
```

- [ ] **Step 4: 更新渲染代码使用 `userTitle` 和 `userAdvice`**

在展开详情区域，将 `item.detail` 替换为 `item.userAdvice`，将 `cfg.desc` 替换为直接用 `userTitle`。同时修改 `TieredItem` 类型：
```typescript
export interface TieredItem extends ChapterCheckItem {
  tier: CheckTier
  tierLabel: string
  tierDesc: string
  userTitle: string
  userAdvice: string
}
```

- [ ] **Step 5: 默认折叠已通过项**

在 `filteredItems` 逻辑中，当 `tab === 'all'` 时，通过项默认不显示（改为底部分页计数），只显示待处理和需人工判断。

- [ ] **Step 6: 运行类型检查**

```bash
cd "D:\codexvip\墨境\项目代码" ; npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/report-modal.tsx
git commit -m "feat: update report modal with user-friendly language and summary"
```

---

### Task 3: 编辑器右侧栏 — 升级到 8 项 + 浅色视觉

**Files:**
- Create: `src/components/quality-sidebar.tsx`
- Modify: `src/app/editor/[id]/page.tsx` — 替换内联合规检测代码

**Interfaces:**
- Consumes: `paragraphCheck()` (来自 `compliance.ts`), `getChapterReport()` (来自 `report-store.ts`)
- Produces: `<QualitySidebar>` 组件

- [ ] **Step 1: 创建 `src/components/quality-sidebar.tsx`**

```typescript
'use client'

import { useMemo, useRef } from 'react'
import { cn } from '@/lib/utils/utils'
import { paragraphCheck, type ParagraphCheckItem } from '@/lib/ai/compliance'
import { toPlainText } from '@/lib/utils/utils'
import type { Editor } from '@tiptap/react'

interface QualitySidebarProps {
  content: string
  editorRef: React.RefObject<Editor | null>
  /** 右侧栏是否打开 */
  open: boolean
  /** 跳转到章末自检 */
  onOpenReport: () => void
  /** 跳转到质量趋势 */
  onOpenDashboard: () => void
}

// 8项检测的口语化文案
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

export function QualitySidebar({ content, editorRef, open, onOpenReport, onOpenDashboard }: QualitySidebarProps) {
  const result = useMemo(() => paragraphCheck(toPlainText(content)), [content])

  const blockingItems = result.items.filter(i => i.isBlocking)
  const warningItems = result.items.filter(i => !i.isBlocking)

  const handleJump = (index: number) => {
    const ed = editorRef.current
    if (!ed) return
    // 跳转到对应段落
    const paragraphs = toPlainText(content).split('\n').filter(p => p.trim())
    let charOffset = 0
    for (let i = 0; i < paragraphs.length && i < index; i++) {
      charOffset += paragraphs[i].length + 1
    }
    const docText = ed.state.doc.textContent
    if (charOffset < docText.length) {
      ed.chain().focus().setTextSelection({ from: charOffset, to: charOffset + 1 }).run()
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
    }
  }

  return (
    <div
      className={cn(
        'h-full flex flex-col overflow-hidden transition-all duration-200 glass-panel border-l border-border',
        open ? 'w-[260px]' : 'w-0',
      )}
      style={open ? { width: '260px' } : undefined}
    >
      <div className="w-[260px] h-full flex flex-col">
        {/* 头部 */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 2.5L3 5V10c0 2.5 2 4.5 4 5 2-.5 4-2.5 4-5V5l-1-.5" />
            </svg>
            质量检测
          </h3>
          <span className="text-[10px] text-muted-foreground">
            {blockingItems.length > 0 ? `${blockingItems.length}项需处理` : '暂无违规'}
          </span>
        </div>

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {/* 阻断项 */}
          {blockingItems.length > 0 && (
            <div className="text-[10px] font-medium text-destructive mb-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
              需要修改
            </div>
          )}
          {blockingItems.map((item, idx) => {
            const msg = ITEM_MESSAGES[item.id] || { title: item.name, advice: item.detail }
            return (
              <div key={item.id} className="rounded-lg border border-destructive/20 bg-destructive/5 p-2.5">
                <div className="flex items-start gap-1.5">
                  <span className="text-destructive text-[10px] mt-0.5">🔴</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{msg.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{msg.advice}</p>
                    <button
                      onClick={() => handleJump(idx)}
                      className="text-[10px] text-primary hover:text-primary/80 font-medium mt-1 underline underline-offset-2"
                    >
                      [跳到对应位置]
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {/* 建议项 */}
          {warningItems.length > 0 && (
            <div className="text-[10px] font-medium text-amber-600 mt-3 mb-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              建议优化
            </div>
          )}
          {warningItems.map((item, idx) => {
            const msg = ITEM_MESSAGES[item.id] || { title: item.name, advice: item.detail }
            return (
              <div key={item.id} className="rounded-lg border border-amber-200 bg-amber-50/50 p-2.5">
                <div className="flex items-start gap-1.5">
                  <span className="text-amber-500 text-[10px] mt-0.5">🟡</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{msg.title}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5 leading-relaxed">{msg.advice}</p>
                    <button
                      onClick={() => handleJump(idx + blockingItems.length)}
                      className="text-[10px] text-primary hover:text-primary/80 font-medium mt-1 underline underline-offset-2"
                    >
                      [跳到对应位置]
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {/* 全部通过 */}
          {result.items.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-6">暂无检测结果</div>
          )}
          {blockingItems.length === 0 && warningItems.length === 0 && result.items.length > 0 && (
            <div className="text-xs text-emerald-600 text-center py-6 flex items-center justify-center gap-1">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7.5L6 10.5L11 3.5" />
              </svg>
              这一章写得不错，没有检测到问题
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="border-t border-border p-3 space-y-1.5">
          <button
            onClick={onOpenReport}
            className="w-full px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 2.5L3 5V10c0 2.5 2 4.5 4 5 2-.5 4-2.5 4-5V5l-1-.5" />
            </svg>
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
```

- [ ] **Step 2: 在编辑器页面中引入并替换**

编辑 `src/app/editor/[id]/page.tsx`：
- 导入 `QualitySidebar`
- 替换内联的右侧栏（`rightTab === 'compliance'` 部分）为 `<QualitySidebar>`
- 保留 `rightPanelOpen` 状态控制，但改为专门的质量侧栏

- [ ] **Step 3: 删除编辑器中的旧合规检测代码**

移除 `rightTab === 'compliance' ? (() => { ... })() : null` 块（约 20 行内联代码）。不再需要 `rightTab === 'compliance'` 这个分支。

- [ ] **Step 4: 运行类型检查**

```bash
cd "D:\codexvip\墨境\项目代码" ; npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/components/quality-sidebar.tsx src/app/editor/[id]/page.tsx
git commit -m "feat: extract quality sidebar with full 8 checks and user-friendly copy"
```

---

### Task 4: 编辑器顶栏「质量」统一入口

**Files:**
- Modify: `src/app/editor/[id]/page.tsx`

- [ ] **Step 1: 将顶部"章末自检"按钮改为"质量"下拉菜单**

将当前：
```tsx
<Button size="sm" className="bg-success ..." onClick={() => setShowReport(true)}>
  <ClipboardCheck /> 章末自检
</Button>
```
改为：
```tsx
<div className="relative">
  <Button size="sm" className="bg-success ..." onClick={() => setShowQualityMenu(!showQualityMenu)}>
    <ClipboardCheck /> 质量 ▾
  </Button>
  {showQualityMenu && (
    <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-elevated border border-border py-1 w-36 z-50">
      <button onClick={() => { setShowQualityMenu(false); setQualitySidebarOpen(true) }}
        className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary flex items-center gap-2">
        实时检测
      </button>
      <button onClick={() => { setShowQualityMenu(false); setShowReport(true) }}
        className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary flex items-center gap-2">
        章末自检
      </button>
      <button onClick={() => { setShowQualityMenu(false); router.push(`/quality-check/${projectId}`) }}
        className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary flex items-center gap-2">
        质量趋势
      </button>
    </div>
  )}
</div>
```

- [ ] **Step 2: 添加 `showQualityMenu` 状态**

添加状态变量 `const [showQualityMenu, setShowQualityMenu] = useState(false)`

- [ ] **Step 3: 调整右侧栏状态变量**

原 `rightPanelOpen` / `setRightPanelOpen` / `rightTab` 依然保留，但质量侧栏使用独立状态 `qualitySidebarOpen`。

- [ ] **Step 4: 运行类型检查**

```bash
cd "D:\codexvip\墨境\项目代码" ; npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/app/editor/[id]/page.tsx
git commit -m "feat: unified quality menu in editor toolbar"
```

---

### Task 5: 质量仪表盘 — 一句话总评 + 各章进度条

**Files:**
- Modify: `src/components/quality-dashboard.tsx`

- [ ] **Step 1: 顶部添加一句话总评**

在所有卡片之前，根据 `summary` 数据生成自然语言总评。规则：
```typescript
function generateDashboardSummary(summary: NonNullable<ReturnType<typeof getProjectQualitySummary>>): string {
  const parts: string[] = []
  if (summary.avgScore >= 4) parts.push('整体质量稳定，')
  else if (summary.avgScore >= 3) parts.push('整体质量中等，有几章需要关注，')
  else parts.push('整体质量偏低，建议逐章检查，')

  if (summary.complaintRate >= 80) parts.push(`合规率 ${summary.complaintRate}% 表现不错。`)
  else if (summary.complaintRate >= 50) parts.push(`合规率 ${summary.complaintRate}%，仍有提升空间。`)
  else parts.push(`合规率仅 ${summary.complaintRate}%，需要重点关注。`)

  return parts.join('')
}
```

- [ ] **Step 2: 将违规热力图表格改为各章进度条**

替换当前表格为进度条列表：
```tsx
{reports.map(r => (
  <div
    key={r.chapterId}
    onClick={() => setSelectedChapter(r.chapterId === selectedChapter ? null : r.chapterId)}
    className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors border-b border-border/30 last:border-0"
  >
    <span className="text-sm font-medium w-24 truncate">{r.chapterTitle}</span>
    <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{
          width: `${(r.score / 5) * 100}%`,
          background: r.score >= 4 ? '#10b981' : r.score >= 3 ? '#f59e0b' : '#ef4444',
        }}
      />
    </div>
    <span className={`text-xs font-bold w-8 text-right ${r.score >= 4 ? 'text-emerald-600' : r.score >= 3 ? 'text-amber-600' : 'text-destructive'}`}>
      {r.score}
    </span>
    <span className="text-xs w-6 text-center">
      {r.compliant
        ? <span className="text-emerald-500">✓</span>
        : <span className="text-destructive">⚠</span>
      }
    </span>
  </div>
))}
```

- [ ] **Step 3: 运行类型检查**

```bash
cd "D:\codexvip\墨境\项目代码" ; npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/quality-dashboard.tsx
git commit -m "feat: dashboard summary and progress bars per chapter"
```

---

### Task 6: 编辑器右侧栏视觉改浅色

**Files:**
- Modify: `src/app/editor/[id]/page.tsx` — 右侧栏容器样式
- 注: Task 3 创建的 `QualitySidebar` 组件已使用浅色样式，此任务针对编辑器页面中其他可能使用暗色玻璃态的区域。

- [ ] **Step 1: 确认右侧栏外层容器样式**

原右侧栏容器使用 `glass-panel` 暗色透明背景。在 Task 3 中 `QualitySidebar` 已使用 `glass-panel border-l border-border`，需与左侧栏一致检查。

- [ ] **Step 2: 运行 dev server 验证**

```bash
cd "D:\codexvip\墨境\项目代码" ; pnpm dev
```
人工打开编辑器，确认右侧栏呈现为浅色。

- [ ] **Step 3: Commit**

```bash
git add src/app/editor/[id]/page.tsx
git commit -m "style: unify sidebar to light theme"
```
