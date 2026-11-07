import { describe, expect, it } from 'vitest'
import { createOverviewTrendOption } from './overview-chart-options'

describe('createOverviewTrendOption', () => {
  it('keeps the latest seven periods and aligns every series with the axis', () => {
    const option = createOverviewTrendOption({
      weeks: ['W-8', 'W-7', 'W-6', 'W-5', 'W-4', 'W-3', 'W-2', 'W-1', '本周'],
      series: [
        { id: 'soa', label: '品牌提及率（SOA）', color: '#2563eb', values: [20, 21, 22, 23, 24, 25, 26, 27, 28] },
        { id: 'sov', label: '声量份额（SOV）', color: '#059669', values: [10, 11, 12, 13, 14, 15, 16, Number.NaN] },
      ],
    })

    const axis = option.xAxis as { data: string[] }
    const series = option.series as Array<{ name: string, data: Array<number | null> }>
    const legend = option.legend as { data: string[] }
    const yAxis = option.yAxis as { max: number }

    expect(axis.data).toEqual(['W-6', 'W-5', 'W-4', 'W-3', 'W-2', 'W-1', '本周'])
    expect(series.map(item => item.name)).toEqual(['品牌提及率（SOA）', '声量份额（SOV）'])
    expect(series.every(item => item.data.length === axis.data.length)).toBe(true)
    expect(series[1]?.data.at(-1)).toBeNull()
    expect(series[1]?.data[0]).toBe(12)
    expect(legend.data).toEqual(series.map(item => item.name))
    expect(yAxis.max).toBe(100)
  })
})

