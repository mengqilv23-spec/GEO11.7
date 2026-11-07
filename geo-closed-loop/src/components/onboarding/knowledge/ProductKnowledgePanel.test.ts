import type { ProductKnowledgeDraft } from '../../../types'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ProductKnowledgePanel from './ProductKnowledgePanel.vue'

const products: ProductKnowledgeDraft[] = [
  { id: 'existing-1', name: '五轴水刀切割系统', useCase: '航空复材切割', strengths: '五轴切割', customerGroup: '航空制造', isPrimary: true },
]

const recommendation = {
  id: 42,
  lineName: '三轴水刀切割系统',
  productName: '三轴水刀切割系统',
  usageScene: '金属板材 · 石材玻璃 · 通用工业切割',
  sellingPoints: ['通用性高', '成本可控', '易于维护'],
  targetCustomers: ['金属加工厂', '石材加工企业'],
  confidence: 92,
}

describe('productKnowledgePanel AI recommendations', () => {
  it('renders recommendation details and emits the candidate id when accepted', async () => {
    const wrapper = mount(ProductKnowledgePanel, {
      props: {
        modelValue: products,
        errors: {},
        recommendations: [recommendation],
        recommendationsLoaded: true,
      },
    })

    expect(wrapper.text()).toContain('AI推荐产品')
    expect(wrapper.text()).toContain('三轴水刀切割系统')
    expect(wrapper.text()).toContain('通用性高 · 成本可控 · 易于维护')
    expect(wrapper.text()).toContain('金属加工厂 · 石材加工企业')

    await wrapper.get('[data-test="accept-product-42"]').trigger('click')
    expect(wrapper.emitted('acceptRecommendation')).toEqual([[42]])
    wrapper.unmount()
  })

  it('does not render an empty recommendation prompt or generation button', async () => {
    const wrapper = mount(ProductKnowledgePanel, {
      props: { modelValue: products, errors: {}, recommendations: [], recommendationsLoaded: true },
    })

    expect(wrapper.text()).not.toContain('暂无待确认的产品推荐')
    expect(wrapper.find('[data-test="generate-product-recommendations"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('persists product changes before updating the local list', async () => {
    const persistProduct = vi.fn(async (product: ProductKnowledgeDraft) => ({ ...product, name: '已保存产品' }))
    const wrapper = mount(ProductKnowledgePanel, {
      props: { modelValue: products, errors: {}, persistProduct },
    })

    await wrapper.get('.knowledge-entry__actions--top button').trigger('click')
    await wrapper.get('#product-name-existing-1').setValue('已保存产品')
    await wrapper.get('#product-use-existing-1').setValue('航空复材切割')
    await wrapper.get('.knowledge-entry__actions button:last-child').trigger('click')
    await flushPromises()

    expect(persistProduct).toHaveBeenCalledOnce()
    expect(wrapper.emitted('productPersisted')).toEqual([[expect.objectContaining({ name: '已保存产品' })]])
    expect(wrapper.text()).toContain('已保存产品')
    wrapper.unmount()
  })

  it('uses an outlined danger button and calls the delete API before removing a product', async () => {
    const deleteProduct = vi.fn().mockResolvedValue(undefined)
    const wrapper = mount(ProductKnowledgePanel, {
      props: { modelValue: products, errors: {}, deleteProduct },
    })
    const deleteButton = wrapper.findAll('button').find(button => button.text().trim() === '删除')

    expect(deleteButton?.attributes('data-variant')).toBe('outline')
    expect(deleteButton?.attributes('data-tone')).toBe('danger')
    await deleteButton?.trigger('click')
    await flushPromises()

    expect(deleteProduct).toHaveBeenCalledWith('existing-1')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[]])
    wrapper.unmount()
  })

  it('keeps the product visible when backend deletion fails', async () => {
    const deleteProduct = vi.fn().mockRejectedValue(new Error('删除失败'))
    const wrapper = mount(ProductKnowledgePanel, {
      props: { modelValue: products, errors: {}, deleteProduct },
    })

    await wrapper.findAll('button').find(button => button.text().trim() === '删除')?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('删除失败')
    expect(wrapper.text()).toContain('五轴水刀切割系统')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    wrapper.unmount()
  })
})

