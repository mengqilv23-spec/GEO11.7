import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Alert from './Alert.vue'

describe('alert icon compatibility', () => {
  it('renders a tone-appropriate SVG without changing its variant', () => {
    const wrapper = mount(Alert, {
      props: { variant: 'warning', open: true },
      slots: { default: '需要复核' },
    })

    expect(wrapper.get('.ce-alert').attributes('data-variant')).toBe('warning')
    expect(wrapper.find('svg.lucide-triangle-alert').exists()).toBe(true)
  })

  it('keeps a close icon keyboard-accessible and labelled', () => {
    const wrapper = mount(Alert, {
      props: { open: true, closeLabel: '关闭提示' },
      attrs: { onClose: () => {} },
      slots: { default: '内容' },
    })
    const closeIcon = wrapper.get('svg[aria-label="关闭提示"]')

    expect(closeIcon.attributes('role')).toBe('button')
    expect(closeIcon.attributes('tabindex')).toBe('0')
  })
})

