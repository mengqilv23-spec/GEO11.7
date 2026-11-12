import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import GeoSectionNav from './GeoSectionNav.vue'

const { prefetchPage } = vi.hoisted(() => ({ prefetchPage: vi.fn() }))
vi.mock('../../../router/prefetch', () => ({ prefetchPage }))

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/overview', name: 'overview', component: { template: '<div />' } },
    { path: '/diagnosis', name: 'diagnosis', component: { template: '<div />' } },
    { path: '/optimization', name: 'optimization', component: { template: '<div />' } },
    { path: '/visibility-monitoring', name: 'visibility-monitoring', component: { template: '<div />' } },
    { path: '/content-verification', name: 'content-verification', component: { template: '<div />' } },
    { path: '/report-center', name: 'report-center', component: { template: '<div />' } },
    { path: '/operations-review', name: 'operations-review', component: { template: '<div />' } },
  ],
})

describe('geo section navigation', () => {
  beforeEach(() => prefetchPage.mockClear())

  it('renders route navigation as a labeled secondary navigation row', async () => {
    await router.push('/optimization')
    await router.isReady()
    const wrapper = mount(GeoSectionNav, {
      props: { activePage: 'optimization' },
      global: { plugins: [router] },
    })

    expect(wrapper.get('nav').attributes('aria-label')).toBe('GEO 智能体页面')
    expect(wrapper.findAll('a')).toHaveLength(7)
    expect(wrapper.get('a[aria-current="page"]').text()).toContain('优化中心')
    expect(wrapper.get('a[href="/overview"]').text()).toContain('概览')
    expect(wrapper.get('a[href="/content-verification"]').text()).toContain('品牌内容核验')
    expect(wrapper.get('a[href="/operations-review"]').text()).toContain('运营复盘与 Agent 升级')
    wrapper.unmount()
  })

  it('warms a page chunk before the navigation item is clicked', async () => {
    await router.push('/optimization')
    await router.isReady()
    const wrapper = mount(GeoSectionNav, {
      props: { activePage: 'optimization' },
      global: { plugins: [router] },
    })

    await wrapper.get('a[href="/content-verification"]').trigger('pointerenter')
    await wrapper.get('a[href="/report-center"]').trigger('focus')

    expect(prefetchPage).toHaveBeenCalledWith('content-verification')
    expect(prefetchPage).toHaveBeenCalledWith('report-center')
    wrapper.unmount()
  })
})
