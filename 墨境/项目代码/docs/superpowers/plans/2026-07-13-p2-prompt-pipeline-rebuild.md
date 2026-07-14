# P2: Prompt管道重建 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把100KB原始模板的规则正确注入到 prompt 的每一层，让 AI 写出来的东西有"小墨"的味道

**Architecture:** builder.ts 保持 L1-L4 四层结构不变，替换每层的内容源。新增题材参数表和风格规则模块。

**Tech Stack:** TypeScript, Supabase (localStorage 兼容)

## Global Constraints

- 不改 builder.ts 的函数签名（外部调用方不变）
- 所有新增文件放在 `src/lib/prompts/` 目录下
- TypeScript 编译零错误
- 从原始模板提取规则时，保留中文原文，不翻译

---

### Task 1: 替换 L1 铁律层（iron-rules.ts）

**Files:**
- Modify: `src/lib/prompts/iron-rules.ts`

**Interfaces:**
- Produces: `SYSTEM_IRON_RULES`（完整版铁律文本）
- Produces: `FORBIDDEN_WORDS_REMINDER`（完整版禁用词提醒）
- Produces: `EMOTION_COLOR_RULES`（不变）
- Produces: `BRAINSTORM_QUALITY_RULES`（不变）

- [ ] **Step 1: 从 V10.0.2 核心引擎提取完整铁律**

从原始模板 `# 小墨创作助手 V10.0.2 核心引擎.txt` 提取以下内容：
- A-1 全域铁律（完整版，含永远三原则 + 三不原则 + 白描原则）
- A-1.1 防守规则（完整版，含动作后禁解释 + 精致句分配 + 禁止生造比喻 + 示例防御条款）
- A-2 禁用词四类完整版（从 compliance-sync.ts 读取）
- A-3 三层红线
- 55字生死线
- 冲突强度分级 L1-L5
- 视角与叙述者原则

- [ ] **Step 2: 替换 iron-rules.ts 中的 SYSTEM_IRON_RULES**

将简化版（当前69行）替换为完整版铁律文本。完整版约 200 行，包含：
- 永远三原则详细说明
- 三不原则详细说明
- 防守规则4条完整条款（含沉默缓冲区要求）
- 风格规则优先级（零-3）
- 55字生死线规则
- 冲突强度分级规则
- 视角与叙述者原则

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
npx tsc --noEmit
```

---

### Task 2: 替换 L2 功能指令层（templates/*.ts）

**Files:**
- Modify: `src/lib/prompts/templates/continue.ts`
- Modify: `src/lib/prompts/templates/polish.ts`
- Modify: `src/lib/prompts/templates/expand.ts`
- Modify: `src/lib/prompts/templates/brainstorm.ts`

**Interfaces:**
- Produces: `continueTemplate`（完整版续写指令）
- Produces: `polishTemplate`（完整版润色指令）
- Produces: `expandTemplate`（完整版扩写指令）
- Produces: `brainstormTemplate`（完整版脑洞指令）

- [ ] **Step 1: 从 V10.0.2 提取续写指令**

从原始模板提取：
- 阶段二「本章规划」的完整规则（含预选技法、A-8状态行）
- 阶段二「正文写作」的完整规则（含第〇步防守规则查询、震撼开场引擎）
- 阶段二「禁忌」完整列表

替换 `continue.ts` 的 `function_instruction`，当前59行替换为约200行。

- [ ] **Step 2: 从 V10.0.2 提取润色指令**

从知识库「语言净化与润色规则」提取：
- 四级净化体系完整规则（词汇替换→句式优化→段落重构→场景适配）
- 自然表达替换表（20组）
- 精修质检15项
- 防守规则联动检查

替换 `polish.ts` 的 `function_instruction`，当前64行替换为约150行。

- [ ] **Step 3: 从 V10.0.2 提取扩写指令**

从原始模板提取扩写规则：
- 身体优先原则在扩写中的应用
- 五感锚定法在扩写中的应用
- 粗糙原则（精致句只放身体锚点时刻）

替换 `expand.ts` 的 `function_instruction`，当前44行替换为约100行。

- [ ] **Step 4: 验证 TypeScript 编译**

---

### Task 3: 新增题材参数表（genre-params.ts）

**Files:**
- Create: `src/lib/prompts/genre-params.ts`

**Interfaces:**
- Produces: `GENRE_PARAMS`（题材参数配置表）
- Produces: `getGenreParams(genre: string)` 函数

- [ ] **Step 1: 从知识库提取题材参数表**

从知识库「题材参数与风格指南」的「工具S：题材参数映射表」提取完整表格：
- 5种题材（通用/悬疑/都市/玄幻/言情）
- 20+参数项（55字放宽、身体密度、句号换行、连接词限制、三不原则例外、粗糙原则例外、视角切换、第六识冷却、无意义细节、B-1词汇替换强度、情感颜色偏好、收束类型偏好、场景方法偏好、金手指背景绑定、伏笔回收时限、短篇活跃伏笔上限、系统规则一致性检查、说书套话允许、弹幕体允许）

- [ ] **Step 2: 实现 genre-params.ts**

```typescript
export interface GenreParam {
  genre: string
  fiftyFiveRuleLength: number      // 55字生死线检查长度
  fiftyFiveRuleCondition: string   // 放宽条件
  bodyDensityMin: number           // L1-L2 身体密度下限
  lineBreakL3: '强制' | '建议' | '不换'
  lineBreakL4: '强制' | '建议' | '不换'
  connectiveLimit: '完全放开' | '标准' | '≤3次/章'
  emotionColorPref: string[]       // 情感颜色偏好
  endingTypePref: string[]         // 收束类型偏好
  sceneMethodPref: string[]        // 场景方法偏好
  meaninglessDetails: number       // 每章无意义要细节数
  foreshadowMajorLimit: number     // 重要伏笔回收时限
  foreshadowMinorLimit: number     // 次要伏笔回收时限
}

export const GENRE_PARAMS: Record<string, GenreParam> = {
  '通用': { ... },
  '悬疑': { ... },
  '都市': { ... },
  '玄幻': { ... },
  '言情': { ... },
}

export function getGenreParams(genre: string): GenreParam {
  return GENRE_PARAMS[genre] || GENRE_PARAMS['通用']
}
```

- [ ] **Step 3: 验证 TypeScript 编译**

---

### Task 4: 新增风格规则（style-rules.ts）

**Files:**
- Create: `src/lib/prompts/style-rules.ts`

**Interfaces:**
- Produces: `STYLE_RULES`（风格规则配置）
- Produces: `getStyleRules(style: string)` 函数
- Produces: `getSpeedRules()` 函数（分层变速原则）

- [ ] **Step 1: 从知识库提取风格规则**

从知识库「题材参数与风格指南」的「A-12 网文口语化写作规范」和「分层变速原则详表」提取：
- 快消口语完整豁免/强化规则
- 冷峻白描规则
- 感官极值规则
- 分层变速原则（4种叙事功能×节奏要求）

- [ ] **Step 2: 实现 style-rules.ts**

```typescript
export interface StyleRule {
  style: string
  exemptions: string[]      // 豁免规则
  reinforcements: string[]  // 强化规则
  corePrinciple: string     // 核心原则
}

export const STYLE_RULES: Record<string, StyleRule> = {
  '冷峻白描': { ... },
  '快消口语': { ... },
  '感官极值': { ... },
}

export function getStyleRules(style: string): string {
  // 返回格式化的风格规则文本
}

export function getSpeedRules(): string {
  // 返回分层变速原则文本
}
```

- [ ] **Step 3: 验证 TypeScript 编译**

---

### Task 5: 重构 builder.ts — 检测结果回流

**Files:**
- Modify: `src/lib/prompts/builder.ts`

**Interfaces:**
- Consumes: `getCharacterProfiles()`, `getActiveForeshadows()`, `getCoolingState()`, `getChapterReport()` from store
- Consumes: `getGenreParams()` from genre-params.ts
- Consumes: `getStyleRules()` from style-rules.ts
- Modifies: `buildPrompt()` 函数签名（新增可选参数）

- [ ] **Step 1: 在 BuildOptions 接口中新增参数**

```typescript
export interface BuildOptions {
  // ... 现有参数
  characterProfiles?: CharacterProfile[]  // 角色档案
  activeForeshadows?: Foreshadow[]        // 活跃伏笔
  coolingState?: CoolingState | null      // 冷却状态
  lastReport?: ChapterReport | null       // 上章检测结果
  worldSettings?: WorldSetting[]          // 世界观设定
}
```

- [ ] **Step 2: 在 L3 上下文层注入新数据**

在 `buildPrompt()` 函数的 L3 部分，注入：
- 角色档案摘要（核心性格、说话风格、身体习惯、描写指纹）
- 活跃伏笔列表
- 冷却状态摘要
- 上章检测结果摘要（违规项+身体密度+评分）
- 世界观设定摘要

- [ ] **Step 3: 在 L1 铁律层注入题材参数和风格规则**

使用 `getGenreParams()` 和 `getStyleRules()` 替换当前的简化版风格规则。

- [ ] **Step 4: 验证 TypeScript 编译**

- [ ] **Step 5: 重启开发服务器验证**

```bash
Set-Location "D:\codexvip\墨境\项目代码"; npx next dev
```
