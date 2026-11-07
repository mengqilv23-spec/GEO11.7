export interface GeoMarket {
  id: number
  marketType: number
  status: number
  marketCountry: string | null
  marketLanguage: string | null
  subSiteName: string | null
}

export interface GeoDictionaryItem {
  dictValue: string
  dictLabel: string
  extra: string | null
  sort: number
}

export interface BuyerPersonaRecord {
  id: number
  personaName: string
  personaType: string
  actualPosition: string | null
  industry: string | null
  companyScale: string | null
  decisionRole: string | null
  purchaseTrigger: string | null
  purchaseBudget: string | null
  purchaseCycle: string | null
  infoChannels: string | null
  commonQuestions?: string | null
  description: string | null
  focusTopics: string[] | null
  purchaseStages: string[] | null
  sourceType: number
  status: number
}

export interface MonitoringQuestionRecord {
  id: number
  questionContent: string
  keyword?: string
  themeId: number | null
  questionType: string
  personaId: number
  purchaseStage: string
  intentType: string
  focusType: string | null
  isFirstSelected: number
  sourceType: number
  status: number
}

export interface SelectedPlatformRecord {
  id: number
  platform: string
  modelVersion: string | null
  enabled: number
  sort: number
}

export interface PersonaSaveInput {
  personaName: string
  personaType: string
  actualPosition?: string
  industry?: string
  companyScale?: string
  decisionRole?: string
  purchaseTrigger?: string
  purchaseBudget?: string
  purchaseCycle?: string
  infoChannels?: string
  commonQuestions?: string
  description?: string
  focusTopics?: string[]
  purchaseStages?: string[]
}

export interface QuestionAddInput {
  questionContent: string
  keyword: string
  questionType: string
  personaId: number
  purchaseStage: string
  intentType: string
  focusType: string
}

export type QuestionUpdateInput = QuestionAddInput

export interface QuestionFirstSelectInput {
  questionIds?: number[]
  candidateIds?: number[]
}

export interface PlatformSelectInput {
  platform: string
  modelVersion?: string
}

export interface MarketThemeRecord {
  id: number
  themeName: string
  searchVolume: number | null
  cpcCost: number | string | null
  competition: number | string | null
  resultCount: number | null
  keywordIntent: string | null
  status: number
}

export interface CompetitorRecord {
  id: number | null
  competitorName: string
  domain: string | null
  aliasNames: string | null
  competitorDesc: string | null
  isCoreSov: number | null
  sourceType: number
  status: number
}

export interface CompetitorSaveInput {
  competitorName: string
  domain?: string
  aliasNames?: string
  competitorDesc?: string
  isCoreSov?: number
}

export interface BrandInfoRecord {
  brandName: string
  industry: string
  siteUrl: string
  aliasNames: string | null
  positioning: string | null
  saved: number
}

export interface BrandInfoSaveInput {
  brandName?: string
  industry?: string
  aliasNames?: string
  positioning?: string
}

export interface BrandProductRecord {
  id: number | null
  lineName: string
  productName: string
  usageScene: string
  sellingPoints: string[] | null
  targetCustomers: string[] | null
  sourceType: number
  isPrimary: number
}

export interface ProductSaveInput {
  lineName: string
  productName: string
  usageScene: string
  sellingPoints?: string[]
  targetCustomers?: string[]
  isPrimary?: number
}

export interface GeoPlanQuota {
  planCode: string
  planName: string
  questionCountLimit: number
  aiPlatformCountLimit: number
  repeatCountLimit: number
  personaCountLimit: number
  competitorCountLimit: number
  themeCountLimit: number
  marketCountLimit: number
  monthlyReportLimit: number
}

export interface ActivePlanRecord {
  id: number
  siteId: number
  planId: number
  quota: GeoPlanQuota
  startDate: string
  endDate: string
  status: number
}

export interface RecommendationRecord {
  id: number
  siteId: number
  marketId: number | null
  recommendType: number
  itemPayload: string
  evidenceJson: string | null
  confidenceScore: number | string | null
  batchNo: string | null
  itemStatus: number
  confirmedBizId: number | null
  confirmedAt: string | null
}

export interface ConfigChangeStatus {
  changeId: number | null
  changeType: number | null
  changeStatus: number | null
  regenStatus: number | null
  pendingMarketIds: number[] | null
  effectiveTime: string | null
  brandModifyLimit: number | null
  brandModifyUsed: number | null
  brandModifyRemaining: number | null
}

export interface BrandModifyInput {
  brandName: string
  industry: string
  aliasNames?: string
  positioning?: string
}

export interface ModifiedQuestionItem {
  questionContent: string
  questionType: string
  themeId?: number | null
  personaId: number
  purchaseStage: string
  intentType: string
  focusType: string
}

export interface ModifyMarketQuestionsInput {
  siteId: number
  questions: ModifiedQuestionItem[]
}

export interface MarketEntryStatus {
  entryStatus: 'CONFIGURED' | 'CONTINUE_WIZARD' | 'FIRST_TIME'
  wizardId: number | null
  marketId: number | null
  wizardStatus: number | null
  currentStep: number | null
  maxReachedStep: number | null
  stepStatus: Record<string, string> | null
}

export interface MarketSwitchResult {
  marketId: number
  siteId: string
}

export interface WizardSnapshot {
  id: number
  status?: number
  currentStep?: number
  [key: string]: unknown
}

export {
  abandonWizard,
  addBrandProduct,
  addCompetitor,
  addPersona,
  addQuestion,
  bindMarket,
  completeBrandStep,
  completePersonaStep,
  completeQuestionStep,
  completeWizardStep,
  confirmRecommendation,
  createWizard,
  deleteBrandProduct,
  deleteCompetitor,
  deletePersona,
  generateCompetitorCandidates,
  generatePositioningCandidate,
  generateProductCandidates,
  generateQuestionCandidates,
  getActivePlan,
  getBrandInfo,
  getBrandProducts,
  getCurrentConfigChange,
  getDictionary,
  getDictionaryLinkRules,
  getMarketCompetitors,
  getMarketEntryStatus,
  getMarketPersonas,
  getMarketPlatforms,
  getMarketQuestions,
  getMarkets,
  getMarketThemes,
  getRecommendationItems,
  ignoreRecommendation,
  importThemesFromSeo,
  jumpWizardStep,
  modifyBrand,
  modifyMarketQuestions,
  removePlatform,
  saveBrandInfo,
  selectPlatform,
  switchMarket,
  updateBrandProduct,
  updateCompetitor,
  updateFirstSelected,
  updatePersona,
  updateQuestion,
} from '../mock/config-service'

