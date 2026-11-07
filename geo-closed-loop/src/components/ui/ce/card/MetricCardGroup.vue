<script setup lang="ts">
import type { MetricCardGroupItem } from './types'
import Card from './Card.vue'
import MetricCard from './MetricCard.vue'

defineProps<{ items: readonly MetricCardGroupItem[] }>()
</script>

<template>
  <Card class="ce-metric-card-group">
    <div class="ce-metric-card-group-grid">
      <div v-for="item in items" :key="item.key" class="ce-metric-card-group-cell">
        <MetricCard v-bind="item" variant="summary" class="ce-metric-card-group-item" />
      </div>
    </div>
  </Card>
</template>

