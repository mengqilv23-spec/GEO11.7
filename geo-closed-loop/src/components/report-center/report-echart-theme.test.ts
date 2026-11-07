import type { EChartsOption } from 'echarts'
import { describe, expect, it } from 'vitest'
import { applyReportChartTheme } from './report-echart-theme'

describe('applyReportChartTheme', () => {
  it('uses readable dark axis, legend, tooltip, and grid colors without changing series colors', () => {
    const option = {
      legend: { textStyle: { color: '#64748b', fontSize: 11 } },
      tooltip: { trigger: 'axis', textStyle: { fontSize: 12, color: '#39475a' } },
      xAxis: { axisLabel: { color: '#8291a5' }, splitLine: { lineStyle: { color: '#e8eef5' } } },
      yAxis: [{ axisLabel: { color: '#8291a5' }, axisLine: { lineStyle: { color: '#dbe4ef' } } }],
      series: [{ type: 'line', itemStyle: { color: '#2563eb' }, lineStyle: { color: '#2563eb' } }],
    } satisfies EChartsOption

    expect(applyReportChartTheme(option, true)).toMatchObject({
      legend: { textStyle: { color: '#c1ccda', fontSize: 11 } },
      xAxis: { axisLabel: { color: '#a8b6c8' }, splitLine: { lineStyle: { color: '#344254' } } },
      yAxis: [{ axisLabel: { color: '#a8b6c8' }, axisLine: { lineStyle: { color: '#455469' } } }],
      tooltip: { backgroundColor: '#202b3a', borderColor: '#455469', textStyle: { color: '#e6edf7' } },
      series: [{ type: 'line', itemStyle: { color: '#2563eb' }, lineStyle: { color: '#2563eb' } }],
    })
  })

  it('keeps the existing light palette', () => {
    const option = { xAxis: { axisLabel: { color: '#8291a5' } }, series: [{ type: 'line', lineStyle: { color: '#2563eb' } }] } satisfies EChartsOption

    expect(applyReportChartTheme(option, false)).toEqual(option)
  })
})

