import { describe, expect, it } from 'vitest'
import { visibilityMonitoringData } from '../../../data/visibility-monitoring-data'
import { getSourceSummary } from './source-view-model'

describe('getSourceSummary', () => {
  it('summarizes domain associations', () => {
    expect(getSourceSummary(visibilityMonitoringData.sources[0]!)).toEqual({ platforms: ['chatgpt', 'perplexity', 'google-ai'], ownBrandMentioned: false, competitors: ['Flow', 'OMAX', 'KMT'] })
  })

  it('keeps missing associations empty', () => {
    expect(getSourceSummary({ ...visibilityMonitoringData.sources[0]!, platforms: [], competitors: [] })).toEqual({ platforms: [], ownBrandMentioned: false, competitors: [] })
  })
})

