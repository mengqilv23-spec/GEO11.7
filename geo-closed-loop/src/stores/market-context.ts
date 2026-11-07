import type { MonitoringFrequency, MonitoringPlatform } from '../components/onboarding/monitoring-plan/monitoring-plan'
import type { MonitoringQuestion } from '../components/onboarding/monitoring-questions/monitoring-question-data'
import type { BuyerPersona } from '../types'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { initialMonitoringPlatforms } from '../components/onboarding/monitoring-plan/monitoring-plan'
import { useOnboardingStore } from './onboarding'

export interface MarketEntry {
  id: string
  market: string
  language: string
  buyerPersonas: BuyerPersona[]
  selectedMonitoringQuestionIds: string[]
  customMonitoringQuestions: MonitoringQuestion[]
  frequency: MonitoringFrequency
  platforms: MonitoringPlatform[]
}

export type MarketSetupDraft = Omit<MarketEntry, 'id'>

const starterMarkets: MarketEntry[] = [
  { id: 'de-de', market: '德国', language: '德语', buyerPersonas: [], selectedMonitoringQuestionIds: [], customMonitoringQuestions: [], frequency: 'weekly', platforms: [...initialMonitoringPlatforms] },
  { id: 'en-us', market: '美国', language: '英语', buyerPersonas: [], selectedMonitoringQuestionIds: [], customMonitoringQuestions: [], frequency: 'weekly', platforms: [...initialMonitoringPlatforms] },
  { id: 'ja-jp', market: '日本', language: '日语', buyerPersonas: [], selectedMonitoringQuestionIds: [], customMonitoringQuestions: [], frequency: 'weekly', platforms: [...initialMonitoringPlatforms] },
]

export const marketSetupSteps = ['市场与语言', '买家人设', '监测问题', '采集计划']
const storageKey = 'geo-market-context:v1'

function isMarketEntry(value: unknown): value is MarketEntry {
  if (typeof value !== 'object' || value === null)
    return false
  const market = value as Partial<MarketEntry>
  return typeof market.id === 'string'
    && typeof market.market === 'string'
    && typeof market.language === 'string'
    && Array.isArray(market.buyerPersonas)
    && Array.isArray(market.selectedMonitoringQuestionIds)
    && Array.isArray(market.customMonitoringQuestions)
    && ['daily', 'weekly', 'monthly'].includes(market.frequency ?? '')
    && Array.isArray(market.platforms)
}

function marketPairKey(market: Pick<MarketEntry, 'market' | 'language'>) {
  return `${market.market.trim().toLocaleLowerCase()}\u0000${market.language.trim().toLocaleLowerCase()}`
}

function profileScore(market: MarketEntry) {
  return market.buyerPersonas.length * 4
    + market.selectedMonitoringQuestionIds.length * 2
    + market.customMonitoringQuestions.length * 3
}

function deduplicateMarkets(markets: MarketEntry[], activeMarketId: string) {
  const unique: MarketEntry[] = []
  const indices = new Map<string, number>()
  const active = markets.find(market => market.id === activeMarketId)

  for (const market of markets) {
    const key = marketPairKey(market)
    const existingIndex = indices.get(key)
    if (existingIndex === undefined) {
      indices.set(key, unique.length)
      unique.push(market)
      continue
    }

    const current = unique[existingIndex]
    const candidateScore = profileScore(market)
    const currentScore = profileScore(current)
    const candidateIsActive = market.id === activeMarketId
    const currentIsActive = current.id === activeMarketId
    if (candidateScore > currentScore || (candidateScore === currentScore && candidateIsActive && !currentIsActive))
      unique[existingIndex] = market
  }

  const activePair = active ? marketPairKey(active) : undefined
  const activeWinner = activePair === undefined ? undefined : unique.find(market => marketPairKey(market) === activePair)
  return { markets: unique, activeMarketId: activeWinner?.id ?? unique[0]?.id ?? 'de-de' }
}

function readSavedMarkets(): { markets: MarketEntry[], activeMarketId: string } | undefined {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw)
      return undefined
    const saved = JSON.parse(raw) as { markets?: unknown, activeMarketId?: unknown }
    if (!Array.isArray(saved.markets) || !saved.markets.every(isMarketEntry))
      return undefined
    return deduplicateMarkets(saved.markets as MarketEntry[], typeof saved.activeMarketId === 'string' ? saved.activeMarketId : 'de-de')
  }
  catch {
    return undefined
  }
}

export const useMarketContextStore = defineStore('market-context', () => {
  const saved = readSavedMarkets()
  const markets = ref<MarketEntry[]>(saved?.markets ?? starterMarkets.map(market => ({ ...market })))
  const activeMarketId = ref(markets.value.some(market => market.id === saved?.activeMarketId) ? saved!.activeMarketId : 'de-de')
  const setupStep = ref(0)
  const setupDraft = ref<MarketSetupDraft | null>(null)
  const activeMarket = computed(() => markets.value.find(market => market.id === activeMarketId.value) ?? markets.value[0])
  const marketAllowanceUsed = computed(() => Math.max(1, markets.value.length - 2))

  watch([markets, activeMarketId], () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ markets: markets.value, activeMarketId: activeMarketId.value }))
    }
    catch {
      // Market selection remains available for this session when storage is unavailable.
    }
  }, { deep: true })

  function loadMarket(market: MarketEntry) {
    const onboarding = useOnboardingStore()
    onboarding.buyerPersonas = market.buyerPersonas.map(persona => ({ ...persona }))
    onboarding.selectedMonitoringQuestionIds = [...market.selectedMonitoringQuestionIds]
    onboarding.customMonitoringQuestions = market.customMonitoringQuestions.map(question => ({ ...question }))
    onboarding.monitoringFrequency = market.frequency
    onboarding.monitoringPlatforms = [...market.platforms]
    const marketKnowledge = onboarding.knowledgeItems.find(item => item.id === 'market')
    if (marketKnowledge) {
      marketKnowledge.marketLanguage = { market: market.market, language: market.language }
      marketKnowledge.summary = `${market.market} · ${market.language}`
    }
  }

  if (activeMarket.value)
    loadMarket(activeMarket.value)

  function activateMarket(id: string) {
    const market = markets.value.find(item => item.id === id)
    if (!market)
      return false
    const onboarding = useOnboardingStore()
    const previous = markets.value.find(item => item.id === activeMarketId.value)
    if (previous && previous.id !== id) {
      previous.buyerPersonas = onboarding.buyerPersonas.map(persona => ({ ...persona }))
      previous.selectedMonitoringQuestionIds = [...onboarding.selectedMonitoringQuestionIds]
      previous.customMonitoringQuestions = onboarding.customMonitoringQuestions.map(question => ({ ...question }))
      previous.frequency = onboarding.monitoringFrequency
      previous.platforms = [...onboarding.monitoringPlatforms]
    }
    activeMarketId.value = id
    loadMarket(market)
    return true
  }

  function beginMarketSetup() {
    setupStep.value = 0
    setupDraft.value = {
      market: '',
      language: '',
      buyerPersonas: [],
      selectedMonitoringQuestionIds: [],
      customMonitoringQuestions: [],
      frequency: 'weekly',
      platforms: [...initialMonitoringPlatforms],
    }
  }

  function updateSetupMarket(market: string, language: string) {
    if (setupDraft.value) {
      setupDraft.value.market = market
      setupDraft.value.language = language
    }
  }

  function updateSetupPersonas(personas: BuyerPersona[]) {
    if (setupDraft.value)
      setupDraft.value.buyerPersonas = personas.map(persona => ({ ...persona }))
  }

  function updateSetupQuestionSelection(ids: string[]) {
    if (setupDraft.value)
      setupDraft.value.selectedMonitoringQuestionIds = [...ids]
  }

  function addSetupQuestion(question: MonitoringQuestion) {
    if (setupDraft.value)
      setupDraft.value.customMonitoringQuestions.push({ ...question })
  }

  function updateSetupFrequency(frequency: MonitoringFrequency) {
    if (setupDraft.value)
      setupDraft.value.frequency = frequency
  }

  function updateSetupPlatforms(platforms: MonitoringPlatform[]) {
    if (setupDraft.value)
      setupDraft.value.platforms = [...platforms]
  }

  function stepSetup(direction: -1 | 1) {
    setupStep.value = Math.min(marketSetupSteps.length - 1, Math.max(0, setupStep.value + direction))
  }

  function finishMarketSetup() {
    const draft = setupDraft.value
    if (!draft?.market || !draft.language)
      return false
    const existing = markets.value.find(item => marketPairKey(item) === marketPairKey(draft))
    const id = existing?.id ?? `${draft.market}-${draft.language}`
    if (existing) {
      Object.assign(existing, draft)
    }
    else {
      if (marketAllowanceUsed.value >= 3)
        return false
      markets.value.push({ id, ...draft })
    }
    activateMarket(id)
    setupDraft.value = null
    setupStep.value = 0
    return true
  }

  function cancelMarketSetup() {
    setupDraft.value = null
    setupStep.value = 0
  }

  return {
    markets,
    activeMarketId,
    activeMarket,
    marketAllowanceUsed,
    setupStep,
    setupDraft,
    beginMarketSetup,
    updateSetupMarket,
    updateSetupPersonas,
    updateSetupQuestionSelection,
    addSetupQuestion,
    updateSetupFrequency,
    updateSetupPlatforms,
    stepSetup,
    finishMarketSetup,
    cancelMarketSetup,
    activateMarket,
  }
})

