<script setup lang="ts">
import { Tooltip } from '../../ui/ce'

defineProps<{
  label: string
  message: string
}>()
</script>

<template>
  <Tooltip :content="message" placement="right" variant="callout">
    <button type="button" class="page-header__help onboarding-help" :aria-label="label">
      i
    </button>
  </Tooltip>
</template>

<style scoped>
.onboarding-help {
  flex: 0 0 auto;
  padding: 0;
  background: transparent;
  cursor: help;
}
</style>

