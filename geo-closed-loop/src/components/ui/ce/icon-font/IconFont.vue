<script setup lang="ts">
import type { StyleValue } from 'vue'
import type { IconFontProps } from './types'
import { computed, useAttrs, watch } from 'vue'
import AppIcon from '../../icons/AppIcon.vue'
import { legacyIconNameMap } from '../../icons/icon-registry'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<IconFontProps>(), { size: 16, spin: false })
const attrs = useAttrs()
const unknownTypes = new Set<string>()
const resolvedName = computed(() => legacyIconNameMap[props.type as keyof typeof legacyIconNameMap] ?? 'info')
const isFallback = computed(() => !Object.hasOwn(legacyIconNameMap, props.type))
const style = computed<StyleValue>(() => [
  {
    display: 'inline-block',
    fontStyle: 'normal',
    fontWeight: 400,
    fontSize: typeof props.size === 'number' ? `${props.size}px` : props.size,
    lineHeight: typeof (props.lineHeight ?? props.size) === 'number' ? `${props.lineHeight ?? props.size}px` : props.lineHeight ?? props.size,
    color: props.color,
  },
  attrs.style as StyleValue,
])

watch(isFallback, (fallback) => {
  if (fallback && import.meta.env.DEV && !unknownTypes.has(props.type)) {
    unknownTypes.add(props.type)
    console.warn(`[IconFont] Unknown legacy icon type "${props.type}"; rendering the info fallback.`)
  }
}, { immediate: true })
</script>

<template>
  <AppIcon
    :name="resolvedName"
    :size="size"
    :stroke-width="2"
    :data-icon-fallback="isFallback ? 'true' : undefined"
    :data-icon-type="type"
    v-bind="attrs"
    :class="[{ 'animate-spin': spin }, attrs.class]"
    :style="style"
  />
</template>

