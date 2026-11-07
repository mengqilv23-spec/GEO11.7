import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import CadenceSelector from './CadenceSelector.vue'

describe('cadence report information', () => {
  it('shows available report types as read-only information', () => {
    const wrapper = mount(CadenceSelector, { props: { modelValue: 'weekly' } })

    expect(wrapper.text()).toContain('以下为不同监测周期可获得的正式报告类型')
    expect(wrapper.text()).toContain('周报 + 月报 + 季报')
    expect(wrapper.text()).toContain('月报 + 季报')
    expect(wrapper.text()).toContain('当前配置：每周')
    expect(wrapper.findAll('button')).toHaveLength(0)
    expect(wrapper.findAll('.cadence-card')).toHaveLength(2)
  })
})

