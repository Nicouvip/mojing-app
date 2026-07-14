'use client'

export type WorkflowStage = 'plan' | 'write' | 'review' | 'deliver'

interface WorkflowBarProps {
  currentStage: WorkflowStage
  onStageChange: (stage: WorkflowStage) => void
  wordCount: number
  bodyDensity: number
}

const STAGES: { id: WorkflowStage; label: string }[] = [
  { id: 'plan', label: '规划' },
  { id: 'write', label: '写作' },
  { id: 'review', label: '自查' },
  { id: 'deliver', label: '交付' },
]

export function WorkflowBar({ currentStage, onStageChange, wordCount, bodyDensity }: WorkflowBarProps) {
  const currentIdx = STAGES.findIndex(s => s.id === currentStage)

  return (
    <div className="flex items-center justify-between border-t border-border bg-background px-6 py-2.5 text-xs">
      {/* 左侧：阶段按钮 */}
      <div className="flex items-center gap-0">
        {STAGES.map((s, i) => {
          const isDone = i < currentIdx
          const isCurrent = s.id === currentStage
          const isPending = i > currentIdx

          return (
            <div key={s.id} className="flex items-center">
              <button
                onClick={() => onStageChange(s.id)}
                className={`flex items-center gap-1 px-3 py-1 rounded-md transition-all duration-200 ${
                  isCurrent
                    ? 'bg-primary/10 text-primary font-medium'
                    : isDone
                    ? 'text-muted-foreground/60 hover:text-foreground'
                    : 'text-muted-foreground/30 cursor-not-allowed'
                }`}
                disabled={isPending}
                aria-label={`${s.label}阶段`}
                title={isPending ? '请先完成上一阶段' : `${s.label}阶段`}
              >
                <span className="text-[11px]">
                  {isDone ? '✓' : isCurrent ? '●' : '○'}
                </span>
                <span>{s.label}</span>
              </button>
              {i < STAGES.length - 1 && (
                <span className="text-muted-foreground/20 mx-1">—</span>
              )}
            </div>
          )
        })}
      </div>

      {/* 右侧：指标 + 工具 */}
      <div className="flex items-center gap-4">
        <span className="text-muted-foreground/60">
          字数: <span className="text-foreground font-medium">{wordCount.toLocaleString()}</span>
        </span>
        <span className="text-muted-foreground/60">
          密度: <span className={`font-medium ${bodyDensity >= 40 ? 'text-[#6a8a6a]' : bodyDensity >= 25 ? 'text-[#b8a060]' : 'text-destructive'}`}>{bodyDensity}%</span>
        </span>
      </div>
    </div>
  )
}
