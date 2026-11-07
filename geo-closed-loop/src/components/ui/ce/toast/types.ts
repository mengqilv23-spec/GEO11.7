import type { AlertVariant } from '../alert/types'

export type ToastVariant = AlertVariant

export interface ToastProps {
  open: boolean
  closeLabel: string
  messageId?: string | number
  variant?: ToastVariant
  duration?: number
  class?: string
  container?: Element | DocumentFragment
  closable?: boolean
  closeDisabled?: boolean
  showIcon?: boolean
  iconType?: string
  title?: string | number
}

