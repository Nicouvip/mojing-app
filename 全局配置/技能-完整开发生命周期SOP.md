---
name: full-lifecycle-sop
description: "完整的软件开发生命周期 SOP，从想法到运维的 26 个步骤，每步绑定技能/工具/门禁。适用于任何项目，含版本管理、回滚、性能、监控、跨浏览器、安全审计。"
metadata:
  author: "张总 + AI技术合伙人"
  version: "2.0.0"
  updated: "2026-07-08"
  categories: [流程管理, 质量保障, 工程规范]
---

# 完整软件开发生命周期 SOP

> 从0到最终落地，每一步绑定了：用什么技能 → 用什么工具 → 过什么门禁

<HARD-GATE>
未完成当前阶段的门禁，不得进入下一阶段。
未挂对应 SKILL.md 不得开始实现。
未通过 ts 零错误不得提交。
未通过 pre-flight 检查不得合并。
</HARD-GATE>

---

## 一、技能总览：8 类工具

| 类别 | 工具 | 触发条件 |
|------|------|---------|
| **技能包** | `load_skill` | 任务匹配路由表时强制加载 |
| **子代理** | `delegate_task` (4种profile) | 独立模块/并行/审查时 |
| **任务管理** | `task_graph` / `todo_write` / `create_goal` | 复杂任务/进度追踪/预算 |
| **定时任务** | `gui_schedule_create` (daily/interval/at) | 自动化运维时 |
| **工作流** | `list_workflows` / `run_workflow` | 重复3次以上流程 |
| **验证** | `verify_changes` / `tsc --noEmit` | 每次改完/提交前强制 |
| **浏览器** | `agent-browser` / `web_fetch` | 调研/测试/截图 |
| **设计** | 设计HTML / agent-browser screenshot | UI设计时 |

---

## 二、开发生命周期（7 阶段 · 26 步骤）

---

### Phase -1：产品探索与需求定义

**环节：从想法到可执行的需求**

```
触发：张总有一个想法

[0] 探索与澄清
    ├→ 挂 brainstorming 技能
    │   多轮提问 → 确认意图 → 澄清约束 → 明确成功标准
    ├→ 需要参考竞品 → agent-browser 调研
    └→ 需要查资料 → web_fetch 快速获取
    门禁：张总确认需求理解正确

[1] 需求定义
    ├→ 写需求文档 → 项目文档/功能名称-需求.md
    │   包含：用户故事、验收标准、优先级(P0-P2)、约束条件
    └→ 门禁：张总确认需求文档
```

---

### Phase 0：方案设计

**环节：从需求到可落地的设计**

```
[2] 技术方案设计
    ├→ 涉及API/接口 → 挂 api-and-interface-design
    ├→ 涉及领域模型 → 挂 domain-modeling
    ├→ 提 2-3 种方案 + 推荐
    ├→ 方案包含：架构/组件树、数据流、接口定义、风险点
    └→ 门禁：张总确认方案

[3] UI/UX 设计（涉及前端时）
    ├→ 挂 design-taste-frontend 或 high-end-visual-design
    ├→ 出设计HTML（可打开看）
    ├→ 派 design-reviewer 子代理审查
    └→ 门禁：张总看效果，确认或修改

[4] 写设计文档
    ├→ 项目文档/序号-功能名称-设计文档.md
    ├→ 包含：背景、方案、组件/数据流、接口、验收标准
    └→ 门禁：张总审阅通过

[5] 设计评审（复杂功能强制）
    ├→ 派 design-reviewer（只读）审查设计一致性
    └→ 修复发现问题
```

---

### Phase 1：任务规划

**环节：从设计到可执行的任务**

```
[6] Git 分支
    ├→ git checkout -b feature/功能名称
    └→ 分支名英文 kebab-case

[7] 任务拆解
    ├→ 简单（3步以内）→ 直接 Phase 2
    ├→ 复杂 → 挂 planning-and-task-breakdown
    │   ├→ 按垂直切片拆分（完整功能路径）
    │   └→ 用 task_graph 建依赖图
    └→ 标记可并行模块 → 准备派子代理
```

---

### Phase 2：实现

**环节：从任务到可运行的代码**

```
[8] 启动新执行线程
    ├→ 说"加载墨境配置" → 自动载入上下文
    ├→ 读设计文档
    └→ **挂对应 SKILL.md — 不挂技能不开工**
        根据路由表匹配（墨境/项目文档/02-协作规则.md §4.1）

[9] 实现策略选择
    ├→ 逻辑复杂/正确性关键 → 挂 tdd/test-driven-development
    │   (先写测试 → 再实现 → 通过)
    ├→ UI 改动 → 挂 frontend-ui-engineering
    ├→ API 改动 → 挂 api-and-interface-design
    └→ 组合加载

[10] 执行实现
     ├→ 按 task_graph 顺序，每步标记
     ├→ 可并行 → delegate_task 派子代理
     │   ├→ general（读写）→ 执行独立模块
     │   ├→ explore（只读）→ 调研/查代码
     │   └→ design-reviewer（只读）→ 随时审查
     └→ 每步 todo_write 更新状态
```

---

### Phase 3：质量验证

**环节：从写完到可提交——4 层质量防线**

```
[11] 差错排查（Debugging）
     ├→ 运行有问题 → 挂 debugging-and-error-recovery
     ├→ 挂 systematic-debugging
     ├→ agent-browser 排查前端问题
     ├→ 流程：诊断原因 → 出方案 → 确认 → 修复 → 验证
     └→ 门禁：无阻断性 Bug

[12] 代码审查（Code Review）
     ├→ 挂 code-review 技能
     │   审代码规范 + 设计一致性
     ├→ 派 over-engineering-reviewer（只读）子代理
     │   审过度设计、不必要抽象、复杂度
     └→ 循环直到通过

[13] 自动化验证
     ├→ verify_changes focused（每次改完立即跑）
     ├→ pnpm typecheck（TS 零错误——强制门禁）
     └→ 有 UI 改动 → agent-browser 截图确认

[14] 测试（Testing）
     ├→ 复杂功能 → 挂 browser-testing-with-devtools
     │   ├→ 真实浏览器：检查 DOM/控制台错误/网络
     │   └→ 验证交互逻辑和视觉输出
     ├→ 有测试用例 → 挂 qa 或 webapp-testing
     ├→ 手动验证：按验收标准逐条检查
     ├→ 跨浏览器测试（复杂功能）
     │   ├→ Chrome / Firefox / Safari / Edge
     │   └→ 移动端 Safari / Chrome
     └→ 门禁：所有验收标准通过

[15] 安全审查（Security）
     ├→ 涉及认证/数据/API → 挂 security-and-hardening
     ├→ 涉及 Better Auth → 挂 better-auth-security-best-practices
     ├→ 依赖安全审计 → pnpm audit
     ├→ 检查：已知漏洞、过期依赖、许可证风险
     └→ 门禁：无高危安全漏洞

[16] 提交代码
     ├→ git add + git commit -m "<emoji> <功能名称>"
     │   ├→ 🎨 UI  ✨ 功能  🐛 Bug  ♻️ 重构
     │   ├→ 📝 文档  🔧 配置  ⚡ 性能
     │   ├→ 🧪 测试  🔒 安全  📦 依赖
     │   └→ 🚀 部署  ⏪ 回滚
     └→ 提交信息包含：做了什么 + 为什么
```

---

### Phase 4：交付前检查（Pre-flight）

**环节：从合并到交付——最后一道防线**

```
[17] 交付前完整性检查
     ├→ 挂 verification-before-completion
     ├→ 挂 doubt-driven-development（质疑式）
     ├→ 挂 full-output-enforcement
     └→ 逐项检查：
         ├→ 验收标准全部满足
         ├→ tsc 零错误
         ├→ 构建无报错
         ├→ UI 像素级对齐
         ├→ 响应式 320/768/1024/1440
         ├→ 空状态/加载态/错误态已处理
         ├→ 无障碍：键盘导航/焦点管理/aria标签
         ├→ 移动端适配
         └→ SEO：Meta标签/结构化数据

[18] 最终验证
     ├→ verify_changes full（完整构建+类型+lint+测试）
     └→ 门禁：全部通过

[19] 版本号 + 合并
     ├→ 更新版本号（遵守 SemVer）
     │   ├→ 主版本：不兼容API变更
     │   ├→ 次版本：向下兼容的新功能
     │   └→ 补丁：向下兼容的 Bug 修复
     ├→ 更新 CHANGELOG.md
     │   格式：## [版本号] - 日期
     │         ### Added / Changed / Fixed / Removed
     ├→ git checkout master
     ├→ git merge feature/xxx
     ├→ git tag vX.Y.Z
     ├→ git branch -d feature/xxx
     └→ 项目文档标记：功能为"已完成"

[20] 回主线程汇报
     ├→ 做了什么
     ├→ 关键决策
     ├→ 当前风险/遗留问题
     ├→ 技术债务记录（如果有）
     ├→ 张总验收确认
     └→ 下次从哪开始
```

---

### Phase 5：发布（Deploy）

**环节：从代码到线上——带安全网**

```
[21] 构建与发布
     ├→ 挂 deploy-to-vercel 技能（Vercel 部署）
     ├→ 挂 shipping-and-launch 技能（上线清单）
     ├→ pnpm build（生产构建）
     ├→ 性能基线检查：
     │   ├→ Lighthouse 评分 ≥ 90（移动端 ≥ 85）
     │   ├─→ LCP < 2.5s / FID < 100ms / CLS < 0.1
     │   └→ 构建产物大小对比（阻止异常膨胀）
     └→ 门禁：构建无报错 + 性能达标

[22] 上线后验证
     ├→ agent-browser 打开线上地址做 smoke test
     ├→ 检查：页面加载 / 核心功能 / 控制台无报错
     ├→ 配置错误监控：
     │   ├→ 控制台错误捕获
     │   ├→ 未捕获异常报警
     │   └→ API 错误率监控
     └→ 门禁：线上功能正常 + 监控已生效

[23] 回滚预案
     ├→ 回滚条件：上线后发现 P0/P1 级问题
     ├→ 回滚方式：
     │   ├→ git revert <上线版本>
     │   ├→ 数据库迁移回退（如果有）
     │   └→ 环境变量回退
     ├→ 回滚后流程：
     │   ├→ 确认服务恢复正常
     │   ├→ 记录事故原因
     │   ├→ 出修复方案
     │   └→ 走 Phase 2-4 修复后重新上线
     └→ 门禁：回滚方案已确认
```

---

### Phase 6：运维与迭代

**环节：上线后到下一轮——持续改进**

```
[24] 自动化运维
     ├→ 需要每日检查 → gui_schedule_create (daily)
     ├→ 需要间隔执行 → gui_schedule_create (interval)
     ├→ 需要定时提醒验收 → gui_schedule_create (at)
     └→ 重复3次以上的流程 → 做成 workflow

[25] 反馈闭环
     ├→ 张总看效果 → 反馈
     ├→ 我分析原因 → 出修复方案
     ├→ 走 Phase 1-4 修复
     └→ 更新文档

[26] 知识沉淀
     ├→ 重要决策记入项目文档
     ├→ 可复用流程做成 workflow
     ├→ 重复3次以上做成配方/技能
     └→ 技术债务追踪表更新
```

---

## 三、工具触发速查表

| 场景 | 工具/动作 | 强制？ |
|------|----------|:-----:|
| 新需求来了 | AIM框架响应 | ✅ 强制 |
| 需求不确定 | 直接问，不猜 | ✅ 强制 |
| 创意/功能设计 | `load_skill` brainstorming | ✅ 强制 |
| 确认方案后 | 写设计文档到项目文档 | ✅ 强制 |
| 开始实现前 | 加载对应 SKILL.md | ✅ 强制 |
| 漏挂技能 | 张总说"挂技能"，我停 | ✅ 兜底 |
| 开新功能 | git checkout -b feature/xxx | ✅ 强制 |
| 复杂任务拆解 | planning-and-task-breakdown | 推荐 |
| 多步骤依赖 | task_graph 建图 | 复杂强制 |
| 可并行模块 | delegate_task 子代理 | 推荐 |
| 调研/查代码 | delegate_task explore | 推荐 |
| 设计审查 | delegate_task design-reviewer | 推荐 |
| 过度工程审查 | delegate_task over-engineering-reviewer | 推荐 |
| 看网页/截图 | agent-browser | 按需 |
| 快速取文字 | web_fetch | 按需 |
| 本地预览 | 内置浏览器（右侧栏） | 默认 |
| 外网浏览 | Chrome 插件 | 默认 |
| 每次改完 | verify_changes focused | ✅ 强制 |
| 合并前 | verify_changes full | ✅ 强制 |
| 提交前 | tsc --noEmit 零错误 | ✅ 强制 |
| UI改动后 | agent-browser 截图 | 推荐 |
| 代码审查 | code-review 技能 | ✅ 强制 |
| 合并时 | 更新版本号 + CHANGELOG | ✅ 强制 |
| 合并后 | 更新文档 + 回主线程汇报 | ✅ 强制 |
| 发布前 | service 性能基线 ≥ 90 | ✅ 强制 |
| 上线后 | 配置错误监控 | ✅ 强制 |
| 重复3次以上 | 做成 workflow | 推荐 |
| 每日例行 | gui_schedule_create | 按需 |
| 定时提醒 | gui_schedule_create | 按需 |
| Token紧张 | 张总说"省Token" → caveman | 按需 |

---

## 四、验收门禁清单

### 代码门禁
- [ ] TypeScript 编译零错误
- [ ] 生产构建无报错
- [ ] `pnpm audit` 无高危漏洞
- [ ] 测试全部通过（如果有）
- [ ] 跨浏览器：Chrome/Firefox/Safari/Edge 无样式断裂

### UI 门禁
- [ ] 像素级对齐设计稿
- [ ] 响应式：320/768/1024/1440
- [ ] 空状态 / 加载态 / 错误态 全覆盖
- [ ] 无障碍：键盘可操作 / 焦点管理 / aria 标签
- [ ] SEO：Meta 标签 / 结构化数据

### 性能门禁
- [ ] Lighthouse 桌面 ≥ 90，移动端 ≥ 85
- [ ] LCP < 2.5s
- [ ] 构建产物大小无异常增长

### 发布门禁
- [ ] 版本号已按 SemVer 更新
- [ ] CHANGELOG.md 已更新
- [ ] 回滚方案已确认
- [ ] 错误监控已配置
- [ ] 线上 smoke test 通过

---

## 五、提交信息规范

```
<emoji> <功能名称>

- 做了什么（具体）
- 为什么这么做

类型：
🎨 UI      ✨ 功能    🐛 Bug     ♻️ 重构
📝 文档    🔧 配置    ⚡ 性能    🧪 测试
🔒 安全    📦 依赖    🚀 部署    ⏪ 回滚
```

---

## 六、版本号规范（SemVer）

```
主版本.次版本.补丁

主版本 ↑：不兼容的 API 变更（如 breaking change）
次版本 ↑：向下兼容的新功能
补丁   ↑：向下兼容的 Bug 修复

示例：
  v1.0.0 → 首次正式发布
  v1.1.0 → 新增功能
  v1.1.1 → Bug 修复
  v2.0.0 → 不兼容重构
```

---

## 七、异常与兜底

| 异常 | 处理方式 |
|------|---------|
| 我不确定需求 | 直接问，不猜 |
| 方案不合理 | 我直说，你拍板 |
| 遇到阻塞 | 暂停等你指示 |
| 方向决策 | 暂停等你指示 |
| 我漏挂技能 | 你说"挂技能"，我停 |
| 对话太长 | 开新线程，加载配置 |
| 上下文压缩 | 不丢已存档信息 |
| 张总纠正我 | 记住，不再犯 |
| 上线出问题 | 执行回滚预案 |
| Token紧张 | 切 caveman 模式 |

---

## 八、CHANGELOG 格式

```markdown
## [v1.1.0] - 2026-07-08

### Added
- 新增功能A（#issue）

### Changed
- 优化功能B的性能

### Fixed
- 修复功能C的 Bug

### Security
- 修复依赖安全漏洞
```

---

*本文档是完整开发生命周期规范，跨项目通用。*
*版本 v2.0.0 | 最后更新 2026-07-08*
*创建：张总 + AI技术合伙人*
