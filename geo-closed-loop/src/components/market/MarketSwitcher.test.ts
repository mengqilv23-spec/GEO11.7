import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import MarketSwitcher from './MarketSwitcher.vue'

const api = vi.hoisted(() => ({
  getMarkets: vi.fn(),
  getMarketEntryStatus: vi.fn(),
  getDictionary: vi.fn(),
  switchMarket: vi.fn(),
}))
vi.mock('../../api/geo-config', () => api)

describe('market switcher', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    api.getMarkets.mockResolvedValue([
      { id: 2, marketType: 1, status: 1, marketCountry: null, marketLanguage: 'de', subSiteName: null },
      { id: 9, marketType: 2, status: 1, marketCountry: 'us', marketLanguage: 'en', subSiteName: 'APW English' },
      { id: 11, marketType: 2, status: 0, marketCountry: 'us', marketLanguage: 'en', subSiteName: 'APW Trial' },
    ])
    api.getMarketEntryStatus.mockResolvedValue({ entryStatus: 'CONFIGURED', marketId: 2, wizardId: null, wizardStatus: null, currentStep: null, maxReachedStep: null, stepStatus: null })
    api.getDictionary.mockImplementation(async (type: string) => type === 'country'
      ? [{ dictValue: 'us', dictLabel: '美国', extra: null, sort: 1 }]
      : [{ dictValue: 'de', dictLabel: '德语', extra: null, sort: 1 }, { dictValue: 'en', dictLabel: '英语', extra: null, sort: 2 }])
    api.switchMarket.mockResolvedValue({ marketId: 9, siteId: 'site-9' })
  })

  it('renders backend-provided markets and status, not hardcoded starter markets or quotas', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<div />' } }],
    })
    const routerGo = vi.spyOn(router, 'go')
    const wrapper = mount(MarketSwitcher, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.get('.market-switcher__trigger strong').text()).toBe('主站 · 德语')
    await wrapper.get('.market-switcher__trigger').trigger('click')
    expect(wrapper.find('svg.lucide-chevron-down').exists()).toBe(true)
    expect(wrapper.findAll('.market-switcher__option').map(option => option.text())).toEqual([
      '🌐主站 · 德语当前',
      '🌐APW English · 英语已启用',
      '🌐APW Trial · 英语待配置',
    ])
    expect(wrapper.findAll('.market-switcher__option')[2].attributes('disabled')).toBeDefined()
    expect(wrapper.text()).not.toContain('成长版市场权益')
    expect(wrapper.text()).not.toContain('日本')

    await wrapper.findAll('.market-switcher__option')[1].trigger('click')
    await flushPromises()
    expect(api.switchMarket).toHaveBeenCalledWith(9)
    expect(routerGo).toHaveBeenCalledWith(0)
    expect(wrapper.emitted('selected')).toEqual([[9]])
    wrapper.unmount()
  })

  it('shows an honest error with retry instead of falling back to sample markets', async () => {
    api.getMarkets.mockRejectedValue(new Error('后端暂不可用'))
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<div />' } }],
    })
    const wrapper = mount(MarketSwitcher, { props: { popoverOnly: true }, global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('后端暂不可用')
    expect(wrapper.findAll('.market-switcher__option')).toHaveLength(0)
    expect(wrapper.text()).not.toContain('德国')
    wrapper.unmount()
  })
})

