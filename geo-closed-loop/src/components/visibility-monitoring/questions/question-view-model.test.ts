import { describe, expect, it } from 'vitest'
import { visibilityMonitoringData } from '../../../data/visibility-monitoring-data'
import { getQuestionSummary } from './question-view-model'

describe('getQuestionSummary', () => {
  it('aggregates platform hits, rates, rank, sentiment and confidence', () => {
    const summary = getQuestionSummary(visibilityMonitoringData.questions[0]!)
    expect(summary.platformHits).toBe(2)
    expect(summary.ownMentionRate).toBe(67)
    expect(summary.citationRate).toBe(67)
    expect(summary.averageRank).toBe(2.5)
    expect(summary.sentiment.positive).toBe(2)
    expect(summary.competitors).toEqual(['Flow', 'OMAX'])
    expect(summary.confidenceInterval).toBe(7)
  })

  it('handles absent platform responses, ranks and batches', () => {
    const summary = getQuestionSummary({ ...visibilityMonitoringData.questions[0]!, platformResults: [], samplingBatches: [], rank: null })
    expect(summary.platformHits).toBe(0)
    expect(summary.averageRank).toBeNull()
    expect(summary.confidenceInterval).toBeNull()
  })
})

