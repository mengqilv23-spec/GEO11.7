import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import OperationsReviewStandalone from './OperationsReviewStandalone.vue'

describe('operations review strategy detail', () => {
  it('opens the existing strategy detail content in a drawer from each list row', async () => {
    const wrapper = mount(OperationsReviewStandalone, { attachTo: document.body })

    await wrapper.findAll('.ops-review__tabs button')[2].trigger('click')
    await wrapper.findAll('.ops-strategy-drill-row')[0].trigger('click')

    const drawer = document.querySelector('dialog[aria-labelledby]')
    expect(drawer?.textContent).toContain('策略审核事实')
    expect(drawer?.textContent).toContain('执行结果追溯')
    expect(drawer?.textContent).toContain('GS1')
    expect(drawer?.textContent).not.toContain('收起详情')
    expect(drawer?.querySelector('.ce-drawer-footer')).toBeNull()
    expect(drawer?.querySelectorAll('.ce-drawer-close')).toHaveLength(1)
    expect(wrapper.find('.ops-strategy-detail').element.closest('dialog')).not.toBeNull()

    await wrapper.findAll('.ops-strategy-drill-row')[1].trigger('click')
    expect(document.querySelector('dialog[aria-labelledby]')?.textContent).toContain('GS8')
    wrapper.unmount()
  })
})

