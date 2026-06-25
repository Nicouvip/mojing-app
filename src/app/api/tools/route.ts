// ============================================================
// 墨境 API — 工具广场元数据
// GET /api/tools — 返回全部AI工具元数据（名称/描述/参数/分类）
// 前端一次性加载，用于AI工具广场页面
// ============================================================

import { NextResponse } from 'next/server'

interface ToolMeta {
  id: string
  name: string
  category: '创作前' | '创作中' | '创作后'
  description: string
  params: { name: string; type: string; required: boolean; description: string }[]
  endpoint: string
  hoverDemo?: string
}

export async function GET() {
  try {
    const tools: ToolMeta[] = [
    // === 创作前 ===
    {
      id: 'brainstorm',
      name: '脑洞喷射',
      category: '创作前',
      description: '基于题材生成多个差异化故事脑洞，支持4种模式（随机/关键词/组合/约束）',
      params: [
        { name: 'genre', type: 'string', required: false, description: '题材：通用/悬疑/都市/玄幻/言情/科幻' },
        { name: 'count', type: 'number', required: false, description: '生成数量（默认5）' },
      ],
      endpoint: '/api/ai/brainstorm',
      hoverDemo: '输入题材 → 8个脑洞卡片依次翻出，带爆点评级🔥',
    },
    {
      id: 'naming',
      name: '书名炼金术',
      category: '创作前',
      description: '基于故事核心信息批量生成爆款书名，含联网查重（即将上线）',
      params: [
        { name: 'storyInfo', type: 'string', required: true, description: '故事核心信息（一句话故事/核心冲突）' },
        { name: 'genre', type: 'string', required: false, description: '题材' },
      ],
      endpoint: '/api/ai/naming',
      hoverDemo: '输入故事核心 → 16个候选书名逐个浮现，标注爆款潜力',
    },
    {
      id: 'outline',
      name: '大纲引擎',
      category: '创作前',
      description: '基于创意碎片生成完整章节大纲，含伏笔台账和情绪曲线（即将上线）',
      params: [
        { name: 'storySeed', type: 'string', required: true, description: '创意碎片/就绪块' },
        { name: 'genre', type: 'string', required: false, description: '题材' },
      ],
      endpoint: '/api/ai/outline',
    },

    // === 创作中 ===
    {
      id: 'continue',
      name: 'AI续写',
      category: '创作中',
      description: '根据前文续写剧情，支持冲突强度和风格控制，≤3章自动黄金三章',
      params: [
        { name: 'context', type: 'string', required: true, description: '前文内容' },
        { name: 'instruction', type: 'string', required: false, description: '额外指令' },
        { name: 'conflictLevel', type: 'string', required: false, description: '冲突强度：L1-L5' },
        { name: 'style', type: 'string', required: false, description: '风格：冷峻白描/快消口语/感官极值' },
        { name: 'chapterIndex', type: 'number', required: false, description: '章节号（≤3启用黄金三章）' },
      ],
      endpoint: '/api/ai/continue',
      hoverDemo: 'hover时一行文字从"他走了过去"慢慢变成一段细节描写',
    },
    {
      id: 'polish',
      name: 'AI润色',
      category: '创作中',
      description: '四级净化体系：词汇替换→句式优化→段落重构→场景适配',
      params: [
        { name: 'text', type: 'string', required: true, description: '原文' },
        { name: 'instruction', type: 'string', required: false, description: '特别要求' },
        { name: 'conflictLevel', type: 'string', required: false, description: '冲突强度：L1-L5' },
        { name: 'style', type: 'string', required: false, description: '风格：冷峻白描/快消口语/感官极值' },
        { name: 'genre', type: 'string', required: false, description: '题材' },
      ],
      endpoint: '/api/ai/polish',
      hoverDemo: 'hover时一行普通文字逐词替换，变成更干净的表达',
    },
    {
      id: 'expand',
      name: 'AI扩写',
      category: '创作中',
      description: '对选中片段进行扩写，增加环境/动作/神态/心理细节，保持原意',
      params: [
        { name: 'text', type: 'string', required: true, description: '原文' },
        { name: 'instruction', type: 'string', required: false, description: '特别要求' },
        { name: 'conflictLevel', type: 'string', required: false, description: '冲突强度：L1-L5' },
        { name: 'style', type: 'string', required: false, description: '风格：冷峻白描/快消口语/感官极值' },
        { name: 'genre', type: 'string', required: false, description: '题材' },
      ],
      endpoint: '/api/ai/expand',
      hoverDemo: 'hover时一行文字慢慢展开为一段，增加细节和感官描写',
    },
    {
      id: 'unblock',
      name: '卡文助手',
      category: '创作中',
      description: '卡文三板斧：环境切入→感官切入→落差对比，三步突破写作瓶颈',
      params: [
        { name: 'method', type: 'string', required: false, description: '方法：environment/sense/contrast' },
      ],
      endpoint: '/api/ai/unblock',
    },

    // === 创作后 ===
    {
      id: 'compliance',
      name: '合规检测',
      category: '创作后',
      description: '8项段落级实时检查 + 23项章末全量自检，含55字生死线、禁用词、动作后解释等',
      params: [
        { name: 'text', type: 'string', required: true, description: '待检测文本' },
        { name: 'checkType', type: 'string', required: false, description: '检测类型：55rule（55字线）/paragraph（段落）/chapter（章末）/polish（精修）' },
        { name: 'genre', type: 'string', required: false, description: '题材（影响55字规则）' },
      ],
      endpoint: '/api/ai/compliance',
      hoverDemo: 'hover时一句话里的违规词慢慢变红，底部浮现检测结果',
    },
    {
      id: 'ending-hint',
      name: '章末收束建议',
      category: '创作后',
      description: '从12种收束类型中推荐2-3种（避开已冷却的），助力章节收尾',
      params: [
        { name: 'coolingEndings', type: 'string[]', required: false, description: '正在冷却的收束类型ID' },
      ],
      endpoint: '/api/ai/ending-hint',
    },
    {
      id: 'a8-status',
      name: 'A-8创作状态',
      category: '创作后',
      description: '每章开始前输出创作状态行：章节/大纲/伏笔/冲突强度/风格/冷却状态',
      params: [
        { name: 'chapter', type: 'number', required: true, description: '章节号' },
        { name: 'conflictLevel', type: 'string', required: false, description: '冲突强度' },
        { name: 'style', type: 'string', required: false, description: '风格' },
      ],
      endpoint: '/api/ai/a8-status',
    },
  ]

  return NextResponse.json({ tools })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '获取工具列表失败' },
      { status: 500 }
    )
  }
}
