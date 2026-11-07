<script setup lang="ts">
import type { RoundDetail, RoundSummary } from '../../../api/monitoring'
import { presentCredibility, presentCredibilityFromInterval } from '../../../data/credibility-presentation'
import Spinner from '../../ui/ce/spinner/Spinner.vue'

withDefaults(defineProps<{
  round: RoundSummary | null
  detail: RoundDetail | null
  additionalMetrics?: Array<{ label: string, value: number | string | null | undefined, suffix?: string }>
  variant?: 'default' | 'overview'
  showRoundNumber?: boolean
  monitoringEnabled?: boolean
  statusText?: string
  toggleDisabled?: boolean
  togglePending?: boolean
  exclusiveActions?: boolean
  showTrigger?: boolean
  triggerPending?: boolean
  triggerDisabled?: boolean
  triggerError?: string
}>(), { monitoringEnabled: false, toggleDisabled: false, togglePending: false, exclusiveActions: false, showTrigger: true, additionalMetrics: () => [], variant: 'default', showRoundNumber: true })

const emit = defineEmits<{ toggleMonitoring: [], triggerRound: [] }>()

function displayValue(value: number | string | null | undefined, suffix = '') {
  return value === null || value === undefined || value === '' ? '' : `${value}${suffix}`
}

function credibility(detail: RoundDetail | null) {
  if (detail?.ciValue !== null && detail?.ciValue !== undefined)
    return presentCredibilityFromInterval(detail.ciValue)
  const level = detail?.confidenceLevel
  return level?.trim() ? presentCredibility(level) : { label: '', reason: '' }
}
</script>

<template>
  <section class="vm-round-summary" :class="`vm-round-summary--${variant}`" aria-label="本轮监测概览">
    <div class="vm-round-summary__header">
      <div class="vm-round-summary__title">
        <span class="vm-round-summary__icon" aria-hidden="true">✦</span>
        <h2>本轮监测</h2>
        <span class="vm-round-summary__status" :class="{ 'is-active': monitoringEnabled, 'is-paused': !monitoringEnabled }">{{ statusText ?? (monitoringEnabled ? '进行中' : '已暂停') }}</span>
      </div>
      <button v-if="!exclusiveActions || monitoringEnabled" type="button" class="vm-round-summary__toggle" :aria-pressed="monitoringEnabled" :disabled="toggleDisabled || togglePending" :aria-busy="togglePending" @click="emit('toggleMonitoring')">
        <Spinner v-if="togglePending" variant="ring" aria-hidden="true" />
        {{ monitoringEnabled ? '暂停监测' : '开启监测' }}
      </button>
      <button v-if="showTrigger && (!exclusiveActions || !monitoringEnabled)" type="button" class="vm-round-summary__trigger" :disabled="triggerDisabled || triggerPending" :aria-busy="triggerPending" @click="emit('triggerRound')">
        <Spinner v-if="triggerPending" variant="ring" aria-hidden="true" />
        立即采集
      </button>
    </div>
    <p v-if="triggerError" class="vm-round-summary__trigger-error" role="alert">
      手动采集失败：{{ triggerError }}
    </p>
    <dl v-if="round || additionalMetrics.length" class="vm-round-summary__metrics" :class="{ 'has-additional': additionalMetrics.length }" :style="{ '--metric-count': (additionalMetrics.length + (showRoundNumber ? 3 : 2)).toString() }">
      <div><dt>监测时间 / 轮次</dt><dd>{{ displayValue(round?.monitorDate) }} · 第 {{ displayValue(round?.roundNo) }} 轮</dd></div>
      <template v-if="variant === 'overview' && !showRoundNumber">
        <div v-for="metric in additionalMetrics" :key="metric.label">
          <dt>{{ metric.label }}</dt>
          <dd>{{ displayValue(metric.value, metric.suffix) }}</dd>
        </div>
        <div class="vm-round-summary__confidence">
          <dt>可信度</dt><dd :title="credibility(detail).reason">
            {{ credibility(detail).label }}
          </dd>
        </div>
      </template>
      <template v-else>
        <div v-for="metric in additionalMetrics" :key="metric.label">
          <dt>{{ metric.label }}</dt>
          <dd>{{ displayValue(metric.value, metric.suffix) }}</dd>
        </div>
        <div class="vm-round-summary__confidence"><dt>可信度</dt><dd :title="credibility(detail).reason">{{ credibility(detail).label }}</dd></div>
      </template>
    </dl>
  </section>
</template>

<style scoped>
.vm-round-summary { position: relative; overflow: hidden; min-width: 0; padding: 16px 24px 18px; border: 1px solid color-mix(in srgb, var(--action-accent) 28%, var(--border-default)); border-radius: 16px; background: radial-gradient(ellipse at 0% 0%, color-mix(in srgb, var(--action-accent) 9%, transparent) 0%, transparent 52%), linear-gradient(115deg, color-mix(in srgb, var(--action-accent) 2%, var(--background-primary)) 0%, var(--background-primary) 42%); box-shadow: 0 10px 28px color-mix(in srgb, var(--action-accent) 7%, transparent), inset 0 1px 0 color-mix(in srgb, white 80%, transparent); }
.vm-round-summary::before { position: absolute; top: 0; left: 24px; width: 76px; height: 3px; border-radius: 0 0 3px 3px; background: linear-gradient(90deg, var(--action-accent), color-mix(in srgb, var(--action-accent) 28%, transparent)); content: ''; }
.vm-round-summary__header { position: relative; display: flex; align-items: center; justify-content: flex-start; flex-wrap: wrap; gap: 16px; padding-bottom: 14px; border-bottom: 1px solid color-mix(in srgb, var(--action-accent) 12%, var(--border-divider)); }
.vm-round-summary__title { display: flex; align-items: center; gap: 12px; }
.vm-round-summary__title { margin-right: auto; }
.vm-round-summary__icon { display: grid; width: 44px; height: 44px; place-items: center; border-radius: 12px; color: white; background: linear-gradient(145deg, color-mix(in srgb, var(--action-accent) 82%, white), var(--action-accent) 62%, color-mix(in srgb, var(--action-accent) 76%, #101b68)); box-shadow: 0 7px 18px color-mix(in srgb, var(--action-accent) 28%, transparent), inset 0 1px 0 color-mix(in srgb, white 45%, transparent); font-size: 20px; }
.vm-round-summary h2 { margin: 0; font-size: 16px; line-height: 24px; font-weight: 600; }
.vm-round-summary__status { display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px; border-radius: var(--radius-tag); color: var(--action-accent); background: var(--action-subtle-background); font-size: var(--font-size-caption); line-height: var(--line-height-caption); font-weight: 600; white-space: nowrap; }
.vm-round-summary__status::before { width: 6px; height: 6px; border-radius: 50%; background: currentColor; content: ''; }
.vm-round-summary__status.is-active::before { box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 15%, transparent); animation: vm-status-pulse 2s ease-out infinite; }
.vm-round-summary__status.is-paused { color: var(--text-muted); background: var(--background-secondary); }
.vm-round-summary__toggle,.vm-round-summary__trigger { display: inline-flex; align-items: center; justify-content: center; gap: 8px; --spinner-size: 16px; --spinner-color: currentColor; }
.vm-round-summary__toggle { min-height: 36px; padding: 0 14px; border: 1px solid var(--action-subtle-border, var(--border-default)); border-radius: var(--radius-control); color: var(--action-accent); background: var(--background-primary); font: inherit; font-size: var(--font-size-body); font-weight: 600; white-space: nowrap; cursor: pointer; }
.vm-round-summary__trigger { min-height: 36px; padding: 0 14px; border: 1px solid var(--action-accent); border-radius: var(--radius-control); color: var(--text-on-accent, #fff); background: var(--action-accent); font: inherit; font-size: var(--font-size-body); font-weight: 600; white-space: nowrap; cursor: pointer; }
.vm-round-summary__trigger-error { margin: 12px 0 0; color: var(--status-error-foreground); font-size: var(--font-size-caption); }
.vm-round-summary__toggle:hover:not(:disabled) { background: var(--action-subtle-background); }
.vm-round-summary__toggle:focus-visible { outline: 2px solid var(--action-accent); outline-offset: 3px; }
.vm-round-summary__toggle:disabled,.vm-round-summary__trigger:disabled { cursor: not-allowed; opacity: 0.6; }
.vm-round-summary__metrics { display: grid; grid-template-columns: repeat(var(--metric-count, 3), minmax(0, 1fr)); margin: 14px 0 0; }
.vm-round-summary__metrics > div { min-width: 0; padding: 2px 14px; border-left: 1px solid var(--border-divider); }
.vm-round-summary__metrics > div:first-child { padding-left: 0; border-left: 0; }
.vm-round-summary__metrics dt { margin-bottom: 6px; color: var(--text-secondary); font-size: var(--font-size-caption); line-height: var(--line-height-caption); font-weight: 500; }
.vm-round-summary__metrics dd { margin: 0; color: var(--text-primary); font-size: 14px; line-height: 22px; font-weight: 650; overflow-wrap: anywhere; }
@keyframes vm-status-pulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, currentColor 22%, transparent); } 70%, 100% { box-shadow: 0 0 0 5px transparent; } }
@media (prefers-reduced-motion: reduce) { .vm-round-summary__status.is-active::before { animation: none; } }
@media (max-width: 1050px) { .vm-round-summary__metrics { grid-template-columns: repeat(3, minmax(0, 1fr)); row-gap: 14px; } }
@media (max-width: 560px) { .vm-round-summary { padding: 16px; } .vm-round-summary::before { left: 16px; } .vm-round-summary__header { gap: 10px; padding-bottom: 12px; } .vm-round-summary__title { width: 100%; gap: 8px; } .vm-round-summary__toggle { margin-left: auto; } .vm-round-summary__metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); } .vm-round-summary__metrics > div:nth-child(odd) { padding-left: 0; border-left: 0; } .vm-round-summary__metrics > div:nth-child(even) { padding-left: 12px; border-left: 1px solid var(--border-divider); } .vm-round-summary__confidence { grid-column: 1 / -1; } }
</style>

