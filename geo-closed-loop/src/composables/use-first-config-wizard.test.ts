import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  addBrandProduct: vi.fn(),
  addCompetitor: vi.fn(),
  addPersona: vi.fn(),
  addQuestion: vi.fn(),
  bindMarket: vi.fn(),
  completeBrandStep: vi.fn(),
  completePersonaStep: vi.fn(),
  completeQuestionStep: vi.fn(),
  completeWizardStep: vi.fn(),
  createWizard: vi.fn(),
  deleteBrandProduct: vi.fn(),
  deleteCompetitor: vi.fn(),
  deletePersona: vi.fn(),
  generateQuestionCandidates: vi.fn(),
  getBrandInfo: vi.fn(),
  getActivePlan: vi.fn(),
  getBrandProducts: vi.fn(),
  getDictionary: vi.fn(),
  getMarketCompetitors: vi.fn(),
  getMarketEntryStatus: vi.fn(),
  getMarketPersonas: vi.fn(),
  getMarketPlatforms: vi.fn(),
  getMarketQuestions: vi.fn(),
  getMarketThemes: vi.fn(),
  getMarkets: vi.fn(),
  removePlatform: vi.fn(),
  saveBrandInfo: vi.fn(),
  selectPlatform: vi.fn(),
  switchMarket: vi.fn(),
  updateBrandProduct: vi.fn(),
  updateCompetitor: vi.fn(),
  updateFirstSelected: vi.fn(),
  updatePersona: vi.fn(),
  updateQuestion: vi.fn(),
  getSchedule: vi.fn(),
  saveSchedule: vi.fn(),
}))

vi.mock('../api/geo-config', () => api)
vi.mock('../api/monitoring', () => ({ getSchedule: api.getSchedule, saveSchedule: api.saveSchedule }))

describe('useFirstConfigWizard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    for (const method of Object.values(api)) method.mockReset()
    api.getMarketEntryStatus.mockResolvedValue({ entryStatus: 'FIRST_TIME', marketId: 12, wizardId: null, wizardStatus: null, currentStep: null, maxReachedStep: null, stepStatus: null })
    api.createWizard.mockResolvedValue({ id: 88, currentStep: 1 })
    api.getBrandInfo.mockResolvedValue({ brandName: 'Server Brand', industry: 'Manufacturing', siteUrl: 'https://brand.example', aliasNames: null, positioning: null, saved: 0 })
    api.getActivePlan.mockResolvedValue({ quota: { questionCountLimit: 7, competitorCountLimit: 5 } })
    api.getBrandProducts.mockResolvedValue([])
    api.getMarketCompetitors.mockResolvedValue([])
    api.getMarketPersonas.mockResolvedValue([])
    api.getMarketQuestions.mockResolvedValue([])
    api.getMarketPlatforms.mockResolvedValue([])
    api.getMarketThemes.mockResolvedValue([])
    api.getSchedule.mockResolvedValue(null)
    api.getMarkets.mockResolvedValue([{ id: 12, marketCountry: 'de', marketLanguage: 'de', marketType: 1, status: 0, subSiteName: null }])
    api.getDictionary.mockResolvedValue([])
  })

  it('loads server brand and market data without substituting sample business content', async () => {
    const { useFirstConfigWizard } = await import('./use-first-config-wizard')
    const { useOnboardingStore } = await import('../stores/onboarding')
    const wizard = useFirstConfigWizard()

    await wizard.load()

    expect(api.createWizard).toHaveBeenCalledOnce()
    expect(api.bindMarket).toHaveBeenCalledWith(12)
    expect(api.switchMarket).toHaveBeenCalledWith(12)
    expect(useOnboardingStore().knowledgeItems.find(item => item.id === 'brand')?.brand).toMatchObject({ name: 'Server Brand', industry: 'Manufacturing' })
    expect(useOnboardingStore().knowledgeItems.find(item => item.id === 'product')?.products).toEqual([])
    expect(useOnboardingStore().buyerPersonas).toEqual([])
    expect(api.getDictionary.mock.calls.map(([type]) => type).sort()).toEqual(['country', 'language'])
    expect(api.getMarketPersonas).not.toHaveBeenCalled()
    expect(api.getMarketQuestions).not.toHaveBeenCalled()
    expect(api.getMarketPlatforms).not.toHaveBeenCalled()
    expect(api.getActivePlan).toHaveBeenCalledOnce()
    expect(api.generateQuestionCandidates).not.toHaveBeenCalled()
    expect(wizard.questionLimit.value).toBeNull()
  })

  it('resolves market and language labels when API codes differ in letter case', async () => {
    const { useFirstConfigWizard } = await import('./use-first-config-wizard')
    const { useOnboardingStore } = await import('../stores/onboarding')
    const { useGeoContextStore } = await import('../stores/geo-context')
    useGeoContextStore().entryStatus = { entryStatus: 'CONTINUE_WIZARD', marketId: 12, wizardId: 88, wizardStatus: 1, currentStep: 1, maxReachedStep: 1, stepStatus: null }
    api.getMarkets.mockResolvedValue([{ id: 12, marketCountry: 'US', marketLanguage: 'DE', marketType: 1, status: 0, subSiteName: null }])
    api.getDictionary.mockImplementation(async (type: string) => {
      if (type === 'country')
        return [{ dictValue: 'us', dictLabel: '美国' }]
      if (type === 'language')
        return [{ dictValue: 'de', dictLabel: '德语' }]
      return []
    })
    const wizard = useFirstConfigWizard()

    await wizard.load()

    expect(useOnboardingStore().knowledgeItems.find(item => item.id === 'market')?.marketLanguage)
      .toEqual({ market: '美国', language: '德语' })
  })

  it('summarizes the first core product with its usage scenario', async () => {
    const { useFirstConfigWizard } = await import('./use-first-config-wizard')
    const { useOnboardingStore } = await import('../stores/onboarding')
    api.getBrandProducts.mockResolvedValue([{ id: 16, lineName: '产品线', productName: '五轴水刀切割系统', usageScene: 'CFRP / 航空复材切割', sellingPoints: [], targetCustomers: [], sourceType: 1, isPrimary: 1 }])
    const wizard = useFirstConfigWizard()

    await wizard.load()

    expect(useOnboardingStore().knowledgeItems.find(item => item.id === 'product')?.summary)
      .toBe('五轴水刀切割系统 · CFRP / 航空复材切割')
    expect(useOnboardingStore().knowledgeItems.find(item => item.id === 'competitor')?.summary)
      .toBe('已选择 0 个 · 最多 5 个')
  })

  it('loads buyer persona options only when the persona step is needed', async () => {
    const { useFirstConfigWizard } = await import('./use-first-config-wizard')
    const wizard = useFirstConfigWizard()
    api.getMarketEntryStatus.mockResolvedValue({ entryStatus: 'CONTINUE_WIZARD', marketId: 12, wizardId: 88, wizardStatus: 1, currentStep: 2, maxReachedStep: 1, stepStatus: null })

    await wizard.load()

    expect(api.getMarketPersonas).toHaveBeenCalledOnce()
    expect(api.getDictionary.mock.calls.map(([type]) => type).sort()).toEqual([
      'company_scale',
      'country',
      'decision_role',
      'language',
      'persona_type',
      'purchase_stage',
    ])
    expect(api.getMarketQuestions).not.toHaveBeenCalled()
    expect(api.getActivePlan).toHaveBeenCalledOnce()
  })

  it('continues loading and reports an unknown competitor limit when the plan API fails', async () => {
    const { useFirstConfigWizard } = await import('./use-first-config-wizard')
    const { useOnboardingStore } = await import('../stores/onboarding')
    api.getActivePlan.mockRejectedValueOnce(new Error('套餐接口不可用'))
    const wizard = useFirstConfigWizard()

    await wizard.load()

    expect(wizard.loaded.value).toBe(true)
    expect(useOnboardingStore().knowledgeItems.find(item => item.id === 'competitor')?.summary)
      .toBe('已选择 0 个 · 套餐上限未返回')
  })

  it('does not block the question step when plan quota data is unavailable', async () => {
    const { useFirstConfigWizard } = await import('./use-first-config-wizard')
    const wizard = useFirstConfigWizard()
    api.getMarketEntryStatus.mockResolvedValue({ entryStatus: 'CONTINUE_WIZARD', marketId: 12, wizardId: 88, wizardStatus: 1, currentStep: 3, maxReachedStep: 2, stepStatus: null })
    api.getActivePlan.mockRejectedValueOnce(new Error('套餐接口不可用'))

    await wizard.load()

    expect(wizard.loaded.value).toBe(true)
    expect(wizard.questionLimit.value).toBeNull()
    expect(wizard.competitorCountLimit.value).toBeNull()
  })

  it('registers an immediately confirmed product in wizard cache and knowledge draft', async () => {
    const { useFirstConfigWizard } = await import('./use-first-config-wizard')
    const { useOnboardingStore } = await import('../stores/onboarding')
    const wizard = useFirstConfigWizard()
    const onboarding = useOnboardingStore()
    const acceptedProduct = {
      id: 99,
      lineName: '三轴水刀切割系统',
      productName: '三轴水刀切割系统',
      usageScene: '金属板材切割',
      sellingPoints: ['成本可控'],
      targetCustomers: ['金属加工厂'],
      sourceType: 3,
      isPrimary: 0,
    }

    await wizard.load()
    wizard.registerAcceptedProduct(acceptedProduct)
    wizard.registerAcceptedProduct(acceptedProduct)

    expect(onboarding.knowledgeItems.find(item => item.id === 'product')?.products).toContainEqual(expect.objectContaining({
      id: '99',
      name: '三轴水刀切割系统',
      useCase: '金属板材切割',
    }))
    expect(api.addBrandProduct).not.toHaveBeenCalled()
  })

  it('deletes a core product through the backend and updates the cached summary immediately', async () => {
    const { useFirstConfigWizard } = await import('./use-first-config-wizard')
    const { useOnboardingStore } = await import('../stores/onboarding')
    api.getBrandProducts.mockResolvedValue([{ id: 16, lineName: '产品线', productName: '五轴水刀切割系统', usageScene: '航空复材切割', sellingPoints: [], targetCustomers: [], sourceType: 1, isPrimary: 1 }])
    api.deleteBrandProduct.mockResolvedValue(undefined)
    const wizard = useFirstConfigWizard()

    await wizard.load()
    await wizard.deleteProduct('16')

    expect(api.deleteBrandProduct).toHaveBeenCalledWith(16)
    expect(useOnboardingStore().knowledgeItems.find(item => item.id === 'product')?.summary).toBe('尚未添加核心产品')
  })

  it('deletes a competitor through the backend and updates the cached summary immediately', async () => {
    const { useFirstConfigWizard } = await import('./use-first-config-wizard')
    const { useOnboardingStore } = await import('../stores/onboarding')
    api.getMarketCompetitors.mockResolvedValue([{ id: 25, competitorName: '竞品 A', domain: 'a.example', aliasNames: null, competitorDesc: null, isCoreSov: 0, sourceType: 1, status: 1 }])
    api.deleteCompetitor.mockResolvedValue(undefined)
    const wizard = useFirstConfigWizard()

    await wizard.load()
    await wizard.deleteCompetitor('25')

    expect(api.deleteCompetitor).toHaveBeenCalledWith(25)
    expect(useOnboardingStore().knowledgeItems.find(item => item.id === 'competitor')?.summary).toBe('已选择 0 个 · 最多 5 个')
  })

  it('saves brand, product, and competitor edits without saving market context', async () => {
    const { useFirstConfigWizard } = await import('./use-first-config-wizard')
    const { useOnboardingStore } = await import('../stores/onboarding')
    api.getBrandProducts.mockResolvedValue([{ id: 15, lineName: '建站', productName: '建站', usageScene: '原场景', sellingPoints: [], targetCustomers: [], sourceType: 1, isPrimary: 0 }])
    api.getMarketCompetitors.mockResolvedValue([{ id: 25, competitorName: '竞品 A', domain: 'a.example', aliasNames: null, competitorDesc: null, isCoreSov: 0, sourceType: 1, status: 1 }])
    const wizard = useFirstConfigWizard()
    const onboarding = useOnboardingStore()
    await wizard.load()
    const marketCallCounts = {
      bindMarket: api.bindMarket.mock.calls.length,
      switchMarket: api.switchMarket.mock.calls.length,
    }
    const items = onboarding.knowledgeItems.map(item => ({
      ...item,
      brand: item.brand ? { ...item.brand, name: '新品牌' } : undefined,
      products: item.products?.map(product => ({ ...product, useCase: '新场景' })),
      competitors: item.competitors?.map(competitor => ({ ...competitor, name: '竞品 A 更新' })),
      marketLanguage: item.marketLanguage ? { market: '法国', language: '法语' } : undefined,
    }))

    await wizard.saveKnowledgeItems(items)

    expect(api.saveBrandInfo).toHaveBeenCalledWith(expect.objectContaining({ brandName: '新品牌' }))
    expect(api.updateBrandProduct).toHaveBeenCalledWith(15, expect.objectContaining({ usageScene: '新场景' }))
    expect(api.updateCompetitor).toHaveBeenCalledWith(25, expect.objectContaining({ competitorName: '竞品 A 更新' }))
    expect(api.bindMarket).toHaveBeenCalledTimes(marketCallCounts.bindMarket)
    expect(api.switchMarket).toHaveBeenCalledTimes(marketCallCounts.switchMarket)
  })

  it('saves brand information with POST and reloads only brand info and products', async () => {
    const { useFirstConfigWizard } = await import('./use-first-config-wizard')
    const { useOnboardingStore } = await import('../stores/onboarding')
    const wizard = useFirstConfigWizard()
    const onboarding = useOnboardingStore()
    await wizard.load()
    api.getBrandInfo.mockClear()
    api.getBrandProducts.mockClear()
    api.getMarketCompetitors.mockClear()
    const items = onboarding.knowledgeItems.map(item => item.id === 'brand'
      ? { ...item, brand: { ...item.brand!, name: '中企动力更新' } }
      : item)

    await wizard.saveKnowledgeItems(items)

    expect(api.saveBrandInfo).toHaveBeenCalledOnce()
    expect(api.getBrandInfo).toHaveBeenCalledOnce()
    expect(api.getBrandProducts).toHaveBeenCalledOnce()
    expect(api.getMarketCompetitors).not.toHaveBeenCalled()
    expect(api.addBrandProduct).not.toHaveBeenCalled()
  })

  it('saves brand info without treating an unchanged product with a missing ID or different lineName as an edit', async () => {
    const { useFirstConfigWizard } = await import('./use-first-config-wizard')
    const { useOnboardingStore } = await import('../stores/onboarding')
    api.getBrandProducts.mockResolvedValue([{ id: null, lineName: '产品系列', productName: '旧产品', usageScene: '旧场景', sellingPoints: [], targetCustomers: [], sourceType: 1, isPrimary: 0 }])
    const wizard = useFirstConfigWizard()
    const onboarding = useOnboardingStore()
    await wizard.load()
    const items = onboarding.knowledgeItems.map(item => item.id === 'brand'
      ? { ...item, brand: { ...item.brand!, name: '品牌更新' } }
      : item)

    await wizard.saveKnowledgeItems(items)

    expect(api.addBrandProduct).not.toHaveBeenCalled()
    expect(api.updateBrandProduct).not.toHaveBeenCalled()
    expect(api.saveBrandInfo).toHaveBeenCalledOnce()
  })

  it('sends a changed existing product without a backend ID to the update endpoint', async () => {
    const { useFirstConfigWizard } = await import('./use-first-config-wizard')
    const { useOnboardingStore } = await import('../stores/onboarding')
    api.getBrandProducts.mockResolvedValue([{ id: null, lineName: '旧产品', productName: '旧产品', usageScene: '旧场景', sellingPoints: [], targetCustomers: [], sourceType: 1, isPrimary: 0 }])
    const wizard = useFirstConfigWizard()
    const onboarding = useOnboardingStore()
    await wizard.load()
    const items = onboarding.knowledgeItems.map(item => item.id === 'product'
      ? { ...item, products: [{ ...item.products![0], name: '改过的产品' }] }
      : item)

    await wizard.saveKnowledgeItems(items)

    expect(api.addBrandProduct).not.toHaveBeenCalled()
    expect(api.updateBrandProduct).toHaveBeenCalledWith(null, expect.objectContaining({ productName: '改过的产品' }))
  })

  it('persists a newly added buyer persona immediately and uses the returned ID', async () => {
    const { useFirstConfigWizard } = await import('./use-first-config-wizard')
    const { useOnboardingStore } = await import('../stores/onboarding')
    const wizard = useFirstConfigWizard()
    const onboarding = useOnboardingStore()
    api.addPersona.mockResolvedValue(51)
    api.getMarketPersonas.mockResolvedValue([{
      id: 51,
      personaName: 'buyer',
      personaType: 'buyer',
      actualPosition: null,
      industry: null,
      companyScale: null,
      decisionRole: null,
      purchaseTrigger: null,
      purchaseBudget: null,
      purchaseCycle: null,
      infoChannels: null,
      description: null,
      focusTopics: null,
      purchaseStages: ['discovery'],
      sourceType: 1,
      status: 1,
    }])

    await wizard.load()
    await wizard.loadStep(1)
    const persona = {
      id: 'draft-persona',
      type: 'buyer',
      purchaseStage: 'discovery',
      actualRole: '',
      industry: '',
      companySize: '',
      decisionRole: '',
      purchaseTrigger: '',
      purchaseBudget: '',
      purchaseCycle: '',
      discoveryChannel: '',
    }

    await wizard.savePersonasImmediately([persona])

    expect(api.addPersona).toHaveBeenCalledWith(expect.objectContaining({ personaType: 'buyer', purchaseStages: ['discovery'] }))
    expect(onboarding.buyerPersonas).toEqual([expect.objectContaining({ ...persona, id: '51' })])
    expect(api.completePersonaStep).not.toHaveBeenCalled()
  })

  it('does not update unchanged buyer personas when saving a multi-persona form', async () => {
    const { useFirstConfigWizard } = await import('./use-first-config-wizard')
    const wizard = useFirstConfigWizard()
    const record = {
      id: 52,
      personaName: 'buyer',
      personaType: 'buyer',
      actualPosition: null,
      industry: null,
      companyScale: null,
      decisionRole: null,
      purchaseTrigger: null,
      purchaseBudget: null,
      purchaseCycle: null,
      infoChannels: null,
      description: null,
      focusTopics: null,
      purchaseStages: ['discovery'],
      sourceType: 1,
      status: 1,
    }
    api.getMarketPersonas.mockResolvedValue([record])

    await wizard.load()
    await wizard.loadStep(1)
    await wizard.savePersonasImmediately([{
      id: '52',
      type: 'buyer',
      purchaseStage: 'discovery',
      actualRole: '',
      industry: '',
      companySize: '',
      decisionRole: '',
      purchaseTrigger: '',
      purchaseBudget: '',
      purchaseCycle: '',
      discoveryChannel: '',
    }])

    expect(api.updatePersona).not.toHaveBeenCalled()
    expect(api.addPersona).not.toHaveBeenCalled()
    expect(api.deletePersona).not.toHaveBeenCalled()
  })

  it('deletes a buyer persona immediately and only then removes it from local state', async () => {
    const { useFirstConfigWizard } = await import('./use-first-config-wizard')
    const { useOnboardingStore } = await import('../stores/onboarding')
    const wizard = useFirstConfigWizard()
    const onboarding = useOnboardingStore()
    const record = {
      id: 52,
      personaName: 'Buyer',
      personaType: 'buyer',
      actualPosition: null,
      industry: null,
      companyScale: null,
      decisionRole: null,
      purchaseTrigger: null,
      purchaseBudget: null,
      purchaseCycle: null,
      infoChannels: null,
      description: null,
      focusTopics: null,
      purchaseStages: ['discovery'],
      sourceType: 1,
      status: 1,
    }
    api.getMarketPersonas.mockResolvedValueOnce([record]).mockResolvedValueOnce([])
    api.deletePersona.mockResolvedValue(undefined)

    await wizard.load()
    await wizard.loadStep(1)
    expect(onboarding.buyerPersonas).toHaveLength(1)

    await wizard.savePersonasImmediately([])

    expect(api.deletePersona).toHaveBeenCalledWith(52)
    expect(onboarding.buyerPersonas).toEqual([])
  })

  it('persists monitoring question selection immediately', async () => {
    const { useFirstConfigWizard } = await import('./use-first-config-wizard')
    const { useOnboardingStore } = await import('../stores/onboarding')
    const wizard = useFirstConfigWizard()
    const onboarding = useOnboardingStore()
    api.getMarketQuestions.mockResolvedValue([
      { id: 31, questionContent: 'Q1', themeId: null, questionType: 'brand', personaId: 1, purchaseStage: 'discovery', intentType: 'compare', focusType: null, isFirstSelected: 0, sourceType: 1, status: 1 },
    ])

    await wizard.load()
    await wizard.loadStep(2)
    await wizard.saveQuestionSelection(['31'])

    expect(api.updateFirstSelected).toHaveBeenCalledWith({ questionIds: [31], candidateIds: [] })
    expect(onboarding.selectedMonitoringQuestionIds).toEqual(['31'])
    expect(api.completeQuestionStep).not.toHaveBeenCalled()
  })

  it('keeps mock question keywords in the onboarding candidate rows', async () => {
    const { useFirstConfigWizard } = await import('./use-first-config-wizard')
    const wizard = useFirstConfigWizard()
    api.getMarketQuestions.mockResolvedValue([
      { id: 32, questionContent: 'Welches 5-Achs-Wasserstrahlsystem eignet sich für CFRP ohne Delamination?', keyword: '', themeId: null, questionType: 'brand', personaId: 1, purchaseStage: 'discovery', intentType: 'compare', focusType: null, isFirstSelected: 0, sourceType: 1, status: 1 },
    ])

    await wizard.load()
    await wizard.loadStep(2)

    expect(wizard.questionCandidates.value[0]?.keyword).toBe('碳纤维 / 复材切割')
  })

  it('persists edits to a monitoring question and updates its candidate row', async () => {
    const { useFirstConfigWizard } = await import('./use-first-config-wizard')
    const wizard = useFirstConfigWizard()
    api.getMarketQuestions.mockResolvedValue([
      { id: 33, questionContent: 'Original question', keyword: 'Original keyword', themeId: null, questionType: 'brand', personaId: 4, purchaseStage: 'discovery', intentType: 'compare', focusType: 'precision', isFirstSelected: 1, sourceType: 1, status: 1 },
    ])
    await wizard.load()
    await wizard.loadStep(2)
    const updated = {
      id: '33',
      question: 'Updated question',
      keyword: 'Updated keyword',
      type: '品牌词',
      persona: '老板',
      purchaseStage: '需求发现',
      intent: '比较',
      mainConcern: '精度',
      personaId: 4,
      questionTypeCode: 'brand',
      purchaseStageCode: 'discovery',
      intentCode: 'compare',
      focusCode: 'precision',
    }

    await wizard.updateMonitoringQuestionImmediately(updated)

    expect(api.updateQuestion).toHaveBeenCalledWith(33, {
      questionContent: 'Updated question',
      keyword: 'Updated keyword',
      questionType: 'brand',
      personaId: 4,
      purchaseStage: 'discovery',
      intentType: 'compare',
      focusType: 'precision',
    })
    expect(wizard.questionCandidates.value[0]?.question).toBe('Updated question')
    expect(wizard.questionCandidates.value[0]?.keyword).toBe('Updated keyword')
  })

  it('persists monitoring frequency immediately and updates local state after success', async () => {
    const { useFirstConfigWizard } = await import('./use-first-config-wizard')
    const { useOnboardingStore } = await import('../stores/onboarding')
    const wizard = useFirstConfigWizard()
    const onboarding = useOnboardingStore()
    api.getMarketEntryStatus.mockResolvedValue({ entryStatus: 'CONTINUE_WIZARD', marketId: 12, wizardId: 88, wizardStatus: 1, currentStep: 4, maxReachedStep: 3, stepStatus: null })
    api.saveSchedule.mockResolvedValue(72)

    await wizard.load()
    await wizard.loadStep(3)
    await wizard.saveMonitoringFrequencyImmediately('daily')

    expect(api.saveSchedule).toHaveBeenCalledWith(expect.objectContaining({ scheduleType: 'daily' }))
    expect(onboarding.monitoringFrequency).toBe('daily')
  })

  it('persists an AI platform toggle immediately', async () => {
    const { useFirstConfigWizard } = await import('./use-first-config-wizard')
    const { useOnboardingStore } = await import('../stores/onboarding')
    const wizard = useFirstConfigWizard()
    const onboarding = useOnboardingStore()
    api.selectPlatform.mockResolvedValue(83)

    await wizard.load()
    await wizard.loadStep(3)
    await wizard.saveMonitoringPlatformsImmediately(['chatgpt'])

    expect(api.selectPlatform).toHaveBeenCalledWith({ platform: 'chatgpt' })
    expect(onboarding.monitoringPlatforms).toEqual(['chatgpt'])
  })
})

