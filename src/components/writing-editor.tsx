'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import { useEffect, useRef } from 'react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import CharacterCount from '@tiptap/extension-character-count'
import { cn } from '@/lib/utils/utils'
import { Bold, Italic, UnderlineIcon, Heading1, Heading2, Heading3, Quote, List, ListOrdered, Highlighter, AlignLeft, AlignCenter, AlignRight, Minus, Undo, Redo } from 'lucide-react'

interface Heading {
  level: number; text: string; pos: number
}

interface Props {
  content: string; onChange: (text: string) => void
  onHeadings?: (headings: Heading[]) => void
  onEditorReady?: (editor: Editor) => void
  wordGoal?: number; onWordGoalChange?: (goal: number) => void
  placeholder?: string
}

export function WritingEditor({ content, onChange, onHeadings, onEditorReady, wordGoal = 3000, onWordGoalChange, placeholder = '开始写作...' }: Props) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] } }), Placeholder.configure({ placeholder }),
      Highlight.configure({ multicolor: true }), Underline, TextAlign.configure({ types: ['heading', 'paragraph'] }), CharacterCount.configure()],
    content, immediatelyRender: false,
    editorProps: { attributes: { class: 'prose max-w-none outline-none min-h-[60vh] text-lg leading-8 font-serif' } },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
      if (onHeadings) {
        const hs: Heading[] = []
        editor.state.doc.descendants((n, p) => { if (n.type.name === 'heading') hs.push({ level: n.attrs.level, text: n.textContent, pos: p }) })
        onHeadings(hs)
      }
    },
  })
  const readyCalled = useRef(false)
  useEffect(() => { if (editor && !readyCalled.current) { readyCalled.current = true; onEditorReady?.(editor) } }, [editor])
  if (!editor) return <div className="text-muted-foreground text-sm py-10 text-center">加载中...</div>
  const wc = editor.storage.characterCount?.words?.() || 0
  const act = (name: string, opts?: Record<string, unknown>) => editor.isActive(name, opts)
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
        <button onClick={() => onWordGoalChange?.(wordGoal + 500)} className="text-xs text-muted-foreground hover:text-foreground">+500</button>
        <span className="text-xs text-muted-foreground">{wc}/{wordGoal}字</span>
        <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full transition-all" style={{ width: Math.min(100, (wc / wordGoal) * 100) + '%' }} /></div>
      </div>
      <div className="flex-1"><EditorContent editor={editor} /></div>
    </div>
  )
}

function Btn({ onClick, active, title, children }: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) {
  return <button onClick={onClick} title={title} className={cn("p-1 rounded transition-colors", active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}>{children}</button>
}
