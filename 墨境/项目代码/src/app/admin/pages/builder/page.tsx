'use client'
import { toast } from 'sonner'

import { useState, useEffect } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { loadPage, savePage } from '@/lib/page-builder/store'
import type { PageComponent, PageData } from '@/lib/page-builder/types'
import { GripVertical, Plus } from 'lucide-react'

const TYPES: PageComponent['type'][] = ['heading', 'text', 'button', 'image', 'box', 'card']
const LABELS: Record<string,string> = { heading:'标题', text:'文本', button:'按钮', image:'图片', box:'容器', card:'卡片' }

function Item({ c, selected, onSelect }: { c: PageComponent; selected: boolean; onSelect: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: c.id })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${selected ? 'ring-2 ring-primary bg-primary-light' : 'hover:bg-secondary'}`}
      onClick={onSelect}>
      <div {...attributes} {...listeners} className="cursor-grab"><GripVertical size={14} className="text-muted-foreground" /></div>
      <span className="text-xs font-mono text-muted-foreground">{LABELS[c.type]||c.type}</span>
      <span className="text-xs truncate flex-1">{c.props.text?.slice(0,30)||''}</span>
    </div>
  )
}

export default function PageBuilder() {
  const [data, setData] = useState<PageData>({ version:1, components:[] })
  const [selectedId, setSelectedId] = useState<string|null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => { setData(loadPage('/')||{ version:1, components:[] }) }, [])

  const selected = data.components.find(c => c.id === selectedId)

  const handleDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return
    const overId = e.over.id
    const oldI = data.components.findIndex(c => c.id === e.active.id)
    const newI = data.components.findIndex(c => c.id === overId)
    setData(p => ({ ...p, components: arrayMove(p.components, oldI, newI) }))
  }

  const add = (type: PageComponent['type']) => {
    setData(p => ({ ...p, components: [...p.components, { id: `${type}_${Date.now()}`, type, props: { text: LABELS[type], color: '#1f2937', fontSize: 16 } }] }))
  }

  const update = (upd: Partial<PageComponent['props']>) => {
    if (!selectedId) return
    setData(p => ({ ...p, components: p.components.map(c => c.id === selectedId ? { ...c, props: { ...c.props, ...upd } } : c) }))
  }

  const handleSave = () => { savePage('/', data); toast.success('已保存') }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">页面构建器</h1>
        <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-primary text-white text-sm">保存</button>
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">组件</h3>
          {TYPES.map(t => <button key={t} onClick={() => add(t)} className="w-full px-3 py-2 rounded-lg border text-xs text-muted-foreground hover:bg-primary-light hover:text-primary text-left flex items-center gap-2"><Plus size={12} />{LABELS[t]}</button>)}
        </div>
        <div className="col-span-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={data.components.map(c => c.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1 min-h-[200px] border-2 border-dashed border-border rounded-xl p-4">
                {data.components.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">拖入组件开始编辑</p>}
                {data.components.map(c => <Item key={c.id} c={c} selected={selectedId===c.id} onSelect={() => setSelectedId(c.id)} />)}
              </div>
            </SortableContext>
          </DndContext>
          {selected && (
            <div className="mt-4 p-4 rounded-xl border bg-card space-y-2">
              <h4 className="text-sm font-semibold">属性 — {LABELS[selected.type]||selected.type}</h4>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs">文字</label><textarea value={selected.props.text||''} onChange={e => update({ text: e.target.value })} className="w-full px-2 py-1 rounded border text-xs" /></div>
                <div><label className="text-xs">颜色</label><input type="color" value={selected.props.color||'#1f2937'} onChange={e => update({ color: e.target.value })} className="w-full h-8" /></div>
                <div><label className="text-xs">字号</label><input type="number" value={selected.props.fontSize||16} onChange={e => update({ fontSize: Number(e.target.value) })} className="w-full px-2 py-1 rounded border text-xs" /></div>
                <div><label className="text-xs">宽</label><input value={selected.props.width||''} onChange={e => update({ width: e.target.value })} className="w-full px-2 py-1 rounded border text-xs" /></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
