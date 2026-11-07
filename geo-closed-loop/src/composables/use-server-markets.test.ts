import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  getMarkets: vi.fn(),
  getMarketEntryStatus: vi.fn(),
  getDictionary: vi.fn(),
  switchMarket: vi.fn(),
}))
vi.mock('../api/geo-config', () => api)

describe('useServerMarkets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('maps backend market records and dictionary labels without inventing entries', async () => {
    api.getMarkets.mockResolvedValue([
      { id: 2, marketType: 1, status: 1, marketCountry: null, marketLanguage: 'de', subSiteName: null },
      { id: 9, marketType: 2, status: 0, marketCountry: 'us', marketLanguage: 'en', subSiteName: 'APW English' },
    ])
    api.getMarketEntryStatus.mockResolvedValue({ entryStatus: 'CONFIGURED', marketId: 2, wizardId: 8, wizardStatus: 1, currentStep: null, maxReachedStep: null, stepStatus: null })
    api.getDictionary.mockImplementation(async (type: string) => type === 'country'
      ? [{ dictValue: 'us', dictLabel: '美国', extra: null, sort: 1 }]
      : [{ dictValue: 'de', dictLabel: '德语', extra: null, sort: 1 }, { dictValue: 'en', dictLabel: '英语', extra: null, sort: 2 }])
    const { useServerMarkets } = await import('./use-server-markets')
    const markets = useServerMarkets()

    await markets.load()

    expect(markets.items.value).toEqual([
      { id: 2, title: '主站 · 德语', country: '主站', language: '德语', enabled: true },
      { id: 9, title: 'APW English · 英语', country: '美国', language: '英语', enabled: false },
    ])
    expect(markets.activeMarketId.value).toBe(2)
    expect(api.getMarkets).toHaveBeenCalledOnce()
  })

  it('keeps the list empty and exposes the server error instead of showing fixture markets', async () => {
    api.getMarkets.mockRejectedValue(new Error('市场列表请求失败'))
    api.getMarketEntryStatus.mockResolvedValue({ entryStatus: 'FIRST_TIME', marketId: null })
    api.getDictionary.mockResolvedValue([])
    const { useServerMarkets } = await import('./use-server-markets')
    const markets = useServerMarkets()

    await markets.load()

    expect(markets.items.value).toEqual([])
    expect(markets.error.value).toBe('市场列表请求失败')
  })

  it('switches only through the backend and records the returned active market id', async () => {
    api.switchMarket.mockResolvedValue({ marketId: 9, siteId: 'site-9' })
    api.getMarketEntryStatus.mockResolvedValue({ entryStatus: 'CONTINUE_WIZARD', marketId: 9, wizardId: 10, wizardStatus: 0, currentStep: 2, maxReachedStep: 2, stepStatus: null })
    const { useServerMarkets } = await import('./use-server-markets')
    const markets = useServerMarkets()

    await expect(markets.activate(9)).resolves.toEqual({ marketId: 9, siteId: 'site-9' })
    expect(api.switchMarket).toHaveBeenCalledWith(9)
    expect(markets.activeMarketId.value).toBe(9)
  })
})

