export interface PageResult<T> {
  records: T[]
  total: number
  size: number
  current: number
  pages: number
}

export interface RoundResponseRecord {
  id: number
  roundId: number
  questionId: number
  personaId: number
  platform: string
  collectStatus: number
  failReason: string | null
  isMentioned: number | null
  repeatNo: number
  collectChannel: number
  collectTime: string | null
}

export interface CitationLink {
  url: string
  title: string | null
}

export interface CompetitorHit {
  competitorId: number
  competitorName: string
  isMentioned: number | null
  mentionCount: number | null
  recommendTendency: number | null
  hasRank: number | null
  brandRank: number | null
  rankTotal: number | null
  isOfficialCited: number | null
}

export interface RoundResponseDetail extends RoundResponseRecord {
  modelVersion: string | null
  promptContent: string | null
  responseContent: string | null
  citationLinks: CitationLink[] | null
  htmlSnapshotUrl: string | null
  retryCount: number | null
  isInRecommendDenominator: number | null
  isCitable: number | null
  mentionCount: number | null
  recommendTendency: number | null
  hasRank: number | null
  brandRank: number | null
  rankTotal: number | null
  isOfficialCited: number | null
  factStatus: number | null
  sentiment: number | null
  isCompetitorHit: number | null
  competitorHits: CompetitorHit[] | null
}

export interface RoundResponseQuery {
  pageNum?: number
  pageSize?: number
  questionId?: number
  platform?: string
  collectStatus?: number
  judged?: boolean
}

export interface TrendRound {
  roundId: number
  roundNo: number
  monitorDate: string
  isComparablePrev: number | null
}

export interface TrendPoint {
  mentionRate: number | null
  recommendRate: number | null
  citationRate: number | null
  sovRate: number | null
}

export interface TrendBrandSeries {
  brandType: number
  brandId: number
  brandName: string
  points: Array<TrendPoint | null>
}

export interface MarketTrend {
  rounds: TrendRound[]
  series: TrendBrandSeries[]
}

export interface BrandMetric {
  brandType: number
  brandId: number
  brandName: string
  validAnswerCount: number
  mentionedAnswerCount: number
  mentionTotalCount: number
  mentionRate: number | null
  recommendRate: number | null
  citationRate: number | null
  sovRate: number | null
  avgRank: number | null
  top1Rate: number | null
  top3Rate: number | null
  top5Rate: number | null
  factAccuracyRate: number | null
  mentionVsPrevPp?: number | null
  mentionVsFirstPp?: number | null
  recommendVsPrevPp?: number | null
  recommendVsFirstPp?: number | null
  citeVsPrevPp?: number | null
  citeVsFirstPp?: number | null
  sovVsPrevPp?: number | null
  sovVsFirstPp?: number | null
  prevMonitorDate?: string | null
  firstMonitorDate?: string | null
  sentimentPositiveCount: number | null
  sentimentNeutralCount: number | null
  sentimentNegativeCount: number | null
}

export interface PlatformMetric {
  platform: string
  modelVersion: string | null
  sampleCount: number
  validAnswerCount: number
  mentionedAnswerCount: number
  mentionRate: number | null
  mentionVsPrevPp: number | null
  citedAnswerCount: number
  citationRate: number | null
}

export interface PersonaMetric {
  personaId: number
  personaName: string
  dimType: number
  dimValue: string | null
  dimName: string
  validAnswerCount: number
  mentionedAnswerCount: number
  mentionRate: number | null
  metricLevel: number
}

export interface QuestionHit {
  questionId: number
  questionContent: string
  personaId: number
  personaName: string
  themeId: number | null
  themeName: string | null
  platformHits: string | null
  isCompetitorMentioned: number | null
  competitorNames: string | null
  isOfficialCited: number | null
  brandRank: number | null
  rankTotal: number | null
  trend: number | null
  detailJson: string | null
}

export interface RoundSummary {
  id: number
  roundNo: number
  triggerType: number
  roundStatus: number
  monitorDate: string
  totalSample: number
  startedAt: string | null
}

export interface RoundDetail extends RoundSummary {
  customerId: number
  siteId: number
  marketId: number
  confidenceLevel: string | null
  finishedSampleCount: number
  validSample: number
  judgedCount: number
  pendingJudgeCount: number
  validReturnRate: number | null
  dualSourceRate: number | null
  manualReviewRate: number | null
  manualReviewCount: number
  repeatablePp: number | null
  ciValue: number | null
  finishedAt: string | null
  measurementTier?: 'trend' | 'decision' | null
}

export interface SourceDomainMetric {
  domain: string
  hitQuestionCount: number
  citationCount: number
  platforms: string | null
  isOurMentioned: number | null
  isCompetitorCited: number | null
  competitorNames: string | null
}

export interface SourcePageMetric {
  domain: string
  pageUrl: string
  pageTitle: string | null
  excerptText: string | null
  ownerBrandType: number
  ownerBrandId: number
  citationCount: number
  hitQuestionCount: number
  platforms: string | null
  responseIds: string | null
}

export interface MonitoringSchedule {
  id: number
  customerId?: number
  siteId?: number
  marketId?: number
  scheduleType: 'daily' | 'weekly' | 'monthly'
  executeTime: string
  repeatCount: number
  timezone: string
  enabled: 0 | 1
  nextFireTime: string | null
  lastFireTime: string | null
  lastExecuteStatus: 0 | 1 | 2 | null
  lastRoundId: number | null
}

export interface SaveMonitoringScheduleRequest {
  scheduleType: MonitoringSchedule['scheduleType']
  executeTime: string
  repeatCount: number
}

export {
  getBrandMetrics,
  getMarketTrend,
  getPersonaMetrics,
  getPlatformMetrics,
  getQuestionHits,
  getResponseDetail,
  getRoundDetail,
  getRoundResponses,
  getRounds,
  getSchedule,
  getSourceDomains,
  getSourcePages,
  pauseMonitoring,
  resumeAllMonitoring,
  resumeMonitoring,
  saveSchedule,
  triggerRound,
} from '../mock/monitoring-service'

