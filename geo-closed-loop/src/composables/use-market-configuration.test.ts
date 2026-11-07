import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  getBrandInfo: vi.fn(),
  getBrandProducts: vi.fn(),
  getMarketCompetitors: vi.fn(),
  getMarketPersonas: vi.fn(),
  getMarketPlatforms: vi.fn(),
  getMarketQuestions: vi.fn(),
  getMarketThemes: vi.fn(),
  getRecommendationItems: vi.fn(),
}))
vi.mock('../api/geo-config', () => api)

describe('useMarketConfiguration', () => {
  beforeEach(() => {
    for (const method of Object.values(api)) method.mockReset()
    api.getBrandInfo.mockResolvedValue({ brandName: 'RealCo', industry: 'Industry', siteUrl: 'real.example', aliasNames: null, positioning: null, saved: 1 })
    api.getBrandProducts.mockResolvedValue([{ id: 3, productName: 'Real product' }])
    api.getMarketCompetitors.mockResolvedValue([])
    api.getMarketPersonas.mockResolvedValue([{ id: 4, personaName: 'Real persona' }])
    api.getMarketQuestions.mockResolvedValue([{ id: 5, questionContent: 'Real question' }])
    api.getMarketThemes.mockResolvedValue([])
    api.getMarketPlatforms.mockResolvedValue([{ id: 6, platform: 'gemini', enabled: 1 }])
    api.getRecommendationItems.mockResolvedValue([{ id: 8, siteId: 1, marketId: 2, recommendType: 3, itemPayload: '{"competitorName":"Rival"}', evidenceJson: null, confidenceScore: null, batchNo: null, itemStatus: 1, confirmedBizId: null, confirmedAt: null }])
  })

  it('loads current market configuration through its read endpoints', async () => {
    const { useMarketConfiguration } = await import('./use-market-configuration')
    const state = useMarketConfiguration()
    await state.load()
    expect(state.brand.value?.brandName).toBe('RealCo')
    expect(state.products.value[0]?.productName).toBe('Real product')
    expect(state.personas.value[0]?.personaName).toBe('Real persona')
    expect(state.questions.value[0]?.questionContent).toBe('Real question')
    expect(state.platforms.value[0]?.platform).toBe('gemini')
    expect(state.competitorRecommendations.value[0]?.itemPayload).toContain('Rival')
    expect(api.getRecommendationItems).toHaveBeenCalledWith({ recommendType: 3, itemStatus: 1 })
    expect(state.loading.value).toBe(false)
  })

  it('surfaces category errors and does not retain previous content after a failed reload', async () => {
    const { useMarketConfiguration } = await import('./use-market-configuration')
    const state = useMarketConfiguration()
    await state.load()
    api.getMarketPersonas.mockRejectedValue(new Error('会话失效'))
    await state.load()
    expect(state.personas.value).toEqual([])
    expect(state.errors.value.personas).toBe('会话失效')
  })
})

