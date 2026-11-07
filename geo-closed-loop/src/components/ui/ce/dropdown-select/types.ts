export interface DropdownSelectOption {
  value: string
  label: string
  ariaLabel?: string
  icon?: unknown
  disabled?: boolean
  depth?: number
}

export type DropdownSelectPlacement = `${'top' | 'bottom'}-${'start' | 'center' | 'end'}`
export type DropdownSelectTriggerAppearance = 'outline' | 'borderless'

