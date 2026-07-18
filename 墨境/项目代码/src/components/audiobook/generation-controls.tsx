'use client'

import { Play, Square, Download, ChevronDown } from 'lucide-react'

export interface GenerationControlsProps {
  isGenerating: boolean
  progress: number
  selectedCount: number
  totalCount: number
  onGenerate: () => void
  onGenerateAll?: () => void
  onExport?: () => void
  onExportSRT?: () => void
  disabled?: boolean
}

export function GenerationControls({
  isGenerating, progress, selectedCount, totalCount,
  onGenerate, onGenerateAll, onExport, onExportSRT, disabled = false,
}: GenerationControlsProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* 生成按钮 */}
      <button onClick={onGenerate} disabled={disabled || isGenerating || selectedCount === 0}
        className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
        {isGenerating ? (
          <>
            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            生成中 {progress > 0 && `${Math.round(progress)}%`}
          </>
        ) : (
          <>
            <Play className="w-3.5 h-3.5" /> 生成有声书 ({selectedCount}/{totalCount})
          </>
        )}
      </button>

      {/* 批量生成 */}
      {onGenerateAll && (
        <button onClick={onGenerateAll} disabled={disabled || isGenerating}
          className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-lg text-xs text-foreground hover:bg-secondary transition-colors disabled:opacity-50">
          <Play className="w-3 h-3" /> 全部生成
        </button>
      )}

      {/* 导出 */}
      {onExport && (
        <button onClick={onExport} disabled={disabled}
          className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-lg text-xs text-foreground hover:bg-secondary transition-colors disabled:opacity-50">
          <Download className="w-3 h-3" /> 导出 WAV
        </button>
      )}

      {onExportSRT && (
        <button onClick={onExportSRT} disabled={disabled}
          className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-lg text-xs text-foreground hover:bg-secondary transition-colors disabled:opacity-50">
          <Download className="w-3 h-3" /> 导出 SRT
        </button>
      )}

      {/* 进度条 */}
      {isGenerating && progress > 0 && (
        <div className="flex-1 min-w-[100px]">
          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}
