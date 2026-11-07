<script setup lang="ts">
import type { AppIconName } from './icon-registry'
import { computed, useAttrs } from 'vue'
import { iconRegistry } from './icon-registry'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  name: AppIconName
  size?: number | string
  strokeWidth?: number
  ariaLabel?: string
}>(), {
  size: 18,
  strokeWidth: 2,
})
const attrs = useAttrs()
const accessibleLabel = computed(() => props.ariaLabel
  ?? (typeof attrs['aria-label'] === 'string' ? attrs['aria-label'] : undefined))
const hasAccessibleName = computed(() => Boolean(
  accessibleLabel.value
  || attrs['aria-labelledby']
  || attrs.title,
))
const role = computed(() => typeof attrs.role === 'string'
  ? attrs.role
  : (hasAccessibleName.value ? 'img' : undefined))
const ariaHidden = computed<boolean | 'true' | 'false' | undefined>(() => {
  const explicit = attrs['aria-hidden']
  if (explicit === true || explicit === 'true')
    return 'true'
  if (explicit === false || explicit === 'false')
    return 'false'
  return hasAccessibleName.value ? undefined : 'true'
})
</script>

<template>
  <component
    :is="iconRegistry[name]"
    v-bind="$attrs"
    :size="typeof size === 'number' ? size : undefined"
    :width="typeof size === 'string' ? size : undefined"
    :height="typeof size === 'string' ? size : undefined"
    :stroke-width="strokeWidth"
    color="currentColor"
    :role="role"
    :aria-label="accessibleLabel"
    :aria-hidden="ariaHidden"
  />
</template>

