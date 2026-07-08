import {
  A_CLASS_PATTERNS, A_CLASS_DESCRIPTION,
  B_CLASS_WORDS, B_CLASS_DESCRIPTION,
  C_CLASS_WORDS, C_CLASS_DESCRIPTION,
  D_CLASS_WORDS, D_CLASS_DESCRIPTION,
  AI_FREQ_CLASS_1, AI_FREQ_CLASS_2, AI_FREQ_CLASS_3, AI_FREQ_CLASS_5,
  EXPLANATION_WORDS, EXPLANATION_DESCRIPTION,
  BODY_ACTION_WORDS, BODY_DESCRIPTION,
  REFINED_WORD_INDICATORS, REFINED_DESCRIPTION,
} from '@/lib/prompts/compliance-sync'
import { ComplianceSection } from './section'

export default function CompliancePage() {
  const sections = [
    { label: 'A类 · 递进判断句', description: A_CLASS_DESCRIPTION, items: A_CLASS_PATTERNS.map(p => p.source), color: 'red' },
    { label: 'B类 · 弱化词', description: B_CLASS_DESCRIPTION, items: B_CLASS_WORDS as readonly string[], count: B_CLASS_WORDS.length, color: 'amber' },
    { label: 'C类 · 连接词', description: C_CLASS_DESCRIPTION, items: C_CLASS_WORDS as readonly string[], color: 'green' },
    { label: 'D类 · AI高频词', description: D_CLASS_DESCRIPTION, items: D_CLASS_WORDS as readonly string[], count: D_CLASS_WORDS.length, color: 'violet' },
    { label: 'AI高频词 · 第一类（实词，全章≤3次）', description: '', items: AI_FREQ_CLASS_1 as readonly string[], count: AI_FREQ_CLASS_1.length, color: 'orange' },
    { label: 'AI高频词 · 第二类（应删除）', description: '', items: AI_FREQ_CLASS_2 as readonly string[], count: AI_FREQ_CLASS_2.length, color: 'orange' },
    { label: 'AI高频词 · 第三类（应替换）', description: '', items: AI_FREQ_CLASS_3 as readonly string[], count: AI_FREQ_CLASS_3.length, color: 'orange' },
    { label: 'AI高频词 · 第五类（章末处理）', description: '', items: AI_FREQ_CLASS_5 as readonly string[], count: AI_FREQ_CLASS_5.length, color: 'orange' },
    { label: '解释词 · 动作后解释', description: EXPLANATION_DESCRIPTION, items: EXPLANATION_WORDS as readonly string[], count: EXPLANATION_WORDS.length, color: 'emerald' },
    { label: '身体动作词', description: BODY_DESCRIPTION, items: BODY_ACTION_WORDS as readonly string[], count: BODY_ACTION_WORDS.length, color: 'teal' },
    { label: '精致句指示词', description: REFINED_DESCRIPTION, items: REFINED_WORD_INDICATORS as readonly string[], count: REFINED_WORD_INDICATORS.length, color: 'rose' },
  ]

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">合规规则配置</h1>
        <p className="text-sm text-muted-foreground mt-1">
          写作合规检测规则。共 {sections.length} 类规则，当前为只读展示。
        </p>
      </div>

      <div className="space-y-3">
        {sections.map((s, i) => (
          <ComplianceSection key={i} {...s} />
        ))}
      </div>
    </div>
  )
}
