/**
 * 有声书文本分析提示词系统
 * 
 * 基于专业有声书演播知识设计，用于驱动 DeepSeek 分析小说文本，
 * 自动识别角色、情绪、音色推荐等。
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
 * 这是核心提示词，告诉 DeepSeek 如何像专业有声书导演一样分析文本。
 */
export function buildAnalysisPrompt(text: string): string {
  return `你是一位资深的有声书演播导演，拥有20年有声书制作经验。你精通中文小说的叙事结构、角色塑造和情感表达。

请分析以下小说文本，输出结构化的 JSON 分析结果。

## 分析要求

### 1. 角色识别与段落分类（核心要求）
- 每个段落必须分类为："dialogue"（对话）或 "narration"（旁白/叙述）
- 对话段落：包含「」""引号内容或 "XX说/道/问/喊"等模式的段落
- 旁白/叙述段落：所有不含对话的描写、叙述、环境、心理活动等，type 必须为 "narration"，characterName 设为 "旁白"
- ⚠️ 重要：小说中旁白/叙述段落通常占全文50%以上，不要遗漏！每个非对话段落都必须标记为 narration

### 2. 情感分析（专业级）
不是简单的"开心/悲伤"，而是要理解有声书演播中的复合情感：
- "压抑的愤怒" ≠ 简单的"愤怒"
- "带着苦涩的微笑" = 悲伤+自嘲
- "强装镇定" = 恐惧+伪装
- "久别重逢的激动" = 开心+感动+怀念

每段情感标注要具体到演播时的表达方式。

### 3. 音色推荐
根据角色特征推荐最匹配的音色：
- 角色性格 → 音色风格匹配
- 角色年龄 → 音色年龄匹配
- 角色性别 → 音色性别匹配

### 4. 演播指导
每段文本标注：
- 语速建议（快/中/慢）
- 情感强度（1-10，10最强烈）
- 是否需要停顿
- 是否需要特殊处理（如气声、哽咽等）

## 可用音色
${AVAILABLE_VOICES.map(v => `- ${v.id}：${v.style}（${v.gender}/${v.age}）`).join('\n')}

## 可用情绪
${EMOTION_PRESETS.map(e => `- ${e.id}：${e.description}`).join('\n')}

## 输出格式
请严格按照以下 JSON 格式输出，不要添加任何其他文字：

\`\`\`json
{
  "characters": [
    {
      "name": "角色名",
      "gender": "male/female",
      "age": "child/young/adult/elderly",
      "personality": "性格特征简述",
      "recommendedVoice": "推荐的音色ID",
      "recommendedEmotion": "默认情绪标签"
    }
  ],
  "segments": [
    {
      "index": 0,
      "type": "narration/dialogue",
      "text": "原文内容",
      "characterName": "角色名（对话时）",
      "emotion": "情绪标签",
      "emotionIntensity": 7,
      "recommendedVoice": "推荐音色ID",
      "speed": "slow/normal/fast",
      "needsPause": false,
      "pauseAfter": "normal/long/short",
      "specialNote": "特殊演播指导（如有）"
    }
  ],
  "narrationStyle": {
    "overallTone": "整体叙事风格（如：沉稳/轻松/紧张/抒情）",
    "suggestedNarratorVoice": "旁白推荐音色",
    "pacing": "整体节奏（slow/normal/fast）"
  }
}
\`\`\`

## 待分析文本

${text}`
}

/**
 * 构建音色重新匹配提示词（用于用户修改角色特征后重新推荐）
 */
export function buildRematchPrompt(characterName: string, personality: string): string {
  return `你是一位有声书音色顾问。请根据以下角色特征，从可用音色中推荐最匹配的3个音色。

角色：${characterName}
性格特征：${personality}

可用音色：
${AVAILABLE_VOICES.map(v => `- ${v.id}：${v.style}（${v.gender}/${v.age}）`).join('\n')}

请输出 JSON 格式：
\`\`\`json
{
  "recommendations": [
    { "voiceId": "音色ID", "reason": "推荐理由" }
  ]
}
\`\`\``
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
