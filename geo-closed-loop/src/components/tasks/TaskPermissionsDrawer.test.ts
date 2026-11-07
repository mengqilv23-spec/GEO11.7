import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TaskPermissionsDrawer from './TaskPermissionsDrawer.vue'

describe('task permissions drawer', () => {
  it('shows the role boundary and complete permissions matrix', () => {
    const wrapper = mount(TaskPermissionsDrawer, {
      props: { open: true },
      global: {
        stubs: {
          Drawer: {
            props: ['open', 'title', 'eyebrow', 'closeText'],
            emits: ['close'],
            template: '<section v-if="open" role="dialog"><p>{{ eyebrow }}</p><h2>{{ title }}</h2><button @click="$emit(\'close\')">{{ closeText }}</button><slot /><footer><slot name="footer" /></footer></section>',
          },
        },
      },
    })

    expect(wrapper.get('[role="dialog"] h2').text()).toBe('诊断与策略 / 优化中心权限边界')
    expect(wrapper.text()).toContain('Agent 负责分析与自动执行')
    expect(wrapper.findAll('tbody tr')).toHaveLength(11)
    expect(wrapper.get('.tp-table-scroll').attributes('tabindex')).toBe('0')
    expect(wrapper.get('.tp-table-scroll').attributes('aria-label')).toContain('可横向滚动')
    expect(wrapper.text()).toContain('官网发布')
    expect(wrapper.text()).toContain('外部平台发布')
  })

  it('emits close from both the header close button and the acknowledgement button', async () => {
    const wrapper = mount(TaskPermissionsDrawer, {
      props: { open: true },
      global: {
        stubs: {
          Drawer: {
            props: ['open', 'closeText'],
            emits: ['close'],
            template: '<section v-if="open"><button @click="$emit(\'close\')">{{ closeText }}</button><slot /><footer><slot name="footer" /></footer></section>',
          },
        },
      },
    })

    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)

    await wrapper.get('footer button').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(2)
  })
})

