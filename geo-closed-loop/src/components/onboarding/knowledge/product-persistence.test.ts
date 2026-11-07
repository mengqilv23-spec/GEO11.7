import type { ProductKnowledgeDraft } from '../../../types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { persistProductDraft } from './product-persistence'

const api = vi.hoisted(() => ({
  addBrandProduct: vi.fn(),
  getBrandProducts: vi.fn(),
  updateBrandProduct: vi.fn(),
}))

vi.mock('../../../api/geo-config', () => api)

const draft: ProductKnowledgeDraft = {
  id: '15',
  name: '建站',
  useCase: '场景 A',
  strengths: '卖点一 · 卖点二',
  customerGroup: '客户一',
  isPrimary: true,
}

describe('persistProductDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates an existing backend product, reloads the list, and returns its canonical record', async () => {
    api.updateBrandProduct.mockResolvedValue(undefined)
    api.getBrandProducts.mockResolvedValue([{ id: 15, lineName: '建站', productName: '建站', usageScene: '场景 A', sellingPoints: ['卖点一', '卖点二'], targetCustomers: ['客户一'], sourceType: 1, isPrimary: 1 }])

    const result = await persistProductDraft(draft)

    expect(api.updateBrandProduct).toHaveBeenCalledWith(15, {
      lineName: '建站',
      productName: '建站',
      usageScene: '场景 A',
      sellingPoints: ['卖点一', '卖点二'],
      targetCustomers: ['客户一'],
      isPrimary: 1,
    })
    expect(api.getBrandProducts).toHaveBeenCalledOnce()
    expect(result.record.id).toBe(15)
    expect(result.draft.id).toBe('15')
  })

  it('creates a new backend product and replaces its temporary id', async () => {
    api.addBrandProduct.mockResolvedValue(27)
    api.getBrandProducts.mockResolvedValue([{ id: 27, lineName: '建站', productName: '建站', usageScene: '场景 A', sellingPoints: ['卖点一', '卖点二'], targetCustomers: ['客户一'], sourceType: 1, isPrimary: 1 }])

    const result = await persistProductDraft({ ...draft, id: 'product-local' })

    expect(api.addBrandProduct).toHaveBeenCalledOnce()
    expect(api.updateBrandProduct).not.toHaveBeenCalled()
    expect(api.getBrandProducts).toHaveBeenCalledOnce()
    expect(result.draft.id).toBe('27')
    expect(result.record.id).toBe(27)
  })

  it('sends an existing draft with a missing backend ID to the update endpoint', async () => {
    api.getBrandProducts.mockResolvedValue([])
    await persistProductDraft({ ...draft, id: 'null' })
    expect(api.addBrandProduct).not.toHaveBeenCalled()
    expect(api.updateBrandProduct).toHaveBeenCalledWith(null, expect.anything())
  })
})

