import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import IconFont from './IconFont.vue'

describe('iconFont compatibility adapter', () => {
  it.each([
    ['icon-a-arrowleft', 'lucide-arrow-left'],
    ['icon-a-arrowright', 'lucide-arrow-right'],
    ['icon-xinxi', 'lucide-info'],
    ['icon-wancheng-1', 'lucide-circle-check'],
    ['icon-tishi', 'lucide-triangle-alert'],
    ['icon-icon-center-16px', 'lucide-triangle-alert'],
    ['icon-guanbi', 'lucide-x'],
  ])('maps %s to a visible SVG icon', (type, iconClass) => {
    const wrapper = mount(IconFont, { props: { type } })

    expect(wrapper.find(`svg.${iconClass}`).exists()).toBe(true)
    expect(wrapper.find('svg').attributes('aria-hidden')).toBe('true')
  })

  it('keeps caller attributes, color, and spinning behavior on the SVG', () => {
    const wrapper = mount(IconFont, {
      props: { type: 'icon-xinxi', size: 20, color: 'tomato', spin: true },
      attrs: { 'class': 'consumer-icon', 'data-testid': 'legacy-icon' },
    })
    const svg = wrapper.get('svg')

    expect(svg.classes()).toContain('consumer-icon')
    expect(svg.attributes('data-testid')).toBe('legacy-icon')
    expect(svg.attributes('width')).toBe('20')
    expect(svg.attributes('style')).toContain('color: tomato')
    expect(svg.classes()).toContain('animate-spin')
  })

  it('renders a neutral visible fallback for unknown names', () => {
    const wrapper = mount(IconFont, { props: { type: 'icon-not-registered' } })

    expect(wrapper.find('svg.lucide-info').exists()).toBe(true)
    expect(wrapper.get('svg').attributes('data-icon-fallback')).toBe('true')
  })
})

