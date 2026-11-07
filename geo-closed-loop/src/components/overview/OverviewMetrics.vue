<script setup lang="ts">
import type { BrandMetric } from '../../api/monitoring'
import type { OverviewTrend } from '../../data/monitoring-api-adapters'
import { computed } from 'vue'
import MonitoringEChart from '../visibility-monitoring/analysis/MonitoringEChart.vue'
import MetricDefinitionButton from './MetricDefinitionButton.vue'
import { createOverviewTrendOption } from './overview-chart-options'

const props = defineProps<{ trend: OverviewTrend, brandMetric: BrandMetric | null }>()
const metricDefinitions = [
  { id: 'soa', label: '品牌提及率（SOA）', field: 'mentionRate', previous: 'mentionVsPrevPp', first: 'mentionVsFirstPp', tone: 'blue' },
  { id: 'recommendation', label: '品牌推荐率', field: 'recommendRate', previous: 'recommendVsPrevPp', first: 'recommendVsFirstPp', tone: 'green' },
  { id: 'officialCitation', label: '官网引用率', field: 'citationRate', previous: 'citeVsPrevPp', first: 'citeVsFirstPp', tone: 'cyan' },
  { id: 'sov', label: '声量份额（SOV）', field: 'sovRate', previous: 'sovVsPrevPp', first: 'sovVsFirstPp', tone: 'violet' },
] as const
const formatRate = (value: number | null | undefined) => value == null ? '—' : `${value}%`
const formatChange = (value: number | null | undefined) => value == null ? '—' : `${value > 0 ? '+' : ''}${value}pp`
const metricCards = computed(() => metricDefinitions.map((definition) => {
  const metric = props.brandMetric
  return {
    ...definition,
    value: formatRate(metric?.[definition.field]),
    previous: formatChange(metric?.[definition.previous]),
    first: formatChange(metric?.[definition.first]),
  }
}))
const trendOption = computed(() => createOverviewTrendOption({ weeks: props.trend.weeks, series: props.trend.series }))
const sentimentLabel = computed(() => props.brandMetric
  ? `正面 ${props.brandMetric.sentimentPositiveCount ?? '—'} · 中性 ${props.brandMetric.sentimentNeutralCount ?? '—'} · 负面 ${props.brandMetric.sentimentNegativeCount ?? '—'}`
  : '—')
</script>

<template>
  <section class="overview-metrics" aria-labelledby="overview-metrics-title">
    <div class="overview-section-heading">
      <div>
        <span class="overview-section-heading__index" aria-hidden="true">①</span>
        <h2 id="overview-metrics-title">
          核心指标概览
        </h2>
      </div>
    </div>

    <div class="overview-metrics__surface">
      <div class="overview-metrics__cards">
        <article v-for="metric in metricCards" :key="metric.id" class="overview-metric-card" :data-metric="metric.id">
          <div class="overview-metric-card__heading">
            <h3>{{ metric.label }} <MetricDefinitionButton :id="metric.id" /></h3>
          </div>
          <div class="overview-metric-card__value">
            <span>本次监测</span>
            <strong>{{ metric.value }}</strong>
          </div>
          <div class="overview-metric-card__comparison">
            <div class="overview-metric-card__period">
              <span>较上次监测（pp）</span>
              <div><b :class="`is-${metric.tone}`">{{ metric.previous }}</b></div>
            </div>
            <div class="overview-metric-card__period">
              <span>较首次监测（pp）</span>
              <div><b :class="`is-${metric.tone}`">{{ metric.first }}</b></div>
            </div>
          </div>
        </article>
      </div>

      <MonitoringEChart v-if="trend.weeks.length" :option="trendOption" label="品牌提及率、推荐率、官网引用率和声量份额近七轮趋势图" />
      <p v-else class="overview-metrics__empty">
        暂无可展示的监测趋势
      </p>

      <div class="overview-metrics__insights">
        <article class="overview-insight" data-testid="average-rank">
          <span class="overview-insight__label">平均位次（Rank） <MetricDefinitionButton id="rank" /></span>
          <strong>{{ brandMetric?.avgRank == null ? '—' : `${brandMetric.avgRank} 位` }}</strong>
          <div class="overview-insight__top-ranks" aria-label="Top1、Top3 和 Top5 位次率">
            <span>Top1率 <b>{{ formatRate(brandMetric?.top1Rate) }}</b><MetricDefinitionButton id="topRank" /></span>
            <span>Top3率 <b>{{ formatRate(brandMetric?.top3Rate) }}</b><MetricDefinitionButton id="topRank" /></span>
            <span>Top5率 <b>{{ formatRate(brandMetric?.top5Rate) }}</b><MetricDefinitionButton id="topRank" /></span>
          </div>
        </article>
        <article class="overview-insight" data-testid="factual-accuracy">
          <span class="overview-insight__label">讲对了吗（事实准确率） <MetricDefinitionButton id="factAccuracy" /></span>
          <strong>事实准确率 {{ formatRate(brandMetric?.factAccuracyRate) }}</strong>
          <small>情绪样本：{{ sentimentLabel }}</small>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.overview-section-heading, .overview-section-heading > div { display: flex; align-items: center; }
.overview-section-heading { justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.overview-section-heading > div { gap: 8px; }
.overview-section-heading h2 { margin: 0; color: var(--text-primary); font-size: 14px; line-height: 22px; font-weight: 600; }
.overview-section-heading__index { color: var(--action-accent); font-size: 16px; }
.overview-metrics__surface { min-width: 0; padding: 16px; border: 1px solid var(--border-default); border-radius: 14px; background: var(--background-primary); }
.overview-metrics__empty { display: grid; min-height: 120px; place-items: center; margin: 0; color: var(--text-muted); }
.overview-metrics__cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.overview-metric-card { min-width: 0; padding: 14px 16px; border: 1px solid var(--border-default); border-radius: 10px; background: var(--background-primary); box-shadow: 0 1px 2px rgb(20 35 60 / 5%); }
.overview-metric-card__heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.overview-metric-card h3 { display: flex; align-items: center; gap: 4px; overflow: hidden; margin: 0; color: var(--text-secondary); font-size: var(--font-size-caption); line-height: var(--line-height-caption); font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.overview-metric-card__value { display: flex; align-items: baseline; justify-content: space-between; min-height: 46px; color: var(--text-secondary); font-size: 12px; line-height: 1.2; }
.overview-metric-card__value strong { color: var(--text-primary); font-size: 32px; font-weight: 720; }
.overview-metric-card__comparison { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; padding-top: 8px; border-top: 1px solid var(--border-divider); color: var(--text-muted); font-size: 11px; }
.overview-metric-card__period { display: grid; gap: 3px; min-width: 0; }
.overview-metric-card__period > span { white-space: nowrap; }
.overview-metric-card__period > div { display: flex; justify-content: space-between; gap: 6px; }
.overview-metric-card__period strong { color: var(--text-primary); }
.overview-metric-card__period b { font-weight: 700; }
.is-blue { color: #2563eb; }.is-green { color: #059669; }.is-cyan { color: #0891b2; }.is-violet { color: #7c3aed; }
.overview-metrics__insights { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px; padding-top: 14px; border-top: 1px solid var(--border-divider); }
.overview-insight { display: grid; align-content: start; gap: 7px; min-width: 0; padding: 12px 14px; border: 1px dashed var(--border-default); border-radius: 10px; background: var(--background-secondary); }
.overview-insight__label { display: flex; align-items: center; gap: 7px; color: var(--text-secondary); font-size: 12px; font-weight: 600; }
.overview-insight strong { color: var(--text-primary); font-size: 14px; line-height: 22px; }
.overview-insight strong span { color: var(--text-muted); font-weight: 400; }
.overview-insight strong em { color: var(--status-error-foreground); font-size: inherit; font-style: normal; }
.overview-insight small { color: var(--text-muted); font-size: 11px; }
.overview-insight__top-ranks { display: flex; flex-wrap: wrap; gap: 10px; color: var(--text-muted); font-size: 11px; }
.overview-insight__top-ranks span { display: inline-flex; align-items: center; gap: 4px; }
.overview-insight__top-ranks b { color: var(--text-primary); }
.overview-accuracy-bar { display: flex; height: 7px; overflow: hidden; border-radius: 999px; background: var(--background-tertiary, var(--border-divider)); }
.overview-accuracy-bar i:first-child { width: 93%; background: var(--status-success-foreground, #047857); }
.overview-accuracy-bar i:last-child { width: 7%; background: var(--status-error-foreground); }
@media (max-width: 960px) { .overview-metrics__cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 560px) { .overview-metrics__surface { padding: 12px; } .overview-metrics__cards, .overview-metrics__insights { grid-template-columns: 1fr; } .overview-metric-card__value { min-height: 40px; font-size: 28px; } }
</style>

