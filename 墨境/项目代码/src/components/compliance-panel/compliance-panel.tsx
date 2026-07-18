'use client'

import { useState, useMemo, useEffect } from 'react'

import { computePanelData } from './use-compliance-data'

interface CompliancePanelProps {
  editorContent: string
  open: boolean
  onToggle: () => void
}

const SENSE_SVGS: Record<string, React.ReactNode> = {
  eye: (<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 7C1 7 3 2.5 7 2.5C11 2.5 13 7 13 7C13 7 11 11.5 7 11.5C3 11.5 1 7 1 7Z" /><circle cx="7" cy="7" r="2" /></svg>),
  hand: (<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 4V2C7 1.5 6.5 1 6 1C5.5 1 5 1.5 5 2V6" /><path d="M5 6V3C5 2.5 4.5 2 4 2C3.5 2 3 2.5 3 3V7.5C3 9.5 4.5 12 7 12H9C10.5 12 12 10.5 12 9V7.5C12 6.5 11.5 6 10.5 6C10 6 9.5 6.5 9.5 7" /></svg>),
  ear: (<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 5C10 2.5 8.5 1 6.5 1C4.5 1 3 2.5 3 5C3 7 4.5 8 5 8.5C5.5 9 5.5 10 5.5 11" /><path d="M5.5 11C5.5 11.5 6 12 6.5 12C7 12 7.5 11.5 7.5 11" /><path d="M8 7.5C9 7 10 6 10 5" /></svg>),
  nose: (<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 9.5C4.5 9.5 7 11.5 9.5 9.5" /><path d="M5 9C4.5 7 6 4 7 3C8 4 9.5 7 9 9" /></svg>),
  mouth: (<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5C3 8.5 5 11.5 7 11.5C9 11.5 11 8.5 11 8.5" /></svg>),
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  metrics: (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 16V9" /><path d="M7 16V5" /><path d="M11 16V8" /><path d="M15 16V11" /></svg>),
  compliance: (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2.5L16 5V10C16 13.5 13.5 16.5 10 18C6.5 16.5 4 13.5 4 10V5L10 2.5Z" /><path d="M7.5 10.5L9 12L12.5 8.5" /></svg>),
  engine: (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15.5L5 14" /><path d="M15 5L16 4.5" /><path d="M8 5L9 7" /><path d="M12 5L11 7" /><path d="M5 8L7 9" /><path d="M5 12L7 11" /><path d="M15 8L13 9" /><path d="M15 12L13 11" /><circle cx="10" cy="10" r="6.5" /><path d="M10 6V10.5L13 12" /></svg>),
  story: (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 3.5H10V16.5H4C3.5 16.5 3 16 3 15.5V4.5C3 4 3.5 3.5 4 3.5Z" /><path d="M10 3.5H16C16.5 3.5 17 4 17 4.5V15.5C17 16 16.5 16.5 16 16.5H10V3.5Z" /><path d="M10 4V16" /></svg>),
}

export function CompliancePanel({ editorContent, open, onToggle }: CompliancePanelProps) {
  const data = useMemo(() => computePanelData(editorContent || ''), [editorContent])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onToggle() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onToggle])

  const { metrics, compliance, engine, story } = data

  return (
    <>
      {!open && (
        <button onClick={onToggle}
          className="group absolute right-0 top-1/2 z-10 flex h-20 w-8 -translate-y-1/2 items-center justify-center rounded-l-lg bg-[#c4956a] text-white shadow-lg transition-all duration-300 hover:w-9 hover:shadow-xl"
          style={{ boxShadow: '-2px 0 12px rgba(196,149,106,0.2)' }} aria-label="展开合规面板">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 16V9" /><path d="M7 16V5" /><path d="M11 16V8" /><path d="M15 16V11" /></svg>
          <span className="absolute right-10 hidden rounded bg-[rgba(232,230,225,0.15)] px-2.5 py-1 text-xs text-white group-hover:block whitespace-nowrap">合规面板</span>
        </button>
      )}

      <div className={`absolute right-0 top-0 h-full z-20 overflow-hidden transition-all duration-300 border-l border-border backdrop-blur-[16px] [-webkit-backdrop-filter:blur(16px)] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] ${open ? 'w-[300px]' : 'w-0'}`}
        style={{ background: 'var(--color-background)' }}>
        <div className="flex h-full w-[300px] flex-col overflow-y-auto px-4 py-5">
          <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-[13px] font-semibold text-foreground tracking-[0.05em]">创作合规</h3>
            <button onClick={onToggle} className="text-muted-foreground/20 transition-colors hover:text-foreground" aria-label="关闭面板">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3L11 11" /><path d="M11 3L3 11" /></svg>
            </button>
          </div>

          <CategorySection icon={CATEGORY_ICONS.metrics} iconClass="gold" title="核心指标" badge={`${metrics.bodyDensity}%`}>
            <MetricRow label="身体密度" value={`${metrics.bodyDensity}%`} progress={metrics.bodyDensity} color="gold" />
            <MetricRow label="冲突强度" value={`L${metrics.conflictLevel}`} progress={metrics.conflictLevel * 20} color="warn" />
            <DetailRow label="字数" value={`${metrics.wordCount.toLocaleString()} 字`} />
            <DetailRow label="对话占比" value={`${metrics.dialoguePercent}%`} />
          </CategorySection>

          <CategorySection icon={CATEGORY_ICONS.compliance} iconClass="red" title="合规检测"
            badge={`${compliance.classB.violations + (compliance.classA.count > compliance.classA.max ? 1 : 0) + compliance.postActionExplain.count}`} badgeWarn>
            <StatusRow label="A类 · 递进判断句" count={compliance.classA.count} max={compliance.classA.max} />
            <StatusRow label="B类 · 常规禁用词" count={compliance.classB.violations} max={0} warn />
            <StatusRow label="C类 · 连接词" count={compliance.classC.count} max={-1} warn />
            <StatusRow label="动作后解释" count={compliance.postActionExplain.count} max={0} />
          </CategorySection>

          <CategorySection icon={CATEGORY_ICONS.engine} iconClass="purple" title="创作引擎" badge={engine.scenes.find(s => s.status === 'available')?.id || '—'}>
            <div className="mb-1 text-xs text-muted-foreground">场景方法</div>
            <div className="mb-2 flex flex-wrap gap-1 text-xs text-foreground">
              {engine.scenes.map(s => (
                <span key={s.id} className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 ${s.status === 'available' ? 'bg-[rgba(196,149,106,0.1)] font-medium text-[#c4956a]' : s.status === 'cooling' ? 'opacity-50' : 'opacity-35'}`}>
                  {s.id}{s.status === 'available' ? '●' : s.status === 'cooling' ? '◐' : '○'}
                </span>
              ))}
            </div>
            <div className="mb-1 text-xs text-muted-foreground">感官通道</div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {engine.senses.map(s => (
                <span key={s.id} className={`inline-flex items-center gap-0.5 ${s.active ? 'text-[#c4956a]' : 'text-muted-foreground/30'}`}>
                  {SENSE_SVGS[s.icon]}{s.active ? '✓' : '○'}
                </span>
              ))}
            </div>
            <DetailRow label="当前风格" value={engine.style} />
          </CategorySection>

          <CategorySection icon={CATEGORY_ICONS.story} iconClass="green" title="伏笔与角色" badge={`${story.activeForeshadowing.length}条`}>
            <DetailRow label="活跃伏笔" value={story.activeForeshadowing.length > 0 ? story.activeForeshadowing.map(f => `${f.name}`).join(' · ') : '无活跃伏笔'} />
            <DetailRow label="角色在场" value={`${story.charactersInScene}/${story.totalCharacters}`} />
          </CategorySection>
        </div>
      </div>
    </>
  )
}

function CategorySection({ icon, iconClass, title, badge, badgeWarn, children }: {
  icon: React.ReactNode; iconClass: string; title: string; badge: string; badgeWarn?: boolean; children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mb-0.5 overflow-hidden rounded-xl transition-all duration-200">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 transition-colors duration-200 hover:bg-[rgba(196,149,106,0.06)]" aria-expanded={open}>
        <div className="flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm ${
            iconClass === 'gold' ? 'bg-[rgba(196,149,106,0.12)] text-[#c4956a]' :
            iconClass === 'red' ? 'bg-destructive/10 text-destructive' :
            iconClass === 'purple' ? 'bg-[rgba(139,92,246,0.1)] text-[#8b5cf6]' :
            'bg-success/10 text-success'
          }`}>{icon}</div>
          <span className="text-[13px] font-medium text-foreground">{title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-semibold ${badgeWarn ? 'text-destructive' : 'text-[#c4956a]'}`}>{badge}</span>
          <svg className={`h-2.5 w-2.5 text-muted-foreground/30 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1L5 5L9 1" /></svg>
        </div>
      </button>
      <div className={`overflow-hidden transition-all duration-200 ${open ? 'max-h-80' : 'max-h-0'}`}>
        <div className="space-y-1 px-3 pb-3 pt-1">{children}</div>
      </div>
    </div>
  )
}

function MetricRow({ label, value, progress, color }: { label: string; value: string; progress: number; color: string }) {
  return (
    <div className="flex items-center justify-between py-[5px] text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-medium text-foreground">{value}</span>
        <div className="h-1 w-14 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(progress, 100)}%`,
              background: color === 'gold' ? '#c4956a' : color === 'warn' ? 'var(--color-warning)' : 'var(--color-success)' }} />
        </div>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-[5px] text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground max-w-[160px] truncate" title={value}>{value}</span>
    </div>
  )
}

function StatusRow({ label, count, max, warn }: { label: string; count: number; max: number; warn?: boolean }) {
  const isPass = max <= 0 ? count === 0 : count <= max
  return (
    <div className="flex items-center justify-between py-[5px] text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className={`font-medium ${isPass ? 'text-success' : 'text-destructive'}`}>{max > 0 ? `${count}/${max}` : `${count}次`}</span>
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${isPass ? 'bg-success' : 'bg-destructive'}`} />
      </div>
    </div>
  )
}
