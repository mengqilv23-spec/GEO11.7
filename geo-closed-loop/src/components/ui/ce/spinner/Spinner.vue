<script setup lang="ts">
import { computed, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{ variant?: 'bars' | 'ring' }>(), { variant: 'bars' })
const attrs = useAttrs()
const decorative = computed(() => attrs['aria-hidden'] === true || attrs['aria-hidden'] === 'true')
</script>

<template>
  <span
    v-bind="attrs"
    :role="decorative ? undefined : 'status'"
    :aria-label="decorative ? undefined : '加载中'"
    class="ce-spinner" :class="[`ce-spinner--${props.variant}`, attrs.class]"
  >
    <span v-if="props.variant === 'ring'" class="ce-spinner__ring" aria-hidden="true" />
    <template v-else>
      <span v-for="index in 5" :key="index" aria-hidden="true" class="ce-spinner__bar" />
    </template>
  </span>
</template>

