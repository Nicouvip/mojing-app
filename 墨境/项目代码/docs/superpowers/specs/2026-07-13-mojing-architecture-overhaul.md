# 墨境·架构重构设计方案（合并版）

> 日期：2026-07-13
> 状态：执行中
> 目标：将墨境从"壳子+简化prompt"升级为"完整写作引擎+可视化工作台"
> 来源：两份分析合并 — 代码审查视角（具体Bug+工程链路断裂点）+ 产品架构视角（竞品对标+数据模型+Token策略）

---

## 一、综合诊断（两份分析合并）

### 1.1 分层评分

| 层 | 完成度 | 说明 |
|---|:---:|------|
| 引擎代码层 | **70-80%** | compliance.ts(1437行)、cooling.ts、foreshadow.ts、character-growth.ts 都已实现 |
| Prompt管道层 | **15-20%** | 知识库完全没加载，检测结果不回流，风格/题材规则缺失 |
| 数据模型层 | **20%** | Character只有name/type/description，缺身体习惯/说话风格/描写指纹 |
| UI联动层 | **30%** | 合规面板有，但A-8状态行/冷却可视化/伏笔状态/四阶段工作流缺失 |

### 1.2 确认的Bug（代码审查发现）

| Bug | 严重性 | 文件 | 状态 |
|-----|:------:|------|:----:|
| `getStreak()` 今天有记录但words=0时索引错位，streak归零 | 🔴 | `goals-store.ts:70` | 待修 |
| AI深度检测结果持久化（需验证UI层是否正确调用saveAiResults） | 🟡 | `report-store.ts` | 待验证 |
| Admin prompt修改是否生效（需验证deep-check-panel保存逻辑） | 🟡 | `deep-check-panel.tsx` | 待验证 |

### 1.3 竞品对标（产品视角）

| 产品 | 核心架构 | 关键技术 |
|------|---------|--------|
| **Sudowrite** | RAG + 分层prompt + 用户记忆系统 | 世界观/人物存DB，按需检索注入；fine-tuned模型 |
| **NovelAI** | Lorebook + Memory + 滑动窗口 | 世界观条目，关键词触发注入 |
| **AI Dungeon** | World Info + Memory + 滑动窗口 | 类似NovelAI |

**共同点：没人把100KB全塞prompt，都用RAG/按需检索；世界观/人物/大纲存DB。**

### 1.4 核心问题

| 问题 | 影响 | 来源 |
|------|------|------|
| Prompt降级85% | AI写出来没有"小墨"的味道 | 产品分析 |
| 知识库完全没加载 | 铁律、技法库、题材参数等核心规则缺失 | 产品分析 |
| 检测结果不回流prompt | AI不知道自己上次写了什么问题 | 代码审查 |
| 数据模型太简陋 | 角色只有名字+类型，没有身体习惯/说话风格/描写指纹 | 产品分析 |
| 状态没有持久化 | 冷却/伏笔/角色成长存在localStorage，跨会话丢失 | 代码审查 |
| UI是壳子 | 用户看不到引擎在工作 | 两者一致 |
| getStreak()逻辑错误 | 今天没写时连续天数归零 | 代码审查 |

### 1.5 Token消耗分析

| 模式 | 每次prompt大小 | 质量 |
|------|:---:|:---:|
| 对话框（完整模板） | ~25K token | 100分 |
| 当前网站（简化prompt） | ~5K token | 15-20分 |
| 优化后（分层注入+RAG） | ~8-12K token | 90-95分 |

---

## 二、架构目标

```
用户写作 → 实时检测(8项) → 检测结果存DB → 下次续写时注入prompt
    ↓                                              ↓
章末自检(23项) → 报告存DB → AI深度检测(12项) → 结果回流prompt
    ↓                                              ↓
更新冷却/伏笔/角色成长 → 状态存DB → 下次规划时注入prompt
```

**核心原则：每一次AI调用，prompt里都带着正确的上下文。**

---

## 三、数据模型设计

### 3.1 现有模型（保持不变）

```typescript
// Project — 作品
interface Project {
  id: string; name: string; genre: string; description: string
  createdAt: number; updatedAt: number; deletedAt?: number | null
  chapterCount: number; totalWords: number
}
// Chapter — 章节
interface Chapter {
  id: string; projectId: string; title: string; content: string
  order: number; wordCount: number; createdAt: number; updatedAt: number
  deletedAt?: number | null; status: 'draft'|'writing'|'review'|'completed'; volumeId?: string
}
// Volume — 卷
interface Volume {
  id: string; projectId: string; name: string; order: number
  createdAt: number; updatedAt: number
}
```

### 3.2 扩展模型（新增）

```typescript
// CharacterProfile — 完整角色档案（扩展原有Character）
interface CharacterProfile {
  id: string; projectId: string; name: string
  type: '主角'|'配角'|'反派'|'次要角色'|'客串'
  corePersonality: string      // 核心性格（≤20字）
  speakingStyle: string         // 说话风格（语速/常用词/口头禅/句子长度）
  coreDesire: string            // 核心欲望
  coreObstacle: string          // 核心障碍
  bodyHabits: string[]          // 标志性身体习惯
  sensoryChannels: string[]     // 感官通道偏好
  imageryTypes: string[]        // 意象类型偏好
  metaphorDomains: string[]     // 比喻域偏好
  initialPersonality: string    // 初始性格阶段
  currentPersonality: string    // 当前性格阶段
  growthHistory: CharacterGrowth[]
  createdAt: number; updatedAt: number
}
interface CharacterGrowth {
  id: string; characterId: string
  trigger: 'different_choice'|'value_shift'|'relationship_change'|'ability_identity_change'
  changeDescription: string; chapter: number; timestamp: number
}
interface WorldSetting {
  id: string; projectId: string
  category: 'time_location'|'power_system'|'rules'|'custom'
  title: string; content: string; order: number
  createdAt: number; updatedAt: number
}
interface Outline {
  id: string; projectId: string; chapterOrder: number
  coreEvent: string; functionTag: string; emotionArc: string
  conflictLevel: 'L1'|'L2'|'L3'|'L4'|'L5'
  foreshadowsToPlant: string[]; foreshadowsToResolve: string[]; characters: string[]
  createdAt: number; updatedAt: number
}
interface Foreshadow {
  id: string; projectId: string; content: string
  importance: 'major'|'minor'; status: 'active'|'resolved'|'abandoned'
  chapterPlanted: number; chapterPlannedResolution?: number; chapterResolved?: number
  relatedCharacters: string[]; createdAt: number; updatedAt: number
}
interface CoolingState {
  id: string; projectId: string
  senses: Record<string, number[]>
  sentences: Record<string, number[]>
  scenes: Record<string, number[]>
  endings: Record<string, number[]>
  hooks: Record<string, number[]>
  emotions: string[]
  progressiveJudgment: Record<number, number>
  updatedAt: number
}
interface ChapterReport {
  id: string; projectId: string; chapterId: string; chapterOrder: number
  score: number; compliant: boolean
  forbiddenA: number; forbiddenB: number; forbiddenC: number; forbiddenD: number
  bodyDensity: number; openingHook: boolean
  items: ChapterCheckItem[]
  aiResults: Record<number, {status:string;reason:string;detail:string}>|null
  reportLine: string; createdAt: number
}
interface WritingPlan {
  id: string; projectId: string; chapterOrder: number
  conflictLevel: 'L1'|'L2'|'L3'|'L4'|'L5'
  style: '冷峻白描'|'快消口语'|'感官极值'
  sceneMethod: string; sensoryAnchors: string[]; bodyAnchors: string[]
  endingType: string; hookType: string; specialTechniques: string[]
  statusLine: string; createdAt: number
}
```

---

## 四、Prompt 管道重建

### 4.1 当前 vs 目标

```
当前 builder.ts:
  L1 = iron_rules.ts（69行简化版）     ← 只有原始模板的15%
  L2 = templates/continue.ts（59行）   ← 只有原始模板的5%
  L3 = context + instruction           ← 没有角色/世界观/冷却/伏笔
  L4 = output constraints              ← 简化了

目标 builder.ts:
  L1 = 完整铁律+防守规则+风格规则+55字生死线+冲突强度（~5KB，每次注入）
  L2 = 功能指令（续写/润色/扩写/脑洞）（~3KB，按工具类型注入）
  L3 = 前文+角色档案+世界观+大纲+冷却+伏笔+上章检测结果+写作计划
  L4 = 输出约束（字数/格式/内容要求）
```

### 4.2 知识库分层注入策略

| 知识库模块 | 注入时机 | Token预估 |
|-----------|---------|----------|
| 核心铁律+防守规则 | 每次 | ~3KB |
| 题材参数表 | 每次（按题材） | ~1KB |
| 冲突强度详表 | 每次（按L级别） | ~0.5KB |
| 风格规则 | 每次（按风格） | ~1KB |
| S1-S6场景+E1-E12收束+H01-H13钩子 | 规划阶段 | ~4.5KB |
| 五感锚定+身体锚点+信息渗透五法 | 写作阶段 | ~3KB |
| 黄金三章+救猫咪 | 前三章 | ~2.5KB |
| 23项自检+四级净化+精修15项 | 章末/润色 | ~5KB |
| 深度感D1-D10+跨书技法T1-T32 | RAG按需 | ~3KB |

---

## 五、实施计划（6阶段，每阶段独立可交付）

### P0: 紧急Bug修复（1天）
1. 修复 `getStreak()` 索引错位
2. 验证AI检测结果持久化
3. 验证Admin prompt生效

### P1: 数据基础（1-2周）
1. 扩展types.ts：CharacterProfile/WorldSetting/Outline/Foreshadow/CoolingState/WritingPlan
2. 扩展store.ts：新增CRUD函数
3. Supabase建表
4. 编辑器左栏"构思"tab：角色/世界观/大纲管理UI

### P2: Prompt管道重建（2-3周）
1. 从原始模板提取完整铁律+防守规则，替换iron-rules.ts
2. 提取续写/润色/扩写指令，替换templates/*.ts
3. 提取题材参数表→genre-params.ts
4. 提取风格规则→style-rules.ts
5. 重构builder.ts：分层注入+检测结果回流

### P3: 工作流UI（2-3周）
1. 编辑器顶栏A-8状态行
2. 右侧栏"状态"标签页
3. 四阶段工作流引导
4. 检测结果用户语言展示

### P4: RAG知识库（2-3周）
1. 5个知识库转结构化数据存Supabase
2. 向量检索+动态注入

### P5: 体验优化（1-2周）
1. 解决UI问题清单
2. 响应式适配
3. 性能优化

---

## 六、关键决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 知识库存储 | Supabase + JSON字段 | 与现有架构一致，支持动态更新 |
| Prompt构建 | 分层注入 + RAG | 平衡token成本和规则覆盖 |
| 检测结果回流 | 读取上章chapter_reports | 每次续写时自动注入 |
| 冷却状态存储 | Supabase cooling_states表 | 按project_id唯一索引 |
| 状态没有持久化 | 冷却/伏笔/角色成长存在localStorage，跨会话丢失 |
| UI是壳子 | 用户看不到引擎在工作 |

---

## 二、架构目标

```
用户写作 → 实时检测(8项) → 检测结果存DB → 下次续写时注入prompt
    ↓                                              ↓
章末自检(23项) → 报告存DB → AI深度检测(12项) → 结果回流prompt
    ↓                                              ↓
更新冷却/伏笔/角色成长 → 状态存DB → 下次规划时注入prompt
```

**核心原则：每一次AI调用，prompt里都带着正确的上下文。**

---

## 三、数据模型设计

### 3.1 现有模型（保持不变）

```typescript
// Project — 作品
interface Project {
  id: string
  name: string
  genre: string
  description: string
  createdAt: number
  updatedAt: number
  deletedAt?: number | null
  chapterCount: number
  totalWords: number
}

// Chapter — 章节
interface Chapter {
  id: string
  projectId: string
  title: string
  content: string
  order: number
  wordCount: number
  createdAt: number
  updatedAt: number
  deletedAt?: number | null
  status: 'draft' | 'writing' | 'review' | 'completed'
  volumeId?: string
}

// Volume — 卷
interface Volume {
  id: string
  projectId: string
  name: string
  order: number
  createdAt: number
  updatedAt: number
}
```

### 3.2 扩展模型（新增）

```typescript
// CharacterProfile — 完整角色档案（扩展原有Character）
interface CharacterProfile {
  id: string
  projectId: string
  name: string
  type: '主角' | '配角' | '反派' | '次要角色' | '客串'
  // 核心设定
  corePersonality: string      // 核心性格（≤20字）
  speakingStyle: string         // 说话风格（语速/常用词/口头禅/句子长度）
  coreDesire: string            // 核心欲望
  coreObstacle: string          // 核心障碍
  // 身体描写
  bodyHabits: string[]          // 标志性身体习惯（紧张/说谎/心动时的下意识动作）
  // 描写指纹
  sensoryChannels: string[]     // 感官通道偏好（视觉/触觉/听觉/嗅觉/味觉）
  imageryTypes: string[]        // 意象类型偏好
  metaphorDomains: string[]     // 比喻域偏好
  // 成长记录
  initialPersonality: string    // 初始性格阶段
  currentPersonality: string    // 当前性格阶段
  growthHistory: CharacterGrowth[]
  createdAt: number
  updatedAt: number
}

// CharacterGrowth — 角色成长记录
interface CharacterGrowth {
  id: string
  characterId: string
  trigger: 'different_choice' | 'value_shift' | 'relationship_change' | 'ability_identity_change'
  changeDescription: string
  chapter: number
  timestamp: number
}

// WorldSetting — 世界观设定
interface WorldSetting {
  id: string
  projectId: string
  category: 'time_location' | 'power_system' | 'rules禁忌' | 'custom'
  title: string
  content: string
  order: number
  createdAt: number
  updatedAt: number
}

// Outline — 大纲节点
interface Outline {
  id: string
  projectId: string
  chapterOrder: number
  coreEvent: string             // 核心事件概要
  functionTag: string           // 功能标签：推进/塑造/揭示/氛围/反转
  emotionArc: string            // 情感走向：起点→终点
  conflictLevel: 'L1' | 'L2' | 'L3' | 'L4' | 'L5'
  foreshadowsToPlant: string[]  // 需埋设的伏笔
  foreshadowsToResolve: string[] // 需回收的伏笔
  characters: string[]          // 出场角色
  createdAt: number
  updatedAt: number
}

// Foreshadow — 伏笔
interface Foreshadow {
  id: string
  projectId: string
  content: string
  importance: 'major' | 'minor'
  status: 'active' | 'resolved' | 'abandoned'
  chapterPlanted: number
  chapterPlannedResolution?: number
  chapterResolved?: number
  relatedCharacters: string[]
  createdAt: number
  updatedAt: number
}

// CoolingState — 冷却状态（按项目存储）
interface CoolingState {
  id: string
  projectId: string
  // 感官冷却
  senses: Record<string, number[]>  // 感官名 → 最近使用章节号数组
  // 句式冷却
  sentences: Record<string, number[]>
  // 场景方法冷却
  scenes: Record<string, number[]>
  // 章末收束冷却
  endings: Record<string, number[]>
  // 钩子冷却
  hooks: Record<string, number[]>
  // 情感颜色序列
  emotions: string[]
  // 递进判断句使用记录
  progressiveJudgment: Record<number, number>
  updatedAt: number
}

// ChapterReport — 章末自检报告（已有report-store，需持久化到DB）
interface ChapterReport {
  id: string
  projectId: string
  chapterId: string
  chapterOrder: number
  score: number                 // 1-5分
  compliant: boolean
  // 检测结果
  forbiddenA: number
  forbiddenB: number
  forbiddenC: number
  forbiddenD: number
  bodyDensity: number
  openingHook: boolean
  // 各项检查结果
  items: ChapterCheckItem[]
  // AI深度分析
  aiResults: Record<number, { status: string; reason: string; detail: string }> | null
  // 极简报告行
  reportLine: string
  createdAt: number
}

// WritingPlan — 写作计划卡片（阶段一产出）
interface WritingPlan {
  id: string
  projectId: string
  chapterOrder: number
  conflictLevel: 'L1' | 'L2' | 'L3' | 'L4' | 'L5'
  style: '冷峻白描' | '快消口语' | '感官极值'
  sceneMethod: string           // S1-S6
  sensoryAnchors: string[]      // 感官锚点
  bodyAnchors: string[]         // 身体锚点
  endingType: string            // E1-E12
  hookType: string              // H01-H13
  specialTechniques: string[]   // 特殊技法
  // A-8状态行
  statusLine: string
  createdAt: number
}
```

### 3.3 数据库表设计（Supabase）

```sql
-- 角色档案表
CREATE TABLE character_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT '配角',
  core_personality TEXT,
  speaking_style TEXT,
  core_desire TEXT,
  core_obstacle TEXT,
  body_habits JSONB DEFAULT '[]',
  sensory_channels JSONB DEFAULT '[]',
  imagery_types JSONB DEFAULT '[]',
  metaphor_domains JSONB DEFAULT '[]',
  initial_personality TEXT,
  current_personality TEXT,
  growth_history JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 世界观设定表
CREATE TABLE world_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 大纲节点表
CREATE TABLE outlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  chapter_order INT NOT NULL,
  core_event TEXT,
  function_tag TEXT,
  emotion_arc TEXT,
  conflict_level TEXT DEFAULT 'L2',
  foreshadows_to_plant JSONB DEFAULT '[]',
  foreshadows_to_resolve JSONB DEFAULT '[]',
  characters JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 伏笔表
CREATE TABLE foreshadows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  importance TEXT DEFAULT 'minor',
  status TEXT DEFAULT 'active',
  chapter_planted INT NOT NULL,
  chapter_planned_resolution INT,
  chapter_resolved INT,
  related_characters JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 冷却状态表
CREATE TABLE cooling_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  senses JSONB DEFAULT '{}',
  sentences JSONB DEFAULT '{}',
  scenes JSONB DEFAULT '{}',
  endings JSONB DEFAULT '{}',
  hooks JSONB DEFAULT '{}',
  emotions JSONB DEFAULT '[]',
  progressive_judgment JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 章末自检报告表
CREATE TABLE chapter_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  chapter_order INT NOT NULL,
  score INT DEFAULT 0,
  compliant BOOLEAN DEFAULT false,
  forbidden_a INT DEFAULT 0,
  forbidden_b INT DEFAULT 0,
  forbidden_c INT DEFAULT 0,
  forbidden_d INT DEFAULT 0,
  body_density INT DEFAULT 0,
  opening_hook BOOLEAN DEFAULT false,
  items JSONB DEFAULT '[]',
  ai_results JSONB,
  report_line TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 写作计划表
CREATE TABLE writing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  chapter_order INT NOT NULL,
  conflict_level TEXT DEFAULT 'L2',
  style TEXT DEFAULT '快消口语',
  scene_method TEXT,
  sensory_anchors JSONB DEFAULT '[]',
  body_anchors JSONB DEFAULT '[]',
  ending_type TEXT,
  hook_type TEXT,
  special_techniques JSONB DEFAULT '[]',
  status_line TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 四、Prompt 管道重建

### 4.1 当前问题

```
builder.ts 当前逻辑：
  L1 = iron_rules.ts（69行简化版）     ← 只有原始模板的15%
  L2 = templates/continue.ts（59行）   ← 只有原始模板的5%
  L3 = context + instruction           ← 没有角色/世界观/冷却/伏笔
  L4 = output constraints              ← 简化了
```

### 4.2 目标架构

```
builder.ts 重构后逻辑：
  L1 = 完整铁律 + 防守规则 + 风格规则 + 55字生死线 + 冲突强度
       （从原始模板提取，约5KB，每次注入）

  L2 = 功能指令（续写/润色/扩写/脑洞）
       （从原始模板提取，约3KB，按工具类型注入）

  L3 = 上下文注入：
       - 前文内容（已有）
       + 角色档案（从DB读取，按出场角色筛选）
       + 世界观摘要（从DB读取，按相关性筛选）
       + 大纲节点（从DB读取，当前章节）
       + 冷却状态（从DB读取）
       + 伏笔状态（从DB读取，活跃伏笔列表）
       + 上章检测结果（从DB读取，违规项+身体密度）
       + 写作计划（从DB读取，预选的技法/感官/收束/钩子）

  L4 = 输出约束（字数/格式/内容要求）
```

### 4.3 知识库分层注入策略

| 知识库模块 | 注入时机 | 注入方式 | Token预估 |
|-----------|---------|---------|----------|
| V10.0.2 核心铁律+防守规则 | 每次AI调用 | 全量注入L1 | ~3KB |
| 题材参数表 | 每次AI调用 | 按当前题材注入对应行 | ~1KB |
| 冲突强度详表 | 每次AI调用 | 按当前L级别注入 | ~0.5KB |
| 风格规则（快消口语/冷峻白描/感官极值） | 每次AI调用 | 按当前风格注入 | ~1KB |
| S1-S6场景方法 | 规划阶段 | 全量注入 | ~1KB |
| E1-E12章末收束 | 规划阶段 | 全量注入 | ~1.5KB |
| H01-H13钩子公式 | 规划阶段 | 全量注入 | ~2KB |
| 五感锚定法+身体锚点池 | 写作阶段 | 全量注入 | ~2KB |
| 信息渗透五法 | 写作阶段 | 全量注入 | ~1KB |
| 黄金三章创作法 | 前三章 | 全量注入 | ~2KB |
| 期待感万能公式 | 关键章 | 全量注入 | ~0.5KB |
| 23项自检清单 | 章末自检 | 全量注入 | ~2KB |
| 四级净化体系 | 润色时 | 全量注入 | ~2KB |
| 自然表达替换表 | 润色时 | 全量注入 | ~1KB |
| 精修质检15项 | 润色时 | 全量注入 | ~1KB |
| 救猫咪10种 | 前三章 | 全量注入 | ~0.5KB |
| 深度感D-1~D-10 | 按需 | RAG检索 | ~1KB |
| 跨书技法T-001~T-032 | 按需 | RAG检索 | ~2KB |

**总计：每次AI调用约8-15KB prompt（vs 当前~5KB），质量提升5倍以上。**

### 4.4 检测结果回流机制

```typescript
// 续写时，在L3注入上章检测结果
async function buildContinuePrompt(projectId: string, chapterOrder: number) {
  // 1. 读取上章报告
  const lastReport = await getLastChapterReport(projectId, chapterOrder - 1)

  // 2. 读取冷却状态
  const cooling = await getCoolingState(projectId)

  // 3. 读取活跃伏笔
  const activeForeshadows = await getActiveForeshadows(projectId)

  // 4. 读取角色档案
  const characters = await getCharactersByProject(projectId)

  // 5. 读取大纲节点
  const outline = await getOutline(projectId, chapterOrder)

  // 6. 构建L3上下文
  const context = buildContext({
    previousText: lastChapterContent,
    lastReport,           // 上章违规项+身体密度+评分
    cooling,              // 冷却状态
    activeForeshadows,    // 活跃伏笔
    characters,           // 角色档案
    outline,              // 大纲节点
  })

  // 7. 构建完整prompt
  return buildPrompt({
    type: 'continue',
    context,
    // ...其他参数
  })
}
```

---

## 五、UI 改造设计

### 5.1 编辑器顶栏新增

```
┌─────────────────────────────────────────────────────────────┐
│ ← 墨境  《长安不良人》  [长篇][悬疑]  [编辑][预览][分屏]      │
│                                                              │
│ 第5章 | 📍暗线浮出 | 🎭伏笔3条 | 🆕L3 | 🎨快消口语 | ⚠️无    │ ← A-8状态行
│                                                              │
│ [本章3380字/全书14750字] [保存] [手机][查找][分享] [封面] [质量▾] │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 右侧栏新增标签页

```
┌──────────────────────┐
│ [AI助手] [灵感] [状态] │ ← 新增"状态"标签
├──────────────────────┤
│ 📊 创作状态            │
│                       │
│ 冷却状态              │
│ 感官: 视✓ 触2/3 听✓   │
│ 场景: S1✓ S3(当前)     │
│ 收束: E-6✓ E-1当前     │
│ 钩子: H-02✓ H-08当前   │
│ 情感: 暖→冷→热         │
│                       │
│ 🎭 活跃伏笔 (3/10)     │
│ · 白玉腰牌 (第2章·重要) │
│ · 血书残卷 (第3章·次要) │
│ · 彩姐身份 (第1章·重要) │
│                       │
│ 🔄 角色成长            │
│ · 沈辞：从隐忍→主动出击 │
│                       │
│ ⚠️ 上章检测            │
│ · B类词3次 (突然×2,感觉)│
│ · 身体密度42% (合理)    │
│ · 55字线 ✓通过          │
└──────────────────────┘
```

### 5.3 四阶段工作流引导

```
阶段一·规划（自动执行，不输出正文）
  → 用户看到：A-8状态行 + 预选技法确认

阶段二·写作（实时检测）
  → 用户看到：8项段落检测结果（右侧栏合规面板）

阶段三·自查（章末自动执行）
  → 用户看到：23项自检报告弹窗

阶段四·交付
  → 用户看到：润色建议 + 状态更新确认
```

---

## 六、实施计划

### 阶段一：数据基础（1-2周）

**目标：让AI能"记住"角色、世界观、大纲**

1. 扩展 `types.ts`：新增 CharacterProfile、WorldSetting、Outline、Foreshadow、CoolingState、WritingPlan 接口
2. 扩展 `store.ts`：新增对应CRUD函数
3. 新增 Supabase schema：建表
4. 新增角色管理UI：编辑器左栏"构思"tab下，角色卡片可编辑完整档案
5. 新增世界观管理UI：编辑器左栏"构思"tab下，世界观条目CRUD
6. 新增大纲管理UI：编辑器左栏"构思"tab下，大纲节点编辑

**验收标准**：能创建角色档案（含身体习惯/说话风格/描写指纹），能创建世界观条目，能编辑大纲节点。

### 阶段二：Prompt管道重建（2-3周）

**目标：让AI每次调用时带着正确的上下文**

1. 从原始模板提取完整铁律+防守规则（~5KB），替换 `iron-rules.ts`
2. 从原始模板提取续写/润色/扩写指令（~3KB each），替换 `templates/*.ts`
3. 从原始模板提取题材参数表，新增 `genre-params.ts`
4. 从原始模板提取风格规则，新增 `style-rules.ts`
5. 重构 `builder.ts`：实现分层注入 + 知识库按需查询
6. 实现检测结果回流：续写/润色时注入上章报告
7. 实现冷却/伏笔/角色档案注入

**验收标准**：续写时，prompt里包含角色档案、大纲节点、冷却状态、伏笔状态、上章检测结果。

### 阶段三：工作流UI（2-3周）

**目标：让用户看到引擎在工作**

1. 编辑器顶栏新增A-8状态行
2. 右侧栏新增"状态"标签页（冷却/伏笔/角色成长/上章检测）
3. 四阶段工作流引导UI
4. 检测结果用用户语言展示（不用技术术语）

**验收标准**：用户能在编辑器里看到冷却状态、伏笔状态、A-8状态行。

### 阶段四：知识库RAG（2-3周）

**目标：100KB知识库按需检索，不浪费token**

1. 把5个知识库转成结构化数据，存入Supabase
2. 实现向量检索：根据当前写作上下文检索最相关规则
3. 实现动态注入：检索到的规则自动注入prompt

**验收标准**：续写时，prompt里包含当前题材的参数、当前风格的规则、当前阶段需要的技法。

### 阶段五：体验优化（1-2周）

**目标：用户体验打磨**

1. 解决9项UI问题清单
2. 响应式适配
3. 性能优化

---

## 七、关键技术决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 知识库存储 | Supabase + JSON字段 | 与现有架构一致，支持动态更新 |
| 角色档案存储 | Supabase character_profiles表 | 支持跨设备同步 |
| 冷却状态存储 | Supabase cooling_states表 | 按project_id唯一索引 |
| Prompt构建 | 分层注入 + RAG | 平衡token成本和规则覆盖 |
| 检测结果回流 | 读取上章chapter_reports | 每次续写时自动注入 |
| UI框架 | 现有Tailwind + 内联样式 | 保持一致性 |

---

## 八、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Prompt过长导致API超时 | 续写失败 | 分层注入，非核心规则走RAG检索 |
| 数据模型迁移破坏现有数据 | 用户数据丢失 | 新增字段用默认值，不改现有字段 |
| 知识库更新不及时 | 规则过时 | 知识库存DB，前端可编辑 |
| 冷却状态同步延迟 | 冷却判断不准 | 写入时立即更新，读取时从DB读 |
