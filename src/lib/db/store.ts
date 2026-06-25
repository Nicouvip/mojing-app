import type { Project, Chapter } from '@/lib/db/types'
import { eq } from 'drizzle-orm'
import { db } from './db'
import { projects, chapters } from './schema'
import { isSupabaseAvailable, supabase } from '@/lib/db/supabase-client'
import readingTime from 'reading-time'

// Memory cache for SSR + hydration
let memProjects: Project[] = [
  { id: 'demo-1', name: '未命名作品', genre: '都市', description: '',
    createdAt: Date.now(), updatedAt: Date.now(), chapterCount: 1, totalWords: 0 },
]
let memChapters: Chapter[] = [
  { id: 'ch-demo-1', projectId: 'demo-1', title: '第一章', content: '',
    order: 1, wordCount: 0, createdAt: Date.now(), updatedAt: Date.now(), status: 'draft' },
]
let loadedFromSupabase = false

function isClient(): boolean { return typeof window !== 'undefined' }

// Load from Supabase, fall back to localStorage
function loadClient<T>(key: string, fallback: T): T {
  try {
    const d = localStorage.getItem('mojing_' + key)
    return d ? JSON.parse(d) as T : fallback
  } catch { return fallback }
}

function saveClient<T>(key: string, data: T) {
  try { localStorage.setItem('mojing_' + key, JSON.stringify(data)) } catch {}
}

async function loadFromSupabase() {
  if (!isSupabaseAvailable() || loadedFromSupabase) return
  try {
    const { data: projects } = await supabase!.from('projects').select('*')
    if (projects && projects.length > 0) memProjects = projects as Project[]
    const { data: chapters } = await supabase!.from('chapters').select('*')
    if (chapters && chapters.length > 0) memChapters = chapters as Chapter[]
    loadedFromSupabase = true
  } catch (err) {
    console.warn('[store] loadFromSupabase 失败：需要配置 SUPABASE 凭据（NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY）', err)
  }
}

async function syncToSupabase() {
  if (!isSupabaseAvailable()) return
  try {
    await supabase!.from('projects').upsert(memProjects)
    await supabase!.from('chapters').upsert(memChapters)
  } catch (err) {
    console.warn('[store] syncToSupabase 失败：需要配置 SUPABASE 凭据', err)
  }
}

function getProjectsAll(includeDeleted = false): Project[] {
  let list: Project[]
  if (isClient()) list = loadClient('projects', memProjects)
  else list = memProjects
  if (!includeDeleted) list = list.filter(p => !p.deletedAt)
  return list
}
function setProjectsAll(p: Project[]) {
  memProjects = p
  if (isClient()) saveClient('projects', p)
  syncToSupabase()
}

function getChaptersAll(includeDeleted = false): Chapter[] {
  let list: Chapter[]
  if (isClient()) list = loadClient('chapters', memChapters)
  else list = memChapters
  if (!includeDeleted) list = list.filter(c => !c.deletedAt)
  return list
}
function setChaptersAll(c: Chapter[]) {
  memChapters = c
  if (isClient()) saveClient('chapters', c)
  syncToSupabase()
}

export function getProjects(): Project[] {
  try {
    return db.select().from(projects).all() as Project[]
  } catch {
    return [...getProjectsAll()]
  }
}

/** 获取已软删除的项目（含章节） */
export function getDeletedProjects(): Project[] {
  if (isClient()) return loadClient('projects', memProjects).filter((p: Project) => p.deletedAt)
  return memProjects.filter(p => p.deletedAt)
}

export function getProject(id: string): Project | undefined {
  return getProjectsAll().find(p => p.id === id)
}

export function createProject(name: string, genre: string): Project {
  const p: Project = { id: `proj-${Date.now()}`, name, genre, description: '',
    createdAt: Date.now(), updatedAt: Date.now(), chapterCount: 1, totalWords: 0 }
  try {
    db.insert(projects).values({ title: name }).run()
    const chaptersList = getChaptersAll(true)
    chaptersList.push({ id: `ch-${Date.now()}`, projectId: p.id, title: '第一章', content: '',
      order: 1, wordCount: 0, createdAt: Date.now(), updatedAt: Date.now(), status: 'draft' })
    setChaptersAll(chaptersList)
    return p
  } catch {
    // localStorage fallback
    const projectsList = getProjectsAll(true)
    projectsList.push(p)
    setProjectsAll(projectsList)
    const chaptersList = getChaptersAll(true)
    chaptersList.push({ id: `ch-${Date.now()}`, projectId: p.id, title: '第一章', content: '',
      order: 1, wordCount: 0, createdAt: Date.now(), updatedAt: Date.now(), status: 'draft' })
    setChaptersAll(chaptersList)
    return p
  }
}

export function deleteProject(id: string): void {
  const projectsList = getProjectsAll(true)
  const p = projectsList.find(pr => pr.id === id)
  if (!p) return
  p.deletedAt = Date.now()
  try {
    db.update(projects).set({ deletedAt: String(Date.now()) }).where(eq(projects.id, Number(id))).run()
  } catch {}
  setProjectsAll(projectsList)
  const chaptersList = getChaptersAll(true)
  chaptersList.filter(c => c.projectId === id).forEach(c => { c.deletedAt = Date.now() })
  try {
    db.update(chapters).set({ deletedAt: String(Date.now()) }).where(eq(chapters.projectId, Number(id))).run()
  } catch {}
  setChaptersAll(chaptersList)
}

/** 彻底删除项目（含所有章节） */
export function permanentDeleteProject(id: string): void {
  setProjectsAll(getProjectsAll(true).filter(p => p.id !== id))
  setChaptersAll(getChaptersAll(true).filter(c => c.projectId !== id))
}

/** 恢复软删除的项目 */
export function restoreProject(id: string): void {
  const projects = getProjectsAll(true)
  const p = projects.find(pr => pr.id === id)
  if (!p) return
  delete p.deletedAt
  setProjectsAll(projects)
  const chapters = getChaptersAll(true)
  chapters.filter(c => c.projectId === id).forEach(c => { delete c.deletedAt })
  setChaptersAll(chapters)
}

export function updateProject(id: string, data: Partial<Pick<Project, 'name' | 'genre' | 'description'>>): Project | undefined {
  const projectsList = getProjectsAll(true)
  const p = projectsList.find(pr => pr.id === id)
  if (!p) return undefined
  if (data.name !== undefined) p.name = data.name
  if (data.genre !== undefined) p.genre = data.genre
  if (data.description !== undefined) p.description = data.description
  p.updatedAt = Date.now()
  try {
    const setFields: Record<string, string | number> = { updatedAt: String(Date.now()) }
    if (data.name !== undefined) setFields.title = data.name
    db.update(projects).set(setFields).where(eq(projects.id, Number(id))).run()
  } catch {}
  setProjectsAll(projectsList)
  return p
}

export function createChapter(projectId: string, title: string): Chapter | undefined {
  const proj = getProjectsAll().find(p => p.id === projectId)
  if (!proj) return undefined
  const allCh = getChaptersAll(true)
  const ch: Chapter = {
    id: `ch-${Date.now()}`, projectId, title, content: '',
    order: allCh.filter(c => c.projectId === projectId).length + 1,
    wordCount: 0, createdAt: Date.now(), updatedAt: Date.now(), status: 'draft',
  }
  allCh.push(ch)
  try {
    db.insert(chapters).values({
      title,
      projectId: Number(projectId),
      order: ch.order,
    }).run()
  } catch {}
  setChaptersAll(allCh)
  proj.chapterCount = allCh.filter(c => c.projectId === projectId).length
  setProjectsAll(getProjectsAll())
  return ch
}

export function deleteChapter(id: string): void {
  const chapters = getChaptersAll(true)
  const ch = chapters.find(c => c.id === id)
  if (!ch) return
  ch.deletedAt = Date.now()
  setChaptersAll(chapters)
  const proj = getProjectsAll(true).find(p => p.id === ch.projectId)
  if (proj) {
    proj.chapterCount = chapters.filter(c => c.projectId === ch.projectId && !c.deletedAt).length
    setProjectsAll(getProjectsAll(true))
  }
}

export function getTrash(): Chapter[] {
  if (typeof window === 'undefined') return []
  return getChaptersAll(true).filter(c => c.deletedAt)
}
function saveTrash(t: Chapter[]) {
  // 不再使用独立 trash 存储，deletedAt 已内联到 chapters
}

export function restoreChapter(id: string): void {
  const chapters = getChaptersAll(true)
  const ch = chapters.find(c => c.id === id)
  if (!ch) return
  delete ch.deletedAt
  ch.status = 'draft'
  setChaptersAll(chapters)
  const proj = getProjectsAll(true).find(p => p.id === ch.projectId)
  if (proj) {
    proj.chapterCount = chapters.filter(c => c.projectId === ch.projectId && !c.deletedAt).length
    setProjectsAll(getProjectsAll(true))
  }
}

export function permanentDeleteChapter(id: string): void {
  setChaptersAll(getChaptersAll(true).filter(c => c.id !== id))
}

export function getChapter(id: string): Chapter | undefined {
  return getChaptersAll().find(c => c.id === id)
}

export function getChapters(projectId: string): Chapter[] {
  return getChaptersAll().filter(c => c.projectId === projectId).sort((a, b) => a.order - b.order)
}

export function updateChapterContent(id: string, content: string): Chapter | undefined {
  const chaptersList = getChaptersAll()
  const ch = chaptersList.find(c => c.id === id)
  if (!ch) return undefined
  ch.content = content
  const plain = content.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/g, ' ')
  ch.wordCount = readingTime(plain).words
  ch.updatedAt = Date.now()
  try {
    db.update(chapters).set({
      content,
      wordCount: ch.wordCount,
      updatedAt: String(Date.now()),
    }).where(eq(chapters.id, Number(id))).run()
  } catch {}
  setChaptersAll(chaptersList)
  const projects = getProjectsAll()
  const proj = projects.find(p => p.id === ch.projectId)
  if (proj) {
    proj.totalWords = chaptersList.filter(c => c.projectId === ch.projectId).reduce((s, c) => s + c.wordCount, 0)
    proj.updatedAt = Date.now()
    setProjectsAll(projects)
  }
  return ch
}

// ── 7天自动清理软删除数据 ──────────────────────────────
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

/** 永久清除超过7天的软删除数据 */
export function purgeExpiredDeletes(): void {
  const now = Date.now()
  const projects = getProjectsAll(true)
  const chapters = getChaptersAll(true)

  const expiredProjectIds = new Set(
    projects.filter(p => p.deletedAt && (now - p.deletedAt) >= SEVEN_DAYS_MS).map(p => p.id)
  )
  const remainingProjects = projects.filter(p => !expiredProjectIds.has(p.id))
  setProjectsAll(remainingProjects)

  const remainingChapters = chapters.filter(c => {
    if (c.deletedAt && (now - c.deletedAt) >= SEVEN_DAYS_MS) return false
    if (expiredProjectIds.has(c.projectId)) return false
    return true
  })
  setChaptersAll(remainingChapters)
}

let cleanupTimer: ReturnType<typeof setInterval> | null = null

/** 启动7天清理定时器（每小时检查一次） */
export function startCleanupTimer(): void {
  if (cleanupTimer || typeof window === 'undefined') return
  cleanupTimer = setInterval(() => {
    purgeExpiredDeletes()
  }, 60 * 60 * 1000) // 1 小时
  // 启动后立即执行一次
  purgeExpiredDeletes()
}

/** 停止清理定时器 */
export function stopCleanupTimer(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer)
    cleanupTimer = null
  }
}

// 客户端自动启动
if (typeof window !== 'undefined') {
  startCleanupTimer()
}
