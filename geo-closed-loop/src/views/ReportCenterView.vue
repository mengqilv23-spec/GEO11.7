<script setup lang="ts">
import type { ReportFilter } from '../data/report-center-data'
import { computed, onBeforeUnmount, shallowRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import { generateLatestReport, getReportList, getReportQuota } from '../api/reports'
import GenerateLatestReportDialog from '../components/report-center/GenerateLatestReportDialog.vue'
import LatestReportCard from '../components/report-center/LatestReportCard.vue'
import ReportListPanel from '../components/report-center/ReportListPanel.vue'
import Toast from '../components/ui/ce/toast/Toast.vue'
import GeoPageIntro from '../components/workbench/shared/GeoPageIntro.vue'
import { mapReportListItem } from '../data/report-api-adapters'
import { getDemoUserInfo } from '../mock/demo-user'
import { useGeoContextStore } from '../stores/geo-context'

const route = useRoute()
const geoContext = useGeoContextStore()
const reports = shallowRef<ReturnType<typeof mapReportListItem>[]>([])
const remainingQuota = shallowRef<number | null>(null)
const quotaTotal = shallowRef(0)
const quotaLoaded = shallowRef(false)
const quotaError = shallowRef('')
const reportFilter = shallowRef<ReportFilter>('all')
const pageNum = shallowRef(1)
const pageSize = 20
const total = shallowRef(0)
const counts = shallowRef({ all: 0, weekly: 0, monthly: 0, quarterly: 0, adhoc: 0 })
const loading = shallowRef(false)
const listError = shallowRef('')
const generationDialogOpen = shallowRef(false)
const generationSubmitting = shallowRef(false)
const generationError = shallowRef('')
const generationContext = shallowRef({ scopeLabel: '德国 × 德语', questionCount: 20, platformCount: 6 })
const toastOpen = shallowRef(false)
const toastMessage = shallowRef('')
const toastMessageId = shallowRef(0)
const toastVariant = shallowRef<'success' | 'warning' | 'error'>('success')
const userInfo = shallowRef(getDemoUserInfo())
const authReady = shallowRef(true)
const latestReport = computed(() => reports.value.find(report => report.type === 'adhoc') ?? reports.value[0] ?? null)
const siteId = computed(() => parseSiteId(userInfo.value?.siteId))
const marketId = computed(() => parseMarketId(route.query.marketId) ?? geoContext.marketId)
const canGenerate = computed(() => Boolean(
  siteId.value
  && marketId.value
  && quotaLoaded.value
  && !quotaError.value
  && (quotaTotal.value === 0 || (remainingQuota.value !== null && remainingQuota.value > 0)),
))

function parseSiteId(value: unknown): string | null {
  if (typeof value !== 'string')
    return null
  const id = value.trim()
  return id.length > 0 ? id : null
}

function parseMarketId(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number')
    return null
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

let listRequestId = 0
async function refreshReports() {
  const nextPage = pageNum.value
  const requestId = ++listRequestId
  if (!authReady.value) {
    loading.value = true
    listError.value = ''
    return
  }
  loading.value = true
  listError.value = ''
  try {
    const result = await getReportList({
      pageNum: nextPage,
      pageSize,
    })
    if (requestId !== listRequestId)
      return
    reports.value = result.page.records.map(mapReportListItem)
    total.value = result.page.total
    counts.value = {
      all: result.counts.all,
      weekly: result.counts.weekly,
      monthly: result.counts.monthly,
      quarterly: result.counts.quarterly,
      adhoc: result.counts.latest,
    }
  }
  catch (error) {
    if (requestId !== listRequestId)
      return
    reports.value = []
    total.value = 0
    listError.value = error instanceof Error ? error.message : '报告列表加载失败'
  }
  finally {
    if (requestId === listRequestId)
      loading.value = false
  }
}
watch([authReady, pageNum], () => void refreshReports(), { immediate: true })

let quotaRequestId = 0
async function refreshQuota() {
  const nextSiteId = siteId.value
  const requestId = ++quotaRequestId
  if (!nextSiteId) {
    remainingQuota.value = null
    quotaLoaded.value = false
    quotaError.value = ''
    return
  }
  quotaError.value = ''
  quotaLoaded.value = false
  try {
    const quota = await getReportQuota(nextSiteId)
    if (requestId !== quotaRequestId)
      return
    quotaTotal.value = quota.monthlyLimit
    remainingQuota.value = quota.residueCount
    quotaLoaded.value = true
  }
  catch (error) {
    if (requestId === quotaRequestId) {
      quotaError.value = error instanceof Error ? error.message : '额度加载失败'
      quotaTotal.value = -1
      quotaLoaded.value = true
    }
  }
}
watch(siteId, () => void refreshQuota(), { immediate: true })

function openGenerationDialog(context: typeof generationContext.value) {
  generationContext.value = context
  generationError.value = ''
  generationDialogOpen.value = true
}

async function submitLatestGeneration() {
  if (!siteId.value || !marketId.value || !canGenerate.value || generationSubmitting.value)
    return

  generationSubmitting.value = true
  generationError.value = ''
  try {
    const result = await generateLatestReport({ siteId: siteId.value, marketId: marketId.value })
    generationDialogOpen.value = false
    const taskMessages = {
      0: '生成任务已提交',
      1: '报告正在生成',
      2: '报告已生成',
      3: '报告生成失败',
      4: '生成任务已取消',
    } as const
    toastMessage.value = `${taskMessages[result.status]}：${result.taskNo}`
    toastVariant.value = result.status === 3 ? 'error' : result.status === 4 ? 'warning' : 'success'
    toastMessageId.value += 1
    toastOpen.value = true
    await Promise.all([refreshQuota(), refreshReports()])
  }
  catch (error) {
    generationError.value = error instanceof Error ? error.message : '报告生成任务提交失败，请稍后重试。'
  }
  finally {
    generationSubmitting.value = false
  }
}

function closeToast() {
  toastOpen.value = false
}

onBeforeUnmount(() => {
  toastOpen.value = false
})

function changeFilter(filter: ReportFilter) {
  reportFilter.value = filter
  pageNum.value = 1
}
</script>

<template>
  <main class="report-center-view">
    <GeoPageIntro title="报告中心" help-label="报告中心说明" description="集中查看次报、周报、月报与季报；次报由用户点击「生成最新报告」后触发生成。" />

    <LatestReportCard
      :report="latestReport"
      :remaining="remainingQuota"
      :quota-total="quotaTotal"
      :quota-ready="quotaLoaded"
      :can-generate="canGenerate && !generationSubmitting"
      @generate="openGenerationDialog"
    />
    <p v-if="quotaError" class="quota-error" role="status">
      报告额度暂不可用：{{ quotaError }}
    </p>
    <ReportListPanel
      :model-value="reportFilter"
      :reports="reports"
      :counts="counts"
      :page-num="pageNum"
      :page-size="pageSize"
      :total="total"
      :loading="loading"
      :error="listError"
      :site-id="siteId"
      :market-id="marketId"
      @update:model-value="changeFilter"
      @change-page="pageNum = $event"
    />

    <GenerateLatestReportDialog
      v-model:open="generationDialogOpen"
      :scope-label="generationContext.scopeLabel"
      :question-count="generationContext.questionCount"
      :platform-count="generationContext.platformCount"
      :remaining="remainingQuota"
      :unlimited="quotaLoaded && quotaTotal === 0"
      :loading="generationSubmitting"
      :error="generationError"
      @confirm="submitLatestGeneration"
    />
    <Toast :open="toastOpen" :message-id="toastMessageId" :variant="toastVariant" close-label="关闭提示" @close="closeToast">
      {{ toastMessage }}
    </Toast>
  </main>
</template>

<style scoped>
.report-center-view { display: grid; min-width: 0; align-content: start; gap: 24px; padding: 0; color: var(--text-primary); }
.quota-error { margin: -16px 0 0; color: var(--status-error-foreground, #b91c1c); font-size: 12px; }
@media (max-width: 760px) { .report-center-view { gap: var(--space-6); } }
</style>

