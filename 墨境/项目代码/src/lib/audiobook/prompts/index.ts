/**
 * 有声书文本分析提示词系统
 * 对话式 Prompt 设计：让 AI 用自己的理解能力分析，而非死记规则
 */

/** MiMo 可用音色列表（供 AI 匹配） */
export const AVAILABLE_VOICES = [
  { id: '冰糖', name: '冰糖', gender: 'female', age: 'young', style: '甜美女声，温暖柔和，适合旁白和温柔角色', tags: ['旁白', '温柔', '甜美'] },
  { id: '茉莉', name: '茉莉', gender: 'female', age: 'young', style: '温柔女声，细腻感性，适合对话和内心独白', tags: ['对话', '温柔', '细腻'] },
  { id: '苏打', name: '苏打', gender: 'male', age: 'young', style: '阳光男声，清朗明快，适合青年角色', tags: ['对话', '阳光', '青年'] },
  { id: '白桦', name: '白桦', gender: 'male', age: 'adult', style: '沉稳男声，浑厚有力，适合中年角色和严肃旁白', tags: ['对话', '沉稳', '中年', '旁白'] },
  { id: 'Mia', name: 'Mia', gender: 'female', age: 'young', style: 'English female, sweet and clear', tags: ['English', 'female'] },
  { id: 'Chloe', name: 'Chloe', gender: 'female', age: 'adult', style: 'English female, gentle and warm', tags: ['English', 'female'] },
  { id: 'Milo', name: 'Milo', gender: 'male', age: 'young', style: 'English male, warm and friendly', tags: ['English', 'male'] },
  { id: 'Dean', name: 'Dean', gender: 'male', age: 'adult', style: 'English male, deep and authoritative', tags: ['English', 'male'] },
] as const

/** MiMo 情绪标签 */
export const EMOTION_PRESETS = [
  { id: '平静', label: '平静', description: '不带明显情绪的正常叙述' },
  { id: '开心', label: '开心', description: '愉悦、满足、高兴' },
  { id: '悲伤', label: '悲伤', description: '难过、失落、哀伤' },
  { id: '愤怒', label: '愤怒', description: '生气、恼怒、暴躁' },
  { id: '恐惧', label: '恐惧', description: '害怕、惊恐、不安' },
  { id: '温柔', label: '温柔', description: '轻柔、体贴、关爱' },
  { id: '严肃', label: '严肃', description: '庄重、认真、郑重' },
  { id: '冷漠', label: '冷漠', description: '淡漠、疏离、不在意' },
  { id: '惊讶', label: '惊讶', description: '意外、震惊、吃惊' },
] as const

/**
 * 构建文本分析提示词
 * 
 * 对话式设计原则：
 * - 用自然语言描述任务，不要列死规则
 * - 给 AI 自主判断空间（音色选择、段落拆分）
 * - 让 AI "用心理解"文本，而不是"严格遵循规则"
 * - 只提供必要的参考信息（音色列表、情绪列表）
 */
export function buildAnalysisPrompt(text: string): string {
  return `你是一位专业的有声书演播导演。请仔细阅读以下小说文本，用你的专业判断来分析它。

你需要理解这个文本的故事、角色、情感和氛围，然后做以下事情：

1. **找出所有角色**——包括旁白这个"叙述者"。分析每个角色的性别、年龄段、性格特征
2. **把文本拆成段落**——每个段落标记为"旁白叙述"还是"角色对话"
3. **分析情感**——不只看表面文字，理解背后的情感。比如"她笑着流泪"不是简单的开心，是复杂的悲喜交织
4. **推荐音色**——根据角色的性别、年龄、性格，从可用音色中选最合适的
5. **给出演播建议**——情绪怎么读、语速快慢、要不要停顿、有没有特殊处理

一些参考（但不要死记，用你的直觉判断）：
- 对话通常在引号（「」""''）里
- "XX说/道/问/喊："这类前缀属于旁白
- 旁白连着时可以合并成大段
- 不同角色说话切换时需要停顿
- "哈哈""呜呜""唉"等语气词，标一下是什么声音

**最重要的：用你的专业直觉去理解这个文本。每个文本都是独特的，用心感受它，不要机械套规则。**

## 参考信息
可用音色：${AVAILABLE_VOICES.map(v => `- ${v.id}：${v.style}（${v.gender}/${v.age}）`).join('\n')}
可用情绪：${EMOTION_PRESETS.map(e => `- ${e.id}：${e.description}`).join('\n')}

## 输出 JSON
{
  "characters": [{"name":"角色名","gender":"male/female","age":"child/young/adult/elderly","personality":"性格描述","recommendedVoice":"音色ID","recommendedEmotion":"情绪标签"}],
  "segments": [{"index":0,"type":"narration/dialogue","text":"原文","characterName":"角色名","emotion":"情绪","emotionIntensity":5,"recommendedVoice":"音色ID","speed":"slow/normal/fast","needsPause":false,"specialNote":""}],
  "narrationStyle":{"overallTone":"整体风格","suggestedNarratorVoice":"旁白音色","pacing":"slow/normal/fast"}
}

## 文本
${text}`
}

/** 构建音色重新匹配提示词（用于用户修改角色特征后重新推荐） */
export function buildRematchPrompt(characterName: string, personality: string): string {
  return `请根据以下角色特征，从可用音色中推荐最匹配的3个音色。

角色：${characterName}
性格特征：${personality}

可用音色：${AVAILABLE_VOICES.map(v => `- ${v.id}：${v.style}（${v.gender}/${v.age}）`).join('\n')}

输出 JSON：
{"recommendations": [{"voiceId":"音色ID","reason":"推荐理由"}]}`
}

/** 分析结果的类型定义 */
export interface CharacterAnalysis {
  name: string
  gender: 'male' | 'female'
  age: 'child' | 'young' | 'adult' | 'elderly'
  personality: string
  recommendedVoice: string
  recommendedEmotion: string
}

export interface SegmentAnalysis {
  index: number
  type: 'narration' | 'dialogue'
  text: string
  characterName?: string
  emotion: string
  emotionIntensity: number
  recommendedVoice: string
  speed: 'slow' | 'normal' | 'fast'
  needsPause: boolean
  pauseAfter: 'short' | 'normal' | 'long'
  specialNote?: string
}

export interface NarrationStyle {
  overallTone: string
  suggestedNarratorVoice: string
  pacing: 'slow' | 'normal' | 'fast'
}

export interface AnalysisResult {
  characters: CharacterAnalysis[]
  segments: SegmentAnalysis[]
  narrationStyle: NarrationStyle
}
