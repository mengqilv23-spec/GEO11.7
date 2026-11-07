import type { MonitoringPlatformId, SourceDomain } from '../../../data/visibility-monitoring-data'

export interface SourceSummary {
  platforms: MonitoringPlatformId[]
  ownBrandMentioned: boolean
  competitors: string[]
}

export function getSourceSummary(source: SourceDomain): SourceSummary {
  return {
    platforms: [...new Set(source.platforms)],
    ownBrandMentioned: source.ownBrandMentioned,
    competitors: [...new Set(source.competitors)],
  }
}

