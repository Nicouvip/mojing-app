'use client'

import { useRef } from 'react'
import { Upload, FileText, Wand2 } from 'lucide-react'

export interface TextEditorProps {
  content: string
  onContentChange: (text: string) => void
  placeholder?: string
  wordCount?: number
  maxWords?: number
  onImport?: (text: string, fileName: string) => void
  onAnalyze?: () => void
  analyzing?: boolean
}

export function TextEditor({
  content, onContentChange, placeholder = '粘贴或输入小说文本...',
  wordCount = 0, maxWords, onImport, onAnalyze, analyzing = false,
}: TextEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    onContentChange(text)
    onImport?.(text, file.name)
    // Reset input
    e.target.value = ''
  }

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-card border border-border rounded-md hover:bg-secondary transition-colors">
            <Upload className="w-3 h-3" /> 导入TXT
          </button>
          {onAnalyze && (
            <button onClick={onAnalyze} disabled={analyzing || !content.trim()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-white bg-primary border-none rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50">
              <Wand2 className="w-3 h-3" /> {analyzing ? '分析中...' : '智能分析'}
            </button>
          )}
          <input ref={fileRef} type="file" accept=".txt,.text,.md" onChange={handleFileUpload} className="hidden" />
        </div>

        {/* 字数统计 */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="w-3 h-3" />
          <span className="tabular-nums">{wordCount.toLocaleString()} 字</span>
          {maxWords && wordCount > maxWords && (
            <span className="text-destructive text-[10px]">超出限制</span>
          )}
        </div>
      </div>

      {/* 文本输入区 */}
      <textarea
        value={content}
        onChange={e => onContentChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 w-full resize-none p-6 text-base leading-relaxed bg-transparent outline-none border-none placeholder:text-muted-foreground/40"
        style={{ fontFamily: 'var(--font-serif)' }}
      />
    </div>
  )
}
