import type {
  ActivePlanRecord,
  BrandInfoRecord,
  BrandInfoSaveInput,
  BrandModifyInput,
  BrandProductRecord,
  BuyerPersonaRecord,
  CompetitorRecord,
  CompetitorSaveInput,
  ConfigChangeStatus,
  GeoDictionaryItem,
  GeoMarket,
  MarketEntryStatus,
  MarketSwitchResult,
  MarketThemeRecord,
  ModifyMarketQuestionsInput,
  MonitoringQuestionRecord,
  PersonaSaveInput,
  PlatformSelectInput,
  ProductSaveInput,
  QuestionAddInput,
  QuestionFirstSelectInput,
  QuestionUpdateInput,
  RecommendationRecord,
  SelectedPlatformRecord,
  WizardSnapshot,
} from '../api/geo-config'
import type { MockCompetitor, MockRecommendation } from './state'
import { readMockState, updateMockState } from './repository'

const delay = () => new Promise<void>(resolve => window.setTimeout(resolve, 35))
const clone = <T>(value: T): T => structuredClone(value)
function nextId() {
  const state = updateMockState((draft) => { draft.config.nextId += 1 })
  return state.config.nextId
}
function wizard(): WizardSnapshot {
  const current = readMockState().config.wizard
  return { id: current.id, status: current.entryStatus === 'CONFIGURED' ? 1 : 0, currentStep: current.currentStep, maxReachedStep: current.maxReachedStep }
}

export function normalizeCompetitorIdentity(value: string): string {
  const clean = value.trim().toLowerCase()
  try {
    const url = new URL(clean.includes('://') ? clean : `https://${clean}`)
    return url.hostname.replace(/^www\./, '').replace(/\.$/, '')
  }
  catch {
    return clean.replace(/^www\./, '').replace(/\/$/, '')
  }
}

function competitorKeys(item: Pick<MockCompetitor, 'competitorName' | 'domain' | 'aliasNames'>): string[] {
  return [item.competitorName, item.domain, ...item.aliasNames.split(/[，,;；|]/)].map(normalizeCompetitorIdentity).filter(Boolean)
}

export function getAvailableCompetitorRecommendations(): MockRecommendation[] {
  const { competitors, recommendations } = readMockState().config
  const known = new Set(competitors.flatMap(competitorKeys))
  return recommendations.filter(item => item.recommendationStatus === 'pending' && !competitorKeys(item).some(key => known.has(key)))
}

export async function getMarkets(): Promise<GeoMarket[]> {
  await delay()
  return clone(readMockState().config.markets)
}
export async function switchMarket(marketId: number): Promise<MarketSwitchResult> {
  const state = updateMockState((draft) => { draft.config.activeMarketId = marketId })
  return { marketId, siteId: state.identity.siteId }
}
export async function getMarketEntryStatus(): Promise<MarketEntryStatus> {
  const { wizard: value, activeMarketId } = readMockState().config
  return { entryStatus: value.entryStatus, wizardId: value.id, marketId: activeMarketId, wizardStatus: value.entryStatus === 'CONFIGURED' ? 1 : 0, currentStep: value.currentStep, maxReachedStep: value.maxReachedStep, stepStatus: null }
}
export async function getDictionary(type: string): Promise<GeoDictionaryItem[]> {
  await delay()
  const existing = readMockState().config.dictionaries[type]
  if (existing?.length)
    return clone(existing)
  if (type === 'persona_type') {
    return [
      { dictValue: 'technical_lead', dictLabel: '技术负责人', extra: null, sort: 1 },
      { dictValue: 'procurement_lead', dictLabel: '采购负责人', extra: null, sort: 2 },
      { dictValue: 'production_lead', dictLabel: '生产负责人', extra: null, sort: 3 },
      { dictValue: 'marketing_lead', dictLabel: '运营负责人', extra: null, sort: 4 },
      { dictValue: 'finance_lead', dictLabel: '财务负责人', extra: null, sort: 5 },
      { dictValue: 'executive_sponsor', dictLabel: '企业管理者', extra: null, sort: 6 },
    ]
  }
  const samples: Record<string, string[]> = {
    purchase_stage: ['需求发现', '方案寻找', '供应商评估', '采购决策'],
    question_type: ['品牌词', '业务词', '产品词'],
    intent_type: ['信息', '比较', '决策', '推荐'],
    focus_type: ['技术规格', '方案原理', '采购范围', '报价包含项'],
  }
  return (samples[type] ?? ['其他']).map((dictLabel, index) => ({ dictValue: dictLabel, dictLabel, extra: null, sort: index }))
}
export async function getDictionaryLinkRules(personaValue?: string) {
  await delay()
  return (personaValue ? [{ personaValue, stageValue: '供应商评估', intentValue: '比较', focusValue: '技术规格' }] : [])
}
export async function getMarketPersonas(): Promise<BuyerPersonaRecord[]> {
  await delay()
  return clone(readMockState().config.personas)
}
export async function getMarketQuestions(): Promise<MonitoringQuestionRecord[]> {
  await delay()
  return clone(readMockState().config.questions)
}
export async function getMarketThemes(): Promise<MarketThemeRecord[]> {
  await delay()
  return clone(readMockState().config.themes)
}
export async function getMarketPlatforms(): Promise<SelectedPlatformRecord[]> {
  await delay()
  return clone(readMockState().config.platforms)
}
export async function getMarketCompetitors(): Promise<CompetitorRecord[]> {
  await delay()
  return clone(readMockState().config.competitors)
}
export async function addCompetitor(input: CompetitorSaveInput): Promise<number> {
  const id = nextId()
  updateMockState((draft) => { draft.config.competitors.push({ id, competitorName: input.competitorName, domain: input.domain ?? '', aliasNames: input.aliasNames ?? '', competitorDesc: input.competitorDesc ?? '', isCoreSov: input.isCoreSov ?? 1, sourceType: 1, status: 1 }) })
  return id
}
export async function updateCompetitor(id: number, input: CompetitorSaveInput): Promise<void> {
  updateMockState((draft) => {
    const row = draft.config.competitors.find(item => item.id === id)
    if (row)
      Object.assign(row, input)
  })
}
export async function deleteCompetitor(id: number): Promise<void> { updateMockState((draft) => { draft.config.competitors = draft.config.competitors.filter(item => item.id !== id) }) }
export async function generateCompetitorCandidates(): Promise<void> {
  await delay()
  updateMockState((draft) => {
    for (const item of draft.config.recommendations) {
      if (item.recommendationStatus === 'ignored')
        item.recommendationStatus = 'pending'
    }
  })
}
export async function importThemesFromSeo(): Promise<void> { await delay() }
export async function addPersona(input: PersonaSaveInput): Promise<number> {
  const id = nextId()
  updateMockState((draft) => { draft.config.personas.push({ id, ...input, actualPosition: input.actualPosition ?? '', industry: input.industry ?? '', companyScale: input.companyScale ?? '', decisionRole: input.decisionRole ?? '', purchaseTrigger: input.purchaseTrigger ?? '', purchaseBudget: input.purchaseBudget ?? '', purchaseCycle: input.purchaseCycle ?? '', infoChannels: input.infoChannels ?? '', description: input.description ?? '', focusTopics: input.focusTopics ?? [], purchaseStages: input.purchaseStages ?? [], sourceType: 1, status: 1 }) })
  return id
}
export async function updatePersona(id: number, input: PersonaSaveInput): Promise<void> {
  updateMockState((draft) => {
    const row = draft.config.personas.find(item => item.id === id)
    if (row)
      Object.assign(row, input)
  })
}
export async function deletePersona(id: number): Promise<void> { updateMockState((draft) => { draft.config.personas = draft.config.personas.filter(item => item.id !== id) }) }
export async function completePersonaStep(): Promise<WizardSnapshot> { return completeWizardStep(2) }
export async function generateQuestionCandidates(): Promise<void> {
  await delay()
  updateMockState((draft) => { draft.config.questions.forEach((item) => { item.status = 1 }) })
}
export async function addQuestion(input: QuestionAddInput): Promise<number> {
  const id = nextId()
  updateMockState((draft) => { draft.config.questions.push({ id, ...input, themeId: null, isFirstSelected: 0, sourceType: 1, status: 1 }) })
  return id
}
export async function updateQuestion(id: number, input: QuestionUpdateInput): Promise<void> {
  updateMockState((draft) => {
    const row = draft.config.questions.find(item => item.id === id)
    if (row)
      Object.assign(row, input)
  })
}
export async function updateFirstSelected(input: QuestionFirstSelectInput): Promise<void> {
  const selected = new Set(input.questionIds ?? input.candidateIds ?? [])
  updateMockState((draft) => { draft.config.questions.forEach((item) => { item.isFirstSelected = selected.has(item.id) ? 1 : 0 }) })
}
export async function selectPlatform(input: PlatformSelectInput): Promise<number> {
  const existing = readMockState().config.platforms.find(item => item.platform === input.platform)
  if (existing) {
    updateMockState((draft) => {
      const row = draft.config.platforms.find(item => item.platform === input.platform)
      if (row)
        row.enabled = 1
    })
    return existing.id
  }
  const id = nextId()
  updateMockState((draft) => { draft.config.platforms.push({ id, platform: input.platform, modelVersion: input.modelVersion ?? null, enabled: 1, sort: draft.config.platforms.length + 1 }) })
  return id
}
export async function removePlatform(id: number): Promise<void> { updateMockState((draft) => { draft.config.platforms = draft.config.platforms.filter(item => item.id !== id) }) }
export async function completeQuestionStep(): Promise<WizardSnapshot> { return completeWizardStep(3) }
export async function getBrandInfo(): Promise<BrandInfoRecord> {
  await delay()
  return clone(readMockState().config.brand)
}
export async function getBrandProducts(): Promise<BrandProductRecord[]> {
  await delay()
  return clone(readMockState().config.products)
}
export async function getActivePlan(): Promise<ActivePlanRecord> {
  await delay()
  return { id: 1, siteId: 1001, planId: 3, quota: { planCode: 'pro', planName: '专业版', questionCountLimit: 100, aiPlatformCountLimit: 10, repeatCountLimit: 10, personaCountLimit: 6, competitorCountLimit: 5, themeCountLimit: 20, marketCountLimit: 5, monthlyReportLimit: 5 }, startDate: '2026-01-01', endDate: '2027-01-01', status: 1 }
}
export async function getCurrentConfigChange(): Promise<ConfigChangeStatus> {
  await delay()
  return { changeId: null, changeType: null, changeStatus: null, regenStatus: null, pendingMarketIds: null, effectiveTime: null, brandModifyLimit: 10, brandModifyUsed: 0, brandModifyRemaining: 10 }
}
export async function modifyBrand(input: BrandModifyInput): Promise<void> { await saveBrandInfo(input) }
export async function modifyMarketQuestions(input: ModifyMarketQuestionsInput): Promise<void> { updateMockState((draft) => { draft.config.questions = input.questions.map((item, index) => ({ id: index + 1, ...item, keyword: item.questionContent, themeId: item.themeId ?? null, isFirstSelected: 1, sourceType: 1, status: 1 })) }) }
export async function getRecommendationItems(params: { recommendType?: number, itemStatus?: number } = {}): Promise<RecommendationRecord[]> {
  await delay()
  return getAvailableCompetitorRecommendations().map(item => ({ id: item.recommendationId, siteId: 1001, marketId: readMockState().config.activeMarketId, recommendType: 3, itemPayload: JSON.stringify({ competitorName: item.competitorName, domain: item.domain, aliasNames: item.aliasNames, competitorDesc: item.competitorDesc }), evidenceJson: JSON.stringify({ occurrenceCount: item.occurrenceCount, questionIds: item.questionIds, platformNames: item.platformNames }), confidenceScore: 0.9, batchNo: 'mock-2026-10', itemStatus: 1, confirmedBizId: null, confirmedAt: null })).filter(item => params.recommendType === undefined || item.recommendType === params.recommendType).filter(item => params.itemStatus === undefined || item.itemStatus === params.itemStatus)
}
export async function bindMarket(marketId: number): Promise<void> { await switchMarket(marketId) }
export async function saveBrandInfo(input: BrandInfoSaveInput): Promise<void> { updateMockState((draft) => { Object.assign(draft.config.brand, input, { saved: 1 }) }) }
export async function addBrandProduct(input: ProductSaveInput): Promise<number> {
  const id = nextId()
  updateMockState((draft) => { draft.config.products.push({ id, ...input, sellingPoints: input.sellingPoints ?? [], targetCustomers: input.targetCustomers ?? [], sourceType: 1, isPrimary: input.isPrimary ?? 0 }) })
  return id
}
export async function updateBrandProduct(id: number, input: ProductSaveInput): Promise<void> {
  updateMockState((draft) => {
    const row = draft.config.products.find(item => item.id === id)
    if (row)
      Object.assign(row, input)
  })
}
export async function deleteBrandProduct(id: number): Promise<void> { updateMockState((draft) => { draft.config.products = draft.config.products.filter(item => item.id !== id) }) }
export async function generateProductCandidates(): Promise<void> { await delay() }
export async function generatePositioningCandidate(): Promise<void> {
  await delay()
  updateMockState((draft) => { draft.config.brand.positioning = '工业水刀切割系统与解决方案品牌，服务航空与复合材料制造商。' })
}
export async function completeBrandStep(): Promise<WizardSnapshot> { return completeWizardStep(2) }
export async function confirmRecommendation(itemId: number): Promise<number> {
  const state = readMockState()
  const candidate = state.config.recommendations.find(item => item.recommendationId === itemId || item.id === itemId)
  if (!candidate)
    return 0
  const existing = state.config.competitors.find(item => competitorKeys(item).some(key => competitorKeys(candidate).includes(key)))
  if (existing) {
    updateMockState((draft) => {
      const item = draft.config.recommendations.find(record => record.id === candidate.id)
      if (item)
        item.recommendationStatus = 'accepted'
    })
    return existing.id
  }
  const id = nextId()
  updateMockState((draft) => {
    const item = draft.config.recommendations.find(record => record.id === candidate.id)
    if (item)
      item.recommendationStatus = 'accepted'
    draft.config.competitors.push({ id, competitorName: candidate.competitorName, domain: candidate.domain, aliasNames: candidate.aliasNames, competitorDesc: candidate.competitorDesc, isCoreSov: 1, sourceType: 1, status: 1 })
  })
  return id
}
export async function ignoreRecommendation(id: number): Promise<void> {
  updateMockState((draft) => {
    const item = draft.config.recommendations.find(record => record.id === id)
    if (item)
      item.recommendationStatus = 'ignored'
  })
}
export async function createWizard(): Promise<WizardSnapshot> {
  updateMockState((draft) => {
    draft.config.wizard.entryStatus = 'CONTINUE_WIZARD'
    draft.config.wizard.currentStep = 1
    draft.config.wizard.maxReachedStep = 1
  })
  return wizard()
}
export async function abandonWizard(): Promise<void> { updateMockState((draft) => { draft.config.wizard.entryStatus = 'FIRST_TIME' }) }
export async function completeWizardStep(stepNo: number): Promise<WizardSnapshot> {
  updateMockState((draft) => {
    draft.config.wizard.currentStep = Math.max(1, Math.min(4, stepNo + 1))
    draft.config.wizard.maxReachedStep = Math.max(draft.config.wizard.maxReachedStep, stepNo)
    if (stepNo >= 3)
      draft.config.wizard.entryStatus = 'CONFIGURED'
  })
  return wizard()
}
export async function jumpWizardStep(stepNo: number): Promise<WizardSnapshot> {
  updateMockState((draft) => { draft.config.wizard.currentStep = Math.max(1, Math.min(stepNo, draft.config.wizard.maxReachedStep)) })
  return wizard()
}

