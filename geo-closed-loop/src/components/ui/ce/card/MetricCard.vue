<script setup lang="ts">
import type { MetricCardProps } from './types'
import { computed, useId } from 'vue'
import DirectionArrow from '../direction-arrow/DirectionArrow.vue'
import Card from './Card.vue'

const props = withDefaults(defineProps<MetricCardProps>(), {
  valueVariant: 'number',
  unitVariant: 'default',
  trendPlacement: 'value',
  variant: 'default',
})
const slots = defineSlots<{ title?: () => unknown, unit?: () => unknown, description?: () => unknown, descriptionPrefix?: () => unknown, icon?: () => unknown }>()
const titleId = useId()
const descriptionId = useId()
const hasFooter = computed(() => props.description !== undefined || Boolean(slots.description) || Boolean(slots.descriptionPrefix) || (props.trend && props.trendPlacement === 'footer'))
const displayValue = computed(() => {
  if (props.valueVariant === 'text' || (typeof props.value !== 'string' && typeof props.value !== 'number'))
    return props.value
  if (typeof props.value === 'number')
    return Number.isFinite(props.value) ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 20 }).format(props.value) : props.value
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(props.value))
    return props.value
  const [integer, fraction] = props.value.split('.')
  const grouped = integer!.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return fraction === undefined ? grouped : `${grouped}.${fraction}`
})
</script>

<template>
  <Card
    role="group"
    :aria-labelledby="titleId"
    :aria-describedby="hasFooter ? descriptionId : undefined"
    class="ce-metric-card" :class="[`ce-metric-card-${variant}`, `ce-metric-card-unit-${unitVariant}`]"
    variant="metric"
  >
    <div class="ce-metric-card-content">
      <div :id="titleId" class="ce-metric-card-title">
        <slot name="title">
          {{ title }}
        </slot>
      </div>
      <div class="ce-metric-card-details">
        <div class="ce-metric-card-value" :data-value-variant="valueVariant">
          <span>{{ displayValue }}</span>
          <span v-if="$slots.unit || unit !== undefined" class="ce-metric-card-unit"><slot name="unit">{{ unit }}</slot></span>
        </div>
        <div v-if="trend && trendPlacement === 'value'" class="ce-metric-card-trend" :class="[`ce-metric-card-trend-${trend.direction}`]">
          <DirectionArrow
            :direction="trend.direction"
            :size="16"
            :label="trendLabels?.[trend.direction]"
          />
          <span>{{ trend.value }}</span>
        </div>
      </div>
      <div v-if="hasFooter" :id="descriptionId" class="ce-metric-card-footer">
        <div v-if="trend && trendPlacement === 'footer'" class="ce-metric-card-trend" :class="[`ce-metric-card-trend-${trend.direction}`]">
          <DirectionArrow
            :direction="trend.direction"
            :size="12"
            :label="trendLabels?.[trend.direction]"
          />
          <span>{{ trend.value }}</span>
        </div>
        <div v-if="$slots.descriptionPrefix" class="ce-metric-card-description-prefix">
          <slot name="descriptionPrefix" />
        </div>
        <div v-if="$slots.description || description !== undefined" class="ce-metric-card-description">
          <slot name="description">
            {{ description }}
          </slot>
        </div>
      </div>
    </div>
    <div v-if="$slots.icon" class="ce-metric-card-icon" aria-hidden="true">
      <slot name="icon" />
    </div>
  </Card>
</template>

