<script setup lang="ts">
import type { ECharts, EChartsOption } from 'echarts'
import type { RadarFactor } from '../../../data/geo-data'
import { RadarChart } from 'echarts/charts'
import { LegendComponent, TooltipComponent } from 'echarts/components'
import { init, use } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  factors: RadarFactor[]
  title: string
  clientMode?: boolean
}>()

use([LegendComponent, TooltipComponent, RadarChart, SVGRenderer])

const chartElement = ref<HTMLDivElement | null>(null)
let chart: ECharts | null = null
let resizeObserver: ResizeObserver | null = null

function getToken(name: string, fallback: string) {
  if (typeof window === 'undefined' || !chartElement.value)
    return fallback
  return getComputedStyle(chartElement.value).getPropertyValue(name).trim() || fallback
}

function getOption(): EChartsOption {
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const brand = getToken('--action-accent', '#4152F6')
  const success = getToken('--status-success-foreground', '#00B42A')
  const warning = getToken('--status-warning-foreground', '#FF7D00')
  const textSecondary = getToken('--text-secondary', '#4E5969')
  const surface = getToken('--background-primary', '#FFFFFF')
  const fill = getToken('--background-secondary', '#F7F8FA')
  const border = getToken('--border-default', '#E5E6EB')
  return {
    animation: !reduceMotion,
    color: [warning, brand, success],
    tooltip: { trigger: 'item' },
    legend: {
      bottom: 0,
      left: 'center',
      icon: 'roundRect',
      itemWidth: 12,
      itemHeight: 8,
      textStyle: { color: textSecondary, fontSize: 12 },
      data: ['买家关注度', '我方覆盖', '竞品覆盖'],
    },
    radar: {
      center: ['50%', '44%'],
      radius: '64%',
      splitNumber: 4,
      axisName: { color: textSecondary, fontSize: 11 },
      splitArea: { areaStyle: { color: [surface, fill] } },
      splitLine: { lineStyle: { color: border } },
      axisLine: { lineStyle: { color: border } },
      indicator: props.factors.map(factor => ({ name: factor.name, max: 100 })),
    },
    series: [{
      name: props.title,
      type: 'radar',
      symbol: 'circle',
      symbolSize: 4,
      lineStyle: { width: 2 },
      data: [
        { value: props.factors.map(factor => factor.attention ?? 0), name: '买家关注度', areaStyle: { opacity: 0.02 } },
        { value: props.factors.map(factor => factor.coverage), name: '我方覆盖', areaStyle: { opacity: 0.05 } },
        { value: props.factors.map(factor => factor.competitor), name: '竞品覆盖', areaStyle: { opacity: 0.04 } },
      ],
    }],
  }
}

function renderChart() {
  if (!chart)
    return
  chart.setOption(getOption(), { notMerge: true })
}

onMounted(async () => {
  await nextTick()
  if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent))
    return
  if (!chartElement.value)
    return
  chart = init(chartElement.value, undefined, { renderer: 'svg' })
  renderChart()
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => chart?.resize())
    resizeObserver.observe(chartElement.value)
  }
})

watch(() => props.factors, renderChart, { deep: true })

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div ref="chartElement" class="geo-radar-chart" role="img" :aria-label="`${title}雷达图：买家关注度、我方与竞品正向覆盖率，均以当前有效回答数为分母`" />
</template>

