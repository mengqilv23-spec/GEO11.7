import type { EChartsOption } from 'echarts'

interface ChartTrendSeries {
  id: string
  label: string
  color: string
  values: readonly (number | null)[]
}

export function createOverviewTrendOption(input: { weeks: readonly string[], series: readonly ChartTrendSeries[] }): EChartsOption {
  const startIndex = Math.max(0, input.weeks.length - 7)
  const weeks = input.weeks.slice(startIndex)
  const series = input.series.map(item => ({
    name: item.label,
    type: 'line' as const,
    smooth: 0.24,
    showSymbol: false,
    connectNulls: false,
    lineStyle: { width: 3, color: item.color },
    itemStyle: { color: item.color },
    data: weeks.map((_, index) => {
      const value = item.values[startIndex + index]
      return typeof value === 'number' && Number.isFinite(value) ? value : null
    }),
  }))

  return {
    animation: !(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
    grid: { left: 42, right: 20, top: 18, bottom: 48, containLabel: true },
    tooltip: { trigger: 'axis', valueFormatter: (value: unknown) => `${value ?? '—'}%` },
    legend: { bottom: 0, data: series.map(item => item.name) },
    xAxis: { type: 'category', boundaryGap: false, data: weeks, axisTick: { show: false } },
    yAxis: { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%' }, splitLine: { lineStyle: { type: 'dashed' } } },
    series,
  }
}

