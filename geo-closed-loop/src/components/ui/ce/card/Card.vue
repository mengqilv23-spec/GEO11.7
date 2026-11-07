<script setup lang="ts">
import type { StyleValue } from 'vue'
import type { CardProps } from './types'
import { computed, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<CardProps>(), { variant: 'content' })
const attrs = useAttrs()
const cardStyle = computed<StyleValue>(() => [props.background ? { background: props.background } : undefined, attrs.style as StyleValue])
</script>

<template>
  <div v-bind="attrs" class="ce-card" :class="[attrs.class]" :data-variant="variant" :style="cardStyle">
    <slot />
  </div>
</template>

