# 后端 — Supabase 建表 & 凭据配置

## 一、当前 .env.local 凭据状态

**结论：当前为占位值，无真实 Supabase 项目。**

```
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key
```

### 获取真实凭据步骤

1. 访问 [https://supabase.com](https://supabase.com) 注册/登录
2. 创建一个新项目（或打开已有项目）
3. 进入项目 → **Settings → API**
4. 复制 **Project URL** → 填入 `NEXT_PUBLIC_SUPABASE_URL`
5. 复制 **anon public key** → 填入 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. 在 Supabase SQL Editor 中执行 `src/lib/supabase-schema.sql` 建表

> .env.local 注释已更新，包含以上完整说明。

---

## 二、五张表 ER 概览

```
┌───────────────┐
│   projects    │──┐
│  (作品/项目)   │  │
└───────────────┘  │
                   ▼
┌──────────────────────────────────────┐
│  chapters    characters   outlines   │── materials
│  (章节)       (角色)       (大纲)     │   (素材)
└──────────────────────────────────────┘
```

- **projects** → 根表，所有数据归属 project
- **chapters** → 章节正文，`project_id` FK → projects
- **characters** → 角色档案+成长，`project_id` FK → projects
- **outlines** → 多层大纲树，`project_id` FK → projects，自引用 `parent_id`
- **materials** → 素材资料，`project_id` FK → projects，可关联 character/chapter

---

## 三、建表脚本（已保存至 `src/lib/supabase-schema.sql`）

### 3.1 projects — 作品/项目表

```sql
CREATE TABLE IF NOT EXISTS public.projects (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_id      TEXT UNIQUE,                    -- 兼容前端 "proj-174..." 格式
  name           TEXT NOT NULL DEFAULT '未命名作品',
  genre          TEXT NOT NULL DEFAULT '都市',
  description    TEXT NOT NULL DEFAULT '',
  chapter_count  INTEGER NOT NULL DEFAULT 1,
  total_words    INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ                    -- 软删除
);
```

**索引：** `created_at DESC`、`genre`、`custom_id`

---

### 3.2 chapters — 章节表

```sql
CREATE TABLE IF NOT EXISTS public.chapters (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_id   TEXT UNIQUE,
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT '未命名章节',
  content     TEXT NOT NULL DEFAULT '',
  "order"     INTEGER NOT NULL DEFAULT 0,
  word_count  INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'draft'
              CHECK (status IN ('draft','writing','review','completed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);
```

**索引：** `project_id`、`(project_id, "order")`（排序查询用）、`status`、`custom_id`

> 注意：`order` 是 PostgreSQL 保留字，表定义中已用双引号转义。

---

### 3.3 characters — 角色表

```sql
CREATE TABLE IF NOT EXISTS public.characters (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_id   TEXT UNIQUE,
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,

  -- 基础档案
  role        TEXT NOT NULL DEFAULT '配角'
              CHECK (role IN ('主角','配角','反派','次要角色','客串')),
  identity    TEXT NOT NULL DEFAULT '',           -- 身份
  personality TEXT NOT NULL DEFAULT '',           -- 性格
  appearance  TEXT NOT NULL DEFAULT '',           -- 外貌
  background  TEXT NOT NULL DEFAULT '',           -- 背景
  goals       TEXT NOT NULL DEFAULT '',           -- 目标/动机

  -- 成长追踪
  initial_personality   TEXT NOT NULL DEFAULT '',
  current_personality   TEXT NOT NULL DEFAULT '',

  -- 极端人设四维（CharacterExtreme → prompts/types.ts）
  thinking_pattern   TEXT NOT NULL DEFAULT '',
  speaking_style     TEXT NOT NULL DEFAULT '',

  -- 描写指纹（JSONB 存储感官通道/意象/比喻域）
  description_fingerprint JSONB DEFAULT '{}'::jsonb,

  -- 成长历史 JSONB 数组
  growth_history     JSONB DEFAULT '[]'::jsonb,

  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_archived  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);
```

**索引：** `project_id`、`name`、`role`、`custom_id`

---

### 3.4 outlines — 大纲表（支持树形层级）

```sql
CREATE TABLE IF NOT EXISTS public.outlines (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_id   TEXT UNIQUE,
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES public.outlines(id) ON DELETE CASCADE,  -- 父节点
  sort_order  INTEGER NOT NULL DEFAULT 0,
  depth       INTEGER NOT NULL DEFAULT 0 CHECK (depth >= 0),

  title       TEXT NOT NULL DEFAULT '',
  content     TEXT NOT NULL DEFAULT '',        -- Markdown 正文
  summary     TEXT NOT NULL DEFAULT '',        -- 一句话摘要
  status      TEXT NOT NULL DEFAULT 'draft'
              CHECK (status IN ('draft','writing','review','completed')),

  chapter_id  UUID REFERENCES public.chapters(id) ON DELETE SET NULL,

  tags        TEXT[] DEFAULT '{}',
  word_count  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);
```

**索引：** `project_id`、`parent_id`、`chapter_id`、`(project_id, sort_order)`、`custom_id`

> `parent_id` 自引用实现树形结构（全书级 → 卷级 → 章节级大纲）。

---

### 3.5 materials — 素材/资料表

```sql
CREATE TABLE IF NOT EXISTS public.materials (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_id   TEXT UNIQUE,
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  category    TEXT NOT NULL DEFAULT '其他'
              CHECK (category IN (
                '灵感笔记','研究资料','参考文档',
                '设定资料','世界观','时间线',
                '对话素材','描写素材','其他'
              )),

  title       TEXT NOT NULL DEFAULT '',
  content     TEXT NOT NULL DEFAULT '',        -- Markdown 正文
  source      TEXT NOT NULL DEFAULT '',        -- URL/书籍来源
  summary     TEXT NOT NULL DEFAULT '',

  related_character_id UUID REFERENCES public.characters(id) ON DELETE SET NULL,
  related_chapter_id   UUID REFERENCES public.chapters(id)   ON DELETE SET NULL,

  tags        TEXT[] DEFAULT '{}',
  importance  INTEGER NOT NULL DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
  attachments JSONB DEFAULT '[]'::jsonb,       -- 附件URL列表

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);
```

**索引：** `project_id`、`category`、`tags`（GIN）、`importance DESC`、`custom_id`

---

## 四、通用基础设施

### 自动 updated_at 触发器

所有五张表共享同一个触发器函数：

```sql
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

每张表创建自己的 `BEFORE UPDATE` 触发器（名称 `set_{table}_updated_at`）。

### 软删除

每张表都有 `deleted_at TIMESTAMPTZ` 列。查询时统一加 `WHERE deleted_at IS NULL`，物理删除仅在数据沉淀后统一清理。

### 行级安全（RLS）

当前所有表 **注释掉了 RLS**。接入 Supabase Auth 用户系统后，取消注释并添加策略：

```sql
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "用户只能操作自己的作品" ON public.projects
  USING (auth.uid() = user_id);
```

> 注意：启用 RLS 需要在每张表增加 `user_id UUID REFERENCES auth.users(id)` 列。

---

## 五、与现有代码的兼容性

### 前端 ID 兼容

当前 `store.ts` 使用 `proj-${Date.now()}` 格式的 ID。SQL 中 `custom_id TEXT UNIQUE` 列存储此格式，主键仍为 UUID 以利用 PostgreSQL 优势。

### Supabase 客户端现状

| 文件 | 角色 | 状态 |
|------|------|------|
| `src/lib/supabase.ts` | 严格模式 — 无凭据时抛错 | ✅ 已就绪 |
| `src/lib/supabase-client.ts` | 宽松模式 — 无凭据时返回 null | ✅ 已就绪 |
| `src/lib/store.ts` | 使用 `supabase-client.ts`，有 Supabase 时读写，否则 fallback localStorage | ✅ 已就绪 |
| `src/lib/supabase-schema.sql` | 建表脚本 | **🆕 本次新增** |

### 后续接入步骤

1. 注册 Supabase → 创建项目
2. 填写 `.env.local` 的真实凭据
3. 在 Supabase SQL Editor 运行 `src/lib/supabase-schema.sql`
4. 重启 `pnpm dev`，观察 `store.ts` 自动从 Supabase 加载数据
5. （可选）将 `auth-store.ts` 的内存用户存储迁移到 Supabase Auth 的 `users` 表

---

## 六、常用查询示例（SQL 附录已内置）

```sql
-- 1. 获取某作品的所有章节（按顺序）
SELECT * FROM chapters
WHERE project_id = '...' AND deleted_at IS NULL
ORDER BY "order";

-- 2. 获取某作品的所有角色
SELECT * FROM characters
WHERE project_id = '...' AND deleted_at IS NULL
ORDER BY sort_order;

-- 3. 获取某作品的大纲树（按 sort_order 同级排序）
SELECT * FROM outlines
WHERE project_id = '...' AND deleted_at IS NULL
ORDER BY sort_order;

-- 4. 按分类获取素材
SELECT * FROM materials
WHERE project_id = '...' AND category = '灵感笔记' AND deleted_at IS NULL;

-- 5. 标签搜索（GIN 索引加速）
SELECT * FROM materials
WHERE tags @> ARRAY['世界观'] AND deleted_at IS NULL;
```

---

*文档版本：v1.0.0 · 生成时间：2025-06*  
*相关文件：`.env.local`、`src/lib/supabase-schema.sql`、`src/lib/supabase.ts`、`src/lib/supabase-client.ts`、`src/lib/store.ts`*
