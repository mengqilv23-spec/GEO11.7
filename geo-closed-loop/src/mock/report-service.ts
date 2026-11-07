import type { GenerateLatestReportRequest, GenerateLatestReportResponse, ReportDetailBundle, ReportListItem, ReportListParams, ReportListResponse, ReportQuotaResponse } from '../api/reports'
import type { ReportRecord } from '../data/report-center-data'
import { createDemoReport } from '../data/report-center-data'
import { readMockState, updateMockState } from './repository'

const reportTypeCode = { weekly: 1, monthly: 2, quarterly: 3, adhoc: 4 } as const
export function mockReportId(report: ReportRecord): number {
  const dateDigits = report.date.replaceAll('-', '').slice(-8)
  return Number(`${reportTypeCode[report.type]}${dateDigits}`)
}
export function findMockReportById(id: string | number): ReportRecord | undefined {
  return readMockState().reports.items.find(item => mockReportId(item) === Number(id))
}
function toListItem(report: ReportRecord): ReportListItem {
  const date = `${report.date}T00:00:00`
  const type = report.type === 'adhoc' ? 'latest' : report.type
  const status = report.status === 'generated' ? 1 : report.status === 'failed' ? 2 : report.status === 'archived' ? 3 : 0
  return { reportId: mockReportId(report), reportNo: report.id, reportType: type, reportName: report.title, reportFocus: report.summary, reportTags: JSON.stringify(report.tags), periodStart: date, periodEnd: date, scopeSummary: report.scopeSummary ?? '德国 · 德语', status, empty: report.empty ?? false, createTime: date }
}
export async function getReportList(params: ReportListParams): Promise<ReportListResponse> {
  const records = [...readMockState().reports.items].sort((left, right) => right.date.localeCompare(left.date)).map(toListItem)
  const pageNum = params.pageNum ?? 1
  const pageSize = params.pageSize ?? 20
  const count = (type: string) => records.filter(item => type === 'all' || item.reportType === type).length
  return { counts: { all: records.length, weekly: count('weekly'), monthly: count('monthly'), quarterly: count('quarterly'), latest: count('latest') }, page: { total: records.length, pageNum, pageSize, records: records.slice((pageNum - 1) * pageSize, pageNum * pageSize) } }
}
export async function getReportQuota(_siteId: string): Promise<ReportQuotaResponse> {
  const state = readMockState()
  const usedCount = Math.max(0, 2 - state.reports.quota)
  return { monthlyLimit: 2, usedCount, residueCount: state.reports.quota, exhausted: state.reports.quota <= 0, billingMonth: new Date().toISOString().slice(0, 7) }
}
export async function generateLatestReport(_request: GenerateLatestReportRequest): Promise<GenerateLatestReportResponse> {
  const state = readMockState()
  const result = createDemoReport(state.reports.items, state.reports.quota)
  if (!result.report)
    throw new Error('本月报告额度已用完')
  updateMockState((draft) => {
    draft.reports.items = result.reports
    draft.reports.quota = result.quota
  })
  return { taskNo: `MOCK-${mockReportId(result.report)}`, status: 2 }
}
export async function getReportDetailBundle(reportId: number): Promise<ReportDetailBundle> {
  const report = findMockReportById(reportId)
  if (!report)
    throw new Error('未找到这份报告')
  // The detail screen renders its local report profile directly; this empty contract keeps legacy callers local too.
  return { detail: { header: { reportId, reportName: report.title, reportType: report.type === 'adhoc' ? 'latest' : report.type, periodStart: report.date, periodEnd: report.date, scopeSummary: report.scopeSummary ?? '德国 · 德语', monitorCadence: '每周', personaCount: 3, intentCount: 4, keywordCount: 5, questionCount: 67, platformCount: 5, status: 1, summary: report.summary }, narratives: [], trendPoints: [], ribbon: { sovRate: 31, competitorGap: { label: '与领先品牌差距', applicable: true, headCompetitor: 'Flow', ownRank: 2, mentionGap: '14pp', recommendGap: '13pp' }, soaBottom: { label: '品牌提及率', value: 42 } } }, metrics: [], platforms: [], questions: { records: [], total: 0, size: 10, current: 1, pages: 0 }, sources: {}, sourcePages: {}, evidence: { credibility: { totalSample: 1200, validSample: 1169, validReturnRate: 97.4, dualSourceRate: 91, manualReviewRate: 96, manualReviewCount: 62, repeatablePp: 3.1, overallCiPp: 2.8, personaCiJson: '{}', iabCheckJson: '{}' }, total: 0, pageNum: 1, pageSize: 10, evidences: [] }, competitors: { summaryText: '', positioning: '', bullets: [], nextPeriod: '', narrative: { compInsight: '', gapPlatform: '', gapPersonaIntent: '', gapSource: '' }, overallRanks: [], platformMatrix: [], personaIntentMatrix: [], sourceCooccurrence: [] } } as ReportDetailBundle
}

