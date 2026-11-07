import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DirectionArrow from './DirectionArrow.vue'

describe('directionArrow', () => {
  it('keeps decorative arrows hidden from assistive technology', () => {
    const wrapper = mount(DirectionArrow, { props: { direction: 'up' } })

    expect(wrapper.find('svg.lucide-arrow-up').exists()).toBe(true)
    expect(wrapper.get('svg').attributes('aria-hidden')).toBe('true')
  })

  it('labels an arrow when it carries trend meaning', () => {
    const wrapper = mount(DirectionArrow, {
      props: { direction: 'down', label: '下降 12%' },
    })

    expect(wrapper.get('svg').attributes('role')).toBe('img')
    expect(wrapper.get('svg').attributes('aria-label')).toBe('下降 12%')
    expect(wrapper.find('svg.lucide-arrow-down').exists()).toBe(true)
  })
})

