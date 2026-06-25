// ============================================================
// 墨境提示词模板 — 扩写 (expand)
// 版本：v1.0.0
// ============================================================

import type { PromptTemplate } from '../types'

export const expandTemplate: PromptTemplate = {
  id: 'mojing-expand-v1',
  version: '1.0.0',
  name: '扩写引擎',
  description: '对选中片段进行扩写，增加细节描写，丰富画面感',
  type: 'expand',
  layers: {
    system_iron_rules: '', // 由 builder 动态注入
    function_instruction: `你是专业网文写手。请将以下片段进行扩写。

核心要求：
1. 增加细节描写——环境、动作、神态、心理四方面至少覆盖两方面
2. 丰富画面感，让读者仿佛身临其境
3. 原意保持不变，不改变核心情节走向
4. 扩写至原文的2-3倍篇幅
5. 扩写的内容必须符合前文的世界观和人物设定
6. 遵循身体优先原则：通过外部动作和环境传递信息，不直接定义情绪
7. 如果有特别要求，优先满足`,
    context_injection: `原文：
{{text}}

{{instruction}}`,
    output_constraints: `只输出扩写后的文字，不要任何解释、不要对比、不要标注"扩写后："等前缀。
扩写长度控制在原文的2-3倍。`,
  },
  defaultParams: {
    temperature: 0.7,
    maxTokens: 1536,
  },
  genres: [],
  createdAt: 0,
  updatedAt: 0,
  changelog: [
    'v1.0.0 初始版本 — 从硬编码模板迁移，增加铁律层级和结构化分层',
  ],
}
