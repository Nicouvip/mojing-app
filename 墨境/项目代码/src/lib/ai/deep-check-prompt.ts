// ============================================================
// AI 深度检测 · Prompt 模板
// v2 — 支持单项和批量两种模式
// 每项可配置独立的 temperature 和采样策略
// ============================================================

export interface DeepCheckPrompt {
  id: number
  name: string
  temperature: number
  sampleMode: 'head' | 'spread'
  systemPrompt: string
  userTemplate: string
}

export const DEEP_CHECK_PROMPTS: DeepCheckPrompt[] = [
  { id: 8,  name: '旁白比例', temperature: 0.3, sampleMode: 'spread', systemPrompt: '你是一个专业的小说编辑，擅长分析叙事节奏。只输出 JSON。', userTemplate: '分析以下小说段落的旁白与对话比例，判断是否均衡。\n1. 旁白占比是否过高或过低（理想范围 40-70%）\n2. 是否有连续大段旁白没有对话打断\n3. 对话是否自然地融入叙事\n\n格式: { "status": "pass|warning|fail", "reason": "...", "detail": "..." }\n\n---段落开始---\n{{text}}\n---段落结束---' },
  { id: 9,  name: '角色驱动', temperature: 0.4, sampleMode: 'head', systemPrompt: '你是一个专业的小说编辑，擅长分析角色动机。只输出 JSON。', userTemplate: '分析情节推进方式。\n1. 情节由角色主动选择推动还是被动发生？\n2. 角色行动是否符合其性格和动机？\n3. 是否有"剧情需要所以这样做"的生硬感？\n\n格式: { "status": "pass|warning|fail", "reason": "...", "detail": "..." }\n\n---段落开始---\n{{text}}\n---段落结束---' },
  { id: 12,  name: '大白话测试', temperature: 0.5, sampleMode: 'head', systemPrompt: '你是一个专业的小说编辑，擅长判断文本朗读感。只输出 JSON。', userTemplate: '判断是否"经得起读出声"。\n1. 句子是否太长太绕？\n2. 是否有过于书面化的表达？\n3. 整体语感是否自然流畅？\n\n格式: { "status": "pass|warning|fail", "reason": "...", "detail": "..." }\n\n---段落开始---\n{{text}}\n---段落结束---' },
  { id: 13,  name: '口语化', temperature: 0.5, sampleMode: 'head', systemPrompt: '你是一个专业的小说编辑，擅长分析叙述语感。只输出 JSON。', userTemplate: '分析叙述语感。\n1. 叙事者是"贴着角色"还是"高高在上"？\n2. 语言风格是否符合故事氛围？\n3. 有没有过于正式或过于随意的表达？\n\n格式: { "status": "pass|warning|fail", "reason": "...", "detail": "..." }\n\n---段落开始---\n{{text}}\n---段落结束---' },
  { id: 14,  name: '因果顺序', temperature: 0.3, sampleMode: 'head', systemPrompt: '你是一个专业的小说编辑，擅长分析叙事逻辑。只输出 JSON。', userTemplate: '分析因果顺序是否合理。\n1. 读者是否能理解"因为…所以…"的逻辑？\n2. 事件前后顺序是否清晰？\n3. 是否有"先果后因"的倒置叙事？\n\n格式: { "status": "pass|warning|fail", "reason": "...", "detail": "..." }\n\n---段落开始---\n{{text}}\n---段落结束---' },
  { id: 16,  name: '视角一致性', temperature: 0.3, sampleMode: 'spread', systemPrompt: '你是一个专业的小说编辑，擅长分析叙事视角。只输出 JSON。', userTemplate: '分析叙事视角是否一致。\n1. 是否有稳定的叙事视角？\n2. 是否出现当前视角角色不可能知道的信息？\n3. 如有越界，请指出具体位置。\n\n格式: { "status": "pass|warning|fail", "reason": "...", "detail": "..." }\n\n---段落开始---\n{{text}}\n---段落结束---' },
  { id: 17,  name: '角色一致性', temperature: 0.4, sampleMode: 'spread', systemPrompt: '你是一个专业的小说编辑，擅长分析角色行为逻辑。只输出 JSON。', userTemplate: '分析角色行为是否符合性格设定。\n1. 角色言行是否与其一贯性格一致？\n2. 是否有"为剧情服务而OOC"的行为？\n3. 情感反应是否合理？\n\n格式: { "status": "pass|warning|fail", "reason": "...", "detail": "..." }\n\n---段落开始---\n{{text}}\n---段落结束---' },
  { id: 18,  name: '时间线一致性', temperature: 0.3, sampleMode: 'spread', systemPrompt: '你是一个专业的小说编辑，擅长分析时间线。只输出 JSON。', userTemplate: '分析时间线是否连贯。\n1. 时间标记是否清晰？\n2. 事件先后顺序是否违反常识？\n3. 是否有时间跳跃但没有过渡？\n\n格式: { "status": "pass|warning|fail", "reason": "...", "detail": "..." }\n\n---段落开始---\n{{text}}\n---段落结束---' },
  { id: 19,  name: '节奏均衡', temperature: 0.4, sampleMode: 'spread', systemPrompt: '你是一个专业的小说编辑，擅长分析段落节奏。只输出 JSON。', userTemplate: '分析节奏感。\n1. 快慢段落是否交替合理？\n2. 是否有连续多段高强度紧张没有缓解？\n3. 是否有连续多段平缓叙述没有起伏？\n\n格式: { "status": "pass|warning|fail", "reason": "...", "detail": "..." }\n\n---段落开始---\n{{text}}\n---段落结束---' },
  { id: 20,  name: '心理描写合理性', temperature: 0.4, sampleMode: 'head', systemPrompt: '你是一个专业的小说编辑，擅长分析心理描写。只输出 JSON。', userTemplate: '分析心理描写是否自然。\n1. 心理描写是否贴合当前情境？\n2. 角色此刻有时间和心境做这种内心活动吗？\n3. 心理描写的长度和深度是否合理？\n\n格式: { "status": "pass|warning|fail", "reason": "...", "detail": "..." }\n\n---段落开始---\n{{text}}\n---段落结束---' },
  { id: 21,  name: '句式多样性', temperature: 0.3, sampleMode: 'head', systemPrompt: '你是一个专业的小说编辑，擅长分析句式变化。只输出 JSON。', userTemplate: '分析句式是否多样。\n1. 是否有连续多句相同句式开头？\n2. 长句短句是否有交替？\n3. 整体读起来是否单调？\n\n格式: { "status": "pass|warning|fail", "reason": "...", "detail": "..." }\n\n---段落开始---\n{{text}}\n---段落结束---' },
  { id: 22,  name: '叙事速度', temperature: 0.4, sampleMode: 'spread', systemPrompt: '你是一个专业的小说编辑，擅长分析叙事速度。只输出 JSON。', userTemplate: '分析叙事速度是否合理。\n1. 重要场景是否被匆匆带过？\n2. 过渡段落是否被过度渲染？\n3. 有应该放慢或加快的地方吗？\n\n格式: { "status": "pass|warning|fail", "reason": "...", "detail": "..." }\n\n---段落开始---\n{{text}}\n---段落结束---' }
]

/** 优先读 localStorage，fallback 到硬编码常量 */
export function loadPrompts(): DeepCheckPrompt[] {
  if (typeof window === 'undefined') return DEEP_CHECK_PROMPTS
  try {
    const raw = localStorage.getItem('mojing_deep_check_prompts')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return DEEP_CHECK_PROMPTS
}

export function getCheckIds(): number[] {
  return loadPrompts().map(p => p.id)
}

export const AI_CHECK_IDS = getCheckIds()

export function getPromptById(id: number, prompts?: DeepCheckPrompt[]): DeepCheckPrompt | undefined {
  return (prompts || loadPrompts()).find(p => p.id === id)
}

export function extractSample(text: string, mode: 'head' | 'spread', maxChars: number = 2000): string {
  const clean = text.trim()
  if (clean.length <= maxChars) return clean
  if (mode === 'head') return clean.slice(0, maxChars)
  const third = Math.floor(clean.length / 3)
  const sampleSize = Math.floor(maxChars / 3)
  return '[开头]\n' + clean.slice(0, sampleSize) + '\n\n[中间]\n' + clean.slice(third, third + sampleSize) + '\n\n[结尾]\n' + clean.slice(-sampleSize)
}

export function buildBatchPrompt(text: string, prompts?: DeepCheckPrompt[]): { systemPrompt: string; userPrompt: string } {
  const sample = extractSample(text, 'spread', 2500)
  const dims = (prompts || loadPrompts()).map(p => p.id + '. ' + p.name).join('\n')
  return {
    systemPrompt: '你是一个专业的小说编辑。只输出 JSON，不要任何额外说明。',
    userPrompt: [
      '分析以下小说段落在多个维度上的表现。',
      '对每个维度给出 pass/warning/fail 的判断和一句话理由。',
      '',
      '维度列表：',
      dims,
      '',
      '请严格按以下 JSON 格式输出，不要包含任何其他文字：',
      '{',
      '  "results": [',
      '    { "id": 8, "status": "pass|warning|fail", "reason": "...", "detail": "..." },',
      '    ...',
      '  ]',
      '}',
      '',
      '文本：',
      '---段落开始---',
      sample,
      '---段落结束---',
    ].join('\n'),
  }
}