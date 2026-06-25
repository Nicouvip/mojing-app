# 墨境 — AI 网文写作工作台

**Tech**: Next.js 16 + React 19 + TypeScript 6 + Tailwind CSS 4 + shadcn/ui + Tiptap 3

---

## Commands

```bash
pnpm dev          # 开发服务器 http://localhost:3000
pnpm build        # 生产构建
pnpm start        # 生产服务器
pnpm lint         # ESLint
```

## Architecture

| 层 | 路径 | 职责 |
|----|------|------|
| 页面 | `src/app/page.tsx` | 首页：作品列表 + 新建/删除 |
| 编辑器 | `src/app/editor/[id]/page.tsx` | 三栏写作编辑器（左栏+编辑区+右面板） |
| 编辑器组件 | `src/components/writing-editor.tsx` | TipTap 封装，工具栏 + 字数进度 |
| API 路由 | `src/app/api/ai/*/route.ts` | 4 个 AI 接口：续写/润色/扩写/脑洞喷射 |
| 合规检测 | `src/lib/compliance.ts` | 禁用词/55字线/身体密度等写作规则 |
| 数据层 | `src/lib/store.ts` | 内存 + localStorage 双模式，章节 CRUD |
| 类型 | `src/lib/types.ts` | Project / Chapter 定义 |
| 工具 | `src/lib/utils.ts` | cn() 等通用函数 |
| UI 组件 | `src/components/ui/*.tsx` | shadcn Button、Card |

## Conventions

- **命名**: 文件 kebab-case，组件 PascalCase，函数 camelCase
- **状态**: `useState` 本地管理（~30 个），无 Zusatand/Redux
- **存储**: `store.ts` 用 `loadClient/saveClient` 读写 localStorage + 内存缓存
- **API**: 全部 POST，`{ text: string }` / `{ ideas: string }` 响应
- **AI**: DeepSeek V4 Flash，temperature 0.6–1.1 按场景调整
- **样式**: Tailwind v4 + shadcn，语义化 CSS 变量（`--color-primary`），`cn()` 合并类
- **主题**: `.dark` 暗夜，`.theme-warm` 暖光，`.theme-cool` 冷光
- **内容**: 当前存/取纯文本（`getText()`），富文本格式不保留（待修复）
- **API Key**: 4 处硬编码在 route.ts 中，上线前移入 `.env.local`

## Notes

— 文档：`D:\建网站\mojing-docs\` 下有三份项目分析文档
— 备份：`D:\建网站\mojing-app-backup-*.tar.gz`
