'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { cn, toPlainText } from '@/lib/utils/utils'
import { Button } from '@/components/ui/button'
import { getProject, getChapters, getChapter, updateChapterContent, createChapter, deleteChapter, getTrash, restoreChapter, permanentDeleteChapter, cleanExpiredChapters, getVolumes, createVolume, renameVolume, deleteVolume, ensureDefaultVolume } from '@/lib/db/store'
import type { Project, Chapter, Character, Volume } from '@/lib/db/types'
import { calcBodyDensity, checkCompliance } from '@/lib/ai/compliance'
import { generateSimpleA8Status, generateUnblockHint } from '@/lib/prompts/builder'
import { WritingEditor, type EditorHandle } from '@/components/writing-editor'
import { TrashModal } from '@/components/trash-modal'
import { ReportModal } from '@/components/report-modal'
import { BrainstormModal } from '@/components/brainstorm-modal'
import { getChapterReport } from '@/lib/ai/report-store'
import { WorkflowBar } from '@/components/workflow-bar'
import { PlanPanel } from '@/components/plan-panel'
import { useEditorActions } from '@/components/editor/use-editor-actions'
import { ChapterSidebar } from '@/components/editor/chapter-sidebar'
import { StatusPanel } from '@/components/status-panel'
import { FormatToolbar } from '@/components/editor/format-toolbar'
import type { Editor } from '@tiptap/react'
import { useTheme } from '@/lib/utils/theme-context'
import { ArrowLeft, Save, CheckCircle2, AlertTriangle, X, Search, Trash2, BookOpen, FileText, User, Lightbulb, Sparkles, BookMarked, Bot, Sun, Sunrise, Moon, Snowflake, Upload, Download, Printer, Keyboard, Zap } from 'lucide-react'

export default function EditorPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null)
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null)
  const [content, setContent] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [qualitySidebarOpen, setQualitySidebarOpen] = useState(false)
  const [rightTab, setRightTab] = useState('plan')
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved')
  const [autoSaveFlash, setAutoSaveFlash] = useState(false)
  const [showGuide, setShowGuide] = useState(() => {
    if (typeof window === 'undefined') return false
    return !localStorage.getItem('mojing_guide_seen')
  })
  const [showQualityMenu, setShowQualityMenu] = useState(false)
  const [complianceOpen, setComplianceOpen] = useState(true)
  const [guideStep, setGuideStep] = useState(0)
  const [onboardingStep, setOnboardingStep] = useState<number>(() => typeof window !== 'undefined' && !localStorage.getItem('mojing_onboarded') ? 0 : -1)
  const [bodyDensity, setBodyDensity] = useState(0)
  const [wordGoal, setWordGoal] = useState(3000)
  const { theme, setTheme } = useTheme()
  const [showReport, setShowReport] = useState(false)
  const [aiInstruction, setAiInstruction] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState('')
  const [aiMode, setAiMode] = useState<'continue' | 'polish' | 'expand'>('continue')
const [rewriteSubMode, setRewriteSubMode] = useState<'polish' | 'expand'>('polish')
const [showRewriteMenu, setShowRewriteMenu] = useState(false)
const [showBrainstorm, setShowBrainstorm] = useState(false)
  const [bsGenre, setBsGenre] = useState('都市')
  const [bsResult, setBsResult] = useState('')
  const [bsLoading, setBsLoading] = useState(false)
  const [characters, setCharacters] = useState<Character[]>(() => {
    if (typeof window === 'undefined') return []
    try { const stored = localStorage.getItem('mojing_characters_' + projectId); return stored ? JSON.parse(stored) : [] }
    catch { return [] }
  })
  const [showInspire, setShowInspire] = useState(false)
  const [inspireGenre, setInspireGenre] = useState('都市')
  const [inspireResult, setInspireResult] = useState('')
  const [inspireLoading, setInspireLoading] = useState(false)
  const [showAddChar, setShowAddChar] = useState(false)
  const [newCharName, setNewCharName] = useState('')
  const [newCharType, setNewCharType] = useState<Character['type']>('配角')
  const [newCharDesc, setNewCharDesc] = useState('')
  const [editingCharIdx, setEditingCharIdx] = useState<number | null>(null)
  const [showAlchemy, setShowAlchemy] = useState(false)
  const [alchemyResult, setAlchemyResult] = useState('')
  const [alchemyLoading, setAlchemyLoading] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [importDlg, setImportDlg] = useState(false)
  const [importTxt, setImportTxt] = useState('')
  const [importFn, setImportFn] = useState('')
  const [importMode, setImportMode] = useState<'auto'|'chapter'|'h1'|'h2'|'h3'>('auto')
  const [importParts, setImportParts] = useState<{t:string;c:string}[]>([])
  const [importTitleOverrides, setImportTitleOverrides] = useState<string[]>([])

  // 提取为 hook 的核心编辑操作
  const { handleSave, handleContentChange, handleTxtImport } = useEditorActions({
    activeChapter, content, projectId,
    setSaveStatus, setBodyDensity, setContent, setChapters,
  })
  const [importExpandedIdx, setImportExpandedIdx] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState<'title' | 'wordCount' | 'createdAt'>('title')
  const [showAllChapters, setShowAllChapters] = useState(false)
  const [workflowStage, setWorkflowStage] = useState<'plan' | 'write' | 'review' | 'deliver'>('write')

  // v27 tab states
  const [workspaceTab, setWorkspaceTab] = useState<'write' | 'plan' | 'tools'>('write')
  const [chView, setChView] = useState<'main' | 'draft' | 'outline'>('main')
  const [editMode, setEditMode] = useState<'edit' | 'preview' | 'split'>('edit')
  const [cursorLine, setCursorLine] = useState(1)
  const [cursorCol, setCursorCol] = useState(1)
  const [selMenuPos, setSelMenuPos] = useState<{x:number;y:number}|null>(null)
  const [selMenuText, setSelMenuText] = useState('')
  const [aiTab, setAiTab] = useState<'chat' | 'inspire' | 'workflow' | 'status'>('chat')
  const [aiMessages, setAiMessages] = useState<{role:string;text:string}[]>([
    {role:'assistant', text:'欢迎回到编辑器。需要我帮你做什么？'}
  ])
  const [aiInput, setAiInput] = useState('')
  const [aiContext, setAiContext] = useState('free')
  const [chSearch, setChSearch] = useState('')
  const [chapterTitle, setChapterTitle] = useState('')
  const [selectedVolumes, setSelectedVolumes] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const printFrameRef = useRef<HTMLIFrameElement>(null)

  const handleBrainstorm = async () => {
    setBsLoading(true); setBsResult('')
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 40000)
    try {
      const res = await fetch('/api/ai/brainstorm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ genre: bsGenre }), signal: controller.signal })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        setBsResult(errData.error || `请求失败 (${res.status})`)
        return
      }
      // brainstrom 路由返回 SSE 流，需要逐 chunk 读取 ideas 字段
      const reader = res.body?.getReader()
      if (!reader) { setBsResult('无法读取响应流'); return }
      const decoder = new TextDecoder()
      let buffer = ''
      let accumulated = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          try {
            const parsed = JSON.parse(trimmed)
            const chunk = parsed.ideas || ''
            if (chunk) { accumulated += chunk; setBsResult(accumulated) }
          } catch { /* 忽略不完整行 */ }
        }
      }
      if (!accumulated) setBsResult('生成结果为空')
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') { setBsResult('⏱️ 请求超时，请稍后重试') }
      else { setBsResult('请求失败') }
    }
    finally { clearTimeout(timeoutId); setBsLoading(false) }
  }

  const handleInspire = async () => {
    setInspireLoading(true); setInspireResult('')
    try {
      const res = await fetch('/api/ai/inspire', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'direct-diverge', context: content, genre: inspireGenre }) })
      const d = await res.json()
      setInspireResult(d.text || d.error || '生成失败')
    } catch { setInspireResult('请求失败，灵感爆裂 API 暂不可用') }
    finally { setInspireLoading(false) }
  }

  const handleAlchemy = async () => {
    setAlchemyLoading(true); setAlchemyResult('')
    try {
      const res = await fetch('/api/ai/alchemy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ genre: 'all' }) })
      const d = await res.json()
      setAlchemyResult(d.text || d.titles?.join('\\n') || d.error || '生成失败')
    } catch { setAlchemyResult('请求失败，书名炼金术 API 暂不可用') }
    finally { setAlchemyLoading(false) }
  }

  // v27 style inline styles
  const S = {
    bg: '#1a1814',
    bg2: '#faf7f2',
    card: '#f5f1e8',
    panel: '#efe9dd',
    border: '#d9cbb8',
    pri: '#c4956a',
    priDim: '#b08050',
    ink: '#1a1814',
    muted: '#8c7b6b',
    white: '#faf7f2',
    success: '#5b8c5a',
    dest: '#c46262',
  }

  const handleAi = async () => {
    if (!aiInput.trim() && !aiInstruction.trim()) return
    setAiLoading(true)
    const msg = aiInput.trim() || aiInstruction
    setAiMessages(prev => [...prev, { role: 'user', text: msg }])
    setAiInput(''); setAiInstruction('')

    const endpoint = aiMode === 'continue' ? '/api/ai/continue' : aiMode === 'polish' ? '/api/ai/polish' : '/api/ai/expand'
    const body: Record<string, any> = { instruction: msg, style: theme, chapterIndex: String(chapters.findIndex(c => c.id === activeChapterId) + 1), genre: project?.genre || '' }
    if (aiMode === 'continue') body.context = content
    else { const sel = window.getSelection()?.toString() || ''; if (sel.trim()) body.text = sel }

    // P2-6: 注入角色/世界观/冷却/伏笔/上章检测数据
    const chIdx = parseInt(body.chapterIndex || '0', 10)
    if (projectId) {
      try {
        const { getCharacterProfiles, getWorldSettings, getCoolingState, getActiveForeshadows, getChapters } = await import('@/lib/db/store')
        const { getChapterReport } = await import('@/lib/ai/report-store')
        body.characterProfiles = JSON.parse(JSON.stringify(getCharacterProfiles(projectId)))
        body.worldSettings = JSON.parse(JSON.stringify(getWorldSettings(projectId)))
        body.coolingState = JSON.parse(JSON.stringify(getCoolingState(projectId)))
        body.activeForeshadows = JSON.parse(JSON.stringify(getActiveForeshadows(projectId)))
        // 上章检测结果：取当前章的前一章
        const chaptersList = getChapters(projectId).sort((a: any, b: any) => a.order - b.order)
        const prevChapter = chaptersList.find((c: any) => c.order === chIdx - 1)
        if (prevChapter) {
          body.lastReport = JSON.parse(JSON.stringify(getChapterReport(projectId, prevChapter.id)))
        }
      } catch (e) { console.warn('[handleAi] 加载回流数据失败:', e) }
    }

    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { setAiMessages(prev => [...prev, { role: 'assistant', text: '请求失败' }]); return }
      const reader = res.body?.getReader()
      if (!reader) return
      const decoder = new TextDecoder()
      let resultText = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\\n')
        for (const line of lines) {
          if (!line.trim()) continue
          try { const parsed = JSON.parse(line.trim()); if (parsed.text) resultText += parsed.text; if (parsed.error) resultText = parsed.error } catch {}
        }
      }
      setAiMessages(prev => [...prev, { role: 'assistant', text: resultText || '（空结果）' }])
    } catch { setAiMessages(prev => [...prev, { role: 'assistant', text: '网络错误' }]) }
    finally { setAiLoading(false) }
  }

  const writingEditorRef = useRef<EditorHandle>(null)
  const leftSidebarRef = useRef<HTMLDivElement>(null)
  const editorAreaRef = useRef<HTMLDivElement>(null)
  const rightPanelRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<Editor | null>(null)
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null)
  const [editorVersion, setEditorVersion] = useState(0)
  const contentRef = useRef(content)
  const [violations, setViolations] = useState<string[]>([])
  const [headings, setHeadings] = useState<{ level: number; text: string; pos: number }[]>([])
  const [editingHeadingIdx, setEditingHeadingIdx] = useState<number | null>(null)
  const [editingHeadingText, setEditingHeadingText] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const [showTrash, setShowTrash] = useState(false)
  const [trashChapters, setTrashChapters] = useState<Chapter[]>([])
  const [selectedTrashId, setSelectedTrashId] = useState<string | null>(null)
  const [volumes, setVolumes] = useState<Volume[]>([])
  const [showVolumeModal, setShowVolumeModal] = useState(false)
  const [volumeName, setVolumeName] = useState('')
  const [volMenuOpen, setVolMenuOpen] = useState<string | null>(null)
  const [renamingVol, setRenamingVol] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [filterTab, setFilterTab] = useState('all')
  const [renderTick, setRenderTick] = useState(0)

  useEffect(() => {
    if (typeof window !== 'undefined') try { localStorage.setItem('mojing_characters_' + projectId, JSON.stringify(characters)) } catch {}
  }, [characters, projectId])

  useEffect(() => {
    const p = getProject(projectId)
    if (!p) { router.push('/'); return }
    setProject(p)
    const chs = getChapters(projectId)
    setChapters(chs)
    let vols = getVolumes(projectId)
    if (typeof window !== 'undefined') {
      if (vols.length > 0) { setVolumes(vols) }
      else {
        try {
          const oldData = localStorage.getItem('mojing_volumes_' + projectId)
          if (oldData) { const oldNames: string[] = JSON.parse(oldData); const migrated = oldNames.map((name: string, i: number) => createVolume(projectId, name)); setVolumes(migrated); vols = migrated; localStorage.removeItem('mojing_volumes_' + projectId) }
          else { const dv = ensureDefaultVolume(projectId); setVolumes([dv]); vols = [dv] }
        } catch { const dv = ensureDefaultVolume(projectId); setVolumes([dv]); vols = [dv] }
      }
    }
    if (chs.length > 0) {
      const lastId = typeof window !== 'undefined' ? localStorage.getItem('mojing_last_chapter_' + projectId) : null
      const target = lastId ? chs.find(c => c.id === lastId) : chs[0]
      const ch = target || chs[0]
      setActiveChapterId(ch.id); setActiveChapter(ch); setContent(ch.content || ''); setChapterTitle(ch.title)
      setBodyDensity(calcBodyDensity(toPlainText(ch.content || '')))
    }
    setSelectedVolumes(new Set(vols.map((v: Volume) => v.id)))
  }, [])

  useEffect(() => {
    if (!activeChapterId) return
    const ch = getChapter(activeChapterId)
    if (ch) { setActiveChapter(ch); setContent(ch.content || ''); setChapterTitle(ch.title); setBodyDensity(calcBodyDensity(toPlainText(ch.content || ''))) }
  }, [activeChapterId])

  useEffect(() => {
    const timer = setInterval(() => {
      const ch = getChapter(activeChapterId || '')
      if (ch && contentRef.current !== ch.content) {
        updateChapterContent(ch.id, contentRef.current)
        setChapters(getChapters(projectId))
        setSaveStatus('saved')
        setAutoSaveFlash(true)
        setTimeout(() => setAutoSaveFlash(false), 1500)
      }
    }, 10000)
    return () => clearInterval(timer)
  }, [activeChapterId])

  // 一键排版：中文小说排版引擎
  const handleAutoFormat = () => {
    // 先按段落边界分割 HTML，再提纯文本
    let plain = content
      .replace(/<\/p>\s*<p>/g, '\n\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
    if (!plain.trim()) return

    // 1. 清理行首行尾空白
    plain = plain.split('\n').map(l => l.trim()).join('\n')

    // 2. 半角标点 → 全角
    plain = plain
      .replace(/,([^\d])/g, '\uFF0C$1')
      .replace(/\.{3,}/g, '\u2026\u2026')
      .replace(/\./g, '\u3002')
      .replace(/\?/g, '\uFF1F')
      .replace(/!/g, '\uFF01')
      .replace(/:/g, '\uFF1A')
      .replace(/;/g, '\uFF1B')

    // 3. 统一引号
    plain = plain
      .replace(/"([^"]*)"/g, '\u300C$1\u300D')
      .replace(/'([^']*)'/g, '\u300C$1\u300D')

    // 4. 删除中文字符间多余空格
    plain = plain.replace(/([\u4e00-\u9fff])\s+([\u4e00-\u9fff])/g, '$1$2')
    plain = plain.replace(/([\u4e00-\u9fff])\s+([\u3000-\u303F\uFF00-\uFFEF])/g, '$1$2')
    plain = plain.replace(/([\u3000-\u303F\uFF00-\uFFEF])\s+([\u4e00-\u9fff])/g, '$1$2')

    // 5. 合并多余空行
    plain = plain.replace(/\n{3,}/g, '\n\n')

    // 6. 按空行分段，生成 HTML
    const paragraphs = plain.split(/\n\s*\n/).filter(Boolean).map(p => {
      const line = p.split('\n').map(l => l.trim()).filter(Boolean).join('<br>')
      return '<p style="text-indent:2em;line-height:2">' + line + '</p>'
    })
    const formatted = paragraphs.join('\n')

    if (formatted && editorRef.current) {
      editorRef.current.commands.setContent(formatted)
      setSaveStatus('unsaved')
    }
  }

  useEffect(() => {
    const ed = editorRef.current
    if (!ed) return
    let lastPlain = ''
    const handler = () => {
      setTimeout(() => {
        const plain = toPlainText(contentRef.current)
        if (plain === lastPlain) return
        lastPlain = plain
        const paragraphs = plain.split('\\n').filter(p => p.trim().length > 0)
        const lastPara = paragraphs[paragraphs.length - 1] || ''
        const result = checkCompliance(lastPara)
        if (result.blockedItems.length > 0) {
          const newV = result.blockedItems.map(item => item.type === 'forbidden_b' ? 'B类禁用词: ' + (item.words?.join('、') || '') : '动作句后紧跟解释语句')
          setViolations(prev => [...new Set([...prev, ...newV])])
        }
      }, 100)
    }
    ed.on('update', handler)
    return () => { ed.off('update', handler) }
  }, [editorVersion])

  // 同步 contentRef
  useEffect(() => { contentRef.current = content }, [content])

  // 选中文字浮动菜单
  useEffect(() => {
    const handleMouseUp = () => {
      setTimeout(() => {
        const sel = window.getSelection()
        if (!sel || sel.isCollapsed || !sel.toString().trim()) { setSelMenuPos(null); setSelMenuText(''); return }
        const range = sel.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        const editorEl = document.querySelector('.tiptap')
        if (!editorEl || !editorEl.contains(range.commonAncestorContainer)) { setSelMenuPos(null); return }
        setSelMenuPos({ x: rect.left + rect.width / 2, y: rect.top - 8 })
        setSelMenuText(sel.toString().trim().substring(0, 200))
      }, 50)
    }
    const handleMouseDown = (e: MouseEvent) => {
      if (selMenuPos && !(e.target as HTMLElement).closest('[data-sel-menu]')) setSelMenuPos(null)
    }
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('mousedown', handleMouseDown)
    return () => { document.removeEventListener('mouseup', handleMouseUp); document.removeEventListener('mousedown', handleMouseDown) }
  }, [selMenuPos])

  const totalWords = chapters.reduce((s, c) => s + (c.wordCount || 0), 0)
  const chapterWordCount = toPlainText(content).length

  if (!project) return null

  // v27 tab configs
  const wsTabs: {key:'write'|'plan'|'tools';label:string}[] = [
    {key:'write', label:'写作'},{key:'plan', label:'构思'},{key:'tools', label:'工具'}
  ]
  const chTabs: {key:'main'|'draft'|'outline';label:string}[] = [
    {key:'main', label:'正文'},{key:'draft', label:'草稿'},{key:'outline', label:'细纲'}
  ]
  const modeTabs: {key:'edit'|'preview'|'split';label:string}[] = [
    {key:'edit', label:'编辑'},{key:'preview', label:'预览'},{key:'split', label:'分屏'}
  ]
  const aiTabs: {key:'chat'|'inspire'|'workflow'|'status';label:string}[] = [
    {key:'chat', label:'AI助手'},{key:'inspire', label:'灵感'},{key:'workflow', label:'工作流'},{key:'status', label:'状态'}
  ]

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{background:S.bg2,color:S.ink}}>

      {/* ═══════ TOP BAR 48px ═══════ */}
      <header className="flex items-center justify-between px-4 shrink-0 z-20" style={{height:48,background:S.bg,color:S.white}}>
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.push('/')} className="shrink-0" style={{color:'#c4b8a5'}}><ArrowLeft className="w-4 h-4" /></button>
          <span className="text-base font-bold tracking-wider shrink-0" style={{color:S.pri,fontFamily:'Georgia,serif'}}>墨境</span>
          <input value={project.name} readOnly className="text-sm font-semibold bg-transparent border-0 outline-none w-[120px]" style={{color:S.white}} />
          <div className="flex gap-1.5 shrink-0 max-lg:hidden">
            <span className="text-[11px] px-2.5 py-0.5 rounded-full" style={{background:'rgba(196,149,106,.15)',color:S.priDim}}>{project.genre || '未分类'}</span>
          </div>
        </div>

        {/* Edit/Preview/Split modes */}
        <div className="flex items-center gap-0.5 shrink-0" style={{background:'rgba(26,24,20,.3)',borderRadius:6,padding:2,fontSize:12}}>
          {modeTabs.map(m => (
            <button key={m.key} onClick={() => setEditMode(m.key)}
              className="px-2.5 py-1 rounded-[5px] transition-all text-sm"
              style={editMode === m.key ? {background:S.pri,color:S.ink,fontWeight:600} : {color:'#c4b8a5'}}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Workspace tabs */}
        <nav className="flex items-center shrink-0 max-md:hidden">
          {wsTabs.map(t => (
            <button key={t.key} onClick={() => setWorkspaceTab(t.key)}
              className="px-4 py-3 text-sm border-b-2 transition-all"
              style={workspaceTab === t.key ? {color:S.pri,borderBottomColor:S.pri,fontWeight:600} : {color:'#c4b8a5',borderBottomColor:'transparent'}}>
              {t.label}
            </button>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-[11px] max-md:hidden" style={{color:'#c4b8a5'}}>本章 <span style={{color:S.white,fontWeight:600}}>{chapterWordCount.toLocaleString()}</span> / 全书 <span style={{color:S.white,fontWeight:600}}>{totalWords.toLocaleString()}</span></span>
          <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all" 
            style={saveStatus === 'saved' ? {background:'rgba(91,140,90,.2)',color:S.success} : {background:S.pri,color:S.ink}}
            onMouseEnter={e => { if (saveStatus !== 'saved') (e.target as HTMLElement).style.background = S.priDim }}>
            {saveStatus === 'saved' ? <><CheckCircle2 className="w-3 h-3" />已保存</> : saveStatus === 'saving' ? '保存中...' : <><Save className="w-3 h-3" />保存</>}
          </button>
          <button className="p-1.5 rounded transition-all max-md:hidden" style={{color:'#c4b8a5'}} title="手机预览"
            onMouseEnter={e=>{(e.target as HTMLElement).style.color=S.pri}} onMouseLeave={e=>{(e.target as HTMLElement).style.color='#c4b8a5'}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18.01"/></svg>
          </button>
          <button className="p-1.5 rounded transition-all max-md:hidden" style={{color:'#c4b8a5'}} title="查找替换"
            onMouseEnter={e=>{(e.target as HTMLElement).style.color=S.pri}} onMouseLeave={e=>{(e.target as HTMLElement).style.color='#c4b8a5'}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
          <button className="p-1.5 rounded transition-all max-md:hidden" style={{color:'#c4b8a5'}} title="分享"
            onMouseEnter={e=>{(e.target as HTMLElement).style.color=S.pri}} onMouseLeave={e=>{(e.target as HTMLElement).style.color='#c4b8a5'}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>
          <button className="px-2.5 py-1 rounded text-xs transition-all max-md:hidden" style={{border:'1px solid rgba(196,149,106,.3)',color:'#c4b8a5'}} title="封面"
            onMouseEnter={e=>{(e.target as HTMLElement).style.borderColor=S.pri;(e.target as HTMLElement).style.color=S.pri}} onMouseLeave={e=>{(e.target as HTMLElement).style.borderColor='rgba(196,149,106,.3)'}}>封面</button>
          <button onClick={() => setShowQualityMenu(!showQualityMenu)} className="px-2.5 py-1.5 rounded text-xs transition-all" style={{background:'rgba(196,149,106,.15)',color:S.priDim}}>
            质量 ▾
          </button>
          <div className="relative">
            {showQualityMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 py-1 rounded-lg shadow-lg" style={{background:S.card,border:'1px solid '+S.border,minWidth:120}}>
                <button onClick={() => { setShowQualityMenu(false); setQualitySidebarOpen(true) }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#3a3028] flex items-center gap-2" style={{color:S.muted}}>实时检测</button>
                <button onClick={() => { setShowQualityMenu(false); setShowReport(true) }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#3a3028] flex items-center gap-2" style={{color:S.muted}}>章末自检</button>
                <button onClick={() => { setShowQualityMenu(false); router.push('/quality-check/'+projectId) }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#3a3028] flex items-center gap-2" style={{color:S.muted}}>质量趋势</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ═══════ A-8 创作状态行 ═══════ */}
      <div className="flex items-center px-4 py-1 shrink-0 text-[11px] max-md:hidden" style={{background:S.bg2,borderBottom:'1px solid '+S.border,color:S.muted}}>
        <span style={{marginRight:16}}>第{chapters.findIndex(c => c.id === activeChapterId) + 1 || 0}章</span>
        <span style={{marginRight:16}}>📍{project?.genre || '未知'}</span>
        <span style={{marginRight:16,color:violations.length > 0 ? S.dest : S.success}}>
          ⚠️{violations.length > 0 ? `${violations.length}项` : '无异常'}
        </span>
        <span style={{marginRight:16}}>🖊️身体密度 <span style={{color:S.ink,fontWeight:600}}>{bodyDensity}%</span></span>
        <span className="ml-auto" style={{marginRight:16}}>今日 <span style={{color:S.ink,fontWeight:600}}>{chapterWordCount.toLocaleString()}</span>/{(wordGoal || 3000).toLocaleString()}字</span>
        <span>行<span style={{color:S.ink,fontWeight:600,margin:'0 4px'}}>{cursorLine}</span>:<span style={{color:S.ink,fontWeight:600,marginLeft:4}}>{cursorCol}</span></span>
      </div>

      {/* ═══════ Workflow Bar ═══════ */}
      <WorkflowBar
        currentStage={workflowStage}
        onStageChange={setWorkflowStage}
        wordCount={chapterWordCount}
        bodyDensity={bodyDensity}
      />

      {/* ═══════ MAIN: three columns ═══════ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ===== LEFT SIDEBAR 240px ===== */}
        <ChapterSidebar
          chapters={chapters}
          volumes={volumes}
          activeChapterId={activeChapterId}
          selectedVolumes={selectedVolumes}
          workspaceTab={workspaceTab}
          chView={chView}
          searchTerm={searchTerm}
          saveStatus={saveStatus}
          S={S}
          onSelectChapter={(id) => {
            if (saveStatus === 'unsaved') handleSave()
            localStorage.setItem('mojing_last_chapter_' + projectId, id)
            const ch = getChapter(id)
            if (ch) { setContent(ch.content || ''); setActiveChapterId(id); setChapterTitle(ch.title) }
          }}
          onAddChapter={() => {
            const vol = volumes[0]
            const nc = createChapter(projectId, '第' + (chapters.length + 1) + '章', vol?.id)
            if (nc) { setChapters(getChapters(projectId)); setActiveChapterId(nc.id) }
          }}
          onToggleVolume={(id) => {
            const s = new Set(selectedVolumes)
            if (s.has(id)) s.delete(id); else s.add(id)
            setSelectedVolumes(s)
          }}
          onSearchChange={setSearchTerm}
          onChViewChange={setChView}
          onDeleteChapter={(id) => {
            deleteChapter(id)
            setChapters(getChapters(projectId))
            setTrashChapters(getTrash())
          }}
        />

        {/* ===== CENTER EDITOR flex:1 ===== */}
        <main className="flex flex-col flex-1 min-w-0 overflow-hidden" style={{background:S.bg2}}>

          {/* Format toolbar */}
          <FormatToolbar editorRef={editorRef} S={S} />
          <div className="flex items-center gap-1 px-4 py-2 border-b flex-wrap shrink-0" style={{borderColor:S.border,background:S.bg2}}>
            <button onClick={handleAutoFormat} className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all" style={{background:'rgba(196,149,106,.08)',color:S.pri}}
              onMouseEnter={e=>{(e.target as HTMLElement).style.background=S.pri;(e.target as HTMLElement).style.color='#fff'}} onMouseLeave={e=>{(e.target as HTMLElement).style.background='rgba(196,149,106,.08)';(e.target as HTMLElement).style.color=S.pri}}>
              ✦ 排版
            </button>
            <button onClick={() => setShowBrainstorm(true)} className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{background:'rgba(196,149,106,.1)',color:S.priDim}}>✦ 灵感</button>
            <button onClick={() => {setAiMode('continue');setAiTab('chat');setRightPanelOpen(true);setAiInput('续写下一段')}} className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{background:'rgba(196,149,106,.1)',color:S.priDim}}>✦ 续写</button>
            <div className="relative">
              <button onClick={() => setShowRewriteMenu(!showRewriteMenu)} className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{background:'rgba(196,149,106,.1)',color:S.priDim}}>✦ 改写 ▾</button>
              {showRewriteMenu && <>
                <div className="fixed inset-0 z-10" onClick={() => setShowRewriteMenu(false)} />
                <div className="absolute top-full left-0 mt-1 z-20 rounded-lg shadow-lg py-1" style={{background:S.bg2,border:'1px solid '+S.border,minWidth:100}}>
                  <button onClick={() => {setAiMode('polish');setRewriteSubMode('polish');setAiTab('chat');setRightPanelOpen(true);setAiInput('精简这段文字');setShowRewriteMenu(false)}} className="block w-full text-left text-xs px-3 py-1.5 hover:bg-primary/10 transition-colors" style={{color:S.ink}}>精简（去啰嗦）</button>
                  <button onClick={() => {setAiMode('expand');setRewriteSubMode('expand');setAiTab('chat');setRightPanelOpen(true);setAiInput('丰满这段文字');setShowRewriteMenu(false)}} className="block w-full text-left text-xs px-3 py-1.5 hover:bg-primary/10 transition-colors" style={{color:S.ink}}>丰满（加细节）</button>
                </div>
              </>}
            </div>
          </div>

          {/* Title */}
          <div className="px-[80px] pt-6 pb-1.5 shrink-0 max-md:px-6">
            <input value={chapterTitle} onChange={e => setChapterTitle(e.target.value)}
              placeholder="输入章节标题"
              className="w-full text-2xl font-bold border-0 bg-transparent outline-none"
              style={{fontFamily:'Georgia,\'Noto Serif SC\',serif',color:S.ink}} />
          </div>

          {/* Editor body */}
          <div className="flex-1 overflow-hidden">
            {editMode === 'edit' && (
              <div className="h-full overflow-y-auto px-[80px] py-2 max-md:px-6">
                <WritingEditor ref={writingEditorRef} key={activeChapterId} content={content} onChange={handleContentChange} onHeadings={setHeadings} onEditorReady={(e)=>{editorRef.current=e;setEditorVersion(v=>v+1)}} onCursorChange={(l,c)=>{setCursorLine(l);setCursorCol(c)}} wordGoal={wordGoal} onWordGoalChange={setWordGoal} />
              </div>
            )}
            {editMode === 'preview' && (
              <div className="h-full overflow-y-auto px-[80px] py-2 max-md:px-6">
                <div className="text-[17px] leading-relaxed font-serif whitespace-pre-wrap" style={{color:'rgba(26,24,20,.82)',fontFamily:'\'Noto Serif SC\',Georgia,serif',lineHeight:1.85}}>
                  {toPlainText(content) || '暂无内容'}
                </div>
              </div>
            )}
            {editMode === 'split' && (
              <div className="flex h-full">
                <div className="flex-1 overflow-y-auto px-10 py-2 border-r" style={{borderColor:S.border}}>
                  <WritingEditor ref={writingEditorRef} key={activeChapterId+'_split'} content={content} onChange={handleContentChange} onHeadings={setHeadings} onEditorReady={()=>{}} onCursorChange={(l,c)=>{setCursorLine(l);setCursorCol(c)}} wordGoal={wordGoal} onWordGoalChange={setWordGoal} />
                </div>
                <div className="flex-1 overflow-y-auto px-10 py-2">
                  <div className="text-[17px] leading-relaxed font-serif whitespace-pre-wrap" style={{color:'rgba(26,24,20,.82)',fontFamily:'\'Noto Serif SC\',Georgia,serif',lineHeight:1.85}}>
                    {toPlainText(content) || '预览'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between px-4 py-1.5 border-t text-[11px] shrink-0 max-[480px]:flex-wrap max-[480px]:gap-x-3" style={{borderColor:S.border,color:S.muted,background:S.bg2}}>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{background:S.success}} />
                {saveStatus === 'saved' ? '已保存' : saveStatus === 'saving' ? '保存中...' : '未保存'}
              </span>
              <span>段落 <span style={{color:S.ink,fontWeight:600}}>{toPlainText(content).split('\\n').filter(Boolean).length}</span></span>
              <span>阅读 <span style={{color:S.ink,fontWeight:600}}>~{Math.max(1,Math.round(chapterWordCount/300))}min</span></span>
            </div>
            <div className="flex items-center gap-4">
              <span>今日 <span style={{color:S.ink,fontWeight:600}}>{chapterWordCount.toLocaleString()}</span> / {wordGoal.toLocaleString()} 字</span>
              <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{background:S.border}}>
                <div className="h-full rounded-full transition-all" style={{width:Math.min(100,Math.round(chapterWordCount/wordGoal*100))+'%',background:S.pri}} />
              </div>
              <span>行 <span style={{color:S.ink,fontWeight:600}}>{cursorLine}</span> : <span style={{color:S.ink,fontWeight:600}}>{cursorCol}</span></span>
            </div>
          </div>
        </main>

        {/* ===== RIGHT AI PANEL 300px ===== */}
        <aside ref={rightPanelRef}
          className={`flex flex-col overflow-hidden shrink-0 transition-all duration-200 max-md:hidden ${!rightPanelOpen ? 'hidden' : ''}`}
          style={{width:300,borderLeft:'1px solid '+S.border,background:S.panel}}>

          {/* AI tabs */}
          <div className="flex border-b shrink-0" style={{borderColor:S.border,background:S.bg2}}>
            {aiTabs.map(t => (
              <button key={t.key} onClick={() => setAiTab(t.key)}
                className="flex-1 py-2.5 text-xs text-center border-b-2 transition-all"
                style={aiTab === t.key ? {color:S.pri,borderBottomColor:S.pri,fontWeight:600} : {color:S.muted,borderBottomColor:'transparent'}}>
                {t.label}
              </button>
            ))}
          </div>

          {/* AI Chat */}
          {aiTab === 'chat' && (
            <>
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b shrink-0" style={{borderColor:S.border,background:S.bg2}}>
                <span className="flex items-center gap-2 text-xs font-semibold" style={{color:S.ink}}>
                  <span className="w-[7px] h-[7px] rounded-full" style={{background:S.success}} />
                  AI 写作助手
                </span>
                <span className="text-[10px] px-2 py-1 rounded cursor-pointer" style={{border:'1px solid '+S.border,color:S.muted}}>DeepSeek-V4</span>
              </div>
              <div className="flex gap-1.5 px-3.5 py-2 border-b flex-wrap" style={{borderColor:S.border,background:S.bg2}}>
                <button className="text-[10px] px-2 py-1 rounded-full border transition-all" style={{borderColor:S.border,color:S.ink,background:S.bg2}} onClick={() => {setAiMode('continue');setAiTab('chat');setRightPanelOpen(true);setAiInput('续写下一段');}} onMouseEnter={e=>{(e.target as HTMLElement).style.borderColor=S.pri;(e.target as HTMLElement).style.color=S.pri}} onMouseLeave={e=>{(e.target as HTMLElement).style.borderColor=S.border;(e.target as HTMLElement).style.color=S.ink}}>✦ 续写</button>
                <div className="relative inline-block">
                  <button className="text-[10px] px-2 py-1 rounded-full border transition-all" style={{borderColor:S.border,color:S.ink,background:S.bg2}} onClick={() => setShowRewriteMenu(!showRewriteMenu)} onMouseEnter={e=>{(e.target as HTMLElement).style.borderColor=S.pri;(e.target as HTMLElement).style.color=S.pri}} onMouseLeave={e=>{(e.target as HTMLElement).style.borderColor=S.border;(e.target as HTMLElement).style.color=S.ink}}>✦ 改写 ▾</button>
                  {showRewriteMenu && <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowRewriteMenu(false)} />
                    <div className="absolute top-full left-0 mt-1 z-20 rounded-lg shadow-lg py-1" style={{background:S.bg2,border:'1px solid '+S.border,minWidth:120}}>
                      <button onClick={() => {setAiMode('polish');setRewriteSubMode('polish');setAiTab('chat');setRightPanelOpen(true);setAiInput('精简这段文字');setShowRewriteMenu(false)}} className="block w-full text-left text-[10px] px-2.5 py-1.5 hover:bg-primary/10 transition-colors" style={{color:S.ink}}>精简（去啰嗦）</button>
                      <button onClick={() => {setAiMode('expand');setRewriteSubMode('expand');setAiTab('chat');setRightPanelOpen(true);setAiInput('丰满这段文字');setShowRewriteMenu(false)}} className="block w-full text-left text-[10px] px-2.5 py-1.5 hover:bg-primary/10 transition-colors" style={{color:S.ink}}>丰满（加细节）</button>
                    </div>
                  </>}
                </div>
                
              </div>
              <div className="flex-1 overflow-y-auto px-3.5 py-3 flex flex-col gap-2.5">
                {aiMessages.map((m, i) => (
                  <div key={i} className="text-xs leading-relaxed px-3 py-2 rounded-[10px] max-w-[92%] whitespace-pre-wrap"
                    style={m.role === 'user' ? {background:S.pri,color:'#fff',alignSelf:'flex-end',borderBottomRightRadius:3} : {background:S.bg2,color:S.ink,alignSelf:'flex-start',borderBottomLeftRadius:3}}>
                    {m.text}
                  </div>
                ))}
                {aiLoading && <div className="text-[10px] text-center py-1" style={{color:S.muted}}>AI 生成中...</div>}
              </div>
              <div className="shrink-0 border-t" style={{borderColor:S.border,background:S.bg2}}>
                <div className="flex items-center gap-2 px-3.5 py-1.5">
                  <select value={aiContext} onChange={e => setAiContext(e.target.value)}
                    className="text-[11px] px-2 py-1 rounded outline-none cursor-pointer" style={{border:'1px solid '+S.border,color:S.ink,background:S.bg2}}>
                    <option value="free">自由对话</option><option value="chapter">专注本章</option><option value="book">全书视角</option>
                  </select>
                  <span className="text-[9px] ml-auto px-2 py-0.5 rounded-full" style={{background:'rgba(196,149,106,.08)',color:S.priDim}}>§ {activeChapter?.title||'无'} · {chapterWordCount}字</span>
                </div>
                <div className="flex items-center gap-2 px-3.5 pb-2.5">
                  <input value={aiInput} onChange={e => setAiInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAi() } }}
                    placeholder="— 继续对话或输入指令 —" className="flex-1 px-3.5 py-2 text-xs rounded-full outline-none" style={{border:'1px solid '+S.border,background:S.bg2,height:38}} />
                  <button onClick={handleAi} disabled={aiLoading || (!aiInput.trim())}
                    className="min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center text-sm shrink-0 disabled:opacity-50"
                    style={{background:S.pri,color:'#fff'}}>→</button>
                </div>
              </div>
            </>
          )}

          {/* Inspiration */}
          {aiTab === 'inspire' && (
            <div className="flex-1 overflow-y-auto p-3.5">
              <div className="text-xs leading-relaxed p-3 rounded-[10px] max-w-full" style={{background:S.bg2,color:S.ink,borderBottomLeftRadius:3}}>
                <div className="font-semibold mb-1.5">AI 词库 · 灵感</div>
                <div className="mb-2">✦ 沈辞推开那扇门的瞬间，他看到了什么让他停住脚步？</div>
                <div className="mb-2">✦ 苏晚晴的琴声里藏着一个只有沈辞能听懂的暗号。</div>
                <div className="mb-2">✦ 这场雨下了三天三夜——裴行俭等的人，始终没有出现。</div>
                <div className="mt-3 pt-2.5 border-t text-[10px]" style={{borderColor:S.border,color:S.muted}}>基于当前章节上下文生成 · 点击采纳</div>
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => { setShowBrainstorm(true) }} className="flex-1 py-2 text-xs rounded text-center font-medium" style={{background:'rgba(196,149,106,.1)',color:S.priDim}}>✦ 脑洞喷射</button>
                <button onClick={() => { setShowInspire(true) }} className="flex-1 py-2 text-xs rounded text-center font-medium" style={{background:'rgba(196,149,106,.1)',color:S.priDim}}>✦ 灵感爆裂</button>
              </div>
            </div>
          )}

          {/* Workflow */}
          {aiTab === 'workflow' && (
            <div className="flex-1 overflow-y-auto p-3.5">
              <div className="text-xs leading-relaxed p-3 rounded-[10px] max-w-full" style={{background:S.bg2,color:S.ink,borderBottomLeftRadius:3}}>
                <div className="font-semibold mb-2">推荐写作工作流</div>
                <div className="mb-1.5 p-1.5 rounded text-[11px]" style={{background:S.bg2}}>1. 续写正文 → 2. AI改写 → 3. AI检测 → 4. 发布</div>
                <div className="mb-1.5 p-1.5 rounded text-[11px]" style={{background:S.bg2}}>1. 生成章纲 → 2. 按纲续写 → 3. 批量改写</div>
                <div className="mt-3 pt-2.5 border-t text-[10px]" style={{borderColor:S.border,color:S.muted}}>上次使用：续写正文 → 改写文本</div>
              </div>
              <div className="mt-3 space-y-2">
                <button onClick={() => setShowReport(true)} className="w-full py-2 text-xs rounded text-center font-medium" style={{border:'1px solid '+S.border,color:S.muted}}>章末自检</button>
                <button onClick={() => setShowShortcuts(true)} className="w-full py-2 text-xs rounded text-center font-medium" style={{border:'1px solid '+S.border,color:S.muted}}><Keyboard className="w-3 h-3 inline mr-1" />快捷键</button>
                <div className="flex gap-2">
                  {(['light','warm','dark','cool'] as const).map(k => (
                    <button key={k} onClick={() => setTheme(k)} className="flex-1 py-1.5 text-[10px] rounded text-center"
                      style={theme===k ? {background:S.pri,color:'#fff'} : {border:'1px solid '+S.border,color:S.muted}}>
                      {k === 'light' ? <Sun className="w-3 h-3 inline" /> : k === 'warm' ? <Sunrise className="w-3 h-3 inline" /> : k === 'dark' ? <Moon className="w-3 h-3 inline" /> : <Snowflake className="w-3 h-3 inline" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ 状态标签页 ═══ */}
          {aiTab === 'status' && (
            <StatusPanel
              projectId={projectId}
              chapterId={activeChapterId || ''}
              chapterOrder={(chapters.findIndex(c => c.id === activeChapterId) + 1) || 0}
              bodyDensity={bodyDensity}
              violations={violations}
              onOpenReport={() => setShowReport(true)}
              onOpenQuality={() => setQualitySidebarOpen(!qualitySidebarOpen)}
            />
          )}
        </aside>
      </div>

      {/* ═══════ Quality Sidebar ═══════ */}
      {/* ═══════ Modals ═══════ */}
      <input type="file" accept=".txt" ref={fileInputRef} onChange={handleTxtImport} className="hidden" />
      <iframe ref={printFrameRef} className="hidden" title="print-frame" />
      <TrashModal show={showTrash} onClose={() => setShowTrash(false)} trashChapters={trashChapters} selectedTrashId={selectedTrashId} onSelect={setSelectedTrashId} onRestore={(id) => { restoreChapter(id); setChapters(getChapters(projectId)); setTrashChapters(getTrash()); setSelectedTrashId(null) }} onDelete={(id) => { permanentDeleteChapter(id); setTrashChapters(getTrash()); setSelectedTrashId(null) }} />
      <ReportModal show={showReport} onClose={() => setShowReport(false)} content={content} onSave={handleSave} genre={project.genre} projectId={projectId} chapterId={activeChapterId || ''} chapterTitle={activeChapter?.title || ''} chapterOrder={activeChapter?.order || 0} />
      <BrainstormModal show={showBrainstorm} onClose={() => setShowBrainstorm(false)} bsGenre={bsGenre} onGenreChange={setBsGenre} onGenerate={handleBrainstorm} bsLoading={bsLoading} bsResult={bsResult} />

      {onboardingStep >= 0 && <div>{/* onBoarding placeholder */}</div>}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.3)',backdropFilter:'blur(4px)'}} onClick={() => setShowShortcuts(false)}>
          <div className="rounded-[20px] p-6 w-[400px]" style={{background:S.bg2,boxShadow:'0 12px 32px rgba(0,0,0,0.4)'}} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="font-semibold"><Keyboard className="w-4 h-4 inline mr-1" />快捷键</h3><button onClick={() => setShowShortcuts(false)}><X className="w-4 h-4" /></button></div>
            <div className="space-y-1 text-sm">{[['Ctrl+S','保存'],['Ctrl+Z','撤销'],['Ctrl+B','加粗'],['Ctrl+I','斜体'],['Ctrl+K','插入链接']].map(([k,d]) => (
              <div key={k} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-[#3a3028]"><span className="text-xs" style={{color:S.muted}}>{d}</span><kbd className="px-2 py-0.5 rounded text-xs font-mono" style={{background:S.bg2,border:'1px solid '+S.border}}>{k}</kbd></div>
            ))}</div>
          </div>
        </div>
      )}

      {/* ═══════ 选中文字浮动菜单 ═══════ */}
      {selMenuPos && (
        <div data-sel-menu="1" className="fixed z-[999] flex gap-0.5 rounded-xl shadow-lg py-1 px-1.5"
          style={{left:selMenuPos.x,top:selMenuPos.y,transform:'translate(-50%,-100%)',background:S.bg2,border:'1px solid '+S.border}}>
          {[{label:'✦ 精简',mode:'polish' as const},{label:'✦ 丰满',mode:'expand' as const},{label:'✦ 续写',mode:'continue' as const}].map((item,i) => (
            <button key={i} onClick={() => {
              setSelMenuPos(null)
              setAiMode(item.mode)
              setAiTab('chat')
              setRightPanelOpen(true)
              setAiInput(item.label+'：'+selMenuText.substring(0,80))
            }} className="text-[11px] px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap"
              style={{color:S.muted,background:'transparent'}}
              onMouseEnter={e=>{(e.target as HTMLElement).style.background='rgba(196,149,106,.1)';(e.target as HTMLElement).style.color=S.pri}}
              onMouseLeave={e=>{(e.target as HTMLElement).style.background='transparent';(e.target as HTMLElement).style.color=S.muted}}>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
