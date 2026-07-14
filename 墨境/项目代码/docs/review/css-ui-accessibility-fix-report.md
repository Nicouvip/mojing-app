# 墨境 CSS / UI / 无障碍修复报告

> 日期：2026-07-14
> 范围：src/components/、src/app/globals.css、src/lib/theme/

---

## 一、修改文件清单

### 1. `src/app/globals.css`
- **问题**：亮色主题变量（`--color-foreground`, `--color-primary`, `--color-warning` 等）游离在全局根作用域，重复覆盖 `@theme` 中的暗色定义
- **修复**：将亮色变量包裹进 `:root { ... }` 块，消除重复定义隐患

### 2. `src/lib/theme/tokens.ts` — **新建**
- 创建统一颜色令牌，导出 `C` 常量对象（含 `pri`, `muted`, `ink`, `success`, `dest`, `border`, `bg2` 等）
- 兼容旧代码的 `S`/`C` 对象模式

### 3. `src/components/brainstorm-modal.tsx`
- **问题**：模态框最外层 `<div>` 缺少无障碍属性
- **修复**：添加 `role="dialog"`、`aria-modal="true"`、`aria-label="脑洞喷射"`

### 4. `src/components/trash-modal.tsx`
- **问题**：同上
- **修复**：添加 `role="dialog"`、`aria-modal="true"`、`aria-label="回收站"`

### 5. `src/components/report-modal.tsx`
- **问题**：模态框缺少无障碍属性；`#c4956a` 硬编码
- **修复**：添加 `role="dialog"`、`aria-modal="true"`、`aria-label="章末自检报告"`；`color="#c4956a"` → `color="var(--color-primary)"`

### 6. `src/components/navbar.tsx`
- **问题**：桌面端 + 移动端共 8 个主题切换按钮缺少 `aria-label`
- **修复**：添加 `aria-label`，值为 "主题: 明亮/暖光/暗夜/清凉"

### 7. `src/components/cooling-matrix.tsx`
- **问题**：tab 按钮缺少 `role="tab"` 和 `aria-selected`；父容器缺少 `role="tablist"`
- **修复**：添加 `role="tablist"`（父容器）、`role="tab"` 和 `aria-selected`（各按钮）

### 8. `src/components/desk-sidebar.tsx`
- **问题**：9 个 disabled 导航项渲染为普通 `<div>`，无 `aria-disabled` 无提示
- **修复**：添加 `aria-disabled="true"` 和 `title="即将上线"`
- **颜色修复**：将 `C` 对象中的颜色替换为引用 `tokens.ts` 的 `C`，本地特有颜色保留在 `C_LOCAL`

### 9. `src/components/plan-panel.tsx`
- **问题**：`S` 对象内的颜色值硬编码
- **修复**：替换为 `import { C } from '@/lib/theme/tokens'`，`S` 指向 `C`

### 10. `src/components/status-panel.tsx`
- **问题**：`S` 对象内的颜色值硬编码
- **修复**：替换为 `import { C } from '@/lib/theme/tokens'`，`S` 指向 `C`

### 11. `src/components/workflow-bar.tsx`
- **问题**：`text-[#b06060]` 硬编码
- **修复**：替换为 `text-destructive`（Tailwind CSS 变量类）

---

## 二、已检查无需修改的项

| 检查项 | 结果 |
|--------|------|
| `.theme-warm` 缺少闭合花括号 | ❌ 不存在 — 已在文件第 407 行正确闭合 |
| `.book-item` 中 `border-left` 不完整值 | ❌ 不存在 — 值完整 `3px solid rgba(...)` |
| `report-modal.tsx` 重复的 `AiCheckSection` | ❌ 不存在 — 仅一处定义、一处引用 |
| 游离 `color:` / `background-color:` 语句 | ❌ 未发现 |

---

## 三、效果统计

| 指标 | 数值 |
|------|------|
| 修复 CSS 文件 | 1 个 |
| 新建文件 | 1 个（tokens.ts） |
| 修复组件文件 | 8 个 |
| 添加 `role="dialog"` | 3 处 |
| 添加 `aria-modal="true"` | 3 处 |
| 添加 `aria-label` | 11 处（模态框 3 + 主题按钮 8） |
| 添加 `role="tab"`/`aria-selected` | 3 个按钮 + 1 个容器 |
| 添加 `aria-disabled` | 9 项 |
| 添加 "即将上线" 提示 | 9 项 |
| 替换硬编码颜色 | 6 个文件 |
| **编译** | **0 错误** ✅ |

---

## 四、未触及

- `compliance-panel/compliance-panel.tsx` 中的硬编码颜色 — 在子目录中，按任务范围未包含
- `desk/page.tsx`、`editor/page.tsx` 中的 `C`/`S` 对象 — 在 `src/app/` 下，按任务范围仅修复 `src/components/`
