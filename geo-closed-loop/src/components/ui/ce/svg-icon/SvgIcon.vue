<script setup lang="ts">
import type { StyleValue } from 'vue'
import type { SvgIconProps } from './types'
import { computed, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<SvgIconProps>(), { size: 16, spin: false })
const attrs = useAttrs()
const labelled = computed(() => Boolean(attrs['aria-label'] || attrs['aria-labelledby']))
const dimension = computed(() => typeof props.size === 'number' ? `${props.size}px` : props.size)
const style = computed<StyleValue>(() => [
  { display: 'inline-block', width: dimension.value, height: dimension.value, color: props.color },
  attrs.style as StyleValue,
])
</script>

<template>
  <svg
    v-bind="attrs"
    :role="labelled ? 'img' : undefined"
    :aria-hidden="labelled ? undefined : 'true'"
    focusable="false"
    fill="currentColor"
    :class="[{ 'animate-spin': spin }, attrs.class]"
    :style="style"
  >
    <use :href="`#${type}`" />
  </svg>
</template>

