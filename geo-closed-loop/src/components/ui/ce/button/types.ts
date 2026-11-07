export type ButtonTone = 'default' | 'danger'
export type ButtonVariant = 'primary' | 'secondary' | 'dashed' | 'outline' | 'text'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

export interface ButtonProps {
  tone?: ButtonTone
  variant?: ButtonVariant
  size?: ButtonSize
  shape?: 'default' | 'round'
  loading?: boolean
  disabled?: boolean
  color?: string
  colorText?: string
  iconType?: string
  iconOnly?: boolean
  type?: 'button' | 'submit' | 'reset'
}

