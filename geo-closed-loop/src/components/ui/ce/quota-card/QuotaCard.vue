<script setup lang="ts">
import type { QuotaCardProps } from './types'
import { computed } from 'vue'
import Card from '../card/Card.vue'

const props = defineProps<QuotaCardProps>()
defineSlots<{ icon?: () => unknown, action?: () => unknown }>()

if (!Number.isFinite(props.used) || !Number.isFinite(props.total) || props.used < 0 || props.total < 0) {
  throw new Error('QuotaCard 的 used 和 total 必须为非负有限数值。')
}
const remaining = computed(() => props.total - props.used)
const ratio = computed(() => props.total > 0 ? remaining.value / props.total : 0)
const status = computed(() => remaining.value <= 0 ? 'error' : ratio.value < 0.2 ? 'warning' : 'info')
const progress = computed(() => props.total > 0 ? Math.min(100, props.used / props.total * 100) : 100)
const percentage = computed(() => Math.floor(Math.max(0, ratio.value) * 1000) / 10)
const description = computed(() => remaining.value < 0 ? '已超额' : remaining.value === 0 ? '已用尽' : `剩余 ${percentage.value}%`)
const format = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 2 })
</script>

<template>
  <Card class="ce-quota-card" :data-status="status" :data-exceeded="String(used > total)">
    <div class="ce-quota-card__header">
      <div class="ce-quota-card__title typography-body">
        <span v-if="$slots.icon" class="ce-quota-card__icon" aria-hidden="true"><slot name="icon" /></span>
        <span>{{ title }}</span>
      </div>
      <slot name="action" />
    </div>
    <div class="ce-quota-card__statistics">
      <div class="ce-quota-card__numbers">
        <span class="ce-quota-card__value typography-page-title">{{ format(used) }}</span><span class="typography-body"> / {{ format(total) }} {{ unit }}</span>
      </div>
      <span class="ce-quota-card__remaining typography-caption">{{ description }}</span>
    </div>
    <div class="ce-quota-card__track" role="progressbar" :aria-label="`${title}已用额度`" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="progress" :aria-valuetext="`已用 ${format(used)} / ${format(total)} ${unit}，${description}`">
      <span class="ce-quota-card__fill" :style="{ width: `${progress}%` }" />
    </div>
  </Card>
</template>

