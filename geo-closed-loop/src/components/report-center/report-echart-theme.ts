import type { EChartsOption } from 'echarts'

const darkColors = {
  axisLabel: '#a8b6c8',
  axisLine: '#455469',
  grid: '#344254',
  legend: '#c1ccda',
  tooltip: '#202b3a',
  tooltipText: '#e6edf7',
}

function withAxisTheme(axis: unknown): unknown {
  if (Array.isArray(axis))
    return axis.map(withAxisTheme)
  if (!axis || typeof axis !== 'object')
    return axis

  const config = axis as Record<string, unknown>
  const axisLabel = config.axisLabel && typeof config.axisLabel === 'object' ? config.axisLabel as Record<string, unknown> : {}
  const axisLine = config.axisLine && typeof config.axisLine === 'object' ? config.axisLine as Record<string, unknown> : {}
  const axisLineStyle = axisLine.lineStyle && typeof axisLine.lineStyle === 'object' ? axisLine.lineStyle as Record<string, unknown> : {}
  const splitLine = config.splitLine && typeof config.splitLine === 'object' ? config.splitLine as Record<string, unknown> : {}
  const splitLineStyle = splitLine.lineStyle && typeof splitLine.lineStyle === 'object' ? splitLine.lineStyle as Record<string, unknown> : {}

  return {
    ...config,
    axisLabel: { ...axisLabel, color: darkColors.axisLabel },
    axisLine: { ...axisLine, lineStyle: { ...axisLineStyle, color: darkColors.axisLine } },
    splitLine: { ...splitLine, lineStyle: { ...splitLineStyle, color: darkColors.grid } },
  }
}

export function applyReportChartTheme<T extends EChartsOption>(option: T, isDark: boolean): T {
  if (!isDark)
    return option

  const themed = { ...option } as EChartsOption & Record<string, unknown>
  themed.xAxis = withAxisTheme(option.xAxis) as EChartsOption['xAxis']
  themed.yAxis = withAxisTheme(option.yAxis) as EChartsOption['yAxis']

  if (option.legend && !Array.isArray(option.legend)) {
    const legend = option.legend as Record<string, unknown>
    const textStyle = legend.textStyle && typeof legend.textStyle === 'object' ? legend.textStyle as Record<string, unknown> : {}
    themed.legend = { ...legend, textStyle: { ...textStyle, color: darkColors.legend } } as EChartsOption['legend']
  }

  if (option.tooltip && !Array.isArray(option.tooltip)) {
    const tooltip = option.tooltip as Record<string, unknown>
    const textStyle = tooltip.textStyle && typeof tooltip.textStyle === 'object' ? tooltip.textStyle as Record<string, unknown> : {}
    themed.tooltip = {
      ...tooltip,
      backgroundColor: darkColors.tooltip,
      borderColor: darkColors.axisLine,
      textStyle: { ...textStyle, color: darkColors.tooltipText },
    } as EChartsOption['tooltip']
  }

  return themed as T
}

