import type { RecommendationRecord } from '../../../api/geo-config'

export interface PotentialCompetitorEvidence {
  responseId: number | null
  platform: string
  date: string
  answer: string
  snapshotUrl: string
}

export interface PotentialCompetitorQuestion {
  questionId: number | null
  question: string
  occurrences: number | null
  platforms: string[]
}

export interface PotentialCompetitor {
  id: number
  name: string
  occurrences: number | null
  questions: PotentialCompetitorQuestion[]
  platforms: string[]
  evidence: PotentialCompetitorEvidence[]
  batchNo: string | null
}

type JsonRecord = Record<string, unknown>

function parseJson(value: string | null): unknown {
  if (!value)
    return null
  try {
    return JSON.parse(value) as unknown
  }
  catch {
    return value
  }
}

function recordOf(value: unknown): JsonRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : null
}

function stringValue(...values: unknown[]): string {
  return values.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim() ?? ''
}

function numberValue(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value))
      return value
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value)))
      return Number(value)
  }
  return null
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value))
    return [...new Set(value.filter((item): item is string => typeof item === 'string').map(item => item.trim()).filter(Boolean))]
  if (typeof value === 'string' && value.trim())
    return [...new Set(value.split(/[、,，;；|]/).map(item => item.trim()).filter(Boolean))]
  return []
}

function arrayField(source: JsonRecord | null, ...keys: string[]): unknown[] {
  for (const key of keys) {
    if (Array.isArray(source?.[key]))
      return source[key] as unknown[]
  }
  return []
}

function evidenceObjects(evidence: unknown): unknown[] {
  if (Array.isArray(evidence))
    return evidence
  const source = recordOf(evidence)
  if (!source)
    return []
  const nested = arrayField(source, 'hitResponses', 'evidence', 'evidences', 'responses', 'samples', 'rawEvidence')
  if (nested.length)
    return nested
  return stringValue(source.answer, source.rawAnswer, source.response, source.originalText, source.content) ? [source] : []
}

function parseEvidence(evidence: unknown): PotentialCompetitorEvidence[] {
  return evidenceObjects(evidence).flatMap((item) => {
    const source = recordOf(item)
    if (!source)
      return []
    const answer = stringValue(source.answer, source.rawAnswer, source.response, source.originalText, source.content, source.excerpt)
    const snapshotUrl = stringValue(source.htmlSnapshotUrl, source.snapshotUrl, source.htmlUrl)
    const responseId = numberValue(source.responseId, source.id)
    if (!answer && !snapshotUrl && responseId === null)
      return []
    return [{
      responseId,
      platform: stringValue(source.platform, source.aiPlatform, source.platformName),
      date: stringValue(source.date, source.createdAt, source.collectTime, source.samplingDate),
      answer,
      snapshotUrl,
    }]
  })
}

function parseQuestions(evidence: unknown, questionLabels: ReadonlyMap<number, string>): PotentialCompetitorQuestion[] {
  const source = recordOf(evidence)
  const hitResponses = arrayField(source, 'hitResponses')
  const rows = hitResponses.length ? hitResponses : arrayField(source, 'questions', 'relatedQuestions', 'monitoringQuestions', 'questionStats')
  const grouped = new Map<string, PotentialCompetitorQuestion>()
  for (const item of rows) {
    const question = recordOf(item)
    if (!question)
      continue
    const questionId = numberValue(question.questionId)
    const name = stringValue(question.question, question.questionContent, question.questionText, question.title, questionId === null ? '' : questionLabels.get(questionId), questionId === null ? '' : `问题 #${questionId}`)
    if (!name)
      continue
    const key = questionId === null ? name : String(questionId)
    const occurrences = numberValue(question.occurrences, question.count, question.hitCount, question.answerCount, question.mentionCount)
    const platforms = stringList(question.platforms ?? question.aiPlatforms ?? question.platform)
    const existing = grouped.get(key)
    if (!existing) {
      grouped.set(key, { questionId, question: name, occurrences, platforms })
      continue
    }
    if (occurrences !== null)
      existing.occurrences = (existing.occurrences ?? 0) + occurrences
    for (const platform of platforms) {
      if (!existing.platforms.includes(platform))
        existing.platforms.push(platform)
    }
  }
  return [...grouped.values()]
}

export function parsePotentialCompetitor(recommendation: RecommendationRecord, questionLabels: ReadonlyMap<number, string> = new Map()): PotentialCompetitor | null {
  const payload = recordOf(parseJson(recommendation.itemPayload))
  if (!payload)
    return null
  const name = stringValue(payload.competitorName, payload.name)
  if (!name)
    return null

  const evidence = parseJson(recommendation.evidenceJson)
  const evidenceRoot = recordOf(evidence)
  const rawEvidence = parseEvidence(evidence)
  const questions = parseQuestions(evidence, questionLabels)
  const platforms = stringList(evidenceRoot?.platforms ?? evidenceRoot?.aiPlatforms)
  for (const item of rawEvidence) {
    if (item.platform && !platforms.includes(item.platform))
      platforms.push(item.platform)
  }
  for (const question of questions) {
    for (const platform of question.platforms) {
      if (!platforms.includes(platform))
        platforms.push(platform)
    }
  }

  return {
    id: recommendation.id,
    name,
    occurrences: numberValue(evidenceRoot?.totalMentionCount, evidenceRoot?.occurrences, evidenceRoot?.answerCount, evidenceRoot?.appearanceCount, payload.occurrences, payload.answerCount),
    questions,
    platforms,
    evidence: rawEvidence,
    batchNo: recommendation.batchNo,
  }
}

export function parsePotentialCompetitors(recommendations: readonly RecommendationRecord[], questionLabels: ReadonlyMap<number, string> = new Map()): PotentialCompetitor[] {
  return recommendations.flatMap((recommendation) => {
    const parsed = parsePotentialCompetitor(recommendation, questionLabels)
    return parsed ? [parsed] : []
  })
}

