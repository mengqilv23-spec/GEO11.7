import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppIcon from './AppIcon.vue'

describe('appIcon', () => {
  it('renders the requested semantic icon with consistent defaults', () => {
    const wrapper = mount(AppIcon, { props: { name: 'info' } })
    const svg = wrapper.get('svg')

    expect(svg.attributes('width')).toBe('18')
    expect(svg.attributes('height')).toBe('18')
    expect(svg.attributes('stroke-width')).toBe('2')
    expect(svg.attributes('stroke')).toBe('currentColor')
    expect(svg.attributes('aria-hidden')).toBe('true')
  })

  it('accepts a custom size and stroke width', () => {
    const wrapper = mount(AppIcon, {
      props: { name: 'info', size: 24, strokeWidth: 1.5 },
    })

    expect(wrapper.get('svg').attributes('width')).toBe('24')
    expect(wrapper.get('svg').attributes('stroke-width')).toBe('1.5')
  })

  it('preserves CSS variable sizes used by shared controls', () => {
    const wrapper = mount(AppIcon, {
      props: { name: 'info', size: 'var(--button-icon-size)' },
    })

    expect(wrapper.get('svg').attributes('width')).toBe('var(--button-icon-size)')
    expect(wrapper.get('svg').attributes('height')).toBe('var(--button-icon-size)')
  })

  it('labels an icon when it conveys meaning without visible text', () => {
    const wrapper = mount(AppIcon, {
      props: { name: 'info', ariaLabel: '更多信息' },
    })

    expect(wrapper.get('svg').attributes('role')).toBe('img')
    expect(wrapper.get('svg').attributes('aria-label')).toBe('更多信息')
    expect(wrapper.get('svg').attributes('aria-hidden')).toBeUndefined()
  })
})

