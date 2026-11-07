<script setup lang="ts">
import type { HeatmapCell, TrendMode, TrendSeries } from '../../../data/visibility-monitoring-data'
import { computed } from 'vue'
import MetricDefinitionButton from '../../overview/MetricDefinitionButton.vue'
import { createHeatmapOption, createTrendOption } from './chart-options'
import MonitoringEChart from './MonitoringEChart.vue'

const props = defineProps<{
  weeks: readonly string[]
  overallSeries: readonly TrendSeries[]
  series: readonly TrendSeries[]
  engineSeries: readonly TrendSeries[]
  personaSeries: readonly TrendSeries[]
  competitors: readonly { name: string, rank: number, mentionRate: number, recommendationRate: number, officialCitationRate?: number, ownBrand: boolean }[]
  personas: readonly string[]
  topics: readonly string[]
  intents: readonly string[]
  topicCells: readonly HeatmapCell[]
  intentCells: readonly HeatmapCell[]
}>()
const mode = defineModel<TrendMode>({ default: 'overall' })
const trendInput = computed(() => mode.value === 'engine' ? props.engineSeries : mode.value === 'persona' ? props.personaSeries : mode.value === 'competitors' ? props.series : props.overallSeries)
const trendOption = computed(() => createTrendOption({ weeks: props.weeks, series: trendInput.value }))
const topicOption = computed(() => createHeatmapOption({ rows: props.personas, columns: props.topics, cells: props.topicCells }))
const intentOption = computed(() => createHeatmapOption({ rows: props.personas, columns: props.intents, cells: props.intentCells }))
const heatmapBands = [
  { id: 'strong', label: '优势区（75%+）' },
  { id: 'good', label: '良好区（50–74%）' },
  { id: 'weak', label: '偏弱区（25–49%）' },
  { id: 'blind', label: '盲区/缺口（<25%）' },
] as const
const filters: Array<{ id: TrendMode, label: string }> = [
  { id: 'overall', label: '整体' },
  { id: 'engine', label: '按引擎' },
  { id: 'persona', label: '按人设' },
  { id: 'competitors', label: '品牌 vs 竞品' },
]
</script>

<template>
  <div class="visibility-analysis">
    <section class="vm-card">
      <div class="vm-section-head">
        <div><h2>变化趋势 <MetricDefinitionButton id="soa" /></h2><p>展示 12 周品牌提及率（SOA）变化。</p></div>
        <div class="vm-segment" role="group" aria-label="趋势维度">
          <button v-for="filter in filters" :key="filter.id" type="button" :aria-pressed="mode === filter.id" :class="{ 'is-active': mode === filter.id }" @click="mode = filter.id">
            {{ filter.label }}
          </button>
        </div>
      </div>
      <MonitoringEChart :option="trendOption" :label="`品牌提及率趋势：${filters.find(filter => filter.id === mode)?.label}`" />
      <p class="vm-chart-caption">
        {{ mode === 'persona' ? '按人设查看不同买家群体的品牌提及率趋势' : mode === 'engine' ? '按引擎查看各 AI 平台的品牌提及率趋势' : mode === 'competitors' ? '品牌与竞品的提及率趋势对比' : '整体品牌提及率（SOA）趋势' }}
      </p>
    </section>

    <section class="vm-card">
      <div class="vm-section-head">
        <div><h2>品牌提及分析</h2><p>对比当前品牌与已确认竞品在本轮监测中的整体表现。</p></div><span class="vm-pill">竞品 · {{ Math.max(0, competitors.length - 1) }}</span>
      </div>
      <div class="vm-competitors">
        <article v-for="brand in competitors" :key="brand.name" class="vm-brand-card" :class="{ 'is-own': brand.ownBrand }">
          <div class="vm-brand-card__top">
            <h3>{{ brand.name }}</h3><span>#{{ brand.rank }}</span>
          </div>
          <dl>
            <div><dt>提及率 <MetricDefinitionButton id="soa" /></dt><dd>{{ brand.mentionRate }}%</dd></div><div><dt>推荐率 <MetricDefinitionButton id="recommendation" /></dt><dd>{{ brand.recommendationRate }}%</dd></div><div v-if="brand.officialCitationRate != null">
              <dt>官网引用率 <MetricDefinitionButton id="officialCitation" /></dt><dd>{{ brand.officialCitationRate }}%</dd>
            </div>
          </dl>
        </article>
      </div>
    </section>

    <section class="vm-card">
      <div class="vm-section-head">
        <div><h2>买家人设 × 关键词 <MetricDefinitionButton id="soa" /></h2><p>展示不同买家类型在各监测关键词下的品牌提及率（SOA）。</p></div>
        <div class="vm-heatmap-legend" aria-label="热力图颜色区间">
          <span v-for="band in heatmapBands" :key="band.id"><i class="vm-heatmap-legend__swatch" :class="`is-${band.id}`" aria-hidden="true" />{{ band.label }}</span>
        </div>
      </div>
      <MonitoringEChart :option="topicOption" label="买家人设与关键词品牌提及率热力图" />
    </section>
    <section class="vm-card">
      <div class="vm-section-head">
        <div><h2>买家人设 × 购买意图（阶段） <MetricDefinitionButton id="soa" /></h2><p>展示不同采购决策阶段的品牌提及率（SOA），观察 AI 主动推荐我方的表现。</p></div>
        <div class="vm-heatmap-legend" aria-label="热力图颜色区间">
          <span v-for="band in heatmapBands" :key="band.id"><i class="vm-heatmap-legend__swatch" :class="`is-${band.id}`" aria-hidden="true" />{{ band.label }}</span>
        </div>
      </div>
      <MonitoringEChart :option="intentOption" label="买家人设与购买意图阶段热力图" />
    </section>
  </div>
</template>

<style scoped>
.visibility-analysis { display: grid; gap: 24px; }
.vm-card { min-width: 0; padding: 20px; background: var(--background-primary); border: 1px solid var(--border-default); border-radius: 12px; }
.vm-section-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 12px; }
.vm-section-head h2 { display: flex; align-items: center; gap: 4px; margin: 0; font-size: 14px; line-height: 22px; font-weight: 600; }
.vm-section-head p, .vm-chart-caption { margin: 4px 0 0; color: var(--text-secondary); }
.vm-segment { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; }
.vm-segment button, .vm-pill { min-height: 34px; padding: 5px 12px; color: var(--text-secondary); background: var(--background-primary); border: 1px solid var(--border-default); border-radius: 999px; font: inherit; cursor: pointer; }
.vm-segment button.is-active { color: var(--action-accent); background: var(--action-subtle-background); border-color: var(--action-accent); }
.vm-segment button:focus-visible { outline: 2px solid var(--action-accent); outline-offset: 2px; }
.vm-pill { display: inline-flex; align-items: center; background: var(--background-subtle); white-space: nowrap; }
.vm-competitors { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.vm-brand-card { min-width: 0; padding: 16px; background: var(--background-subtle); border: 1px solid var(--border-default); border-radius: 12px; }
.vm-brand-card.is-own { background: var(--status-success-background); border-color: var(--status-success-border); }
.vm-brand-card__top { display: flex; justify-content: space-between; gap: 8px; align-items: start; }
.vm-brand-card h3 { margin: 0; font-size: 14px; line-height: 22px; font-weight: 600; }
.vm-brand-card__top span { color: var(--text-muted); }
.vm-brand-card dl { display: grid; gap: 8px; margin: 16px 0 0; }
.vm-brand-card dl div { display: flex; justify-content: space-between; gap: 8px; }
.vm-brand-card dt { display: inline-flex; align-items: center; gap: 4px; color: var(--text-secondary); }
.vm-brand-card dd { margin: 0; font-weight: 600; font-variant-numeric: tabular-nums; }
.vm-chart-caption { font-size: var(--font-size-caption); line-height: var(--line-height-caption); }
.vm-heatmap-legend { display: flex; flex: 0 1 auto; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 8px 14px; color: var(--text-secondary); font-size: var(--font-size-caption); line-height: var(--line-height-caption); }
.vm-heatmap-legend span { display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; }
.vm-heatmap-legend__swatch { width: 12px; height: 12px; flex: 0 0 auto; border-radius: 4px; }
.vm-heatmap-legend__swatch.is-strong { background: #dcfce7; }
.vm-heatmap-legend__swatch.is-good { background: #dbeafe; }
.vm-heatmap-legend__swatch.is-weak { background: #fef3c7; }
.vm-heatmap-legend__swatch.is-blind { background: #fee2e2; }
@media (max-width: 760px) { .vm-card { padding: 16px; } .vm-section-head { flex-direction: column; } .vm-segment { justify-content: flex-start; } .vm-competitors { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 520px) { .vm-competitors { grid-template-columns: 1fr; } }
</style>

