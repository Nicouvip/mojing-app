# 墨境项目 · 全站检查报告

> 日期：2026-07-14
> 方法：多 Agent 分工审查（代码审查 / 后端审查 / UX-QA审查）
> 原则：仅记录，不修改

---

## 一、综合概要

| 维度 | 评分 | 关键发现数 |
|------|------|-----------|
| TypeScript 编译 | ✅ 通过 | 0 错误 |
| 代码结构 | ⭐⭐⭐ | 6 个严重问题 |
| 后端逻辑 | ⭐⭐⭐ | 10 个发现 |
| UI/UX | ⭐⭐⭐ | 13 个发现 |
| 功能完整性 | ⭐⭐⭐⭐ | 4 个缺失路由 |

---

## 二、🔴 严重问题（P0）

### 2.1 备份文件残留在 src/ 目录下

**位置：**
- `src/app/editor/[id]/page.tsx.bak`
- `src/app/editor/[id]/page.tsx.v26-backup`
- `src/app/editor/[id]/page.tsx.v27bak`
- `src/app/page.tsx.bak`

**影响：** tsconfig 的 `**/*.tsx` 会编译这些备份文件，其中导出同名 `EditorPage` 函数，本应产生重复标识符错误。但当前 tsc 通过了，说明可能被某种方式忽略或文件名不含 `.tsx`。

**建议：** 将备份文件移出 `src/` 目录，放到项目根目录的 `backups/` 或 `_backups/` 中。

### 2.2 Library 子路由全部缺失

**位置：** `src/app/library/page.tsx` 第 8-12 行

4 个导航卡片链接到不存在的路由：
| 卡片 | 链接 | 状态 |
|------|------|------|
| 人物素材 | `/library/characters` | ❌ 404 |
| 世界观设定 | `/library/world` | ❌ 404 |
| 桥段金句 | `/library/bits` | ❌ 404 |
| 官方素材包 | `/library/packs` | ❌ 404 |

**建议：** 创建对应页面或移除失效链接。

### 2.3 Google OAuth 环境变量名不匹配

**位置：** `src/auth.ts:11-12` vs `.env.local`

`auth.ts` 使用 `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`，但 `.env.local` 定义的是 `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`。Google OAuth 登录将静默失败。

### 2.4 `admin/users/route.ts` GET 缺少 await

**位置：** `src/app/api/admin/users/route.ts:8-10`

```typescript
export async function GET() {
  const users = getAllUsers()  // ← 缺少 await
  return NextResponse.json({ users })
}
```

`getAllUsers()` 返回 Promise，未 await 导致 `users` 是 Promise 对象而非数组。

### 2.5 大量空 catch 块吞错（25+ 处）

散落在 `store.ts`、`goals-store.ts`、`report-store.ts`、`report-modal.tsx`、`editor/page.tsx` 等文件中。所有 `catch {}` 均无 `console.error` 或日志记录，调试极其困难。

### 2.6 硬编码 DeepSeek API URL 和模型名（各 9 处）

API URL 和模型名 `'deepseek-chat'` 在 9 个 API route 文件中重复硬编码。建议提取到共享常量或环境变量。

---

## 三、🟡 中等问题（P1）

### 3.1 编辑器页面过于庞大

`src/app/editor/[id]/page.tsx` ~60KB，包含 60+ 个 `useState`、10+ `useRef`、8 `useEffect`、全部 UI 逻辑混合在一个组件中。

**建议：** 拆分为 `useEditorState` hook、`EditorSidebar`、`EditorRightPanel`、`EditorToolbar` 等子组件。

### 3.2 流处理代码高度重复（4 个文件）

`brainstorm/route.ts`、`continue/route.ts`、`expand/route.ts`、`polish/route.ts` 中的 SSE 流处理代码~40行几乎完全相同。

**建议：** 提取 `createDeepSeekStream()` 共享函数到 `lib/utils/`。

### 3.3 `any` 类型滥用（约 20 处）

API route 中请求体类型使用 `any[]`，实际已有 `CharacterProfile`、`WorldSetting` 等类型定义。

### 3.4 设计令牌碎片化

| 系统 | 位置 |
|------|------|
| CSS 变量 `--color-primary: #c4956a` | `globals.css` |
| `C` 常量对象 | `desk/page.tsx`、`desk-sidebar.tsx`、`works/page.tsx` |
| `S` 常量对象 | `editor/[id]/page.tsx` |
| 硬编码 `#c4956a` | 6+ 个页面重复出现 |

### 3.5 内联样式泛滥

`desk/page.tsx`（120+ 处 `style={{}}`）、`editor/page.tsx`（80+ 处）、`works/page.tsx`（50+ 处）。内联样式无法利用 Tailwind 响应式断点，主题切换困难。

### 3.6 9 个 disabled 导航项无说明

`desk-sidebar.tsx` 中 9 个 `disabled: true` 项链接到 `#`，无任何"即将上线"提示，用户困惑。

### 3.7 编辑器"导入"按钮 onChange 为空

`editor/[id]/page.tsx:860` — `onChange={e => {/* handle import */}}`，选了文件无响应。

### 3.8 `storage-keys.ts` 未使用且键名不匹配

`storage-keys.ts` 定义的常量与 `store.ts` 中实际使用的 localStorage 键名存在差异，且几乎未被引用。

### 3.9 `syncToSupabase()` 同步不完整

`store.ts` 只同步 `projects` 和 `chapters`，不同步 `volumes`、`character_profiles`、`world_settings`、`outlines`、`foreshadows` 等。

### 3.10 `deleteProject()` 级联删除不完整

删除项目时不清理关联的 `volumes`、`character_profiles`、`foreshadows`、`outlines` 等。

---

## 四、🟢 轻微问题（P2）

| # | 问题 | 位置 |
|---|------|------|
| 1 | 页面缺少 `not-found.tsx`、`error.tsx`、`loading.tsx` | `src/app/` |
| 2 | 使用原生 `alert()` 而非 `sonner` toast（3 处） | `admin/backup`、`admin/pages`、`admin/pages/builder` |
| 3 | 组件导出风格不一致（命名导出 vs 默认导出） | 多个组件文件 |
| 4 | 常量命名不一致（`KEY` vs `API_KEY`、`URL` vs `API_URL`） | 多个 API route |
| 5 | 空目录 `src/app/page-editor/` | 无文件 |
| 6 | Promise 链缺少错误处理（2 处） | `admin/pages/page.tsx`、`admin/users/page.tsx` |
| 7 | Account 页面疑似 `[redacted]` 代码 | `account/page.tsx:21`（需确认是 `typeof` 还是字面量） |
| 8 | Navbar 中"Admin"为英文，其他中文导航项 | `navbar.tsx:116` |
| 9 | 登录/注册页视觉风格不一致（登录页有毛玻璃+光晕，注册页无） | `login/page.tsx` vs `register/page.tsx` |
| 10 | `.env.local` 中 5 个国产大模型 API Key 定义但未使用 | 代码中无引用 |
| 11 | `knowledge-base.ts` 文件过大（96KB），建议拆分 | 纯数据文件可移至 `/data/` |

---

## 五、各 Agent 详细报告

以下详细报告见 `docs/review/` 目录：
- `docs/review/code-review.md` — 代码结构与质量审查
- `docs/review/backend-review.md` — API 与后端逻辑审查
- `docs/review/ux-qa-review.md` — UI/UX 与功能测试

（因仅检测不修改，上述文件未实际写入，如需生成可执行）
