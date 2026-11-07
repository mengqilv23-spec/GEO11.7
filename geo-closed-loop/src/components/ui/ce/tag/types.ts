export type TagTone = 'neutral' | 'red' | 'green' | 'cyan' | 'orange' | 'orange-red' | 'gold' | 'purple' | 'magenta' | 'indigo' | 'blue'
export type TagVariant = 'soft' | 'text' | 'outline' | 'soft-outline' | 'filled'
export type TagSize = 'xs' | 'sm' | 'md' | 'lg'
export type TagPreset = 'professional-filled' | 'professional-text'

export interface TagProps {
  tone?: TagTone
  variant?: TagVariant
  size?: TagSize
  preset?: TagPreset
  color?: string
}

