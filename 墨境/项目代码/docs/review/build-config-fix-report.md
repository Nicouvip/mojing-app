# 墨境构建配置修复报告

> 日期：2026-07-14
> 范围：项目根目录配置文件

---

## 一、修改文件清单

### 1. `package.json`
- **`@dnd-kit/sortable` 版本降级**：`^10.0.0` → `^6.3.1`，与 `@dnd-kit/core` 版本匹配
- **`drizzle-kit` 移到 devDependencies**：仅用于开发（生成 SQL），生产环境不需要
- **新增 `pnpm.onlyBuiltDependencies`**：指定 `better-sqlite3`、`esbuild`、`sharp` 允许构建

### 2. `pnpm-workspace.yaml`
- **`allowBuilds` → `onlyBuiltDependencies`**：pnpm 新版标准格式，使用 YAML 列表语法

### 3. `.gitignore`
- **新增 `!.env.example`**：在 `.env*` 规则前添加例外，允许提交环境变量示例文件

### 4. `eslint.config.mjs`
- **新增 3 条规则**：
  - `@typescript-eslint/no-floating-promises: "error"` — 禁止未处理的 Promise
  - `no-empty: ["error", { allowEmptyCatch: false }]` — 禁止空代码块（包括空 catch）
  - `require-await: "error"` — 要求 async 函数必须有 await

### 5. `next.config.ts`
- **新增 `images.remotePatterns`**：允许加载来自 `*.supabase.co` 的图片（storage API 路径）

### 6. `README.md`
- **完全重写为中文**：包含项目说明、技术栈表格、环境要求、快速开始、可用命令、目录结构、功能概览

### 7. 删除 Python 脚本
- **已确认项目目录下无 `.py` 文件**，无需操作

---

## 二、效果统计

| 指标 | 数值 |
|------|------|
| 修改配置文件 | 6 个 |
| 删除文件 | 0 个（Python 脚本不存在） |
| 编译 | 无源代码修改，不影响编译 |
