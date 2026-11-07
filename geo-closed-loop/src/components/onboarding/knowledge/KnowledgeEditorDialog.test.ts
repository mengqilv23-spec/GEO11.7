import type { KnowledgeItem } from '../../../types'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import KnowledgeEditorDialog from './KnowledgeEditorDialog.vue'

const api = vi.hoisted(() => ({
  confirmRecommendation: vi.fn(),
  generateCompetitorCandidates: vi.fn(),
  generateProductCandidates: vi.fn(),
  getMarketCompetitors: vi.fn(),
  getRecommendationItems: vi.fn(),
}))

vi.mock('../../../api/geo-config', () => api)

const items: KnowledgeItem[] = [
  { id: 'brand', index: '01', title: '品牌信息', summary: '', requirements: '', brand: { name: 'APW', alias: 'APW Waterjet', website: 'apw.com', industry: '工业制造', description: '工业水刀切割系统品牌' } },
  { id: 'product', index: '02', title: '核心产品', summary: '', requirements: '', products: [{ id: 'p1', name: '五轴水刀', useCase: '航空复材切割', strengths: '五轴切割', customerGroup: '航空制造', isPrimary: true }] },
  { id: 'market', index: '03', title: '市场与语言', summary: '', requirements: '', marketLanguage: { market: '德国', language: '德语' } },
  { id: 'competitor', index: '04', title: '竞争对手', summary: '', requirements: '', competitors: [{ id: 'c1', name: 'Flow', domain: 'flowwaterjet.com', alias: 'Flow', description: '工业水刀品牌', confirmed: true }] },
]

async function save(wrapper: ReturnType<typeof mount>) {
  const button = wrapper.findAll('button').find(item => item.text().trim() === '保存')
  if (!button)
    throw new Error('保存按钮未找到')
  await button.trigger('click')
}

async function mountOpen(closeOnSave?: boolean, initialTab = 'brand', competitorCountLimit?: number | null, footerMode?: 'all-tabs' | 'brand-only') {
  const wrapper = mount(KnowledgeEditorDialog, { props: { open: false, items, initialTab, closeOnSave, competitorCountLimit, footerMode } })
  await wrapper.setProps({ open: true })
  return wrapper
}

describe('knowledgeEditorDialog controlled save behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getRecommendationItems.mockResolvedValue([])
    api.getMarketCompetitors.mockResolvedValue([])
    api.generateCompetitorCandidates.mockResolvedValue(undefined)
    api.generateProductCandidates.mockResolvedValue(undefined)
    api.confirmRecommendation.mockResolvedValue(99)
  })

  it('keeps the editor and draft open when closeOnSave is false', async () => {
    const wrapper = await mountOpen(false)
    await save(wrapper)
    expect(wrapper.emitted('saved')).toHaveLength(1)
    expect(wrapper.emitted('update:open')).toBeUndefined()
    expect(wrapper.get<HTMLInputElement>('#brand-name').element.value).toBe('APW')
    wrapper.unmount()
  })

  it('closes the brand-only editor after a successful save even when closeOnSave is false', async () => {
    const persistKnowledge = vi.fn().mockResolvedValue(undefined)
    const wrapper = await mountOpen(false, 'brand', undefined, 'brand-only')
    await wrapper.setProps({ persistKnowledge })

    await save(wrapper)
    await flushPromises()

    expect(persistKnowledge).toHaveBeenCalledOnce()
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
    wrapper.unmount()
  })

  it('preserves the existing close-after-save default', async () => {
    const wrapper = await mountOpen()
    await save(wrapper)
    expect(wrapper.emitted('saved')).toHaveLength(1)
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
    wrapper.unmount()
  })

  it('persists editable knowledge before closing the modal', async () => {
    const persistKnowledge = vi.fn().mockResolvedValue(undefined)
    const wrapper = mount(KnowledgeEditorDialog, { props: { open: false, items, initialTab: 'brand', persistKnowledge, competitorCountLimit: 5 } })
    await wrapper.setProps({ open: true })

    await save(wrapper)
    await flushPromises()
    await nextTick()

    expect(persistKnowledge).toHaveBeenCalledOnce()
    expect(persistKnowledge).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 'brand' })]))
    expect(persistKnowledge).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 'product', summary: '五轴水刀 · 航空复材切割' })]))
    expect(persistKnowledge).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 'competitor', summary: '已选择 1 个 · Flow · 最多 5 个' })]))
    expect(wrapper.emitted('saved')).toHaveLength(1)
    wrapper.unmount()
  })

  it('keeps the modal open and shows the API error when persistence fails', async () => {
    const persistKnowledge = vi.fn().mockRejectedValue(new Error('保存失败'))
    const wrapper = mount(KnowledgeEditorDialog, { props: { open: false, items, initialTab: 'brand', persistKnowledge } })
    await wrapper.setProps({ open: true })

    await save(wrapper)
    await flushPromises()

    expect(persistKnowledge).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('保存失败')
    expect(wrapper.emitted('update:open')).toBeUndefined()
    wrapper.unmount()
  })

  it('does not expose the site-managed brand website as an editable field', async () => {
    const wrapper = await mountOpen()
    expect(wrapper.find('#brand-website').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('品牌官网')
    wrapper.unmount()
  })

  it('shows the plan competitor limit in the selected count', async () => {
    const wrapper = await mountOpen(undefined, 'competitor', 5)
    expect(wrapper.text()).toContain('已选择 1 个 / 最多 5 个')
    wrapper.unmount()
  })

  it('shows only a save action on the brand tab and no footer on other tabs', async () => {
    const wrapper = await mountOpen(undefined, 'brand', undefined, 'brand-only')

    expect(wrapper.find('.ce-modal-footer').exists()).toBe(true)
    expect(wrapper.findAll('.ce-modal-footer button').map(button => button.text().trim())).toEqual(['保存'])

    await wrapper.get('#knowledge-tab-product').trigger('click')
    expect(wrapper.find('.ce-modal-footer').exists()).toBe(false)
    await wrapper.get('#knowledge-tab-market').trigger('click')
    expect(wrapper.find('.ce-modal-footer').exists()).toBe(false)
    await wrapper.get('#knowledge-tab-competitor').trigger('click')
    expect(wrapper.find('.ce-modal-footer').exists()).toBe(false)
    wrapper.unmount()
  })

  it('loads product candidates and adds a confirmed candidate to the product draft', async () => {
    api.getRecommendationItems.mockResolvedValue([{
      id: 42,
      itemPayload: JSON.stringify({
        lineName: '三轴水刀切割系统',
        productName: '三轴水刀切割系统',
        usageScene: '金属板材切割',
        sellingPoints: ['成本可控', '易于维护'],
        targetCustomers: ['金属加工厂'],
        sourceType: 2,
      }),
    }])
    const wrapper = await mountOpen(undefined, 'product')
    await flushPromises()

    expect(api.getRecommendationItems).toHaveBeenCalledWith({ recommendType: 2, itemStatus: 1 })
    expect(wrapper.text()).toContain('三轴水刀切割系统')
    await wrapper.get('[data-test="accept-product-42"]').trigger('click')
    await flushPromises()

    expect(api.confirmRecommendation).toHaveBeenCalledWith(42)
    expect(wrapper.emitted('productAccepted')?.[0]).toEqual([expect.objectContaining({
      id: 99,
      productName: '三轴水刀切割系统',
      sourceType: 3,
    })])
    expect(wrapper.text()).toContain('金属板材切割')
    wrapper.unmount()
  })

  it('shows a mock AI product recommendation when no pending product candidates are available', async () => {
    api.getRecommendationItems.mockResolvedValue([])
    const wrapper = await mountOpen(undefined, 'product')
    await flushPromises()
    expect(wrapper.text()).toContain('AI推荐产品')
    expect(wrapper.text()).toContain('APW 三轴水刀切割系统')
    expect(wrapper.text()).toContain('切割精度稳定 · 支持多种材料 · 维护成本可控')
    expect(wrapper.get('.product-recommendations').text()).not.toContain('基于品牌、产品、使用场景与目标市场生成')
    expect(wrapper.find('[data-test="generate-product-recommendations"]').exists()).toBe(false)

    await wrapper.get('[data-test="accept-product--2026"]').trigger('click')
    await flushPromises()

    expect(api.confirmRecommendation).not.toHaveBeenCalled()
    expect(wrapper.emitted('productAccepted')?.[0]).toEqual([expect.objectContaining({
      productName: 'APW 三轴水刀切割系统',
      usageScene: '金属板材、石材与玻璃的通用切割',
      sourceType: 3,
    })])
    expect(wrapper.text()).toContain('APW 三轴水刀切割系统')
    wrapper.unmount()
  })

  it('loads and confirms AI competitor recommendations', async () => {
    api.getRecommendationItems.mockResolvedValue([{
      id: 64,
      itemPayload: JSON.stringify({ competitorName: 'OMAX', domain: 'omax.com', aliasNames: 'OMAX Waterjet' }),
    }])
    api.confirmRecommendation.mockResolvedValue(72)
    api.getMarketCompetitors.mockResolvedValue([{ id: 72, competitorName: 'OMAX', domain: 'omax.com', aliasNames: 'OMAX Waterjet', competitorDesc: null, isCoreSov: 0, sourceType: 3, status: 1 }])
    const wrapper = await mountOpen(undefined, 'competitor')
    await flushPromises()

    expect(api.getRecommendationItems).toHaveBeenCalledWith({ recommendType: 3, itemStatus: 1 })
    expect(wrapper.text()).toContain('AI 推荐竞品')
    expect(wrapper.text()).toContain('OMAX')
    await wrapper.get('[data-test="accept-competitor-64"]').trigger('click')
    await flushPromises()

    expect(api.confirmRecommendation).toHaveBeenCalledWith(64)
    expect(api.getMarketCompetitors).toHaveBeenCalledOnce()
    expect(wrapper.emitted('competitorAccepted')?.[0]).toEqual([expect.objectContaining({ id: 72, competitorName: 'OMAX' })])
    expect(wrapper.text()).toContain('OMAX')
    wrapper.unmount()
  })
})

