import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import MetricDefinitionButton from './MetricDefinitionButton.vue'

describe('metric definition button', () => {
  it('opens the formula and decision rules when clicked', async () => {
    const wrapper = mount(MetricDefinitionButton, { props: { id: 'recommendation' } })

    await wrapper.get('button').trigger('click')
    await vi.waitFor(() => expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain('品牌推荐率 ='))

    expect(document.body.textContent).toContain('仅统计品牌推荐、产品推荐、品牌比较')
    expect(document.body.querySelector('dialog')).toBeNull()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await vi.waitFor(() => expect(document.body.querySelector('[role="dialog"]')).toBeNull())
    expect(wrapper.get('button').attributes('aria-expanded')).toBe('false')
    wrapper.unmount()
  })
})

