<script setup lang="ts">
import { Button } from '../../ui/ce'

defineProps<{
  currentStep: number
  totalSteps: number
  currentLabel: string
  showPrevious?: boolean
  nextText?: string
  processing?: boolean
}>()

defineEmits<{
  previous: []
  next: []
}>()
</script>

<template>
  <footer class="bottom-action-bar">
    <div class="bottom-action-bar__inner">
      <span class="bottom-action-bar__progress">{{ currentStep + 1 }} / {{ totalSteps }} · {{ currentLabel }}</span>
      <div class="bottom-action-bar__actions">
        <Button v-if="showPrevious" variant="outline" @click="$emit('previous')">
          上一步
        </Button>
        <Button class="bottom-action-bar__next" variant="primary" :loading="processing" @click="$emit('next')">
          {{ nextText ?? (currentStep + 1 === totalSteps ? '完成配置' : `确认${currentLabel}，下一步`) }}
        </Button>
      </div>
    </div>
  </footer>
</template>

