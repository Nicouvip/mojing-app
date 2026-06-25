// ============================================================
// 墨境提示词模板 — 续写 (continue)
// 版本：v1.1.0
// ============================================================

import type { PromptTemplate } from '../types'

export const continueTemplate: PromptTemplate = {
  id: 'mojing-continue-v1',
  version: '1.0.0',
  name: '续写引擎',
  description: '根据前文内容续写接下来的剧情，严格遵循人物性格、世界观和文风',
  type: 'continue',
  layers: {
    system_iron_rules: '', // 由 builder 动态注入
    function_instruction: `你是专业网文写手。请根据以下前文，续写接下来的剧情。

核心要求：
1. 严格遵循前文的人物性格和说话方式
2. 世界观设定不能偏离前文
3. 文风语调必须与前文一致
4. 剧情承接自然，不突兀不跳脱
5. 如果有用户指令，优先满足用户要求

【震撼开场引擎（前三章自动启用）】
三步结构：
1. 角色困境句：明确主语、关系和当前矛盾
2. 震荡细节句：画面感强烈、反常或细思极恐的细节
3. 悬念出口句：必须继续读下去才能解答的问题

表现技法（至少使用两种）：身份错位/极端处境/情绪反差/失序时间/有限倒计时/禁忌颠覆/具体细节
格式要求：白描，不使用任何修辞手法；快节奏短句，一句一换行；口语化、强情绪；100字左右，三句话讲完更佳`,
    context_injection: `前文内容：
{{context}}

{{instruction}}`,
    output_constraints: `请续写约200-400字。

输出要求：
- 只输出正文内容
- 不要任何多余解释
- 不要标题
- 不要前缀（不要"续写："之类的标记）
- 不要分段过多，每段3-5句为宜

{{ending_hint}}`,
  },
  defaultParams: {
    temperature: 0.8,
    maxTokens: 1024,
  },
  genres: [],
  createdAt: 0,
  updatedAt: 0,
  changelog: [
    'v1.0.0 初始版本 — 从硬编码模板迁移，增加铁律层级和结构化分层',
  ],
}
