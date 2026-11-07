<script setup lang="ts">
import Stepper from '../../ui/Stepper.vue'

defineProps<{
  currentStep: number
  steps: string[]
}>()
</script>

<template>
  <Stepper class="onboarding-steps" :current="currentStep" :items="steps" />
</template>

