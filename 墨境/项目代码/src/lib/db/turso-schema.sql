-- ============================================================
-- 墨境 (Mojing) — Turso (libSQL/SQLite) 建表脚本
-- 版本：v2.0.0
-- 说明：在 Turso 数据库中执行此脚本创建全部数据表
-- 数据库：libsql://mojing-nicouvip.aws-ap-northeast-1.turso.io
-- ============================================================

-- ============================================================
-- 1. projects — 作品/项目表
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL DEFAULT '未命名作品',
  genre       TEXT NOT NULL DEFAULT '都市',
  description TEXT NOT NULL DEFAULT '',
  chapter_count INTEGER NOT NULL DEFAULT 1,
  total_words   INTEGER NOT NULL DEFAULT 0,
  user_id     TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at  TEXT
);

CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_genre      ON projects (genre);
CREATE INDEX IF NOT EXISTS idx_projects_user_id    ON projects (user_id);

-- ============================================================
-- 2. chapters — 章节表
-- ============================================================
CREATE TABLE IF NOT EXISTS chapters (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT '未命名章节',
  content     TEXT NOT NULL DEFAULT '',
  "order"     INTEGER NOT NULL DEFAULT 0,
  word_count  INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'draft',
  volume_id   TEXT NOT NULL DEFAULT '',
  user_id     TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at  TEXT
);

CREATE INDEX IF NOT EXISTS idx_chapters_project_id  ON chapters (project_id);
CREATE INDEX IF NOT EXISTS idx_chapters_order       ON chapters (project_id, "order");
CREATE INDEX IF NOT EXISTS idx_chapters_status      ON chapters (status);
CREATE INDEX IF NOT EXISTS idx_chapters_volume_id   ON chapters (volume_id);

-- ============================================================
-- 3. volumes — 卷表（新增）
-- ============================================================
CREATE TABLE IF NOT EXISTS volumes (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL,
  name        TEXT NOT NULL DEFAULT '未命名卷',
  "order"     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_volumes_project_id ON volumes (project_id);

-- ============================================================
-- 4. character_profiles — 角色档案表（v2 扩展版）
-- ============================================================
CREATE TABLE IF NOT EXISTS character_profiles (
  id                  TEXT PRIMARY KEY,
  project_id          TEXT NOT NULL,
  name                TEXT NOT NULL,
  type                TEXT NOT NULL DEFAULT '配角',
  core_personality    TEXT NOT NULL DEFAULT '',
  speaking_style      TEXT NOT NULL DEFAULT '',
  core_desire         TEXT NOT NULL DEFAULT '',
  core_obstacle       TEXT NOT NULL DEFAULT '',
  body_habits         TEXT NOT NULL DEFAULT '[]',
  sensory_channels    TEXT NOT NULL DEFAULT '[]',
  imagery_types       TEXT NOT NULL DEFAULT '[]',
  metaphor_domains    TEXT NOT NULL DEFAULT '[]',
  initial_personality TEXT NOT NULL DEFAULT '',
  current_personality TEXT NOT NULL DEFAULT '',
  growth_history      TEXT NOT NULL DEFAULT '[]',
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_character_profiles_project_id ON character_profiles (project_id);

-- ============================================================
-- 5. outlines — 大纲表（v2 扩展版）
-- ============================================================
CREATE TABLE IF NOT EXISTS outlines (
  id                    TEXT PRIMARY KEY,
  project_id            TEXT NOT NULL,
  chapter_order         INTEGER NOT NULL DEFAULT 0,
  core_event            TEXT NOT NULL DEFAULT '',
  function_tag          TEXT NOT NULL DEFAULT '',
  emotion_arc           TEXT NOT NULL DEFAULT '',
  conflict_level        TEXT NOT NULL DEFAULT 'L2',
  foreshadows_to_plant  TEXT NOT NULL DEFAULT '[]',
  foreshadows_to_resolve TEXT NOT NULL DEFAULT '[]',
  characters            TEXT NOT NULL DEFAULT '[]',
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_outlines_project_id ON outlines (project_id);

-- ============================================================
-- 6. world_settings — 世界观设定表（v2 带排序）
-- ============================================================
CREATE TABLE IF NOT EXISTS world_settings (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'custom',
  title       TEXT NOT NULL DEFAULT '',
  content     TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_world_settings_project_id ON world_settings (project_id);

-- ============================================================
-- 7. foreshadows — 伏笔表（新增）
-- ============================================================
CREATE TABLE IF NOT EXISTS foreshadows (
  id                        TEXT PRIMARY KEY,
  project_id                TEXT NOT NULL,
  content                   TEXT NOT NULL DEFAULT '',
  importance                TEXT NOT NULL DEFAULT 'minor',
  status                    TEXT NOT NULL DEFAULT 'active',
  chapter_planted           INTEGER NOT NULL DEFAULT 0,
  chapter_planned_resolution INTEGER,
  chapter_resolved          INTEGER,
  related_characters        TEXT NOT NULL DEFAULT '[]',
  created_at                TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_foreshadows_project_id ON foreshadows (project_id);
CREATE INDEX IF NOT EXISTS idx_foreshadows_status ON foreshadows (status);

-- ============================================================
-- 8. cooling_states — 冷却状态表（新增，按项目唯一）
-- ============================================================
CREATE TABLE IF NOT EXISTS cooling_states (
  id                   TEXT PRIMARY KEY,
  project_id           TEXT NOT NULL UNIQUE,
  senses               TEXT NOT NULL DEFAULT '{}',
  sentences            TEXT NOT NULL DEFAULT '{}',
  scenes               TEXT NOT NULL DEFAULT '{}',
  endings              TEXT NOT NULL DEFAULT '{}',
  hooks                TEXT NOT NULL DEFAULT '{}',
  emotions             TEXT NOT NULL DEFAULT '[]',
  progressive_judgment TEXT NOT NULL DEFAULT '{}',
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cooling_states_project_id ON cooling_states (project_id);

-- ============================================================
-- 9. writing_plans — 写作计划卡片表（新增）
-- ============================================================
CREATE TABLE IF NOT EXISTS writing_plans (
  id                 TEXT PRIMARY KEY,
  project_id         TEXT NOT NULL,
  chapter_order      INTEGER NOT NULL DEFAULT 0,
  conflict_level     TEXT NOT NULL DEFAULT 'L2',
  style              TEXT NOT NULL DEFAULT '快消口语',
  scene_method       TEXT NOT NULL DEFAULT '',
  sensory_anchors    TEXT NOT NULL DEFAULT '[]',
  body_anchors       TEXT NOT NULL DEFAULT '[]',
  ending_type        TEXT NOT NULL DEFAULT '',
  hook_type          TEXT NOT NULL DEFAULT '',
  special_techniques TEXT NOT NULL DEFAULT '[]',
  status_line        TEXT NOT NULL DEFAULT '',
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_writing_plans_project_id ON writing_plans (project_id);

-- ============================================================
-- 10. chapter_reports — 章末自检报告表（新增）
-- ============================================================
CREATE TABLE IF NOT EXISTS chapter_reports (
  id              TEXT PRIMARY KEY,
  project_id      TEXT NOT NULL,
  chapter_id      TEXT NOT NULL,
  chapter_order   INTEGER NOT NULL DEFAULT 0,
  score           INTEGER NOT NULL DEFAULT 0,
  compliant       INTEGER NOT NULL DEFAULT 0,
  forbidden_a     INTEGER NOT NULL DEFAULT 0,
  forbidden_b     INTEGER NOT NULL DEFAULT 0,
  forbidden_c     INTEGER NOT NULL DEFAULT 0,
  forbidden_d     INTEGER NOT NULL DEFAULT 0,
  body_density    INTEGER NOT NULL DEFAULT 0,
  opening_hook    INTEGER NOT NULL DEFAULT 0,
  items           TEXT NOT NULL DEFAULT '[]',
  ai_results      TEXT,
  report_line     TEXT NOT NULL DEFAULT '',
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_chapter_reports_project_id ON chapter_reports (project_id);
CREATE INDEX IF NOT EXISTS idx_chapter_reports_chapter_id ON chapter_reports (chapter_id);
