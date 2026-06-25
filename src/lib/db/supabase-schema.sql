-- ============================================================
-- 墨境 (Mojing) — Supabase 建表脚本
-- 版本：v1.0.0
-- 说明：在 Supabase SQL Editor 中执行此脚本创建五张核心表
-- 执行方式：
--   1. 登录 https://supabase.com
--   2. 进入项目 → SQL Editor
--   3. 粘贴并运行
-- ============================================================

-- 0. 扩展：启用 UUID 生成
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. projects — 作品/项目表
-- ============================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 兼容前端 id 格式（如 "proj-174..."），用 custom_id 列存储
  custom_id   TEXT UNIQUE,
  name        TEXT NOT NULL DEFAULT '未命名作品',
  genre       TEXT NOT NULL DEFAULT '都市',
  description TEXT NOT NULL DEFAULT '',
  chapter_count INTEGER NOT NULL DEFAULT 1,
  total_words   INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 软删除支持
  deleted_at  TIMESTAMPTZ
);

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 索引
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_genre      ON public.projects (genre);
CREATE INDEX IF NOT EXISTS idx_projects_custom_id   ON public.projects (custom_id);

-- RLS（行级安全）：后续接入用户系统后启用
-- ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. chapters — 章节表
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chapters (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_id   TEXT UNIQUE,
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT '未命名章节',
  content     TEXT NOT NULL DEFAULT '',
  "order"     INTEGER NOT NULL DEFAULT 0,
  word_count  INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'draft'
              CHECK (status IN ('draft', 'writing', 'review', 'completed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE TRIGGER set_chapters_updated_at
  BEFORE UPDATE ON public.chapters
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 索引
CREATE INDEX IF NOT EXISTS idx_chapters_project_id  ON public.chapters (project_id);
CREATE INDEX IF NOT EXISTS idx_chapters_order       ON public.chapters (project_id, "order");
CREATE INDEX IF NOT EXISTS idx_chapters_status      ON public.chapters (status);
CREATE INDEX IF NOT EXISTS idx_chapters_custom_id   ON public.chapters (custom_id);

-- ============================================================
-- 3. characters — 角色表
-- ============================================================
CREATE TABLE IF NOT EXISTS public.characters (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_id   TEXT UNIQUE,
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  -- 基础档案
  role        TEXT NOT NULL DEFAULT '配角'
              CHECK (role IN ('主角', '配角', '反派', '次要角色', '客串')),
  identity    TEXT NOT NULL DEFAULT '',     -- 身份描述
  personality TEXT NOT NULL DEFAULT '',     -- 性格描述
  appearance  TEXT NOT NULL DEFAULT '',     -- 外貌描述
  background  TEXT NOT NULL DEFAULT '',     -- 背景故事
  goals       TEXT NOT NULL DEFAULT '',     -- 目标/动机

  -- 成长追踪
  initial_personality   TEXT NOT NULL DEFAULT '',
  current_personality   TEXT NOT NULL DEFAULT '',

  -- 极端人设四维（来自 prompts/types.ts CharacterExtreme）
  thinking_pattern   TEXT NOT NULL DEFAULT '',  -- 思维行为模式
  speaking_style     TEXT NOT NULL DEFAULT '',  -- 语言特征

  -- 描写指纹
  description_fingerprint JSONB DEFAULT '{}'::jsonb,

  -- 成长历史（存储为 JSONB 数组，便于快速读取）
  growth_history     JSONB DEFAULT '[]'::jsonb,

  -- 元数据
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_archived  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

CREATE TRIGGER set_characters_updated_at
  BEFORE UPDATE ON public.characters
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 索引
CREATE INDEX IF NOT EXISTS idx_characters_project_id  ON public.characters (project_id);
CREATE INDEX IF NOT EXISTS idx_characters_name        ON public.characters (name);
CREATE INDEX IF NOT EXISTS idx_characters_role        ON public.characters (role);
CREATE INDEX IF NOT EXISTS idx_characters_custom_id   ON public.characters (custom_id);

-- ============================================================
-- 4. outlines — 大纲表
-- ============================================================
-- 支持多层大纲：全书级、卷级、章节级
CREATE TABLE IF NOT EXISTS public.outlines (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_id   TEXT UNIQUE,
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  -- 层级关系
  parent_id   UUID REFERENCES public.outlines(id) ON DELETE CASCADE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  depth       INTEGER NOT NULL DEFAULT 0 CHECK (depth >= 0),

  -- 内容
  title       TEXT NOT NULL DEFAULT '',
  content     TEXT NOT NULL DEFAULT '',       -- 大纲正文（Markdown）
  summary     TEXT NOT NULL DEFAULT '',       -- 一句话摘要
  status      TEXT NOT NULL DEFAULT 'draft'
              CHECK (status IN ('draft', 'writing', 'review', 'completed')),

  -- 关联
  chapter_id  UUID REFERENCES public.chapters(id) ON DELETE SET NULL,

  -- 元数据
  tags        TEXT[] DEFAULT '{}',
  word_count  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE TRIGGER set_outlines_updated_at
  BEFORE UPDATE ON public.outlines
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 索引
CREATE INDEX IF NOT EXISTS idx_outlines_project_id  ON public.outlines (project_id);
CREATE INDEX IF NOT EXISTS idx_outlines_parent_id   ON public.outlines (parent_id);
CREATE INDEX IF NOT EXISTS idx_outlines_chapter_id  ON public.outlines (chapter_id);
CREATE INDEX IF NOT EXISTS idx_outlines_sort        ON public.outlines (project_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_outlines_custom_id   ON public.outlines (custom_id);

-- ============================================================
-- 5. materials — 素材/资料表
-- ============================================================
-- 存储写作素材：灵感笔记、研究资料、参考文档、设定资料等
CREATE TABLE IF NOT EXISTS public.materials (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_id   TEXT UNIQUE,
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  -- 分类
  category    TEXT NOT NULL DEFAULT '其他'
              CHECK (category IN (
                '灵感笔记', '研究资料', '参考文档',
                '设定资料', '世界观', '时间线',
                '对话素材', '描写素材', '其他'
              )),

  -- 内容
  title       TEXT NOT NULL DEFAULT '',
  content     TEXT NOT NULL DEFAULT '',       -- 素材正文（Markdown）
  source      TEXT NOT NULL DEFAULT '',       -- 来源（URL、书籍名等）
  summary     TEXT NOT NULL DEFAULT '',       -- 摘要

  -- 关联
  related_character_id UUID REFERENCES public.characters(id) ON DELETE SET NULL,
  related_chapter_id   UUID REFERENCES public.chapters(id)   ON DELETE SET NULL,

  -- 富元数据
  tags        TEXT[] DEFAULT '{}',
  importance  INTEGER NOT NULL DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),

  -- 附件（存储文件URL或路径）
  attachments JSONB DEFAULT '[]'::jsonb,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE TRIGGER set_materials_updated_at
  BEFORE UPDATE ON public.materials
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 索引
CREATE INDEX IF NOT EXISTS idx_materials_project_id   ON public.materials (project_id);
CREATE INDEX IF NOT EXISTS idx_materials_category     ON public.materials (category);
CREATE INDEX IF NOT EXISTS idx_materials_tags         ON public.materials USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_materials_importance   ON public.materials (importance DESC);
CREATE INDEX IF NOT EXISTS idx_materials_custom_id    ON public.materials (custom_id);

-- ============================================================
-- 附录：常用查询示例
-- ============================================================
-- 1. 获取某作品的所有章节（按顺序）
--    SELECT * FROM chapters WHERE project_id = '...' AND deleted_at IS NULL ORDER BY "order";
--
-- 2. 获取某作品的所有角色
--    SELECT * FROM characters WHERE project_id = '...' AND deleted_at IS NULL ORDER BY sort_order;
--
-- 3. 获取某作品的大纲树（多层）
--    SELECT * FROM outlines WHERE project_id = '...' AND deleted_at IS NULL ORDER BY sort_order;
--
-- 4. 按分类获取素材
--    SELECT * FROM materials WHERE project_id = '...' AND category = '灵感笔记' AND deleted_at IS NULL;
--
-- 5. 搜索标签
--    SELECT * FROM materials WHERE tags @> ARRAY['世界观'] AND deleted_at IS NULL;
