/**
 * 连续段落合并工具
 * 
 * 在 AI 分析完成后，对段落进行智能合并：
 * 1. 连续旁白合并 — 多条连续的 narration 合并为一条
 * 2. 同角色连续对话合并 — 同一角色连续多条 dialogue 合并为一条
 * 3. 对话前缀旁白分离 — "XXX说：" 从对话文本中分离出来，归入旁白
 */

import type { SegmentAnalysis, CharacterAnalysis } from './prompts'

/**
 * 合并连续的旁白和同角色对话
 * 
 * 规则：
 * - 连续 narration → 合并为一段（总长度控制在 300 字以内）
 * - 同一角色连续 dialogue → 合并为一段（总长度控制在 200 字以内）
 * - 不同角色或 narration/dialogue 切换时重新起段
 */
export function mergeConsecutiveSegments(
  segments: SegmentAnalysis[],
  characters: CharacterAnalysis[],
): { segments: SegmentAnalysis[]; characters: CharacterAnalysis[] } {
  if (segments.length === 0) return { segments, characters }

  const merged: SegmentAnalysis[] = []
  let current = { ...segments[0], text: segments[0].text }

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i]
    const isSameType = seg.type === current.type
    const isSameChar = seg.characterName === current.characterName

    // 同类型且同角色（或都是旁白）→ 合并
    const isNarrationSeq = current.type === 'narration' && seg.type === 'narration'
    const isSameDialogue = current.type === 'dialogue' && seg.type === 'dialogue' && isSameChar

    const maxLen = current.type === 'dialogue' ? 200 : 300

    if ((isNarrationSeq || isSameDialogue) && current.text.length + seg.text.length + 1 <= maxLen) {
      // 合并：用适当的分隔符
      current.text = current.text + (current.text.endsWith('。') ? '' : '。') + seg.text
      // 保留较高的情感强度
      current.emotionIntensity = Math.max(current.emotionIntensity, seg.emotionIntensity)
      // 保留特殊标注
      if (seg.specialNote && !current.specialNote) {
        current.specialNote = seg.specialNote
      }
      // 合并后需要停顿
      current.needsPause = true
    } else {
      // 不能合并，保存当前段，开始新段
      merged.push({ ...current })
      current = { ...seg, text: seg.text }
    }
  }
  // 最后一段
  merged.push({ ...current })

  // 重新编 index
  const reindex = merged.map((seg, i) => ({ ...seg, index: i }))

  return { segments: reindex, characters }
}

/**
 * 从对话文本中分离对话前缀旁白
 * 
 * 例如："林默低声说：「你来了。」" 
 *   → narration: "林默低声说："
 *   → dialogue: "你来了。"
 */
export function splitDialoguePrefix(
  segments: SegmentAnalysis[],
): SegmentAnalysis[] {
  const result: SegmentAnalysis[] = []
  let idx = 0

  for (const seg of segments) {
    if (seg.type === 'dialogue' && /[「『""''《〈]/.test(seg.text)) {
      // 查找第一个引号位置
      const quoteMatch = seg.text.match(/[「『""''《〈]/)
      if (quoteMatch && quoteMatch.index !== undefined && quoteMatch.index > 0) {
        const prefix = seg.text.slice(0, quoteMatch.index).trim()
        const dialogue = seg.text.slice(quoteMatch.index)

        if (prefix.length > 0) {
          // 前缀作为旁白
          result.push({
            index: idx++,
            type: 'narration',
            text: prefix,
            characterName: '旁白',
            emotion: seg.emotion,
            emotionIntensity: 3,
            recommendedVoice: '冰糖',
            speed: 'normal',
            needsPause: false,
            pauseAfter: 'short',
            specialNote: '对话前缀',
          })
        }

        // 清理引号，保留对话文本
        const cleanDialogue = dialogue.replace(/[「『""''《〈》〉」』]/g, '').trim()
        if (cleanDialogue.length > 0) {
          result.push({
            ...seg,
            index: idx++,
            text: cleanDialogue,
            specialNote: seg.specialNote || undefined,
          })
        }
        continue
      }
    }

    // 不需要拆分的直接保留
    result.push({ ...seg, index: idx++ })
  }

  return result
}

/**
 * 完整处理管道：前缀分离 → 连续合并
 */
export function processAnalysisResult(
  segments: SegmentAnalysis[],
  characters: CharacterAnalysis[],
): { segments: SegmentAnalysis[]; characters: CharacterAnalysis[] } {
  // Step 1: 分离对话前缀旁白
  const afterSplit = splitDialoguePrefix(segments)

  // Step 2: 合并连续段落
  const result = mergeConsecutiveSegments(afterSplit, characters)

  // Step 3: 重新编号
  result.segments = result.segments.map((seg, i) => ({ ...seg, index: i }))

  return result
}
