# 墨境 V1 测试报告

> 版本：0.1.0 · 测试日期：2025-06-22 · 测试方式：静态代码分析 + 纯函数验证  
> 测试工程师：QA Agent

---

## 一、测试概述

| 项目 | 数据 |
|------|------|
| 测试用例总数 | 25 |
| 功能模块覆盖 | 9/9 (100%) |
| 代码级测试通过率 | 62/65 (95%) |
| 发现的 Bug | **17 个** (P0: 5, P1: 6, P2: 4, P3: 2) |
| 已知问题验证 | 3/3 完成 |

### 测试范围与结果

| 模块 | 覆盖度 | 结果 | 关键问题数 |
|------|--------|------|-----------|
| 项目管理 | ✅ 全部 | 通过 | 0 |
| 编辑器 (TipTap) | ✅ 全部 | 部分警告 | 4 |
| 章节管理 (CRUD+回收站) | ✅ 全部 | 部分警告 | 3 |
| AI 续写/润色/扩写 | ✅ 全部 | **严重问题** | 6 |
| 脑洞喷射 | ✅ 主要路径 | 部分警告 | 2 |
| 合规检测 (6项规则) | ✅ 全部 | **严重问题** | 5 |
| 章末自检报告 | ✅ 全部 | 通过 | 0 |
| TXT 导出 | ✅ 全部 | **有 Bug** | 1 |
| 三栏布局/UI | ✅ 全部 | 通过 | 0 |

---

## 二、Bug 清单（按严重程度排序）

### 🔴 P0 — 必须立即修复

| ID | 模块 | 描述 | 影响 | 行号 |
|----|------|------|------|------|
| **BUG-23** | AI API | **API Key 硬编码泄露** — 4个 route 文件均有 fallback key `sk-c837e33eb96c460ea0dba5d179cf3545` | 泄露导致盗刷风险 | continue:3, polish:2, expand:2, brainstorm:2 |
| **BUG-19** | 合规检测 | **合规检测对 HTML 内容完全无效** — 编辑器返回 HTML（如 `<p>内容</p>`），合规函数用 `split('\n')` 分割 HTML，无法正确识别段落 | 合规检测完全不工作 | compliance.ts:55 |
| **BUG-13** | AI 功能 | **AI"插入正文"拼接纯文本到 HTML，破坏编辑器** — `setContent(prev + '\n' + aiResult)` 将纯文本拼到 HTML 字符串 | 编辑器可能崩溃或显示异常 | page.tsx:346 |
| **BUG-25** | AI API | **模型名 `deepseek-v4-flash` 可能不存在** — 非 DeepSeek 官方公开模型名 | 所有 AI 功能可能全部失败 | continue:21 |
| **BUG-17** | 编辑侧栏 | **Enter 键合规检测绑定但从未挂载** — `handleKeyDown` 函数从未绑定到任何 JSX 元素 | 实时合规检测完全不工作 | page.tsx:126 |

### 🟡 P1 — 高优先级

| ID | 模块 | 描述 | 影响 |
|----|------|------|------|
| **BUG-01** | 章节管理 | `deleteChapter` 中 `chapterCount` 基于**旧数组**计算（`-1` 逻辑脆弱） | 章节数统计可能不准 |
| **BUG-04** | 字数统计 | store 用 `content.length`（HTML 字符） VS editor 用 `words()`（英文分词），**两处不一致且都错误** | 字数显示不准（实测 HTML:127 vs 纯文本:33） |
| **BUG-06** | 合规检测 | `check55CharLine` 与编辑器内联 55 字检查**实现矛盾** — 一个视短文本为不合格，另一个自动通过 | 55字线判定结果取决于走哪个路径 |
| **BUG-12** | AI 功能 | AI 使用 `window.getSelection()` 获取选中文本，**在 TipTap 中不可靠** | 润色/扩写可能获取到不完整文本 |
| **BUG-15** | 合规检测 | Enter 合规检测用 `\n` 分割**HTML 字符串**（而不是纯文本段落）且只检测最后一段 | 中间段落修改不被检测 |
| **BUG-02** | 存储层 | `getTrash()` 直接调用 `localStorage`，**缺少 SSR 保护** | SSR 时可能崩溃 |

### 🟢 P2 — 中等优先级

| ID | 模块 | 描述 |
|----|------|------|
| **BUG-03** | 回收站 | `restoreChapter` 恢复后 `order` 未重置（可能排序冲突）、`wordCount` 未重新计算 |
| **BUG-07** | 合规检测 | `forbiddenA` 累计计数半实现（签名有参数但调用方不传） |
| **BUG-08** | 合规检测 | `splitSentences` 遗漏中文分号 `；` 和省略号 `……` |
| **BUG-26** | AI API | `brainstorm` 的 `count` 参数无上限限制（客户端可传 100+） |

### 🔵 P3 — 低优先级

| ID | 模块 | 描述 |
|----|------|------|
| **BUG-27** | AI API | 错误信息 `e.message` 直接返回客户端，可能泄露内部路径 |
| **BUG-18** | 编辑页面 | `/api/ai/` URL 硬编码根路径，子路径部署会失效 |

---

## 三、已知问题验证结果

| 原始问题 | 验证结果 | 状态 |
|----------|----------|------|
| 富文本格式丢失 | **已修复** — HTML 存储/读取完整保留 | ✅ 关闭 |
| TXT 导出未实现 | **已实现但代码有 Bug** — Blob 下载功能有，但输出含 HTML 标签，需要 `stripHtml()` | ⚠️ 重新开启 |
| API Key 硬编码 | **未修复** — 4 个文件中仍有 `sk-c837e33eb96c460ea0dba5d179cf3545` | 🔴 待修复 |
| 角色面板空壳 | 右侧栏角色面板仅占位按钮 | 📋 第二阶段 |
| 灵感面板空壳 | 右侧栏灵感面板仅部分功能 | 📋 第二阶段 |

---

## 四、涉及的文件（完整路径）

| 文件 | 关联 Bug |
|------|----------|
| `src/app/editor/[id]/page.tsx` | BUG-13, BUG-12, BUG-17, BUG-15, BUG-18 |
| `src/components/writing-editor.tsx` | BUG-19, BUG-20, BUG-21, BUG-22 |
| `src/lib/compliance.ts` | BUG-19, BUG-06, BUG-07, BUG-08, BUG-15 |
| `src/lib/store.ts` | BUG-01, BUG-02, BUG-03, BUG-04 |
| `src/app/api/ai/continue/route.ts` | BUG-23, BUG-25, BUG-27 |
| `src/app/api/ai/polish/route.ts` | BUG-23, BUG-27 |
| `src/app/api/ai/expand/route.ts` | BUG-23, BUG-27 |
| `src/app/api/ai/brainstorm/route.ts` | BUG-23, BUG-26, BUG-27 |

---

## 五、修复建议（按优先级）

### 第一优先 — 立即修复
1. **API Key 硬编码**：删除所有 fallback key，仅依赖环境变量
2. **合规检测接收纯文本**：传给 `checkCompliance` 前先用 `stripHtml()` 去 HTML 标签
3. **AI"插入正文"**：改用 `editor.commands.insertContent()` 而非拼接字符串
4. **验证模型名**：确认 `deepseek-v4-flash` 或改用官方名称（如 `deepseek-chat`）
5. **绑定 handleKeyDown**：将 `onKeyDown={handleKeyDown}` 加到正确的 DOM 元素

### 第二优先
6. **统一字数统计方案**：用 `stripHtml()` 去标签后统计中文字符数
7. **统一 55 字线实现**：消除 compliance.ts 和 page.tsx 的重复/矛盾逻辑
8. **TXT 导出剥离 HTML**：导出前 `stripHtml()`
9. **修复 splitSentences**：加入中文分号 `；` 等分割符

### 第三优先
10. 补全 SSR 保护（`getTrash`）
11. `restoreChapter` 重置 order
12. brainstorm 加 `Math.min(count, 10)` 上限
13. 错误信息过滤敏感内容

---

## 六、项目健康度总结

```
构建状态:   ✅ 通过 (Next.js 16.2.9)
TypeScript:  ✅ 通过 (0 错误)
测试用例:   25 个计划 | 已完成执行

安全:       ⚠️ 1 个严重安全问题 (API Key)
严重 Bug:   ⚠️ 5 个 P0
中等 Bug:   ⚠️ 6 个 P1
轻微 Bug:   ⚠️ 6 个 P2/P3
```

### 总体评价

项目核心架构和三栏布局稳定，构建无 TypeScript 错误。主要问题集中在：

1. **安全**：API Key 硬编码是唯一也是最重要的安全问题
2. **合规检测失效**：由于编辑器输出 HTML 而合规函数期望纯文本，合规检测功能实际上不工作
3. **字数统计不准确**：多处不一致，用户看到错误的字数
4. **AI 功能可靠性**：模型名待验证、插入正文可能破坏编辑器

---
