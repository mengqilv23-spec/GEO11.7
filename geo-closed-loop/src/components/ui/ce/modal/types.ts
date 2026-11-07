export type ModalTone = 'default' | 'info' | 'danger'

export type ModalCloseReason
  = | 'escape'
    | 'backdrop'
    | 'close-button'
    | 'cancel'
    | 'confirm'

export interface ModalProps {
  open: boolean
  title: unknown
  footerStart?: unknown
  footer?: unknown
  tone?: ModalTone
  width?: number | string
  confirmText: string
  cancelText: string
  closeLabel: string
  processingText: string
  confirmDisabled?: boolean
  cancelDisabled?: boolean
  showCancel?: boolean | null
  showClose?: boolean
  loading?: boolean
  closeDisabled?: boolean
}

