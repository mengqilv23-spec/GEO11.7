import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BrandCognitionView from './BrandCognitionView.vue'

function mountView() {
  return mount(BrandCognitionView, {
    global: {
      stubs: {
        GeoPageIntro: { props: ['title'], template: '<h1 data-test="intro">{{ title }}</h1>' },
        GeoDrawer: { props: ['open', 'title'], template: '<aside v-if="open" data-test="drawer"><h2>{{ title }}</h2><slot /></aside>' },
      },
    },
  })
}

describe('brand cognition view', () => {
  it('summarises citation ownership and filters questions without owned citations', async () => {
    const wrapper = mountView()

    expect(wrapper.get('[data-test="intro"]').text()).toBe('企业认知')
    expect(wrapper.findAll('.bc-stat strong').map(item => item.text())).toEqual(['10', '8', '60%', '4'])
    expect(wrapper.findAll('.bc-card tbody tr')).toHaveLength(10)

    await wrapper.get('.bc-gap-filter input').setValue(true)

    expect(wrapper.findAll('.bc-card tbody tr')).toHaveLength(4)
    expect(wrapper.text()).toContain('未引用我方内容')
    wrapper.unmount()
  })

  it('opens a question drawer with cited articles and ownership labels', async () => {
    const wrapper = mountView()

    await wrapper.get('.bc-link').trigger('click')

    const drawer = wrapper.get('[data-test="drawer"]')
    expect(drawer.text()).toContain('Welches 5-Achs-Wasserstrahlsystem')
    expect(drawer.text()).toContain('APW Waterjet · Carbon Fiber Solutions')
    expect(drawer.text()).toContain('我方发布')
    expect(drawer.text()).toContain('第三方')
    wrapper.unmount()
  })
})
