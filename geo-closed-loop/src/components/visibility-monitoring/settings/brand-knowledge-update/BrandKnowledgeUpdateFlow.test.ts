import type { KnowledgeItem } from '../../../../types'
import type { BrandKnowledgeUpdateService, BrandKnowledgeUpdateSnapshot } from './types'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import KnowledgeEditorDialog from '../../../onboarding/knowledge/KnowledgeEditorDialog.vue'
import BrandKnowledgeChangeConfirm from './BrandKnowledgeChangeConfirm.vue'
import BrandKnowledgeUpdateFlow from './BrandKnowledgeUpdateFlow.vue'
import MarketRecommendationListDialog from './MarketRecommendationListDialog.vue'

const items: KnowledgeItem[] = [
  { id: 'brand', index: '01', title: '品牌信息', summary: '', requirements: '', brand: { name: 'APW', alias: 'APW Waterjet', website: 'apw.com', industry: '工业制造', description: '工业水刀切割系统品牌' } },
  { id: 'product', index: '02', title: '核心产品', summary: '', requirements: '', products: [{ id: 'p1', name: '五轴水刀', useCase: '航空复材切割', strengths: '五轴切割', customerGroup: '航空制造', isPrimary: true }] },
  { id: 'market', index: '03', title: '市场与语言', summary: '', requirements: '', marketLanguage: { market: '德国', language: '德语' } },
  { id: 'competitor', index: '04', title: '竞争对手', summary: '', requirements: '', competitors: [{ id: 'c1', name: 'Flow', domain: 'flowwaterjet.com', alias: 'Flow', description: '工业水刀品牌', confirmed: true }] },
]
const changedItems = items.map(item => item.id === 'brand' ? { ...item, brand: { ...item.brand!, name: 'APW Updated' } } : item)
const snapshot: BrandKnowledgeUpdateSnapshot = { demo: true, editQuota: { total: 3, remaining: 1 }, knowledgeItems: changedItems, markets: [] }

function createService(overrides: Partial<BrandKnowledgeUpdateService> = {}): BrandKnowledgeUpdateService {
  return {
    getSnapshot: vi.fn().mockResolvedValue(snapshot),
    previewChange: vi.fn().mockResolvedValue({ activeMarketCount: 2, editCost: 1, remainingEdits: 1, quotaAvailable: true }),
    confirmChange: vi.fn().mockResolvedValue(snapshot),
    saveMarketSelection: vi.fn().mockResolvedValue(snapshot),
    enableAllMarkets: vi.fn().mockResolvedValue(snapshot),
    ...overrides,
  }
}

async function mountFlow(service = createService()) {
  const wrapper = mount(BrandKnowledgeUpdateFlow, { props: { open: false, items, initialTab: 'brand', service } })
  await wrapper.setProps({ open: true })
  await flushPromises()
  return wrapper
}

describe('brandKnowledgeUpdateFlow', () => {
  it('previews before confirmation and cancellation preserves the editor draft without mutation', async () => {
    const service = createService()
    const wrapper = await mountFlow(service)
    wrapper.findComponent(KnowledgeEditorDialog).vm.$emit('saved', changedItems)
    await flushPromises()

    expect(service.previewChange).toHaveBeenCalledWith(changedItems)
    expect(service.confirmChange).not.toHaveBeenCalled()
    wrapper.findComponent(BrandKnowledgeChangeConfirm).vm.$emit('back')
    expect(wrapper.findComponent(KnowledgeEditorDialog).props('open')).toBe(true)
    expect(service.confirmChange).not.toHaveBeenCalled()

    wrapper.findComponent(KnowledgeEditorDialog).vm.$emit('saved', changedItems)
    await flushPromises()
    wrapper.findComponent(BrandKnowledgeChangeConfirm).vm.$emit('confirm')
    await flushPromises()
    expect(service.confirmChange).toHaveBeenCalledWith(changedItems)
    wrapper.unmount()
  })

  it('commits knowledge once only after confirmation and then opens market handling', async () => {
    const service = createService()
    const wrapper = await mountFlow(service)
    wrapper.findComponent(KnowledgeEditorDialog).vm.$emit('saved', changedItems)
    await flushPromises()
    wrapper.findComponent(BrandKnowledgeChangeConfirm).vm.$emit('confirm')
    await flushPromises()

    expect(wrapper.emitted('knowledgeCommitted')?.[0]?.[0]).toEqual(changedItems)
    expect(wrapper.emitted('knowledgeCommitted')?.[0]?.[1]).toEqual(snapshot)
    expect(wrapper.findComponent(MarketRecommendationListDialog).props('open')).toBe(true)
    expect(wrapper.emitted('update:open')).toBeUndefined()
    wrapper.unmount()
  })

  it('keeps confirmation retryable after failure and ignores duplicate submissions', async () => {
    let rejectConfirmation: ((error: Error) => void) | undefined
    const confirmChange = vi.fn().mockImplementation(() => new Promise<BrandKnowledgeUpdateSnapshot>((_resolve, reject) => {
      rejectConfirmation = reject
    }))
    const service = createService({ confirmChange })
    const wrapper = await mountFlow(service)
    wrapper.findComponent(KnowledgeEditorDialog).vm.$emit('saved', changedItems)
    await flushPromises()
    const confirmation = wrapper.findComponent(BrandKnowledgeChangeConfirm)
    confirmation.vm.$emit('confirm')
    confirmation.vm.$emit('confirm')
    expect(confirmChange).toHaveBeenCalledTimes(1)
    rejectConfirmation?.(new Error('服务暂不可用'))
    await flushPromises()
    expect(confirmation.props('open')).toBe(true)
    expect(wrapper.text()).toContain('服务暂不可用')
    wrapper.unmount()
  })

  it('reloads the service snapshot when retry is requested from the market list', async () => {
    const service = createService()
    const wrapper = await mountFlow(service)
    wrapper.findComponent(KnowledgeEditorDialog).vm.$emit('saved', changedItems)
    await flushPromises()
    wrapper.findComponent(BrandKnowledgeChangeConfirm).vm.$emit('confirm')
    await flushPromises()
    wrapper.findComponent(MarketRecommendationListDialog).vm.$emit('retry')
    await flushPromises()
    expect(service.getSnapshot).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })
})

