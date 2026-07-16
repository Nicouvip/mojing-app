/**
 * 音频持久化 — IndexedDB 封装
 * 解决 P0-1：generatedChapters 存在 React state，刷新即丢失
 */

const DB_NAME = 'mojing-audiobook'
const DB_VERSION = 1
const STORE_NAME = 'generated-audio'

interface AudioRecord {
  projectId: string
  chapterId: string
  audioBase64: string
  duration: number
  subtitles: Array<{ text: string; startSec: number; endSec: number }>
  updatedAt: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') { reject(new Error('IndexedDB unavailable on server')); return }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: ['projectId', 'chapterId'] })
        store.createIndex('projectId', 'projectId', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** 加载某项目所有已生成的章节音频 → Map<chapterId, data> */
export async function loadGeneratedChapters(
  projectId: string
): Promise<Map<string, { audioBase64: string; duration: number; subtitles: Array<{ text: string; startSec: number; endSec: number }> }>> {
  const map = new Map<string, { audioBase64: string; duration: number; subtitles: Array<{ text: string; startSec: number; endSec: number }> }>()
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const idx = store.index('projectId')
    const results = await new Promise<AudioRecord[]>((resolve, reject) => {
      const req = idx.getAll(projectId)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    for (const rec of results) {
      map.set(rec.chapterId, { audioBase64: rec.audioBase64, duration: rec.duration, subtitles: rec.subtitles })
    }
    db.close()
  } catch { /* 静默失败，不影响主流程 */ }
  return map
}

/** 保存/更新单章音频 */
export async function saveGeneratedChapter(
  projectId: string,
  chapterId: string,
  data: { audioBase64: string; duration: number; subtitles: Array<{ text: string; startSec: number; endSec: number }> }
): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put({
      projectId, chapterId,
      audioBase64: data.audioBase64,
      duration: data.duration,
      subtitles: data.subtitles,
      updatedAt: Date.now(),
    })
    await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error) })
    db.close()
  } catch { /* 静默 */ }
}

/** 删除某项目所有音频 */
export async function clearGeneratedChapters(projectId: string): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const idx = store.index('projectId')
    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const req = idx.getAllKeys(projectId)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    for (const key of keys) store.delete(key)
    await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error) })
    db.close()
  } catch { /* 静默 */ }
}
