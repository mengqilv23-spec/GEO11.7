import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { useMarketContextStore } from './market-context'
import { useOnboardingStore } from './onboarding'

describe('market context', () => {
  beforeEach(() => {
    localStorage.removeItem('geo-market-context:v1')
    setActivePinia(createPinia())
  })

  it('changes the active market and synchronizes onboarding market language', () => {
    const marketContext = useMarketContextStore()
    const onboarding = useOnboardingStore()

    expect(marketContext.activateMarket('en-us')).toBe(true)
    expect(marketContext.activeMarket).toMatchObject({ market: '美国', language: '英语' })
    expect(onboarding.knowledgeItems.find(item => item.id === 'market')?.marketLanguage).toEqual({ market: '美国', language: '英语' })
  })

  it('keeps monitoring preferences isolated when switching between markets', () => {
    const marketContext = useMarketContextStore()
    const onboarding = useOnboardingStore()

    marketContext.activateMarket('en-us')
    onboarding.monitoringFrequency = 'monthly'
    marketContext.activateMarket('de-de')
    expect(onboarding.monitoringFrequency).toBe('weekly')
    marketContext.activateMarket('en-us')
    expect(onboarding.monitoringFrequency).toBe('monthly')
  })

  it('adds a new market from the setup draft, makes it active, and persists it', async () => {
    const marketContext = useMarketContextStore()
    marketContext.beginMarketSetup()
    marketContext.updateSetupMarket('法国', '法语')

    expect(marketContext.finishMarketSetup()).toBe(true)
    expect(marketContext.activeMarket).toMatchObject({ market: '法国', language: '法语' })
    expect(marketContext.markets).toHaveLength(4)
    await nextTick()
    setActivePinia(createPinia())
    const restored = useMarketContextStore()
    expect(restored.activeMarket).toMatchObject({ market: '法国', language: '法语' })
  })

  it('updates the starter market instead of adding a duplicate market-language pair', () => {
    const marketContext = useMarketContextStore()
    marketContext.beginMarketSetup()
    marketContext.updateSetupMarket('美国', '英语')

    expect(marketContext.finishMarketSetup()).toBe(true)
    expect(marketContext.markets).toHaveLength(3)
    expect(marketContext.markets.filter(market => market.market === '美国' && market.language === '英语')).toHaveLength(1)
    expect(marketContext.activeMarketId).toBe('en-us')
  })

  it('removes persisted duplicate markets while keeping the configured profile', () => {
    const saved = [
      { id: 'de-de', market: '德国', language: '德语', buyerPersonas: [], selectedMonitoringQuestionIds: [], customMonitoringQuestions: [], frequency: 'weekly', platforms: ['chatgpt'] },
      { id: 'en-us', market: '美国', language: '英语', buyerPersonas: [], selectedMonitoringQuestionIds: [], customMonitoringQuestions: [], frequency: 'weekly', platforms: ['chatgpt'] },
      { id: 'ja-jp', market: '日本', language: '日语', buyerPersonas: [], selectedMonitoringQuestionIds: [], customMonitoringQuestions: [], frequency: 'weekly', platforms: ['chatgpt'] },
      { id: '美国-英语', market: '美国', language: '英语', buyerPersonas: [{ id: 'persona-us', type: 'technical_director', purchaseStage: 'evaluation' }], selectedMonitoringQuestionIds: ['question-us'], customMonitoringQuestions: [], frequency: 'monthly', platforms: ['chatgpt'] },
    ]
    localStorage.setItem('geo-market-context:v1', JSON.stringify({ markets: saved, activeMarketId: 'de-de' }))

    const marketContext = useMarketContextStore()

    expect(marketContext.markets.filter(market => market.market === '美国' && market.language === '英语')).toHaveLength(1)
    expect(marketContext.markets.find(market => market.market === '美国')?.buyerPersonas).toHaveLength(1)
  })

  it('does not finish setup when market or language is missing', () => {
    const marketContext = useMarketContextStore()
    marketContext.beginMarketSetup()

    expect(marketContext.finishMarketSetup()).toBe(false)
    expect(marketContext.setupDraft).not.toBeNull()
  })
})

