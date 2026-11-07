<script setup lang="ts">
import type { CSSProperties, PropType, VNodeChild } from 'vue'
import type { ChartProps } from './types'
import { computed, defineComponent, shallowRef } from 'vue'

const props = withDefaults(defineProps<ChartProps>(), {
  curve: 'linear',
  width: 640,
  height: 320,
})

const colors = [
  'var(--category-indigo-foreground)',
  'var(--category-green-foreground)',
  'var(--category-orange-foreground)',
  'var(--category-magenta-foreground)',
] as const

const RenderValue = defineComponent({
  name: 'ChartRenderValue',
  props: {
    value: { type: null as unknown as PropType<VNodeChild>, required: true },
  },
  setup(renderProps) {
    return () => renderProps.value
  },
})

const activeIndex = shallowRef<number | null>(null)

const chartWidth = computed(() => Number.isFinite(props.width) && props.width > 0 ? props.width : 640)
const chartHeight = computed(() => Number.isFinite(props.height) ? Math.max(props.height, 160) : 320)
const chartSeries = computed(() => props.series.map((item, index) => ({
  ...item,
  key: `series${index}`,
  color: item.color ?? colors[index % colors.length],
})))
const data = computed(() => props.labels.map((label, index) => ({
  label,
  values: chartSeries.value.map(item => Number.isFinite(item.values[index]) ? item.values[index]! : null),
})))
const hasData = computed(() => data.value.some(row => row.values.some(value => value !== null)))

const geometry = computed(() => {
  const margin = { top: 16, right: 16, bottom: 34, left: 48 }
  const plotWidth = Math.max(1, chartWidth.value - margin.left - margin.right)
  const plotHeight = Math.max(1, chartHeight.value - margin.top - margin.bottom)
  const values = data.value.flatMap(row => row.values.filter((value): value is number => value !== null))
  const min = Math.min(0, ...values)
  let max = Math.max(0, ...values)
  if (min === max)
    max = min + 1
  const x = (index: number) => props.labels.length <= 1
    ? margin.left + plotWidth / 2
    : margin.left + (index / (props.labels.length - 1)) * plotWidth
  const y = (value: number) => margin.top + ((max - value) / (max - min)) * plotHeight
  return { margin, plotWidth, plotHeight, min, max, x, y, baseline: y(0) }
})

const ticks = computed(() => Array.from({ length: 5 }, (_, index) => {
  const value = geometry.value.max - ((geometry.value.max - geometry.value.min) * index) / 4
  return { value, y: geometry.value.y(value) }
}))

const xTicks = computed(() => props.labels.map((label, index) => ({ label, x: geometry.value.x(index), index })))

interface Point {
  x: number
  y: number
}

function segmentsForSeries(seriesIndex: number) {
  const segments: Point[][] = []
  let segment: Point[] = []
  data.value.forEach((row, index) => {
    const value = row.values[seriesIndex]
    if (value === null) {
      if (segment.length)
        segments.push(segment)
      segment = []
    }
    else {
      segment.push({ x: geometry.value.x(index), y: geometry.value.y(value) })
    }
  })
  if (segment.length)
    segments.push(segment)
  return segments
}

const lineSeries = computed(() => chartSeries.value.map((series, index) => ({
  ...series,
  segments: segmentsForSeries(index),
})))

function pathFor(points: Point[]) {
  if (points.length === 0)
    return ''
  const first = points[0]!
  if (points.length === 1)
    return `M ${first.x} ${first.y}`
  if (props.curve === 'monotone') {
    return points.slice(1).reduce(
      (path, point, index) => {
        const previous = points[index]!
        const middle = (previous.x + point.x) / 2
        return `${path} C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`
      },
      `M ${first.x} ${first.y}`,
    )
  }
  return points.slice(1).reduce((path, point) => `${path} L ${point.x} ${point.y}`, `M ${first.x} ${first.y}`)
}

function areaPathFor(points: Point[]) {
  if (points.length === 0)
    return ''
  const first = points[0]!
  const last = points[points.length - 1]!
  return `${pathFor(points)} L ${last.x} ${geometry.value.baseline} L ${first.x} ${geometry.value.baseline} Z`
}

const bars = computed(() => {
  if (!props.labels.length || !chartSeries.value.length)
    return []
  const band = geometry.value.plotWidth / props.labels.length
  const groupWidth = Math.min(40, band * 0.8)
  const barWidth = groupWidth / chartSeries.value.length
  return data.value.flatMap((row, index) => row.values.flatMap((value, seriesIndex) => {
    if (value === null)
      return []
    const x = geometry.value.margin.left + index * band + (band - groupWidth) / 2 + seriesIndex * barWidth
    const valueY = geometry.value.y(value)
    return [{
      key: `${index}-${seriesIndex}`,
      index,
      seriesIndex,
      x,
      y: Math.min(valueY, geometry.value.baseline),
      width: barWidth,
      height: Math.abs(valueY - geometry.value.baseline),
      color: chartSeries.value[seriesIndex]!.color,
    }]
  }))
})

const activeRow = computed(() => activeIndex.value === null ? null : data.value[activeIndex.value] ?? null)
const rootStyle = computed<CSSProperties>(() => ({
  '--ce-chart-width': `${chartWidth.value}px`,
  '--ce-chart-height': `${chartHeight.value}px`,
}))

function activateTooltip(index: number) {
  activeIndex.value = index
}

function moveTooltip(event: KeyboardEvent) {
  if (!props.labels.length)
    return
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    event.preventDefault()
    activeIndex.value = Math.min((activeIndex.value ?? -1) + 1, props.labels.length - 1)
  }
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value = Math.max((activeIndex.value ?? props.labels.length) - 1, 0)
  }
  else if (event.key === 'Home') {
    event.preventDefault()
    activeIndex.value = 0
  }
  else if (event.key === 'End') {
    event.preventDefault()
    activeIndex.value = props.labels.length - 1
  }
}

function focusChart() {
  if (activeIndex.value === null && props.labels.length)
    activeIndex.value = 0
}
</script>

<template>
  <div v-if="!hasData" class="ce-chart ce-chart-empty" :style="rootStyle">
    <RenderValue :value="empty" />
  </div>
  <div v-else class="ce-chart" :style="rootStyle" role="group" :aria-label="ariaLabel">
    <ul class="ce-chart-legend" :aria-label="legendLabel">
      <li v-for="series in chartSeries" :key="series.key" role="listitem">
        <span class="ce-chart-swatch" :style="{ '--ce-series-color': series.color }" aria-hidden="true" />
        {{ series.name }}
      </li>
    </ul>

    <div
      class="ce-chart-canvas"
      role="application"
      tabindex="0"
      :aria-label="ariaLabel"
      @focus="focusChart"
      @keydown="moveTooltip"
      @blur="activeIndex = null"
    >
      <svg :width="chartWidth" :height="chartHeight" :viewBox="`0 0 ${chartWidth} ${chartHeight}`" aria-hidden="true" focusable="false">
        <g class="ce-chart-grid">
          <line v-for="tick in ticks" :key="tick.y" :x1="geometry.margin.left" :x2="chartWidth - geometry.margin.right" :y1="tick.y" :y2="tick.y" />
        </g>
        <g class="ce-chart-y-axis">
          <text v-for="tick in ticks" :key="`label-${tick.y}`" :x="geometry.margin.left - 8" :y="tick.y" text-anchor="end" dominant-baseline="middle">{{ formatValue(tick.value) }}</text>
        </g>
        <g class="ce-chart-x-axis">
          <text v-for="tick in xTicks" :key="`x-${tick.index}`" :x="tick.x" :y="chartHeight - 10" text-anchor="middle">{{ tick.label }}</text>
        </g>
        <template v-if="type === 'bar'">
          <rect
            v-for="bar in bars"
            :key="bar.key"
            class="ce-chart-bar"
            :data-index="bar.index"
            :x="bar.x"
            :y="bar.y"
            :width="bar.width"
            :height="bar.height"
            :fill="bar.color"
            @mouseenter="activateTooltip(bar.index)"
          />
        </template>
        <template v-else>
          <g v-for="series in lineSeries" :key="series.key" class="ce-chart-line">
            <template v-for="(segment, segmentIndex) in series.segments" :key="`${series.key}-${segmentIndex}`">
              <path v-if="series.area" class="ce-chart-area" :d="areaPathFor(segment)" :fill="series.color" fill-opacity="0.12" stroke="none" />
              <path class="ce-chart-line-segment" :d="pathFor(segment)" :stroke="series.color" fill="none" stroke-width="2" />
            </template>
            <template v-for="(row, index) in data" :key="`${series.key}-dot-${index}`">
              <circle
                v-if="row.values[chartSeries.findIndex((item) => item.key === series.key)] !== null"
                class="ce-chart-line-dot"
                :data-index="index"
                :cx="geometry.x(index)"
                :cy="geometry.y(row.values[chartSeries.findIndex((item) => item.key === series.key)] ?? 0)"
                r="3"
                :fill="series.color"
                @mouseenter="activateTooltip(index)"
              />
            </template>
          </g>
        </template>
      </svg>

      <div v-if="activeRow" class="ce-chart-tooltip" role="status">
        <div class="ce-chart-tooltip-label">
          {{ activeRow.label }}
        </div>
        <ul>
          <li v-for="(series, index) in chartSeries" :key="series.key">
            <span class="ce-chart-swatch" :style="{ '--ce-series-color': series.color }" aria-hidden="true" />
            <span>{{ series.name }}</span>
            <strong>{{ activeRow.values[index] === null ? noDataLabel : formatValue(activeRow.values[index]!) }}</strong>
          </li>
        </ul>
      </div>
    </div>

    <table class="ce-chart-data">
      <caption>{{ dataTableLabel }}</caption>
      <thead>
        <tr>
          <th scope="col">
            {{ categoryLabel }}
          </th>
          <th v-for="series in chartSeries" :key="series.key" scope="col">
            {{ series.name }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, rowIndex) in data" :key="rowIndex">
          <th scope="row">
            {{ row.label }}
          </th>
          <td v-for="(cell, valueIndex) in row.values" :key="chartSeries[valueIndex]!.key">
            {{ cell === null ? noDataLabel : formatValue(cell) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

