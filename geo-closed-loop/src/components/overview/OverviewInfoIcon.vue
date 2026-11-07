<script setup lang="ts">
import Tooltip from '../ui/ce/tooltip/Tooltip.vue'
import AppIcon from '../ui/icons/AppIcon.vue'

defineProps<{ label?: string, title?: string }>()
</script>

<template>
  <Tooltip v-if="title" :content="title" placement="right" variant="callout">
    <button type="button" class="overview-info-icon overview-info-icon--interactive" :aria-label="label || '查看说明'">
      <AppIcon name="help" :size="16" aria-hidden="true" focusable="false" />
    </button>
  </Tooltip>
  <span v-else class="overview-info-icon" aria-hidden="true">
    <AppIcon name="help" :size="16" aria-hidden="true" focusable="false" />
  </span>
</template>

<style scoped>
.overview-info-icon { display: inline-flex; width: 16px; height: 16px; flex: 0 0 16px; align-items: center; justify-content: center; color: var(--text-muted); vertical-align: middle; }
.overview-info-icon svg { display: block; width: 100%; height: 100%; }
.overview-info-icon--interactive { padding: 0; border: 0; background: transparent; cursor: help; }
.overview-info-icon--interactive:focus-visible { border-radius: 50%; outline: 2px solid var(--color-primary, #4c5cff); outline-offset: 3px; }
</style>

