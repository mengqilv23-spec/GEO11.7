export interface DonutChartItem {
  name: string
  value: number
  color?: string
}

export interface DonutChartProps {
  data: DonutChartItem[]
  value: string | number
  description: string
  size?: number
  ariaLabel: string
}

