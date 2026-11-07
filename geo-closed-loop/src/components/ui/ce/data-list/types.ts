import type { CSSProperties, VNodeChild } from 'vue'

export interface DataListSort {
  key: string
  direction: 'asc' | 'desc'
}

export interface DataListColumn<T> {
  key: string
  title: string
  /** Vue 适配时优先使用 cell:<key> slot；render 保留同源函数式列定义能力。 */
  render?: (item: T) => VNodeChild
  /** 默认 160px；数字表示像素，也支持百分比等 CSS 宽度。 */
  width?: CSSProperties['width']
  /** 用于计算表格横向滚动的最小宽度，默认取数字 width 或 160。 */
  minWidth?: number
  sortable?: boolean
  /** 自定义表头内容；传入后不再渲染内置排序按钮。 */
  header?: VNodeChild
  className?: string
}

export interface DataListLabels {
  bulkActions: string
  selectedCount: (count: number) => string
  clearSelection: string
  table: (label: string) => string
  selectAll: string
  loading: VNodeChild
  retry: string
  selectRow: (label: string) => string
}

export interface DataListSelection<T> {
  selectedIds: readonly string[]
  isSelectable?: (item: T) => boolean
}

export interface DataListProps<T> {
  border?: boolean
  isRowActivatable?: (item: T) => boolean
  activeRowId?: string | null
  density?: 'default' | 'compact'
  label: string
  items: readonly T[]
  columns: readonly DataListColumn<T>[]
  getRowId: (item: T) => string
  getRowLabel?: (item: T) => string
  showFooterWhenEmpty?: boolean
  sort?: DataListSort
  state?: 'ready' | 'loading' | 'error'
  emptyMessage: VNodeChild
  errorMessage: VNodeChild
  labels: DataListLabels
  disabledActions?: readonly ('selection' | 'retry')[]
  selection?: DataListSelection<T>
}

