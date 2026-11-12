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
    expect(wrapper.findAll('.cv-stat strong').map(item => item.text())).toEqual(['3', '4', '4', '3'])
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
    expect(drawer.text()).toContain('有官网')
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
    expect(drawer.findAll('.cv-question').every(question => question.text().includes('有官网'))).toBe(true)
    wrapper.unmount()
  })
})
