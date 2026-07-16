'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import { useEffect, useRef, useMemo, useState, forwardRef, useImperativeHandle } from 'react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import CharacterCount from '@tiptap/extension-character-count'
import { useDebouncedCallback } from 'use-debounce'
import { cn } from '@/lib/utils/utils'
import { Bold, Italic, UnderlineIcon, Heading1, Heading2, Heading3, Quote, List, ListOrdered, Highlighter, AlignLeft, AlignCenter, AlignRight, Minus, Undo, Redo } from 'lucide-react'
import { recordWords } from '@/lib/ai/goals-store'
import DOMPurify from 'dompurify'

/** 客户端安全过滤 HTML（移除 script/事件处理器等 XSS 向量） */
function sanitizeHtml(dirty: string): string {
  if (typeof window === 'undefined') return dirty
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'span', 'div', 'mark', 'hr'],
    ALLOWED_ATTR: ['style', 'class', 'data-placeholder'],
  })
}

interface Heading {
  level: number; text: string; pos: number
}

export interface EditorHandle {
  insertAtCursor: (text: string) => void
  scrollToHeading: (pos: number) => void
  updateHeadingText: (pos: number, newText: string) => void
  deleteHeadingAt: (pos: number) => void
  swapHeadings: (posA: number, posB: number) => void
}

interface Props {
  content: string; onChange: (text: string) => void
  onHeadings?: (headings: Heading[]) => void
  onEditorReady?: (editor: Editor) => void
  onCursorChange?: (line: number, col: number) => void
  wordGoal?: number; onWordGoalChange?: (goal: number) => void
  placeholder?: string
}

export const WritingEditor = forwardRef<EditorHandle, Props>(function WritingEditor({ content, onChange, onHeadings, onEditorReady, onCursorChange, wordGoal = 3000, onWordGoalChange, placeholder = '开始写作...' }, ref) {
  const extensions = useMemo(() => [StarterKit.configure({ heading: { levels: [1, 2, 3] }, underline: false }), Placeholder.configure({ placeholder }),
      Highlight.configure({ multicolor: true }), Underline, TextAlign.configure({ types: ['heading', 'paragraph'] }), CharacterCount.configure()], [placeholder])

  const editorProps = useMemo(() => ({ attributes: { class: 'prose max-w-none outline-none min-h-[60vh] text-lg leading-8 font-serif' } }), [])

  // onChange 节流 300ms（避免每次按键都触发 bodyDensity 计算）
  const debouncedOnChange = useDebouncedCallback((html: string) => {
    onChange(sanitizeHtml(html))
  }, 300)

  const editor = useEditor({
    extensions,
    content,
    immediatelyRender: false,
    editorProps,
    onUpdate: ({ editor }) => {
      debouncedOnChange(editor.getHTML())
      // 实时记录今日写作字数（轻量操作，无需节流）
      recordWords(editor.storage.characterCount?.words?.() || 0)
      if (onHeadings) {
        const hs: Heading[] = []
        editor.state.doc.descendants((n, p) => { if (n.type.name === 'heading') hs.push({ level: n.attrs.level, text: n.textContent, pos: p }) })
        onHeadings(hs)
      }
    },
    onSelectionUpdate: ({ editor }) => {
      if (!onCursorChange) return
      const { from } = editor.state.selection
      let line = 1
      let blockStart = 0
      editor.state.doc.descendants((node, nodePos) => {
        if (nodePos >= from) return false
        if (node.isBlock && nodePos > 0) { line++; blockStart = nodePos }
        return true
      })
      const col = Math.max(1, from - blockStart)
      onCursorChange(line, col)
    },
  })
  const readyCalled = useRef(false)
  const prevContent = useRef(content)
  const [inputGoal, setInputGoal] = useState(String(wordGoal))

  // Auto-format plain text to HTML paragraphs for TipTap + XSS sanitize
  const prepareContent = (raw: string) => {
    if (!raw) return ''
    if (raw.indexOf('<') === -1) {
      const paragraphs = raw.split(String.fromCharCode(10, 10)).filter(Boolean)
      return paragraphs.map(function(p) {
        return '<p>' + p.split(String.fromCharCode(10)).join('<br/>') + '</p>'
      }).join('')
    }
    return sanitizeHtml(raw)
  }

  // Sync external content  // Sync external content → editor only when genuinely changed from outside (not from onUpdate)
  useEffect(() => {
    if (editor && content !== prevContent.current) {
      prevContent.current = content
      if (editor.getHTML() !== content) {
        editor.commands.setContent(prepareContent(content))
      }
    }
  }, [editor, content])

  useEffect(() => {
    if (editor && !readyCalled.current) {
      readyCalled.current = true
      if (content) editor.commands.setContent(prepareContent(content))
      onEditorReady?.(editor)
    }
  }, [editor])

  useImperativeHandle(ref, () => ({
    insertAtCursor(text: string) {
      editor?.chain().focus().insertContent(text).run()
    },
    scrollToHeading(pos: number) {
      if (!editor) return
      editor.chain().focus().setTextSelection(pos + 1).scrollIntoView().run()
    },
    updateHeadingText(pos: number, newText: string) {
      if (!editor) return
      const node = editor.state.doc.nodeAt(pos)
      if (!node) return
      const from = pos + 1
      const to = pos + node.nodeSize - 1
      editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, newText).run()
    },
    deleteHeadingAt(pos: number) {
      if (!editor) return
      const node = editor.state.doc.nodeAt(pos)
      if (!node) return
      editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run()
    },
    swapHeadings(posA: number, posB: number) {
      if (!editor) return
      const nodeA = editor.state.doc.nodeAt(posA)
      const nodeB = editor.state.doc.nodeAt(posB)
      if (!nodeA || !nodeB) return
      const textA = nodeA.textContent
      const textB = nodeB.textContent
      // Swap text only — process the rightmost heading first to avoid position shifts
      if (posA < posB) {
        // Update B first (further right), then A
        const fromB = posB + 1
        const toB = posB + nodeB.nodeSize - 1
        editor.chain().focus()
          .deleteRange({ from: fromB, to: toB })
          .insertContentAt(fromB, textA)
          .run()
        const nodeA2 = editor.state.doc.nodeAt(posA)
        if (!nodeA2) return
        const fromA = posA + 1
        const toA = posA + nodeA2.nodeSize - 1
        editor.chain().focus()
          .deleteRange({ from: fromA, to: toA })
          .insertContentAt(fromA, textB)
          .run()
      } else {
        // Update A first (further right), then B
        const fromA = posA + 1
        const toA = posA + nodeA.nodeSize - 1
        editor.chain().focus()
          .deleteRange({ from: fromA, to: toA })
          .insertContentAt(fromA, textB)
          .run()
        const nodeB2 = editor.state.doc.nodeAt(posB)
        if (!nodeB2) return
        const fromB = posB + 1
        const toB = posB + nodeB2.nodeSize - 1
        editor.chain().focus()
          .deleteRange({ from: fromB, to: toB })
          .insertContentAt(fromB, textA)
          .run()
      }
    },
  }), [editor])

  if (!editor) return <div className="text-muted-foreground text-sm py-10 text-center">加载中...</div>
  const wc = editor.storage.characterCount?.words?.() || 0
  const act = (name: string, opts?: Record<string, unknown>) => editor.isActive(name, opts)
  const commitGoal = () => { const n = parseInt(inputGoal, 10); if (!isNaN(n) && n > 0) onWordGoalChange?.(n); else setInputGoal(String(wordGoal)) }
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 pb-3 border-b border-border mb-4">
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={act('bold')} title="加粗"><Bold size={18} /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={act('italic')} title="斜体"><Italic size={18} /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={act('underline')} title="下划线"><UnderlineIcon size={18} /></Btn>
        <span className="w-px h-4 bg-border mx-1" />
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={act('heading', { level: 1 })} title="卷标题"><Heading1 size={18} /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={act('heading', { level: 2 })} title="章标题"><Heading2 size={18} /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={act('heading', { level: 3 })} title="节标题"><Heading3 size={18} /></Btn>
        <span className="w-px h-4 bg-border mx-1" />
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={act('blockquote')} title="引用"><Quote size={18} /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={act('bulletList')} title="无序列表"><List size={18} /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={act('orderedList')} title="有序列表"><ListOrdered size={18} /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleHighlight().run()} active={act('highlight')} title="高亮"><Highlighter size={18} /></Btn>
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="分隔线"><Minus size={18} /></Btn>
        <span className="w-px h-4 bg-border mx-1" />
        <Btn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="左对齐"><AlignLeft size={18} /></Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="居中"><AlignCenter size={18} /></Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="右对齐"><AlignRight size={18} /></Btn>
        <span className="w-px h-4 bg-border mx-1" />
        <Btn onClick={() => editor.chain().focus().undo().run()} title="撤销"><Undo size={18} /></Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} title="重做"><Redo size={18} /></Btn>
        <span className="flex-1" />
        <input type="number" min={1} value={inputGoal} onChange={e => setInputGoal(e.target.value)} onBlur={commitGoal} onKeyDown={e => e.key === 'Enter' && commitGoal()} className="w-16 h-6 text-xs text-center border border-border rounded bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
        <button onClick={() => { onWordGoalChange?.(wordGoal + 500); setInputGoal(String(wordGoal + 500)) }} className="text-xs text-muted-foreground hover:text-foreground">+500</button>
        <span className="text-xs text-muted-foreground">{wc}/{wordGoal}字</span>
        <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full transition-all" style={{ width: Math.min(100, (wc / wordGoal) * 100) + '%' }} /></div>
      </div>
      <div className="flex-1"><EditorContent editor={editor} /></div>
    </div>
  )
})

function Btn({ onClick, active, title, children }: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) {
  return <button onClick={onClick} title={title} className={cn("p-1 rounded transition-colors", active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}>{children}</button>
}
