import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Stepper from './Stepper.vue'

describe('stepper icons', () => {
  it('renders a decorative SVG check for completed steps and keeps step numbers as text', () => {
    const wrapper = mount(Stepper, {
      props: { current: 1, items: ['Brief', '生成与审核', '跨 Agent'] },
    })

    const indicators = wrapper.findAll('.ui-stepper__indicator')
    expect(indicators[0]!.find('svg.lucide-check').exists()).toBe(true)
    expect(indicators[0]!.attributes('aria-hidden')).toBe('true')
    expect(indicators[1]!.text()).toBe('2')
    expect(wrapper.get('[aria-current="step"]').text()).toContain('生成与审核')
  })
})

