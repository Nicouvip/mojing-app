// ============================================================
// 墨境提示词系统 — 合规规则同步层
// 功能：单一数据源，同时供给 compliance.ts（检测引擎）和 iron-rules.ts（提示词铁律）
// 版本：v1.0.0
// ============================================================

// ===== A类·递进判断句模式 =====
export const A_CLASS_PATTERNS = [
  /不是[^，。]*是[^，。]*/g,
  /不是[^，。]*而是[^，。]*/g,
  /不仅是[^，。]*更是[^，。]*/g,
] as const

export const A_CLASS_DESCRIPTION = '递进判断句（不是……而是、不仅是……更是等）'

// ===== B类·常规禁用词 =====
export const B_CLASS_WORDS = [
  '突然', '突然之间', '猛地一下子',
  '感觉', '觉得', '想',
  '非常', '很', '特别', '极其', '十分',
  '正在', '开始',
  '看见', '听见', '闻到', '感觉到',
] as const

export const B_CLASS_DESCRIPTION = '弱化词（突然、感觉、非常、正在等）'

// ===== C类·连接词（慎用，非禁用） =====
export const C_CLASS_WORDS = ['然后', '于是', '就'] as const

export const C_CLASS_DESCRIPTION = '连接词（然后、于是、就 — 慎用）'

// ===== D类·AI 高频词 =====
export const D_CLASS_WORDS = [
  '仿佛', '如同', '似乎', '宛若', '恰似',
  '既……又', '既', '又',
  '这个世界', '某种', '一切都在',
  '不禁', '不由', '不知不觉',
  '逐渐', '渐渐', '慢慢',
  '或许', '也许', '大概',
] as const

export const D_CLASS_DESCRIPTION = 'AI高频词（仿佛、如同、似乎、不禁等）'

// ============================================================
// P0-8: AI高频词汇五类（详细分类）
// 源规则：KB5「A-2禁用词完整版 · AI高频词汇五类」
// ============================================================

/** 第一类：实词（全章≤3次） */
export const AI_FREQ_CLASS_1 = [
  '赋能', '打造', '至关重要', '深入探讨', '凸显',
  '标志着', '展现了', '体现了', '反映了', '象征着',
  '具有里程碑意义', '扮演', '角色', '作为', '充当',
] as const

/** 第二类：应删除的表达 */
export const AI_FREQ_CLASS_2 = [
  '值得注意的是', '在一定程度上', '为了更好地', '在某种程度上',
  '毋庸置疑', '众所周知',
] as const

/** 第三类：应替换的表达 */
export const AI_FREQ_CLASS_3 = [
  '未来可期', '前景一片光明', '迈出了坚实的一步', '开启新的篇章',
] as const

/** 第四类：系动词回避（应简化为"是"） */
export const AI_FREQ_CLASS_4_PATTERNS = [
  { pattern: /作为[^，。]*存在/g, replacement: '是' },
  { pattern: /充当[^，。]*角色/g, replacement: '是' },
  { pattern: /扮演着[^，。]*的角色/g, replacement: '是' },
] as const

/** 第五类：应标记章末处理的表达 */
export const AI_FREQ_CLASS_5 = [
  '业内人士认为', '有观点指出', '据悉', '据相关人士透露',
] as const

/** AI高频词检测结果 */
export interface AIFreqCheckResult {
  /** 第一类使用次数（限制≤3次） */
  class1Count: number
  /** 第一类违规词列表 */
  class1Words: string[]
  /** 第二类应删除的表达 */
  class2Found: string[]
  /** 第三类应替换的表达 */
  class3Found: string[]
  /** 第四类系动词回避 */
  class4Found: Array<{ original: string; replacement: string }>
  /** 第五类应标记章末处理 */
  class5Found: string[]
  /** 是否合规（第一类≤3次且无第二类） */
  compliant: boolean
}

/**
 * AI高频词五类检测
 * @param text 文本
 * @returns 检测结果
 */
export function checkAIFreqWords(text: string): AIFreqCheckResult {
  // 第一类检测
  let class1Count = 0
  const class1Words: string[] = []
  for (const word of AI_FREQ_CLASS_1) {
    const regex = new RegExp(word, 'g')
    const matches = text.match(regex)
    if (matches) {
      class1Count += matches.length
      if (!class1Words.includes(word)) class1Words.push(word)
    }
  }

  // 第二类检测
  const class2Found: string[] = []
  for (const word of AI_FREQ_CLASS_2) {
    if (text.includes(word)) class2Found.push(word)
  }

  // 第三类检测
  const class3Found: string[] = []
  for (const word of AI_FREQ_CLASS_3) {
    if (text.includes(word)) class3Found.push(word)
  }

  // 第四类检测
  const class4Found: Array<{ original: string; replacement: string }> = []
  for (const { pattern, replacement } of AI_FREQ_CLASS_4_PATTERNS) {
    const matches = text.match(pattern)
    if (matches) {
      for (const match of matches) {
        class4Found.push({ original: match, replacement })
      }
    }
  }

  // 第五类检测
  const class5Found: string[] = []
  for (const word of AI_FREQ_CLASS_5) {
    if (text.includes(word)) class5Found.push(word)
  }

  return {
    class1Count,
    class1Words,
    class2Found,
    class3Found,
    class4Found,
    class5Found,
    compliant: class1Count <= 3 && class2Found.length === 0,
  }
}

// ===== 动作后解释连接词 =====
export const EXPLANATION_WORDS = [
  '因为', '所以', '原来', '他意识到', '这意味着',
  '这让他感到', '他觉得', '他明白', '他清楚', '显然', '无疑',
] as const

export const EXPLANATION_DESCRIPTION = '动作后解释词（因为、所以、原来等）'

// ===== 身体动作句关键词 =====
export const BODY_ACTION_WORDS = [
  '手', '脚', '腿', '头', '眼', '嘴', '口', '脸', '肩', '背', '腰',
  '走', '跑', '跳', '站', '坐', '躺', '握', '拍', '推', '拉', '打',
  '看', '望', '盯', '瞥', '瞪', '眯', '眨',
  '笑', '哭', '叹', '咬', '握', '攥', '敲', '指', '抬', '低', '转',
  '皱眉', '攥紧', '颤抖', '点头', '摇头', '低头', '抬头', '转身',
  '后退', '上前', '靠近', '退开', '蹲下', '起身',
  '伸出', '收回', '捂住', '按住', '撑住', '扶住',
] as const

export const BODY_DESCRIPTION = '身体动作词'

// ===== 精致句标识词（用于精致句密度检测） =====
export const REFINED_WORD_INDICATORS = [
  '像', '如同', '仿佛', '宛若', '恰似',
  '似', '般', '一般', '一样',
  '犹如', '好比',
] as const

export const REFINED_DESCRIPTION = '精致句指示词（比喻/修辞标记）'

// ===== AI 高频词正则（用于 D 类检测） =====
// 排除 '既' 和 '又' 单独出现（只检测 "既……又" 搭配）
export const D_CLASS_CHECK_WORDS = D_CLASS_WORDS.filter(w => w !== '既' && w !== '又')

// ===== 生成 A-2 禁用词提醒文本（自动从数据源生成） =====
export function generateForbiddenWordsReminder(): string {
  const bWords = B_CLASS_WORDS.join('、')
  const dWords = D_CLASS_CHECK_WORDS.join('、')
  return `【A-2 禁用词提醒】
- 不使用：${bWords}
- 不使用：看见、听见、闻到、感觉到
- 慎用：${C_CLASS_WORDS.join('、')}
- 不使用AI高频词：${dWords}`
}

// ===== 各检测项名称映射（用于输出报告） =====
export const CHECK_NAMES: Record<string, string> = {
  forbiddenA: 'A类（递进判断句）',
  forbiddenB: 'B类（弱化词）',
  forbiddenC: 'C类（连接词超限）',
  forbiddenD: 'D类（AI高频词）',
  explanationAfterAction: '动作后解释',
  refinedDensity: '精致句密度',
  bodyDensity: '身体密度',
  openingHook: '开篇55字钩子',
}

// ============================================================
// P0-6: 自然表达替换速查表（20组）
// 源规则：KB5「工具R：自然表达替换速查表」
// 用于润色时自动替换AI味表达
// ============================================================

export interface ExpressionReplacement {
  /** AI味表达 */
  aiExpression: string
  /** 自然表达 */
  naturalExpression: string
  /** 使用场景说明 */
  context?: string
}

export const EXPRESSION_REPLACEMENTS: ExpressionReplacement[] = [
  {
    aiExpression: '他深吸一口气，语气里带着质问',
    naturalExpression: '他瞪了我一眼',
    context: '质问场景',
  },
  {
    aiExpression: '心里一阵委屈',
    naturalExpression: '委屈地咬着唇',
    context: '委屈情绪',
  },
  {
    aiExpression: '径直朝我走来',
    naturalExpression: '走了过来',
    context: '走动描写',
  },
  {
    aiExpression: '语气里透着一丝无奈',
    naturalExpression: '叹了口气',
    context: '无奈情绪',
  },
  {
    aiExpression: '眼中闪过一丝慌乱',
    naturalExpression: '眼神躲了一下',
    context: '慌乱情绪',
  },
  {
    aiExpression: '嘴角勾起一抹冷笑',
    naturalExpression: '嘴角动了一下，没笑出来',
    context: '冷笑场景',
  },
  {
    aiExpression: '他的声音里带着颤抖',
    naturalExpression: '声音发紧',
    context: '紧张/害怕',
  },
  {
    aiExpression: '内心涌起一股暖流',
    naturalExpression: '胸口热了一下',
    context: '温暖情绪',
  },
  {
    aiExpression: '心中升起不祥的预感',
    naturalExpression: '后背一凉',
    context: '预感危险',
  },
  {
    aiExpression: '他的目光深邃而复杂',
    naturalExpression: '他看了我一眼，没说话',
    context: '复杂情绪',
  },
  {
    aiExpression: '透着一股说不清道不明的情绪',
    naturalExpression: '脸上没有表情，手指却收紧了',
    context: '复杂情绪',
  },
  {
    aiExpression: '气氛凝重得让人窒息',
    naturalExpression: '没人说话。呼吸声都听得见',
    context: '紧张氛围',
  },
  {
    aiExpression: '他的背影显得格外孤独',
    naturalExpression: '他转过身，肩膀往下塌了一寸',
    context: '孤独情绪',
  },
  {
    aiExpression: '瞬间明白了什么',
    naturalExpression: '手指顿了一下',
    context: '顿悟场景',
  },
  {
    aiExpression: '心中暗暗发誓',
    naturalExpression: '咬了咬牙',
    context: '决心场景',
  },
  {
    aiExpression: '一股无名火涌上心头',
    naturalExpression: '后槽牙咬紧了',
    context: '愤怒情绪',
  },
  {
    aiExpression: '内心挣扎了许久',
    naturalExpression: '站了很久，脚边积了一圈踩灭的烟灰',
    context: '挣扎场景',
  },
  {
    aiExpression: '终于下定决心',
    naturalExpression: '把茶碗搁下，碗底磕出一声脆响',
    context: '决心场景',
  },
  {
    aiExpression: '仿佛在思考什么',
    naturalExpression: '转着手里那只杯子，没说话',
    context: '思考场景',
  },
  {
    aiExpression: '脸上写满了疲惫',
    naturalExpression: '眼底一片青灰',
    context: '疲惫状态',
  },
]

/**
 * 获取自然表达替换表的简要说明（用于prompt注入）
 */
export function getReplacementSummary(): string {
  return `【自然表达替换速查表（20组）】
润色时自动替换以下AI味表达为身体动作：
${EXPRESSION_REPLACEMENTS.slice(0, 5).map(r => `- "${r.aiExpression}" → "${r.naturalExpression}"`).join('\n')}
...（共20组，详见 compliance-sync.ts）

核心原则：用身体动作/生理反应替代情绪描写和心理旁白。`
}

// ============================================================
// P2-9: 深度感替代 D-1~D-10
// 源规则：KB4「工具U：深度感替代方法」
// 10种打破AI叙事平庸感的技法
// ============================================================

/** 深度感替代方法 */
export type DepthMethod =
  | 'D1'   // 身体反应链
  | 'D2'   // 微环境锚定
  | 'D3'   // 感官错位
  | 'D4'   // 物心转换
  | 'D5'   // 未完成动作
  | 'D6'   // 时间拉伸
  | 'D7'   // 空间压缩
  | 'D8'   // 多线程感官
  | 'D9'   // 隐藏因果
  | 'D10'  // 意象锚定

/** 深度感替代配置 */
export interface DepthMethodConfig {
  id: DepthMethod
  name: string
  desc: string
  example: string
}

/** 深度感替代10种配置 */
export const DEPTH_METHODS: DepthMethodConfig[] = [
  {
    id: 'D1',
    name: '身体反应链',
    desc: '用一连串身体细微变化构成段落',
    example: '他先是手指收紧，然后肩膀下沉，最后整个人像被抽走了骨头',
  },
  {
    id: 'D2',
    name: '微环境锚定',
    desc: '将情感投射到极小的环境细节（灰尘/水渍等）',
    example: '桌上的水渍慢慢洇开，像他此刻的心情',
  },
  {
    id: 'D3',
    name: '感官错位',
    desc: '用非对应的感官描写（如"听见颜色"）制造陌生化',
    example: '他听见了红色——刺耳的、像警报一样的红',
  },
  {
    id: 'D4',
    name: '物心转换',
    desc: '通过物品的状态变化反映内心',
    example: '那支烟烧到了尽头，烫到了他的手指，他才回过神来',
  },
  {
    id: 'D5',
    name: '未完成动作',
    desc: '描写一个进行到一半被打断的动作，留下悬念',
    example: '他张了张嘴，想说什么，但最终什么都没说',
  },
  {
    id: 'D6',
    name: '时间拉伸',
    desc: '将极短的瞬间拉长，放大细节',
    example: '那一秒仿佛被拉长了十倍——他看见子弹穿过空气，看见尘埃在光柱中飞舞',
  },
  {
    id: 'D7',
    name: '空间压缩',
    desc: '把大空间浓缩为几个关键细节快速掠过',
    example: '整座城市在他眼里缩小成三个点：家、公司、医院',
  },
  {
    id: 'D8',
    name: '多线程感官',
    desc: '同时写2-3条感官线，制造沉浸感',
    example: '他闻到了咖啡的香气，听见了雨打窗户的声音，感觉到了指尖的冰凉',
  },
  {
    id: 'D9',
    name: '隐藏因果',
    desc: '只写现象不写原因，读者自己拼凑',
    example: '他开始每天准时出门，准时回来，但从不说去了哪里',
  },
  {
    id: 'D10',
    name: '意象锚定',
    desc: '全章用一个核心意象串联',
    example: '那盏路灯从开篇亮到结尾，见证了一切',
  },
]

/**
 * 获取深度感替代方法配置
 */
export function getDepthMethod(id: DepthMethod): DepthMethodConfig | undefined {
  return DEPTH_METHODS.find(m => m.id === id)
}

/**
 * 格式化深度感替代方法为文本
 */
export function formatDepthMethod(method: DepthMethodConfig): string {
  return `【${method.id} ${method.name}】${method.desc}
例：${method.example}`
}

/**
 * 格式化所有深度感替代方法为速查表
 */
export function formatDepthMethodsIndex(): string {
  return DEPTH_METHODS
    .map(m => `- ${m.id} ${m.name}：${m.desc}`)
    .join('\n')
}
