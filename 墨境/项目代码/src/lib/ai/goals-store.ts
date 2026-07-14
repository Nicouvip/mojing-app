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
    if (idx >= 0) {
      // 已有今日记录 → 更新字数
      history[idx].words = count
    } else if (count > 0) {
      // 今日无记录且确实写了字 → 创建
      history.push({ date: today, words: count })
    }
    // count=0 且无记录 → 不创建脏数据
    const trimmed = history.sort((a, b) => a.date.localeCompare(b.date)).slice(-30)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed))
  } catch {}
}

export function getStreak(): number {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return 0
    const history: DayRecord[] = (JSON.parse(raw) as DayRecord[]).sort((a, b) => b.date.localeCompare(a.date))
    const today = new Date()
    const todayStr = today.toISOString().slice(0, 10)

    // 确定从 history 数组的哪个索引开始、对应哪天
    // 情况1: 今天有记录且写了字 → historyIdx=0, dayOffset=0
    // 情况2: 今天有记录但words=0 → 跳过这条，historyIdx=1, dayOffset=1
    // 情况3: 今天没有记录 → historyIdx=0, dayOffset=1
    let historyIdx = 0
    let dayOffset = 0

    if (history.length > 0 && history[0].date === todayStr) {
      if (history[0].words > 0) {
        historyIdx = 0; dayOffset = 0
      } else {
        historyIdx = 1; dayOffset = 1
      }
    } else {
      historyIdx = 0; dayOffset = 1
    }

    let streak = 0
    for (let i = historyIdx; i < history.length; i++) {
      const expected = new Date(today)
      expected.setDate(expected.getDate() - (i - historyIdx + dayOffset))
      const expectedStr = expected.toISOString().slice(0, 10)
      if (history[i].date === expectedStr && history[i].words > 0) streak++
      else break
    }
    return streak
  } catch { return 0 }
}
