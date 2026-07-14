'use client'

import { useState, useEffect } from 'react'
import { getCoolingState, getActiveForeshadows, getCharacterProfiles } from '@/lib/db/store'
import { getAllChapterReports } from '@/lib/ai/report-store'

import { C } from '@/lib/theme/tokens'
const S = C

export function StatusPanel({
  projectId,
  chapterId,
  chapterOrder,
  bodyDensity,
  violations,
  onOpenReport,
  onOpenQuality,
}: {
  projectId: string
  chapterId: string
  chapterOrder: number
  bodyDensity: number
  violations: string[]
  onOpenReport: () => void
  onOpenQuality: () => void
}) {
  const cooling = getCoolingState(projectId)
  const foreshadows = getActiveForeshadows(projectId)
  const characters = getCharacterProfiles(projectId)
  const allReports = getAllChapterReports(projectId)
  const prevReport = allReports.filter(r => r.chapterOrder === chapterOrder - 1)[0] || null

  // 收集所有角色的成长记录
  const allGrowth = characters.flatMap(c =>
    (c.growthHistory || []).map(g => ({ characterName: c.name, ...g }))
  ).sort((a, b) => b.timestamp - a.timestamp)

  return (
    <div className="flex-1 overflow-y-auto p-3.5">
      <div className="text-xs" style={{ color: S.ink }}>

        {/* 冷却状态 */}
        <div className="mb-4">
          <div className="text-[10px] font-semibold uppercase mb-2" style={{ color: S.muted }}>冷却状态</div>
          <div className="text-[10px] leading-relaxed space-y-1" style={{ color: S.muted }}>
            <div><span style={{ color: S.ink, fontWeight: 600 }}>身体密度</span> {bodyDensity}%</div>
            <div><span style={{ color: S.ink, fontWeight: 600 }}>违规项</span> {violations.length > 0 ? `${violations.length}项` : '无'}</div>
            <div>
              <span style={{ color: S.ink, fontWeight: 600 }}>55字生死线</span>{' '}
              <span style={{ color: bodyDensity >= 30 ? S.success : S.dest }}>{bodyDensity >= 30 ? '✅ 通过' : '⚠️ 注意'}</span>
            </div>
            {cooling && (
              <>
                <div><span style={{ color: S.ink, fontWeight: 600 }}>近3章情感</span> {cooling.emotions?.slice(-3).join('→') || '无数据'}</div>
                <div><span style={{ color: S.ink, fontWeight: 600 }}>感官冷却</span> {formatCooling(cooling.senses)}</div>
                <div><span style={{ color: S.ink, fontWeight: 600 }}>场景方法</span> {formatCooling(cooling.scenes)}</div>
              </>
            )}
          </div>
        </div>

        {/* 活跃伏笔 */}
        <div className="mb-4">
          <div className="text-[10px] font-semibold uppercase mb-2" style={{ color: S.muted }}>
            活跃伏笔 {foreshadows.length > 0 && `· ${foreshadows.length}条`}
          </div>
          {foreshadows.length > 0 ? (
            <div className="space-y-1">
              {foreshadows.slice(0, 5).map(f => (
                <div key={f.id} className="px-2 py-1.5 rounded text-[10px]" style={{ background: S.bg2 }}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate" style={{ color: S.ink }}>{f.content}</span>
                    <span className="shrink-0 ml-1" style={{
                      color: f.importance === 'major' ? S.dest : S.muted,
                    }}>{f.importance === 'major' ? '重要' : '次要'}</span>
                  </div>
                  <span className="text-[9px]" style={{ color: S.muted }}>第{f.chapterPlanted}章埋设{f.chapterPlannedResolution ? ` · 预计${f.chapterPlannedResolution}章回收` : ''}</span>
                </div>
              ))}
              {foreshadows.length > 5 && (
                <p className="text-[10px] text-center" style={{ color: S.muted }}>…还有 {foreshadows.length - 5} 条</p>
              )}
            </div>
          ) : (
            <div className="text-[10px] text-center py-3 rounded" style={{ background: S.bg2, color: S.muted }}>
              📋 暂无伏笔数据
            </div>
          )}
        </div>

        {/* 角色成长 */}
        <div className="mb-4">
          <div className="text-[10px] font-semibold uppercase mb-2" style={{ color: S.muted }}>
            角色成长 {allGrowth.length > 0 && `· ${allGrowth.length}条`}
          </div>
          {allGrowth.length > 0 ? (
            <div className="space-y-1">
              {allGrowth.slice(0, 5).map(g => (
                <div key={g.id || `${g.characterName}_${g.timestamp}`} className="px-2 py-1.5 rounded text-[10px]" style={{ background: S.bg2 }}>
                  <div className="flex items-center gap-1">
                    <span className="font-medium" style={{ color: S.pri }}>{g.characterName}</span>
                    <span className="text-[9px]" style={{ color: S.muted }}>{triggerLabel(g.trigger)}</span>
                  </div>
                  <p className="mt-0.5" style={{ color: S.muted }}>{g.changeDescription}</p>
                </div>
              ))}
              {allGrowth.length > 5 && (
                <p className="text-[10px] text-center" style={{ color: S.muted }}>…还有 {allGrowth.length - 5} 条</p>
              )}
            </div>
          ) : (
            <div className="text-[10px] text-center py-3 rounded" style={{ background: S.bg2, color: S.muted }}>
              🔄 暂无成长记录
            </div>
          )}
        </div>

        {/* 上章检测 */}
        <div className="mb-4">
          <div className="text-[10px] font-semibold uppercase mb-2" style={{ color: S.muted }}>上章检测</div>
          {prevReport ? (
            <div className="px-2.5 py-2 rounded text-[10px] space-y-1" style={{ background: S.bg2 }}>
              <div className="flex items-center justify-between">
                <span style={{ color: S.ink, fontWeight: 600 }}>第{prevReport.chapterOrder}章</span>
                <span style={{
                  color: prevReport.compliant ? S.success : S.dest,
                }}>{prevReport.compliant ? '✅ 合规' : '⚠️ 有违规'}</span>
              </div>
              <div><span style={{ color: S.muted }}>评分</span> <span style={{ color: S.ink, fontWeight: 600 }}>{prevReport.score}/5</span></div>
              <div><span style={{ color: S.muted }}>身体密度</span> <span style={{ color: S.ink }}>{prevReport.bodyDensity}%</span></div>
              <div><span style={{ color: S.muted }}>违规详情</span> <span style={{ color: S.ink }}>
                {[
                  prevReport.forbiddenA > 0 ? `A类${prevReport.forbiddenA}` : '',
                  prevReport.forbiddenB > 0 ? `B类${prevReport.forbiddenB}` : '',
                  prevReport.forbiddenC > 0 ? `C类${prevReport.forbiddenC}` : '',
                  prevReport.forbiddenD > 0 ? `D类${prevReport.forbiddenD}` : '',
                ].filter(Boolean).join(' · ') || '无'}
              </span></div>
              <div className="text-[9px] mt-1 p-1.5 rounded" style={{ background: '#fff', color: S.muted }}>{prevReport.reportLine}</div>
            </div>
          ) : (
            <div className="text-[10px] text-center py-3 rounded" style={{ background: S.bg2, color: S.muted }}>
              📊 暂无上章报告
            </div>
          )}
        </div>

        {/* 快捷操作 */}
        <div className="mt-4 pt-3 border-t" style={{ borderColor: S.border }}>
          <button onClick={onOpenReport} className="w-full py-2 mb-2 text-xs rounded text-center font-medium"
            style={{ border: '1px solid ' + S.border, color: S.muted }}>
            章末自检
          </button>
          <button onClick={onOpenQuality} className="w-full py-2 text-xs rounded text-center font-medium"
            style={{ border: '1px solid ' + S.border, color: S.muted }}>
            实时检测面板
          </button>
        </div>

      </div>
    </div>
  )
}

function formatCooling(data: Record<string, any> | undefined): string {
  if (!data || Object.keys(data).length === 0) return '无数据'
  return Object.entries(data)
    .slice(0, 4)
    .map(([k, v]) => `${k}${Array.isArray(v) ? `(${v.length}次)` : ''}`)
    .join(' · ')
}

function triggerLabel(trigger: string): string {
  const labels: Record<string, string> = {
    different_choice: '重大选择',
    value_shift: '价值观偏移',
    relationship_change: '关系质变',
    ability_identity_change: '能力质变',
  }
  return labels[trigger] || trigger
}
