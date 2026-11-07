import type { KnowledgeItem } from '../../../types'

export type KnowledgeTab = 'brand' | 'product' | 'market' | 'competitor'

export interface KnowledgeValidationResult {
  tab: KnowledgeTab
  errors: Record<string, string>
}

export function validateKnowledgeItems(items: readonly KnowledgeItem[]): KnowledgeValidationResult | null {
  const byId = new Map(items.map(item => [item.id, item]))
  const brand = byId.get('brand')?.brand
  const brandErrors: Record<string, string> = {}
  if (!brand?.name.trim())
    brandErrors.name = '请输入品牌名称'
  if (!brand?.industry.trim())
    brandErrors.industry = '请输入主营行业'
  if (!brand?.description.trim())
    brandErrors.description = '请输入品牌定位 / 品牌描述'
  if (Object.keys(brandErrors).length)
    return { tab: 'brand', errors: brandErrors }

  const products = byId.get('product')?.products ?? []
  if (!products.length)
    return { tab: 'product', errors: { products: '至少添加 1 条核心产品' } }
  const productErrors: Record<string, string> = {}
  for (const product of products) {
    if (!product.name.trim())
      productErrors[`product.${product.id}.name`] = '请输入核心产品'
    if (!product.useCase.trim())
      productErrors[`product.${product.id}.useCase`] = '请输入使用场景'
  }
  if (Object.keys(productErrors).length)
    return { tab: 'product', errors: productErrors }

  const market = byId.get('market')?.marketLanguage
  const marketErrors: Record<string, string> = {}
  if (!market?.market.trim())
    marketErrors.market = '请选择目标市场'
  if (!market?.language.trim())
    marketErrors.language = '请选择语言'
  if (Object.keys(marketErrors).length)
    return { tab: 'market', errors: marketErrors }

  const competitors = byId.get('competitor')?.competitors ?? []
  if (!competitors.length)
    return { tab: 'competitor', errors: { competitors: '至少添加 1 个竞品' } }
  const competitorErrors: Record<string, string> = {}
  for (const competitor of competitors) {
    if (!competitor.name.trim())
      competitorErrors[`competitor.${competitor.id}.name`] = '请输入竞品名称'
    if (!competitor.domain.trim())
      competitorErrors[`competitor.${competitor.id}.domain`] = '请输入竞品域名'
  }
  if (Object.keys(competitorErrors).length)
    return { tab: 'competitor', errors: competitorErrors }
  return null
}

