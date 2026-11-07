export interface SegmentedControlOption {
  value: string
  label: string
  ariaLabel?: string
  disabled?: boolean
}

export interface SegmentedControlProps {
  modelValue: string
  options: readonly SegmentedControlOption[]
  variant?: 'default' | 'filter'
  name?: string
  disabled?: boolean
}

