// ============================================================
// 墨境提示词系统 — 跨书技法库 (Cross-Book Techniques)
// 功能：32种跨书技法速查索引
// 版本：v1.0.0
// ============================================================

/** 跨书技法配置 */
export interface CrossBookTechnique {
  id: string
  name: string
  desc: string
  category: '身体' | '意象' | '悬念' | '情节' | '角色' | '节奏' | '感官' | '其他'
}

/** 跨书技法 T-001~T-032 */
export const CROSS_BOOK_TECHNIQUES: CrossBookTechnique[] = [
  // === 身体类 ===
  { id: 'T-001', name: '身体锚点', desc: '情感只通过身体表达。L1-L2可适度辅以心理描写', category: '身体' },
  { id: 'T-002', name: '意象冷却', desc: '同一意象不连续出现。冷却压力大时允许复用已冷却意象，章末标注', category: '意象' },
  { id: 'T-003', name: '悬念嵌套', desc: '宏观/中观/微观三层悬念', category: '悬念' },
  { id: 'T-004', name: '反转等级', desc: 'Lv1信息/Lv2认知/Lv3情境', category: '情节' },
  { id: 'T-005', name: '情节动词不重复', desc: '相邻情节驱动动词须异', category: '情节' },
  { id: 'T-006', name: '场景三冷却', desc: '同一场景类型≥3章后复用', category: '节奏' },
  { id: 'T-007', name: '六场景轮换', desc: 'S1-S6方法循环', category: '节奏' },
  { id: 'T-008', name: '情感颜色曲线', desc: '四色导航，避免同色连续', category: '节奏' },
  { id: 'T-009', name: '毛边保留', desc: '每章保留不解释的细节', category: '其他' },
  { id: 'T-010', name: '伏笔三态', desc: '已埋设/已回收/已废弃', category: '情节' },

  // === 角色类 ===
  { id: 'T-011', name: '不可替代瞬间', desc: '每章一个"只有此人此刻能发生"', category: '角色' },
  { id: 'T-012', name: '身体记忆卡', desc: '角色身体习惯跨章一致', category: '身体' },
  { id: 'T-013', name: '描写指纹', desc: '角色专属描写通道冷却', category: '感官' },
  { id: 'T-014', name: '句式六维度', desc: '长短句/排比/碎片/设问分布', category: '节奏' },
  { id: 'T-015', name: '读者期待管理', desc: '给期待→兑现期待→给新期待', category: '悬念' },
  { id: 'T-016', name: '情节锚点', desc: '伏笔埋设与回收追踪', category: '情节' },
  { id: 'T-017', name: '单一意图', desc: '每段只做一件事', category: '其他' },
  { id: 'T-018', name: '分层决策', desc: '卡住时从身体到情节逐层排查', category: '其他' },
  { id: 'T-019', name: '方向簇', desc: '提供多个走向打破僵局', category: '其他' },
  { id: 'T-020', name: '小脑洞', desc: '卡住时快速生成接续选项', category: '其他' },

  // === 情节类 ===
  { id: 'T-021', name: '情节功能审计', desc: '检查功能重叠与缺失', category: '情节' },
  { id: 'T-022', name: '变奏重复', desc: '同类情节必须加变奏', category: '情节' },
  { id: 'T-023', name: '感官轮换', desc: '五感不连续使用同一通道', category: '感官' },
  { id: 'T-024', name: '对话锚点', desc: '对话推进情节+塑造人物', category: '其他' },
  { id: 'T-025', name: '空间锚点', desc: '空间位移驱动叙事', category: '其他' },
  { id: 'T-026', name: '物品锚点', desc: '物品串联情节', category: '其他' },
  { id: 'T-027', name: '时间锚点', desc: '时间标记结构化叙事', category: '其他' },
  { id: 'T-028', name: '意识锚点', desc: '内心流动驱动叙事', category: '其他' },
  { id: 'T-029', name: '情节动能传递', desc: '上一章动能必须传递到下一章', category: '情节' },
  { id: 'T-030', name: '章节收束力', desc: '章末必须产生新期待/新问题/新张力', category: '悬念' },

  // === 其他 ===
  { id: 'T-031', name: '圈层痛点阶梯', desc: '普适痛点→圈层痛点→深层痛点三层递进', category: '其他' },
  { id: 'T-032', name: '绝境选择测试', desc: '用两难绝境检验角色核心价值观', category: '角色' },
]

/**
 * 获取跨书技法配置
 */
export function getCrossBookTechnique(id: string): CrossBookTechnique | undefined {
  return CROSS_BOOK_TECHNIQUES.find(t => t.id === id)
}

/**
 * 按类别获取技法列表
 */
export function getTechniquesByCategory(category: CrossBookTechnique['category']): CrossBookTechnique[] {
  return CROSS_BOOK_TECHNIQUES.filter(t => t.category === category)
}

/**
 * 格式化技法为文本
 */
export function formatTechnique(technique: CrossBookTechnique): string {
  return `【${technique.id} ${technique.name}】${technique.desc}`
}

/**
 * 格式化所有技法为速查表
 */
export function formatTechniqueIndex(): string {
  const categories = ['身体', '意象', '悬念', '情节', '角色', '节奏', '感官', '其他'] as const
  const lines: string[] = []

  for (const category of categories) {
    const techniques = getTechniquesByCategory(category)
    if (techniques.length > 0) {
      lines.push(`### ${category}类`)
      for (const t of techniques) {
        lines.push(`- ${t.id} ${t.name}：${t.desc}`)
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}
