import type { MonitoringPlatformId, MonitoringQuestion, PlatformResult } from './visibility-monitoring-data'
import { referenceMonitoringResults } from './reference-monitoring-results'

export type ContentVerificationState = 'cited'
export type QuestionVerificationState = 'cited' | 'pending'
export type PlatformVerificationState = 'cited'

export interface ContentVerificationCitation {
  key: string
  title: string
  url: string
  domain: string
  excerpt: string
  isPrimary: boolean
}

export interface PlatformVerificationAnswer {
  platform: MonitoringPlatformId
  platformLabel: string
  state: PlatformVerificationState
  answer: string
  citations: ContentVerificationCitation[]
}

export interface ContentVerificationQuestion {
  id: string
  question: string
  intent: string
  state: QuestionVerificationState
  answers: PlatformVerificationAnswer[]
  citationCount: number
  primaryCitationCount: number
}

export interface ContentVerificationItem {
  taskId: string
  taskName: string
  contentTitle: string
  url: string
  publishedAt: string
  revision: number
  summary: string
  keyFacts: string[]
  status: ContentVerificationState
  questions: ContentVerificationQuestion[]
  lastChecked: string
  platformCount: number
}

interface VerificationQuestionConfig {
  id: string
  question: string
  intent: string
  monitoringQuestionId?: string
}

interface ContentVerificationConfig {
  taskId: string
  taskName: string
  contentTitle: string
  url: string
  publishedAt: string
  revision: number
  summary: string
  keyFacts: string[]
  questions: VerificationQuestionConfig[]
}

const contentConfigs: ContentVerificationConfig[] = [
  {
    taskId: 'T-2404',
    taskName: '碳纤维方案页：补充无热影响区与 25mm 工艺参数',
    contentTitle: 'APW Waterjet · Carbon Fiber Solutions',
    url: 'https://apw.com/en/solutions/carbon-fiber',
    publishedAt: '2026-09-12',
    revision: 2,
    summary: '面向 CFRP 的五轴磨料水刀方案，补充无热影响区、25mm 工艺参数和分层控制说明。',
    keyFacts: ['五轴磨料水刀', '25 mm CFRP', 'Ra ≤ 3.2 µm', '无热影响区', '分层控制'],
    questions: [{
      id: 'VQ-CF-01',
      question: 'APW 是不是有五轴水刀系统？',
      intent: '产品存在性 / 五轴水刀',
      monitoringQuestionId: 'q1',
    }],
  },
  {
    taskId: 'T-2405',
    taskName: '水刀 vs 激光对比页：补充边缘质量与适用边界',
    contentTitle: 'APW Waterjet · Waterjet vs Laser',
    url: 'https://apw.com/en/compare/waterjet-laser',
    publishedAt: '2026-09-13',
    revision: 1,
    summary: '对比水刀与激光切割碳纤维的边缘质量、热影响和适用场景，补充工艺选择边界。',
    keyFacts: ['冷切割', '无热影响区', '边缘质量', '适用厚度与场景'],
    questions: [{
      id: 'VQ-CF-02',
      question: 'APW 是不是做碳纤维切割？',
      intent: '业务范围 / 碳纤维切割',
      monitoringQuestionId: 'q2',
    }],
  },
  {
    taskId: 'T-2406',
    taskName: '航空应用页：补充材料适用范围与服务边界',
    contentTitle: 'APW Waterjet · Aerospace Applications',
    url: 'https://apw.com/en/applications/aerospace',
    publishedAt: '2026-09-14',
    revision: 1,
    summary: '补充航空复材、钛合金等材料适用范围，以及服务范围、响应时效和现场支持的确认边界。',
    keyFacts: ['航空复材', '钛合金', '材料适用范围', '服务边界'],
    questions: [
      {
        id: 'VQ-AERO-01',
        question: 'APW 是不是做航空复材切割？',
        intent: '业务范围 / 航空复材',
        monitoringQuestionId: 'q7',
      },
      {
        id: 'VQ-AERO-02',
        question: 'APW 是不是做钛合金切割？',
        intent: '业务范围 / 钛合金',
        monitoringQuestionId: 'q3',
      },
    ],
  },
]

const platformLabels = new Map(referenceMonitoringResults.platforms.map(platform => [platform.id, platform.label]))
const monitoringQuestions = new Map(
  [...referenceMonitoringResults.questions, ...referenceMonitoringResults.relatedQuestions]
    .map(question => [question.id, question]),
)

function absoluteUrl(value: string) {
  return /^https?:\/\//.test(value) ? value : `https://${value}`
}
function normalizeUrl(value: string) {
  return absoluteUrl(value)
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
    .toLowerCase()
}
function domainOf(value: string) {
  try {
    return new URL(absoluteUrl(value)).hostname.replace(/^www\./, '')
  }
  catch {
    return value.replace(/^https?:\/\//, '').split('/')[0]!.replace(/^www\./, '')
  }
}
function citationKey(value: string) {
  return normalizeUrl(value)
}
function citationMatchesOfficialSite(citationUrl: string, contentUrl: string) {
  if (!contentUrl)
    return false
  const siteDomain = domainOf(contentUrl)
  const citationDomain = domainOf(citationUrl)
  return citationDomain === siteDomain || citationDomain.endsWith(`.${siteDomain}`)
}
function latestResults(question: MonitoringQuestion): PlatformResult[] {
  const batchIds = Object.keys(question.batchResults ?? {})
  const latestId = batchIds.at(-1)
  return latestId ? question.batchResults![latestId]! : question.platformResults
}
function latestChecked(question: MonitoringQuestion) {
  return question.samplingBatches.at(-1)?.date ?? ''
}
function toCitation(
  citation: NonNullable<PlatformResult['citations']>[number],
  contentUrl: string,
): ContentVerificationCitation {
  const url = absoluteUrl(citation.url)
  return {
    key: citationKey(url),
    title: citation.title ?? citation.excerpt.slice(0, 60),
    url,
    domain: citation.domain ?? domainOf(url),
    excerpt: citation.excerpt,
    isPrimary: citationMatchesOfficialSite(url, contentUrl),
  }
}
function buildQuestion(
  config: VerificationQuestionConfig,
  contentUrl: string,
  platformOrder: MonitoringPlatformId[],
): ContentVerificationQuestion {
  const monitoringQuestion = config.monitoringQuestionId ? monitoringQuestions.get(config.monitoringQuestionId) : undefined
  const results = monitoringQuestion ? latestResults(monitoringQuestion) : []
  const answers = results
    .map((result) => {
      const citations = (result.citations ?? []).map(citation => toCitation(citation, contentUrl))
      return {
        platform: result.platform,
        platformLabel: platformLabels.get(result.platform) ?? result.platform,
        state: 'cited' as const,
        answer: result.answer,
        citations,
      }
    })
    .sort((left, right) => platformOrder.indexOf(left.platform) - platformOrder.indexOf(right.platform))
  const primaryCitationCount = answers.reduce((count, answer) => count + answer.citations.filter(citation => citation.isPrimary).length, 0)
  const citationCount = answers.reduce((count, answer) => count + answer.citations.length, 0)
  const state: QuestionVerificationState = answers.length === 0 ? 'pending' : 'cited'
  return {
    id: config.id,
    question: config.question,
    intent: config.intent,
    state,
    answers,
    citationCount,
    primaryCitationCount,
  }
}
function buildContent(config: ContentVerificationConfig): ContentVerificationItem {
  const questions = config.questions.map(question => buildQuestion(
    question,
    config.url,
    referenceMonitoringResults.platforms.filter(platform => platform.enabled).map(platform => platform.id),
  ))
  const checkedDates = questions
    .map(question => config.questions.find(item => item.id === question.id)?.monitoringQuestionId)
    .map(id => id ? monitoringQuestions.get(id) : undefined)
    .map(question => question ? latestChecked(question) : '')
    .filter(Boolean)
    .sort()
  return {
    taskId: config.taskId,
    taskName: config.taskName,
    contentTitle: config.contentTitle,
    url: config.url,
    publishedAt: config.publishedAt,
    revision: config.revision,
    summary: config.summary,
    keyFacts: config.keyFacts,
    status: 'cited',
    questions,
    lastChecked: checkedDates.at(-1) ?? '',
    platformCount: new Set(questions.flatMap(question => question.answers.map(answer => answer.platform))).size,
  }
}

export const contentVerificationItems = contentConfigs.map(buildContent)

export function verificationPlatformLabel(platform: MonitoringPlatformId) {
  return platformLabels.get(platform) ?? platform
}
