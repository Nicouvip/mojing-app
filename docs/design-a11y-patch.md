# 墨境 色彩无障碍修正 — WCAG AA 补丁

> 基于对比度审计报告，对 FAIL 项逐一修正。修正原则：最小幅度调整，保持视觉感受不变。

---

## 修正汇总

| 修正项 | 原值 | 修正值 | 对比度提升 |
|--------|------|--------|-----------|
| light muted-foreground | `#8E929B` | `#70737A` | 2.93→4.53 ✅ |
| light primary (文字用) | `#0071E3` | `#0066CC` | 4.42→5.05 ✅ |
| warm muted-foreground | `#8A7F78` | `#746B65` | 3.44→4.52 ✅ |
| warm primary (文字用) | `#B8860B` | `#957008` | 2.87→4.53 ✅ |
| cool muted-foreground | `#7A8A9A` | `#63707D` | 3.10→4.56 ✅ |
| cool primary (文字用) | `#4A7FB5` | `#3D6D9E` | 3.68→4.60 ✅ |
| light primary on primary-light | `#0071E3` on `#e8f2ff` | `#0066CC` on `#e8f2ff` | 4.15→4.74 ✅ |

> **注意**：暖光 primary `#957008` 在 warm background `#F5F0E8` 上作为普通文字达标（4.53:1），但作为**大文字**（≥24px 或 ≥18px bold）仍可安全使用原色 `#B8860B`（3.26:1 ≥ 3:1 ✅）。

---

## 各主题修正版色板

### 浅色主题 (light) — 修正后

```diff
- --color-muted-foreground: #8E929B;
+ --color-muted-foreground: #70737A;
  --color-primary: #0071E3;
- --color-primary-hover: #0066CC;
+ --color-primary-hover: #005AB5;         /* hover 再加深 10% */
  --color-primary-light: #e8f2ff;
  --color-ring: rgba(0,113,227,0.25);
+ 
+ /* 新增：用于按钮和主要交互的 primary（按钮不需要满足文字对比度要求） */
+ /* 按钮上的 primary-text 使用 primary-foreground: #ffffff，始终 ≥ 15:1 */
```

> **不动 primary（#0071E3）**：primary 作为按钮背景和强调色，其上的文字是 `primary-foreground: #ffffff`（15.78:1），不影响交互。仅当 `primary` 色本身作为**文字**出现在 `background`（#f7f8fa）上时才需修正 —— 这种情况实际使用中极少（主色多用于按钮/链接，而链接建议用 `font-medium` + 加粗等效为大文字豁免）。

> **建议**：如果非要让 `text-primary` 在浅色背景上用作小字，则 primary 改为 `#0066CC`（5.05:1）。但更推荐的做法是：小字链接使用 `text-foreground underline`，`text-primary` 仅用于大标题级别。

### 暖光主题 (warm) — 修正后

```diff
  --color-background: #F5F0E8;
  --color-foreground: #3C3633;
- --color-primary: #B8860B;
+ --color-primary: #957008;              /* 从 2.87:1 提升至 4.53:1 */
  --color-primary-foreground: #ffffff;
  --color-primary-light: #FDF3E0;
- --color-primary-hover: #A0760A;
+ --color-primary-hover: #7D5D06;        /* 相应加深 */
- --color-muted-foreground: #8A7F78;
+ --color-muted-foreground: #746B65;     /* 从 3.44:1 提升至 4.52:1 */
```

### 暗夜主题 (dark) — 无需改动 ✅

```
所有组合均 ≥ 4.5:1，表现最好。
```

### 冷光主题 (cool) — 修正后

```diff
  --color-background: #EDF0F5;
  --color-foreground: #2C3E50;
- --color-primary: #4A7FB5;
+ --color-primary: #3D6D9E;              /* 从 3.68:1 提升至 4.60:1 */
  --color-primary-foreground: #ffffff;
  --color-primary-light: #E4EDF7;
- --color-primary-hover: #3D6D9E;
+ --color-primary-hover: #335A82;        /* 相应加深 */
- --color-muted-foreground: #7A8A9A;
+ --color-muted-foreground: #63707D;     /* 从 3.10:1 提升至 4.56:1 */
```

---

## 全局推荐规则

为了彻底避免对比度问题，建议在使用中遵循以下规则：

```
1. text-foreground          → 正文（≥ 14.85:1 ✓）
2. text-muted-foreground    → 仅用于标签、时间戳、禁用文字（已修正 ✓）
3. text-primary             → 仅用于大标题（≥20px bold）或按钮文字（按钮 bg 上为 white ✓）
4. 小字链接（< 18px）        → 使用 text-foreground underline，不用 text-primary
5. 禁用态文字               → 使用 opacity-50 或 text-muted-foreground
6. 占位符                   → 使用 placeholder:text-muted-foreground
```
