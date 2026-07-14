'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { abTestManager } from '@/lib/prompts'
import type { ABExperiment } from '@/lib/prompts'
import { FlaskConical, Play, Square, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils/utils'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'text-muted-foreground' },
  running: { label: '运行中', color: 'text-emerald-500' },
  paused: { label: '已暂停', color: 'text-amber-500' },
  completed: { label: '已完成', color: 'text-blue-500' },
  stopped: { label: '已停止', color: 'text-destructive' },
}

export function ABPanel() {
  const [experiments, setExperiments] = useState<ABExperiment[]>([])
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    setExperiments(abTestManager.list())
  }, [refresh])

  const handleStart = (id: string) => {
    abTestManager.start(id)
    setRefresh(r => r + 1)
  }

  const handleStop = (id: string) => {
    abTestManager.stop(id)
    setRefresh(r => r + 1)
  }

  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-muted-foreground" />
          A/B 实验
        </h2>

        {experiments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">暂无实验</p>
        ) : (
          <div className="space-y-3">
            {experiments.map(exp => {
              const status = STATUS_LABELS[exp.status] || STATUS_LABELS.draft
              const result = exp.status === 'running' || exp.status === 'completed' ? abTestManager.getResult(exp.id) : null

              return (
                <div key={exp.id} className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-foreground">{exp.name}</span>
                      <span className={cn("ml-2 text-xs font-medium", status.color)}>{status.label}</span>
                    </div>
                    <div className="flex gap-1">
                      {exp.status === 'draft' && (
                        <button onClick={() => handleStart(exp.id)}
                          className="px-2 py-1 rounded text-xs bg-emerald-500 text-white hover:bg-emerald-600">
                          <Play className="w-3 h-3 inline mr-0.5" />启动
                        </button>
                      )}
                      {exp.status === 'running' && (
                        <button onClick={() => handleStop(exp.id)}
                          className="px-2 py-1 rounded text-xs bg-destructive text-white hover:bg-destructive/80">
                          <Square className="w-3 h-3 inline mr-0.5" />停止
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {exp.description && <p className="mb-2">{exp.description}</p>}
                    <div className="flex gap-4">
                      <span>类型: {exp.toolType}</span>
                      <span>目标样本: {exp.targetSampleSize}</span>
                      <span>实验组: {exp.groups.length}</span>
                    </div>
                  </div>

                  {/* 实验组对比 */}
                  {result && (
                    <div className="grid grid-cols-2 gap-2">
                      {result.groupStats.map(g => (
                        <div key={g.group.id}
                          className={cn(
                            "bg-secondary rounded p-2 text-xs",
                            result.winner === g.group.id && "ring-2 ring-emerald-400"
                          )}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            <span className="font-medium">{g.group.name}</span>
                            {result.winner === g.group.id && <Trophy className="w-3 h-3 text-emerald-500" />}
                          </div>
                          <div className="text-muted-foreground space-y-0.5">
                            <div>满意: {g.stats.avgSatisfaction}/5</div>
                            <div>采纳: {g.stats.adoptionRate}%</div>
                            <div>样本: {g.stats.sampleSize}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {exp.groups.length > 0 && (
                    <div className="text-[11px] text-muted-foreground">
                      {exp.groups.map(g => (
                        <span key={g.id} className="mr-3">
                          {g.name}: {g.templateId}@{g.templateVersion}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
