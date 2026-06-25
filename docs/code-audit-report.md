# 代码审计报告

> 审计时间：2025-07-XX
> 审计范围：`src/` 下所有 `.ts` / `.tsx` 文件

---

## 1. 幽灵依赖检查（从 node_modules 导入但 package.json 未声明）

**结果：✅ 无幽灵依赖**

项目使用的所有 npm 包均在 `package.json` 中声明：

| 导入来源 | 文件 | 是否已声明 |
|---------|------|-----------|
| `next` / `next/navigation` / `next/server` | layout.tsx, page.tsx, editor/page.tsx, 4个 API route.ts | ✅ `"next": "^16.2.9"` |
| `react` | layout.tsx, page.tsx, editor/page.tsx, button.tsx, card.tsx | ✅ `"react": "^19.2.4"` |
| `lucide-react` | page.tsx, editor/page.tsx, writing-editor.tsx | ✅ `"lucide-react": "^1.21.0"` |
| `@tiptap/react` | writing-editor.tsx | ✅ `"@tiptap/react": "^3.27.1"` |
| `@tiptap/starter-kit` | writing-editor.tsx | ✅ |
| `@tiptap/extension-placeholder` | writing-editor.tsx | ✅ |
| `@tiptap/extension-highlight` | writing-editor.tsx | ✅ |
| `@tiptap/extension-underline` | writing-editor.tsx | ✅ |
| `@tiptap/extension-text-align` | writing-editor.tsx | ✅ |
| `@tiptap/extension-character-count` | writing-editor.tsx | ✅ |
| `@radix-ui/react-slot` | button.tsx | ✅ |
| `class-variance-authority` | button.tsx | ✅ |
| `clsx` | utils.ts | ✅ |
| `tailwind-merge` | utils.ts | ✅ |

### 附：已声明但从未使用的包（反向问题）
| 包名 | 说明 |
|------|------|
| `@tiptap/extension-font-size` | 在 `package.json` 中但未在任何源码中被 import |
| `@tiptap/extension-bubble-menu` | 在 `package.json` 中但未在任何源码中被 import |

---

## 2. 跨层引用检查（UI 组件引用业务组件等不合理引用）

**结果：✅ 无不合理跨层引用**

当前目录层级关系：

```
src/
├── app/            # 页面 & API 路由
├── components/
│   ├── ui/         # UI 基础组件（button, card）
│   └── writing-editor.tsx  # 业务组件
└── lib/            # 工具库
```

各层引用关系验证：

| 源文件 | 目标 | 方向 | 是否合理 |
|--------|------|------|---------|
| `app/page.tsx` | `@/components/ui/button` | page → ui | ✅ |
| `app/page.tsx` | `@/components/ui/card` | page → ui | ✅ |
| `app/page.tsx` | `@/lib/store` | page → lib | ✅ |
| `app/editor/[id]/page.tsx` | `@/components/ui/button` | page → ui | ✅ |
| `app/editor/[id]/page.tsx` | `@/components/writing-editor` | page → 业务组件 | ✅ |
| `app/editor/[id]/page.tsx` | `@/lib/store` / `@/lib/compliance` | page → lib | ✅ |
| `components/writing-editor.tsx` | `@/lib/utils` | 业务组件 → lib | ✅ |
| `components/ui/button.tsx` | `@/lib/utils` | ui → lib | ✅ |
| `components/ui/card.tsx` | `@/lib/utils` | ui → lib | ✅ |

**未发现** `components/ui/` 引用业务组件或其他层级的逆向引用。

---

## 3. 导出但未使用的函数/组件

**结果：❌ 发现 7 处**

### 3.1 `src/lib/compliance.ts`

| 导出符号 | 类型 | 说明 |
|---------|------|------|
| `ComplianceResult` | interface | 导出但未在其他文件 import |
| `BlockedItem` | interface | 导出但未在其他文件 import |
| `check55CharLine` | function | 导出但未在任何地方调用（仅内部 `compliance.ts` 未用到） |

> 注：`splitParagraphs`、`splitSentences`、`BODY_ACTION_WORDS` 虽标记为 `export`，但仅在 `compliance.ts` 内部使用。若不需要外部调用，建议改为 `function`（不 export）以减少 API 暴露面。

### 3.2 `src/components/ui/button.tsx`

| 导出符号 | 类型 | 说明 |
|---------|------|------|
| `ButtonProps` | interface | 导出但未在其他文件 import（定义时已用 `export` 但无外部消费者） |
| `buttonVariants` | const | 导出但未在其他文件 import |

### 3.3 `src/components/ui/card.tsx`

| 导出符号 | 类型 | 说明 |
|---------|------|------|
| `CardHeader` | component | 导出但从未被使用 |
| `CardTitle` | component | 导出但从未被使用 |

---

## 4. 相对路径 vs `@/` 别名检查（规范要求使用 `@/`）

**结果：❌ 发现 2 处相对路径导入**

### 4.1 `src/lib/store.ts` — 第 1 行

```typescript
import type { Project, Chapter } from './types'
                                  ^^^^^^^^
```

**应改为：**
```typescript
import type { Project, Chapter } from '@/lib/types'
```

### 4.2 `src/app/layout.tsx` — 第 2 行

```typescript
import "./globals.css"
       ^^^^^^^^^^^^^^
```

> **说明**：CSS 文件在 Next.js App Router 中通常使用相对路径导入（`"./globals.css"`），这是框架惯例。但按规范要求，若坚持所有 import 使用 `@/` 别名，可改为 `import "@/app/globals.css"`。建议与团队确认 CSS 导入是否可豁免。

---

## 总结

| 检查项 | 结果 | 违规数 |
|--------|------|-------|
| ① 幽灵依赖 | ✅ 通过 | 0 |
| ② 跨层引用 | ✅ 通过 | 0 |
| ③ 导出未使用 | ❌ 需清理 | **7 处** |
| ④ 别名规范 | ❌ 需修复 | **2 处** |

### 建议操作优先级

1. **高** — `store.ts` 第 1 行相对路径 → 改用 `@/` 别名
2. **中** — 清理 `compliance.ts`、`button.tsx`、`card.tsx` 中未使用的导出
3. **低** — 确认 CSS import 的别名策略
4. **低** — 考虑移除 `@tiptap/extension-font-size` 和 `@tiptap/extension-bubble-menu`（声明但未使用）
