// ============================================================
// 墨境数据库 — Turso 存储层（v2）
// 功能：提供 Turso 数据库的全量 CRUD 操作
// 与 store.ts 数据类型完全匹配，作为云端同步目标
// 时间戳：store.ts 使用 ms 数字，此层自动转换 ↔ ISO 字符串
// 复杂字段（数组/对象）存储为 JSON 字符串
// ============================================================

import { tursoQuery, tursoExecute } from './turso-client'
import type {
  Project, Chapter, Volume, CharacterProfile, Outline,
  WorldSetting, Foreshadow, CoolingState, WritingPlan, CharacterGrowth,
} from './types'

// ============================================================
// 时间戳转换工具
// ============================================================

/** ms 数字 → ISO 字符串（写 Turso） */
function msToIso(ms: number): string {
  return new Date(ms).toISOString()
}

/** ISO 字符串 → ms 数字（读 Turso） */
function isoToMs(iso: string | null | undefined): number {
  if (!iso) return 0
  return new Date(iso).getTime()
}

/** 将 store.ts 字段序列化为 JSON 字符串（用于 TEXT 列） */
function serialize(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v
  return JSON.stringify(v)
}

/** 将 Turso 的 TEXT 字段反序列化为 store.ts 类型 */
function deserialize<T>(v: unknown, fallback: T): T {
  if (v === null || v === undefined) return fallback
  if (typeof v !== 'string') return v as unknown as T
  if (v === '') return fallback
  try { return JSON.parse(v) as T } catch { return v as unknown as T }
}

// ============================================================
// Projects
// ============================================================

export async function tursoGetProjects(userId?: string): Promise<Project[]> {
  let sql = 'SELECT * FROM projects WHERE deleted_at IS NULL'
  const args: unknown[] = []
  if (userId) { sql += ' AND user_id = ?'; args.push(userId) }
  sql += ' ORDER BY created_at DESC'
  const result = await tursoQuery(sql, args)
  return result.rows.map(rowToProject)
}

export async function tursoGetProject(id: string): Promise<Project | null> {
  const result = await tursoQuery('SELECT * FROM projects WHERE id = ?', [id])
  if (result.rows.length === 0) return null
  return rowToProject(result.rows[0])
}

export async function tursoCreateProject(project: Project): Promise<void> {
  await tursoExecute(
    `INSERT INTO projects (id, name, genre, description, chapter_count, total_words, user_id, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [project.id, project.name, project.genre, project.description,
     project.chapterCount, project.totalWords, project.userId ?? '',
     msToIso(project.createdAt), msToIso(project.updatedAt),
     project.deletedAt ? msToIso(project.deletedAt) : null]
  )
}

export async function tursoUpdateProject(id: string, updates: Partial<Project>): Promise<void> {
  const setClauses: string[] = []
  const values: unknown[] = []

  if (updates.name !== undefined) { setClauses.push('name = ?'); values.push(updates.name) }
  if (updates.genre !== undefined) { setClauses.push('genre = ?'); values.push(updates.genre) }
  if (updates.description !== undefined) { setClauses.push('description = ?'); values.push(updates.description) }
  if (updates.chapterCount !== undefined) { setClauses.push('chapter_count = ?'); values.push(updates.chapterCount) }
  if (updates.totalWords !== undefined) { setClauses.push('total_words = ?'); values.push(updates.totalWords) }
  if (updates.userId !== undefined) { setClauses.push('user_id = ?'); values.push(updates.userId) }
  if (updates.deletedAt !== undefined) {
    setClauses.push('deleted_at = ?')
    values.push(updates.deletedAt ? msToIso(updates.deletedAt) : null)
  }

  setClauses.push('updated_at = ?')
  values.push(msToIso(updates.updatedAt ?? Date.now()))
  values.push(id)

  await tursoExecute(`UPDATE projects SET ${setClauses.join(', ')} WHERE id = ?`, values)
}

export async function tursoDeleteProject(id: string): Promise<void> {
  await tursoExecute('UPDATE projects SET deleted_at = ? WHERE id = ?',
    [msToIso(Date.now()), id])
}

export async function tursoPermanentDeleteProject(id: string): Promise<void> {
  await tursoExecute('DELETE FROM projects WHERE id = ?', [id])
}

export async function tursoRestoreProject(id: string): Promise<void> {
  await tursoExecute('UPDATE projects SET deleted_at = NULL, updated_at = ? WHERE id = ?',
    [msToIso(Date.now()), id])
}

function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    genre: row.genre as string,
    description: row.description as string,
    chapterCount: row.chapter_count as number,
    totalWords: row.total_words as number,
    userId: row.user_id as string || undefined,
    createdAt: isoToMs(row.created_at as string),
    updatedAt: isoToMs(row.updated_at as string),
    deletedAt: row.deleted_at ? isoToMs(row.deleted_at as string) : undefined,
  }
}

// ============================================================
// Chapters
// ============================================================

export async function tursoGetChapters(projectId: string, userId?: string): Promise<Chapter[]> {
  let sql = 'SELECT * FROM chapters WHERE project_id = ? AND deleted_at IS NULL'
  const args: unknown[] = [projectId]
  if (userId) { sql += ' AND user_id = ?'; args.push(userId) }
  sql += ' ORDER BY "order" ASC'
  const result = await tursoQuery(sql, args)
  return result.rows.map(rowToChapter)
}

export async function tursoGetChapter(id: string): Promise<Chapter | null> {
  const result = await tursoQuery('SELECT * FROM chapters WHERE id = ?', [id])
  if (result.rows.length === 0) return null
  return rowToChapter(result.rows[0])
}

export async function tursoCreateChapter(chapter: Chapter): Promise<void> {
  await tursoExecute(
    `INSERT INTO chapters (id, project_id, title, content, "order", word_count, status, volume_id, user_id, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [chapter.id, chapter.projectId, chapter.title, chapter.content,
     chapter.order, chapter.wordCount, chapter.status,
     chapter.volumeId ?? '', chapter.userId ?? '',
     msToIso(chapter.createdAt), msToIso(chapter.updatedAt),
     chapter.deletedAt ? msToIso(chapter.deletedAt) : null]
  )
}

export async function tursoUpdateChapter(id: string, updates: Partial<Chapter>): Promise<void> {
  const setClauses: string[] = []
  const values: unknown[] = []

  if (updates.title !== undefined) { setClauses.push('title = ?'); values.push(updates.title) }
  if (updates.content !== undefined) { setClauses.push('content = ?'); values.push(updates.content) }
  if (updates.order !== undefined) { setClauses.push('"order" = ?'); values.push(updates.order) }
  if (updates.wordCount !== undefined) { setClauses.push('word_count = ?'); values.push(updates.wordCount) }
  if (updates.status !== undefined) { setClauses.push('status = ?'); values.push(updates.status) }
  if (updates.volumeId !== undefined) { setClauses.push('volume_id = ?'); values.push(updates.volumeId) }
  if (updates.userId !== undefined) { setClauses.push('user_id = ?'); values.push(updates.userId) }
  if (updates.deletedAt !== undefined) {
    setClauses.push('deleted_at = ?')
    values.push(updates.deletedAt ? msToIso(updates.deletedAt) : null)
  }

  setClauses.push('updated_at = ?')
  values.push(msToIso(updates.updatedAt ?? Date.now()))
  values.push(id)

  await tursoExecute(`UPDATE chapters SET ${setClauses.join(', ')} WHERE id = ?`, values)
}

export async function tursoDeleteChapter(id: string): Promise<void> {
  await tursoExecute('UPDATE chapters SET deleted_at = ? WHERE id = ?',
    [msToIso(Date.now()), id])
}

export async function tursoPermanentDeleteChapter(id: string): Promise<void> {
  await tursoExecute('DELETE FROM chapters WHERE id = ?', [id])
}

export async function tursoRestoreChapter(id: string): Promise<void> {
  await tursoExecute('UPDATE chapters SET deleted_at = NULL, updated_at = ? WHERE id = ?',
    [msToIso(Date.now()), id])
}

function rowToChapter(row: Record<string, unknown>): Chapter {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    title: row.title as string,
    content: row.content as string,
    order: row.order as number,
    wordCount: row.word_count as number,
    status: row.status as Chapter['status'],
    volumeId: (row.volume_id as string) || undefined,
    userId: (row.user_id as string) || undefined,
    createdAt: isoToMs(row.created_at as string),
    updatedAt: isoToMs(row.updated_at as string),
    deletedAt: row.deleted_at ? isoToMs(row.deleted_at as string) : undefined,
  }
}

// ============================================================
// Volumes
// ============================================================

export async function tursoGetVolumes(projectId: string): Promise<Volume[]> {
  const result = await tursoQuery(
    'SELECT * FROM volumes WHERE project_id = ? ORDER BY "order" ASC', [projectId])
  return result.rows.map(rowToVolume)
}

export async function tursoGetVolume(id: string): Promise<Volume | null> {
  const result = await tursoQuery('SELECT * FROM volumes WHERE id = ?', [id])
  if (result.rows.length === 0) return null
  return rowToVolume(result.rows[0])
}

export async function tursoCreateVolume(volume: Volume): Promise<void> {
  await tursoExecute(
    `INSERT INTO volumes (id, project_id, name, "order", created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [volume.id, volume.projectId, volume.name, volume.order,
     msToIso(volume.createdAt), msToIso(volume.updatedAt)]
  )
}

export async function tursoUpdateVolume(id: string, updates: Partial<Volume>): Promise<void> {
  const setClauses: string[] = []
  const values: unknown[] = []

  if (updates.name !== undefined) { setClauses.push('name = ?'); values.push(updates.name) }
  if (updates.order !== undefined) { setClauses.push('"order" = ?'); values.push(updates.order) }

  setClauses.push('updated_at = ?')
  values.push(msToIso(updates.updatedAt ?? Date.now()))
  values.push(id)

  await tursoExecute(`UPDATE volumes SET ${setClauses.join(', ')} WHERE id = ?`, values)
}

export async function tursoDeleteVolume(id: string): Promise<void> {
  await tursoExecute('DELETE FROM volumes WHERE id = ?', [id])
}

function rowToVolume(row: Record<string, unknown>): Volume {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    name: row.name as string,
    order: row.order as number,
    createdAt: isoToMs(row.created_at as string),
    updatedAt: isoToMs(row.updated_at as string),
  }
}

// ============================================================
// CharacterProfiles
// ============================================================

export async function tursoGetCharacterProfiles(projectId: string): Promise<CharacterProfile[]> {
  const result = await tursoQuery(
    'SELECT * FROM character_profiles WHERE project_id = ? ORDER BY created_at ASC', [projectId])
  return result.rows.map(rowToCharacterProfile)
}

export async function tursoGetCharacterProfile(id: string): Promise<CharacterProfile | null> {
  const result = await tursoQuery('SELECT * FROM character_profiles WHERE id = ?', [id])
  if (result.rows.length === 0) return null
  return rowToCharacterProfile(result.rows[0])
}

export async function tursoCreateCharacterProfile(profile: CharacterProfile): Promise<void> {
  await tursoExecute(
    `INSERT INTO character_profiles
     (id, project_id, name, type, core_personality, speaking_style, core_desire, core_obstacle,
      body_habits, sensory_channels, imagery_types, metaphor_domains,
      initial_personality, current_personality, growth_history, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [profile.id, profile.projectId, profile.name, profile.type,
     profile.corePersonality, profile.speakingStyle, profile.coreDesire, profile.coreObstacle,
     serialize(profile.bodyHabits), serialize(profile.sensoryChannels),
     serialize(profile.imageryTypes), serialize(profile.metaphorDomains),
     profile.initialPersonality, profile.currentPersonality,
     serialize(profile.growthHistory),
     msToIso(profile.createdAt), msToIso(profile.updatedAt)]
  )
}

export async function tursoUpdateCharacterProfile(id: string, updates: Partial<CharacterProfile>): Promise<void> {
  const setClauses: string[] = []
  const values: unknown[] = []

  if (updates.name !== undefined) { setClauses.push('name = ?'); values.push(updates.name) }
  if (updates.type !== undefined) { setClauses.push('type = ?'); values.push(updates.type) }
  if (updates.corePersonality !== undefined) { setClauses.push('core_personality = ?'); values.push(updates.corePersonality) }
  if (updates.speakingStyle !== undefined) { setClauses.push('speaking_style = ?'); values.push(updates.speakingStyle) }
  if (updates.coreDesire !== undefined) { setClauses.push('core_desire = ?'); values.push(updates.coreDesire) }
  if (updates.coreObstacle !== undefined) { setClauses.push('core_obstacle = ?'); values.push(updates.coreObstacle) }
  if (updates.bodyHabits !== undefined) { setClauses.push('body_habits = ?'); values.push(serialize(updates.bodyHabits)) }
  if (updates.sensoryChannels !== undefined) { setClauses.push('sensory_channels = ?'); values.push(serialize(updates.sensoryChannels)) }
  if (updates.imageryTypes !== undefined) { setClauses.push('imagery_types = ?'); values.push(serialize(updates.imageryTypes)) }
  if (updates.metaphorDomains !== undefined) { setClauses.push('metaphor_domains = ?'); values.push(serialize(updates.metaphorDomains)) }
  if (updates.initialPersonality !== undefined) { setClauses.push('initial_personality = ?'); values.push(updates.initialPersonality) }
  if (updates.currentPersonality !== undefined) { setClauses.push('current_personality = ?'); values.push(updates.currentPersonality) }
  if (updates.growthHistory !== undefined) { setClauses.push('growth_history = ?'); values.push(serialize(updates.growthHistory)) }

  setClauses.push('updated_at = ?')
  values.push(msToIso(updates.updatedAt ?? Date.now()))
  values.push(id)

  await tursoExecute(`UPDATE character_profiles SET ${setClauses.join(', ')} WHERE id = ?`, values)
}

export async function tursoDeleteCharacterProfile(id: string): Promise<void> {
  await tursoExecute('DELETE FROM character_profiles WHERE id = ?', [id])
}

function rowToCharacterProfile(row: Record<string, unknown>): CharacterProfile {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    name: row.name as string,
    type: row.type as CharacterProfile['type'],
    corePersonality: row.core_personality as string,
    speakingStyle: row.speaking_style as string,
    coreDesire: row.core_desire as string,
    coreObstacle: row.core_obstacle as string,
    bodyHabits: deserialize<string[]>(row.body_habits, []),
    sensoryChannels: deserialize<string[]>(row.sensory_channels, []),
    imageryTypes: deserialize<string[]>(row.imagery_types, []),
    metaphorDomains: deserialize<string[]>(row.metaphor_domains, []),
    initialPersonality: row.initial_personality as string,
    currentPersonality: row.current_personality as string,
    growthHistory: deserialize<CharacterGrowth[]>(row.growth_history, []),
    createdAt: isoToMs(row.created_at as string),
    updatedAt: isoToMs(row.updated_at as string),
  }
}

// ============================================================
// Outlines
// ============================================================

export async function tursoGetOutlines(projectId: string): Promise<Outline[]> {
  const result = await tursoQuery(
    'SELECT * FROM outlines WHERE project_id = ? ORDER BY chapter_order ASC', [projectId])
  return result.rows.map(rowToOutline)
}

export async function tursoGetOutline(projectId: string, chapterOrder: number): Promise<Outline | null> {
  const result = await tursoQuery(
    'SELECT * FROM outlines WHERE project_id = ? AND chapter_order = ?', [projectId, chapterOrder])
  if (result.rows.length === 0) return null
  return rowToOutline(result.rows[0])
}

export async function tursoUpsertOutline(outline: Outline): Promise<void> {
  const existing = await tursoGetOutline(outline.projectId, outline.chapterOrder)
  if (existing) {
    await tursoExecute(
      `UPDATE outlines SET core_event=?, function_tag=?, emotion_arc=?, conflict_level=?,
       foreshadows_to_plant=?, foreshadows_to_resolve=?, characters=?, updated_at=?
       WHERE id=?`,
      [outline.coreEvent, outline.functionTag, outline.emotionArc, outline.conflictLevel,
       serialize(outline.foreshadowsToPlant), serialize(outline.foreshadowsToResolve),
       serialize(outline.characters), msToIso(outline.updatedAt), outline.id]
    )
  } else {
    await tursoExecute(
      `INSERT INTO outlines
       (id, project_id, chapter_order, core_event, function_tag, emotion_arc, conflict_level,
        foreshadows_to_plant, foreshadows_to_resolve, characters, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [outline.id, outline.projectId, outline.chapterOrder,
       outline.coreEvent, outline.functionTag, outline.emotionArc, outline.conflictLevel,
       serialize(outline.foreshadowsToPlant), serialize(outline.foreshadowsToResolve),
       serialize(outline.characters),
       msToIso(outline.createdAt), msToIso(outline.updatedAt)]
    )
  }
}

export async function tursoDeleteOutline(id: string): Promise<void> {
  await tursoExecute('DELETE FROM outlines WHERE id = ?', [id])
}

function rowToOutline(row: Record<string, unknown>): Outline {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    chapterOrder: row.chapter_order as number,
    coreEvent: row.core_event as string,
    functionTag: row.function_tag as string,
    emotionArc: row.emotion_arc as string,
    conflictLevel: row.conflict_level as Outline['conflictLevel'],
    foreshadowsToPlant: deserialize<string[]>(row.foreshadows_to_plant, []),
    foreshadowsToResolve: deserialize<string[]>(row.foreshadows_to_resolve, []),
    characters: deserialize<string[]>(row.characters, []),
    createdAt: isoToMs(row.created_at as string),
    updatedAt: isoToMs(row.updated_at as string),
  }
}

// ============================================================
// WorldSettings
// ============================================================

export async function tursoGetWorldSettings(projectId: string): Promise<WorldSetting[]> {
  const result = await tursoQuery(
    'SELECT * FROM world_settings WHERE project_id = ? ORDER BY sort_order ASC', [projectId])
  return result.rows.map(rowToWorldSetting)
}

export async function tursoCreateWorldSetting(setting: WorldSetting): Promise<void> {
  await tursoExecute(
    `INSERT INTO world_settings (id, project_id, category, title, content, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [setting.id, setting.projectId, setting.category, setting.title, setting.content,
     setting.order, msToIso(setting.createdAt), msToIso(setting.updatedAt)]
  )
}

export async function tursoUpdateWorldSetting(id: string, updates: Partial<WorldSetting>): Promise<void> {
  const setClauses: string[] = []
  const values: unknown[] = []

  if (updates.category !== undefined) { setClauses.push('category = ?'); values.push(updates.category) }
  if (updates.title !== undefined) { setClauses.push('title = ?'); values.push(updates.title) }
  if (updates.content !== undefined) { setClauses.push('content = ?'); values.push(updates.content) }
  if (updates.order !== undefined) { setClauses.push('sort_order = ?'); values.push(updates.order) }

  setClauses.push('updated_at = ?')
  values.push(msToIso(updates.updatedAt ?? Date.now()))
  values.push(id)

  await tursoExecute(`UPDATE world_settings SET ${setClauses.join(', ')} WHERE id = ?`, values)
}

export async function tursoDeleteWorldSetting(id: string): Promise<void> {
  await tursoExecute('DELETE FROM world_settings WHERE id = ?', [id])
}

function rowToWorldSetting(row: Record<string, unknown>): WorldSetting {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    category: row.category as WorldSetting['category'],
    title: row.title as string,
    content: row.content as string,
    order: row.sort_order as number,
    createdAt: isoToMs(row.created_at as string),
    updatedAt: isoToMs(row.updated_at as string),
  }
}

// ============================================================
// Foreshadows
// ============================================================

export async function tursoGetForeshadows(projectId: string): Promise<Foreshadow[]> {
  const result = await tursoQuery(
    'SELECT * FROM foreshadows WHERE project_id = ? ORDER BY created_at ASC', [projectId])
  return result.rows.map(rowToForeshadow)
}

export async function tursoGetActiveForeshadows(projectId: string): Promise<Foreshadow[]> {
  const result = await tursoQuery(
    'SELECT * FROM foreshadows WHERE project_id = ? AND status = ? ORDER BY created_at ASC',
    [projectId, 'active'])
  return result.rows.map(rowToForeshadow)
}

export async function tursoCreateForeshadow(fs: Foreshadow): Promise<void> {
  await tursoExecute(
    `INSERT INTO foreshadows
     (id, project_id, content, importance, status, chapter_planted,
      chapter_planned_resolution, chapter_resolved, related_characters, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [fs.id, fs.projectId, fs.content, fs.importance, fs.status, fs.chapterPlanted,
     fs.chapterPlannedResolution ?? null, fs.chapterResolved ?? null,
     serialize(fs.relatedCharacters),
     msToIso(fs.createdAt), msToIso(fs.updatedAt)]
  )
}

export async function tursoUpdateForeshadow(id: string, updates: Partial<Foreshadow>): Promise<void> {
  const setClauses: string[] = []
  const values: unknown[] = []

  if (updates.content !== undefined) { setClauses.push('content = ?'); values.push(updates.content) }
  if (updates.importance !== undefined) { setClauses.push('importance = ?'); values.push(updates.importance) }
  if (updates.status !== undefined) { setClauses.push('status = ?'); values.push(updates.status) }
  if (updates.chapterPlanted !== undefined) { setClauses.push('chapter_planted = ?'); values.push(updates.chapterPlanted) }
  if (updates.chapterPlannedResolution !== undefined) {
    setClauses.push('chapter_planned_resolution = ?')
    values.push(updates.chapterPlannedResolution ?? null)
  }
  if (updates.chapterResolved !== undefined) {
    setClauses.push('chapter_resolved = ?')
    values.push(updates.chapterResolved ?? null)
  }
  if (updates.relatedCharacters !== undefined) { setClauses.push('related_characters = ?'); values.push(serialize(updates.relatedCharacters)) }

  setClauses.push('updated_at = ?')
  values.push(msToIso(updates.updatedAt ?? Date.now()))
  values.push(id)

  await tursoExecute(`UPDATE foreshadows SET ${setClauses.join(', ')} WHERE id = ?`, values)
}

export async function tursoDeleteForeshadow(id: string): Promise<void> {
  await tursoExecute('DELETE FROM foreshadows WHERE id = ?', [id])
}

function rowToForeshadow(row: Record<string, unknown>): Foreshadow {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    content: row.content as string,
    importance: row.importance as Foreshadow['importance'],
    status: row.status as Foreshadow['status'],
    chapterPlanted: row.chapter_planted as number,
    chapterPlannedResolution: row.chapter_planned_resolution as number | undefined,
    chapterResolved: row.chapter_resolved as number | undefined,
    relatedCharacters: deserialize<string[]>(row.related_characters, []),
    createdAt: isoToMs(row.created_at as string),
    updatedAt: isoToMs(row.updated_at as string),
  }
}

// ============================================================
// CoolingStates
// ============================================================

export async function tursoGetCoolingState(projectId: string): Promise<CoolingState | null> {
  const result = await tursoQuery(
    'SELECT * FROM cooling_states WHERE project_id = ?', [projectId])
  if (result.rows.length === 0) return null
  return rowToCoolingState(result.rows[0])
}

export async function tursoSaveCoolingState(state: CoolingState): Promise<void> {
  const existing = await tursoGetCoolingState(state.projectId)
  if (existing) {
    await tursoExecute(
      `UPDATE cooling_states SET senses=?, sentences=?, scenes=?, endings=?, hooks=?,
       emotions=?, progressive_judgment=?, updated_at=? WHERE project_id=?`,
      [serialize(state.senses), serialize(state.sentences), serialize(state.scenes),
       serialize(state.endings), serialize(state.hooks), serialize(state.emotions),
       serialize(state.progressiveJudgment),
       msToIso(state.updatedAt ?? Date.now()), state.projectId]
    )
  } else {
    await tursoExecute(
      `INSERT INTO cooling_states
       (id, project_id, senses, sentences, scenes, endings, hooks, emotions, progressive_judgment, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [state.id, state.projectId, serialize(state.senses), serialize(state.sentences),
       serialize(state.scenes), serialize(state.endings), serialize(state.hooks),
       serialize(state.emotions), serialize(state.progressiveJudgment),
       msToIso(Date.now()), msToIso(state.updatedAt ?? Date.now())]
    )
  }
}

function rowToCoolingState(row: Record<string, unknown>): CoolingState {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    senses: deserialize<Record<string, number[]>>(row.senses, {}),
    sentences: deserialize<Record<string, number[]>>(row.sentences, {}),
    scenes: deserialize<Record<string, number[]>>(row.scenes, {}),
    endings: deserialize<Record<string, number[]>>(row.endings, {}),
    hooks: deserialize<Record<string, number[]>>(row.hooks, {}),
    emotions: deserialize<string[]>(row.emotions, []),
    progressiveJudgment: deserialize<Record<number, number>>(row.progressive_judgment, {}),
    updatedAt: isoToMs(row.updated_at as string),
  }
}

// ============================================================
// WritingPlans
// ============================================================

export async function tursoGetWritingPlan(projectId: string, chapterOrder: number): Promise<WritingPlan | null> {
  const result = await tursoQuery(
    'SELECT * FROM writing_plans WHERE project_id = ? AND chapter_order = ?', [projectId, chapterOrder])
  if (result.rows.length === 0) return null
  return rowToWritingPlan(result.rows[0])
}

export async function tursoSaveWritingPlan(plan: WritingPlan): Promise<void> {
  const existing = await tursoGetWritingPlan(plan.projectId, plan.chapterOrder)
  if (existing) {
    await tursoExecute(
      `UPDATE writing_plans SET conflict_level=?, style=?, scene_method=?, sensory_anchors=?,
       body_anchors=?, ending_type=?, hook_type=?, special_techniques=?, status_line=?, updated_at=?
       WHERE id=?`,
      [plan.conflictLevel, plan.style, plan.sceneMethod, serialize(plan.sensoryAnchors),
       serialize(plan.bodyAnchors), plan.endingType, plan.hookType,
       serialize(plan.specialTechniques), plan.statusLine,
       msToIso(Date.now()), plan.id]
    )
  } else {
    await tursoExecute(
      `INSERT INTO writing_plans
       (id, project_id, chapter_order, conflict_level, style, scene_method,
        sensory_anchors, body_anchors, ending_type, hook_type, special_techniques, status_line, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [plan.id, plan.projectId, plan.chapterOrder, plan.conflictLevel, plan.style, plan.sceneMethod,
       serialize(plan.sensoryAnchors), serialize(plan.bodyAnchors), plan.endingType, plan.hookType,
       serialize(plan.specialTechniques), plan.statusLine,
       msToIso(plan.createdAt ?? Date.now()), msToIso(Date.now())]
    )
  }
}

function rowToWritingPlan(row: Record<string, unknown>): WritingPlan {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    chapterOrder: row.chapter_order as number,
    conflictLevel: row.conflict_level as WritingPlan['conflictLevel'],
    style: row.style as WritingPlan['style'],
    sceneMethod: row.scene_method as string,
    sensoryAnchors: deserialize<string[]>(row.sensory_anchors, []),
    bodyAnchors: deserialize<string[]>(row.body_anchors, []),
    endingType: row.ending_type as string,
    hookType: row.hook_type as string,
    specialTechniques: deserialize<string[]>(row.special_techniques, []),
    statusLine: row.status_line as string,
    createdAt: isoToMs(row.created_at as string),
  }
}

// ============================================================
// 健康检查
// ============================================================

export async function tursoHealthCheckV2(): Promise<boolean> {
  try {
    await tursoQuery('SELECT 1 as ok')
    return true
  } catch {
    return false
  }
}

// ============================================================
// Upsert 辅助函数（供 store.ts 增量同步使用）
// ============================================================

export async function tursoSaveProject(p: Project): Promise<void> {
  const existing = await tursoGetProject(p.id)
  if (existing) {
    await tursoUpdateProject(p.id, p)
  } else {
    await tursoCreateProject(p)
  }
}

export async function tursoSaveChapter(c: Chapter): Promise<void> {
  const existing = await tursoGetChapter(c.id)
  if (existing) {
    await tursoUpdateChapter(c.id, c)
  } else {
    await tursoCreateChapter(c)
  }
}

export async function tursoSaveVolume(v: Volume): Promise<void> {
  const existing = await tursoGetVolume(v.id)
  if (existing) {
    await tursoUpdateVolume(v.id, v)
  } else {
    await tursoCreateVolume(v)
  }
}

export async function tursoSaveCharacterProfile(p: CharacterProfile): Promise<void> {
  const existing = await tursoGetCharacterProfile(p.id)
  if (existing) {
    await tursoUpdateCharacterProfile(p.id, p)
  } else {
    await tursoCreateCharacterProfile(p)
  }
}

export async function tursoSaveWorldSetting(ws: WorldSetting): Promise<void> {
  const all = await tursoGetWorldSettings(ws.projectId)
  const existing = all.find(x => x.id === ws.id)
  if (existing) {
    await tursoUpdateWorldSetting(ws.id, ws)
  } else {
    await tursoCreateWorldSetting(ws)
  }
}

export async function tursoSaveForeshadow(fs: Foreshadow): Promise<void> {
  const all = await tursoGetForeshadows(fs.projectId)
  const existing = all.find(x => x.id === fs.id)
  if (existing) {
    await tursoUpdateForeshadow(fs.id, fs)
  } else {
    await tursoCreateForeshadow(fs)
  }
}
