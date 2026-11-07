import type { CSSProperties } from 'vue'

export interface SkeletonProps {
  shape?: 'rectangle' | 'circle'
  width?: CSSProperties['width']
  height?: CSSProperties['height']
}

