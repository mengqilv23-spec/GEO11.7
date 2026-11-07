<script setup lang="ts">
import type { DirectionArrowProps } from './types'
import { computed } from 'vue'
import AppIcon from '../../icons/AppIcon.vue'

const props = withDefaults(defineProps<DirectionArrowProps>(), { size: 12 })
const iconName = computed(() => props.direction === 'up' ? 'trendUp' : 'trendDown')
</script>

<template>
  <AppIcon
    :name="iconName"
    :size="size"
    :aria-label="label"
    focusable="false"
    :data-direction="direction"
    :style="{ display: 'inline-block', flexShrink: 0, verticalAlign: 'middle' }"
  />
</template>

