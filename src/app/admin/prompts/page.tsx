import { registry } from '@/lib/prompts'
import { TemplateCard } from './card'
import { StatsPanel } from './stats-panel'
import { ABPanel } from './ab-panel'

export default function PromptsPage() {
  const templates = registry.listActive()

  const typeLabel: Record<string, string> = {
    continue: '续写',
    polish: '润色',
    expand: '扩写',
    brainstorm: '脑洞喷射',
  }

  const typeOrder = ['continue', 'polish', 'expand', 'brainstorm']
  const sorted = [...templates].sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">提示词管理中心</h1>
        <p className="text-sm text-muted-foreground mt-1">
          管理 AI 提示词模板、查看效果数据、运行 A/B 实验。共 {templates.length} 个活跃模板。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 模板列表 — 占 2/3 */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            📄 模板列表
          </h2>
          {sorted.map(t => (
            <TemplateCard key={t.id} template={t} typeLabel={typeLabel[t.type] || t.type} />
          ))}
        </div>

        {/* 右侧面板 */}
        <div className="space-y-6">
          <StatsPanel />
          <ABPanel />
        </div>
      </div>
    </div>
  )
}
