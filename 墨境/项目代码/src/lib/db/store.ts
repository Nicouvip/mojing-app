import type { Project, Chapter, Volume, CharacterProfile, WorldSetting, Outline, Foreshadow, CoolingState, WritingPlan } from '@/lib/db/types'
import { isSupabaseAvailable, supabase } from '@/lib/db/supabase-client'
import {
  tursoGetProjects, tursoGetChapters, tursoGetVolumes,
  tursoGetCharacterProfiles, tursoGetWorldSettings, tursoGetOutlines, tursoGetForeshadows,
  tursoSaveProject, tursoSaveChapter, tursoSaveVolume,
  tursoSaveCharacterProfile, tursoSaveWorldSetting, tursoSaveForeshadow,
  tursoSaveCoolingState, tursoSaveWritingPlan,
  tursoUpsertOutline, tursoDeleteCharacterProfile,
  tursoDeleteOutline, tursoDeleteWorldSetting, tursoDeleteForeshadow,
} from '@/lib/db/turso-store'
import readingTime from 'reading-time'

// Memory cache for SSR + hydration
let memProjects: Project[] = []
let memChapters: Chapter[] = []
let loadedFromSupabase = false
let loadedFromTurso = false

/** 判断 Turso 是否可用 */
function isTursoAvailable(): boolean {
  const url = process.env.TURSO_DATABASE_URL
  const token = process.env.TURSO_AUTH_TOKEN
  return !!url && !!token && url.length > 10 && token.length > 10
}
/** 当前用户 ID（由客户端在初始化时设置） */
let currentUserId: string | undefined

function isClient(): boolean { return typeof window !== 'undefined' }

/**
 * 设置当前用户 ID，供 syncToSupabase 做行级隔离
 * 由 AuthProvider 或客户端初始化时调用
 */
export function setCurrentUserId(id: string | undefined) {
  currentUserId = id
}

/** 获取当前用户 ID */
export function getCurrentUserId(): string | undefined {
  // 服务端尝试从 NextAuth session 获取
  if (!isClient()) {
    // 服务端环境下跳过（syncToSupabase 主要在客户端触发）
    return currentUserId
  }
  // 客户端从 localStorage 读取
  if (!currentUserId && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('mojing_auth')
      if (stored) {
        const parsed = JSON.parse(stored)
        currentUserId = parsed.user?.id
      }
    } catch {}
  }
  return currentUserId
}

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

async function loadFromTurso() {
  if (!isTursoAvailable() || loadedFromTurso) return
  try {
    const projects = await tursoGetProjects()
    if (projects.length > 0) {
      memProjects = projects
      if (isClient()) saveClient('projects', projects)
    }
    // 加载所有项目的章节
    const allChapters: Chapter[] = []
    const allVolumes: Volume[] = []
    const allCharProfiles: CharacterProfile[] = []
    const allWorldSettings: WorldSetting[] = []
    const allOutlines: Outline[] = []
    const allForeshadows: Foreshadow[] = []
    for (const proj of (projects.length > 0 ? projects : memProjects)) {
      const [chapters, volumes, chars, ws, outlines, foreshadows] = await Promise.all([
        tursoGetChapters(proj.id),
        tursoGetVolumes(proj.id),
        tursoGetCharacterProfiles(proj.id),
        tursoGetWorldSettings(proj.id),
        tursoGetOutlines(proj.id),
        tursoGetForeshadows(proj.id),
      ])
      allChapters.push(...chapters)
      allVolumes.push(...volumes)
      allCharProfiles.push(...chars)
      allWorldSettings.push(...ws)
      allOutlines.push(...outlines)
      allForeshadows.push(...foreshadows)
    }
    if (allChapters.length > 0) {
      memChapters = allChapters
      if (isClient()) saveClient('chapters', allChapters)
    }
    if (allVolumes.length > 0) {
      memVolumes = allVolumes
      if (isClient()) saveClient('volumes', allVolumes)
    }
    if (allCharProfiles.length > 0 && isClient()) saveClient('character_profiles', allCharProfiles)
    if (allWorldSettings.length > 0 && isClient()) saveClient('world_settings', allWorldSettings)
    if (allOutlines.length > 0 && isClient()) saveClient('outlines', allOutlines)
    if (allForeshadows.length > 0 && isClient()) saveClient('foreshadows', allForeshadows)
    loadedFromTurso = true
  } catch (err) {
    console.warn('[store] loadFromTurso 失败：', err)
  }
}

async function loadFromSupabase() {
  if (!isSupabaseAvailable() || loadedFromSupabase) return
  try {
    const uid = getCurrentUserId()
    let projectsQuery = supabase!.from('projects').select('*')
    let chaptersQuery = supabase!.from('chapters').select('*')
    if (uid) {
      projectsQuery = projectsQuery.eq('userId', uid)
      chaptersQuery = chaptersQuery.eq('userId', uid)
    }
    const { data: projects } = await projectsQuery
    if (projects && projects.length > 0) memProjects = projects as Project[]
    const { data: chapters } = await chaptersQuery
    if (chapters && chapters.length > 0) memChapters = chapters as Chapter[]
    loadedFromSupabase = true
  } catch (err) {
    console.warn('[store] loadFromSupabase 失败：需要配置 SUPABASE 凭据（NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY）', err)
  }
}

async function syncToSupabase() {
  if (!isSupabaseAvailable()) return
  try {
    const uid = getCurrentUserId()

    // 按用户 ID 过滤后再同步，避免跨用户数据覆盖
    const userProjects = uid
      ? memProjects.filter(p => !p.userId || p.userId === uid)
      : memProjects
    const userChapters = uid
      ? memChapters.filter(c => !c.userId || c.userId === uid)
      : memChapters

    if (userProjects.length > 0) {
      await supabase!.from('projects').upsert(
        uid ? userProjects.map(p => ({ ...p, userId: uid })) : userProjects
      )
    }
    if (userChapters.length > 0) {
      await supabase!.from('chapters').upsert(
        uid ? userChapters.map(c => ({ ...c, userId: uid })) : userChapters
      )
    }
  } catch (err) {
    console.warn('[store] syncToSupabase 失败：需要配置 SUPABASE 凭据', err)
  }
}

/** 将内存数据增量同步到 Turso */
async function syncToTurso() {
  if (!isTursoAvailable()) return
  try {
    const uid = getCurrentUserId()
    const userProjects = uid
      ? memProjects.filter(p => !p.userId || p.userId === uid)
      : memProjects
    const userChapters = uid
      ? memChapters.filter(c => !c.userId || c.userId === uid)
      : memChapters

    // 同步核心实体
    await Promise.all([
      ...userProjects.map(p => tursoSaveProject(p).catch(() => {})),
      ...userChapters.map(c => tursoSaveChapter(c).catch(() => {})),
      ...memVolumes.map(v => tursoSaveVolume(v).catch(() => {})),
    ])

    // 同步 localStorage 实体
    if (isClient()) {
      const charProfiles = loadClient<CharacterProfile[]>('character_profiles', [])
      const worldSettings = loadClient<WorldSetting[]>('world_settings', [])
      const outlines = loadClient<Outline[]>('outlines', [])
      const foreshadows = loadClient<Foreshadow[]>('foreshadows', [])

      await Promise.all([
        ...charProfiles.map(p => tursoSaveCharacterProfile(p).catch(() => {})),
        ...worldSettings.map(ws => tursoSaveWorldSetting(ws).catch(() => {})),
        ...outlines.map(o => tursoUpsertOutline(o).catch(() => {})),
        ...foreshadows.map(f => tursoSaveForeshadow(f).catch(() => {})),
      ])
    }
  } catch (err) {
    console.warn('[store] syncToTurso 失败：', err)
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
  syncToTurso()
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
  syncToTurso()
}

export function getProjects(): Project[] {
  return [...getProjectsAll()]
}

/** 获取已软删除的项目（含章节） */
export function getDeletedProjects(): Project[] {
  if (isClient()) return loadClient('projects', memProjects).filter((p: Project) => p.deletedAt)
  return memProjects.filter(p => p.deletedAt)
}

export function getProject(id: string): Project | undefined {
  return getProjectsAll().find(p => p.id === id)
}

export function createProject(name: string, genre: string, options?: {
  audience?: string
  perspective?: string
  length?: string
  idea?: string
}): Project {
  const projects = getProjectsAll(true)
  const desc = [
    options?.audience ? `目标读者：${options.audience}` : '',
    options?.perspective ? `视角：${options.perspective}` : '',
    options?.length ? `篇幅：${options.length}` : '',
    options?.idea ? `创意：${options.idea}` : '',
  ].filter(Boolean).join(' | ')
  const p: Project = { id: `proj-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, name, genre, description: desc,
    createdAt: Date.now(), updatedAt: Date.now(), chapterCount: 1, totalWords: 0 }
  projects.push(p)
  setProjectsAll(projects)
  // 创建默认卷
  const defaultVol = createVolume(p.id, '第一卷')
  const chapters = getChaptersAll(true)
  chapters.push({ id: `ch-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, projectId: p.id, title: '第一章', content: '',
    order: 1, wordCount: 0, createdAt: Date.now(), updatedAt: Date.now(), status: 'draft',
    volumeId: defaultVol.id })
  setChaptersAll(chapters)
  return p
}

export function deleteProject(id: string): void {
  const projects = getProjectsAll(true)
  const p = projects.find(pr => pr.id === id)
  if (!p) return
  p.deletedAt = Date.now()
  setProjectsAll(projects)
  // 软删除关联章节
  const chapters = getChaptersAll(true)
  chapters.filter(c => c.projectId === id).forEach(c => { c.deletedAt = Date.now() })
  setChaptersAll(chapters)
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

export function createChapter(projectId: string, title: string, volumeId?: string): Chapter | undefined {
  const proj = getProjectsAll().find(p => p.id === projectId)
  if (!proj) return undefined
  const chapters = getChaptersAll(true)
  // 默认归入第一个卷
  const targetVolumeId = volumeId || ensureDefaultVolume(projectId).id
  const ch: Chapter = {
    id: `ch-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, projectId, title, content: '',
    order: chapters.filter(c => c.projectId === projectId).length + 1,
    wordCount: 0, createdAt: Date.now(), updatedAt: Date.now(), status: 'draft',
    volumeId: targetVolumeId,
  }
  chapters.push(ch)
  setChaptersAll(chapters)
  proj.chapterCount = chapters.filter(c => c.projectId === projectId).length
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

export function getChapters(projectId: string): Chapter[] {
  return getChaptersAll().filter(c => c.projectId === projectId).sort((a, b) => a.order - b.order)
}

export function getChapter(id: string): Chapter | undefined {
  return getChaptersAll().find(c => c.id === id)
}

export function updateChapterContent(id: string, content: string): Chapter | undefined {
  const chapters = getChaptersAll()
  const ch = chapters.find(c => c.id === id)
  if (!ch) return undefined
  ch.content = content
  const plain = content.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/g, ' ')
  ch.wordCount = readingTime(plain).words
  ch.updatedAt = Date.now()
  setChaptersAll(chapters)
  const projects = getProjectsAll()
  const proj = projects.find(p => p.id === ch.projectId)
  if (proj) {
    proj.totalWords = chapters.filter(c => c.projectId === ch.projectId).reduce((s, c) => s + c.wordCount, 0)
    proj.updatedAt = Date.now()
    setProjectsAll(projects)
  }
  return ch
}

// ── 卷管理 ──────────────────────────────────────────
let memVolumes: Volume[] = []

function getVolumesAll(): Volume[] {
  if (isClient()) return loadClient('volumes', memVolumes)
  return memVolumes
}
function setVolumesAll(v: Volume[]) {
  memVolumes = v
  if (isClient()) saveClient('volumes', v)
  syncToSupabase()
  syncToTurso()
}

/** 按 order 排序返回项目的卷列表 */
export function getVolumes(projectId: string): Volume[] {
  return getVolumesAll().filter(v => v.projectId === projectId).sort((a, b) => a.order - b.order)
}

/** 创建新卷 */
export function createVolume(projectId: string, name: string): Volume {
  const volumes = getVolumesAll()
  const maxOrder = volumes.filter(v => v.projectId === projectId).reduce((max, v) => Math.max(max, v.order), 0)
  const vol: Volume = {
    id: `vol-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    projectId,
    name: name.trim() || '未命名卷',
    order: maxOrder + 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  volumes.push(vol)
  setVolumesAll(volumes)
  return vol
}

/** 重命名卷，name 为空则恢复原名 */
export function renameVolume(volumeId: string, name: string): void {
  const volumes = getVolumesAll()
  const vol = volumes.find(v => v.id === volumeId)
  if (!vol) return
  const trimmed = name.trim()
  if (trimmed) vol.name = trimmed
  vol.updatedAt = Date.now()
  setVolumesAll(volumes)
}

/** 删除卷。非空卷不会拒绝，而是将章节移入未分类（volumeId 置空）并返回章节数 */
export function deleteVolume(volumeId: string): { chaptersCount: number } {
  const volumes = getVolumesAll()
  const chapters = getChaptersAll()
  const volChapters = chapters.filter(c => c.volumeId === volumeId && !c.deletedAt)
  const count = volChapters.length
  if (count > 0) {
    volChapters.forEach(c => { c.volumeId = '' })
    setChaptersAll(chapters)
  }
  setVolumesAll(volumes.filter(v => v.id !== volumeId))
  return { chaptersCount: count }
}

/** 确保项目至少有 1 个默认卷，返回第一个卷 */
export function ensureDefaultVolume(projectId: string): Volume {
  const vols = getVolumes(projectId)
  if (vols.length === 0) {
    return createVolume(projectId, '第一卷')
  }
  return vols[0]
}

// ── 30天自动清理软删除数据 ──────────────────────────────
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

/** 永久清除超过30天的软删除数据 */
export function purgeExpiredDeletes(): void {
  const now = Date.now()
  const projects = getProjectsAll(true)
  const chapters = getChaptersAll(true)

  const expiredProjectIds = new Set(
    projects.filter(p => p.deletedAt && (now - p.deletedAt) >= THIRTY_DAYS_MS).map(p => p.id)
  )
  const remainingProjects = projects.filter(p => !expiredProjectIds.has(p.id))
  setProjectsAll(remainingProjects)

  const remainingChapters = chapters.filter(c => {
    if (c.deletedAt && (now - c.deletedAt) >= THIRTY_DAYS_MS) return false
    if (expiredProjectIds.has(c.projectId)) return false
    return true
  })
  setChaptersAll(remainingChapters)
}

/** 清理超过30天的已删除章节（回收站过期清理） */
export function cleanExpiredChapters(): void {
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
  const now = Date.now()
  const chapters = getChaptersAll(true)
  const cleaned = chapters.filter(ch => {
    if (!ch.deletedAt) return true
    return (now - ch.deletedAt) < THIRTY_DAYS_MS
  })
  setChaptersAll(cleaned)
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

// ═══════════════════════════════════════════
// P1 新增：写作引擎 CRUD 函数
// 跟随现有模式：localStorage + Supabase sync
// ═══════════════════════════════════════════

// ── 角色档案 ──

export function getCharacterProfiles(projectId: string): CharacterProfile[] {
  if (!isClient()) return []
  const all = loadClient<CharacterProfile[]>('character_profiles', [])
  return all.filter(c => c.projectId === projectId)
}

export function getCharacterProfile(id: string): CharacterProfile | undefined {
  if (!isClient()) return undefined
  const all = loadClient<CharacterProfile[]>('character_profiles', [])
  return all.find(c => c.id === id)
}

export function createCharacterProfile(input: Omit<CharacterProfile, 'id' | 'createdAt' | 'updatedAt' | 'growthHistory'>): CharacterProfile {
  const all = isClient() ? loadClient<CharacterProfile[]>('character_profiles', []) : []
  const profile: CharacterProfile = {
    ...input,
    id: `char-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    growthHistory: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  all.push(profile)
  if (isClient()) saveClient('character_profiles', all)
  // Turso 同步
  if (isTursoAvailable()) { tursoSaveCharacterProfile(profile).catch(() => {}) }
  return profile
}

export function updateCharacterProfile(id: string, patch: Partial<CharacterProfile>): CharacterProfile | undefined {
  if (!isClient()) return undefined
  const all = loadClient<CharacterProfile[]>('character_profiles', [])
  const idx = all.findIndex(c => c.id === id)
  if (idx < 0) return undefined
  all[idx] = { ...all[idx], ...patch, updatedAt: Date.now() }
  saveClient('character_profiles', all)
  // Turso 同步
  if (isTursoAvailable()) { tursoSaveCharacterProfile(all[idx]).catch(() => {}) }
  return all[idx]
}

export function deleteCharacterProfile(id: string): void {
  if (!isClient()) return
  const all = loadClient<CharacterProfile[]>('character_profiles', [])
  saveClient('character_profiles', all.filter(c => c.id !== id))
  // Turso 同步
  if (isTursoAvailable()) { tursoDeleteCharacterProfile(id).catch(() => {}) }
}

// ── 世界观设定 ──

export function getWorldSettings(projectId: string): WorldSetting[] {
  if (!isClient()) return []
  const all = loadClient<WorldSetting[]>('world_settings', [])
  return all.filter(w => w.projectId === projectId).sort((a, b) => a.order - b.order)
}

export function createWorldSetting(input: Omit<WorldSetting, 'id' | 'createdAt' | 'updatedAt'>): WorldSetting {
  const all = isClient() ? loadClient<WorldSetting[]>('world_settings', []) : []
  const ws: WorldSetting = { ...input, id: `ws-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, createdAt: Date.now(), updatedAt: Date.now() }
  all.push(ws)
  if (isClient()) saveClient('world_settings', all)
  if (isTursoAvailable()) { tursoSaveWorldSetting(ws).catch(() => {}) }
  return ws
}

export function updateWorldSetting(id: string, patch: Partial<WorldSetting>): WorldSetting | undefined {
  if (!isClient()) return undefined
  const all = loadClient<WorldSetting[]>('world_settings', [])
  const idx = all.findIndex(w => w.id === id)
  if (idx < 0) return undefined
  all[idx] = { ...all[idx], ...patch, updatedAt: Date.now() }
  saveClient('world_settings', all)
  if (isTursoAvailable()) { tursoSaveWorldSetting(all[idx]).catch(() => {}) }
  return all[idx]
}

export function deleteWorldSetting(id: string): void {
  if (!isClient()) return
  const all = loadClient<WorldSetting[]>('world_settings', [])
  saveClient('world_settings', all.filter(w => w.id !== id))
  if (isTursoAvailable()) { tursoDeleteWorldSetting(id).catch(() => {}) }
}

// ── 大纲节点 ──

export function getOutlines(projectId: string): Outline[] {
  if (!isClient()) return []
  const all = loadClient<Outline[]>('outlines', [])
  return all.filter(o => o.projectId === projectId).sort((a, b) => a.chapterOrder - b.chapterOrder)
}

export function getOutline(projectId: string, chapterOrder: number): Outline | undefined {
  if (!isClient()) return undefined
  const all = loadClient<Outline[]>('outlines', [])
  return all.find(o => o.projectId === projectId && o.chapterOrder === chapterOrder)
}

export function upsertOutline(input: Omit<Outline, 'id' | 'createdAt' | 'updatedAt'>): Outline {
  const all = isClient() ? loadClient<Outline[]>('outlines', []) : []
  const idx = all.findIndex(o => o.projectId === input.projectId && o.chapterOrder === input.chapterOrder)
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...input, updatedAt: Date.now() }
    if (isClient()) saveClient('outlines', all)
    return all[idx]
  }
  const outline: Outline = { ...input, id: `ol-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, createdAt: Date.now(), updatedAt: Date.now() }
  all.push(outline)
  if (isClient()) saveClient('outlines', all)
  if (isTursoAvailable()) { tursoUpsertOutline(outline).catch(() => {}) }
  return outline
}

export function deleteOutline(id: string): void {
  if (!isClient()) return
  const all = loadClient<Outline[]>('outlines', [])
  saveClient('outlines', all.filter(o => o.id !== id))
  if (isTursoAvailable()) { tursoDeleteOutline(id).catch(() => {}) }
}

// ── 伏笔 ──

export function getForeshadows(projectId: string): Foreshadow[] {
  if (!isClient()) return []
  const all = loadClient<Foreshadow[]>('foreshadows', [])
  return all.filter(f => f.projectId === projectId)
}

export function getActiveForeshadows(projectId: string): Foreshadow[] {
  return getForeshadows(projectId).filter(f => f.status === 'active')
}

export function createForeshadow(input: Omit<Foreshadow, 'id' | 'createdAt' | 'updatedAt'>): Foreshadow {
  const all = isClient() ? loadClient<Foreshadow[]>('foreshadows', []) : []
  const fs: Foreshadow = { ...input, id: `fs-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, createdAt: Date.now(), updatedAt: Date.now() }
  all.push(fs)
  if (isClient()) saveClient('foreshadows', all)
  if (isTursoAvailable()) { tursoSaveForeshadow(fs).catch(() => {}) }
  return fs
}

export function updateForeshadow(id: string, patch: Partial<Foreshadow>): Foreshadow | undefined {
  if (!isClient()) return undefined
  const all = loadClient<Foreshadow[]>('foreshadows', [])
  const idx = all.findIndex(f => f.id === id)
  if (idx < 0) return undefined
  all[idx] = { ...all[idx], ...patch, updatedAt: Date.now() }
  saveClient('foreshadows', all)
  if (isTursoAvailable()) { tursoSaveForeshadow(all[idx]).catch(() => {}) }
  return all[idx]
}

export function resolveForeshadow(id: string, chapterOrder: number): void {
  updateForeshadow(id, { status: 'resolved', chapterResolved: chapterOrder })
}

export function abandonForeshadow(id: string): void {
  updateForeshadow(id, { status: 'abandoned' })
}

// ── 冷却状态 ──

export function getCoolingState(projectId: string): CoolingState | null {
  if (!isClient()) return null
  const all = loadClient<CoolingState[]>('cooling_states', [])
  return all.find(c => c.projectId === projectId) || null
}

export function saveCoolingState(state: CoolingState): void {
  if (!isClient()) return
  const all = loadClient<CoolingState[]>('cooling_states', [])
  const idx = all.findIndex(c => c.projectId === state.projectId)
  state.updatedAt = Date.now()
  if (idx >= 0) all[idx] = state
  else all.push(state)
  saveClient('cooling_states', all)
  if (isTursoAvailable()) { tursoSaveCoolingState(state).catch(() => {}) }
}

// ── 写作计划 ──

export function getWritingPlan(projectId: string, chapterOrder: number): WritingPlan | null {
  if (!isClient()) return null
  const all = loadClient<WritingPlan[]>('writing_plans', [])
  return all.find(w => w.projectId === projectId && w.chapterOrder === chapterOrder) || null
}

export function saveWritingPlan(plan: WritingPlan): void {
  if (!isClient()) return
  const all = loadClient<WritingPlan[]>('writing_plans', [])
  const idx = all.findIndex(w => w.projectId === plan.projectId && w.chapterOrder === plan.chapterOrder)
  if (idx >= 0) all[idx] = plan
  else all.push(plan)
  saveClient('writing_plans', all)
  if (isTursoAvailable()) { tursoSaveWritingPlan(plan).catch(() => {}) }
}
