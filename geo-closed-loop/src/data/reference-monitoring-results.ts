import type { CitedPage, MonitoringPlatformId, MonitoringQuestion, PlatformResult, SourceDomain, TrendSeries } from './visibility-monitoring-data'
import raw from './reference/geo-final-922-results.json'
import { visibilityMonitoringData } from './visibility-monitoring-data'

// Only result data from geo-final-922 v132 is reused. Configuration remains API-owned.
const platformId = (name: string): MonitoringPlatformId => name.startsWith('ChatGPT') ? 'chatgpt' : name.startsWith('Perplexity') ? 'perplexity' : name.startsWith('Google') ? 'google-ai' : name === 'Gemini' ? 'gemini' : 'claude'
const rank = (value: string) => value.includes('未提及') ? null : Number(value.match(/\d+/)?.[0]) || null
const competitorsFor = (id: string) => id === 'q1' ? ['Flow', 'OMAX'] : id === 'q2' ? ['Flow'] : id === 'q3' ? ['KMT', 'Flow'] : []
const domainCompetitors: Record<string, string[]> = {
  'compositesworld.com': ['Flow', 'OMAX'], 'reddit.com': ['Flow'], 'apw.com': [], 'thefabricator.com': ['KMT'], 'youtube.com': ['OMAX'],
}

const pages: CitedPage[] = raw.sourcePageTrackingData.map(page => ({
  id: page.id, domainId: page.domain, title: page.title, href: page.href, summary: page.excerpt,
  questionIds: page.questionIds, citations: page.platformCounts.reduce((sum, item) => sum + item.count, 0),
  platforms: page.platformCounts.map(item => platformId(item.name)), ownBrandMentioned: page.mentioned,
  platformStats: page.platformCounts.map(item => ({ platform: platformId(item.name), citationCount: item.count, questionCount: page.questionIds.length })),
}))
const sources: SourceDomain[] = Object.entries(raw.sourceDomainDetails).map(([domain, details]) => ({
  id: domain, domain, questionCount: details.hitQuestions, citationCount: details.citations,
  platforms: details.engineStats.map(item => platformId(item.name)), ownBrandMentioned: details.mentioned,
  competitors: domainCompetitors[domain] ?? [], pageIds: pages.filter(page => page.domainId === domain).map(page => page.id),
  platformStats: details.engineStats.map(item => ({ platform: platformId(item.name), citationCount: item.citations, questionCount: item.questions, pageCount: item.pages })),
}))

const sourceWithoutProtocol = (value: string) => value.replace(/^https?:\/\//, '').replace(/\/$/, '')
const absoluteSourceUrl = (value: string) => /^https?:\/\//.test(value) ? value : `https://${value}`
const sourceDomainOf = (value: string) => {
  try { return new URL(absoluteSourceUrl(value)).hostname.replace(/^www\./, '') }
  catch { return sourceWithoutProtocol(value).split('/')[0]!.replace(/^www\./, '') }
}
function pageForSource(value: string) {
  const normalized = sourceWithoutProtocol(value)
  const lastSegment = normalized.split('/').filter(Boolean).at(-1)
  return pages.find(page => page.href && sourceWithoutProtocol(page.href) === normalized)
    ?? pages.find(page => page.href && sourceWithoutProtocol(page.href).startsWith(`${normalized}/`))
    ?? (lastSegment && !lastSegment.includes('.')
      ? pages.find(page => page.href && sourceWithoutProtocol(page.href).split('/').includes(lastSegment))
      : undefined)
}
function citationView(citation: { source: string, content: string, isMe: boolean }) {
  const page = pageForSource(citation.source)
  const excerpt = citation.content.length > 60 ? `${citation.content.slice(0, 60)}…` : citation.content
  return {
    url: absoluteSourceUrl(citation.source),
    excerpt: citation.content,
    isOwned: citation.isMe,
    title: page?.title ?? (citation.source.includes('/') ? citation.source : excerpt),
    domain: sourceDomainOf(citation.source),
  }
}

type Query = typeof raw.queryMatrixData[number]
function roundResults(query: Query, round: Query['rounds']['r1'] | Query['rounds']['r2']): PlatformResult[] {
  return round.engines.map(engine => ({
    platform: platformId(engine.name), ownBrandMentioned: rank(engine.rank) !== null,
    competitorsMentioned: competitorsFor(query.id), officialSiteCited: round.citationsTable.some(citation => citation.isMe && engine.name.startsWith(citation.engine)),
    htmlSnapshot: engine.htmlSnapshot,
    citations: round.citationsTable.filter(citation => engine.name.startsWith(citation.engine)).map(citationView),
    rank: rank(engine.rank), sentiment: engine.sentiment.includes('正面') ? 'positive' : 'neutral', answer: engine.fullText,
    citedPages: [...new Set(round.citationsTable.filter(citation => engine.name.startsWith(citation.engine)).flatMap(citation => {
      const match = pages.find(page => page.href?.replace(/^https?:\/\//, '') === citation.source)
      return match ? [match.id] : []
    }))],
  }))
}
const questions: MonitoringQuestion[] = raw.queryMatrixData.map(query => ({
  id: query.id, question: query.text, persona: query.persona, keyword: '', type: '业务词', stage: '', intent: '', concern: '',
  platformResults: roundResults(query, query.rounds.r1), competitors: competitorsFor(query.id), officialSiteCited: query.citation,
  rank: rank(query.position), trend: query.trend.includes('上升') ? 'up' : query.trend.includes('下降') ? 'down' : 'flat',
  samplingBatches: Object.keys(query.rounds).map((id, index) => ({ id, date: `2026-09-${index === 0 ? '15' : '17'}`, validResponses: 0, totalResponses: 0, confidenceInterval: 0 })),
  samplingSummary: raw.questionSamplingProfiles[query.id as keyof typeof raw.questionSamplingProfiles],
  batchResults: { r1: roundResults(query, query.rounds.r1), r2: roundResults(query, query.rounds.r2) },
  trendWeeks: query.trendWeeks,
  platformTrends: Object.entries(query.platformTrends).map(([name, values]) => ({ id: platformId(name), label: name, color: ({ ChatGPT: '#2563eb', Perplexity: '#7c3aed', 'Google AI': '#d97706', Gemini: '#059669' } as Record<string, string>)[name]!, values })),
}))
// The source prototype has ten expandable result rows, plus four source-only questions.
// Keep those extra associations without inventing platform answers for them.
const relatedQuestions: MonitoringQuestion[] = Object.entries(raw.sourceQuestionCatalog).map(([id, question]) => questions.find(item => item.id === id) ?? {
  id, question: question.text, persona: question.persona, keyword: '', type: '业务词', stage: '', intent: '', concern: '',
  platformResults: [], competitors: [], officialSiteCited: false, rank: null, trend: 'flat', samplingBatches: [],
})
const series = (key: keyof typeof raw.visibilityTrendViews): TrendSeries[] => raw.visibilityTrendViews[key].series.map(item => ({ id: item.name, label: item.name, color: item.color, values: item.values }))

export const referenceMonitoringResults = {
  ...visibilityMonitoringData,
  weeks: raw.visibilityTrendDates,
  overallSeries: series('overall'), engineSeries: series('engine'), personaSeries: series('persona'), trendSeries: series('competitor'),
  questions, relatedQuestions, sources, citedPages: pages,
}

