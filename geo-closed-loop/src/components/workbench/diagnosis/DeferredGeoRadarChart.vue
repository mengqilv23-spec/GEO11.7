<script setup lang="ts">
import type { RadarFactor } from '../../../data/geo-data'
import { defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{
  factors: RadarFactor[]
  title: string
  clientMode?: boolean
}>()

const GeoRadarChart = defineAsyncComponent(() => import('./GeoRadarChart.vue'))
const chartHost = ref<HTMLElement | null>(null)
const shouldLoadChart = ref(false)
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (!chartHost.value || typeof IntersectionObserver === 'undefined') {
    shouldLoadChart.value = true
    return
  }

  observer = new IntersectionObserver(([entry]) => {
    if (!entry?.isIntersecting)
      return

    shouldLoadChart.value = true
    observer?.disconnect()
    observer = null
  }, { rootMargin: '200px' })
  observer.observe(chartHost.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})
</script>

<template>
  <div ref="chartHost" class="deferred-geo-radar-chart">
    <GeoRadarChart v-if="shouldLoadChart" :factors="props.factors" :title="props.title" :client-mode="props.clientMode" />
  </div>
</template>

<style scoped>
.deferred-geo-radar-chart {
  min-height: 300px;
}
</style>

