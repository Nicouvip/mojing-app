# Skills安装流程 · 可复用配方

## 用途
根据视频推荐或实际项目需要，从 skills.sh 市场批量安装 Agent Skills。

## 前置条件
- 确定技能在 skills.sh 上的仓库名（格式：`owner/repo` 或 `owner/repo@skill-name`）
- 项目根目录下执行

## 执行步骤

### Step 1：搜索确认
```bash
npx skills find <关键词>
```
确认技能是否在 skills.sh 市场上存在。

### Step 2：安装命令
```bash
# 安装整个仓库的所有技能
npx skills add <owner/repo> -y

# 安装仓库中的单个技能
npx skills add <owner/repo@skill-name> -y

# 批量安装多个
npx skills add <repo1> <repo2> <repo3> -y
```

### Step 3：验证安装
```bash
# 查看已安装的项目技能
npx skills list

# 查看已安装的全局技能
npx skills list -g

# 查看技能文件
ls .agents/skills/
```

### Step 4：清理临时文件
安装过程中产生的临时 `.html`/`.py`/`.js` 文件，用完后删除。

## 常用仓库参考

| 仓库 | 包含技能 | 适用场景 |
|------|---------|---------|
| addyosmani/agent-skills | TDD、代码审查、文档、调试等24个 | 通用工程规范 |
| leonxlnx/taste-skill | 前端设计品味系列 | UI/UX设计 |
| vercel-labs/agent-skills | Vercel部署、React最佳实践 | 前端部署 |
| obra/superpowers | 写作、品牌、计划等 | 内容创作 |
| anthropics/skills | skill-creator、canvas-design | 元技能 |
| juliusbrussee/caveman | 省Token模式 | 成本优化 |
| supabase/agent-skills | Supabase相关 | 数据库/后端 |
| better-auth/skills | 认证最佳实践 | 用户系统 |
| stripe/ai | 支付集成 | 商业化 |
| firecrawl/skills | 网页抓取 | 数据采集 |
| jackwener/opencli@smart-search | 智能搜索 | 搜索增强 |

## 注意事项
- 使用 `-y` 参数跳过确认提示，提高批量安装效率
- 项目技能安装在 `.agents/skills/` 目录（D盘），不占C盘空间
- 检查技能的安全风险评估后再使用

---

*配方版本：v1.0（2026-07-08）*
*创建人：张总 + AI技术合伙人*
