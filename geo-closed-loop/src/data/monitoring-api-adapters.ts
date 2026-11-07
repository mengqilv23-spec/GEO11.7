import type { MarketTrend } from '../api/monitoring'

export interface OverviewTrendSeries {
  id: string
  label: string
  color: string
  values: Array<number | null>
}

export interface OverviewTrend {
  weeks: string[]
  series: OverviewTrendSeries[]
}

const metricSeries = [
  { id: 'soa', label: '品牌提及率（SOA）', color: '#2563eb', key: 'mentionRate' },
  { id: 'recommendation', label: '品牌推荐率', color: '#059669', key: 'recommendRate' },
  { id: 'citation', label: '官网引用率', color: '#0891b2', key: 'citationRate' },
  { id: 'sov', label: '声量份额（SOV）', color: '#7c3aed', key: 'sovRate' },
] as const

export function toOverviewTrend(trend: MarketTrend): OverviewTrend {
  const ownBrand = trend.series.find(series => series.brandType === 1)
  if (!ownBrand || trend.rounds.length === 0)
    return { weeks: [], series: [] }

  return {
    weeks: trend.rounds.map(round => round.monitorDate),
    series: metricSeries.map((metric) => {
      const values = trend.rounds.map((_, index) => {
        const point = ownBrand.points[index]
        return point ? point[metric.key] : null
      })
      return { id: metric.id, label: metric.label, color: metric.color, values }
    }),
  }
}

