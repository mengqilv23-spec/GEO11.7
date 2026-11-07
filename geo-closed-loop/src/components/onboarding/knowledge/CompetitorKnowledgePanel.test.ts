import type { CompetitorKnowledgeDraft } from '../../../types'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import CompetitorKnowledgePanel from './CompetitorKnowledgePanel.vue'

const competitors: CompetitorKnowledgeDraft[] = [
  { id: '15', name: 'Wix', domain: 'www.wix.com', alias: 'Wix.com', description: 'Website platform', confirmed: true },
]

describe('competitorKnowledgePanel persistence', () => {
  it('shows the competitor limit returned by the active plan', () => {
    const wrapper = mount(CompetitorKnowledgePanel, {
      props: { modelValue: competitors, errors: {}, competitorCountLimit: 5 },
    })

    expect(wrapper.text()).toContain('已选择 1 个 / 最多 5 个')
    wrapper.unmount()
  })

  it('assigns stable varied monogram colors to competitors and their recommendations', () => {
    const wrapper = mount(CompetitorKnowledgePanel, {
      props: {
        modelValue: [
          ...competitors,
          { id: '16', name: 'Shopify', domain: 'shopify.com', alias: '', description: '', confirmed: true },
        ],
        errors: {},
        recommendations: [{ id: 15, competitorName: 'Wix', domain: 'www.wix.com', aliasNames: 'Wix.com', competitorDesc: '' }],
      },
    })
    const monograms = wrapper.findAll('.competitor-monogram')

    expect(monograms).toHaveLength(3)
    expect(monograms[0]?.classes().find(className => className.startsWith('competitor-monogram--'))).toBe('competitor-monogram--violet')
    expect(monograms[1]?.classes().find(className => className.startsWith('competitor-monogram--'))).toBe('competitor-monogram--cyan')
    expect(monograms[2]?.classes().find(className => className.startsWith('competitor-monogram--'))).toBe('competitor-monogram--violet')
    wrapper.unmount()
  })

  it('persists an edited competitor before updating the local list', async () => {
    const persistCompetitor = vi.fn(async (competitor: CompetitorKnowledgeDraft) => ({ ...competitor, name: 'Wix updated' }))
    const wrapper = mount(CompetitorKnowledgePanel, {
      props: { modelValue: competitors, errors: {}, persistCompetitor },
    })

    await wrapper.findAll('button').find(button => button.text() === '编辑')?.trigger('click')
    await wrapper.get('#competitor-name-15').setValue('Wix updated')
    await wrapper.get('#competitor-domain-15').setValue('www.wix.com')
    await wrapper.findAll('button').find(button => button.text() === '保存修改')?.trigger('click')
    await flushPromises()

    expect(persistCompetitor).toHaveBeenCalledOnce()
    expect(wrapper.emitted('competitorPersisted')).toEqual([[expect.objectContaining({ name: 'Wix updated' })]])
    expect(wrapper.text()).toContain('Wix updated')
    wrapper.unmount()
  })

  it('calls the delete API before removing a competitor', async () => {
    const deleteCompetitor = vi.fn().mockResolvedValue(undefined)
    const wrapper = mount(CompetitorKnowledgePanel, {
      props: { modelValue: competitors, errors: {}, deleteCompetitor },
    })
    const deleteButton = wrapper.findAll('button').find(button => button.text().trim() === '删除')

    expect(deleteButton?.attributes('data-variant')).toBe('outline')
    expect(deleteButton?.attributes('data-tone')).toBe('danger')
    await deleteButton?.trigger('click')
    await flushPromises()

    expect(deleteCompetitor).toHaveBeenCalledWith('15')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[]])
    wrapper.unmount()
  })

  it('keeps a competitor visible and shows the API error when deletion fails', async () => {
    const deleteCompetitor = vi.fn().mockRejectedValue(new Error('删除失败'))
    const wrapper = mount(CompetitorKnowledgePanel, {
      props: { modelValue: competitors, errors: {}, deleteCompetitor },
    })

    await wrapper.findAll('button').find(button => button.text().trim() === '删除')?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('删除失败')
    expect(wrapper.text()).toContain('Wix')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    wrapper.unmount()
  })
})

