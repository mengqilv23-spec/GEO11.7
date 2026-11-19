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
  htmlSnapshot?: string
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

export interface ContentVerificationRound {
  id: string
  label: string
  date: string
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
  roundId: string
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
  roundId: string
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
    roundId: 'r1',
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
    roundId: 'r1',
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
    roundId: 'r1',
    questions: [{
      id: 'VQ-AERO-01',
      question: 'APW 是不是做航空复材切割？',
      intent: '业务范围 / 航空复材',
      monitoringQuestionId: 'q7',
    }],
  },
  {
    taskId: 'T-2407',
    taskName: '钛合金航空结构件页：补充五轴水刀加工边界',
    contentTitle: 'APW Waterjet · Titanium Machining',
    url: 'https://apw.com/en/applications/titanium',
    publishedAt: '2026-09-16',
    revision: 1,
    summary: '面向钛合金航空结构件的水刀加工说明，补充冷切割、无热影响区与五轴加工边界。',
    keyFacts: ['钛合金切割', '航空结构件', '无热影响区', '五轴水刀'],
    roundId: 'r2',
    questions: [{
      id: 'VQ-TI-01',
      question: 'APW 是不是做钛合金切割？',
      intent: '业务范围 / 钛合金',
      monitoringQuestionId: 'q3',
    }],
  },
  {
    taskId: 'T-2408',
    taskName: '高压泵方案页：补充 60,000 PSI 工业应用',
    contentTitle: 'APW Waterjet · 60,000 PSI Pumps',
    url: 'https://apw.com/en/products/high-pressure-pumps',
    publishedAt: '2026-09-16',
    revision: 1,
    summary: '补充 60,000 PSI 高压泵在连续工业切割中的压力稳定性、维护周期与适用场景。',
    keyFacts: ['60,000 PSI', '高压泵', '连续切割', '维护周期'],
    roundId: 'r2',
    questions: [{
      id: 'VQ-PUMP-01',
      question: 'APW 是不是有 60,000 PSI 水刀泵？',
      intent: '产品参数 / 高压泵',
      monitoringQuestionId: 'q5',
    }],
  },
  {
    taskId: 'T-2409',
    taskName: '锥度控制页：补充复杂轮廓精度说明',
    contentTitle: 'APW Waterjet · Taper Compensation',
    url: 'https://apw.com/en/solutions/taper-compensation',
    publishedAt: '2026-09-16',
    revision: 1,
    summary: '补充五轴动态锥度补偿对复杂轮廓、厚板与复材切割精度的作用边界。',
    keyFacts: ['锥度补偿', '五轴联动', '复杂轮廓', '切割精度'],
    roundId: 'r2',
    questions: [{
      id: 'VQ-TAPER-01',
      question: 'APW 是不是有锥度补偿功能？',
      intent: '产品能力 / 锥度补偿',
      monitoringQuestionId: 'q9',
    }],
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
function resultsAtRound(question: MonitoringQuestion, roundId: string): PlatformResult[] {
  return question.batchResults?.[roundId] ?? []
}
function checkedAtRound(question: MonitoringQuestion, roundId: string) {
  return question.samplingBatches.find(batch => batch.id === roundId)?.date ?? ''
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
// Monitoring stores each sampling batch with its own label, but a published
// article is verified once. Show the answer itself without batch narration.
function stripCollectionNote(answer: string) {
  return answer.replace(/^第\s*\d+\s*次采集\s*[（(][^）)]*[）)]\s*[：:]\s*/, '')
}
function buildAnswers(
  results: PlatformResult[],
  contentUrl: string,
  platformOrder: MonitoringPlatformId[],
): PlatformVerificationAnswer[] {
  return results
    .map((result) => {
      const citations = (result.citations ?? []).map(citation => toCitation(citation, contentUrl))
      return {
        platform: result.platform,
        platformLabel: platformLabels.get(result.platform) ?? result.platform,
        state: 'cited' as const,
        answer: stripCollectionNote(result.answer),
        htmlSnapshot: result.htmlSnapshot,
        citations,
      }
    })
    .sort((left, right) => platformOrder.indexOf(left.platform) - platformOrder.indexOf(right.platform))
}

function buildQuestion(
  config: VerificationQuestionConfig,
  contentUrl: string,
  platformOrder: MonitoringPlatformId[],
  roundId: string,
): ContentVerificationQuestion {
  const monitoringQuestion = config.monitoringQuestionId ? monitoringQuestions.get(config.monitoringQuestionId) : undefined
  const results = monitoringQuestion ? resultsAtRound(monitoringQuestion, roundId) : []
  const answers = buildAnswers(results, contentUrl, platformOrder)
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
    config.roundId,
  ))
  const checkedDates = config.questions
    .map(question => question.monitoringQuestionId ? monitoringQuestions.get(question.monitoringQuestionId) : undefined)
    .map(question => question ? checkedAtRound(question, config.roundId) : '')
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
    roundId: config.roundId,
    questions,
    lastChecked: checkedDates.at(-1) ?? '',
    platformCount: new Set(questions.flatMap(question => question.answers.map(answer => answer.platform))).size,
  }
}

export const contentVerificationItems = contentConfigs.map(buildContent)

const roundLabels = ['第一次检测', '第二次检测', '第三次检测', '第四次检测']

function roundLabel(index: number) {
  return roundLabels[index] ?? `第 ${index + 1} 次检测`
}

const roundDates = new Map<string, string>()
for (const question of referenceMonitoringResults.questions) {
  for (const batch of question.samplingBatches)
    roundDates.set(batch.id, batch.date)
}

/**
 * Detection rounds come from the monitoring sampling batches. Only rounds
 * backed by real answers are exposed so a client never sees an empty round.
 */
export const contentVerificationRounds: ContentVerificationRound[] = [...roundDates.entries()]
  .sort(([, left], [, right]) => left.localeCompare(right))
  .map(([id, date], index) => ({ id, label: roundLabel(index), date }))

export function verificationPlatformLabel(platform: MonitoringPlatformId) {
  return platformLabels.get(platform) ?? platform
}
