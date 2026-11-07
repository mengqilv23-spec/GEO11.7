import type { CompetitorKnowledgeDraft } from '../../../types'

export function buildCompetitorSummary(competitors: readonly Pick<CompetitorKnowledgeDraft, 'name'>[], limit?: number | null): string {
  const names = competitors.map(item => item.name.trim()).filter(Boolean)
  const count = competitors.length
  const namesText = names.length ? ` · ${names.join('、')}` : ''
  const limitText = limit === null || limit === undefined ? ' · 套餐上限未返回' : ` · 最多 ${limit} 个`
  return `已选择 ${count} 个${namesText}${limitText}`
}

