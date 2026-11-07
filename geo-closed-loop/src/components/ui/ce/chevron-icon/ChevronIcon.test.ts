import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ChevronIcon from './ChevronIcon.vue'

describe('chevronIcon', () => {
  it.each([
    ['left', 'lucide-chevron-left'],
    ['right', 'lucide-chevron-right'],
    ['down', 'lucide-chevron-down'],
  ] as const)('renders the %s direction as a decorative SVG', (direction, iconClass) => {
    const wrapper = mount(ChevronIcon, { props: { direction, size: 20 } })

    expect(wrapper.find(`svg.${iconClass}`).exists()).toBe(true)
    expect(wrapper.get('svg').attributes('width')).toBe('20')
    expect(wrapper.get('svg').attributes('aria-hidden')).toBe('true')
  })
})

