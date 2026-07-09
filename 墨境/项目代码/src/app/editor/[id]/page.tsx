'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { cn, toPlainText } from '@/lib/utils/utils'
import { Button } from '@/components/ui/button'
import { getProject, getChapters, getChapter, updateChapterContent, createChapter, deleteChapter, getTrash, restoreChapter, permanentDeleteChapter, createProject, cleanExpiredChapters, getVolumes, createVolume, renameVolume, deleteVolume, ensureDefaultVolume } from '@/lib/db/store'
import type { Project, Chapter, Character, Volume } from '@/lib/db/types'
import { calcBodyDensity, checkCompliance } from '@/lib/ai/compliance'
import { generateSimpleA8Status, generateUnblockHint } from '@/lib/prompts/builder'
import { WritingEditor, type EditorHandle } from '@/components/writing-editor'
import { TrashModal } from '@/components/trash-modal'
import { ReportModal } from '@/components/report-modal'
import { BrainstormModal } from '@/components/brainstorm-modal'
import type { Editor } from '@tiptap/react'
import { useTheme } from '@/lib/utils/theme-context'
import Image from 'next/image'
import { ArrowLeft, PanelLeft, PanelRight, Save, CheckCircle2, AlertTriangle, Maximize2, ClipboardCheck, Ellipsis, Trash2, Download, FileOutput, Upload, Shuffle, BookOpen, X, User, Lightbulb, Sparkles, BookMarked, Bot, FileText, Search, Pencil, Rocket, Zap, Sun, Sunrise, Moon, Snowflake, Keyboard, ArrowUp, ArrowDown, Printer, Activity } from 'lucide-react'
import { CompliancePanel } from '@/components/compliance-panel/compliance-panel'
import { CoolingMatrix } from '@/components/cooling-matrix'
import { WorkflowBar } from '@/components/workflow-bar'

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
  const [rightTab, setRightTab] = useState('plan')
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [autoSaveFlash, setAutoSaveFlash] = useState(false)
  const [showGuide, setShowGuide] = useState(() => {
    if (typeof window === 'undefined') return false
    return !localStorage.getItem('mojing_guide_seen')
  })
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
  const [importExpandedIdx, setImportExpandedIdx] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState<'title' | 'wordCount' | 'createdAt'>('title')
  const [showAllChapters, setShowAllChapters] = useState(false)
  const [workflowStage, setWorkflowStage] = useState<'plan' | 'write' | 'review' | 'deliver'>('write')

  const handleBrainstorm = async () => {
    setBsLoading(true); setBsResult('')
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 40000)
    try {
      const res = await fetch('/api/ai/brainstorm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ genre: bsGenre }), signal: controller.signal })
      const d = await res.json()
      setBsResult(d.ideas || d.error || '失败')
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') { setBsResult('⏱️ 请求超时，请稍后重试') }
      else { setBsResult('请求失败') }
    }
    finally { clearTimeout(timeoutId); setBsLoading(false) }
  }

  const handleInspire = async () => {
    setInspireLoading(true); setInspireResult('')
    try {
      const res = await fetch('/api/ai/brainstorm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ genre: inspireGenre, mode: 'inspire' }) })
      const d = await res.json()
      setInspireResult(d.ideas || d.error || '生成失败')
    } catch { setInspireResult('请求失败，灵感爆裂 API 暂不可用') }
    finally { setInspireLoading(false) }
  }

  const handleAlchemy = async () => {
    setAlchemyLoading(true); setAlchemyResult('')
    try {
      const res = await fetch('/api/ai/alchemy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ genre: 'all' }) })
      const d = await res.json()
      setAlchemyResult(d.text || d.titles?.join('\n') || d.error || '生成失败')
    } catch { setAlchemyResult('请求失败，书名炼金术 API 暂不可用') }
    finally { setAlchemyLoading(false) }
  }

  const handleInsertCharacterTag = (name: string) => {
    const tag = `【${name}】`
    writingEditorRef.current?.insertAtCursor(tag)
  }

  const handleAi = async () => {
    setAiLoading(true); setAiResult('')
    const endpoint = aiMode === 'continue' ? '/api/ai/continue' : aiMode === 'polish' ? '/api/ai/polish' : '/api/ai/expand'
    const body: Record<string, string> = { instruction: aiInstruction, style: theme, chapterIndex: String(chapters.findIndex(c => c.id === activeChapterId) + 1), genre: project?.genre || '' }
    if (aiMode === 'continue') body.context = content
    else {
      const sel = window.getSelection()?.toString() || ''
      if (!sel.trim()) { setAiResult('请先在编辑器中选中一段文字'); setAiLoading(false); return }
      body.text = sel
    }
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        setAiResult(errData.error || '请求失败')
        return
      }
      const reader = res.body?.getReader()
      if (!reader) { setAiResult('无法读取响应流'); return }
      const decoder = new TextDecoder()
      let buffer = ''
      let resultText = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const parsed = JSON.parse(line.trim())
            if (parsed.text) resultText += parsed.text
            if (parsed.error) resultText = parsed.error
          } catch { /* skip partial */ }
        }
        setAiResult(resultText)
      }
      setAiResult(resultText || '（空结果）')
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') { setAiResult('⏱️ 请求超时，请稍后重试') }
      else { setAiResult('请求失败') }
    }
    finally { clearTimeout(timeoutId); setAiLoading(false) }
  }
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
  useEffect(() => {
    if (typeof window !== 'undefined') try { localStorage.setItem('mojing_characters_' + projectId, JSON.stringify(characters)) } catch {}
  }, [characters, projectId])
  const [filterTab, setFilterTab] = useState('all')
  const editorRef = useRef<Editor | null>(null)
  const writingEditorRef = useRef<EditorHandle>(null)
  const leftSidebarRef = useRef<HTMLDivElement>(null)
  const editorAreaRef = useRef<HTMLDivElement>(null)
  const rightPanelRef = useRef<HTMLDivElement>(null)
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null)
  const [editorVersion, setEditorVersion] = useState(0)
  const contentRef = useRef(content)
  contentRef.current = content
  const fileInputRef = useRef<HTMLInputElement>(null)
  const printFrameRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const p = getProject(projectId)
    if (!p) { router.push('/'); return }
    setProject(p)
    const chs = getChapters(projectId)
    setChapters(chs)
    // 加载卷数据（兼容旧 localStorage 格式）
    if (typeof window !== 'undefined') {
      const storeVols = getVolumes(projectId)
      if (storeVols.length > 0) {
        setVolumes(storeVols)
      } else {
        // 尝试从旧格式迁移：mojing_volumes_{projectId}
        try {
          const oldData = localStorage.getItem('mojing_volumes_' + projectId)
          if (oldData) {
            const oldNames: string[] = JSON.parse(oldData)
            const migrated = oldNames.map((name: string, i: number) => createVolume(projectId, name))
            setVolumes(migrated)
            localStorage.removeItem('mojing_volumes_' + projectId)
          } else {
            // 旧数据无卷信息，创建默认卷
            const dv = ensureDefaultVolume(projectId)
            setVolumes([dv])
          }
        } catch {
          const dv = ensureDefaultVolume(projectId)
          setVolumes([dv])
        }
      }
    }
    if (chs.length > 0) {
      const lastId = typeof window !== 'undefined' ? localStorage.getItem('mojing_last_chapter_' + projectId) : null
      const target = lastId ? chs.find(c => c.id === lastId) : chs[0]
      const ch = target || chs[0]
      setActiveChapterId(ch.id); setActiveChapter(ch); setContent(ch.content || '')
      setBodyDensity(calcBodyDensity(toPlainText(ch.content || '')))
    }
  }, [])

  useEffect(() => {
    if (!activeChapterId) return
    const ch = getChapter(activeChapterId)
    if (ch) { setActiveChapter(ch); setContent(ch.content || ''); setBodyDensity(calcBodyDensity(toPlainText(ch.content || ''))) }
  }, [activeChapterId])

  // 新手引导 spotlight 定位
  useEffect(() => {
    if (!showGuide) { setSpotlightRect(null); return }
    let el: HTMLElement | null = null
    if (guideStep === 0) el = leftSidebarRef.current
    else if (guideStep === 1) el = editorAreaRef.current
    else if (guideStep === 2) el = rightPanelRef.current
    if (el) {
      const rect = el.getBoundingClientRect()
      setSpotlightRect(rect)
    }
    const onResize = () => {
      if (guideStep === 0) el = leftSidebarRef.current
      else if (guideStep === 1) el = editorAreaRef.current
      else if (guideStep === 2) el = rightPanelRef.current
      if (el) setSpotlightRect(el.getBoundingClientRect())
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [guideStep, showGuide])

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

  // 点击外部关闭卷菜单
  useEffect(() => {
    const handleClick = () => setVolMenuOpen(null)
    if (volMenuOpen) {
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [volMenuOpen])

  const handleSave = () => {
    if (!activeChapter) return
    setSaveStatus('saving')
    updateChapterContent(activeChapter.id, content)
    setBodyDensity(calcBodyDensity(toPlainText(content)))
    setChapters(getChapters(projectId))
    setSaveStatus('saved')
  }

  const handleContentChange = (newContent: string) => {
    setContent(newContent); setSaveStatus('unsaved')
    setBodyDensity(calcBodyDensity(toPlainText(newContent)))
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
        const paragraphs = plain.split('\n').filter(p => p.trim().length > 0)
        const lastPara = paragraphs[paragraphs.length - 1] || ''
        const result = checkCompliance(lastPara)
        if (result.blockedItems.length > 0) {
          const newV = result.blockedItems.map(item =>
            item.type === 'forbidden_b' ? `B类禁用词: ${item.words?.join('、') || ''}` : '动作句后紧跟解释语句')
          setViolations(prev => [...new Set([...prev, ...newV])])
        }
      }, 100)
    }
    ed.on('update', handler)
    return () => { ed.off('update', handler) }
  }, [editorVersion])

  // ===== TXT/MD 导入工具 =====
  const parseTxtParts = (text: string, mode: 'auto'|'chapter'|'h1'|'h2'|'h3') => {
    const lines = text.split('\n')
    const parts: {t:string;c:string}[] = []
    let currentTitle = ''
    let currentContent: string[] = []

    // 自动检测最佳拆分模式
    const detectMode = (): typeof mode => {
      let mdCount = 0; let mdLevel = 0
      let chCount = 0
      for (const l of lines) {
        const t = l.trim()
        if (/^#{1,6} /.test(t)) { mdCount++; if (!mdLevel) mdLevel = t.match(/^(#+)/)?.[1].length || 0 }
        else if (/^第[零一二三四五六七八九十百千万\d]+[章节部篇集]/.test(t)) chCount++
        else if (/^[Cc]hapter\s+\d+/i.test(t)) chCount++
      }
      if (mdCount >= chCount && mdCount > 0) {
        const level = mdLevel || 1
        return level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3'
      }
      if (chCount > 0) return 'chapter'
      return 'chapter'
    }

    const resolvedMode = mode === 'auto' ? detectMode() : mode

    const isTitle = (l: string) => {
      if (resolvedMode === 'chapter') return /^第[零一二三四五六七八九十百千万\d]+[章节部篇集]/.test(l) || /^[Cc]hapter\s+\d+/i.test(l)
      if (resolvedMode === 'h1') return /^# /.test(l)
      if (resolvedMode === 'h2') return /^## /.test(l)
      return /^### /.test(l)
    }
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      if (isTitle(trimmed)) {
        if (currentTitle || currentContent.length > 0) {
          parts.push({ t: currentTitle, c: currentContent.join('\n') })
        }
        currentTitle = trimmed.replace(/^#+\s+/, '')
        currentContent = []
      } else {
        currentContent.push(trimmed)
      }
    }
    if (currentTitle || currentContent.length > 0) {
      parts.push({ t: currentTitle, c: currentContent.join('\n') })
    }
    if (parts.length === 0) {
      parts.push({ t: '全文', c: text })
    }
    return parts
  }

  const handleTxtImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportFn(file.name.replace(/\.(txt|md)$/i, ''))
    try {
      const text = await file.text()
      setImportTxt(text)
      const parts = parseTxtParts(text, importMode)
      setImportParts(parts)
      setImportTitleOverrides(parts.map(p => p.t))
      setImportDlg(true)
    } catch {
      // 读取失败时不作处理
    }
    e.target.value = ''
  }

  const handleModeChange = (mode: 'auto'|'chapter'|'h1'|'h2'|'h3') => {
    setImportMode(mode)
    if (importTxt) {
      const newParts = parseTxtParts(importTxt, mode)
      setImportParts(newParts)
      setImportTitleOverrides(newParts.map(p => p.t))
    }
  }

  const confirmImport = () => {
    if (!projectId || importParts.length === 0) return
    for (let i = 0; i < importParts.length; i++) {
      const part = importParts[i]
      const ch = createChapter(projectId, importTitleOverrides[i] || importFn)
      if (ch && part.c) updateChapterContent(ch.id, part.c)
    }
    setChapters(getChapters(projectId))
    setImportDlg(false)
    setImportTxt('')
    setImportParts([])
    setImportTitleOverrides([])
    setImportFn('')
  }

  // ===== 📄 强化全本PDF导出 =====
  const handleExportPDF = () => {
    const sorted = [...chapters].sort((a, b) => a.order - b.order)
    const projectName = project?.name || '作品'

    // 按卷分组
    const volMap = new Map<string, Chapter[]>()
    const volOrder: { id: string; name: string }[] = []
    volumes.forEach(v => { volMap.set(v.id, []); volOrder.push({ id: v.id, name: v.name }) })
    const unclassified: Chapter[] = []
    sorted.forEach(ch => {
      if (ch.volumeId && volMap.has(ch.volumeId)) { volMap.get(ch.volumeId)!.push(ch) }
      else { unclassified.push(ch) }
    })

    // 生成目录
    let tocItems = ''
    let chapterIdx = 1
    volOrder.forEach(v => {
      const chs = volMap.get(v.id) || []
      if (chs.length === 0) return
      tocItems += `<div class="toc-vol">${v.name}</div>\n`
      chs.forEach(ch => {
        const plainTitle = ch.title.replace(/<[^>]*>/g, '').trim()
        tocItems += `<div class="toc-ch"><span class="toc-ch-num">第${chapterIdx}章</span><span class="toc-ch-title">${plainTitle}</span></div>\n`
        chapterIdx++
      })
    })
    if (unclassified.length > 0) {
      tocItems += `<div class="toc-vol">📂 未分类</div>\n`
      unclassified.forEach(ch => {
        const plainTitle = ch.title.replace(/<[^>]*>/g, '').trim()
        tocItems += `<div class="toc-ch"><span class="toc-ch-num">第${chapterIdx}章</span><span class="toc-ch-title">${plainTitle}</span></div>\n`
        chapterIdx++
      })
    }

    // 生成正文
    let bodyParts = ''
    chapterIdx = 1
    const renderChapters = (chs: Chapter[]) => {
      chs.forEach((ch, i) => {
        const plainTitle = ch.title.replace(/<[^>]*>/g, '').trim()
        const plain = ch.content
          ? ch.content.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/g, ' ')
          : ''
        const paragraphs = plain
          .split(/\n+/)
          .filter(p => p.trim())
          .map(p => `<p>${p.trim()}</p>`)
          .join('\n')
        bodyParts += `<div class="chapter-wrapper">
  <div class="chapter-number">第${chapterIdx}章</div>
  <h2 class="chapter-title">${plainTitle}</h2>
  <div class="chapter-body">${paragraphs}</div>
</div>\n`
        chapterIdx++
      })
    }
    volOrder.forEach(v => {
      const chs = volMap.get(v.id) || []
      if (chs.length === 0) return
      renderChapters(chs)
    })
    if (unclassified.length > 0) renderChapters(unclassified)

    const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8"><title>${projectName}</title>
<style>
  @page { margin: 2.8cm 2.5cm 3cm; size: A4; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Noto Serif CJK SC", "Source Han Serif SC", "Songti SC", "SimSun", serif;
    font-size: 12pt;
    line-height: 2;
    color: #1a1a1a;
    text-align: justify;
  }

  /* ===== 封面 ===== */
  .cover {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 90vh;
    page-break-after: always;
    text-align: center;
  }
  .cover-title {
    font-size: 32pt;
    font-weight: 700;
    letter-spacing: 4px;
    margin-bottom: 1.5cm;
    color: #000;
  }
  .cover-sub {
    font-size: 14pt;
    color: #666;
    letter-spacing: 2px;
  }
  .cover-meta {
    margin-top: 3cm;
    font-size: 11pt;
    color: #888;
  }

  /* ===== 目录 ===== */
  .toc-page {
    page-break-after: always;
    padding: 1cm 0;
  }
  .toc-heading {
    text-align: center;
    font-size: 18pt;
    font-weight: 700;
    margin-bottom: 1.5cm;
    letter-spacing: 2px;
  }
  .toc-vol {
    font-size: 11pt;
    font-weight: 600;
    color: #6b8c6e;
    margin: 0.8cm 0 0.3cm;
    padding-left: 0.5cm;
    border-bottom: 1px solid #e0e0e0;
    padding-bottom: 0.15cm;
  }
  .toc-ch {
    display: flex;
    gap: 1em;
    padding: 0.2cm 0.5cm 0.2cm 1cm;
    font-size: 11pt;
    line-height: 1.6;
  }
  .toc-ch-num {
    color: #999;
    min-width: 4em;
  }
  .toc-ch-title {
    flex: 1;
  }

  /* ===== 章节 ===== */
  .chapter-wrapper {
    page-break-before: always;
  }
  .chapter-wrapper:first-of-type {
    page-break-before: auto;
  }
  .chapter-number {
    text-align: center;
    font-size: 11pt;
    color: #999;
    margin: 1.5cm 0 0.3cm;
  }
  .chapter-title {
    text-align: center;
    font-size: 20pt;
    font-weight: 700;
    margin: 0 0 1.2cm;
    letter-spacing: 1px;
    line-height: 1.4;
  }
  .chapter-body p {
    text-indent: 2em;
    margin: 0;
    line-height: 2;
    orphans: 2;
    widows: 2;
  }

  /* ===== 结尾 ===== */
  .the-end {
    text-align: center;
    font-size: 14pt;
    color: #999;
    margin: 4cm 0;
    letter-spacing: 4px;
    page-break-before: always;
  }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>

  <!-- 封面 -->
  <div class="cover">
    <div class="cover-title">${projectName}</div>
    <div class="cover-sub">—— 全本精排版 ——</div>
    <div class="cover-meta">导出日期：${today}</div>
  </div>

  <!-- 目录 -->
  <div class="toc-page">
    <div class="toc-heading">目 录</div>
    ${tocItems}
  </div>

  <!-- 正文 -->
  ${bodyParts}

  <div class="the-end">—— 全文完 ——</div>

</body>
</html>`
    const iframe = printFrameRef.current
    if (!iframe) return
    iframe.srcdoc = html
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.print()
      }, 350)
    }
  }

  if (!project) return null

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden editor-ambient">
      {/* 隐藏的文件选择器 */}
      <input type="file" accept=".txt" ref={fileInputRef} onChange={handleTxtImport} className="hidden" />
      {/* 隐藏的 PDF 导出 iframe */}
      <iframe ref={printFrameRef} className="hidden" title="print-frame" />
      {/* ===== 顶栏 ===== */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-border glass-panel shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/')} className="text-muted-foreground hover:text-foreground p-1"><ArrowLeft className="w-5 h-5" /></button>
          <Image src="/assets/brand/mojing-logo-nav.png" alt="墨境" width={160} height={28} className="h-7 w-auto" />
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-muted-foreground hover:text-foreground"><PanelLeft className="w-5 h-5" /></button>
          <span className="text-sm font-medium">{project.name}</span>
          <span className="text-xs text-muted-foreground">/</span>
          <span className="text-sm text-muted-foreground">{activeChapter?.title || '无章节'}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            {saveStatus === 'saved' && <><CheckCircle2 className={cn("w-3 h-3", autoSaveFlash ? "text-primary animate-pulse" : "text-success")} />{autoSaveFlash ? '自动已保存' : '已保存'}</>}
            {saveStatus === 'saving' && '保存中...'}
            {saveStatus === 'unsaved' && <><AlertTriangle className="w-3 h-3 text-warning" />未保存</>}
          </span>
          <Button size="sm" variant="outline" onClick={() => { setSidebarOpen(false); setRightPanelOpen(false) }} title="专注模式"><Maximize2 className="w-5 h-5" /></Button>
          <Button size="sm" variant="outline" onClick={handleSave}><Save className="w-4 h-4 mr-1" />保存</Button>
          <Button size="sm" className="bg-success hover:bg-success/90 text-white" onClick={() => setShowReport(true)}><ClipboardCheck className="w-5 h-5 mr-1" />章末自检</Button>
        </div>
      </div>

      {/* ===== 主体 ===== */}
      <div className="flex-1 flex overflow-hidden">
        {/* ===== 左侧栏 ===== */}
        <div className="flex">
          <div className={cn("transition-all duration-300", sidebarOpen ? "w-[220px]" : "w-0 overflow-hidden")}>
            <div className="w-[220px] h-full flex flex-col border-r border-border glass-panel">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h3 className="text-base font-medium truncate">{project.name}</h3>
                <div className="relative">
                  <button onClick={() => setShowMenu(!showMenu)} className="text-muted-foreground hover:text-foreground text-sm px-1"><Ellipsis className="w-3 h-3" /></button>
                  {showMenu && (
                    <div className="absolute left-6 top-0 bg-white rounded-lg shadow-elevated border border-border py-1 w-36 z-50" onMouseLeave={() => setShowMenu(false)}>
                      <button onClick={() => { setShowMenu(false); cleanExpiredChapters(); setTrashChapters(getTrash()); setShowTrash(true) }} className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary flex items-center gap-2"><span><Trash2 className="w-3 h-3" /></span>回收站</button>
                      <button onClick={() => { setShowMenu(false); fileInputRef.current?.click() }} className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary flex items-center gap-2"><span><Upload className="w-3 h-3" /></span>导入 TXT</button>
                      <button onClick={() => {
                        setShowMenu(false)
                        const blob = new Blob([activeChapter?.title + '\n\n' + content], { type: 'text/plain;charset=utf-8' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url; a.download = (activeChapter?.title || '章节') + '.txt'; a.click()
                        URL.revokeObjectURL(url)
                      }} className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary flex items-center gap-2"><span><FileOutput className="w-3 h-3" /></span>导出 TXT</button>
                      <button onClick={() => {
                        setShowMenu(false)
                        // 按顺序合并所有章节
                        const sorted = [...chapters].sort((a, b) => a.order - b.order)
                        const lines = sorted.map((ch, i) => {
                          const plain = ch.content ? ch.content.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/g, ' ') : ''
                          return `=== ${ch.title} ===\n${plain}`
                        })
                        const fullText = lines.join('\n\n')
                        const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url; a.download = (project?.name || '作品') + '_全本.txt'; a.click()
                        URL.revokeObjectURL(url)
                      }} className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary flex items-center gap-2"><span><Download className="w-3 h-3" /></span>全本导出</button>
                      <button onClick={() => { setShowMenu(false); handleExportPDF() }} className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary flex items-center gap-2"><span><Printer className="w-3 h-3" /></span>📄 全本PDF导出</button>
                      <button onClick={() => setSortBy(prev => prev === 'title' ? 'wordCount' : prev === 'wordCount' ? 'createdAt' : 'title')} className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary flex items-center gap-2"><span><Shuffle className="w-3 h-3" /></span>{sortBy === 'title' ? '按标题' : sortBy === 'wordCount' ? '按字数' : '按时间'}</button>
                      <button onClick={() => setShowAllChapters(prev => !prev)} className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary flex items-center gap-2"><span><BookOpen className="w-3 h-3" /></span>{showAllChapters ? '按卷分组' : '全部章节'}</button>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-4 py-2 border-b border-border">
                <input type="text" placeholder="搜索章节..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  className="w-full h-7 px-3 text-xs rounded-lg border border-border bg-background outline-none focus:border-primary transition-all" />
              </div>
              <div className="flex gap-2 px-4 py-3 border-b border-border">
                <button onClick={() => {
                  const firstVolId = volumes.length > 0 ? volumes[0].id : undefined
                  const nc = createChapter(projectId, `第${chapters.length + 1}章`, firstVolId)
                  if (nc) { setChapters(getChapters(projectId)); setActiveChapterId(nc.id) }
                }}
                  className="text-xs px-3 py-1 rounded-full bg-primary text-white font-medium hover:bg-primary/90">+ 新建章</button>
                <button onClick={() => { setVolumeName(`第${volumes.length + 1}卷`); setShowVolumeModal(true) }}
                  className="text-xs px-3 py-1 rounded-full border border-border text-muted-foreground hover:bg-secondary">+ 新建卷</button>
              </div>
              <div className="flex gap-4 px-4 py-2 border-b border-border text-xs">
                <button onClick={() => setFilterTab('all')} className={cn("pb-1", filterTab === 'all' ? 'text-primary font-medium border-b-2 border-primary' : 'text-muted-foreground')}>全部</button>
                <button onClick={() => setFilterTab('draft')} className={cn("pb-1", filterTab === 'draft' ? 'text-primary font-medium border-b-2 border-primary' : 'text-muted-foreground')}>草稿</button>
              </div>
              <div className="flex-1 overflow-y-auto py-1">
                {(() => {
                  let displayChs = searchTerm ? chapters.filter(c => c.title.includes(searchTerm) || (c.content || '').includes(searchTerm)) : filterTab === 'all' ? chapters : chapters.filter(c => c.status === 'draft')
                  displayChs = [...displayChs].sort((a, b) => {
                    if (sortBy === 'title') return a.title.localeCompare(b.title)
                    if (sortBy === 'wordCount') return (a.wordCount ?? 0) - (b.wordCount ?? 0)
                    return (a.createdAt ?? 0) - (b.createdAt ?? 0)
                  })
                  if (showAllChapters) {
                    return [{ name: '全部章节', chs: displayChs }].map(vol => (
                    <div key={vol.name}>
                      <div className="flex items-center justify-between px-4 py-1.5 text-[11px] text-muted-foreground font-medium group">
                        <span>{vol.name}</span>
                      </div>
                      {vol.chs.map(ch => (
                        <div key={ch.id} onClick={() => { if (saveStatus === 'unsaved') handleSave(); localStorage.setItem('mojing_last_chapter_' + projectId, ch.id); setContent(ch.content || ''); setActiveChapterId(ch.id) }}
                          className={cn("flex items-center justify-between px-4 py-1.5 text-sm cursor-pointer transition-all group", activeChapterId === ch.id ? "bg-primary-light text-primary font-medium" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>
                          <span className="truncate">{ch.title}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground/50">{ch.wordCount}</span>
                            <button onClick={e => { e.stopPropagation(); deleteChapter(ch.id); setChapters(getChapters(projectId)) }}
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive text-[10px]"><X className="w-2.5 h-2.5" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                  }
                  // 按 volumeId 分组
                  const unclassifiedChs = displayChs.filter(c => !c.volumeId || c.volumeId === '')
                  const volGroups = volumes.map(v => ({
                    vol: v,
                    chs: displayChs.filter(c => c.volumeId === v.id),
                  }))
                  const allGroups = [
                    ...volGroups,
                    ...(unclassifiedChs.length > 0 ? [{ vol: null, chs: unclassifiedChs }] : []),
                  ]
                  return allGroups.map(group => {
                    const isUnclassified = !group.vol
                    const vol = group.vol as Volume | null
                    return (
                    <div key={vol?.id || '_unclassified'}>
                      <div className="flex items-center justify-between px-4 py-1.5 text-[11px] text-muted-foreground font-medium group">
                        {renamingVol === vol?.id ? (
                          <input value={renameValue} onChange={e => setRenameValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { if (renameValue.trim()) { renameVolume(vol.id, renameValue.trim()); setVolumes(getVolumes(projectId)); } setRenamingVol(null) } else if (e.key === 'Escape') { setRenamingVol(null) } }}
                            onBlur={() => setRenamingVol(null)}
                            className="w-full px-1 py-0 text-xs rounded border border-primary bg-background outline-none" autoFocus />
                        ) : (
                          <span>{isUnclassified ? '📂 未分类' : vol!.name}</span>
                        )}
                        {!isUnclassified && (
                          <div className="relative">
                            <button onClick={e => { e.stopPropagation(); setVolMenuOpen(volMenuOpen === vol!.id ? null : vol!.id) }}
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground text-xs"><Ellipsis className="w-3 h-3" /></button>
                            {volMenuOpen === vol!.id && (
                              <div className="absolute right-0 top-4 bg-white rounded-lg shadow-elevated border border-border py-1 w-28 z-50" onClick={e => e.stopPropagation()}>
                                <button onClick={() => { setRenamingVol(vol!.id); setRenameValue(vol!.name); setVolMenuOpen(null) }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary flex items-center gap-2"><Pencil className="w-3 h-3" />✏️ 重命名</button>
                                <button onClick={() => {
                                  setVolMenuOpen(null)
                                  const count = group.chs.length
                                  if (count === 0) {
                                    deleteVolume(vol!.id)
                                    setVolumes(getVolumes(projectId))
                                  } else {
                                    if (window.confirm(`卷内有 ${count} 篇章节，删除后章节将移入未分类`)) {
                                      deleteVolume(vol!.id)
                                      setVolumes(getVolumes(projectId))
                                      setChapters(getChapters(projectId))
                                    }
                                  }
                                }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-destructive hover:bg-secondary flex items-center gap-2"><Trash2 className="w-3 h-3" />❌ 删除卷</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {group.chs.map(ch => (
                        <div key={ch.id} onClick={() => { if (saveStatus === 'unsaved') handleSave(); localStorage.setItem('mojing_last_chapter_' + projectId, ch.id); setContent(ch.content || ''); setActiveChapterId(ch.id) }}
                          className={cn("flex items-center justify-between px-4 py-1.5 text-sm cursor-pointer transition-all group", activeChapterId === ch.id ? "bg-primary-light text-primary font-medium" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>
                          <span className="truncate">{ch.title}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground/50">{ch.wordCount}</span>
                            <button onClick={e => { e.stopPropagation(); deleteChapter(ch.id); setChapters(getChapters(projectId)) }}
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive text-[10px]"><X className="w-2.5 h-2.5" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )})
                })()}
              </div>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-5 h-8 my-auto shrink-0 flex items-center justify-center border border-l-0 border-border bg-card text-muted-foreground hover:text-foreground cursor-pointer text-xs rounded-r-sm -ml-[1px]">
            {sidebarOpen ? '‹' : '›'}
          </button>
        </div>

        {/* ===== 中间编辑区 ===== */}
        <div className="flex-1 flex flex-col min-w-0 glass-panel" tabIndex={-1}>
          <div className="flex-1 overflow-y-auto" tabIndex={-1}>
            <div className="py-10 min-h-full px-16 max-w-[720px] mx-auto" tabIndex={-1}>
              <WritingEditor ref={writingEditorRef} key={activeChapterId} content={content} onChange={handleContentChange} onHeadings={setHeadings} onEditorReady={(e) => { editorRef.current = e; setEditorVersion(v => v + 1) }} wordGoal={wordGoal} onWordGoalChange={setWordGoal} />

              {/* ===== 底部工具栏 ===== */}
              <div className="flex items-center justify-center gap-3 py-3 border-t border-border mt-4">
                <button onClick={() => { localStorage.removeItem('mojing_guide_seen'); setShowGuide(true) }}
                  className="px-4 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs hover:bg-primary-light hover:text-primary transition-colors">
                  <BookOpen className="w-3 h-3 mr-1" />新手引导
                </button>
                <button onClick={() => { const hint = generateUnblockHint(); setAiResult(hint); setRightTab('ai'); setRightPanelOpen(true) }}
                  className="px-4 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs hover:bg-primary-light hover:text-primary transition-colors">
                  <Lightbulb className="w-3 h-3 mr-1" />卡文三板斧
                </button>
                <button onClick={() => setShowReport(true)}
                  className="px-4 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs hover:bg-primary-light hover:text-primary transition-colors">
                  <ClipboardCheck className="w-3 h-3 mr-1" />章末自检
                </button>
                <button onClick={() => setShowShortcuts(true)}
                  className="px-4 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs hover:bg-primary-light hover:text-primary transition-colors">
                  <Keyboard className="w-3 h-3 mr-1 inline" />快捷键
                </button>
                <button onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs hover:bg-primary-light hover:text-primary transition-colors">
                  <Upload className="w-3 h-3 mr-1" />导入 TXT
                </button>
              </div>

              {violations.length > 0 && (
                <button onClick={() => { setRightTab('compliance'); setRightPanelOpen(true) }}
                  className="fixed bottom-6 right-6 z-50 w-9 h-9 rounded-full shadow-md flex items-center justify-center text-xs font-bold bg-warning text-white hover:scale-110 transition-all">
                  {violations.length}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ===== 右侧栏 ===== */}
        <div className="flex">
          <div className={cn("transition-all duration-200 overflow-hidden glass-panel", rightPanelOpen ? "border-l border-border" : "w-0")} style={rightPanelOpen ? {width:'260px'} : undefined}>
            <div className="h-full flex flex-col" style={{width:'260px'}}>
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase">
                  {rightTab === 'plan' && '本章规划'}
                  {rightTab === 'compliance' && '合规检测'}
                  {rightTab === 'outline' && '大纲'}
                  {rightTab === 'character' && '角色'}
                  {rightTab === 'idea' && '灵感'}
                </h3>
                <button onClick={() => { setRightPanelOpen(false); setRightTab('') }} className="text-muted-foreground hover:text-foreground text-xs"><X className="w-3 h-3" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {rightTab === 'plan' && activeChapter && <>
                  <div className="bg-primary-light rounded-lg p-3 text-xs space-y-1 mb-3">
                    <div className="font-medium text-primary">A-8 创作状态</div>
                    <div className="text-muted-foreground font-mono text-[11px]">第{chapters.findIndex(c => c.id === activeChapterId) + 1}章 · {project.genre}</div>
                    <div className="text-muted-foreground text-[11px]">{generateSimpleA8Status(chapters.findIndex(c => c.id === activeChapterId) + 1)}</div>
                  </div>
                  <div className="bg-secondary rounded-lg p-3 text-xs space-y-2">
                    <div className="flex justify-between"><span className="text-muted-foreground">字数</span><span className="font-medium">{toPlainText(content).length}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">身体密度</span><span className={cn("font-medium", bodyDensity >= 40 && bodyDensity <= 55 ? "text-success" : "text-warning")}>{bodyDensity}%</span></div>
                  </div>
                  <div className="pt-3 border-t border-border space-y-1">
                    <p className="text-[10px] text-muted-foreground">写作主题</p>
                    <div className="flex flex-wrap gap-1">
                      {(['light','warm','dark','cool'] as const).map(k => (
                        <button key={k} onClick={() => setTheme(k)}
                          className={cn("px-2 py-0.5 rounded text-[10px] transition-all", theme === k ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground hover:bg-primary-light')}>{k === 'light' ? <Sun className="w-3 h-3" /> : k === 'warm' ? <Sunrise className="w-3 h-3" /> : k === 'dark' ? <Moon className="w-3 h-3" /> : <Snowflake className="w-3 h-3" />}</button>
                      ))}
                    </div>
                  </div>
                </>}
                {rightTab === 'compliance' ? (() => {
                  const r = checkCompliance(toPlainText(content))
                  const items = r.blockedItems.map(it => it.type === 'forbidden_b' ? ('B类禁用词: ' + (it.words?.join(',') || '')) : '动作句后紧跟解释语句')
                  return <div className="text-xs text-muted-foreground space-y-2">
                    <span className="text-sm font-medium">共 {items.length} 项</span>
                    {items.length === 0 ? <p className="text-success text-xs">暂无违规</p> : items.map((desc, i) => <div key={i} onClick={() => { const ed = editorRef.current; if (!ed) return; const w = desc.replace('B类禁用词: ', '').split(',')[0]; const docText = ed.state.doc.textContent; const idx = docText.indexOf(w); if (idx >= 0) { ed.chain().focus().setTextSelection({ from: idx, to: idx + w.length }).run(); setTimeout(() => { const sel = window.getSelection(); if (sel && sel.rangeCount > 0) { const r = sel.getRangeAt(0); const container = ed.view.dom.closest('.overflow-y-auto'); if (container) { const cr = container.getBoundingClientRect(); const rr = r.getBoundingClientRect(); container.scrollTop = container.scrollTop + rr.top - cr.top - cr.height / 3 } } }, 30) } }} className="text-warning bg-warning-light rounded px-3 py-2 text-xs cursor-pointer hover:bg-warning-light">{desc}</div>)}
                    <p className="text-[10px] text-muted-foreground">仅供参考，改与不改由你决定</p>
                  </div>
                })() : null}
                {rightTab === 'outline' && <div className="text-xs text-muted-foreground">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">{headings.length} 个标题</span>
                  </div>
                  {headings.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-center">
                      <FileText className="w-8 h-8 text-muted-foreground/30 mb-2" />
                      <p className="text-[11px] text-muted-foreground">暂无大纲，在编辑器中添加标题</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">试试点击工具栏的"卷""章""节"</p>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {headings.map((h, i) => (
                        <div key={i} className={cn("flex items-center gap-1 px-1 py-0.5 rounded hover:bg-secondary transition-colors", h.level === 1 ? 'font-bold text-foreground' : h.level === 2 ? 'font-medium text-muted-foreground' : 'text-muted-foreground')}
                          style={{ paddingLeft: `${(h.level - 1) * 16 + 4}px` }}>
                          {/* 标题文本 - 点击跳转 */}
                          {editingHeadingIdx === i ? (
                            <input
                              autoFocus
                              className="flex-1 bg-background border border-primary rounded px-1 py-0 text-[11px] outline-none min-w-0"
                              value={editingHeadingText}
                              onChange={e => setEditingHeadingText(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && editingHeadingText.trim()) {
                                  writingEditorRef.current?.updateHeadingText(h.pos, editingHeadingText.trim())
                                  setEditingHeadingIdx(null)
                                }
                                if (e.key === 'Escape') setEditingHeadingIdx(null)
                              }}
                              onBlur={() => {
                                if (editingHeadingText.trim()) {
                                  writingEditorRef.current?.updateHeadingText(h.pos, editingHeadingText.trim())
                                }
                                setEditingHeadingIdx(null)
                              }}
                              onClick={e => e.stopPropagation()}
                            />
                          ) : (
                            <span
                              className="flex-1 truncate cursor-pointer"
                              onClick={() => writingEditorRef.current?.scrollToHeading(h.pos)}
                              title={h.text}
                            >{h.text}</span>
                          )}
                          {/* 右侧操作按钮组：↑↓ ✏️ ❌ */}
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button onClick={(e) => { e.stopPropagation(); if (i > 0) writingEditorRef.current?.swapHeadings(headings[i - 1].pos, h.pos) }}
                              className="p-0.5 text-muted-foreground/50 hover:text-foreground transition-colors" title="上移">
                              <ArrowUp className="w-2.5 h-2.5" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); if (i < headings.length - 1) writingEditorRef.current?.swapHeadings(headings[i + 1].pos, h.pos) }}
                              className="p-0.5 text-muted-foreground/50 hover:text-foreground transition-colors" title="下移">
                              <ArrowDown className="w-2.5 h-2.5" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setEditingHeadingIdx(i); setEditingHeadingText(h.text) }}
                              className="p-0.5 text-muted-foreground/50 hover:text-foreground transition-colors" title="编辑标题">
                              <Pencil className="w-2.5 h-2.5" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); writingEditorRef.current?.deleteHeadingAt(h.pos) }}
                              className="p-0.5 text-muted-foreground/50 hover:text-destructive transition-colors" title="从大纲移除">
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>}
                {rightTab === 'character' && <div className="text-xs text-muted-foreground space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">角色列表</p>
                    <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{characters.length} 个角色</span>
                  </div>
                  {/* 快速插入标签按钮 */}
                  <div className="flex gap-1.5">
                    <button onClick={() => writingEditorRef.current?.insertAtCursor('【主角】')}
                      className="flex-1 px-2 py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] hover:bg-primary/20 transition-colors font-medium">👤 主角</button>
                    <button onClick={() => writingEditorRef.current?.insertAtCursor('【反派】')}
                      className="flex-1 px-2 py-1.5 rounded-lg bg-warning-light text-warning text-[11px] hover:bg-warning/20 transition-colors font-medium">👤 反派</button>
                    <button onClick={() => writingEditorRef.current?.insertAtCursor('【配角】')}
                      className="flex-1 px-2 py-1.5 rounded-lg bg-secondary text-muted-foreground text-[11px] hover:bg-secondary/80 transition-colors font-medium">👤 配角</button>
                  </div>
                  {characters.length === 0 && !showAddChar && (
                    <div className="flex flex-col items-center py-6 text-center">
                      <User className="w-8 h-8 text-muted-foreground/30 mb-2" />
                      <p className="text-[11px] text-muted-foreground">暂无角色数据</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">点击下方按钮添加角色</p>
                    </div>
                  )}
                  {characters.map((c, i) => (
                    editingCharIdx === i ? (
                      <div key={i} className="p-3 rounded-lg bg-primary-light space-y-2">
                        <input value={c.name} onChange={e => setCharacters(prev => prev.map((x, j) => j === i ? {...x, name: e.target.value} : x))}
                          className="w-full px-2 py-1 rounded border border-border bg-background text-xs" placeholder="角色名称" />
                        <select value={c.type} onChange={e => setCharacters(prev => prev.map((x, j) => j === i ? {...x, type: e.target.value as Character['type']} : x))}
                          className="w-full px-2 py-1 rounded border border-border bg-background text-[11px] outline-none focus:border-primary">
                          <option value="主角">主角</option>
                          <option value="配角">配角</option>
                          <option value="反派">反派</option>
                          <option value="次要角色">次要角色</option>
                          <option value="客串">客串</option>
                        </select>
                        <textarea value={c.description} onChange={e => setCharacters(prev => prev.map((x, j) => j === i ? {...x, description: e.target.value} : x))}
                          placeholder="角色描述" className="w-full px-2 py-1 rounded border border-border bg-background text-[11px] resize-none h-14 outline-none focus:border-primary" />
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => setEditingCharIdx(null)} className="px-2 py-0.5 rounded text-[10px] bg-primary text-white">完成</button>
                        </div>
                      </div>
                    ) : (
                      <div key={i} className="flex items-center gap-2 group">
                        <button onClick={() => handleInsertCharacterTag(c.name)}
                          className="flex-1 text-left px-3 py-2 rounded-lg bg-secondary hover:bg-primary-light transition-colors">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="font-medium text-foreground text-xs">{c.name}</span>
                            <span className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded-full shrink-0",
                              c.type === '主角' && 'bg-primary/10 text-primary',
                              c.type === '配角' && 'bg-secondary text-muted-foreground',
                              c.type === '反派' && 'bg-warning-light text-warning',
                              c.type === '次要角色' && 'bg-secondary text-muted-foreground/60',
                              c.type === '客串' && 'bg-secondary text-muted-foreground/50',
                            )}>{c.type}</span>
                          </div>
                          {c.description ? <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{c.description}</p> : null}
                          <span className="block text-[10px] text-muted-foreground/60 mt-1">
                            出现 {(() => { if (!content) return 0; const plain = toPlainText(content); const escaped = c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); const matches = plain.match(new RegExp(escaped, 'g')); return matches ? matches.length : 0 })()} 次
                          </span>
                        </button>
                        <button onClick={() => setEditingCharIdx(i)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground text-[10px]" title="编辑">✎</button>
                        <button onClick={() => setCharacters(prev => prev.filter((_, j) => j !== i))} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive text-[10px]" title="删除"><X className="w-3 h-3" /></button>
                      </div>
                    )
                  ))}
                  {showAddChar ? (
                    <div className="p-3 rounded-lg bg-primary-light space-y-2 border border-primary/20">
                      <input value={newCharName} onChange={e => setNewCharName(e.target.value)} placeholder="角色名称"
                        className="w-full px-2 py-1 rounded border border-border bg-background text-xs outline-none focus:border-primary" autoFocus />
                      <select value={newCharType} onChange={e => setNewCharType(e.target.value as Character['type'])}
                        className="w-full px-2 py-1 rounded border border-border bg-background text-[11px] outline-none focus:border-primary">
                        <option value="主角">主角</option>
                        <option value="配角">配角</option>
                        <option value="反派">反派</option>
                        <option value="次要角色">次要角色</option>
                        <option value="客串">客串</option>
                      </select>
                      <textarea value={newCharDesc} onChange={e => setNewCharDesc(e.target.value)} placeholder="角色描述（选填）"
                        className="w-full px-2 py-1 rounded border border-border bg-background text-[11px] resize-none h-14 outline-none focus:border-primary" />
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => { setShowAddChar(false); setNewCharName(''); setNewCharType('配角'); setNewCharDesc('') }} className="px-2 py-0.5 rounded text-[10px] border border-border text-muted-foreground hover:bg-secondary">取消</button>
                        <button onClick={() => { if (newCharName.trim()) { setCharacters(prev => [...prev, { name: newCharName.trim(), type: newCharType, description: newCharDesc.trim() }]); setNewCharName(''); setNewCharType('配角'); setNewCharDesc(''); setShowAddChar(false) } }}
                          className="px-2 py-0.5 rounded text-[10px] bg-primary text-white hover:bg-primary/90">添加</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowAddChar(true)}
                      className="w-full text-center px-3 py-1.5 rounded-lg border border-dashed border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors text-[11px]">+ 添加角色</button>
                  )}
                </div>}
                {rightTab === 'idea' && <div className="text-xs text-muted-foreground space-y-4">
                  <p className="text-sm font-medium text-foreground">灵感工具</p>
                  <button onClick={() => { setShowBrainstorm(true); setRightPanelOpen(false) }} className="w-full text-left px-3 py-2 rounded-lg bg-secondary hover:bg-primary-light transition-colors"><Lightbulb className="w-3 h-3 mr-1 inline" />脑洞喷射</button>
                  <button onClick={() => { setShowInspire(true); setRightPanelOpen(false) }} className="w-full text-left px-3 py-2 rounded-lg bg-secondary hover:bg-primary-light transition-colors"><Sparkles className="w-3 h-3 mr-1" />灵感爆裂</button>
                  <button onClick={() => { setShowAlchemy(true); setRightPanelOpen(false) }} className="w-full text-left px-3 py-2 rounded-lg bg-secondary hover:bg-primary-light transition-colors"><BookMarked className="w-3 h-3 mr-1" />书名炼金术</button>
                  <p className="text-[10px] text-muted-foreground pt-4">完整工具链待第二阶段实现</p>
                </div>}
                {rightTab === 'ai' && <div className="text-xs space-y-4">
                  <div className="flex gap-1">
                    {(['continue','polish','expand'] as const).map(m => (
                      <button key={m} onClick={() => { setAiMode(m); setAiResult('') }}
                        className={cn("flex-1 py-1 px-2 rounded text-xs transition-colors", aiMode === m ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground hover:bg-primary-light')}>
                        {m === 'continue' ? '续写' : m === 'polish' ? '润色' : '扩写'}
                      </button>
                    ))}
                  </div>
                  <div className="bg-primary-light rounded-lg p-3">
                    <p className="font-medium text-primary mb-1">
                      {aiMode === 'continue' ? 'AI 续写' : aiMode === 'polish' ? 'AI 润色' : 'AI 扩写'}
                    </p>
                    <p className="text-[11px] text-muted-foreground mb-2">
                      {aiMode === 'continue' ? '自动读取前文上下文续写' : '选中文字后点击生成'}
                    </p>
                    <textarea value={aiInstruction} onChange={e => setAiInstruction(e.target.value)}
                      placeholder={aiMode === 'continue' ? '补充要求（选填）' : '选中文 → 填要求 → 点生成'}
                      className="w-full h-16 px-2 py-1 text-xs rounded border border-border bg-background resize-none outline-none focus:border-primary" />
                    <button onClick={handleAi} disabled={aiLoading}
                      className="w-full mt-2 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-50">
                      {aiLoading ? '生成中...' : aiMode === 'continue' ? <><Bot className="w-3 h-3 mr-1 inline" />续写</> : aiMode === 'polish' ? <><Sparkles className="w-3 h-3 mr-1 inline" />润色</> : <><Pencil className="w-3 h-3 mr-1 inline" />扩写</>}
                    </button>
                  </div>
                  {aiResult && (
                    <div className="bg-secondary rounded-lg p-3">
                      <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed mb-2">{aiResult}</div>
                      <div className="flex gap-2">
                        <button onClick={() => { const ed = editorRef.current; if (ed) ed.commands.insertContentAt(ed.state.doc.content.size, '\n' + aiResult); setAiResult('') }}
                          className="text-[11px] px-2 py-0.5 rounded bg-primary text-white">插入正文</button>
                        <button onClick={() => { navigator.clipboard.writeText(aiResult) }}
                          className="text-[11px] px-2 py-0.5 rounded border border-border text-muted-foreground">复制</button>
                        <button onClick={handleAi}
                          className="text-[11px] px-2 py-0.5 rounded border border-border text-muted-foreground">重新生成</button>
                      </div>
                    </div>
                  )}
                </div>}
              </div>
            </div>
          </div>
          <div className="w-14 flex flex-col items-center py-2 gap-1 border-l border-border glass-panel shrink-0">
            {([
              { key: 'plan', icon: <ClipboardCheck className="w-5 h-5" />, label: '规划' },
              { key: 'compliance', icon: null, label: '合规' },
              { key: 'outline', icon: <FileText className="w-5 h-5" />, label: '大纲' },
              { key: 'character', icon: <User className="w-5 h-5" />, label: '角色' },
              { key: 'idea', icon: <Lightbulb className="w-5 h-5" />, label: '灵感' },
              { key: 'ai', icon: <Bot className="w-5 h-5" />, label: 'AI' },
            ] as const).map(({ key, icon, label }) => (
              <button key={key} onClick={() => { const t = rightTab === key ? '' : key; setRightTab(t); setRightPanelOpen(!!t) }}
                className={cn("w-10 h-10 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all", rightTab === key ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-secondary')} title={label}>
                {key === 'compliance' ? (() => { const c = checkCompliance(toPlainText(content)).blockedItems.length; return c > 0 ? <span className="w-4 h-4 rounded-full bg-warning text-white text-[9px] flex items-center justify-center font-bold">{c}</span> : <Search className="w-5 h-5" /> })() : icon}
                <span className="text-[9px] leading-none">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== 新建卷弹窗 ===== */}
      {showVolumeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay backdrop-blur-sm" onClick={() => setShowVolumeModal(false)}>
          <div className="bg-white rounded-[20px] shadow-modal w-[360px] p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold mb-4">新建卷</h3>
            <input type="text" value={volumeName} onChange={e => setVolumeName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && volumeName.trim()) { createVolume(projectId, volumeName.trim()); setVolumes(getVolumes(projectId)); setShowVolumeModal(false); setVolumeName('') } }}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm mb-4" autoFocus />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowVolumeModal(false)}>取消</Button>
              <Button size="sm" onClick={() => { if (volumeName.trim()) { createVolume(projectId, volumeName.trim()); setVolumes(getVolumes(projectId)); setShowVolumeModal(false); setVolumeName('') } }}>创建</Button>
            </div>
          </div>
        </div>
      )}

      <TrashModal show={showTrash} onClose={() => setShowTrash(false)} trashChapters={trashChapters} selectedTrashId={selectedTrashId} onSelect={setSelectedTrashId} onRestore={(id) => { restoreChapter(id); setChapters(getChapters(projectId)); setTrashChapters(getTrash()); setSelectedTrashId(null) }} onDelete={(id) => { permanentDeleteChapter(id); setTrashChapters(getTrash()); setSelectedTrashId(null) }} />

      <ReportModal show={showReport} onClose={() => setShowReport(false)} content={content} onSave={handleSave} />

      <BrainstormModal show={showBrainstorm} onClose={() => setShowBrainstorm(false)} bsGenre={bsGenre} onGenreChange={setBsGenre} onGenerate={handleBrainstorm} bsLoading={bsLoading} bsResult={bsResult} />

      {/* 灵感爆裂弹窗 */}
      {showInspire && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay backdrop-blur-sm" onClick={() => setShowInspire(false)}>
          <div className="bg-white rounded-[20px] shadow-modal w-[600px] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b"><h2 className="font-semibold"><Sparkles className="w-3 h-3 mr-1" />灵感爆裂</h2><button onClick={() => setShowInspire(false)} className="text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button></div>
            <div className="flex items-center gap-3 px-6 py-3 border-b">
              <span className="text-sm text-muted-foreground">题材:</span>
              {['都市','悬疑','玄幻','言情','科幻'].map(g => (
                <button key={g} onClick={() => setInspireGenre(g)} className={cn("px-3 py-1 rounded-full text-xs", inspireGenre === g ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground hover:bg-primary-light')}>{g}</button>
              ))}
              <span className="flex-1" />
              <button onClick={handleInspire} disabled={inspireLoading} className="px-4 py-1.5 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 disabled:opacity-50">{inspireLoading ? <>爆破中...</> : <><Zap className="w-3 h-3 mr-1 inline" />爆破</>}</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {inspireResult ? <pre className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed font-mono">{inspireResult}</pre> : <div className="text-center py-10 text-muted-foreground text-sm">选择题材，点击「爆破」获取灵感火花</div>}
            </div>
          </div>
        </div>
      )}

      {/* 书名炼金术弹窗 */}
      {showAlchemy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay backdrop-blur-sm" onClick={() => setShowAlchemy(false)}>
          <div className="bg-white rounded-[20px] shadow-modal w-[600px] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b"><h2 className="font-semibold"><BookMarked className="w-3 h-3 mr-1" />书名炼金术</h2><button onClick={() => setShowAlchemy(false)} className="text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button></div>
            <div className="flex items-center gap-3 px-6 py-3 border-b">
              <span className="text-sm text-muted-foreground">全题材智能炼金</span>
              <span className="flex-1" />
              <button onClick={handleAlchemy} disabled={alchemyLoading} className="px-4 py-1.5 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 disabled:opacity-50">{alchemyLoading ? <>炼金中...</> : <><BookMarked className="w-3 h-3 mr-1 inline" />炼金</>}</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {alchemyResult ? <pre className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed font-mono">{alchemyResult}</pre> : <div className="text-center py-10 text-muted-foreground text-sm">点击「炼金」生成书名创意</div>}
            </div>
          </div>
        </div>
      )}

      {/* ===== 新手引导 Overlay ===== */}
      {onboardingStep >= 0 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => { setOnboardingStep(-1); localStorage.setItem('mojing_onboarded', 'true') }}>
          <div className="bg-white rounded-[20px] shadow-modal max-w-md mx-4 p-8 text-center" onClick={e => e.stopPropagation()}>
            {/* 步骤指示器 */}
            <div className="flex justify-center gap-2 mb-6">
              {[0,1,2].map(i => (
                <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === onboardingStep ? 'w-8 bg-[#6B8C6E]' : 'w-2 bg-gray-200'}`} />
              ))}
            </div>
            {/* 步骤内容 */}
            {onboardingStep === 0 && (
              <div className="space-y-2">
                <h3 className="text-xl font-bold">欢迎来到墨境！</h3>
                <p className="text-sm text-gray-500 leading-relaxed">左侧是你的章节列表，在这里管理你的作品结构。</p>
              </div>
            )}
            {onboardingStep === 1 && (
              <div className="space-y-2">
                <h3 className="text-xl font-bold">创作中心</h3>
                <p className="text-sm text-gray-500 leading-relaxed">中间是编辑区域，在这里创作你的故事。支持富文本格式、字数统计和合规检测。</p>
              </div>
            )}
            {onboardingStep === 2 && (
              <div className="space-y-2">
                <h3 className="text-xl font-bold">AI 工具箱</h3>
                <p className="text-sm text-gray-500 leading-relaxed">右侧是AI工具箱——续写、润色、脑洞喷射，让你的创作如虎添翼。</p>
              </div>
            )}
            {/* 按钮组 */}
            <div className="flex gap-3 justify-center mt-8">
              <button onClick={() => { setOnboardingStep(-1); localStorage.setItem('mojing_onboarded', 'true') }}
                className="px-5 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-600 transition-colors">跳过</button>
              <button onClick={() => {
                if (onboardingStep < 2) {
                  setOnboardingStep(s => s + 1)
                } else {
                  setOnboardingStep(-1)
                  localStorage.setItem('mojing_onboarded', 'true')
                }
              }}
                className="px-5 py-2 rounded-lg text-sm bg-[#6B8C6E] text-white hover:bg-[#5a7a5e] transition-colors">
                {onboardingStep === 2 ? '开始写作' : '下一步'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== TXT 导入预览弹窗 ===== */}
      {importDlg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay backdrop-blur-sm" onClick={() => setImportDlg(false)}>
          <div className="bg-white rounded-[20px] shadow-modal w-[600px] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <input className="font-semibold bg-transparent border-0 border-b border-dashed border-gray-300 focus:outline-none focus:border-primary flex-1" value={importFn} onChange={e => setImportFn(e.target.value)} />
              <button onClick={() => setImportDlg(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center gap-2 px-6 py-3 border-b shrink-0">
              <span className="text-xs text-muted-foreground">拆分方式:</span>
              <select className="text-xs px-2 py-1 rounded bg-secondary border-border" value={importMode} onChange={e => handleModeChange(e.target.value as 'auto'|'chapter'|'h1'|'h2'|'h3')}>
                <option value="auto">自动</option>
                <option value="chapter">按章节</option>
                <option value="h1">按 #</option>
                <option value="h2">按 ##</option>
                <option value="h3">按 ###</option>
              </select>
              <span className="flex-1" />
              <span className="text-xs text-muted-foreground">共 {importParts.length} 个章节</span>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              {importParts.map((part, i) => (
                <div key={i} className="border border-border rounded-lg p-3 hover:bg-secondary/50 transition-colors">
                  <input className="text-sm font-medium mb-1 w-full bg-transparent border-0 border-b border-dashed border-gray-300 focus:outline-none focus:border-primary" value={importTitleOverrides[i] || `章节 ${i + 1}`} onChange={e => { const n = [...importTitleOverrides]; n[i] = e.target.value; setImportTitleOverrides(n) }} />
                  <div className="text-xs text-muted-foreground line-clamp-2">{part.c.substring(0, 120)}{part.c.length > 120 ? '...' : ''}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t shrink-0">
              <Button variant="outline" size="sm" onClick={() => setImportDlg(false)}>取消</Button>
              <Button size="sm" onClick={confirmImport} className="bg-success hover:bg-success/90 text-white">导入 {importParts.length} 个章节</Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 快捷键面板 ===== */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay backdrop-blur-sm" onClick={() => setShowShortcuts(false)}>
          <div className="bg-white rounded-[20px] shadow-modal w-[400px] p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold"><Keyboard className="w-4 h-4 mr-1 inline" />快捷键</h3>
              <button onClick={() => setShowShortcuts(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-1 text-sm">
              {[
                ['Ctrl + S', '保存'],
                ['Ctrl + Z', '撤销'],
                ['Ctrl + Shift + Z', '重做'],
                ['Ctrl + B', '加粗'],
                ['Ctrl + I', '斜体'],
                ['Ctrl + U', '下划线'],
                ['Ctrl + K', '插入链接'],
                ['Ctrl + Shift + X', '删除线'],
                ['Ctrl + Shift + >', '放大字号'],
                ['Ctrl + Shift + <', '缩小字号'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-secondary transition-colors">
                  <span className="text-muted-foreground text-xs">{desc}</span>
                  <kbd className="px-2 py-0.5 rounded bg-secondary text-xs font-mono text-foreground border border-border">{key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== 底部工作流 ===== */}
      <WorkflowBar
        currentStage={workflowStage}
        onStageChange={setWorkflowStage}
        wordCount={bodyDensity > 0 ? parseInt(content.replace(/\s/g,'').length.toString()) || 2400 : 2400}
        bodyDensity={bodyDensity}
      />

      {/* ===== 合规面板 ===== */}
      <CompliancePanel editorContent={content} open={true} onToggle={() => {}} />
    </div>
  )
}
