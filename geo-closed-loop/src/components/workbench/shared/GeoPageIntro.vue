<script setup lang="ts">
import OverviewInfoIcon from '../../overview/OverviewInfoIcon.vue'

defineProps<{ title: string, description: string, helpLabel: string, variant?: 'workbench' | 'visibility' }>()
</script>

<template>
  <header class="geo-page-intro" :class="variant && `geo-page-intro--${variant}`">
    <div class="geo-page-intro__copy">
      <h1>{{ title }} <OverviewInfoIcon :label="helpLabel" :title="description" /></h1>
    </div>
    <div v-if="$slots.actions" class="geo-page-intro__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.geo-page-intro { display: flex; min-width: 0; align-items: flex-start; justify-content: space-between; gap: 24px; }
.geo-page-intro__copy { min-width: 0; }
.geo-page-intro h1 { display: flex; align-items: center; gap: 8px; margin: 0; color: var(--geo-text, var(--text-primary)); font-size: 16px; line-height: 24px; font-weight: 600; }
.geo-page-intro__actions { display: flex; flex: 0 0 auto; align-items: flex-start; gap: 12px; }
.geo-page-intro--workbench { margin-bottom: 24px; }
.geo-page-intro--visibility { margin-bottom: 8px; }
@media (max-width: 760px) { .geo-page-intro { align-items: flex-start; flex-direction: column; gap: 8px; } }
</style>

