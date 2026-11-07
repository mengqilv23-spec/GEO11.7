<script setup lang="ts">
import type { TaskFlowStep } from '../../workflows/task-flow'
import Card from '../ui/ce/card/Card.vue'
import AppIcon from '../ui/icons/AppIcon.vue'

defineProps<{ steps: TaskFlowStep[], title?: string }>()
</script>

<template>
  <Card class="tw-flow-card">
    <div v-if="title || $slots.action" class="tw-flow-head">
      <strong v-if="title">{{ title }}</strong>
      <slot name="action" />
    </div>
    <ol class="tw-flow-steps" :style="{ '--tw-step-count': steps.length }" aria-label="任务执行阶段">
      <li v-for="(step, index) in steps" :key="step.title" :class="step.state" :aria-current="step.state === 'current' ? 'step' : undefined">
        <span aria-hidden="true"><AppIcon v-if="step.state === 'done'" name="check" :size="14" /><template v-else>{{ index + 1 }}</template></span>
        <strong>{{ step.title }}</strong>
        <small>{{ step.detail }}</small>
      </li>
    </ol>
  </Card>
</template>

