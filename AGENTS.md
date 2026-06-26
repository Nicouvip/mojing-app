# 墨境 — AI 网文写作工作台

**Tech**: Next.js 16 + React 19 + TypeScript 6 + Tailwind CSS 4 + shadcn/ui + Tiptap 3  
**Package manager**: pnpm  
**AI Model**: DeepSeek Chat (`deepseek-chat`) via `DEEPSEEK_API_KEY`  
**Database**: Supabase（schema 就绪，当前开发环境 fallback 到 localStorage + 内存缓存）  
**Auth**: next-auth + 内存用户存储（开发用）

---

## Commands

```bash
pnpm dev          # 开发服务器 http://localhost:3000
pnpm build        # 生产构建
pnpm start        # 生产服务器
pnpm lint         # ESLint src/
pnpm lint:fix     # ESLint 自动修复
pnpm typecheck    # TypeScript 编译检查
pnpm ci           # lint + typecheck + build
```

---

## Architecture

### 页面路由

| 路径 | 文件 | 职责 |
|------|------|------|
| `/` | `src/app/page.tsx` | 首页：Landing + 作品列表 + 新建/删除 + 主题切换 |
| `/editor/[id]` | `src/app/editor/[id]/page.tsx` | 三栏写作编辑器（目录+编辑区+右侧面板） |
| `/login` | `src/app/login/page.tsx` | 登录页 |
| `/register` | `src/app/register/page.tsx` | 注册页 |
| `/dashboard` | `src/app/dashboard/` | 用户工作台 |
| `/works` | `src/app/works/` | 我的作品 |
| `/library` | `src/app/library/` | 素材库 |
| `/tools` | `src/app/tools/` | 工具广场 |
| `/cases` | `src/app/cases/` | 写作案例 |
| `/templates` | `src/app/templates/` | 模板中心 |
| `/features` | `src/app/features/` | 产品功能 |
| `/account` | `src/app/account/` | 个人中心 |
| `/admin` | `src/app/admin/` | 管理后台（用户管理/备份/上传） |
| `/workshop` | `src/app/workshop/` | 创作工坊 |
| `/quality-check` | `src/app/quality-check/` | 质量检测 |
| `/rules` | `src/app/rules/` | 写作规则 |
| `/desk` | `src/app/desk/` | 写作台 |
| `/page-editor` | `src/app/page-editor/` | 页面编辑器 |

### API 路由

| 路径 | 职责 |
|------|------|
| `api/ai/continue` | AI 续写（含冲突等级/风格/题材参数） |
| `api/ai/polish` | AI 润色 |
| `api/ai/expand` | AI 扩写 |
| `api/ai/brainstorm` | AI 脑洞喷射（灵感/炼金术/开篇模式） |
| `api/ai/compliance` | 合规检测报告 |
| `api/ai/inspire` | 灵感生成 |
| `api/ai/layout` | 章节布局建议 |
| `api/ai/narrative` | 叙事建议 |
| `api/ai/ending-hint` | 结尾提示 |
| `api/ai/unblock` | 卡文解封 |
| `api/ai/a8-status` | A8 状态检测 |
| `api/ai/cooling/*` | 冷却记录/状态 |
| `api/auth/*` | next-auth 认证 |
| `api/auth/login` | 登录 |
| `api/auth/register` | 注册 |
| `api/export/txt` | TXT 导出 |
| `api/admin/*` | 后台管理（备份/上传/用户） |
| `api/rules/styles` | 风格规则 |
| `api/tools` | 工具 API |

### 核心模块

| 层 | 路径 | 职责 |
|----|------|------|
| **数据层** | `src/lib/db/store.ts` | 内存 + localStorage 双模式，软删除/恢复/7天清理 |
| **类型** | `src/lib/db/types.ts` | Project / Chapter 定义 |
| **Supabase 客户端** | `src/lib/db/supabase-client.ts` | Supabase 连接（未激活） |
| **认证上下文** | `src/lib/db/auth-context.tsx` | useAuth() 钩子，登录/登出/访客模式 |
| **认证存储** | `src/lib/db/auth-store.ts` | bcrypt 密码哈希，5个种子用户 |
| **编辑器组件** | `src/components/writing-editor.tsx` | TipTap 封装，工具栏 + 字数进度 + 7种扩展 |
| **UI 组件** | `src/components/ui/*.tsx` | shadcn Button、Card 等 |
| **合规检测** | `src/lib/ai/compliance.ts` | A/B/C/D 四类禁用词检测、55字生死线、段落8项阻断、章节23项检查、精修质检15项 |
| **Prompt 系统** | `src/lib/prompts/` | 模板注册表 + 构建器 + 铁律层 + 合规词同步 + A/B 测试 + 反馈闭环 |
| **工具函数** | `src/lib/utils/` | cn()、fetch-with-timeout、主题上下文、埋点追踪 |
| **页面构建器** | `src/lib/page-builder/` | 可视化页面构建（暂禁用） |

### 提示词系统 (`src/lib/prompts/`)

| 文件 | 职责 |
|------|------|
| `index.ts` | 统一导出 |
| `types.ts` | PromptTemplate、BuildOptions、ConflictLevel 等类型 |
| `registry.ts` | 模板注册表 |
| `builder.ts` | buildPrompt() 构建器 |
| `iron-rules.ts` | 系统铁律提示词 |
| `templates/` | 各模板（续写/润色/扩写/脑洞） |
| `compliance-sync.ts` | 合规词单一数据源（A/B/C/D类词、身体动作词、精致句指示词等） |
| `ab-test.ts` | A/B 实验框架 |
| `feedback.ts` | 提示词反馈闭环 |
| `store.ts` | 提示词版本管理 |

---

## Conventions

- **命名**: 文件 kebab-case，组件 PascalCase，函数 camelCase
- **状态**: `useState` 本地管理，无 Zustand/Redux
- **存储**: `store.ts` 用 `loadClient/saveClient` 读写 localStorage + 内存缓存，内置 Supabase 支持
- **API**: 全部 POST，JSON 体请求/响应
- **AI**: DeepSeek Chat，temperature 0.6–1.1 按场景调整，API Key 通过 `DEEPSEEK_API_KEY` 环境变量
- **样式**: Tailwind v4 + shadcn，语义化 CSS 变量（`--color-primary`），`cn()` 合并类
- **主题**: `.light` 浅色、`.theme-warm` 暖光、`.dark` 暗夜、`.theme-cool` 冷光
- **认证**: next-auth + 内存用户（开发），生产需切换 Supabase Auth
- **内容**: 编辑器存/取 HTML（`editor.getHTML()`），纯文本统计用 `toPlainText()`
- **合规**: 合规检测引擎对 HTML 文本直接运行（**已知 Bug：需先解析 HTML 标签再检测**）
- **软删除**: 所有删除操作设 `deletedAt` 时间戳，7 天后自动清理

---

## Known Issues（截至 V2 测试报告）

| 级别 | 数量 | 关键项 |
|------|------|--------|
| 🔴 P0 | 4 | 合规检测对 HTML 无效、AI 插入破坏 HTML、模型名不存在、handleKeyDown 未绑定 |
| 🟡 P1 | 7 | 字数统计含标签、双实现矛盾、SSR 保护、顺序重置等 |
| 🟢 P2 | 4 | 禁用词半实现、标点遗漏、脑洞无上限等 |
| 🔵 P3 | 2 | 错误信息泄露、路径硬编码 |

**总计**: 17 个未修复（1 个已修复：BUG-23 API Key 硬编码）

---

## Project Rules

- **铁律 1**: 用户确认功能模块没问题后，必须立即做备份（`mojing-app-backup-*.tar.gz`）
- **铁律 2**: 每次收工前跑总管自检清单（进度/文档/质量/纪律）
- **铁律 3**: 任务开始前必须调用 `frontend-design` + `ui-ux-pro-max`，完成后必须 `verification-before-completion` + `mojing-output-protocol`

## Notes

— 文档：`D:\建网站\mojing-docs\` 下有项目分析文档和设计文档  
— 备份：`D:\建网站\mojing-app-backup-*.tar.gz`  
— 测试报告：`docs/test-report-v1.md`（初版）`docs/test-report-v2.md`（最新）  
— 代码审计：`docs/code-audit-report.md`  
— 设计系统：`docs/design-system-v1.md`
