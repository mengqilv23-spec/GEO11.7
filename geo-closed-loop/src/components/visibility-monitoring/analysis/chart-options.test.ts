import { describe, expect, it } from 'vitest'
import { createHeatmapOption, createTrendOption } from './chart-options'

describe('visibility chart options', () => {
  it('normalizes missing, invalid and mismatched trend points', () => {
    const option = createTrendOption({
      weeks: ['W-1', '本周'],
      series: [{ id: 'a', label: 'APW', color: '#0f766e', values: [42, Number.NaN, 55] }],
    })
    const series = option.series as Array<{ name: string, data: Array<number | null> }>
    expect(series[0]?.name).toBe('APW')
    expect(series[0]?.data).toEqual([42, null])
  })

  it('shows only observed trend values and never invents an interval band', () => {
    const option = createTrendOption({
      weeks: ['W-1', '本周'],
      series: [{ id: 'apw', label: 'APW', color: '#0f766e', values: [42, 44] }],
    })
    const series = option.series as Array<{ name: string, data: Array<number | null>, areaStyle?: unknown }>
    expect(series).toHaveLength(1)
    expect(series[0]?.data).toEqual([42, 44])
    expect(series[0]?.areaStyle).toBeUndefined()
  })

  it('supports empty trend and heatmap datasets', () => {
    expect(createTrendOption({ weeks: [], series: [] }).series).toEqual([])
    expect((createHeatmapOption({ rows: [], columns: [], cells: [] }).series as unknown[])).toHaveLength(1)
  })

  it('omits non-finite heatmap values', () => {
    const option = createHeatmapOption({ rows: ['主管'], columns: ['主题'], cells: [{ row: '主管', column: '主题', value: Number.POSITIVE_INFINITY }] })
    const series = option.series as Array<{ data: Array<{ value: [number, number, number | null] }> }>
    expect(series[0]?.data[0]?.value[2]).toBeNull()
  })

  it('keeps heatmap plots aligned toward the left side of the card', () => {
    const option = createHeatmapOption({ rows: ['主管'], columns: ['主题'], cells: [] })
    expect(option.grid).toMatchObject({ left: 8, containLabel: true })
  })
})

