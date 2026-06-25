---
name: mojing-output-protocol
description: 产出文件命名：角色名-任务简称.md，日期写在内容里
---

# 墨境产出文件协议

## 文件命名

```
D:\建网站\mojing-docs\output\角色名-任务简称.md
```

- 不含日期
- 日期写在文件内容的第二行（`> 日期：YYYY-MM-DD`）

示例：
```
D:\建网站\mojing-docs\output\架构审查员-ESLint配置.md
D:\建网站\mojing-docs\output\前端技术负责人-UX修复7项.md
```

## 文件内容格式

```markdown
# 角色名-任务简称

> 日期：YYYY-MM-DD
> 资料来源：[任务文件路径] / [审查对象产出文件]

## 改了什么
...

## 为什么改
...

## 验收命令
...
```

## 与旧格式的区别

| 项目 | 旧格式 | 新格式 |
|---|---|---|
| 文件名 | `架构审查员-2026-06-19-ESLint配置.md` | `架构审查员-ESLint配置.md` |
| 日期 | 在文件名中 | 在文件内容第 2 行 |
