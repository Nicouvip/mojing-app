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
- 对话段落：包含「」""引号内容
- 旁白/叙述段落：所有不含对话的描写、叙述、环境、心理活动等
- ⚠️ 重要：小说中旁白/叙述段落通常占全文50%以上，不要遗漏！

### 2. 对话前缀旁白分离（极其重要）
- "XXX说：""XXX道：""XXX问：""XXX喊："这类**对话前置引语属于旁白**，不要把它们归入对话
- 例如："林默低声说：「你来了。」" — 应拆分为两段：
  - 段1：type=narration, text="林默低声说：", characterName="旁白"
  - 段2：type=dialogue, text="你来了。", characterName="林默"
- 只拆分有明确引号（「」""''）的对话前缀，没有引号的保持原样

### 3. 连续同角色段落合并提示
- 旁白连续出现时，尽量合并为一个大段（不要拆成太碎的小段）
- 同一角色的连续对话合并为一个段落
- 合并后每个旁白段落控制在100-300字以内，对话段落控制在200字以内

### 4. 非语言声音识别
- 对话中出现"哈哈""呵呵""呜呜""啊""嗯""唉""嘶""啧"等，标记为 dialogue
- 标注 specialNote: "笑声"/"哭声"/"叹声"/"惊呼"等
- emotion 相应调整为开心/悲伤/惊讶

### 5. 情感分析（专业级）
- 理解有声书演播中的复合情感：
  - "压抑的愤怒"、"带着苦涩的微笑"、"强装镇定"、"久别重逢的激动"
- 每段情感标注要具体到演播时的表达方式
- emotionIntensity 范围 1-10，情感越强烈数值越大

### 6. 音色推荐
- 旁白统一推荐「冰糖」
- 年轻女性角色推荐「茉莉」
- 年轻男性角色推荐「苏打」
- 中年男性角色推荐「白桦」
- 中文无法匹配时用英文音色

### 7. 演播指导
- 语速建议（slow/normal/fast）
- 情感强度（1-10）
- 是否需要停顿（needsPause）
- 特殊处理（气声、哽咽、低语等填入 specialNote）

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
