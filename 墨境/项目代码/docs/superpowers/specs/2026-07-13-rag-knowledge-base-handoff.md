# 墨境 RAG 知识库 · 实施说明文档

> 日期：2026-07-13
> 写给：接手此项目的开发者
> 前置背景：已阅读 `docs/superpowers/specs/2026-07-13-mojing-architecture-overhaul.md`
> 预计工时：2-3周

---

## 一、这是什么，为什么要做

墨境有一套自研的网文写作方法论（V10.0.2 + 5个知识库，共约 100KB / 25000 token），定义了从"怎么写"到"怎么自查"的完整规则链。

**当前状态：**
- 引擎代码（`compliance.ts`、`cooling.ts`、`foreshadow.ts` 等）已经实现了约 70-80% 的规则逻辑
- Prompt 管道（`builder.ts`）已经完成分层注入架构（L1铁律→L2指令→L3上下文→L4输出约束）
- **但是**：5个知识库（77KB）的详细规则**没有被加载到 prompt 中**——AI 续写时只带了简化版铁律（~3KB），缺少详细的技法库、题材参数、润色规则等

**要做的事：** 把 5 个知识库转成结构化数据，存入 Supabase，在 AI 调用时按需检索最相关的规则，注入到 prompt 中。

**效果：** AI 写出来的文章质量从当前的 30-40 分提升到 90+ 分。

---

## 二、当前状态（接手人必读）

### 2.1 文件结构

```
项目路径: D:\codexvip\墨境\项目代码

原始模板（知识的来源）：
  C:\Users\nicou\OneDrive\桌面\AI聊天室\小墨写作模板\v8.0\最新\最新知识库模式模板\
  ├── # 小墨创作助手 V10.0.2 核心引擎.txt          (22KB, 289行)
  ├── 知识库/
  │   ├── # 知识库_核心工具箱.txt                   (25KB, 293行)
  │   ├── # 知识库_语言净化与润色规则.txt            (11KB, 170行)
  │   ├── # 知识库_题材参数与风格指南.txt            (12KB, 135行)
  │   ├── # 知识库_叙事结构与角色工具.txt            (7.5KB, 123行)
  │   └── # 知识库_系统运维与状态管理.txt            (21KB, 374行)
  ├── # 脑洞喷射 V1.4.txt                          (22KB)
  ├── # 灵感爆裂 V2.1.txt                          (36KB)
  ├── # 灵感引擎 V5.3.txt                          (24KB)
  └── # 书名炼金术 V1.8.txt                        (16KB)

当前代码（需要修改的地方）：
  src/lib/prompts/
  ├── builder.ts        ← Prompt 构建器，L1-L4 四层，已注入题材参数
  ├── iron-rules.ts     ← 铁律层（完整版 137行）
  ├── genre-params.ts   ← 题材参数表（5种题材×20+参数）
  ├── templates/        ← 续写/润色/扩写/脑洞模板（完整版）
  └── types.ts          ← BuildOptions 接口（已有 L3 上下文参数）

  src/lib/db/
  ├── types.ts          ← 数据模型（已有 CharacterProfile/WorldSetting/Outline/Foreshadow/CoolingState）
  ├── store.ts          ← CRUD 函数（已有 getCharacterProfiles/getCoolingState/getActiveForeshadows 等）
  └── supabase-schema.sql ← 数据库表（已有 11 张表）
```

### 2.2 知识库内容概览

| 知识库 | 核心内容 |
|--------|---------|
| **核心工具箱** | S1-S6场景方法、E1-E12章末收束、H01-H13钩子公式、五感锚定法、身体锚点池、信息渗透五法、黄金三章创作法、期待感万能公式、23项自检清单、情感颜色四色体系 |
| **语言净化与润色规则** | A/B/C/D 禁用词详解、五类AI高频词、四级净化体系、自然表达替换表20组、精修质检15项 |
| **题材参数与风格指南** | 5种题材参数映射表（通用/悬疑/都市/玄幻/言情）、分层变速原则、冲突强度分级L1-L5、A-12网文口语化写作规范11条 |
| **叙事结构与角色工具** | 震撼开场引擎、极端人设四维、起承转合大纲、救猫咪10种、英雄之旅12阶段、跨书技法32种、深度感替代10种 |
| **系统运维与状态管理** | 冷却系统快照格式、伏笔管理规则、角色成长追踪触发条件、原料包入库协议、卡文三板斧、30+条独立指令、修改指令解析协议 |

### 2.3 知识库按阶段注入策略（已在设计文档中定义）

| 模块 | 注入时机 | Token |
|------|---------|------|
| 核心铁律+防守规则 | 每次 AI 调用 | ~3KB |
| 题材参数表 | 每次（按题材） | ~1KB |
| 冲突强度详表 | 每次（按 L 级别） | ~0.5KB |
| 风格规则 | 每次（按风格） | ~1KB |
| S1-S6 场景+E1-E12 收束+H01-H13 钩子 | 规划阶段 | ~4.5KB |
| 五感锚定+身体锚点+信息渗透五法 | 写作阶段 | ~3KB |
| 黄金三章+救猫咪 | 前三章 | ~2.5KB |
| 23项自检+四级净化+精修15项 | 章末/润色 | ~5KB |
| 深度感 D1-D10 + 跨书技法 T1-T32 | 按需 RAG 检索 | ~3KB |

---

## 三、要做什么（分步实施）

### 步骤 1：知识库结构化（3-4天）

**目标：** 把 5 个纯文本知识库转成 TypeScript 结构化数据，方便检索和注入。

**具体操作：**

1. 新建 `src/lib/ai/knowledge-base.ts`
2. 把每个知识库拆成独立的"知识条目"（KnowledgeItem），每条目有：`id`、`category`、`tags`（关键词标签）、`content`（原文）、`injectionTiming`（注入时机：每次/规划/写作/章末/润色/前三章/按需）
3. 示例结构：

```typescript
// src/lib/ai/knowledge-base.ts
export interface KnowledgeItem {
  id: string
  category: 'iron_rules' | 'techniques' | 'polish' | 'genre_params' | 'narrative' | 'operations'
  tags: string[]        // 检索关键词，如 ['场景方法', 'S1', '身体锚点']
  title: string         // 条目标题
  content: string       // 完整规则文本
  timing: 'always' | 'planning' | 'writing' | 'chapter_end' | 'polish' | 'first_three' | 'on_demand'
  priority: number      // 1-5，高优先级的 always 注入
}

// "always" 时机的条目（核心铁律+防守规则）— 每次 AI 调用都带
// "planning" 时机的条目（场景方法/收束/钩子）— 仅在规划阶段带
// "writing" 时机的条目（身体锚点/五感/信息渗透）— 仅在写作阶段带
// "chapter_end" 时机的条目（23项自检）— 仅在章末自检时带
// "first_three" 时机的条目（黄金三章/救猫咪）— 仅前三章带
// "on_demand" 时机的条目（深度感 D1-D10/跨书技法）— RAG 检索
```

4. 从原始模板文件中逐条提取，打标签。**重要：保留中文原文，不翻译。**

**产出文件：** `src/lib/ai/knowledge-base.ts`（约 500-800 行）

### 步骤 2：Supabase 存储（2-3天）

**目标：** 把知识条目存到数据库，支持动态增删改查。

**具体操作：**

1. 在 Supabase 建表（已写入 `supabase-schema.sql`，但需要执行）：

```sql
CREATE TABLE IF NOT EXISTS public.knowledge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  timing TEXT NOT NULL DEFAULT 'on_demand',
  priority INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 供向量检索使用（如果 Supabase 支持 pgvector）
-- CREATE EXTENSION IF NOT EXISTS vector;
-- ALTER TABLE knowledge_items ADD COLUMN embedding vector(1536);
```

2. 新建 `src/lib/ai/knowledge-store.ts`：知识条目的 CRUD + 检索函数

```typescript
// 核心函数签名
export function getKnowledgeByTiming(timing: string): KnowledgeItem[]
export function searchKnowledge(query: string, limit?: number): KnowledgeItem[]
export function getKnowledgeByTags(tags: string[]): KnowledgeItem[]
export function getAllAlwaysItems(): KnowledgeItem[]
```

3. 写入初始数据——把步骤 1 的结构化条目批量插入 Supabase。写一个初始化脚本或手动导入。

**产出文件：** `src/lib/ai/knowledge-store.ts`（约 150-200 行）

### 步骤 3：向量检索（3-4天）

**目标：** 根据当前写作上下文，检索最相关的知识条目。

**具体操作：**

1. 在 `builder.ts` 的 `buildPrompt()` 函数中新增检索逻辑
2. 根据以下因素构建检索查询：
   - 当前题材（genre）
   - 当前冲突强度（conflictLevel）
   - 当前风格（style）
   - 当前章节号（chapterIndex）
   - 上章检测结果（lastReport 中的违规项）
3. 用标签匹配 + 关键词匹配做检索（初期可不用向量，直接用标签匹配）

```typescript
// builder.ts 中新增
function retrieveRelevantKnowledge(options: {
  genre?: string
  conflictLevel?: string
  style?: string
  chapterIndex?: number
  lastReport?: any
}): KnowledgeItem[] {
  const tags: string[] = []
  if (options.genre) tags.push(options.genre)
  if (options.conflictLevel) tags.push(options.conflictLevel)
  if (options.style) tags.push(options.style)
  // 从上章检测结果中提取违规类型作为检索标签
  if (options.lastReport) {
    if (options.lastReport.forbiddenA > 0) tags.push('A类禁用词')
    if (options.lastReport.forbiddenB > 0) tags.push('B类禁用词')
    // ...
  }
  return searchKnowledgeByTags(tags)
}
```

4. **未来可升级**：当 Supabase 支持 pgvector 后，可将知识条目嵌入向量化，实现语义检索

### 步骤 4：动态注入 prompt（2-3天）

**目标：** 让检索到的知识条目在 AI 调用时自动注入到 prompt 中。

**具体操作：**

1. 修改 `builder.ts` 的 `buildPrompt()` 函数：
   - 在 L1 铁律层：注入"always"时机的条目
   - 在 L3 上下文层：注入按需检索到的条目
   - 控制总 prompt 大小不超过 15KB（避免 token 超限）

2. 优先级策略：
   - always 条目：必定注入
   - 按 timing 匹配的条目：全量注入（如规划阶段：所有 planning 条目）
   - on_demand 条目：按检索相关性排序，注入 Top 3-5 条

3. 注入格式：
```
【知识库·{category}】{title}
{content}
```

### 步骤 5：管理后台（2-3天）

**目标：** 提供一个 Admin 界面，可以编辑知识条目的内容和标签，修改后立即生效。

**具体操作：**

1. 在 `src/app/admin/` 下新建知识库管理页面
2. 功能：列表展示、搜索过滤、编辑内容、增删条目、开关启用
3. 修改后在下次 AI 调用时立即生效（因为直接从 Supabase 读取）

---

## 四、关键技术决策

| 决策 | 当前方案 | 原因 |
|------|---------|------|
| 初始检索方式 | 标签匹配 + 关键词匹配 | 简单有效，够用；后续可升级向量检索 |
| 嵌入向量化 | 暂不做，等 Supabase 支持 pgvector | 当前不需要，标签匹配足够 |
| Token 预算 | 每次 prompt 总规则不超过 10-12KB | 留给正文足够空间，DeepSeek 64K 窗口 |
| 存储位置 | Supabase + localStorage 降级 | 与现有架构一致 |
| 版本管理 | 知识条目带 version 字段 | 方便回滚和 A/B 测试 |

---

## 五、验证方法

完成后通过以下方式验证效果：

1. **单元测试**：`searchKnowledge()` 返回正确的条目
2. **Token 计数**：`buildPrompt()` 输出的 prompt 大小在 10-15KB 之间
3. **实际写作**：用同一个项目的同一章节，分别用旧版和新版各续写一次，对比 AI 输出质量
4. **检测对比**：新版的 forbiddenA/B/C/D 违规数应明显低于旧版

---

## 六、相关资源

- 设计文档：`docs/superpowers/specs/2026-07-13-mojing-architecture-overhaul.md`
- P2 实施计划：`docs/superpowers/plans/2026-07-13-p2-prompt-pipeline-rebuild.md`
- 原始模板：`C:\Users\nicou\OneDrive\桌面\AI聊天室\小墨写作模板\v8.0\最新\最新知识库模式模板\`
- 当前 builder.ts：`src/lib/prompts/builder.ts`（726行，已做 L1 题材注入 + L3 上下文注入）
- 知识条目注入策略：见设计文档 § 4.2 和 § 4.3
