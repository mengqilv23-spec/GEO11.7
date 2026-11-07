<script setup lang="ts">
import type { EmptyProps } from './types'
import emptyImage from '../../../../assets/ce/empty.svg'

withDefaults(defineProps<EmptyProps>(), { description: undefined, hideDefaultIcon: false })
</script>

<template>
  <div class="ce-empty">
    <div v-if="$slots.icon || !hideDefaultIcon" class="ce-empty-icon">
      <slot name="icon">
        <img :src="emptyImage" alt="">
      </slot>
    </div>
    <div class="ce-empty-title">
      <slot name="title">
        {{ title }}
      </slot>
    </div>
    <div v-if="$slots.description || description !== undefined" class="ce-empty-description">
      <slot name="description">
        {{ description }}
      </slot>
    </div>
    <div v-if="$slots.actions" class="ce-empty-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

