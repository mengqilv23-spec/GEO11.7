<script setup lang="ts">
import type { DonutChartProps } from './donut-types'
import { computed } from 'vue'

const props = withDefaults(defineProps<DonutChartProps>(), { size: 136 })

const colors = [
  'var(--category-indigo-foreground)',
  'var(--category-purple-foreground)',
  'var(--category-magenta-foreground)',
  'var(--category-cyan-foreground)',
  'var(--category-orange-foreground)',
  'var(--category-green-foreground)',
  'var(--category-red-foreground)',
  'var(--category-gold-foreground)',
] as const

const normalized = computed(() => {
  if (!Number.isFinite(props.size) || props.size <= 0) {
    throw new RangeError('DonutChart size 必须是正有限数值。')
  }
  let maximum = 0
  props.data.forEach((item, index) => {
    if (!Number.isFinite(item.value) || item.value < 0) {
      throw new RangeError(`DonutChart data[${index}].value 必须是非负有限数值。`)
    }
    maximum = Math.max(maximum, item.value)
  })
  const segments = props.data
    .map((item, index) => ({
      ...item,
      normalizedValue: maximum > 0 ? item.value / maximum : 0,
      fill: item.color ?? colors[index % colors.length],
    }))
    .filter(item => item.normalizedValue > 0)
  const empty = segments.length === 0
  return {
    empty,
    segments: empty
      ? [{ name: '', normalizedValue: 1, fill: 'var(--background-tertiary)' }]
      : segments,
    paddingAngle: empty || segments.length <= 1 ? 0 : Math.min(1, 180 / segments.length),
  }
})

function point(center: number, radius: number, angle: number) {
  const radians = angle * Math.PI / 180
  return { x: center + radius * Math.cos(radians), y: center + radius * Math.sin(radians) }
}

function fullRingPath(size: number) {
  const center = size / 2
  const outer = size / 2
  const inner = size * 0.375
  const outerStart = point(center, outer, 0)
  const outerHalf = point(center, outer, -180)
  const innerStart = point(center, inner, 0)
  const innerHalf = point(center, inner, -180)
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outer} ${outer} 0 1 1 ${outerHalf.x} ${outerHalf.y}`,
    `A ${outer} ${outer} 0 1 1 ${outerStart.x} ${outerStart.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${inner} ${inner} 0 1 0 ${innerHalf.x} ${innerHalf.y}`,
    `A ${inner} ${inner} 0 1 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ')
}

function sectorPath(size: number, startAngle: number, endAngle: number) {
  const center = size / 2
  const outer = size / 2
  const inner = size * 0.375
  const startOuter = point(center, outer, startAngle)
  const endOuter = point(center, outer, endAngle)
  const startInner = point(center, inner, endAngle)
  const endInner = point(center, inner, startAngle)
  const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outer} ${outer} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${inner} ${inner} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`,
    'Z',
  ].join(' ')
}

const sectors = computed(() => {
  const values = normalized.value.segments
  if (normalized.value.empty) {
    return [{ ...values[0]!, path: fullRingPath(props.size) }]
  }
  const total = values.reduce((sum, item) => sum + item.normalizedValue, 0)
  let cursor = 0
  return values.map((item) => {
    const sweep = item.normalizedValue / total * 360
    const gap = normalized.value.paddingAngle
    const start = cursor + gap / 2
    const end = cursor + sweep - gap / 2
    cursor += sweep
    return {
      ...item,
      path: sweep >= 359.999 ? fullRingPath(props.size) : sectorPath(props.size, start, end),
    }
  })
})
</script>

<template>
  <div class="ce-donut-chart" :style="{ width: `${size}px`, height: `${size}px` }" role="img" :aria-label="ariaLabel">
    <div aria-hidden="true">
      <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" focusable="false">
        <path
          v-for="(segment, index) in sectors"
          :key="`${segment.name}-${index}`"
          class="ce-donut-chart-sector"
          :d="segment.path"
          :fill="segment.fill"
          stroke="none"
        />
      </svg>
    </div>
    <div class="ce-donut-chart-center" aria-hidden="true">
      <span class="ce-donut-chart-value" :title="String(value)">{{ value }}</span>
      <span class="ce-donut-chart-description" :title="description">{{ description }}</span>
    </div>
  </div>
</template>

