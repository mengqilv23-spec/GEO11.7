import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import GeoSectionNav from './GeoSectionNav.vue'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/overview', name: 'overview', component: { template: '<div />' } },
    { path: '/diagnosis', name: 'diagnosis', component: { template: '<div />' } },
    { path: '/optimization', name: 'optimization', component: { template: '<div />' } },
    { path: '/visibility-monitoring', name: 'visibility-monitoring', component: { template: '<div />' } },
    { path: '/report-center', name: 'report-center', component: { template: '<div />' } },
    { path: '/operations-review', name: 'operations-review', component: { template: '<div />' } },
  ],
})

describe('geo section navigation', () => {
  it('renders route navigation as a labeled secondary navigation row', async () => {
    await router.push('/optimization')
    await router.isReady()
    const wrapper = mount(GeoSectionNav, {
      props: { activePage: 'optimization' },
      global: { plugins: [router] },
    })

    expect(wrapper.get('nav').attributes('aria-label')).toBe('GEO 智能体页面')
    expect(wrapper.findAll('a')).toHaveLength(6)
    expect(wrapper.get('a[aria-current="page"]').text()).toContain('优化中心')
    expect(wrapper.get('a[href="/overview"]').text()).toContain('概览')
    expect(wrapper.get('a[href="/operations-review"]').text()).toContain('运营复盘与 Agent 升级')
    wrapper.unmount()
  })
})

