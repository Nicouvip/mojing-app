# 后端-SSE流式全量推广

## 概述

已将 polish、expand、brainstorm 三个接口从普通 JSON 响应改造为 SSE (Server-Sent Events) 流式输出，与 continue 接口保持一致。

## 改动清单

### 1. `src/app/api/ai/polish/route.ts`
- **原行为**：非流式请求 DeepSeek API，返回 `{ text: "..." }` JSON
- **改造后**：请求添加 `stream: true`，通过 `ReadableStream` 将 DeepSeek SSE 数据逐片转发，每片格式为 `{ text: "..." }`，响应头 `Content-Type: text/event-stream`
- **超时**：提升至 60s（与 continue 一致）

### 2. `src/app/api/ai/expand/route.ts`
- 同上，响应字段同样为 `{ text: "..." }`

### 3. `src/app/api/ai/brainstorm/route.ts`
- **原行为**：非流式请求 DeepSeek API（使用 `...params` 展开），返回 `{ ideas: "..." }` JSON
- **改造后**：请求显式传递 `max_tokens`/`temperature` + `stream: true`，SSE 逐片转发，每片格式为 `{ ideas: "..." }`，响应头 `Content-Type: text/event-stream`
- **超时**：提升至 60s

### 4. 统一流式模式

所有四个接口（continue/polish/expand/brainstorm）现在共用同一套 SSE 管道模式：

```
ReadableStream → 逐行解析 DeepSeek SSE → 提取 delta.content → 封装为 { text|ideas: content } → 按行 SSE 输出
```

## 流式响应格式

```
data: {"text":"第一块文字"}\n
data: {"text":"第二块文字"}\n
...
```

brainstorm 使用 `ideas` 字段替代 `text`：

```
data: {"ideas":"🧠 脑洞 1："}\n
data: {"ideas":" 主角身份..."}\n
...
```

## 验证结果

`npx tsc --noEmit` 通过，无类型错误。
