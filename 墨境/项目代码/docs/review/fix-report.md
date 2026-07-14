# 墨境后端修复报告

> 日期：2026-07-14
> 范围：src/app/api/、src/lib/ai/、src/lib/db/

---

## 一、修改文件清单

### 1. `src/app/api/ai/alchemy/route.ts`
- 添加 `import { DEEPSEEK_API_URL, DEEPSEEK_MODEL } from '@/lib/ai/constants'`
- `API_URL` 从硬编码改为 `DEEPSEEK_API_URL`
- `'deepseek-chat'` 改为 `DEEPSEEK_MODEL`

### 2. `src/app/api/ai/inspire/route.ts`
- 添加常量导入
- `API_URL` 从硬编码改为 `DEEPSEEK_API_URL`
- `'deepseek-chat'` 改为 `DEEPSEEK_MODEL`

### 3. `src/app/api/ai/layout/route.ts`
- 添加常量导入
- `URL` 从硬编码改为 `DEEPSEEK_API_URL`

### 4. `src/app/api/ai/deep-check/route.ts`
- 添加常量导入
- `API_URL` 从硬编码改为 `DEEPSEEK_API_URL`
- **TOCTOU 竞态修复**：`trackUsage()` 从自实现（读→增→写临时文件→rename）改为调用 `usage-store.ts` 中已存在的 `incrementUsage('deep-check')`
- 空 `catch` 加了 `console.error`

### 5. `src/app/api/ai/brainstorm/route.ts`
- 导入替换：`fetchWithTimeout` → `handleDeepSeekStream`
- 添加常量导入，URL 改为 `DEEPSEEK_API_URL`
- **SSE 流代码精简**：原本 40+ 行的流 fetch + SSE 解析 → `await handleDeepSeekStream(...)` 一行调用

### 6. `src/app/api/ai/continue/route.ts`
- 导入替换：`fetchWithTimeout` → `handleDeepSeekStream`
- 添加常量导入，URL 改为 `DEEPSEEK_API_URL`
- **SSE 流代码精简**：同上
- 简化 catch 块，移除对 `FetchRetryError` 的引用

### 7. `src/app/api/ai/expand/route.ts`
- 导入替换：`fetchWithTimeout` → `handleDeepSeekStream`
- 添加常量导入，URL 改为 `DEEPSEEK_API_URL`
- **SSE 流代码精简**：同上

### 8. `src/app/api/ai/polish/route.ts`
- 导入替换：`fetchWithTimeout` → `handleDeepSeekStream`
- 添加常量导入，URL 改为 `DEEPSEEK_API_URL`
- **SSE 流代码精简**：同上

### 9. `src/app/api/admin/backup/route.ts`
- 空 `catch` 块加了 `console.error` 日志

### 10. `src/app/api/ai/usage/route.ts`
- catch 块从返回 `200 + { count: 0 }` 改为返回 `500 + { error }`，与其他路由一致

### 11. `src/lib/ai/constants.ts` — **新建**
- `DEEPSEEK_API_URL` — DeepSeek API 端点
- `DEEPSEEK_MODEL` — 模型名称
- `DEFAULT_TIMEOUT` / `STREAM_TIMEOUT` / `MAX_RETRIES` — 超时和重试配置

### 12. `src/lib/ai/stream-utils.ts` — **新建**
- `callDeepSeekStream()` — 调用 DeepSeek 并返回 SSE 流式 Response
- `createSSEStream()` — 从 SSE 流响应创建 ReadableStream
- `handleDeepSeekStream()` — 以上两步合并，直接返回 SSE Response

---

## 二、已检查无需修改的项

| 任务 | 结果 |
|------|------|
| admin/users/route.ts 加 await | ✅ 已存在（第13行已有 `await`） |
| 空 catch 块扫描 | ✅ 大部分已有合理错误返回（400/500），仅 backup 空catch 和 usage 错误码需要修 |
| alert() 替换 | ✅ `src/lib/` 下无 `alert()` 调用 |
| usage/route.ts catch | ✅ 已从 200 改为 500 |

---

## 三、效果统计

| 指标 | 修改前 | 修改后 |
|------|--------|--------|
| 硬编码 API URL | 9 处 | 0 处（全部引用共享常量） |
| 重复的 SSE 流代码 | 4 份 × 40 行 | 1 份共享函数 |
| TOCTOU 竞态 | deep-check 自实现有竞态 | 统一调用 `usage-store` 的原子写入 |
| 空 catch 无日志 | backup + 2 处 | 加日志 |
| usage 错误码 | 返回 200 吞错 | 返回 500 |
| **编译** | 0 错误 | **0 错误** ✅ |

---

## 四、未触及（超出任务范围）

- `/library/characters` 等 4 个缺失路由 → 需新建页面
- 编辑器页面的庞大组件拆分 → UI 重构任务
- 设计令牌碎片化 + 内联样式 → UI 重构任务
- `storage-keys.ts` 未使用 → 独立清理任务
- `syncToSupabase()` 同步不完整 → 数据库同步增强任务
