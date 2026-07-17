'use client'

import type { Editor } from '@tiptap/react'

interface FormatToolbarProps {
  editorRef: React.RefObject<Editor | null>
  S: Record<string, string>
}

export function FormatToolbar({ editorRef, S }: FormatToolbarProps) {
  const ed = () => editorRef.current
  const btnStyle = { color: S.muted }

  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b flex-wrap shrink-0" style={{ borderColor: S.border, background: S.bg2 }}>
      {([
        ['B', () => ed()?.chain().focus().toggleBold().run(), (l: string) => <b>{l}</b>],
        ['I', () => ed()?.chain().focus().toggleItalic().run(), (l: string) => <i>{l}</i>],
        ['U', () => ed()?.chain().focus().toggleUnderline().run(), (l: string) => <u>{l}</u>],
        ['S', () => ed()?.chain().focus().toggleStrike().run(), (l: string) => <s>{l}</s>],
      ] as const).map(([label, onClick]) => (
        <button key={label}
          className="min-w-[34px] min-h-[34px] max-[480px]:min-w-[28px] max-[480px]:min-h-[28px] max-[480px]:text-[13px] flex items-center justify-center rounded text-sm transition-all"
          style={btnStyle}
          onClick={onClick}
          onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(196,149,106,.06)' }}
          onMouseLeave={e => { (e.target as HTMLElement).style.background = '' }}>
          {label === 'B' ? <b>B</b> : label === 'I' ? <i>I</i> : label === 'U' ? <u>U</u> : <s>S</s>}
        </button>
      ))}
      <span className="w-px h-5 mx-1 max-[480px]:hidden" style={{ background: S.border }} />
      <select className="text-xs px-2 py-1.5 rounded outline-none cursor-pointer max-[480px]:hidden" style={{ border: '1px solid ' + S.border, color: S.ink, background: S.bg2 }}>
        <option>默认</option><option>宋体</option><option>楷体</option>
      </select>
      <select className="text-xs px-2 py-1.5 rounded outline-none cursor-pointer max-[480px]:hidden" style={{ border: '1px solid ' + S.border, color: S.ink, background: S.bg2 }}>
        <option>标准</option><option>大号</option><option>特大</option>
      </select>
      <span className="w-px h-5 mx-1 max-[480px]:hidden" style={{ background: S.border }} />
      <button className="min-w-[34px] min-h-[34px] flex items-center justify-center rounded text-sm" style={btnStyle}
        onClick={() => ed()?.chain().focus().toggleHeading({ level: 2 }).run()}
        onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(196,149,106,.06)' }}
        onMouseLeave={e => { (e.target as HTMLElement).style.background = '' }}>H</button>
      <button className="min-w-[34px] min-h-[34px] flex items-center justify-center rounded text-sm" style={btnStyle}
        onClick={() => ed()?.chain().focus().toggleBlockquote().run()}
        onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(196,149,106,.06)' }}
        onMouseLeave={e => { (e.target as HTMLElement).style.background = '' }}>&#8220;</button>
      <span className="w-px h-5 mx-1" style={{ background: S.border }} />
      <button className="min-w-[34px] min-h-[34px] flex items-center justify-center rounded text-sm" style={btnStyle}
        onClick={() => ed()?.chain().focus().undo().run()}
        onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(196,149,106,.06)' }}
        onMouseLeave={e => { (e.target as HTMLElement).style.background = '' }}>↩</button>
      <button className="min-w-[34px] min-h-[34px] flex items-center justify-center rounded text-sm" style={btnStyle}
        onClick={() => ed()?.chain().focus().redo().run()}
        onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(196,149,106,.06)' }}
        onMouseLeave={e => { (e.target as HTMLElement).style.background = '' }}>↪</button>
      <span className="w-px h-5 mx-1" style={{ background: S.border }} />
      <button className="min-w-[34px] min-h-[34px] flex items-center justify-center rounded text-sm" style={btnStyle} onClick={() => { }}
        onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(196,149,106,.06)' }}
        onMouseLeave={e => { (e.target as HTMLElement).style.background = '' }}>&para;</button>
      <span className="flex-1" />
      <button className="min-w-[34px] min-h-[34px] flex items-center justify-center rounded text-sm" style={btnStyle} onClick={() => { }}
        onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(196,149,106,.06)' }}
        onMouseLeave={e => { (e.target as HTMLElement).style.background = '' }}>&#9670;</button>
    </div>
  )
}
