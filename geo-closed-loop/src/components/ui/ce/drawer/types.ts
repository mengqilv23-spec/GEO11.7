export type DrawerPlacement = 'left' | 'right' | 'top' | 'bottom'
export type DrawerSize = 'sm' | 'md' | 'lg' | number | `${number}${'px' | '%' | 'vw' | 'vh' | 'rem'}`
export type DrawerCloseReason = 'escape' | 'backdrop' | 'close-button' | 'form'

export interface DrawerProps {
  open: boolean
  title: unknown
  eyebrow?: unknown
  description?: unknown
  footer?: unknown
  placement?: DrawerPlacement
  size?: DrawerSize
  initialFocus?: HTMLElement | null
  closeOnEscape?: boolean
  closeOnBackdrop?: boolean
  closeDisabled?: boolean
  titleFirst?: boolean
  closeLabel: string
  closeText?: string
  role?: 'dialog' | 'alertdialog'
  class?: string
}

