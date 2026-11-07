export type PaginationSize = 'xs' | 'sm'
export type PaginationAction = 'previous' | 'next' | 'pages'

export interface PaginationSummary {
  total: number
  page: number
  pages: number
  pageSize: number
}

export interface PaginationProps {
  total: number
  modelValue: number
  pageSize: number
  label: string
  previousLabel: string
  nextLabel: string
  pageLabel: (page: number) => string
  summaryText: (summary: PaginationSummary) => string
  formatValue: (value: number) => string
  disabled?: boolean
  disabledActions?: readonly PaginationAction[]
  size?: PaginationSize
}

