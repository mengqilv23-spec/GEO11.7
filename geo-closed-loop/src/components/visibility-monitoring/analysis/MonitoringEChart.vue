<script setup lang="ts">
import type { ECharts, EChartsOption } from 'echarts'
import { HeatmapChart, LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent, VisualMapComponent } from 'echarts/components'
import { init, use } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import { nextTick, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'

const props = defineProps<{ option: EChartsOption, label: string }>()
use([LineChart, HeatmapChart, GridComponent, LegendComponent, TooltipComponent, VisualMapComponent, SVGRenderer])
const element = shallowRef<HTMLDivElement | null>(null)
let chart: ECharts | null = null
let observer: ResizeObserver | undefined

function render() {
  chart?.setOption(props.option, { notMerge: true })
}
onMounted(async () => {
  await nextTick()
  if (!element.value || /jsdom/i.test(navigator.userAgent))
    return
  chart = init(element.value, undefined, { renderer: 'svg' })
  render()
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(() => chart?.resize())
    observer.observe(element.value)
  }
})
watch(() => props.option, render, { deep: true })
onBeforeUnmount(() => {
  observer?.disconnect()
  chart?.dispose()
  observer = undefined
  chart = null
})
</script>

<template>
  <div ref="element" class="visibility-chart" role="img" :aria-label="label" />
</template>

<style scoped>
.visibility-chart { width: 100%; min-width: 0; height: 320px; }
@media (max-width: 760px) { .visibility-chart { height: 280px; } }
</style>

