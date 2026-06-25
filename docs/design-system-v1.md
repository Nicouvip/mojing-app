# 墨境 设计系统规范 v1.0

> 设计系统文档 · 面向前端落地 · 2025-07-01

---

## 目录

1. [设计哲学](#1-设计哲学)
2. [色彩体系](#2-色彩体系)
3. [字体与排版](#3-字体与排版)
4. [间距与布局](#4-间距与布局)
5. [圆角与阴影](#5-圆角与阴影)
6. [组件样式规范](#6-组件样式规范)
7. [四套主题完整色板](#7-四套主题完整色板)
8. [交互与动效](#8-交互与动效)
9. [硬编码色值迁移清单](#9-硬编码色值迁移清单)

---

## 1. 设计哲学

墨境定位为「专业小说写作工具」，设计语言遵循以下原则：

| 原则 | 说明 |
|------|------|
| **沉浸式写作** | 编辑器区域是核心，所有 UI 服务于「减少干扰、保持进入心流」 |
| **克制美学** | 低饱和度、充足留白、克制用色，不喧宾夺主 |
| **温润质感** | 圆角柔和、阴影轻盈、过渡细腻，传达精良的工具感 |
| **内容优先** | 文字永远清晰可读，背景/装饰元素不干扰文字 |

---

## 2. 色彩体系

### 2.1 语义色板（所有主题通用）

每个语义 token 在各主题下有独立色值，但语义含义一致。

| Token | Tailwind 类名 | 用途 |
|-------|--------------|------|
| `--color-background` | `bg-background` | 页面主背景 |
| `--color-foreground` | `text-foreground` | 正文文字 |
| `--color-primary` | `bg-primary / text-primary` | 主色（按钮、链接、选中态） |
| `--color-primary-foreground` | `text-primary-foreground` | 主色上的文字 |
| `--color-primary-light` | `bg-primary-light` | 主色浅底（标签、提示条） |
| `--color-primary-hover` | `hover:bg-primary-hover` | 主色 hover 态 |
| `--color-secondary` | `bg-secondary` | 二级背景（侧栏、工具栏、卡片头） |
| `--color-secondary-foreground` | `text-secondary-foreground` | 二级文字 |
| `--color-muted` | `bg-muted` | 柔和背景（输入框、禁用态） |
| `--color-muted-foreground` | `text-muted-foreground` | 辅助文字、占位符 |
| `--color-accent` | `bg-accent / text-accent` | 强调色（成功、正向反馈） |
| `--color-accent-foreground` | `text-accent-foreground` | 强调色文字 |
| `--color-destructive` | `bg-destructive / text-destructive` | 危险色（删除、错误） |
| `--color-destructive-foreground` | `text-destructive-foreground` | 危险色上的文字 |
| `--color-destructive-hover` | `hover:bg-destructive-hover` | 危险色 hover 态 |
| `--color-warning` | `bg-warning / text-warning` | **新增** 警告色（合规预警） |
| `--color-warning-light` | `bg-warning-light` | **新增** 警告浅底 |
| `--color-border` | `border-border` | 边框、分割线 |
| `--color-input` | `border-input` | 输入框边框 |
| `--color-ring` | `ring-ring` | focus 环 |
| `--color-card` | `bg-card` | 卡片/弹窗背景 |
| `--color-card-foreground` | `text-card-foreground` | 卡片文字 |
| `--color-sidebar` | `bg-sidebar` | 侧栏背景 |
| `--color-sidebar-foreground` | `text-sidebar-foreground` | 侧栏文字 |
| `--color-sidebar-hover` | `hover:bg-sidebar-hover` | **新增** 侧栏项 hover |
| `--color-sidebar-active` | `bg-sidebar-active` | **新增** 侧栏项选中 |

### 2.2 色彩使用规则

```
背景层级（从远到近）：
  background → sidebar/card → popover/modal

文字层级（从重到轻，数字越小越重要）：
  foreground   → 正文、标题（100%）
  primary      → 链接、可交互文字
  secondary-foreground → 侧栏标题
  muted-foreground → 辅助说明、时间戳（65%）
  border        → 分割线、边框（仅 6-15% 不透明度）
```

### 2.3 新增 token 说明

| 新增 Token | 为什么需要 |
|-----------|-----------|
| `--color-primary-hover` | 替代 button.tsx 中的 `hover:bg-[#0077ED]` |
| `--color-destructive-hover` | 替代 `hover:bg-[#E02D24]` |
| `--color-warning` | 编辑器页面多处使用 `amber-500`，需要语义化统一 |
| `--color-warning-light` | 替代 `amber-50` 浅底高亮背景 |
| `--color-sidebar-hover` | 侧栏交互反馈 |
| `--color-sidebar-active` | 侧栏当前选中项 |
| `--color-overlay` | 弹窗遮罩（替代 `bg-black/20`） |

---

## 3. 字体与排版

### 3.1 字体系列

| Token | 字体栈 | 用途 |
|-------|--------|------|
| `--font-sans` | `'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', ui-sans-serif, sans-serif` | UI 界面文字（按钮、标签、侧栏） |
| `--font-serif` | `'Noto Serif SC', 'Songti SC', 'SimSun', 'Charis SIL', ui-serif, serif` | 编辑器正文（小说阅读体验） |
| `--font-mono` | `ui-monospace, 'SF Mono', 'Cascadia Code', 'Consolas', monospace` | 代码/字数统计数字 |

### 3.2 字号层级

| 层级 | 字号/行高 | Tailwind | 用途 |
|------|-----------|----------|------|
| **display** | 32px / 44px | `text-[32px] leading-[44px]` | 极少数大标题 |
| **h1** | 24px / 32px | `text-2xl` | 页面标题 |
| **h2** | 20px / 28px | `text-xl` | 区块标题 |
| **h3** | 18px / 26px | `text-lg` | 卡片标题 |
| **body** | 15px / 22px | `text-[15px]` | 正文 UI 文字 |
| **body-sm** | 14px / 20px | `text-sm` | 辅助说明、侧栏项 |
| **caption** | 13px / 18px | `text-[13px]` | 时间戳、标签 |
| **mini** | 12px / 16px | `text-xs` | 角标、小标签 |

> 编辑器正文使用 18px / 36px (line-height: 2)，独立于 UI 层级。

### 3.3 字重规范

```
界面标题 → font-semibold (600)
按钮文字 → font-medium (500)
正文 / 侧栏 → font-normal (400)
辅助文字 → font-normal (400)
```

---

## 4. 间距与布局

### 4.1 间距系统

| 层级 | 值 | Tailwind | 用途 |
|------|-----|----------|------|
| 0 | 0 | `gap-0` | — |
| 1 | 4px | `gap-1` | 图标与文字间 |
| 2 | 8px | `gap-2` | 紧凑元素间 |
| 3 | 12px | `gap-3` | 按钮组内部 |
| 4 | 16px | `gap-4` | 卡片内间距 |
| 5 | 20px | `gap-5` | 卡片间间距 |
| 6 | 24px | `gap-6` | 区块间间距 |
| 7 | 32px | `gap-8` | 大区块间距 |
| 8 | 48px | `gap-12` | 页面顶部/底部 |
| 9 | 64px | `gap-16` | 极少用的超大间距 |

### 4.2 布局规范

```
三栏布局：
  ┌──────────┐ ┌──────────────────┐ ┌──────────┐
  │  侧栏     │ │     编辑器       │ │  工具面板 │
  │  240px   │ │    flex-1        │ │  300px   │
  │  项目列表 │ │    TipTap        │ │  AI 辅助  │
  │  章节导航 │ │    ProseMirror   │ │  设定管理 │
  └──────────┘ └──────────────────┘ └──────────┘

  侧栏可折叠 → icon-only 模式 64px
  工具面板可隐藏/显示

内边距规范：
  页面安全边距：p-6 (24px)
  卡片内边距：p-4 (16px) 或 p-5 (20px)
  列表项内边距：px-4 py-3
```

---

## 5. 圆角与阴影

### 5.1 圆角层级

| 层级 | 值 | Tailwind | 用途 |
|------|-----|----------|------|
| none | 0 | `rounded-none` | 无 |
| sm | 6px | `rounded-sm` | 输入框、标签 |
| md | 8px | `rounded-md` | 按钮、卡片 |
| lg | 12px | `rounded-lg` | 弹窗、大卡片 |
| xl | 16px | `rounded-xl` | 极少数特殊容器 |
| full | 9999px | `rounded-full` | 圆角按钮、头像 |

### 5.2 阴影层级

| 层级 | 值（浅色主题） | 用途 |
|------|--------------|------|
| soft | `0 1px 3px rgba(0,0,0,0.04)` | 轻微抬升（静态卡片） |
| card | `0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)` | 卡片默认态 |
| elevated | `0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)` | 下拉菜单、弹窗 |
| modal | `0 8px 32px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)` | **新增** 模态弹窗 |

> 暗色主题阴影透明度降低 50%（暗底上阴影更不显眼，应微调或减少阴影）

---

## 6. 组件样式规范

> 此处定义设计规范，不涉及实现代码。

### 6.1 Button 按钮

| 变体 | 类名组合 | 说明 |
|------|---------|------|
| **primary** (默认) | `bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm` | 主要操作 |
| **secondary** | `bg-secondary text-secondary-foreground hover:bg-muted` | 次要操作 |
| **outline** | `border border-border bg-transparent hover:bg-secondary` | 第三层级 |
| **ghost** | `bg-transparent hover:bg-secondary` | 最轻量级（工具栏） |
| **destructive** | `bg-destructive text-white hover:bg-destructive-hover` | 删除/危险操作 |
| **link** | `text-primary underline-offset-4 hover:underline` | 链接样式 |
| **warning** | `bg-warning text-white hover:bg-warning/90` | **新** 合规警告 |

尺寸：`h-9 px-4 rounded-md text-sm` (默认) / `h-8 px-3 rounded-md text-sm` (sm) / `h-10 px-6 rounded-md` (lg)

### 6.2 Sidebar 侧栏

```
容器：bg-sidebar text-sidebar-foreground w-[240px] border-r border-border
项（默认）：px-4 py-2.5 text-sm rounded-md hover:bg-sidebar-hover cursor-pointer
项（选中）：bg-sidebar-active text-primary font-medium
项（拖拽中）：opacity-50
分组标题：px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider
折叠态：w-[64px] → 只显示图标，hover 展开 tooltip
```

### 6.3 Card 卡片

```
容器：bg-card rounded-lg shadow-card border border-border
头部：p-4 pb-0
内容：p-4 pt-0  (头部存在时用 p-4 统一)
分割线：border-t border-border my-0 mx-4
```

### 6.4 Dialog 模态弹窗

```
遮罩层：fixed inset-0 bg-overlay backdrop-blur-sm z-50
弹窗：bg-card rounded-xl shadow-modal max-w-md w-full mx-4 p-6
标题：text-lg font-semibold text-foreground
关闭按钮：absolute top-4 right-4
```

### 6.5 Tooltip 工具提示

```
容器：bg-foreground text-background text-xs px-2 py-1 rounded-md shadow-elevated
触发：相对定位
箭头：4px 三角 (用 border 实现)
```

### 6.6 Badge 徽章/标签

```
默认：bg-secondary text-secondary-foreground text-xs px-2 py-0.5 rounded-sm
primary：bg-primary-light text-primary text-xs px-2 py-0.5 rounded-sm
warning：bg-warning-light text-warning text-xs px-2 py-0.5 rounded-sm
accent：bg-accent text-accent-foreground text-xs px-2 py-0.5 rounded-sm
```

---

## 7. 四套主题完整色板

### 7.1 浅色主题 (默认 / light) — 清爽白

当前 globals.css `@theme` 中的值已经基本正确，只需补充新 token：

```css
:root {
  --color-background: #f7f8fa;
  --color-foreground: #1f2329;
  --color-primary: #0071E3;
  --color-primary-foreground: #ffffff;
  --color-primary-light: #e8f2ff;
  --color-primary-hover: #0066CC;       /* 新增 */
  --color-secondary: #f0f2f5;
  --color-secondary-foreground: #1f2329;
  --color-muted: #f0f2f5;
  --color-muted-foreground: #8E929B;
  --color-accent: #e8f8f2;
  --color-accent-foreground: #1EA67A;
  --color-destructive: #FF3B30;
  --color-destructive-foreground: #ffffff;
  --color-destructive-hover: #D62D24;   /* 新增 */
  --color-warning: #E8981D;             /* 新增，替代 amber-500 */
  --color-warning-light: #FFF3E0;       /* 新增，替代 amber-50 */
  --color-border: rgba(0,0,0,0.06);
  --color-input: rgba(0,0,0,0.08);
  --color-ring: rgba(0,113,227,0.25);
  --color-card: #ffffff;
  --color-card-foreground: #1f2329;
  --color-popover: #ffffff;
  --color-popover-foreground: #1f2329;
  --color-overlay: rgba(0,0,0,0.35);   /* 新增 */
  --color-sidebar: rgba(246,246,246,0.85);
  --color-sidebar-foreground: #1D1D1F;
  --color-sidebar-hover: rgba(0,0,0,0.04);  /* 新增 */
  --color-sidebar-active: rgba(0,113,227,0.08);  /* 新增 */
}
```

### 7.2 暖光主题 (warm) — 柔和米黄

```css
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

### 7.3 暗夜主题 (dark) — 深邃舒适

> 当前 `.dark` 中只覆盖了 ProseMirror 区域，需要完整的系统变量覆盖。

```css
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

### 7.4 冷光主题 (cool) — 清冷灰蓝

```css
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

## 8. 交互与动效

### 8.1 过渡曲线

```
默认缓动：cubic-bezier(0.25, 0.1, 0.25, 1)  — Apple-style ease
退出缓动：cubic-bezier(0.25, 0.1, 0.25, 1)
进入缓动：cubic-bezier(0, 0, 0.2, 1)
弹窗进入：cubic-bezier(0.34, 1.56, 0.64, 1)  — 弹性效果（可选用）
```

### 8.2 过渡时长

```
色值变化：150ms    — hover/focus 颜色过渡
面板滑入：200ms    — 侧栏折叠/展开
弹窗出现：250ms    — 模态弹窗
页面切换：300ms    — 路由过渡（暂不实现）
拖拽反馈：100ms    — 拖拽项视觉反馈
```

### 8.3 交互行为规范

| 交互 | 行为 |
|------|------|
| **Button hover** | 背景色向 darker 过渡 150ms，无缩放 |
| **Button active/click** | 无下沉效果（保持克制） |
| **Sidebar item** | hover 背景变化 150ms，选中态加左侧 3px primary 色条 |
| **Card hover** | 阴影从 card 渐变为 elevated，150ms |
| **Modal 遮罩** | 点击遮罩关闭（可配置），内容区域不出遮罩外溢出 |
| **Toast 通知** | 从顶部滑入，250ms，停留 3s 后滑出 |
| **拖拽排序** | 被拖拽项 raised shadow + 透明度 0.8，放置位显示占位虚线框 |
| **滚动条** | 始终隐藏，hover 到容器上时渐显（自定义 thin scrollbar） |

### 8.4 编辑器专属体验优化

```
1. 字数统计：点击可切换「字数/字符数/章节数」
2. 自动保存：输入停顿 2s 后自动保存，图标显示「已保存」/「保存中」
3. 滚动指示：顶部显示当前在章节中的百分比进度
4. 行聚焦：编辑器失焦时降低非活跃行透明度（可选功能）
5. 打字机模式：当前行居中，保持视觉焦点（可选功能）
```

---

## 9. 硬编码色值迁移清单

> 以下为前端实现时的改动指南

### 9.1 button.tsx — 2 处

```
#0077ED → var(--color-primary-hover)  →  Tailwind: bg-primary-hover
#E02D24 → var(--color-destructive-hover) → Tailwind: bg-destructive-hover
```

### 9.2 globals.css TipTap 区域 — 5 处

```
#d1d5db (blockquote border) → var(--color-border)    →  border-border
#6b7280 (blockquote color)  → var(--color-muted-foreground) → text-muted-foreground
#fef08a (mark background)   → var(--color-accent)    →  bg-accent (需评估)
#e2e8f0 (dark .ProseMirror) → var(--color-foreground) → text-foreground
#94a3b8 (dark blockquote)   → var(--color-muted-foreground) → text-muted-foreground
```

### 9.3 编辑器页面 (editor/[id]/page.tsx) — 8 处

```
emerald-500 → bg-warning → 语义化：这是「完成」按钮，不应用警告色
              → 建议改为 bg-primary (主要操作)
amber-500 (浮动按钮) → bg-warning → 语义正确
amber-50 bg / amber-600 text → bg-warning-light / text-warning
bg-white (弹窗背景) → bg-card → 如果弹窗在 card 语境下
border-red-400 / text-red-500 / hover:bg-red-50 → border-destructive / text-destructive / hover:bg-destructive-hover (或 hover:bg-destructive/10)
```

### 9.4 需迁移顺序（按优先级）

| 优先级 | 位置 | 原因 |
|--------|------|------|
| P0 | globals.css 补充 warm/cool 完整色板 | 主题切换不生效 |
| P0 | button.tsx hover 色 | 交互反馈异常 |
| P1 | 编辑器页面 amber 色值 → warning 语义色 | 多主题适配 |
| P2 | TipTap 区域硬编码色 | 暗色主题显示异常 |
| P3 | 弹窗 BG 白色 → card 变量 | 深色主题兼容 |

---

## 附录 A：完整 Tailwind v4 配置代码

> 将当前 `globals.css` 中的 `@theme` 块替换为以下完整配置（包含所有新增 token）：

```css
@theme inline {
  --color-background: #f7f8fa;
  --color-foreground: #1f2329;
  --color-primary: #0071E3;
  --color-primary-foreground: #ffffff;
  --color-primary-light: #e8f2ff;
  --color-primary-hover: #0066CC;
  --color-secondary: #f0f2f5;
  --color-secondary-foreground: #1f2329;
  --color-muted: #f0f2f5;
  --color-muted-foreground: #8E929B;
  --color-accent: #e8f8f2;
  --color-accent-foreground: #1EA67A;
  --color-destructive: #FF3B30;
  --color-destructive-foreground: #ffffff;
  --color-destructive-hover: #D62D24;
  --color-warning: #E8981D;
  --color-warning-light: #FFF3E0;
  --color-border: rgba(0,0,0,0.06);
  --color-input: rgba(0,0,0,0.08);
  --color-ring: rgba(0,113,227,0.25);
  --color-card: #ffffff;
  --color-card-foreground: #1f2329;
  --color-popover: #ffffff;
  --color-popover-foreground: #1f2329;
  --color-overlay: rgba(0,0,0,0.35);
  --color-sidebar: rgba(246,246,246,0.85);
  --color-sidebar-foreground: #1D1D1F;
  --color-sidebar-hover: rgba(0,0,0,0.04);
  --color-sidebar-active: rgba(0,113,227,0.08);

  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;

  --font-sans: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', ui-sans-serif, system-ui, sans-serif;
  --font-mono: ui-monospace, 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
  --font-serif: 'Noto Serif SC', 'Songti SC', 'SimSun', 'Charis SIL', ui-serif, serif;
}
```

> 并将 `.dark`、`.theme-warm`、`.theme-cool` 的完整覆盖追加在 `@layer base` 前后。

---

## 附录 B：设计规范 Checklist

- [x] 语义色板定义（21 个 token）
- [x] 四套主题完整色板（light/warm/dark/cool）
- [x] 字体栈与字号层级
- [x] 间距系统（9 级）
- [x] 圆角层级（6 级）
- [x] 阴影层级（4 级）
- [x] 组件样式规范（6 个组件）
- [x] 交互动效规范（时长、曲线、行为）
- [x] 硬编码迁移清单（P0-P3）
- [x] Tailwind 类名映射
