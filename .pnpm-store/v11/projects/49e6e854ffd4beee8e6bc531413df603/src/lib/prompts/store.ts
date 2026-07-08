// ============================================================
// 墨境提示词系统 — 持久化存储
// 功能：将 feedback / AB实验 / registry 数据写入 localStorage
// 版本：v1.0.0
// ============================================================

import type { PromptFeedback } from './feedback'
import type { ABExperiment } from './ab-test'
import type { TemplateEntry } from './types'

const KEYS = {
  feedback: 'mojing_prompts_feedback',
  callCounts: 'mojing_prompts_callcounts',
  experiments: 'mojing_prompts_experiments',
  registry: 'mojing_prompts_registry',
} as const

function isClient(): boolean {
  return typeof window !== 'undefined'
}

function setItem(key: string, value: string): void {
  if (!isClient()) return
  try { localStorage.setItem(key, value) } catch { /* quota exceeded */ }
}

function getItem(key: string): string | null {
  if (!isClient()) return null
  try { return localStorage.getItem(key) } catch { return null }
}

// ===== Feedback =====

export function persistFeedback(feedbacks: PromptFeedback[]): void {
  setItem(KEYS.feedback, JSON.stringify(feedbacks))
}

export function loadFeedback(): PromptFeedback[] {
  const raw = getItem(KEYS.feedback)
  if (!raw) return []
  try { return JSON.parse(raw) as PromptFeedback[] } catch { return [] }
}

export function persistCallCounts(callCounts: Map<string, number>): void {
  const obj: Record<string, number> = {}
  callCounts.forEach((v, k) => { obj[k] = v })
  setItem(KEYS.callCounts, JSON.stringify(obj))
}

export function loadCallCounts(): Map<string, number> {
  const raw = getItem(KEYS.callCounts)
  if (!raw) return new Map()
  try {
    const obj = JSON.parse(raw) as Record<string, number>
    return new Map(Object.entries(obj))
  } catch { return new Map() }
}

// ===== A/B Experiments =====

export function persistExperiments(experiments: ABExperiment[]): void {
  setItem(KEYS.experiments, JSON.stringify(experiments))
}

export function loadExperiments(): ABExperiment[] {
  const raw = getItem(KEYS.experiments)
  if (!raw) return []
  try { return JSON.parse(raw) as ABExperiment[] } catch { return [] }
}

// ===== Registry =====

export function persistRegistry(entries: TemplateEntry[]): void {
  setItem(KEYS.registry, JSON.stringify(entries))
}

export function loadRegistry(): TemplateEntry[] {
  const raw = getItem(KEYS.registry)
  if (!raw) return []
  try { return JSON.parse(raw) as TemplateEntry[] } catch { return [] }
}
