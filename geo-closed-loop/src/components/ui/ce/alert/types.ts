export type AlertVariant = 'neutral' | 'info' | 'success' | 'warning' | 'error'

export type AlertAppearance = 'default' | 'accent'

export interface AlertProps {
  variant?: AlertVariant
  showIcon?: boolean
  appearance?: AlertAppearance
  title?: string | number
  open?: boolean
  closeLabel?: string
  closeDisabled?: boolean
  iconType?: string
}

