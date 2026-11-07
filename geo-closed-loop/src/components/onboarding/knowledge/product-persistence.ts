import type { BrandProductRecord } from '../../../api/geo-config'
import type { ProductKnowledgeDraft } from '../../../types'
import { addBrandProduct, getBrandProducts, updateBrandProduct } from '../../../api/geo-config'

function splitList(value: string) {
  return value.split(/[·,，]/).map(item => item.trim()).filter(Boolean)
}

function toRecord(draft: ProductKnowledgeDraft, id: number | null): BrandProductRecord {
  return {
    id,
    lineName: draft.name,
    productName: draft.name,
    usageScene: draft.useCase,
    sellingPoints: splitList(draft.strengths),
    targetCustomers: splitList(draft.customerGroup),
    sourceType: 1,
    isPrimary: draft.isPrimary ? 1 : 0,
  }
}

function toDraft(record: BrandProductRecord): ProductKnowledgeDraft {
  return {
    id: String(record.id),
    name: record.productName || record.lineName,
    useCase: record.usageScene,
    strengths: record.sellingPoints?.join(' · ') ?? '',
    customerGroup: record.targetCustomers?.join(' · ') ?? '',
    isPrimary: record.isPrimary === 1,
  }
}

export async function persistProductDraft(draft: ProductKnowledgeDraft): Promise<{ draft: ProductKnowledgeDraft, record: BrandProductRecord }> {
  const id = Number(draft.id)
  const hasBackendId = Number.isSafeInteger(id) && id > 0
  const isNewDraft = draft.id.startsWith('product-')
  const input = {
    lineName: draft.name,
    productName: draft.name,
    usageScene: draft.useCase,
    sellingPoints: splitList(draft.strengths),
    targetCustomers: splitList(draft.customerGroup),
    isPrimary: draft.isPrimary ? 1 : 0,
  }
  const productId = hasBackendId ? id : isNewDraft ? await addBrandProduct(input) : draft.id === 'null' ? null : id
  if (!isNewDraft && !hasBackendId)
    await updateBrandProduct(productId as number, input)
  else if (hasBackendId)
    await updateBrandProduct(productId as number, input)

  const records = await getBrandProducts()
  const record = records.find(item => item.id === productId) ?? toRecord(draft, productId)
  return { draft: toDraft(record), record }
}

