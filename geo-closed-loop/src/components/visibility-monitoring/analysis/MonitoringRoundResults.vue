<script setup lang="ts">
import type { PageResult, QuestionHit, RoundSummary, SourceDomainMetric, SourcePageMetric } from '../../../api/monitoring'
import type { CitedPage, SourceDomain, VisibilityTab } from '../../../data/visibility-monitoring-data'
import { shallowRef } from 'vue'
import { visibilityMonitoringData } from '../../../data/visibility-monitoring-data'
import MetricDefinitionButton from '../../overview/MetricDefinitionButton.vue'
import SourceDetailDrawer from '../sources/SourceDetailDrawer.vue'
import SourceDomainTracking from '../sources/SourceDomainTracking.vue'
import BrandMentionAnalysis from './BrandMentionAnalysis.vue'
import ResponseDetailsDrawer from './ResponseDetailsDrawer.vue'

defineProps<{
  activeTab: VisibilityTab
  round: RoundSummary
  questionHits: readonly QuestionHit[]
  sourceDomains: PageResult<SourceDomainMetric>
  sourcePages: PageResult<SourcePageMetric>
}>()
const selectedQuestion = shallowRef<QuestionHit | null>(null)
const selectedSource = shallowRef<SourceDomain | CitedPage | null>(null)
const analysisData = visibilityMonitoringData
const analysisWeeks = ['07/03', '07/10', '07/17', '07/24', '07/31', '08/07', '08/14', '08/21', '08/28', '09/04', '09/11', '09/18']

function value(value: number | string | null | undefined, suffix = '') {
  return value === null || value === undefined || value === '' ? '—' : `${value}${suffix}`
}

function platformHits(raw: string | null) {
  const parsed = parseJson<unknown>(raw)
  if (!Array.isArray(parsed))
    return '—'
  return parsed.map((item) => {
    if (!item || typeof item !== 'object' || !('platform' in item))
      return ''
    const record = item as { platform?: unknown, mentioned?: unknown }
    const id = String(record.platform ?? '')
    const label = analysisData.platforms.find(platform => platform.id === id || platform.id.replace('-', '_') === id)?.label ?? id
    return label ? `${label}：${record.mentioned === true ? '提及' : record.mentioned === false ? '未提及' : '—'}` : ''
  }).filter(Boolean).join(' / ') || '—'
}

function names(raw: string | null) {
  const parsed = parseJson<unknown>(raw)
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string').join('、') || '—' : '—'
}

function parseJson<T>(raw: string | null | undefined): T | null {
  if (!raw)
    return null
  try {
    return JSON.parse(raw) as T
  }
  catch {
    return null
  }
}

function trendLabel(trend: number | null) {
  if (trend === 1)
    return '上升'
  if (trend === -1)
    return '下降'
  if (trend === 0)
    return '持平'
  return '—'
}
</script>

<template>
  <section class="vm-round-results" aria-label="服务端监测结果">
    <div v-if="activeTab === 'brand'" class="vm-result-stack">
      <BrandMentionAnalysis
        :weeks="analysisWeeks"
        :overall-series="analysisData.overallSeries"
        :series="analysisData.trendSeries"
        :engine-series="analysisData.engineSeries"
        :persona-series="analysisData.personaSeries"
        :competitors="analysisData.competitors"
        :personas="analysisData.personas"
        :topics="analysisData.topics"
        :intents="analysisData.intents"
        :topic-cells="analysisData.topicCells"
        :intent-cells="analysisData.intentCells"
      />
    </div>

    <section v-else-if="activeTab === 'questions'" class="vm-result-card">
      <header class="vm-result-head">
        <div><h2>问答命中明细</h2><p>各平台是否提及、竞品命中、官网引用及位次均来自本轮问答命中快照。</p></div><span>{{ questionHits.length }} 个问题</span>
      </header>
      <div class="vm-result-table-scroll">
        <table>
          <thead><tr><th>监测问题</th><th>买家人设</th><th>主题</th><th>平台提及与位置 <MetricDefinitionButton id="soa" /></th><th>竞品提及</th><th>引用官网 <MetricDefinitionButton id="officialCitation" /></th><th>当前位置 <MetricDefinitionButton id="rank" /></th><th>趋势</th><th>采集回答</th></tr></thead><tbody>
            <tr v-for="hit in questionHits" :key="hit.questionId">
              <th>{{ hit.questionContent }}</th><td>{{ value(hit.personaName) }}</td><td>{{ value(hit.themeName) }}</td><td>{{ platformHits(hit.platformHits) }}</td><td>{{ hit.isCompetitorMentioned === null ? '—' : hit.isCompetitorMentioned ? names(hit.competitorNames) : '否' }}</td><td>{{ hit.isOfficialCited === null ? '—' : hit.isOfficialCited === 1 ? '是' : '否' }}</td><td>{{ hit.brandRank === null ? '—' : `第 ${hit.brandRank} 位 / ${value(hit.rankTotal)}` }}</td><td>{{ trendLabel(hit.trend) }}</td><td>
                <button class="vm-response-open" type="button" @click="selectedQuestion = hit">
                  查看回答
                </button>
              </td>
            </tr>
            <tr v-if="!questionHits.length">
              <td colspan="9" class="vm-result-empty">
                本轮尚无已聚合的问答命中数据。
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-else class="vm-result-stack">
      <SourceDomainTracking :sources="analysisData.sources" :pages="analysisData.citedPages" :platforms="analysisData.platforms" @select-source="id => selectedSource = analysisData.sources.find(source => source.id === id) ?? analysisData.citedPages.find(page => page.id === id) ?? null" />
      <SourceDetailDrawer
        :source="selectedSource"
        :open="selectedSource !== null"
        :sources="analysisData.sources"
        :pages="analysisData.citedPages"
        :questions="analysisData.questions"
        :platforms="analysisData.platforms"
        @close="selectedSource = null"
        @select-page="id => selectedSource = analysisData.citedPages.find(page => page.id === id) ?? selectedSource"
      />
    </div>
    <ResponseDetailsDrawer v-if="selectedQuestion" :open="!!selectedQuestion" :round-id="round.id" :question-id="selectedQuestion.questionId" :question-text="selectedQuestion.questionContent" @close="selectedQuestion = null" />
  </section>
</template>

<style scoped>
.vm-result-stack { display: grid; gap: 16px; }
.vm-result-card { min-width: 0; padding: 20px; border: 1px solid var(--border-default); border-radius: 12px; background: var(--background-primary); }
.vm-result-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 14px; color: var(--text-secondary); }
.vm-result-head h2 { margin: 0; color: var(--text-primary); font-size: 15px; line-height: 22px; }
.vm-result-head p { margin: 4px 0 0; }
.vm-result-status { padding: 4px 10px; border-radius: 999px; color: var(--action-accent); background: var(--action-subtle-background); white-space: nowrap; }
.vm-result-table-scroll { max-height: 520px; overflow: auto; border: 1px solid var(--border-default); border-radius: 9px; }
table { width: 100%; min-width: 940px; border-collapse: collapse; text-align: left; }
thead { position: sticky; top: 0; z-index: 1; color: var(--text-secondary); background: var(--background-subtle); }
th, td { padding: 11px 12px; border-bottom: 1px solid var(--border-default); vertical-align: top; }
th { font-weight: 600; }
tbody th { min-width: 170px; color: var(--text-primary); font-weight: 500; }
tbody tr:last-child th, tbody tr:last-child td { border-bottom: 0; }
.vm-result-empty { padding: 24px; color: var(--text-muted); text-align: center; }
a { color: var(--action-accent); overflow-wrap: anywhere; }
.vm-response-open { padding: 5px 9px; border: 1px solid var(--border-default); border-radius: 7px; color: var(--action-accent); background: var(--background-primary); font: inherit; white-space: nowrap; cursor: pointer; }
@media (max-width: 720px) { .vm-result-card { padding: 15px; } .vm-result-head { flex-direction: column; } }
</style>

