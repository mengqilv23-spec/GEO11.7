import type { MonitoringPlatformId, MonitoringQuestion, PlatformResult } from './visibility-monitoring-data'
import { referenceMonitoringResults } from './reference-monitoring-results'

export interface BrandCognitionCitation {
  key: string
  url: string
  domain: string
  title: string
  excerpt: string
  isOwned: boolean
  platforms: MonitoringPlatformId[]
}

export interface BrandCognitionPlatformGroup {
  platform: MonitoringPlatformId
  answer: string
  citations: BrandCognitionCitation[]
  ownedCount: number
  thirdPartyCount: number
}

export interface BrandCognitionQuestion {
  id: string
  question: string
  type: MonitoringQuestion['type']
  persona: string
  lastChecked: string
  platforms: MonitoringPlatformId[]
  citations: BrandCognitionCitation[]
  platformGroups: BrandCognitionPlatformGroup[]
  ownedCount: number
  thirdPartyCount: number
  hasCitations: boolean
  hasOwnedCitation: boolean
}

// First release uses the official/owned domain as the ownership boundary.
const ownedDomains = ['apw.com', 'apwwaterjet.com']

function absoluteUrl(value: string) {
  return /^https?:\/\//.test(value) ? value : `https://${value}`
}
function domainOf(value: string) {
  try { return new URL(absoluteUrl(value)).hostname.replace(/^www\./, '') }
  catch { return value.replace(/^www\./, '') }
}
function citationKey(value: string) {
  return value.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').toLowerCase()
}
function isOwnedDomain(domain: string) {
  return ownedDomains.some(owned => domain === owned || domain.endsWith(`.${owned}`))
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
  platform: MonitoringPlatformId,
): BrandCognitionCitation {
  const domain = citation.domain ?? domainOf(citation.url)
  return {
    key: citationKey(citation.url),
    url: absoluteUrl(citation.url),
    domain,
    title: citation.title ?? citation.excerpt.slice(0, 60),
    excerpt: citation.excerpt,
    isOwned: citation.isOwned ?? isOwnedDomain(domain),
    platforms: [platform],
  }
}
function buildQuestion(question: MonitoringQuestion): BrandCognitionQuestion {
  const results = latestResults(question)
  const platformGroups = results.map((result) => {
    const citations = (result.citations ?? []).map(citation => toCitation(citation, result.platform))
    return {
      platform: result.platform,
      answer: result.answer,
      citations,
      ownedCount: citations.filter(citation => citation.isOwned).length,
      thirdPartyCount: citations.filter(citation => !citation.isOwned).length,
    }
  })
  const uniqueCitations = new Map<string, BrandCognitionCitation>()
  for (const group of platformGroups) {
    for (const citation of group.citations) {
      const existing = uniqueCitations.get(citation.key)
      if (existing) {
        if (!existing.platforms.includes(group.platform))
          existing.platforms.push(group.platform)
      }
      else {
        uniqueCitations.set(citation.key, citation)
      }
    }
  }
  const citations = [...uniqueCitations.values()]
  const ownedCount = citations.filter(citation => citation.isOwned).length
  return {
    id: question.id,
    question: question.question,
    type: question.type,
    persona: question.persona,
    lastChecked: latestChecked(question),
    platforms: [...new Set(results.map(result => result.platform))],
    citations,
    platformGroups,
    ownedCount,
    thirdPartyCount: citations.length - ownedCount,
    hasCitations: citations.length > 0,
    hasOwnedCitation: ownedCount > 0,
  }
}

export const brandCognitionQuestions = referenceMonitoringResults.questions.map(buildQuestion)

export const brandCognitionPlatforms = referenceMonitoringResults.platforms.filter(platform => platform.enabled)
