import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MonitoringProcessNav from './MonitoringProcessNav.vue'

describe('monitoringProcessNav', () => {
  it('does not present fixture counts or dates as completed server state', () => {
    const wrapper = mount(MonitoringProcessNav, { props: { modelValue: 5 } })

    expect(wrapper.text()).toContain('查看品牌知识配置')
    expect(wrapper.text()).toContain('查看轮次结果')
    expect(wrapper.text()).not.toContain('6 类当前生效')
    expect(wrapper.text()).not.toContain('67 条当前生效')
    expect(wrapper.text()).not.toContain('2026-09-18')
    expect(wrapper.text()).not.toContain('当前口径已完成')
  })
})

