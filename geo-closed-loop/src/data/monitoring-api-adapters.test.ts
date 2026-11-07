import type { MarketTrend } from '../api/monitoring'
import { describe, expect, it } from 'vitest'
import { toOverviewTrend } from './monitoring-api-adapters'

describe('monitoring API adapters', () => {
  it('maps the own-brand metric series to date-aligned chart series and preserves missing values', () => {
    const trend: MarketTrend = {
      rounds: [
        { roundId: 1, roundNo: 1, monitorDate: '2026-10-01', isComparablePrev: null },
        { roundId: 2, roundNo: 2, monitorDate: '2026-10-08', isComparablePrev: 1 },
      ],
      series: [{
        brandType: 1,
        brandId: 0,
        brandName: 'APW',
        points: [
          { mentionRate: 35, recommendRate: null, citationRate: 12, sovRate: 60 },
          { mentionRate: 42, recommendRate: 28, citationRate: 17, sovRate: 67 },
        ],
      }, {
        brandType: 2,
        brandId: 8,
        brandName: 'Competitor',
        points: [null, null],
      }],
    }

    expect(toOverviewTrend(trend)).toEqual({
      weeks: ['2026-10-01', '2026-10-08'],
      series: [
        { id: 'soa', label: '品牌提及率（SOA）', color: '#2563eb', values: [35, 42] },
        { id: 'recommendation', label: '品牌推荐率', color: '#059669', values: [null, 28] },
        { id: 'citation', label: '官网引用率', color: '#0891b2', values: [12, 17] },
        { id: 'sov', label: '声量份额（SOV）', color: '#7c3aed', values: [60, 67] },
      ],
    })
  })

  it('returns empty chart data when the API has no rounds or own-brand series', () => {
    expect(toOverviewTrend({ rounds: [], series: [] })).toEqual({ weeks: [], series: [] })
  })
})

