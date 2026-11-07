import type { EChartsOption } from 'echarts'
import type { HeatmapCell, TrendSeries } from '../../../data/visibility-monitoring-data'

export function createTrendOption(input: { weeks: readonly string[], series: readonly TrendSeries[] }): EChartsOption {
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const series: NonNullable<EChartsOption['series']> = []

  for (const item of input.series) {
    const data = input.weeks.map((_, index) => {
      const value = item.values[index]
      return typeof value === 'number' && Number.isFinite(value) ? value : null
    })
    series.push({
      name: item.label,
      type: 'line',
      smooth: 0.2,
      showSymbol: false,
      connectNulls: false,
      lineStyle: { width: 2, color: item.color },
      itemStyle: { color: item.color },
      data,
    })
  }

  return {
    animation: !reduceMotion,
    grid: { left: 40, right: 20, top: 24, bottom: 58, containLabel: true },
    tooltip: { trigger: 'axis', valueFormatter: (value: unknown) => `${value ?? '—'}%` },
    legend: { bottom: 0, type: 'scroll', data: input.series.map(item => item.label) },
    xAxis: { type: 'category', boundaryGap: false, data: [...input.weeks], axisTick: { show: false } },
    yAxis: { type: 'value', min: 0, max: 80, axisLabel: { formatter: '{value}%' }, splitLine: { lineStyle: { type: 'dashed' } } },
    series,
  }
}

export function createHeatmapOption(input: { rows: readonly string[], columns: readonly string[], cells: readonly HeatmapCell[] }): EChartsOption {
  const rows = input.rows
  const columns = input.columns
  const data = rows.flatMap((row, rowIndex) => columns.map((column, columnIndex) => {
    const value = input.cells.find(cell => cell.row === row && cell.column === column)?.value
    return { value: [columnIndex, rowIndex, typeof value === 'number' && Number.isFinite(value) ? value : null] as [number, number, number | null] }
  }))
  return {
    animation: !(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
    grid: { left: 8, right: 16, top: 16, bottom: 40, containLabel: true },
    tooltip: { position: 'top', formatter: (params) => {
      const item = Array.isArray(params) ? params[0] : params
      const value = Array.isArray(item?.value) ? item.value : []
      return `${rows[Number(value[1]) ?? -1] ?? ''} · ${columns[Number(value[0]) ?? -1] ?? ''}: ${value[2] ?? '—'}%`
    } },
    xAxis: { type: 'category', data: [...columns], splitArea: { show: true }, axisTick: { show: false } },
    yAxis: { type: 'category', data: [...rows], splitArea: { show: true }, axisTick: { show: false } },
    visualMap: {
      type: 'piecewise',
      show: false,
      pieces: [
        { min: 75, color: '#dcfce7' },
        { min: 50, max: 74, color: '#dbeafe' },
        { min: 25, max: 49, color: '#fef3c7' },
        { max: 24, color: '#fee2e2' },
      ],
    },
    series: [{ name: '提及率', type: 'heatmap', data, label: { show: true, formatter: (params) => {
      const value = Array.isArray(params.value) ? params.value : []
      if (value[2] == null)
        return '—'
      const rate = Number(value[2])
      const tone = rate >= 75 ? 'strong' : rate >= 50 ? 'good' : rate >= 25 ? 'weak' : 'blind'
      return `{${tone}|${rate}%}`
    }, rich: {
      strong: { color: '#166534', fontWeight: 700 },
      good: { color: '#1d4ed8', fontWeight: 700 },
      weak: { color: '#92400e', fontWeight: 700 },
      blind: { color: '#b91c1c', fontWeight: 700 },
    } }, emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,.15)' } } }],
  }
}

