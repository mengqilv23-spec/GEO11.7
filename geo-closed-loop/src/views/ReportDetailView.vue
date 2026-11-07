<script setup lang="ts">
import type { ReportType } from '../data/report-center-data'
import { computed, shallowRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import ReportDetailDocument from '../components/report-center/ReportDetailDocument.vue'
import { getReportDetailData } from '../data/report-detail-data'
import { findMockReportById } from '../mock/report-service'

const route = useRoute()
const report = shallowRef<ReturnType<typeof getReportDetailData>>(null)
const prototypeType = shallowRef<ReportType | null>(null)
const loading = shallowRef(false)
const error = shallowRef('')
const prototypeUrl = computed(() => prototypeType.value ? `${import.meta.env.BASE_URL}report-prototypes/${prototypeType.value}.html` : '')
const backQuery = new URLSearchParams()
if (typeof route.query.siteId === 'string')
  backQuery.set('siteId', route.query.siteId)
if (typeof route.query.marketId === 'string')
  backQuery.set('marketId', route.query.marketId)
const backQueryString = backQuery.toString()
const backHref = `/report-center${backQueryString ? `?${backQueryString}` : ''}`

watch(() => String(route.params.reportId ?? ''), async (reportId) => {
  error.value = ''
  report.value = null
  prototypeType.value = null
  const record = findMockReportById(reportId)
  if (!record) {
    report.value = getReportDetailData(reportId)
    return
  }
  prototypeType.value = record.type
  const profile = getReportDetailData(record.type)
  report.value = profile ? { ...profile, title: record.title, date: record.date, cycle: record.period, status: record.status, focus: record.summary, scopeSummary: record.scopeSummary } : null
}, { immediate: true })
</script>

<template>
  <main v-if="prototypeType" class="report-prototype-view">
    <iframe
      class="report-prototype-view__frame"
      :src="prototypeUrl"
      :title="`${({ weekly: '周报', monthly: '月报', quarterly: '季报', adhoc: '次报' })[prototypeType]}内容`"
      sandbox="allow-scripts allow-downloads allow-modals allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
      referrerpolicy="no-referrer"
    />
  </main>
  <ReportDetailDocument v-else-if="report" :profile="report" :back-href="backHref" />
  <main v-else-if="loading" class="report-loading" role="status" aria-live="polite">
    <span class="loading-spinner" aria-hidden="true" />
    <span>正在加载报告…</span>
  </main>
  <main v-else-if="error" class="report-not-found" role="alert">
    <section><span>GEO Agent · 报告中心</span><h1>报告加载失败</h1><p>{{ error }}</p><a :href="backHref">返回报告中心</a></section>
  </main>
  <main v-else class="report-not-found">
    <section>
      <span>GEO Agent · 报告中心</span>
      <h1>找不到这份报告</h1>
      <p>链接可能已失效，或报告尚未生成。</p>
      <a :href="backHref">返回报告中心</a>
    </section>
  </main>
</template>

<style scoped>
.report-prototype-view { width: 100%; min-height: 100vh; background: #f4f6fa; }
.report-prototype-view__frame { display: block; width: 100%; height: 100vh; min-height: 700px; border: 0; background: #f4f6fa; }
.report-not-found { display: grid; min-height: 100vh; place-items: center; padding: 24px; background: #f4f6fa; color: #172033; }
.report-not-found section { width: min(100%, 520px); padding: 32px; border: 1px solid #dde5ee; border-radius: 12px; background: #fff; }
.report-not-found span { color: #2563eb; font-size: 12px; font-weight: 700; }
.report-not-found h1 { margin: 10px 0 6px; font-size: 24px; }
.report-not-found p { margin: 0 0 20px; color: #5f6e82; font-size: 14px; }
.report-not-found a { color: #1d4ed8; font-size: 14px; font-weight: 650; }
.report-loading { display: flex; min-height: 100vh; align-items: center; justify-content: center; gap: 10px; color: #64748b; font-size: 14px; }
.loading-spinner { width: 16px; height: 16px; border: 2px solid #dbe4ef; border-top-color: #2563eb; border-radius: 50%; animation: report-spin 700ms linear infinite; }
@keyframes report-spin { to { transform: rotate(360deg); } }
</style>

