import { describe, expect, it } from 'vitest'
import { visibilityMonitoringData } from './visibility-monitoring-data'

describe('visibility monitoring demo data', () => {
  it('provides twelve weekly points and ten question rows', () => {
    expect(visibilityMonitoringData.weeks).toHaveLength(12)
    expect(visibilityMonitoringData.questions).toHaveLength(10)
    expect(visibilityMonitoringData.questions[0]?.id).toBe('Q01')
  })

  it('matches representative screenshot metrics and labels', () => {
    expect(visibilityMonitoringData.overview.observations).toBe(1200)
    expect(visibilityMonitoringData.reliability.validResponseRate).toBe(97.4)
    expect(visibilityMonitoringData.reliability.dualSourceAgreement).toBe(91)
    expect(visibilityMonitoringData.reliability.manualReviewAgreement).toBe(96)
    expect(visibilityMonitoringData.competitors.filter(item => !item.ownBrand).map(item => item.name)).toEqual(['Flow', 'OMAX', 'KMT'])
  })

  it('uses unique IDs and finite twelve-point series', () => {
    const ids = visibilityMonitoringData.questions.map(question => question.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const series of visibilityMonitoringData.trendSeries) {
      expect(series.values).toHaveLength(12)
      expect(series.values.every(Number.isFinite)).toBe(true)
    }
  })
})

