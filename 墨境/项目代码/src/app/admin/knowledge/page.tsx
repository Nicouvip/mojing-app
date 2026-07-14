'use client'

import { useState, useMemo } from 'react'
import { KNOWLEDGE_BASE, getAllAlwaysItems, getKnowledgeByTiming, getKnowledgeByCategory, searchKnowledgeByTags, type KnowledgeItem, type KnowledgeCategory, type InjectionTiming } from '@/lib/ai/knowledge-base'

const CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  iron_rules: '核心铁律',
  techniques: '核心工具箱',
  polish: '语言净化',
  genre_params: '题材风格',
  narrative: '叙事结构',
  operations: '系统运维',
}

const CATEGORY_ORDER: KnowledgeCategory[] = ['iron_rules', 'techniques', 'polish', 'genre_params', 'narrative', 'operations']

const TIMING_LABELS: Record<InjectionTiming, string> = {
  always: '每次调用',
  planning: '规划阶段',
  writing: '写作阶段',
  chapter_end: '章末自检',
  polish: '润色时',
  first_three: '前三章',
  on_demand: '按需检索',
}

export default function KnowledgeAdminPage() {
  const [filterCat, setFilterCat] = useState<KnowledgeCategory | 'all'>('all')
  const [filterTiming, setFilterTiming] = useState<InjectionTiming | 'all'>('all')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let items = KNOWLEDGE_BASE
    if (filterCat !== 'all') items = items.filter(i => i.category === filterCat)
    if (filterTiming !== 'all') items = items.filter(i => i.timing === filterTiming)
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.tags.some(t => t.toLowerCase().includes(q)) ||
        i.content.toLowerCase().includes(q)
      )
    }
    return items
  }, [filterCat, filterTiming, search])

  const stats = useMemo(() => ({
    总计: KNOWLEDGE_BASE.length,
    每次调用: getAllAlwaysItems().length,
    按需检索: getKnowledgeByTiming('on_demand').length,
    规划阶段: getKnowledgeByTiming('planning').length,
    写作阶段: getKnowledgeByTiming('writing').length,
    章末自检: getKnowledgeByTiming('chapter_end').length,
    润色时: getKnowledgeByTiming('polish').length,
    前三章: getKnowledgeByTiming('first_three').length,
  }), [])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">知识库管理</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            共 {KNOWLEDGE_BASE.length} 条知识条目 · 管理知识库的检索与注入策略
          </p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
        {Object.entries(stats).map(([k, v]) => (
          <div key={k} className="bg-card border border-border rounded-lg p-2.5 text-center">
            <div className="text-lg font-bold">{v}</div>
            <div className="text-[10px] text-muted-foreground">{k}</div>
          </div>
        ))}
      </div>

      {/* 过滤器 */}
      <div className="flex gap-2 flex-wrap items-center">
        {/* 分类过滤 */}
        <div className="flex gap-1 flex-wrap">
          <FilterChip active={filterCat === 'all'} onClick={() => setFilterCat('all')}>全部</FilterChip>
          {CATEGORY_ORDER.map(cat => (
            <FilterChip key={cat} active={filterCat === cat} onClick={() => setFilterCat(cat)}>
              {CATEGORY_LABELS[cat]}
            </FilterChip>
          ))}
        </div>
        <span className="text-muted-foreground text-[10px]">|</span>
        {/* 时机过滤 */}
        <div className="flex gap-1 flex-wrap">
          <FilterChip active={filterTiming === 'all'} onClick={() => setFilterTiming('all')}>全部时机</FilterChip>
          {(Object.entries(TIMING_LABELS) as [InjectionTiming, string][]).map(([k, v]) => (
            <FilterChip key={k} active={filterTiming === k} onClick={() => setFilterTiming(k)}>
              {v}
            </FilterChip>
          ))}
        </div>
        {/* 搜索 */}
        <input
          type="text"
          placeholder="搜索标题/标签/内容..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="ml-auto px-2.5 py-1.5 rounded border border-border bg-background text-xs w-48"
        />
      </div>

      {/* 条目列表 */}
      <div className="space-y-1">
        {filtered.map(item => (
          <div key={item.id}
            className="bg-card border border-border rounded-lg overflow-hidden transition-colors hover:border-primary/30">
            <button
              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left"
            >
              {/* 优先级色条 */}
              <span className="w-1 h-8 rounded-full shrink-0" style={{
                background: item.priority >= 4 ? '#c4966a' : item.priority >= 3 ? '#9e9e9e' : '#e0e0e0',
              }} />
              {/* ID */}
              <span className="text-[10px] text-muted-foreground font-mono w-20 shrink-0">{item.id}</span>
              {/* 标题 */}
              <span className="flex-1 text-xs font-medium min-w-0 truncate">{item.title}</span>
              {/* 分类 */}
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground shrink-0">
                {CATEGORY_LABELS[item.category]}
              </span>
              {/* 时机 */}
              <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0" style={{
                background: item.timing === 'always' ? 'rgba(196,149,106,.12)' : 'bg-secondary',
                color: item.timing === 'always' ? '#c4966a' : undefined,
              }}>
                {TIMING_LABELS[item.timing]}
              </span>
              {/* 优先级 */}
              <span className="text-[10px] text-muted-foreground w-4 text-center shrink-0">P{item.priority}</span>
              {/* 展开箭头 */}
              <span className="text-muted-foreground text-[10px] transition-transform" style={{
                transform: expandedId === item.id ? 'rotate(90deg)' : 'rotate(0deg)',
              }}>▶</span>
            </button>

            {/* 展开详情 */}
            {expandedId === item.id && (
              <div className="px-3.5 pb-3.5 space-y-2 border-t border-border pt-2">
                {/* 标签 */}
                <div className="flex gap-1 flex-wrap">
                  {item.tags.map(t => (
                    <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                      #{t}
                    </span>
                  ))}
                </div>
                {/* 内容 */}
                <pre className="text-[10px] leading-relaxed whitespace-pre-wrap font-sans p-2.5 rounded bg-muted/30 max-h-48 overflow-y-auto">
                  {item.content}
                </pre>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-10">无匹配条目</p>
        )}
      </div>
    </div>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className="px-2 py-1 text-[10px] rounded transition-colors"
      style={{
        background: active ? '#c4966a' : 'var(--color-secondary, #f5f5f5)',
        color: active ? '#fff' : 'var(--color-muted-foreground, #666)',
      }}
    >
      {children}
    </button>
  )
}
