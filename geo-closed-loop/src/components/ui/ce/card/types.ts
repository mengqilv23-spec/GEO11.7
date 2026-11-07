import type { StyleValue } from 'vue'

export interface CardProps {
  variant?: 'content' | 'metric'
  background?: string
}

export interface MetricCardTrend {
  direction: 'up' | 'down'
  value: string | number
}

export interface MetricCardProps {
  title: string | number
  value: string | number
  valueVariant?: 'number' | 'text'
  unit?: string | number
  unitVariant?: 'default' | 'emphasis'
  trend?: MetricCardTrend
  trendLabels?: { up: string, down: string }
  trendPlacement?: 'value' | 'footer'
  variant?: 'default' | 'summary' | 'outlined'
  description?: string | number
  style?: StyleValue
}

export interface MetricCardGroupItem extends MetricCardProps {
  key: string | number
}

