// ============================================================
// 写作目标存储
// localStore — 每日字数目标 + 进度追踪
// 读取 mojing_system_config 中的 wordGoal 作为默认值
// ============================================================

export interface WritingGoals {
  dailyWordTarget: number
  enabled: boolean
}

const GOALS_KEY = 'mojing_writing_goals'
const HISTORY_KEY = 'mojing_writing_history'

export function loadGoals(): WritingGoals {
  try {
    const sysRaw = localStorage.getItem('mojing_system_config')
    if (sysRaw) {
      const sys = JSON.parse(sysRaw)
      if (sys.wordGoal) return { dailyWordTarget: sys.wordGoal, enabled: true }
    }
    const raw = localStorage.getItem(GOALS_KEY)
    if (raw) return { dailyWordTarget: 3000, enabled: true, ...JSON.parse(raw) }
  } catch {}
  return { dailyWordTarget: 3000, enabled: false }
}

export function saveGoals(goals: WritingGoals) {
  try { localStorage.setItem(GOALS_KEY, JSON.stringify(goals)) } catch {}
}

export interface DayRecord {
  date: string
  words: number
}

export function getTodayWords(): number {
  const today = new Date().toISOString().slice(0, 10)
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return 0
    const history: DayRecord[] = JSON.parse(raw)
    return history.find(d => d.date === today)?.words || 0
  } catch { return 0 }
}

export function recordWords(count: number) {
  const today = new Date().toISOString().slice(0, 10)
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const history: DayRecord[] = raw ? JSON.parse(raw) : []
    const idx = history.findIndex(d => d.date === today)
    if (idx >= 0) history[idx].words = count
    else history.push({ date: today, words: count })
    const trimmed = history.sort((a, b) => a.date.localeCompare(b.date)).slice(-30)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed))
  } catch {}
}

export function getStreak(): number {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return 0
    const history: DayRecord[] = (JSON.parse(raw) as DayRecord[]).sort((a, b) => b.date.localeCompare(a.date))
    let streak = 0
    const today = new Date()
    // 今天还没写 → 从昨天开始回溯
    const startOffset = (history.length > 0 && history[0].date === today.toISOString().slice(0, 10) && history[0].words > 0) ? 0 : 1
    for (let i = startOffset; i < history.length + startOffset; i++) {
      const expected = new Date(today)
      expected.setDate(expected.getDate() - i)
      const expectedStr = expected.toISOString().slice(0, 10)
      const record = history[i - startOffset]
      if (record && record.date === expectedStr && record.words > 0) streak++
      else break
    }
    return streak
  } catch { return 0 }
}
