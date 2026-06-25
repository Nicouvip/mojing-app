# 墨境 设计系统落地实施路线图

> 优先级排序 · 精确到每个文件每行改动 · 前端可逐条执行

---

## 执行总览

| 阶段 | 内容 | 涉及文件 | 工时估计 |
|------|------|---------|---------|
| **Phase 1** | 补齐 `@theme` token + 四套主题完整覆盖 | `globals.css` | 30min |
| **Phase 2** | 修复 Button 组件硬编码 | `button.tsx` | 5min |
| **Phase 3** | 编辑器页面色值语义化 | `editor/[id]/page.tsx` | 20min |
| **Phase 4** | TipTap 排版区域色值迁移 | `globals.css` | 10min |
| **Phase 5** | 侧栏交互增强 + 阴影 token 化 | `globals.css` + 编辑器 page | 15min |

---

## Phase 1：补齐 `@theme` 与四套主题色板（P0）

### 改动：`src/app/globals.css`

#### 步骤 1.1 — 补充 `@theme inline` 中的缺失 token

在现有 `--color-sidebar-foreground: #1D1D1F;` 之后，追加：

```css
--color-primary-hover: #0066CC;
--color-destructive: #FF3B30;
--color-destructive-foreground: #ffffff;
--color-destructive-hover: #D62D24;
--color-warning: #E8981D;
--color-warning-light: #FFF3E0;
--color-overlay: rgba(0,0,0,0.35);
--color-sidebar-hover: rgba(0,0,0,0.04);
--color-sidebar-active: rgba(0,113,227,0.08);
```

同时**修正 `muted-foreground`** 的值从 `#646a73` → `#8E929B`。

#### 步骤 1.2 — 将阴影从 `:root` 迁移到 `@theme`

将 `:root { ... }` 中的 3 个阴影定义**删除**，改为在 `@theme inline { ... }` 中追加：

```css
--shadow-soft: 0 1px 3px rgba(0,0,0,0.04);
--shadow-card: 0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06);
--shadow-elevated: 0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);
--shadow-modal: 0 8px 32px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06);
```

#### 步骤 1.3 — 追加 `.dark` 完整色板覆盖

在 `@layer base { ... }` 之后，追加：

```css
/* ===== 暗夜主题完整色板 ===== */
.dark {
  --color-background: #1A1C1E;
  --color-foreground: #E8E8E8;
  --color-primary: #5A9BF5;
  --color-primary-foreground: #1A1C1E;
  --color-primary-light: rgba(90,155,245,0.12);
  --color-primary-hover: #7AB0F7;
  --color-secondary: #242628;
  --color-secondary-foreground: #E8E8E8;
  --color-muted: #2A2C2E;
  --color-muted-foreground: #8A8C8E;
  --color-accent: rgba(76,217,150,0.12);
  --color-accent-foreground: #4CD996;
  --color-destructive: #FF5A4A;
  --color-destructive-foreground: #ffffff;
  --color-destructive-hover: #E04A3A;
  --color-warning: #E8B84A;
  --color-warning-light: rgba(232,184,74,0.12);
  --color-border: rgba(255,255,255,0.08);
  --color-input: rgba(255,255,255,0.10);
  --color-ring: rgba(90,155,245,0.35);
  --color-card: #242628;
  --color-card-foreground: #E8E8E8;
  --color-popover: #2A2C2E;
  --color-popover-foreground: #E8E8E8;
  --color-overlay: rgba(0,0,0,0.55);
  --color-sidebar: rgba(30,32,34,0.90);
  --color-sidebar-foreground: #D0D0D0;
  --color-sidebar-hover: rgba(255,255,255,0.05);
  --color-sidebar-active: rgba(90,155,245,0.12);
}
```

#### 步骤 1.4 — 追加 `.theme-warm` 完整色板

```css
/* ===== 暖光主题色板 ===== */
.theme-warm {
  --color-background: #F5F0E8;
  --color-foreground: #3C3633;
  --color-primary: #B8860B;
  --color-primary-foreground: #ffffff;
  --color-primary-light: #FDF3E0;
  --color-primary-hover: #A0760A;
  --color-secondary: #EDE6D8;
  --color-secondary-foreground: #3C3633;
  --color-muted: #EDE6D8;
  --color-muted-foreground: #8A7F78;
  --color-accent: #E8F0E0;
  --color-accent-foreground: #5A7A4A;
  --color-destructive: #C95A4A;
  --color-destructive-foreground: #ffffff;
  --color-destructive-hover: #B04A3A;
  --color-warning: #C8922A;
  --color-warning-light: #F5E8CC;
  --color-border: rgba(60,54,51,0.08);
  --color-input: rgba(60,54,51,0.10);
  --color-ring: rgba(184,134,11,0.30);
  --color-card: #FCF8F0;
  --color-card-foreground: #3C3633;
  --color-popover: #FCF8F0;
  --color-popover-foreground: #3C3633;
  --color-overlay: rgba(60,54,51,0.35);
  --color-sidebar: rgba(245,240,232,0.90);
  --color-sidebar-foreground: #3C3633;
  --color-sidebar-hover: rgba(60,54,51,0.05);
  --color-sidebar-active: rgba(184,134,11,0.10);
}
```

#### 步骤 1.5 — 追加 `.theme-cool` 完整色板

```css
/* ===== 冷光主题色板 ===== */
.theme-cool {
  --color-background: #EDF0F5;
  --color-foreground: #2C3E50;
  --color-primary: #4A7FB5;
  --color-primary-foreground: #ffffff;
  --color-primary-light: #E4EDF7;
  --color-primary-hover: #3D6D9E;
  --color-secondary: #E2E7EE;
  --color-secondary-foreground: #2C3E50;
  --color-muted: #DCE2EB;
  --color-muted-foreground: #7A8A9A;
  --color-accent: #E4F0ED;
  --color-accent-foreground: #3D7A6A;
  --color-destructive: #C95A5A;
  --color-destructive-foreground: #ffffff;
  --color-destructive-hover: #B04A4A;
  --color-warning: #B88A3A;
  --color-warning-light: #EEE4D0;
  --color-border: rgba(44,62,80,0.07);
  --color-input: rgba(44,62,80,0.09);
  --color-ring: rgba(74,127,181,0.30);
  --color-card: #F5F7FA;
  --color-card-foreground: #2C3E50;
  --color-popover: #F5F7FA;
  --color-popover-foreground: #2C3E50;
  --color-overlay: rgba(44,62,80,0.35);
  --color-sidebar: rgba(237,240,245,0.90);
  --color-sidebar-foreground: #2C3E50;
  --color-sidebar-hover: rgba(44,62,80,0.04);
  --color-sidebar-active: rgba(74,127,181,0.10);
}
```

---

## Phase 2：修复 Button 组件（P0）

### 改动：`src/components/ui/button.tsx`

| 原代码（第11行） | 改后 |
|------------------|------|
| `default: "bg-primary text-primary-foreground hover:bg-[#0077ED] shadow-sm"` | `default: "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm"` |

| 原代码（第12行） | 改后 |
|------------------|------|
| `destructive: "bg-destructive text-white hover:bg-[#E02D24] shadow-sm"` | `destructive: "bg-destructive text-destructive-foreground hover:bg-destructive-hover shadow-sm"` |

> 注意：destructive 的 `text-white` 改为 `text-destructive-foreground`，确保暗色主题下可读。

---

## Phase 3：编辑器页面色值语义化（P1）

### 改动：`src/app/editor/[id]/page.tsx`

#### 3.1 "完成本章"按钮（第160行）

```
原：  bg-emerald-500 hover:bg-emerald-600 text-white
改为：bg-primary text-primary-foreground hover:bg-primary-hover
```

#### 3.2 违规浮动按钮（第251行）

```
原：  bg-amber-500 text-white
改为：bg-warning text-white
```

#### 3.3 违规项高亮（第298行）

```
原：  text-amber-600 bg-amber-50 hover:bg-amber-100
改为：text-warning bg-warning-light hover:bg-warning-light/80
```

#### 3.4 合规徽章（第364行）

```
原：  bg-amber-500 text-white text-[9px]
改为：bg-warning text-white text-[9px]
```

#### 3.5 回收站弹窗背景（第381行）

```
原：  bg-white rounded-xl shadow-elevated
改为：bg-card rounded-xl shadow-modal
```

> ⚠️ 注意：弹窗的 shadow 从 `elevated` 升级为 `modal`。

#### 3.6 回收站删除按钮（第399行）

```
原：  border border-red-400 text-red-500 hover:bg-red-50
改为：border border-destructive text-destructive hover:bg-destructive/10
```

#### 3.7 自检报告弹窗背景（第416行）

```
原：  bg-white rounded-xl shadow-elevated
改为：bg-card rounded-xl shadow-modal
```

#### 3.8 自检报告分数色值（第419行）

```
原：  text-green-500 / text-amber-500 / text-red-500
改为：text-accent-foreground / text-warning / text-destructive
```

#### 3.9 脑洞弹窗背景（第441行）

```
原：  bg-white rounded-xl shadow-elevated
改为：bg-card rounded-xl shadow-modal
```

#### 3.10 脑洞弹窗遮罩（第440行）

```
原：  bg-black/20 backdrop-blur-sm
改为：bg-overlay backdrop-blur-sm
```

（同时涉及第380、415、440行，所有弹窗遮罩统一替换）

---

## Phase 4：TipTap 排版区域色值迁移（P2）

### 改动：`src/app/globals.css` — ProseMirror 区域

```
第105行: border-left: 3px solid #d1d5db
改为:    border-left: 3px solid var(--color-border)

第107行: color: #6b7280
改为:    color: var(--color-muted-foreground)

第111行: background: #fef08a
改为:    background: var(--color-warning-light)   /* 用警告色而非 accent，突出标记感 */

第125行: color: #e2e8f0
改为:    color: var(--color-foreground)

第131行: color: #94a3b8
改为:    color: var(--color-muted-foreground)
```

#### 同时将暗色 ProseMirror 的区域色值改为变量引用

```
第128行: background: rgba(250, 204, 21, 0.3)
改为:    background: var(--color-warning-light)    /* 使用相同的语义变量 */

第131行: border-left-color: rgba(255,255,255,0.1)
改为:    border-left-color: var(--color-border)
```

---

## Phase 5：侧栏交互增强 + 细节优化（P3）

### 5.1 侧栏选中项加左侧色条

在编辑器 page.tsx 的侧栏选中状态逻辑处（第222行附近），对 `activeChapterId === ch.id` 的项追加 `border-l-3 border-l-primary pl-[13px]`（抵消 border 占位宽度，保持文字对齐）：

```tsx
className={cn(
  "flex items-center justify-between px-4 py-1.5 text-xs cursor-pointer transition-all group border-l-3 border-l-transparent",
  activeChapterId === ch.id 
    ? "bg-sidebar-active text-primary font-medium border-l-primary pl-[13px]" 
    : "text-muted-foreground hover:bg-sidebar-hover hover:text-foreground"
)}
```

### 5.2 侧栏搜索框 focus 态

第194行将 `focus:border-primary` 保留，追加 `focus:ring-1 focus:ring-ring`：

```tsx
className="w-full h-7 px-3 text-xs rounded-lg border border-border bg-background outline-none 
           focus:border-primary focus:ring-1 focus:ring-ring transition-all"
```

### 5.3 回收站弹窗选中项色值

第390行 `${selectedTrashId === ch.id ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary"}`
改为 `${selectedTrashId === ch.id ? "bg-sidebar-active text-primary" : "text-muted-foreground hover:bg-sidebar-hover"}`

---

## 全局搜索替换清单

以下为全项目中通用的 Tailwind 类名替换规则，可直接全文搜索替换：

| 搜索 | 替换为 | 说明 |
|------|--------|------|
| `bg-amber-500` | `bg-warning` | 警告背景 |
| `text-amber-500` 或 `text-amber-600` | `text-warning` | 警告文字 |
| `bg-amber-50` | `bg-warning-light` | 警告浅底 |
| `hover:bg-amber-100` | `hover:bg-warning-light/80` | 警告浅底 hover |
| `border-red-400` | `border-destructive` | 危险边框 |
| `text-red-500` | `text-destructive` | 危险文字 |
| `hover:bg-red-50` | `hover:bg-destructive/10` | 危险浅底 hover |
| `bg-black/20` | `bg-overlay` | 弹窗遮罩 |
| `bg-white` (在弹窗上下文中) | `bg-card` | 弹窗背景 |
