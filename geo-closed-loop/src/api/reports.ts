export type ApiReportType = 'weekly' | 'monthly' | 'quarterly' | 'latest'

export interface ReportListParams {
  pageNum?: number
  pageSize?: number
}

export interface ReportListItem {
  reportId: number
  reportNo: string
  reportType: ApiReportType
  reportName: string
  reportFocus: string
  reportTags: string
  periodStart: string
  periodEnd: string
  scopeSummary: string
  status: 0 | 1 | 2 | 3
  empty: boolean
  createTime: string
}

export interface ReportListResponse {
  counts: { all: number, weekly: number, monthly: number, quarterly: number, latest: number }
  page: { total: number, pageNum: number, pageSize: number, records: ReportListItem[] }
}

export interface ReportQuotaResponse {
  monthlyLimit: number
  usedCount: number
  residueCount: number | null
  exhausted: boolean
  billingMonth: string
}

export interface GenerateLatestReportRequest {
  siteId: string
  marketId: number
}

export interface GenerateLatestReportResponse {
  taskNo: string
  status: 0 | 1 | 2 | 3 | 4
}

export interface ReportDetailResponse {
  header: {
    reportId: number
    reportName: string
    reportType: ApiReportType
    periodStart: string
    periodEnd: string
    scopeSummary: string
    monitorCadence: string
    personaCount: number
    intentCount: number
    keywordCount: number
    questionCount: number
    platformCount: number
    status: 0 | 1 | 2 | 3
    summary: string
  }
  narratives: Array<{ sceneCode: string, part: string, contentText: string, sort: number }>
  trendPoints: Array<{
    roundId: number
    monitorDate: string
    metricCode: string
    value: number
    numerator: number
    denominator: number
    ciLow: number | null
    ciHigh: number | null
    sort: number
  }>
  ribbon: {
    sovRate: number | null
    competitorGap: {
      label: string
      applicable: boolean
      headCompetitor: string
      ownRank: number | null
      mentionGap: string
      recommendGap: string
    }
    soaBottom: { label: string, value: number | null }
  }
}

export interface ReportMetric {
  metricCode: string
  metricName: string
  dimensionType: string
  dimensionValue: string
  value: number | null
  unit: string
  numerator: number | null
  denominator: number | null
  previousValue: number | null
  changeValue: number | null
  firstValue: number | null
  changeVsFirst: number | null
  sampleCount: number | null
  confidenceLow: number | null
  confidenceHigh: number | null
  extraJson: string
}

export interface ReportPlatform {
  platform: string
  modelVersion: string
  sampleCount: number
  validAnswerCount: number
  citableAnswerCount: number
  mentionedAnswerCount: number
  citedAnswerCount: number
  mentionRate: number | null
  recommendRate: number | null
  citationRate: number | null
  avgRank: number | null
  trendDirection: 'up' | 'down' | 'flat'
  mentionVsPrevPp: number | null
  displayStatus: number
  summary: string
  extraJson: string
}

export interface ReportQuestion {
  id: number
  questionText: string
  questionNo: string
  platform: string
  personaName: string
  themeName: string
  intentName: string
  isMentioned: number
  isRecommended: number
  isOfficialCited: number
  rankValue: number | null
  rankTotal: number | null
  previousRank: number | null
  trendDirection: 'up' | 'down' | 'flat'
  sampleCount: number | null
  validAnswerCount: number | null
  confidenceLow: number | null
  confidenceHigh: number | null
  sentiment: string
  changeType: string
  answerText: string
  platformDetailJson: string
}

export interface PageResponse<T> {
  records: T[]
  total: number
  size: number
  current: number
  pages: number
}

export interface ReportEvidenceResponse {
  credibility: {
    totalSample: number
    validSample: number
    validReturnRate: number | null
    dualSourceRate: number | null
    manualReviewRate: number | null
    manualReviewCount: number
    repeatablePp: number | null
    overallCiPp: number | null
    personaCiJson: string
    iabCheckJson: string
  }
  total: number
  pageNum: number
  pageSize: number
  evidences: Array<{
    id: number
    evidenceType: string
    title: string
    url: string
    domain: string
    evidenceText: string
    platform: string
    capturedAt: string
    sort: number
  }>
}

export interface ReportCompetitorResponse {
  summaryText: string
  positioning: string
  bullets: string[]
  nextPeriod: string
  narrative: { compInsight: string, gapPlatform: string, gapPersonaIntent: string, gapSource: string }
  overallRanks: Array<{
    brandType: number
    brandId: number
    brandName: string
    ownBrand: boolean
    rank: number
    mentionRate: number | null
    mentionNumerator: number | null
    mentionDenominator: number | null
    recommendRate: number | null
    recommendNumerator: number | null
    recommendDenominator: number | null
    citationRate: number | null
    citationNumerator: number | null
    citationDenominator: number | null
  }>
  platformMatrix: Array<ReportCompetitorCell>
  personaIntentMatrix: Array<ReportCompetitorCell>
  sourceCooccurrence: Array<{
    pageUrl: string
    pageTitle: string
    domain: string
    citationCount: number
    platforms: string
    isOurMentioned: number
    competitorNames: string | string[]
  }>
}

export interface ReportCompetitorCell {
  dimValue: string
  brandType: number
  brandId: number
  brandName: string
  metricCode: string
  value: number | null
  numerator: number | null
  denominator: number | null
  sort: number
}

export interface ReportDetailBundle {
  detail: ReportDetailResponse
  metrics: ReportMetric[]
  platforms: ReportPlatform[]
  questions: PageResponse<ReportQuestion>
  sources: Record<string, unknown>
  sourcePages: Record<string, unknown>
  evidence: ReportEvidenceResponse
  competitors: ReportCompetitorResponse
}

export { generateLatestReport, getReportDetailBundle, getReportList, getReportQuota } from '../mock/report-service'

