<script setup lang="ts">
import type { ECharts, EChartsOption } from 'echarts'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { init, use } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import { nextTick, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { applyReportChartTheme } from './report-echart-theme'

const props = defineProps<{ option: EChartsOption, label: string }>()

use([BarChart, LineChart, GridComponent, TooltipComponent, SVGRenderer])

const element = shallowRef<HTMLDivElement | null>(null)
const isDarkTheme = shallowRef(false)
let chart: ECharts | null = null
let resizeObserver: ResizeObserver | undefined
let themeObserver: MutationObserver | undefined

function syncTheme() {
  isDarkTheme.value = document.documentElement.dataset.theme === 'dark'
}

function renderChart() {
  chart?.setOption(applyReportChartTheme(props.option, isDarkTheme.value), { notMerge: true })
}

watch(isDarkTheme, renderChart)

onMounted(async () => {
  syncTheme()
  themeObserver = new MutationObserver(syncTheme)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  await nextTick()
  if (!element.value || /jsdom/i.test(navigator.userAgent))
    return

  chart = init(element.value, undefined, { renderer: 'svg' })
  renderChart()

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => chart?.resize())
    resizeObserver.observe(element.value)
  }
})

watch(() => props.option, renderChart, { deep: true })

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  themeObserver?.disconnect()
  chart?.dispose()
  resizeObserver = undefined
  themeObserver = undefined
  chart = null
})
</script>

<template>
  <div ref="element" class="report-echart" role="img" :aria-label="label" />
</template>

<style scoped>
.report-echart { width: 100%; min-width: 0; height: 210px; }
</style>

