import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import GeoWorkbenchToolbar from './GeoWorkbenchToolbar.vue'

function createToolbar() {
  return mount(GeoWorkbenchToolbar, {
    props: { activePage: 'overview' },
    global: {
      plugins: [createPinia()],
      stubs: {
        MarketSwitcher: { template: '<button data-test="market-control">市场 / 语言</button>' },
        GeoSectionNav: { template: '<nav data-test="page-tabs">工作台页面</nav>' },
        RouterLink: { template: '<a><slot /></a>' },
      },
    },
  })
}

describe('geoWorkbenchToolbar', () => {
  it('keeps market selection and page navigation visible in the top toolbar', () => {
    const wrapper = createToolbar()

    expect(wrapper.find('[data-test="market-control"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="page-tabs"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="页面导航"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="市场语言"]').exists()).toBe(false)
  })

  it('keeps page tabs alongside the market selector', () => {
    const wrapper = createToolbar()
    const market = wrapper.get('.geo-workbench-toolbar__market')

    expect(wrapper.get('.geo-workbench-toolbar__main').element.lastElementChild).toBe(market.element)
    expect(wrapper.find('[data-test="page-tabs"]').exists()).toBe(true)
    expect(wrapper.find('.geo-workbench-toolbar__controls').exists()).toBe(false)
    expect(wrapper.find('.geo-role-switch').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('展示时长')
  })
})

