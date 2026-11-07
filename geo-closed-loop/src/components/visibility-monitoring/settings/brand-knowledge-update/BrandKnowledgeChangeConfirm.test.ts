import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BrandKnowledgeChangeConfirm from './BrandKnowledgeChangeConfirm.vue'

const impact = { activeMarketCount: 2, editCost: 1, remainingEdits: 0, quotaAvailable: true }

describe('brandKnowledgeChangeConfirm', () => {
  it('shows the service-provided impact and emits return or confirm actions', async () => {
    const wrapper = mount(BrandKnowledgeChangeConfirm, { props: { open: true, impact, pending: false } })
    expect(wrapper.findAll('.change-confirm__summary > div')).toHaveLength(4)
    expect(wrapper.get('.change-confirm__summary').text()).toContain('影响范围全部已启用市场（2 个），确认后统一暂停')
    expect(wrapper.get('.change-confirm__summary').text()).toContain('本次修改将扣除 1 次品牌信息修改次数，确认后剩余 0 次')
    expect(wrapper.get('.change-confirm__summary').text()).toContain('后续处理到各市场的监测问题列表中选择加入推荐问题，或移出旧问题；未调整的市场保留现有问题。完成后可统一开启全部市场。')
    expect(wrapper.get('.change-confirm__summary').text()).toContain('数据对比新旧口径不做环比。')
    expect(wrapper.findAll('.ce-modal-footer button').map(button => button.attributes('data-size'))).toEqual(['md', 'md'])

    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('back')).toHaveLength(1)
    await wrapper.get('button.is-primary').trigger('click')
    expect(wrapper.emitted('confirm')).toHaveLength(1)
    wrapper.unmount()
  })

  it('prevents confirmation when quota is unavailable and while submitting', () => {
    const wrapper = mount(BrandKnowledgeChangeConfirm, { props: { open: true, impact: { ...impact, quotaAvailable: false }, pending: false } })
    expect(wrapper.text()).toContain('修改次数不足')
    expect(wrapper.get('button.is-primary').attributes('disabled')).toBeDefined()
    wrapper.setProps({ impact, pending: true })
    expect(wrapper.get('button.is-primary').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })
})

