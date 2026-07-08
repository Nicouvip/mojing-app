---
name: mojing-diagnose
description: "墨境项目（MoJing）故障诊断。适用于：页面404、构建错误、路由问题、服务器异常、页面渲染异常、需要验证Next.js应用状态时触发。在D:\codexvip\墨境\项目代码目录下工作时自动匹配。"
---

# 墨境故障诊断流程（必须严格执行）

## 触发条件
当张总提到以下任何内容时，此技能包必须自动触发：
- 页面打不开 / 404 / 500
- 路由有问题
- 构建失败 / 编译报错
- 服务器启动异常
- 页面渲染不对 / UI 问题
- 验证 / 测试页面
- 任何需要确认应用状态的任务

## 流程（禁止跳步）

### Step 1: 确认状态
- 运行的 dev server 是否在线？端口多少？
- `.next/dev/server/app-paths-manifest.json` 中路由是否注册？
- 用 curl/Invoke-WebRequest 快速验证关键页面返回码

### Step 2: 诊断分析
- 读相关源码（layout.tsx, page.tsx, next.config.ts, tsconfig.json）
- 跑 `pnpm typecheck` 确认编译状态
- 确认问题根源

### Step 3: 出修复方案（必须走这一步）
- 给张总提交清晰的问题分析和修复方案
- 等张总确认后再执行

### Step 4: 执行修复
- 严格按照确认的方案执行
- 记录改动

### Step 5: 验证（必须用 Playwright，禁止用 shell 替代）
- 用 Python Playwright 打开页面做截图验证
- 确认路由清单已更新
- 展示验证结果给张总

## 工具要求
- **服务器管理**：使用 webapp-testing 技能包的 `with_server.py` 管理服务器生命周期
- **页面验证**：使用 playwright-interactive 或 webapp-testing 的 Playwright Python 方式
- **禁止**：直接用 `Start-Process chrome` 替代 Playwright 验证

## 检查清单
- [ ] 是否先诊断再出方案？
- [ ] 方案是否已获张总确认？
- [ ] 执行后是否用 Playwright 验证？
- [ ] 验证结果是否展示给张总？
