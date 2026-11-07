<script setup lang="ts">
import type { AppIconName } from '../../icons/icon-registry'
import type { ChevronIconProps } from './types'
import { computed } from 'vue'
import AppIcon from '../../icons/AppIcon.vue'

const props = withDefaults(defineProps<ChevronIconProps>(), { direction: 'right', size: 16 })
const iconNames: Record<NonNullable<ChevronIconProps['direction']>, AppIconName> = {
  left: 'chevronLeft',
  right: 'chevronRight',
  down: 'chevronDown',
}
const iconName = computed(() => iconNames[props.direction])
</script>

<template>
  <AppIcon :name="iconName" :size="size" :data-direction="direction" focusable="false" />
</template>

