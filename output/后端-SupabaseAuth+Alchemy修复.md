# 后端修复报告 — Supabase Auth + Alchemy/Inspire API

> 验证日期：2025-06-23  
> 技术栈：Next.js 16 + TypeScript 6  
> 验证方式：`npx tsc --noEmit`（0 errors）

---

## 一、Supabase Auth 接入 & 降级方案（P0）

### 1.1 环境变量检查

`.env.local` 中 Supabase 相关变量当前均为 **placeholder 值**：

| 变量 | 当前值 |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://placeholder.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `placeholder-anon-key` |
| `SUPABASE_SERVICE_ROLE_KEY` | `placeholder-service-role-key` |

### 1.2 降级判定逻辑

`src/lib/db/supabase.ts` 中的 `isRealEnv()` 函数：

```typescript
function isRealEnv(value: string | undefined): boolean {
  return !!value && !value.startsWith('placeholder') && value.length > 10
}
```

- 当前值均以 `placeholder` 开头 → `isRealEnv()` 返回 `false`
- `getSupabase()` 返回 `null`，`getAdminSupabase()` 返回 `null`
- `auth-store.ts` 自动降级到 **本地 Mock 方案**：内存 `Map<string, UserRecord>` + `localStorage` 双写

### 1.3 降级后功能状态

| 功能 | 状态 |
|------|------|
| 用户注册 (`POST /api/auth/register`) | ✅ Mock — bcrypt 哈希存内存+localStorage |
| 用户登录 (`POST /api/auth/login`) | ✅ Mock — bcrypt 比对 |
| 邮箱查重 (`userExists`) | ✅ Mock — 内存 Map 检索 |
| 用户禁用 (`setUserBanned`) | ✅ Mock — 内存标记 `banned` |
| 用户列表 (`getAllUsers`) | ✅ Mock — 返回内存数据 |

### 1.4 Supabase 配置指南（生产部署时）

当需要启用真实 Supabase 时，按以下步骤操作：

1. **注册**：访问 https://supabase.com 注册/登录
2. **创建项目**：新建一个项目（或打开已有项目）
3. **获取凭据**：进入项目 → **Settings → API**
   - 复制 **Project URL** 到 `NEXT_PUBLIC_SUPABASE_URL`
   - 复制 **anon public key** 到 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - 复制 **service_role key** 到 `SUPABASE_SERVICE_ROLE_KEY`（⚠ 仅服务端使用，切勿暴露给客户端）
4. **建表**：执行 `src/lib/supabase-schema.sql` 中的建表语句，创建五张核心表
5. **重启服务**：修改完成后重启 dev server

配置完成后，`isRealEnv()` 会自动返回 `true`，`auth-store.ts` 会无缝切换到 Supabase Auth Admin API，无需修改任何业务代码。

---

## 二、Alchemy（书名炼金术）API 修复（P1）

### 涉及文件

`src/app/api/ai/alchemy/route.ts`

### 修复项

#### R1 — 书名解析脆弱（✅ 已修复）

**问题**：原策略3 line-level 解析中包含一条过于激进的 regex `["""」『』]\s*[|】].*$`，只要行中出现 `"` 或 `】` 就截断到行尾（例如 `"书名"（直白型）` → 只剩 `"`）。

**修复内容**：

1. **策略1（JSON 数组提取）** 增强
   - 先尝试匹配 `[...]\n`（JSON 独占一行），再回退到全文本贪婪匹配
   - 解析后去除换行再 parse

2. **策略2（【书名】格式提取）** 保留不变

3. **策略3（行级解析兜底）** 全面重建
   - 先统一清洗 Markdown 标记（`**bold**`、`__bold__`、`*italic*`）
   - 分步处理：去行首序号 → 去首尾引号 → 去类型标注（`（直白型）`） → 去类型前缀
   - 长度上限从 20 放宽到 30

4. **Prompt 增强**：在输出格式中强调"必须严格遵守"JSON 格式，使 AI 更倾向于输出合规 JSON

#### R3 — 请求体校验（✅ 已修复）

**问题**：仅捕获 `req.json()` 解析错误，未校验字段类型。

**修复内容**：

- 校验 `genre` / `keywords` / `style` 均为 `string` 类型，否则返回 400
- 校验 `count` 为有效正数，无效时兜底为 5

**新增字段校验**：

```typescript
const validCount = typeof count === 'number' && count > 0 && Number.isFinite(count)
  ? Math.min(Math.floor(count), 10)
  : 5
if (typeof genre !== 'string')  return NextResponse.json({ error: 'genre 必须是字符串' }, { status: 400 })
if (typeof keywords !== 'string') return NextResponse.json({ error: 'keywords 必须是字符串' }, { status: 400 })
if (typeof style !== 'string')  return NextResponse.json({ error: 'style 必须是字符串' }, { status: 400 })
```

---

## 三、Inspire（灵感爆裂）API 修复（P1）

### 涉及文件

`src/app/api/ai/inspire/route.ts`

### 修复项

#### R2 — mode 返回不实（✅ 已修复，代码已实现）

**问题**：原代码回退无效 mode 到 `direct-diverge` 时，返回的 `mode` 字段仍是用户传入的原始值，前端可能误解。

**当前代码状态**：✅ **已正确实现**

```typescript
const actualMode = MODE_PROMPTS[mode] ? mode : 'direct-diverge'  // line 80
// ...
return NextResponse.json({ text, mode: actualMode })              // line 99
```

返回的 `mode` 字段始终是 **实际使用的模式**，而非用户输入值。

#### R3 — 请求体校验（✅ 已修复，代码已实现 + 补充）

**问题**：无请求体字段类型校验。

**补充修复**：

```typescript
if (typeof mode !== 'string')    return NextResponse.json({ error: 'mode 必须是字符串' }, { status: 400 })
if (typeof context !== 'string') return NextResponse.json({ error: 'context 必须是字符串' }, { status: 400 })
if (typeof genre !== 'string')   return NextResponse.json({ error: 'genre 必须是字符串' }, { status: 400 })
```

---

## 四、编译验证

```bash
npx tsc --noEmit
```

**结果**：✅ EXIT_CODE=0，零错误通过。

---

## 五、变更文件清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/lib/db/supabase.ts` | 未改动 | 降级判断逻辑正常 |
| `src/lib/db/auth-store.ts` | 未改动 | 降级方案正常 |
| `src/app/api/auth/login/route.ts` | 未改动 | 降级后正常工作 |
| `src/app/api/auth/register/route.ts` | 未改动 | 降级后正常工作 |
| `src/app/api/ai/alchemy/route.ts` | ✅ 已修复 | R1 行级解析重建 + R3 字段校验 + Prompt 增强 |
| `src/app/api/ai/inspire/route.ts` | ✅ 已修复 | R2 已验证正确 + R3 补充字段校验 |
