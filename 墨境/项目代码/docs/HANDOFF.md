# 墨境项目 · 交接文档

> 日期：2026-07-13
> 后续任务：知识库补充 — 把条目从 79 条补到 150+ 条
> 接手人：下一位 Reasonix Agent

---

## 一、做什么

给墨境网站的 AI 提示词系统补充网文写作规则条目，让 AI 写出更好的小说。

当前知识库 79 条，目标 150+ 条。只需往数组里加对象，不涉及架构改动。

## 二、项目信息

- 项目路径：`D:\codexvip\墨境\项目代码`
- 启动命令：`pnpm dev` → 浏览器打开 `http://localhost:3000`
- 管理后台：`/admin/knowledge`（可查看已添加的条目）
- 核心文件：`src/lib/ai/knowledge-base.ts`（知识条目全在这里）
- 版本控制：git（未提交的修改在工作区）

## 三、怎么加条目

1. 打开 `src/lib/ai/knowledge-base.ts`
2. 找到数组末尾（最后一个 `{` 对象之后、`]` 之前）
3. 从原始模板文件提取规则段落
4. 按固定格式加对象
5. 运行 `npx tsc --noEmit` 确认编译通过
6. 在浏览器中打开 `/admin/knowledge` 确认可见

### 条目格式

```typescript
{
  id: 'polish_A2_Bclass',        // 唯一标识
  category: 'polish',             // 分类：polish | operations | techniques | narrative | iron_rules | genre_params
  title: 'B类禁用词',              // 标题
  content: '【B类禁用词】词表：突然、觉得、非常……规则：同段≥3次触发……',  // 规则文本
  tags: ['禁用词', 'B类'],         // 检索标签
  timing: 'always',               // 注入时机
  priority: 4,                    // 优先级 1-5
}
```

详细指南见：`docs/superpowers/specs/2026-07-13-knowledge-base-supplement-guide.md`

## 四、原始模板文件（知识来源）

```
C:\Users\nicou\OneDrive\桌面\AI聊天室\小墨写作模板\v8.0\最新\最新知识库模式模板\知识库\
├── # 知识库_语言净化与润色规则.txt     ← 重点补（当前9条，目标50+）
├── # 知识库_系统运维与状态管理.txt     ← 重点补（当前14条，目标30+）
├── # 知识库_核心工具箱.txt
├── # 知识库_题材参数与风格指南.txt
└── # 知识库_叙事结构与角色工具.txt
```

当前各分类条目数：
| 分类 | 当前 | 目标 |
|------|------|------|
| techniques | 38 | 40 |
| narrative | 7 | 10 |
| iron_rules | 6 | 6 |
| genre_params | 5 | 5 |
| **polish** | **9** | **50+** |
| **operations** | **14** | **30+** |
| **总计** | **79** | **150+** |

### polish 分类补条目建议

从 `# 知识库_语言净化与润色规则.txt` 提取：

1. **A-2 禁用词分层**（~10条）：把每个级别拆成独立条目（A类递进判断句、B类禁用词、C类连接词L1-L2、C类连接词L3-L5、D类事后扫描、AI高频词×5类、禁用句式）
2. **工具Q 四级净化**（~15条）：词汇替换细则（副词/动作/情绪词/比喻）、句式优化（删解释/删总结/不解释/核心动作）、段落重构（删铺垫/删对话/删支线/删上帝/删重复）、场景适配（人设/正式日常/开头正文）
3. **工具R 替换表**（~20条）：每组替换对照作为独立条目
4. **工具AC 精修质检**（~15条）：排版5项、句号换行3级、内容10项、动词虚词、AI姓名、防守联动

### operations 分类补条目建议

从 `# 知识库_系统运维与状态管理.txt` 提取：

1. **工具L 冷却系统**（~8条）：追踪维度、快照格式、读法、窗口规则、兜底规则、善意提醒、防御声明
2. **工具J 伏笔管理**（~5条）：三态、重要次要判断、上限、回收时限、追踪方式
3. **工具K 角色成长**（~4条）：4条触发条件、输出格式、手动指令
4. **工具AF 备份**（~4条）：导出、导入、快照格式、快速检索
5. **工具AD/AE 提取**（~4条）：开书档案提取、本章节点提取、失败处理
6. **零-4 零-5**（~4条）：启动模式、原料包入库
7. **指令索引**（~1条）：43条指令汇总
8. **修改指令解析**（~1条）
9. **N/O 标题/状态行**（~2条）

## 五、验证方法

```bash
# 1. 编译检查
npx tsc --noEmit

# 2. 浏览器验证
pnpm dev  # 访问 /admin/knowledge

# 3. 查看条目数和分类分布
node -e "
const c = require('fs').readFileSync('src/lib/ai/knowledge-base.ts','utf-8');
const cats = {};
for (const m of c.matchAll(/category: '(\w+)'/g)) cats[m[1]] = (cats[m[1]]||0)+1;
console.log(cats);
console.log('Total:', Object.values(cats).reduce((a,b)=>a+b,0));
"
```

## 六、建议技能包

- `implement` — 执行实施任务
- `codebase-design` — 理解模块结构
- `domain-modeling` — 知识领域建模

## 七、参考文档

- 补充指南：`docs/superpowers/specs/2026-07-13-knowledge-base-supplement-guide.md`
- RAG说明：`docs/superpowers/specs/2026-07-13-rag-knowledge-base-handoff.md`
- 架构设计：`docs/superpowers/specs/2026-07-13-mojing-architecture-overhaul.md`
- 知识库文件：`src/lib/ai/knowledge-base.ts`（79条，数组末尾加条目）
- 管理后台：`/admin/knowledge`
- 原始模板：桌面 `AI聊天室/小墨写作模板/v8.0/最新/最新知识库模式模板/知识库/`
