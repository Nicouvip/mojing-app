# 墨境项目交接文档 - 2026-07-20

## 当前服务器状态
**服务器未运行**，需要手动启动：
```
cd D:\codexvip\墨境\项目代码
pnpm dev
```
如果启动失败（`'next' is not recognized`），先运行 `pnpm install` 修复。

---

## 已完成的工作

### 代码改动（已提交到 GitHub）
1. **首页导航栏**：替换内联 header 为 `Navbar` 组件，支持响应式汉堡菜单
2. **侧边栏手机适配**：添加移动端汉堡按钮+滑出抽屉面板
3. **404页面**：添加小墨团摔倒形象
4. **登录/注册页**：左侧品牌区添加小墨团形象
5. **退出登录修复**：添加 `signOut({ redirect: false })` 清除 NextAuth session
6. **桌面页 hydration 修复**：打卡模块用 `mounted` 保护避免服务端/客户端不一致
7. **首页区段**：拉高间距 + 各区段底部添加"免费开始写作"按钮
8. **Google 登录**：`.env.local` 填入真实 Google OAuth 凭据
9. **ADMIN_EMAILS**：已配置管理员邮箱

### 图片素材
- `public/assets/brand/mojing-*.png` — 已抠图透明背景，60-90KB
- 全部素材可用路径：`D:\codexvip\墨境\项目代码\public\assets\brand\mojing-*.png`

---

## ⚠️ 已知问题（需修复）

### 1. ~~`/audiobook/[projectId]` — Turbopack 编译崩溃~~ ✅ **已修复**

**真正根因（2026-07-21 通过 Rust panic 日志确认）**：
```
turbopack-core/src/ident.rs:354
start byte index 8 is not a char boundary; inside '项' (bytes 7..10)
of `墨境_项目代码__next-internal_server_app_audiobook_[projectId]_page_actions...`
```
Turbopack **用项目目录名 `墨境_项目代码`（含中文）做内部 Rust 标识符**，随后做字节切片时碰到 UTF-8 中文多字节字符 → Rust panic。
**❌ 不是文件内容大小导致**（之前多次拆分组件没用就是这个原因）
**❌ 不是文件内中文字符导致**（是目录名，不是文件内容）

**修复方式（2026-07-21）**：
- `package.json`：`"dev": "next dev --webpack"` — Next.js 16 显式 webpack 开关，绕过 Turbopack
- `next` 从 16.2.9 升级到 16.2.10
- 同时将 `page.tsx` 从 872 → 582 行，拆出 5 个小组件（组件拆分本身工作正常，但不是必需要素）
- ✅ **验证通过**：`curl /audiobook/test-project` → HTTP 200

### 2. `mojing-logo-nav.png` 等 Logo 曾误删
已从 Git 恢复。检查 `public/assets/brand/` 下文件是否完整。

---

## 铁律

🔴 **绝对不能移动/复制/重命名项目目录！**
- 所有配置、Git、MCP Server、技能包、记忆都依赖 `D:\codexvip\墨境\项目代码\` 路径
- 所有配置、Git、MCP Server、技能包、记忆都依赖 `D:\codexvip\墨境\项目代码\` 路径

---

## 关键文件位置

| 文件 | 路径 |
|:---|:---|
| 整改方案文档 | `D:\codexvip\docs\墨境UI全面整改方案.md` |
| 小墨团素材 | `D:\codexvip\墨境\项目代码\public\assets\brand\mojing-*.png` |
| 小墨团原图 | `D:\codexvip\logo\` |
| Next.js 配置 | `D:\codexvip\墨境\项目代码\next.config.ts`（当前已回到原始版本） |
| 环境变量 | `D:\codexvip\墨境\项目代码\.env.local` |
| Git 仓库 | `https://github.com/Nicouvip/mojing-app.git` (master分支) |

---

## 线上地址
`https://mojing-vip.vercel.app` — 所有改动已部署，包括有声书详情页
