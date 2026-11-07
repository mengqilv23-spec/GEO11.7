<script setup lang="ts">
import type { SkeletonProps } from './types'
import { computed } from 'vue'

const props = withDefaults(defineProps<SkeletonProps>(), { shape: 'rectangle' })
const sizeStyle = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
  height: typeof props.height === 'number' ? `${props.height}px` : props.height,
}))
</script>

<template>
  <div aria-hidden="true" class="ce-skeleton" :data-shape="shape" :style="sizeStyle" />
</template>

