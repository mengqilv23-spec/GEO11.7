<script setup lang="ts">
import type { BuyerPersonaRecord, GeoDictionaryItem, GeoMarket, MarketThemeRecord, MonitoringQuestionRecord, SelectedPlatformRecord } from '../api/geo-config'
import type { BrandMetric, MarketTrend, PlatformMetric } from '../api/monitoring'
import { computed, inject, onMounted, shallowRef } from 'vue'
import { routerKey } from 'vue-router'
import { getDictionary, getMarketPersonas, getMarketPlatforms, getMarketQuestions, getMarkets, getMarketThemes } from '../api/geo-config'
import { getBrandMetrics, getMarketTrend, getPlatformMetrics, getRoundDetail } from '../api/monitoring'
import OverviewMetrics from '../components/overview/OverviewMetrics.vue'
import AgentWorkQueue from '../components/overview/AgentWorkQueue.vue'
import PlatformPerformance from '../components/overview/PlatformPerformance.vue'
import { Button, Modal } from '../components/ui/ce'
import Spinner from '../components/ui/ce/spinner/Spinner.vue'
import MonitoringOverview from '../components/visibility-monitoring/analysis/MonitoringOverview.vue'
import GeoPageIntro from '../components/workbench/shared/GeoPageIntro.vue'
import { useMonitoringSchedule } from '../composables/use-monitoring-schedule'
import { toOverviewTrend } from '../data/monitoring-api-adapters'
import { overviewQueuePreview } from '../data/overview-data'
import { formatMarketLanguage, toMonitoringOverviewMetrics } from '../data/monitoring-overview-summary'
import { useGeoContextStore } from '../stores/geo-context'

interface OverviewConfigurationData {
  market: string
  personas: BuyerPersonaRecord[] | null
  questions: MonitoringQuestionRecord[] | null
  themes: MarketThemeRecord[] | null
  platforms: SelectedPlatformRecord[] | null
}

const trend = shallowRef<MarketTrend | null>(null)
const brandMetric = shallowRef<BrandMetric | null>(null)
const platformMetrics = shallowRef<PlatformMetric[]>([])
const roundDetail = shallowRef<Awaited<ReturnType<typeof getRoundDetail>> | null>(null)
const loading = shallowRef(true)
const error = shallowRef('')
const monitoringSchedule = useMonitoringSchedule()
const geoContext = useGeoContextStore()
const router = inject(routerKey, null)
const configurationMetrics = shallowRef<OverviewConfigurationData>({ market: '', personas: null, questions: null, themes: null, platforms: null })
const enableConfirmationOpen = shallowRef(false)
const monitoringStatusText = computed(() => {
  if (monitoringSchedule.loading.value)
    return '读取中'
  if (monitoringSchedule.error.value)
    return '状态读取失败'
  return monitoringSchedule.schedule.value ? (monitoringSchedule.enabled.value ? '进行中' : '已暂停') : '未配置'
})
const overviewStats = computed(() => toMonitoringOverviewMetrics({ ...configurationMetrics.value, totalSample: roundDetail.value?.totalSample }))

async function loadConfigurationMetrics() {
  const results = await Promise.allSettled([
    getMarkets(),
    getDictionary('country'),
    getDictionary('language'),
    getMarketPersonas(),
    getMarketQuestions(),
    getMarketThemes(),
    getMarketPlatforms(),
  ])
  const [marketsResult, countriesResult, languagesResult, personasResult, questionsResult, themesResult, platformsResult] = results
  configurationMetrics.value = {
    market: formatMarketLanguage(
      geoContext.marketId,
      marketsResult.status === 'fulfilled' ? marketsResult.value as GeoMarket[] : null,
      countriesResult.status === 'fulfilled' ? countriesResult.value as GeoDictionaryItem[] : null,
      languagesResult.status === 'fulfilled' ? languagesResult.value as GeoDictionaryItem[] : null,
    ),
    personas: personasResult.status === 'fulfilled' ? personasResult.value : null,
    questions: questionsResult.status === 'fulfilled' ? questionsResult.value : null,
    themes: themesResult.status === 'fulfilled' ? themesResult.value : null,
    platforms: platformsResult.status === 'fulfilled' ? platformsResult.value : null,
  }
}

async function loadOverview() {
  loading.value = true
  error.value = ''
  try {
    const result = await getMarketTrend(12)
    trend.value = result
    const currentRound = result.rounds.at(-1)
    if (currentRound) {
      const [brands, platforms, detail] = await Promise.all([
        getBrandMetrics(currentRound.roundId),
        getPlatformMetrics(currentRound.roundId),
        getRoundDetail(currentRound.roundId),
      ])
      brandMetric.value = brands.find(metric => metric.brandType === 1) ?? null
      platformMetrics.value = platforms
      roundDetail.value = detail
    }
    else {
      brandMetric.value = null
      platformMetrics.value = []
      roundDetail.value = null
    }
  }
  catch (cause) {
    trend.value = null
    brandMetric.value = null
    platformMetrics.value = []
    roundDetail.value = null
    error.value = cause instanceof Error ? cause.message : '概览数据加载失败，请稍后重试。'
  }
  finally {
    loading.value = false
  }
}

function toggleMonitoring() {
  if (monitoringSchedule.enabled.value) {
    void monitoringSchedule.toggle()
    return
  }
  if (monitoringSchedule.schedule.value && !monitoringSchedule.loading.value && !monitoringSchedule.error.value)
    enableConfirmationOpen.value = true
}

async function enableCurrentMarket() {
  if (await monitoringSchedule.toggle())
    enableConfirmationOpen.value = false
}

function openQueueItem(item: typeof overviewQueuePreview[number]) {
  if (item.id === 'candidate-competitors') {
    void router?.push({ name: 'visibility-monitoring' })
    return
  }
  void router?.push({ name: 'optimization' })
}

function openQueueSecondaryItem() {
  void router?.push({ name: 'visibility-monitoring' })
}

onMounted(() => {
  void loadOverview()
  void loadConfigurationMetrics()
  void monitoringSchedule.load()
})
</script>

<template>
  <div class="geo-page overview-page">
    <GeoPageIntro title="概览" help-label="概览说明" description="查看当前市场的监测指标趋势与各 AI 平台表现。" />

    <p v-if="loading" class="overview-page__message overview-page__loading" role="status">
      <Spinner variant="ring" aria-hidden="true" />
      加载中…
    </p>
    <div v-else-if="error" class="overview-page__error" role="alert">
      <span>{{ error }}</span>
      <button type="button" @click="loadOverview">
        重试
      </button>
    </div>
    <p v-else-if="!trend?.rounds.length" class="overview-page__message" role="status">
      当前市场暂无监测轮次数据。
    </p>
    <template v-else>
      <MonitoringOverview
        :round="roundDetail"
        :detail="roundDetail"
        :additional-metrics="overviewStats"
        variant="overview"
        :show-round-number="true"
        :monitoring-enabled="monitoringSchedule.enabled.value"
        :status-text="monitoringStatusText"
        :toggle-disabled="monitoringSchedule.loading.value || !!monitoringSchedule.error.value || !monitoringSchedule.schedule.value"
        :toggle-pending="monitoringSchedule.pending.value"
        :show-trigger="false"
        @toggle-monitoring="toggleMonitoring"
      />
      <div v-if="monitoringSchedule.error.value" class="overview-page__error" role="alert">
        <span>监测计划状态加载失败：{{ monitoringSchedule.error.value }}</span>
        <button type="button" @click="monitoringSchedule.load()">
          重试
        </button>
      </div>
      <OverviewMetrics :trend="toOverviewTrend(trend)" :brand-metric="brandMetric" />
      <PlatformPerformance :metrics="platformMetrics" />
      <AgentWorkQueue :items="overviewQueuePreview" @open-item="openQueueItem" @open-secondary-item="openQueueSecondaryItem" />
    </template>
    <Modal v-model:open="enableConfirmationOpen" title="开启当前市场？" width="min(760px, calc(100vw - 32px))" confirm-text="开启当前市场" cancel-text="暂不开启" processing-text="开启中…" close-label="关闭开启确认" :footer="undefined">
      <p class="overview-page__enable-copy">
        开启后按原定采集计划运行，历史数据与报告保留。
      </p>
      <template #footer>
        <Button variant="outline" @click="enableConfirmationOpen = false">
          暂不开启
        </Button>
        <Button variant="primary" :disabled="monitoringSchedule.pending.value" :aria-busy="monitoringSchedule.pending.value" @click="enableCurrentMarket">
          开启当前市场
        </Button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.overview-page { display: grid; min-width: 0; align-content: start; gap: 24px; padding: 0; font-size: var(--font-size-body); line-height: var(--line-height-body); }
.overview-page__message, .overview-page__error { display: flex; align-items: center; justify-content: center; gap: 12px; min-height: 120px; margin: 0; padding: 24px; border: 1px solid var(--border-default); border-radius: 14px; color: var(--text-muted); background: var(--background-primary); text-align: center; }
.overview-page__error { color: var(--status-error-foreground); }
.overview-page__loading { gap: 10px; --spinner-color: var(--action-accent); }
.overview-page__error button { padding: 7px 12px; border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-primary); background: var(--background-primary); cursor: pointer; }
.overview-page__enable-copy { margin: 0; color: var(--text-secondary); font-size: 14px; line-height: 22px; }
@media (max-width: 560px) { .overview-page { gap: 18px; } }
</style>

