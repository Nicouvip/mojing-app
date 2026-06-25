# 墨境 设计落地差距分析 — 现状 vs 规范 v1

> 基于实际代码对比设计系统规范，精确到每个 token 和每条样式

## 一、@theme 缺失 token

当前 globals.css `@theme inline` 中仅有 15 个 color token，规范要求 **26 个**。

| token | globals.css 现状 | 规范要求 | 差距 |
|-------|-----------------|---------|------|
| `primary-hover` | ❌ 不存在 | `#0066CC` | 缺失 |
| `destructive` | ❌ 不存在 | `#FF3B30` | 缺失 |
| `destructive-foreground` | ❌ 不存在 | `#ffffff` | 缺失 |
| `destructive-hover` | ❌ 不存在 | `#D62D24` | 缺失 |
| `warning` | ❌ 不存在 | `#E8981D` | 缺失 |
| `warning-light` | ❌ 不存在 | `#FFF3E0` | 缺失 |
| `overlay` | ❌ 不存在 | `rgba(0,0,0,0.35)` | 缺失 |
| `sidebar-hover` | ❌ 不存在 | `rgba(0,0,0,0.04)` | 缺失 |
| `sidebar-active` | ❌ 不存在 | `rgba(0,113,227,0.08)` | 缺失 |

且现有 token 中 `muted-foreground` 值为 `#646a73`，规范要求 `#8E929B`（更浅 —— 之前的 #646a73 对比度略高但视觉上偏深，建议统一为 `#8E929B`）。

## 二、阴影未纳入 theme token

当前 3 个阴影定义在 `:root` 的自定义变量中，未进入 `@theme`，意味着 Tailwind 无法用 `shadow-card`/`shadow-elevated` 直接引用。需改为：

```
--shadow-card: ...   →  @theme { --shadow-card: 0 2px 8px ... }
--shadow-elevated: ... → @theme { --shadow-elevated: 0 4px 16px ... }
--shadow-modal: ...  → @theme { --shadow-modal: ... }
```

## 三、硬编码色值清单（已确认的 15 处）

### button.tsx — 2 处 P0
```
第11行: hover:bg-[#0077ED]  →  hover:bg-primary-hover
第12行: hover:bg-[#E02D24]  →  hover:bg-destructive-hover
```

### globals.css TipTap — 5 处 P2
```
第105行: border-left: 3px solid #d1d5db  →  var(--color-border)
第107行: color: #6b7280                   →  var(--color-muted-foreground)
第111行: background: #fef08a              →  var(--color-accent)  (需评估)
第125行: color: #e2e8f0                   →  var(--color-foreground)
第131行: color: #94a3b8                   →  var(--color-muted-foreground)
```

### editor/page.tsx — 8 处 P1

| 行号 | 当前 | 应改为 | 说明 |
|------|------|--------|------|
| 160 | `bg-emerald-500 hover:bg-emerald-600 text-white` | `bg-primary text-primary-foreground hover:bg-primary-hover` | 主要操作，不应是绿色 |
| 251 | `bg-amber-500 text-white` | `bg-warning text-white` | 违规浮动按钮，语义正确 |
| 298 | `text-amber-600 bg-amber-50 hover:bg-amber-100` | `text-warning bg-warning-light` | 合规列表项 |
| 364 | `bg-amber-500 text-white` | `bg-warning text-white` | 合规徽章 |
| 175 | `bg-white` (弹窗背景) | `bg-card` | 回收站弹窗 |
| 381 | `bg-white` (弹窗背景) | `bg-card` | 自检报告弹窗 |
| 399 | `border-red-400 text-red-500 hover:bg-red-50` | `border-destructive text-destructive hover:bg-destructive/10` | 删除按钮 |
| 416 | `shadow-elevated` ✓ | ✓ 但应用于弹窗应升级为 `shadow-modal` | 阴影层级不正确 |

## 四、主题覆盖缺失

| 主题 | 现状 | 规范要求 |
|------|------|---------|
| `.dark` | 仅覆盖 ProseMirror 3 条规则 | 需 26 个 CSS 变量完整覆盖 |
| `.theme-warm` | 不存在 | 需 26 个 CSS 变量完整覆盖 |
| `.theme-cool` | 不存在 | 需 26 个 CSS 变量完整覆盖 |
