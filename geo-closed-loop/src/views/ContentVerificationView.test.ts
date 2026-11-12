import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ContentVerificationView from './ContentVerificationView.vue'

function mountView() {
  return mount(ContentVerificationView, {
    global: {
      stubs: {
        GeoPageIntro: { props: ['title'], template: '<h1 data-test="intro">{{ title }}</h1>' },
        GeoDrawer: {
          props: ['open', 'title'],
          template: '<aside v-if="open" data-test="drawer"><h2>{{ title }}</h2><slot /><slot name="footer" /></aside>',
        },
        RouterLink: { template: '<a><slot /></a>' },
        Button: { template: '<button><slot /></button>' },
      },
    },
  })
}

describe('content verification view', () => {
  it('summarises published content and keeps every item verified with an official site', async () => {
    const wrapper = mountView()

    expect(wrapper.get('[data-test="intro"]').text()).toBe('品牌内容核验')
    expect(wrapper.text()).toContain('已发布在官网的内容')
    expect(wrapper.text()).not.toContain('本轮有官网')
    expect(wrapper.text()).toContain('可点击详情查看查询结果')
    expect(wrapper.findAll('.cv-stat strong').map(item => item.text())).toEqual(['3', '4', '3'])
    expect(wrapper.findAll('thead th').map(item => item.text())).toEqual(['序号', '任务名', '任务序号', 'AI 引用结果', '最近核验', '操作'])
    expect(wrapper.findAll('.cv-index').map(item => item.text())).toEqual(['1', '2', '3'])
    expect(wrapper.findAll('.cv-task-name').map(item => item.text())).toEqual([
      '碳纤维方案页：补充无热影响区与 25mm 工艺参数',
      '水刀 vs 激光对比页：补充边缘质量与适用边界',
      '航空应用页：补充材料适用范围与服务边界',
    ])
    expect(wrapper.findAll('.cv-task-link').map(item => item.text())).toEqual(['T-2404', 'T-2405', 'T-2406'])
    expect(wrapper.find('.cv-status').exists()).toBe(false)
    expect(wrapper.findAll('tbody tr')).toHaveLength(3)
    expect(wrapper.findAll('tbody tr').every(row => ['T-2404', 'T-2405', 'T-2406'].includes(row.attributes('data-task-id')!))).toBe(true)
    wrapper.unmount()
  })

  it('opens a cited content drawer with task id and primary citation evidence', async () => {
    const wrapper = mountView()

    await wrapper.get('[data-task-id="T-2404"] .cv-link').trigger('click')

    const drawer = wrapper.get('[data-test="drawer"]')
    expect(drawer.text()).toContain('T-2404')
    expect(drawer.text()).toContain('APW 是不是有五轴水刀系统？')
    expect(drawer.text()).not.toContain('有官网')
    expect(drawer.text()).toContain('APW Waterjet · Carbon Fiber Solutions')
    expect(drawer.text()).toContain('官网引用')
    wrapper.unmount()
  })

  it('shows both aerospace facts verified with official-site citations', async () => {
    const wrapper = mountView()

    await wrapper.get('[data-task-id="T-2406"] .cv-link').trigger('click')

    const drawer = wrapper.get('[data-test="drawer"]')
    expect(drawer.text()).toContain('APW 是不是做航空复材切割？')
    expect(drawer.text()).toContain('APW 是不是做钛合金切割？')
    expect(drawer.findAll('.cv-question')).toHaveLength(2)
    expect(drawer.find('.cv-status').exists()).toBe(false)
    expect(drawer.findAll('.cv-platform__state')).toHaveLength(0)
    wrapper.unmount()
  })
})
