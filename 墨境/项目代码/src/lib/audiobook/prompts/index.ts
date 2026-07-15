/**
 * 有声书文本分析提示词系统
 * 结构化 Prompt：规则清晰稳定，角色-音色绑定固定
 * 输出严格 JSON 格式
 */

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

export function buildAnalysisPrompt(text: string): string {
  return `你是一位专业的有声书演播导演。请分析以下小说文本，输出 JSON 格式的分析结果。

## 分析规则

### 1. 角色识别
- 找出文本中所有角色（说话者），包括"旁白"作为叙述者
- 分析每个角色的性别、年龄段、性格特征

### 2. 段落分类
- 每段标记为 narration（旁白/叙述）或 dialogue（对话）
- 对话：引号「」""''内的内容
- 旁白：所有非对话的描写、叙述、环境、心理活动
- 注意："XX说/道/问/喊/低声说："等对话前缀属于旁白，不是对话

### 3. 情感分析
- 深入理解文本的情感，不只看表面词汇
- 关注复合情感：压抑的愤怒、强装镇定、苦涩的微笑等
- 情感强度 1-10（越强烈数值越大）

### 4. 音色匹配（固定规则）
- 旁白 → 「冰糖」
- 年轻女性角色 → 「茉莉」
- 年轻男性角色 → 「苏打」
- 中年男性角色 → 「白桦」
- 英文角色 → 对应的英文音色

### 5. 段落合并
- 连续旁白合并为一个大段（不超过300字）
- 同一角色连续对话合并为一段（不超过200字）

### 6. 演播指导
- 语速建议（slow/normal/fast）
- 是否需要停顿（needsPause）
- 特殊处理（气声、哽咽、低语等填入 specialNote）

## 参考
音色：${AVAILABLE_VOICES.map(v => `- ${v.id}：${v.style}`).join('\n')}
情绪：${EMOTION_PRESETS.map(e => `- ${e.id}：${e.description}`).join('\n')}

## 输出（纯 JSON，不加任何其他文字）
{"characters":[{"name":"","gender":"male/female","age":"child/young/adult/elderly","personality":"","recommendedVoice":"","recommendedEmotion":""}],"segments":[{"index":0,"type":"narration/dialogue","text":"","characterName":"","emotion":"","emotionIntensity":5,"recommendedVoice":"","speed":"slow/normal/fast","needsPause":false,"pauseAfter":"short/normal/long","specialNote":""}],"narrationStyle":{"overallTone":"","suggestedNarratorVoice":"","pacing":"slow/normal/fast"}}

## 文本
${text}`
}

export function buildRematchPrompt(characterName: string, personality: string): string {
  return `从以下音色中为角色推荐最匹配的3个。

角色：${characterName}
性格：${personality}

音色：${AVAILABLE_VOICES.map(v => `- ${v.id}：${v.style}`).join('\n')}

输出 JSON：{"recommendations":[{"voiceId":"","reason":""}]}`
}

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
