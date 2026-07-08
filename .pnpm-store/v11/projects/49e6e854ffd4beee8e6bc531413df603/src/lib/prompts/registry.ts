// ============================================================
// 墨境提示词系统 — 模板注册表 (Registry)
// 功能：模板注册、版本管理、激活/停用、按条件检索
// 版本：v1.0.0
// ============================================================

import type { PromptTemplate, TemplateEntry, ToolType } from './types'
import { continueTemplate } from './templates/continue'
import { polishTemplate } from './templates/polish'
import { expandTemplate } from './templates/expand'
import { brainstormTemplate } from './templates/brainstorm'
import { persistRegistry, loadRegistry } from './store'

/**
 * 模板注册表 — 内存中的模板仓库
 */
class TemplateRegistry {
  private entries: Map<string, TemplateEntry> = new Map()

  constructor() {
    this.registerDefaults()
    this.restoreFromStorage()
  }

  private persist(): void {
    persistRegistry(Array.from(this.entries.values()))
  }

  private restoreFromStorage(): void {
    const saved = loadRegistry()
    for (const entry of saved) {
      if (!this.entries.has(entry.template.id)) {
        this.entries.set(entry.template.id, entry)
      }
    }
  }

  /**
   * 注册内置模板
   */
  private registerDefaults(): void {
    const now = Date.now()
    const templates = [
      { ...continueTemplate, createdAt: now, updatedAt: now },
      { ...polishTemplate, createdAt: now, updatedAt: now },
      { ...expandTemplate, createdAt: now, updatedAt: now },
      { ...brainstormTemplate, createdAt: now, updatedAt: now },
    ]

    for (const t of templates) {
      this.entries.set(t.id, {
        template: t,
        active: true,
        activatedAt: now,
      })
    }
  }

  /**
   * 注册新模板
   */
  register(template: PromptTemplate): void {
    const existing = this.entries.get(template.id)
    if (existing) {
      // 相同 ID 但版本不同 → 更新（保留活跃状态）
      existing.template = template
      existing.template.updatedAt = Date.now()
    } else {
      this.entries.set(template.id, {
        template,
        active: true,
        activatedAt: Date.now(),
      })
    }
    this.persist()
  }

  /**
   * 获取模板（按 ID）
   */
  get(id: string): PromptTemplate | undefined {
    return this.entries.get(id)?.template
  }

  /**
   * 获取指定类型的最新活跃模板
   */
  getActiveByType(type: ToolType): PromptTemplate | undefined {
    // 按 updatedAt 降序取最新
    const candidates = Array.from(this.entries.values())
      .filter(e => e.active && e.template.type === type)
      .sort((a, b) => b.template.updatedAt - a.template.updatedAt)

    return candidates[0]?.template
  }

  /**
   * 获取指定类型的所有模板（含非活跃，用于版本对比）
   */
  getAllByType(type: ToolType): PromptTemplate[] {
    return Array.from(this.entries.values())
      .filter(e => e.template.type === type)
      .map(e => e.template)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }

  /**
   * 列出所有活跃模板
   */
  listActive(): PromptTemplate[] {
    return Array.from(this.entries.values())
      .filter(e => e.active)
      .map(e => e.template)
  }

  /**
   * 停用模板
   */
  deactivate(id: string): boolean {
    const entry = this.entries.get(id)
    if (!entry) return false
    entry.active = false
    entry.deactivatedAt = Date.now()
    this.persist()
    return true
  }

  /**
   * 激活模板
   */
  activate(id: string): boolean {
    const entry = this.entries.get(id)
    if (!entry) return false
    entry.active = true
    entry.activatedAt = Date.now()
    this.persist()
    return true
  }

  /**
   * 获取模板版本号
   */
  getVersion(id: string): string | undefined {
    return this.entries.get(id)?.template.version
  }

  /**
   * 获取所有注册模板总数
   */
  get size(): number {
    return this.entries.size
  }
}

// 全局单例
export const registry = new TemplateRegistry()
