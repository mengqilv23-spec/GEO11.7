import type { VNodeChild } from 'vue'

interface PreviewItemBase {
  id: string
  name: string
  mimeType?: string
}

export type PreviewItem = PreviewItemBase & (
  | { kind: 'image', src: string, alt?: string }
  | { kind: 'video', src: string, poster?: string }
  | { kind: 'audio', src: string }
  | { kind: 'pdf', src: string }
  | { kind: 'text', text: string }
  | { kind: 'unsupported' }
)

export interface ContentPreviewLabels {
  title: string
  close: string
  previous: string
  next: string
  loading: string
  failed: string
  unsupported: string
  empty: string
  retry: string
  download: string
  downloading: string
  downloadFailed: string
  textTruncated: string
  pdfNotice: string
}

export interface ContentPreviewProps {
  open: boolean
  items: readonly PreviewItem[]
  activeId: string | null
  onActiveIdChange: (id: string) => void
  onClose: () => void
  labels: ContentPreviewLabels
  onDownload?: (item: PreviewItem) => void | Promise<void>
  renderActions?: (item: PreviewItem) => VNodeChild
  trustedBlobUrls?: readonly string[]
}

