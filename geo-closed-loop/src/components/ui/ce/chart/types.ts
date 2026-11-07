import type { VNodeChild } from 'vue'

export interface ChartSeries {
  area?: boolean
  name: string
  values: number[]
  color?: string
}

export interface ChartProps {
  type: 'line' | 'bar'
  curve?: 'linear' | 'monotone'
  labels: string[]
  series: ChartSeries[]
  width?: number
  height?: number
  empty: VNodeChild
  ariaLabel: string
  legendLabel: string
  dataTableLabel: string
  categoryLabel: string
  noDataLabel: string
  formatValue: (value: number) => string
}

