<script setup lang="ts">
import type { PlatformMetric } from '../../api/monitoring'
import { computed } from 'vue'
import AppIcon from '../ui/icons/AppIcon.vue'
import MetricDefinitionButton from './MetricDefinitionButton.vue'

const props = defineProps<{ metrics: readonly PlatformMetric[] }>()

const platformNames: Record<string, string> = {
  'chatgpt': 'ChatGPT',
  'perplexity': 'Perplexity',
  'google_ai': 'Google AI',
  'google-ai': 'Google AI',
  'gemini': 'Gemini',
  'ai_mode': 'AI Mode',
  'claude': 'Claude',
}
const formatRate = (value: number | null) => value == null ? '—' : `${value}%`
const platformRows = computed(() => props.metrics.map(metric => ({
  ...metric,
  id: metric.platform,
  label: platformNames[metric.platform] ?? metric.platform,
  groupLabel: ['google-ai', 'google_ai', 'gemini', 'ai_mode'].includes(metric.platform) ? 'Google 系' : undefined,
  mentionLabel: formatRate(metric.mentionRate),
  citationLabel: formatRate(metric.citationRate),
  changeLabel: metric.mentionVsPrevPp == null ? '环比 —' : `环比 ${metric.mentionVsPrevPp > 0 ? '+' : ''}${metric.mentionVsPrevPp}pp`,
})))
</script>

<template>
  <section class="platform-performance" aria-labelledby="platform-performance-title">
    <div class="overview-section-heading">
      <div>
        <span class="overview-section-heading__index" aria-hidden="true">②</span>
        <h2 id="platform-performance-title">
          各 AI 平台表现
        </h2>
      </div>
      <RouterLink class="overview-section-heading__link" :to="{ name: 'visibility-monitoring' }">
        查看完整监测数据 <AppIcon name="arrowRight" :size="14" aria-hidden="true" />
      </RouterLink>
    </div>

    <div class="platform-performance__surface">
      <article v-for="platform in platformRows" :key="platform.id" class="platform-row" :data-platform="platform.id">
        <div class="platform-row__identity">
          <div class="platform-row__name">
            <strong>{{ platform.label }}</strong>
            <span v-if="platform.groupLabel" class="platform-row__group-tag">{{ platform.groupLabel }}</span>
          </div>
          <span class="platform-row__change">{{ platform.changeLabel }}</span>
        </div>

        <div class="platform-row__bars" aria-hidden="true">
          <div class="platform-bar">
            <div class="platform-bar__track">
              <i class="platform-performance__bar-fill is-mention" :style="{ width: `${platform.mentionRate ?? 0}%` }" />
            </div>
          </div>
          <div class="platform-bar">
            <div class="platform-bar__track">
              <i class="platform-performance__bar-fill is-citation" :style="{ width: `${platform.citationRate ?? 0}%` }" />
            </div>
          </div>
        </div>

        <div class="platform-row__metrics">
          <div class="platform-row__metric platform-row__metric--mention">
            <span class="platform-row__metric-label">提及率（SOA） <MetricDefinitionButton id="soa" /></span>
            <strong class="platform-row__metric-value">{{ platform.mentionLabel }}</strong>
          </div>
          <div class="platform-row__metric platform-row__metric--citation">
            <span class="platform-row__metric-label">官网引用率 <MetricDefinitionButton id="officialCitation" /></span>
            <strong class="platform-row__metric-value">{{ platform.citationLabel }}</strong>
          </div>
        </div>
      </article>
      <p v-if="!platformRows.length" class="platform-performance__empty">
        暂无可展示的平台指标
      </p>
    </div>
  </section>
</template>

<style scoped>
.overview-section-heading, .overview-section-heading > div { display: flex; align-items: center; }
.overview-section-heading { justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.overview-section-heading > div { gap: 8px; }
.overview-section-heading h2 { margin: 0; color: var(--text-primary); font-size: 14px; line-height: 22px; font-weight: 600; }
.overview-section-heading__index { color: var(--action-accent); font-size: 16px; }
.overview-section-heading__link { color: var(--action-accent); font-size: var(--font-size-body); line-height: var(--line-height-body); font-weight: 600; text-decoration: none; white-space: nowrap; }
.overview-section-heading__link:hover { text-decoration: underline; }
.platform-performance__surface { overflow: hidden; border: 1px solid var(--border-default); border-radius: 14px; background: var(--background-primary); }
.platform-performance__empty { margin: 0; padding: 24px; color: var(--text-muted); text-align: center; }
.platform-row { display: grid; grid-template-columns: minmax(240px, 0.9fr) minmax(320px, 3fr) minmax(280px, 1fr); align-items: center; gap: 20px; padding: 14px 18px; border-bottom: 1px solid var(--border-divider); }
.platform-row:last-child { border-bottom: 0; }
.platform-row__identity { display: grid; gap: 6px; min-width: 0; }
.platform-row__name { display: flex; align-items: center; gap: 10px; min-width: 0; }
.platform-row__identity strong { color: var(--text-primary); font-size: 14px; }
.platform-row__group-tag { padding: 4px 9px; border-radius: 999px; color: var(--action-accent); background: var(--action-subtle-background); font-size: 11px; font-weight: 600; line-height: 1.3; white-space: nowrap; }
.platform-row__change { color: var(--text-muted); font-size: 11px; }
.platform-row__bars { display: grid; gap: 8px; min-width: 0; }
.platform-bar { min-width: 0; }
.platform-bar__track { height: 7px; overflow: hidden; border-radius: 999px; background: var(--background-secondary); }
.platform-performance__bar-fill { display: block; height: 100%; border-radius: inherit; }
.platform-performance__bar-fill.is-mention { background: var(--action-accent); }
.platform-performance__bar-fill.is-citation { background: #0891b2; }
.platform-row__metrics { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 0.72fr); align-items: center; gap: 16px; min-width: 0; }
.platform-row__metric { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-width: 0; white-space: nowrap; }
.platform-row__metric-label { display: inline-flex; align-items: center; gap: 4px; color: var(--text-secondary); font-size: 12px; }
.platform-row__metric-value { color: var(--text-primary); font-size: 14px; font-weight: 700; }
@media (max-width: 1000px) { .platform-row { grid-template-columns: minmax(190px, 0.9fr) minmax(260px, 2fr) minmax(240px, 1fr); gap: 14px; } .platform-row__metrics { gap: 10px; } .platform-row__metric { gap: 6px; } .platform-row__metric-label { font-size: 11px; } }
@media (max-width: 760px) { .overview-section-heading { align-items: flex-start; flex-direction: column; } .platform-row { grid-template-columns: minmax(0, 1fr); gap: 12px; padding: 13px 14px; } .platform-row__metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; } }
</style>

