import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Button from './Button.vue'

describe('button icon compatibility', () => {
  it('keeps the visible label and accessible name beside its SVG icon', () => {
    const wrapper = mount(Button, {
      props: { iconType: 'icon-a-arrowleft' },
      attrs: { 'aria-label': '返回上一步' },
      slots: { default: '返回' },
    })

    expect(wrapper.get('button').text()).toContain('返回')
    expect(wrapper.get('button').attributes('aria-label')).toBe('返回上一步')
    expect(wrapper.find('svg.lucide-arrow-left').exists()).toBe(true)
  })

  it('keeps the original label visible and places the loading indicator before it', () => {
    const wrapper = mount(Button, {
      props: { loading: true },
      slots: { default: '保存' },
    })
    const content = wrapper.get('.ce-button__content')

    expect(wrapper.get('button').text()).toContain('保存')
    expect(content.element.firstElementChild?.classList.contains('ce-button__spinner')).toBe(true)
    expect(wrapper.get('button').attributes('aria-busy')).toBe('true')
  })
})

