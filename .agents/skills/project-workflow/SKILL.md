---
name: project-workflow
description: "完整的项目开发工作流技能体系。包含从需求设计到运维迭代的全部 6 个阶段。当用户提到'开发流程'、'工作流'、'开始一个功能'、'怎么做'、'下一步做什么'等时触发。主技能自动路由到对应的阶段子技能。"
---

# 项目开发工作流

> 这是一个技能体系，不是单个技能。主技能负责路由，具体内容按需加载。

## 什么时候用

- 用户说"我们要做一个功能"
- 用户说"下一步做什么"
- 用户说"怎么开始"
- 用户问开发流程相关的问题
- 用户需要一个结构化的执行方案

## 工作流总览

```
Phase 0  需求与设计  →  确认需求、出方案、写设计文档
Phase 1  任务规划    →  拆任务、Git分支、建依赖图
Phase 2  实现        →  挂技能、写代码、子代理并行
Phase 3  质量验证    →  审查/测试/安全/提交
Phase 4  交付与发布  →  版本号/CHANGELOG/构建/部署/回滚
Phase 5  运维与迭代  →  自动化运维/反馈闭环/知识沉淀
```

## 路由规则

当用户提出需求或任务时：

1. **如果是新想法/新功能** → 读取 `references/phase-0-design.md`
2. **如果方案已确定、要拆任务** → 读取 `references/phase-1-planning.md`
3. **如果任务已拆好、要写代码** → 读取 `references/phase-2-implement.md`
4. **如果代码写完了、要验证质量** → 读取 `references/phase-3-quality.md`
5. **如果要合并/发布上线** → 读取 `references/phase-4-deliver.md`
6. **如果已经上线、要运维迭代** → 读取 `references/phase-5-ops.md`

## 跟其他技能的关系

| 阶段 | 会联动触发哪些技能 |
|------|------------------|
| 需求设计 | `brainstorming`、`api-and-interface-design`、`domain-modeling` |
| 任务规划 | `planning-and-task-breakdown` |
| 实现 | `tdd`、`frontend-ui-engineering`、`api-and-interface-design` |
| 质量验证 | `code-review`、`debugging-and-error-recovery`、`browser-testing-with-devtools`、`security-and-hardening` |
| 交付发布 | `verification-before-completion`、`deploy-to-vercel`、`shipping-and-launch` |
| 运维迭代 | 无（流程性工作） |
