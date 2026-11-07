import type { MonitoringQuestion } from '../../../data/visibility-monitoring-data'

export interface QuestionSummary {
  platformHits: number
  ownMentionRate: number
  citationRate: number
  averageRank: number | null
  sentiment: { positive: number, neutral: number, negative: number }
  competitors: string[]
  confidenceInterval: number | null
}

export function getQuestionSummary(question: MonitoringQuestion): QuestionSummary {
  const results = question.platformResults
  const average = (values: number[]) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0
  const ranks = results.flatMap(result => result.rank === null ? [] : [result.rank])
  return {
    platformHits: results.filter(result => result.ownBrandMentioned).length,
    ownMentionRate: results.length ? Math.round(results.filter(result => result.ownBrandMentioned).length / results.length * 100) : 0,
    citationRate: results.length ? Math.round(results.filter(result => result.officialSiteCited).length / results.length * 100) : 0,
    averageRank: ranks.length ? Number((ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length).toFixed(1)) : null,
    sentiment: {
      positive: results.filter(result => result.sentiment === 'positive').length,
      neutral: results.filter(result => result.sentiment === 'neutral').length,
      negative: results.filter(result => result.sentiment === 'negative').length,
    },
    competitors: [...new Set(question.competitors)],
    confidenceInterval: question.samplingBatches.length ? average(question.samplingBatches.map(batch => batch.confidenceInterval)) : null,
  }
}

