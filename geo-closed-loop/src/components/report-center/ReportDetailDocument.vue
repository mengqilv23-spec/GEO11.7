<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import type { ReportDetailProfile } from '../../data/report-detail-data'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { getReportSectionLabels } from '../../data/report-detail-data'
import { cloneReportForExport, createStandaloneReportHtml } from './report-export'
import ReportCompetitorBreakdown from './ReportCompetitorBreakdown.vue'
import ReportEChart from './ReportEChart.vue'
import ReportExportDialog from './ReportExportDialog.vue'

const props = withDefaults(defineProps<{ profile: ReportDetailProfile, backHref?: string }>(), { backHref: '/report-center' })
const sections = getReportSectionLabels()
const documentElement = shallowRef<HTMLDivElement | null>(null)
const activeSection = shallowRef<string>('summary')
const exportDialogOpen = ref(false)
const exportingForPrint = ref(false)
const selectedExportSections = ref<string[]>([])
const competitors = computed(() => props.profile.isLiveData
  ? (props.profile.competitorRanks ?? []).map(item => ({ name: item.name, value: Number.parseFloat(item.mention), rank: item.rank, isOwn: item.isOwn }))
  : [
      { name: 'Flow', value: 58, rank: 1, isOwn: false },
      { name: 'APW Waterjet', value: Number.parseInt(props.profile.metrics[0]?.value ?? '42', 10), rank: 2, isOwn: true },
      { name: 'OMAX', value: 38, rank: 3, isOwn: false },
      { name: 'KMT', value: 31, rank: 4, isOwn: false },
    ])
const competitorChartOption = computed<EChartsOption>(() => ({
  animation: false,
  grid: { left: 94, right: 38, top: 8, bottom: 8 },
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: value => `${value}%` },
  xAxis: { type: 'value', max: Math.max(10, ...competitors.value.map(item => item.value || 0)) * 1.15, axisLabel: { show: false }, axisTick: { show: false }, axisLine: { show: false }, splitLine: { lineStyle: { color: '#eaf0f5' } } },
  yAxis: { type: 'category', inverse: true, data: competitors.value.map(item => item.name), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: '#39475a', fontSize: 11 } },
  series: [{
    type: 'bar',
    data: competitors.value.map(item => ({ value: item.value, itemStyle: { color: item.isOwn ? '#2563eb' : '#94a3b8' } })),
    barMaxWidth: 15,
    showBackground: true,
    backgroundStyle: { color: '#eef2f7', borderRadius: 8 },
    itemStyle: { borderRadius: [0, 8, 8, 0] },
    label: { show: true, position: 'right', color: '#39475a', fontSize: 10, formatter: '{c}%' },
  }],
}))
const personaChartOption = computed<EChartsOption>(() => ({
  animation: false,
  grid: { left: 150, right: 44, top: 8, bottom: 8 },
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: value => `${value}%` },
  xAxis: { type: 'value', max: 100, axisLabel: { show: false }, axisTick: { show: false }, axisLine: { show: false }, splitLine: { lineStyle: { color: '#eaf0f5' } } },
  yAxis: { type: 'category', inverse: true, data: props.profile.personas.map(item => item.name), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: '#39475a', fontSize: 10 } },
  series: [{
    type: 'bar',
    data: props.profile.personas.map(item => Number.parseInt(item.mention, 10)),
    barMaxWidth: 13,
    showBackground: true,
    backgroundStyle: { color: '#eef2f7', borderRadius: 8 },
    itemStyle: { color: '#3b82f6', borderRadius: [0, 8, 8, 0] },
    label: { show: true, position: 'right', color: '#39475a', fontSize: 10, formatter: '{c}%' },
  }],
}))
const coreMetricChartOption = computed<EChartsOption>(() => {
  const definitions = [
    { name: '品牌提及率（SOA）', matcher: /mention_rate|\bsoa\b|品牌提及率/i, color: '#2563eb' },
    { name: '品牌推荐率', matcher: /recommend(?:ation)?_rate|品牌推荐率/i, color: '#059669' },
    { name: '官网引用率', matcher: /citation_rate|官网引用率/i, color: '#0891b2' },
    { name: '声量份额（SOV）', matcher: /sov_rate|\bsov\b|声量份额/i, color: '#7c3aed' },
  ]
  const trendPoints = props.profile.trendPoints ?? []
  const hasMetricTrends = trendPoints.some(point => point.metricCode)

  let categories: string[]
  let series: Array<{ name: string, type: 'line', data: Array<number | null>, smooth: boolean, showSymbol: boolean, symbolSize: number, itemStyle: { color: string }, lineStyle: { color: string, width: number } }>

  if (hasMetricTrends) {
    const timelines = [...new Map(trendPoints.map(point => [
      `${point.date}::${point.roundId ?? ''}`,
      { key: `${point.date}::${point.roundId ?? ''}`, date: point.date, sort: point.sort ?? Number.MAX_SAFE_INTEGER },
    ])).values()].sort((a, b) => a.sort - b.sort || a.date.localeCompare(b.date))
    categories = timelines.map(item => item.date)
    series = definitions.map(definition => ({
      name: definition.name,
      type: 'line',
      data: timelines.map((timeline) => {
        const point = trendPoints.find(item => `${item.date}::${item.roundId ?? ''}` === timeline.key && definition.matcher.test(item.metricCode ?? ''))
        return point?.value ?? null
      }),
      smooth: true,
      showSymbol: true,
      symbolSize: 7,
      itemStyle: { color: definition.color },
      lineStyle: { color: definition.color, width: 2.5 },
    }))
  }
  else {
    const metricsWithBaselines = !props.profile.isLiveData && props.profile.metrics.some(metric => metric.baseline !== '—' && Number.isFinite(Number.parseFloat(metric.baseline)))
    categories = metricsWithBaselines
      ? [props.profile.comparison || '上期', props.profile.date || '本期']
      : [props.profile.date || '本次']
    series = definitions.map((definition) => {
      const metric = props.profile.metrics.find(item => definition.matcher.test(item.label))
      const value = Number.parseFloat(metric?.value ?? '')
      const baseline = Number.parseFloat(metric?.baseline ?? '')
      const data = metricsWithBaselines
        ? [Number.isFinite(baseline) ? baseline : null, Number.isFinite(value) ? value : null]
        : [Number.isFinite(value) ? value : null]
      return {
        name: definition.name,
        type: 'line',
        data,
        smooth: true,
        showSymbol: true,
        symbolSize: 7,
        itemStyle: { color: definition.color },
        lineStyle: { color: definition.color, width: 2.5 },
      }
    })
  }

  const values = series.flatMap(item => item.data).filter((value): value is number => value !== null)
  const maxValue = Math.max(10, ...values)
  const axisMax = Math.min(100, Math.ceil(maxValue / 10) * 10)

  return {
    animation: false,
    color: definitions.map(item => item.color),
    grid: { left: 44, right: 30, top: 36, bottom: 36 },
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 10, textStyle: { color: '#64748b', fontSize: 11 } },
    tooltip: { trigger: 'axis', valueFormatter: value => `${value}%` },
    xAxis: { type: 'category', data: categories, boundaryGap: false, axisTick: { show: false }, axisLine: { lineStyle: { color: '#dbe4ef' } }, axisLabel: { color: '#8291a5', fontSize: 10 } },
    yAxis: { type: 'value', min: 0, max: axisMax, axisLabel: { color: '#8291a5', formatter: '{value}%' }, splitLine: { lineStyle: { color: '#e8eef5' } } },
    series,
  }
})
const platformSummaries = computed(() => {
  const groups = new Map<string, typeof props.profile.platforms>()
  for (const platform of props.profile.platforms) {
    const group = /google|gemini/i.test(platform.name) ? 'Google 系' : platform.name
    groups.set(group, [...(groups.get(group) ?? []), platform])
  }
  return [...groups].map(([name, items]) => ({
    name,
    detail: items.map(item => `${item.name} · ${item.mention}`).join('，'),
  }))
})
const personaThemes = computed(() => [...new Set(props.profile.personaThemeMatrix?.map(item => item.theme).filter(Boolean) ?? [])])
const personaThemeRows = computed(() => {
  const matrix = props.profile.personaThemeMatrix ?? []
  return [...new Set(matrix.map(item => item.persona).filter(Boolean))].map(persona => ({
    persona,
    values: Object.fromEntries(matrix.filter(item => item.persona === persona).map(item => [item.theme, item.value])),
  }))
})
function heatmapCellClass(value?: string) {
  const percent = Number.parseFloat(value ?? '')
  if (!Number.isFinite(percent))
    return ''
  if (percent >= 70)
    return 'is-strong'
  if (percent >= 35)
    return 'is-medium'
  return 'is-low'
}
function isSupportNote(note?: string) {
  return Boolean(note && /有效样本|样本\s*\d|95%\s*(?:区间|置信)|置信区间/.test(note))
}
const auxiliaryMetrics = computed(() => {
  const rows = (props.profile.metricRows ?? []).filter(metric => metric.dimensionType === 'overall')
  const identify = (row: typeof rows[number], pattern: RegExp) => pattern.test(`${row.code ?? ''} ${row.name}`)
  const rank = rows.find(row => identify(row, /avg.?rank|average.?rank|平均位次/i))
  const positive = rows.find(row => identify(row, /sentiment.*positive|positive.*sentiment|情感正面|正向占比/i))
  const neutral = rows.find(row => identify(row, /sentiment.*neutral|neutral.*sentiment|情感中性|中性占比/i))
  const negative = rows.find(row => identify(row, /sentiment.*negative|negative.*sentiment|情感负面|负面占比/i))
  const factualAccuracy = rows.find(row => identify(row, /factual.?accuracy|事实准确率/i))
  const factualError = rows.find(row => identify(row, /factual.?error|事实错误率/i))
  const sampleNote = (sample: string) => sample !== '—' ? `样本 ${sample}` : '—'
  const metrics = []

  if (rank)
    metrics.push({ name: '平均位次', value: `${rank.value}${rank.unit === 'rank' ? ' 位' : ''}`, note: sampleNote(rank.sample) })

  const sentiment = [positive && `正向 ${positive.value}`, neutral && `中性 ${neutral.value}`].filter(Boolean).join(' · ')
  if (sentiment)
    metrics.push({ name: '情绪分布', value: sentiment, note: negative ? `负向 ${negative.value}` : sampleNote(positive?.sample ?? neutral?.sample ?? '—') })

  if (factualAccuracy)
    metrics.push({ name: '讲对了吗', value: `事实准确率 ${factualAccuracy.value}`, note: factualError ? `事实错误率 ${factualError.value}` : sampleNote(factualAccuracy.sample) })

  return metrics
})
const sourceInsights = computed(() => {
  const sources = props.profile.sources
  const pages = props.profile.sourcePages ?? []
  if (!sources.length && !pages.length)
    return null

  const citationCount = (value: string) => Number.parseInt(value, 10) || 0
  const totalCitations = sources.reduce((sum, source) => sum + citationCount(source.citations), 0)
  const knownSources = sources.filter(source => source.ourMentioned === '是' || source.ourMentioned === '否')
  const thirdPartyCitations = knownSources
    .filter(source => source.ourMentioned === '否')
    .reduce((sum, source) => sum + citationCount(source.citations), 0)
  const topSource = [...sources].sort((a, b) => citationCount(b.citations) - citationCount(a.citations))[0]

  return {
    thirdPartyShare: totalCitations && knownSources.length === sources.length ? `${(thirdPartyCitations / totalCitations * 100).toFixed(1)}%` : '—',
    topDomain: topSource?.domain || '—',
    topDomainCitations: topSource ? citationCount(topSource.citations) : 0,
    ourPageCount: pages.filter(page => page.ourMentioned === '是').length,
  }
})

function updateActiveSection() {
  const report = documentElement.value
  if (!report)
    return

  const scrollHeight = document.documentElement.scrollHeight
  if (scrollHeight > window.innerHeight && window.scrollY + window.innerHeight >= scrollHeight - 2) {
    activeSection.value = sections.at(-1)?.[0] ?? sections[0][0]
    return
  }

  const visibleSections = Array.from(report.querySelectorAll<HTMLElement>('.report-section'))
  const current = visibleSections.filter(section => section.getBoundingClientRect().top <= 150).at(-1)
  if (current)
    activeSection.value = current.id
}

onMounted(() => {
  window.addEventListener('scroll', updateActiveSection, { passive: true })
  window.addEventListener('resize', updateActiveSection)
  if (document.documentElement.scrollHeight > window.innerHeight)
    updateActiveSection()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', updateActiveSection)
  window.removeEventListener('resize', updateActiveSection)
})

function getReportStyles() {
  const rules: string[] = []
  for (const stylesheet of Array.from(document.styleSheets)) {
    try {
      rules.push(Array.from(stylesheet.cssRules, rule => rule.cssText).join('\n'))
    }
    catch {
      // Cross-origin stylesheets cannot be embedded; keep all readable local styles.
    }
  }
  return rules.join('\n')
}

function downloadReportHtml(sectionIds: string[]) {
  const source = documentElement.value
  if (!source)
    return

  const report = cloneReportForExport(source, sectionIds)

  const html = createStandaloneReportHtml({
    title: props.profile.title,
    baseUrl: document.baseURI,
    styles: getReportStyles(),
    content: report.outerHTML,
  })
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const fileTitle = props.profile.title.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'GEO-report'
  link.href = objectUrl
  link.download = `${fileTitle}.html`
  link.style.display = 'none'
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
}

async function handleExport(payload: { format: 'pdf' | 'html', sections: string[] }) {
  exportDialogOpen.value = false
  selectedExportSections.value = payload.sections
  await nextTick()

  if (payload.format === 'html') {
    downloadReportHtml(payload.sections)
    return
  }

  exportingForPrint.value = true
  await nextTick()
  try {
    window.print()
  }
  finally {
    exportingForPrint.value = false
    selectedExportSections.value = []
  }
}
</script>

<template>
  <div ref="documentElement" class="report-document" :class="{ 'is-exporting-for-print': exportingForPrint }">
    <header class="report-toolbar">
      <div class="toolbar-brand">
        <span class="toolbar-mark" aria-hidden="true">G</span><strong>GEO Agent · 报告中心</strong>
      </div>
      <div class="toolbar-actions">
        <a class="toolbar-link" :href="backHref">返回报告中心</a>
        <button class="toolbar-button is-primary" type="button" @click="exportDialogOpen = true">
          导出
        </button>
      </div>
    </header>

    <div class="report-layout">
      <nav class="report-toc" aria-label="报告目录">
        <p>报告目录</p>
        <a v-for="[id, label] in sections" :key="id" :href="`#${id}`" :class="{ 'is-active': activeSection === id }" :aria-current="activeSection === id ? 'location' : undefined">{{ label }}</a>
      </nav>

      <main class="report-main">
        <header class="report-header">
          <p class="report-eyebrow">
            GEO 可见性监测 · {{ profile.label }}{{ profile.type === 'weekly' ? ' · 管理层周报' : '' }}
          </p>
          <div class="report-title-row">
            <h1>{{ profile.title }}</h1>
          </div>
          <div class="report-meta">
            <span>报告日期：{{ profile.date || '—' }}</span><span>统计周期：{{ profile.cycle || '—' }}</span><span>范围：{{ profile.scopeSummary || (profile.isLiveData ? '—' : '德国 / 德语') }}</span>
          </div>
          <div class="report-scope" aria-label="本报告监测口径">
            <span>{{ profile.scopeSummary || (profile.isLiveData ? '范围暂无数据' : '德国 / 德语') }}</span><span>{{ profile.cadence || '—' }}</span><span>{{ profile.personaCount ?? (profile.isLiveData ? '—' : 6) }} 类人设</span><span>{{ profile.intentCount ?? (profile.isLiveData ? '—' : 4) }} 类意图</span><span>{{ profile.keywordCount ?? (profile.isLiveData ? '—' : 5) }} 个关键词</span><span>{{ profile.questionCount ?? (profile.isLiveData ? '—' : 67) }} 个监测问题</span><span>{{ profile.platformCount ?? (profile.isLiveData ? '—' : 5) }} 个 AI 平台</span>
          </div>
        </header>

        <section id="summary" class="report-section" :class="{ 'is-export-hidden': exportingForPrint && !selectedExportSections.includes('summary') }">
          <div class="section-heading">
            <div><span class="section-kicker">01 · EXECUTIVE SUMMARY</span><h2>一、管理层结论</h2></div>
          </div>
          <div class="summary-band">
            <strong v-if="profile.summaryLead" class="summary-lead">{{ profile.summaryLead }}</strong>
            <p class="summary-copy">
              {{ profile.summaryCopy || profile.focus || (profile.isLiveData ? '暂无管理层结论。' : '') }}
            </p>
            <div class="summary-meta">
              <span>{{ profile.cycle || profile.date || '—' }}</span><span>{{ profile.scopeSummary || (profile.isLiveData ? '范围暂无数据' : '德国 / 德语') }} · {{ profile.questionCount ?? (profile.isLiveData ? '—' : 67) }} 个监测问题 · {{ profile.platformCount ?? (profile.isLiveData ? '—' : 5) }} 个 AI 平台</span>
            </div>
          </div>
          <div v-if="profile.isLiveData && profile.ribbon" class="summary-ribbon">
            <article><span>品牌相对声量（SOV）</span><strong>{{ profile.ribbon.sovRate }}</strong><small>本次监测结果</small></article>
            <article><span>{{ profile.ribbon.headCompetitor ? `与头部竞品 ${profile.ribbon.headCompetitor} 的差距` : '与头部竞品差距' }}</span><strong>提及率 {{ profile.ribbon.mentionGap || '—' }}pp · 推荐率 {{ profile.ribbon.recommendGap || '—' }}pp</strong><small>本次排名第 {{ profile.ribbon.ownRank }}</small></article>
            <article><span>主要短板（人设 × 关键词）</span><strong>{{ profile.ribbon.soaBottomLabel || '暂无数据' }}</strong><small>组合 SOA：{{ profile.ribbon.soaBottomValue }}</small></article>
          </div>
          <div v-else-if="!profile.isLiveData" class="metric-strip">
            <article v-for="metric in profile.metrics" :key="metric.label" class="metric-cell">
              <span class="metric-name">{{ metric.label }}</span><strong>{{ metric.value }}</strong>
              <span class="metric-delta" :class="profile.type === 'adhoc' ? 'is-neutral' : ''">{{ metric.delta }}</span>
              <small>{{ profile.type === 'adhoc' ? '本次监测快照' : `${profile.comparison}：${metric.baseline}` }}</small>
            </article>
          </div>
        </section>

        <section id="analysis" class="report-section" :class="{ 'is-export-hidden': exportingForPrint && !selectedExportSections.includes('analysis') }">
          <div class="section-heading">
            <div><span class="section-kicker">02 · KEY FINDINGS</span><h2>二、本期关键发现</h2></div>
          </div>
          <div v-if="profile.highlights.length" class="finding-grid">
            <article v-for="(item, index) in profile.highlights" :key="item.title" class="finding-card" :class="{ 'is-primary': index === 0 }">
              <div class="finding-card-heading">
                <span class="finding-index">0{{ index + 1 }}</span><h3>{{ item.title }}</h3>
              </div><p>{{ item.description }}</p>
            </article>
          </div>
        </section>

        <section id="evidence" class="report-section" :class="{ 'is-export-hidden': exportingForPrint && !selectedExportSections.includes('evidence') }">
          <div class="section-heading">
            <div><span class="section-kicker">03 · COMPETITIVE LANDSCAPE</span><h2>三、综合竞品表现</h2></div><span v-if="!profile.isLiveData" class="section-label">APW 综合排名第 2</span>
          </div>
          <section v-if="profile.isLiveData" class="detail-module competitor-overview">
            <div class="module-heading">
              <h3>本期总结排名</h3><span>全部监测问题汇总 · 同口径比较</span>
            </div>
            <div v-if="profile.competitorRanks?.length" class="table-wrap">
              <table>
                <thead><tr><th>排名</th><th>品牌</th><th>提及率</th><th>推荐率</th><th>官网引用率</th></tr></thead><tbody>
                  <tr v-for="rank in profile.competitorRanks" :key="`${rank.rank}-${rank.name}`" :class="{ 'is-own-brand': rank.isOwn }">
                    <td>{{ rank.rank }}</td><th>{{ rank.name }}{{ rank.isOwn ? '（我方）' : '' }}</th><td>{{ rank.mention }}</td><td>{{ rank.recommend }}</td><td>{{ rank.citation }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="live-empty">
              接口暂无竞品排名数据。
            </p>
            <p v-if="profile.competitorSummary" class="competitor-summary">
              <strong>模块总结：</strong>{{ profile.competitorSummary }}
            </p>
          </section>
          <div v-else class="competitor-layout">
            <div class="rank-card">
              <h3>本期总结排名</h3>
              <p>品牌综合可见性</p>
              <ReportEChart class="rank-chart" :option="competitorChartOption" label="竞品品牌综合可见性排名对比" />
              <p v-if="profile.isLiveData" class="rank-note">
                {{ profile.competitorSummary || '暂无竞品总结。' }}
              </p>
              <p v-else class="rank-note">
                APW 领先 OMAX 与 KMT；与领先竞品 Flow 仍有差距。
              </p>
            </div>
            <div class="competitor-note">
              <h3>差距拆解</h3>
              <p v-if="profile.isLiveData">
                {{ profile.competitorNarratives?.join(' ') || '接口未返回竞品差距说明。' }}
              </p>
              <p v-else>
                竞争差距主要集中在采购决策与本地服务场景。建议按相同监测问题持续比较各品牌提及、推荐及官网信源引用，区分短期波动与结构性差距。
              </p>
              <div v-if="profile.isLiveData && profile.ribbon" class="gap-pills">
                <span>SOV {{ profile.ribbon.sovRate }}</span><span v-if="profile.ribbon.headCompetitor">头部竞品 {{ profile.ribbon.headCompetitor }} · 第 {{ profile.ribbon.ownRank }} 名</span><span v-if="profile.ribbon.mentionGap">提及率差 {{ profile.ribbon.mentionGap }}pp</span><span v-if="profile.ribbon.recommendGap">推荐率差 {{ profile.ribbon.recommendGap }}pp</span><span v-if="profile.ribbon.soaBottomLabel">较弱组合 {{ profile.ribbon.soaBottomLabel }} · {{ profile.ribbon.soaBottomValue }}</span>
              </div>
              <div v-else-if="!profile.isLiveData" class="gap-pills">
                <span>领先 Flow：提及率差距 14pp</span><span>高于 OMAX：4pp</span><span>采购场景待补强</span>
              </div>
            </div>
          </div>
          <ReportCompetitorBreakdown v-if="profile.isLiveData && profile.competitorDetails" :details="profile.competitorDetails" />
        </section>

        <section id="details" class="report-section" :class="{ 'is-export-hidden': exportingForPrint && !selectedExportSections.includes('details') }">
          <div class="section-heading">
            <div><span class="section-kicker">04 · MONITORING DETAILS</span><h2>四、监测明细</h2></div><span class="section-label">人设 · 平台 · 问题 · 来源</span>
          </div>

          <section class="detail-module">
            <div class="module-heading">
              <h3>4.1 主指标与辅助指标</h3><span>四项主指标 · 辅助指标</span>
            </div>
            <div class="detail-metrics primary-metrics">
              <article v-for="metric in profile.metrics" :key="metric.label">
                <div class="primary-metric-heading">
                  <span>{{ metric.label }}</span><i>本次</i>
                </div>
                <strong>{{ metric.value }}</strong><small>统计范围：{{ profile.type === 'adhoc' ? '本次监测周期' : '本报告周期' }}</small><small v-if="!isSupportNote(metric.note)">{{ metric.note }}</small>
              </article>
            </div>
            <div v-if="profile.isLiveData && auxiliaryMetrics.length" class="aux-strip">
              <span v-for="metric in auxiliaryMetrics" :key="metric.name">{{ metric.name }} <strong>{{ metric.value }}</strong><small v-if="metric.note !== '—' && !isSupportNote(metric.note)">{{ metric.note }}</small></span>
            </div>
          </section>

          <section class="detail-module">
            <div class="module-heading">
              <h3>4.2 平台表现</h3><span>平台提及 · 官网引用</span>
            </div>
            <div v-if="platformSummaries.length" class="platform-highlights">
              <article v-for="item in platformSummaries" :key="item.name">
                <strong>{{ item.name }}</strong><span>{{ item.detail }}</span>
              </article>
            </div>
            <div v-if="profile.platforms.length" class="table-wrap">
              <table>
                <thead><tr><th>AI 平台</th><th>品牌提及率（SOA）</th><th>官网引用率</th><th>当前状态</th></tr></thead><tbody>
                  <tr v-for="platform in profile.platforms" :key="platform.name">
                    <th>{{ platform.name }}<small v-if="platform.avgRank">平均位次 {{ platform.avgRank }}</small></th><td>{{ platform.mention }}<small v-if="platform.movement">{{ platform.movement }}</small></td><td>{{ platform.citations }}</td><td><span class="evidence-badge" :class="platform.displayStatus === 2 ? 'is-missing' : ''">{{ platform.displayStatus === 2 ? '平台已纳入，分项待补齐' : '已展示' }}</span></td>
                  </tr>
                </tbody>
              </table>
            </div><p v-else-if="profile.isLiveData" class="live-empty">
              接口未返回平台表现数据。
            </p>
          </section>

          <section class="detail-module">
            <div class="module-heading">
              <h3>4.3 人设、关键词与意图</h3><span>人设 · 主题 · 意图</span>
            </div>
            <ReportEChart class="core-metric-chart" :option="coreMetricChartOption" label="核心指标表现" />
            <div v-if="profile.isLiveData" class="persona-intent-grid">
              <section class="persona-intent-card persona-theme-card">
                <div class="persona-intent-card-heading">
                  <h4>买家人设 × 核心主题</h4>
                  <span>颜色越深表示品牌提及率越高；单格作为维度观察。</span>
                </div>
                <div v-if="personaThemeRows.length" class="table-wrap">
                  <table class="heatmap-table">
                    <thead>
                      <tr>
                        <th>人设画像</th><th v-for="theme in personaThemes" :key="theme">
                          {{ theme }}
                        </th>
                      </tr>
                    </thead><tbody>
                      <tr v-for="row in personaThemeRows" :key="row.persona">
                        <th>{{ row.persona }}</th><td v-for="theme in personaThemes" :key="theme" :class="heatmapCellClass(row.values[theme])">
                          {{ row.values[theme] ?? '—' }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p v-else class="live-empty">
                  接口未返回人设 × 主题数据。
                </p>
              </section>
              <section class="persona-intent-card persona-intent-card--intent">
                <div class="persona-intent-card-heading">
                  <h4>买家人设 × 意图阶段</h4>
                  <span>按本次回答中的意图阶段汇总，需结合问题证据观察。</span>
                </div>
                <div v-if="profile.intentMetrics?.length" class="intent-list">
                  <article v-for="intent in profile.intentMetrics" :key="intent.name">
                    <strong>{{ intent.name }}</strong><span>{{ intent.value }}</span>
                  </article>
                </div>
                <p v-else class="live-empty">
                  接口未返回意图阶段数据。
                </p>
              </section>
            </div>
            <div v-else-if="profile.personas.length" class="persona-list">
              <ReportEChart class="persona-chart" :option="personaChartOption" label="不同买家人设的品牌提及率对比" />
            </div>
          </section>

          <section class="detail-module">
            <div class="module-heading">
              <h3>4.4 问题命中明细</h3><span>{{ profile.questionCount ?? profile.questions.length }} 个监测问题</span>
            </div>
            <div v-if="profile.questions.length" class="table-wrap">
              <table class="question-table">
                <thead><tr><th>监测问题 / 人设</th><th>平台提及与位置</th><th>是否引用官网</th><th>当前位置 / 分母</th></tr></thead><tbody>
                  <tr v-for="item in profile.questions" :key="item.question">
                    <td>{{ item.question }}<small class="question-answer">{{ item.persona }}</small></td>
                    <td>
                      <div class="question-platform-list">
                        <span v-for="(platform, index) in item.platforms.split(' · ')" :key="`${platform}-${index}`" class="question-platform-tag">{{ platform }}</span>
                      </div>
                    </td>
                    <td><span class="evidence-badge" :class="item.officialEvidence === '否' || item.officialEvidence.includes('未引用') || item.officialEvidence.includes('缺少') ? 'is-missing' : ''">{{ item.officialEvidence }}</span></td>
                    <td>{{ item.rank || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else-if="profile.isLiveData" class="live-empty">
              当前报告暂无问题命中记录。
            </p>
          </section>

          <section class="detail-module">
            <div class="module-heading">
              <h3>4.5 来源域名与被引页面</h3><span>引用 · 我方提及 · 平台覆盖</span>
            </div>
            <div v-if="profile.isLiveData && sourceInsights" class="source-insights">
              <article><span>第三方引用占比</span><strong>{{ sourceInsights.thirdPartyShare }}</strong><small>按来源域名引用次数统计</small></article>
              <article><span>最高引用域名</span><strong>{{ sourceInsights.topDomainCitations }} 次</strong><small>{{ sourceInsights.topDomain }}</small></article>
              <article><span>我方被引页面</span><strong>{{ sourceInsights.ourPageCount }} 个</strong><small>当前页面追踪明细</small></article>
            </div>
            <div v-if="profile.sources.length" class="table-wrap">
              <table>
                <thead><tr><th>来源域名</th><th>命中问题数</th><th>引用次数</th><th>引用平台</th><th>我方是否提及</th></tr></thead><tbody>
                  <tr v-for="source in profile.sources" :key="source.domain">
                    <th>{{ source.domain }}</th><td>{{ source.answers }}</td><td>{{ source.citations }}</td><td>{{ source.platforms }}</td><td>{{ source.ourMentioned || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else-if="profile.isLiveData" class="live-empty">
              接口未返回来源域名数据。
            </p>
            <div v-if="profile.sourcePages?.length" class="source-page-table">
              <div class="module-heading">
                <h4>被引页面</h4><span>{{ profile.sourcePages.length }} 个页面</span>
              </div>
              <div class="table-wrap" :class="{ 'is-scrollable': profile.sourcePages.length > 10 }">
                <table>
                  <thead><tr><th>被引页面</th><th>命中问题数</th><th>引用次数</th><th>引用平台</th><th>我方是否提及</th><th>页面竞品提及</th></tr></thead><tbody>
                    <tr v-for="(page, index) in profile.sourcePages" :key="`${page.url}-${index}`">
                      <th><a v-if="page.url" :href="page.url" target="_blank" rel="noopener noreferrer">{{ page.title }}</a><span v-else>{{ page.title }}</span><small>{{ page.domain }}</small></th><td>{{ page.questionCount || '—' }}</td><td>{{ page.citations }}</td><td>{{ page.platforms || '—' }}</td><td>{{ page.ourMentioned || '—' }}</td><td>{{ page.competitors || '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <p v-else-if="profile.isLiveData" class="live-empty">
              接口未返回被引页面明细。
            </p>
          </section>
        </section>

        <section id="strategy" class="report-section" :class="{ 'is-export-hidden': exportingForPrint && !selectedExportSections.includes('strategy') }">
          <div class="section-heading">
            <div><span class="section-kicker">05 · NEXT ACTIONS</span><h2>五、优化建议</h2></div><span class="section-label">优先级 · 依据</span>
          </div>
          <div v-if="profile.recommendations.length" class="recommendation-list">
            <article v-for="item in profile.recommendations" :key="item.title" class="recommendation-card">
              <div class="recommendation-top">
                <span class="priority" :class="item.priority.toLowerCase()">{{ item.priority }}</span><span>{{ item.evidence }}</span>
              </div><h3>{{ item.title }}</h3><p>{{ item.description }}</p>
            </article>
          </div>
          <p v-else class="live-empty">
            暂无优化建议数据。
          </p>
        </section>

        <footer class="report-footer">
          GEO 可见性监测 · {{ profile.label }} · {{ profile.date }}<span>{{ profile.isLiveData ? '数据来源：报告服务接口' : '演示数据仅用于展示报告结构与交互' }}</span>
        </footer>
      </main>
    </div>
    <ReportExportDialog v-model:open="exportDialogOpen" :sections="sections" @export="handleExport" />
  </div>
</template>

<style scoped>
.report-document { min-height: 100vh; background: #f4f6fa; color: #172033; font-family: "PingFang SC", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 14px; line-height: 1.55; }
.report-toolbar { position: sticky; z-index: 5; top: 0; display: flex; min-height: 56px; align-items: center; justify-content: space-between; gap: 16px; padding: 0 28px; border-bottom: 1px solid #dde5ee; background: rgb(255 255 255 / 97%); box-shadow: 0 1px 2px rgb(15 23 42 / 4%); backdrop-filter: blur(8px); }
.toolbar-brand, .toolbar-actions { display: flex; align-items: center; gap: 10px; }
.toolbar-mark { display: inline-grid; width: 26px; height: 26px; place-items: center; border-radius: 7px; background: #2563eb; color: #fff; font-size: 13px; font-weight: 700; }
.toolbar-brand strong { font-size: 13px; }
.toolbar-link, .toolbar-button { display: inline-flex; min-height: 32px; align-items: center; justify-content: center; padding: 0 12px; border: 1px solid #dde5ee; border-radius: 7px; background: #fff; color: #39475a; font: inherit; font-size: 12px; font-weight: 650; text-decoration: none; white-space: nowrap; cursor: pointer; }
.toolbar-button.is-primary { border-color: #2563eb; background: #2563eb; color: #fff; }
.toolbar-link:hover, .toolbar-button:hover { border-color: #93c5fd; color: #1d4ed8; }
.toolbar-button.is-primary:hover { background: #1d4ed8; color: #fff; }
.report-layout { display: grid; width: min(calc(100% - 48px), 1180px); grid-template-columns: 190px minmax(0, 1fr); align-items: start; gap: 28px; margin: 0 auto; padding: 30px 0 56px; }
.report-toc { position: sticky; top: 78px; display: grid; gap: 3px; padding: 8px 0; }
.report-toc p { margin: 0 10px 8px; color: #7c8999; font-size: 11px; font-weight: 700; }
.report-toc a { padding: 7px 10px; border-left: 2px solid transparent; border-radius: 0 6px 6px 0; color: #5f6e82; font-size: 12px; text-decoration: none; }
.report-toc a:hover, .report-toc a:focus-visible, .report-toc a.is-active { border-left-color: #2563eb; background: #eff6ff; color: #1d4ed8; }
.report-main { min-width: 0; }
.report-header { padding-bottom: 20px; border-bottom: 1px solid #dde5ee; }
.report-eyebrow, .section-kicker { margin: 0 0 6px; color: #1d4ed8; font-size: 11px; font-weight: 700; letter-spacing: .06em; }
.report-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
.report-title-row h1 { margin: 0; font-size: 28px; line-height: 1.3; }
.report-status, .section-label { display: inline-flex; flex: 0 0 auto; align-items: center; min-height: 23px; padding: 2px 8px; border-radius: 5px; background: #f8fafc; color: #5f6e82; font-size: 11px; font-weight: 650; }
.report-status.is-generated { background: #d1fae5; color: #047857; }
.report-status.is-outline { background: #fef3c7; color: #b45309; }
.report-status.is-generating { background: #eff6ff; color: #1d4ed8; }
.report-status.is-failed { background: #fef2f2; color: #b91c1c; }
.report-status.is-archived { background: #f1f5f9; color: #64748b; }
.report-meta { display: flex; flex-wrap: wrap; gap: 6px 16px; margin-top: 11px; color: #5f6e82; font-size: 12px; }
.report-scope { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 13px; }
.report-scope span { padding: 2px 7px; border: 1px solid #dde5ee; border-radius: 5px; background: #fff; color: #39475a; font-size: 11px; }
.report-section { margin-top: 16px; padding: 18px; border: 1px solid #dde5ee; border-radius: 11px; background: #fff; scroll-margin-top: 76px; }
.section-heading, .module-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.section-heading { margin-bottom: 14px; }
.section-kicker { display: block; margin-bottom: 2px; color: #7c8999; font-size: 9px; }
.section-heading h2 { margin: 0; font-size: 16px; line-height: 1.4; }
.summary-band { padding: 1px 0 2px 13px; border-left: 3px solid #60a5fa; }
.summary-lead { display: block; margin: 0 0 4px; font-size: 15px; font-weight: 700; line-height: 1.6; }
.summary-copy { margin: 0; color: #5f6e82; font-size: 12px; line-height: 1.7; }
.summary-meta { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 11px; padding-top: 9px; border-top: 1px solid #eaf0f5; color: #7c8999; font-size: 11px; }
.summary-ribbon { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 14px; }
.summary-ribbon article { display: grid; min-width: 0; gap: 5px; align-content: start; padding: 11px; border: 1px solid #dde5ee; border-radius: 8px; background: #f8fafc; }
.summary-ribbon article > span, .summary-ribbon small { color: #7c8999; font-size: 10px; }
.summary-ribbon strong { color: #172033; font-size: 15px; line-height: 1.4; overflow-wrap: anywhere; }
.summary-ribbon small { line-height: 1.45; }
.metric-strip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 15px; overflow: hidden; border: 1px solid #dde5ee; border-radius: 9px; }
.metric-cell { display: grid; min-width: 0; align-content: start; gap: 4px; padding: 12px; }
.metric-cell + .metric-cell { border-left: 1px solid #dde5ee; }
.metric-name { min-height: 32px; color: #39475a; font-size: 11px; font-weight: 700; }
.metric-cell strong { color: #172033; font-size: 23px; line-height: 1.2; }
.metric-delta { justify-self: start; padding: 1px 6px; border-radius: 4px; background: #d1fae5; color: #047857; font-size: 10px; font-weight: 700; }
.metric-delta.is-neutral { background: #eff6ff; color: #1d4ed8; }
.metric-cell small { color: #7c8999; font-size: 10px; line-height: 1.45; }
.finding-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
.finding-card { position: relative; min-height: 112px; padding: 13px; border: 1px solid #eaf0f5; border-radius: 8px; background: #f8fafc; }
.finding-card.is-primary { border-color: #bfdbfe; background: #eff6ff; }
.finding-card-heading { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.finding-index { flex: 0 0 auto; color: #2563eb; font-size: 10px; font-weight: 750; }
.finding-card h3 { min-width: 0; margin: 0; font-size: 13px; }
.finding-card p { margin: 0; color: #5f6e82; font-size: 11px; line-height: 1.55; }
.rank-card, .competitor-note { margin-top: 13px; padding: 14px; border: 1px solid #eaf0f5; border-radius: 8px; background: #fff; }
.rank-card h3, .competitor-note h3 { margin: 0; font-size: 13px; }
.rank-card > p { margin: 3px 0 0; color: #7c8999; font-size: 10px; }
.competitor-layout { display: grid; grid-template-columns: 1.2fr .8fr; gap: 10px; }
.competitor-overview { margin-bottom: 12px; }
.competitor-summary { margin: 0; padding: 10px; background: #eff6ff; color: #5f6e82; font-size: 11px; line-height: 1.65; }
.competitor-summary strong { color: #172033; }
.is-own-brand th, .is-own-brand td { background: #effcf9; }
.report-data-table { margin-top: 12px; }
.live-empty { margin: 10px 0 0; padding: 12px; border-radius: 7px; color: #7c8999; background: #f8fafc; font-size: 11px; }
.rank-card, .competitor-note { margin-top: 0; }
.rank-chart { margin-top: 8px; }
.rank-note, .competitor-note p { color: #5f6e82; font-size: 11px; line-height: 1.6; }
.rank-note { margin: 13px 0 0; padding-top: 10px; border-top: 1px solid #eaf0f5; }
.competitor-note p { margin: 9px 0 0; }
.gap-pills { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.gap-pills span { padding: 4px 7px; border-radius: 5px; background: #eff6ff; color: #1d4ed8; font-size: 10px; }
.detail-module + .detail-module { margin-top: 20px; padding-top: 17px; border-top: 1px solid #eaf0f5; }
.module-heading { align-items: center; margin-bottom: 10px; }
.module-heading h3 { margin: 0; font-size: 13px; }
.module-heading > span { color: #7c8999; font-size: 10px; }
.detail-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.detail-metrics article { display: grid; gap: 4px; padding: 10px; border: 1px solid #eaf0f5; border-radius: 7px; background: #f8fafc; }
.detail-metrics article > span, .detail-metrics small { color: #5f6e82; font-size: 10px; }
.detail-metrics strong { font-size: 19px; }
.detail-metrics small { color: #7c8999; line-height: 1.4; }
.primary-metrics { gap: 0; overflow: hidden; border: 1px solid #dde5ee; border-radius: 8px; background: #fff; }
.primary-metrics article { gap: 7px; padding: 13px; border: 0; border-radius: 0; background: #fff; }
.primary-metrics article + article { border-left: 1px solid #dde5ee; }
.primary-metric-heading { display: flex; align-items: center; justify-content: space-between; gap: 7px; }
.primary-metric-heading > span { color: #39475a; font-size: 12px; font-weight: 700; }
.primary-metric-heading i { padding: 3px 7px; border-radius: 6px; background: #d1fae5; color: #047857; font-size: 10px; font-style: normal; }
.primary-metrics strong { color: #172033; font-size: 23px; }
.platform-highlights { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-bottom: 10px; }
.platform-highlights article { display: grid; gap: 4px; padding: 10px; border-left: 3px solid #2563eb; background: #f8fafc; }
.platform-highlights article strong { color: #172033; font-size: 12px; }
.platform-highlights article span { color: #7c8999; font-size: 10px; line-height: 1.5; }
.intent-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; margin-top: 10px; }
.intent-list article { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px; padding: 9px; background: #f8fafc; color: #5f6e82; font-size: 10px; }
.intent-list strong { color: #172033; }
.intent-list small { color: #7c8999; }
.source-insights { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-bottom: 10px; }
.source-insights article { display: grid; gap: 5px; padding: 11px; background: #f8fafc; }
.source-insights article > span, .source-insights small { color: #7c8999; font-size: 10px; }
.source-insights strong { color: #172033; font-size: 17px; }
.source-insights small { line-height: 1.45; }
.source-page-table { display: grid; gap: 8px; margin-top: 12px; }
.source-page-table .module-heading { margin: 0; }
.source-page-table h4 { margin: 0; color: #172033; font-size: 12px; }
.source-page-table .table-wrap.is-scrollable { max-height: min(70vh, 760px); overflow-x: auto; overflow-y: scroll; scrollbar-color: #aab6c5 #eef2f7; scrollbar-gutter: stable; scrollbar-width: thin; }
.source-page-table .table-wrap.is-scrollable thead th { position: sticky; top: 0; z-index: 1; }
.source-page-table .table-wrap.is-scrollable::-webkit-scrollbar { width: 10px; }
.source-page-table .table-wrap.is-scrollable::-webkit-scrollbar-track { background: #eef2f7; }
.source-page-table .table-wrap.is-scrollable::-webkit-scrollbar-thumb { border: 2px solid #eef2f7; border-radius: 8px; background: #aab6c5; }
.source-page-table th small { display: block; margin-top: 3px; color: #7c8999; font-weight: 400; }
.aux-strip { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 9px; color: #5f6e82; font-size: 10px; }
.aux-strip > span { display: grid; gap: 5px; padding: 10px; background: #f8fafc; }
.aux-strip strong { color: #172033; font-size: 16px; }
.aux-strip small { color: #8a98aa; font-size: 10px; }
.table-wrap { width: 100%; overflow-x: auto; border: 1px solid #dde5ee; border-radius: 7px; }
table { width: 100%; min-width: 600px; border-collapse: collapse; font-size: 10px; }
th, td { padding: 8px 9px; border-bottom: 1px solid #eaf0f5; color: #39475a; text-align: left; vertical-align: top; }
.question-answer { display: block; max-width: 420px; margin-top: 4px; color: #7c8999; font-size: 9px; line-height: 1.5; }
.question-platform-list { display: grid; justify-items: start; gap: 4px; }
.question-platform-tag { padding: 3px 7px; border: 1px solid #d8e2ef; border-radius: 5px; background: #f8fafc; color: #39475a; white-space: nowrap; }
thead th { background: #f8fafc; color: #5f6e82; font-size: 9px; white-space: nowrap; }
tbody tr:last-child th, tbody tr:last-child td { border-bottom: 0; }
tbody th { color: #172033; font-weight: 700; }
.question-table { min-width: 760px; }
.evidence-badge { display: inline-block; padding: 2px 5px; border-radius: 4px; background: #d1fae5; color: #047857; white-space: nowrap; }
.evidence-badge.is-missing { background: #fef3c7; color: #b45309; }
.persona-intent-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.persona-intent-card { min-width: 0; padding: 10px; border: 1px solid #dde5ee; border-radius: 8px; }
.persona-intent-card-heading { display: grid; gap: 4px; margin-bottom: 8px; }
.persona-intent-card-heading h4 { margin: 0; color: #172033; font-size: 12px; }
.persona-intent-card-heading > span { color: #8a98aa; font-size: 9px; line-height: 1.45; }
.persona-theme-card .table-wrap { border: 0; border-radius: 0; }
.persona-theme-card .table-wrap .heatmap-table { min-width: 560px; table-layout: fixed; }
.heatmap-table th, .heatmap-table td { padding: 8px 7px; vertical-align: middle; }
.heatmap-table th:first-child { width: 145px; }
.heatmap-table thead th:not(:first-child) { white-space: normal; overflow-wrap: anywhere; line-height: 1.35; }
.heatmap-table td { text-align: center; }
.heatmap-table td.is-strong { background: #d9f3e9; color: #16815e; font-weight: 650; }
.heatmap-table td.is-medium { background: #fff2cc; color: #a66b00; font-weight: 650; }
.heatmap-table td.is-low { background: #fee2e2; color: #bf4545; font-weight: 650; }
.persona-intent-card .intent-list { display: grid; grid-template-columns: 1fr; gap: 0; margin: 0; }
.persona-intent-card .intent-list article { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 3px 12px; padding: 10px 2px; border-bottom: 1px solid #eaf0f5; background: #fff; }
.persona-intent-card .intent-list article:last-child { border-bottom: 0; }
.persona-intent-card .intent-list strong { color: #39475a; font-size: 10px; }
.persona-intent-card .intent-list span { color: #39475a; font-size: 10px; font-weight: 650; }
.persona-intent-card .intent-list small { color: #8a98aa; font-size: 9px; text-align: right; white-space: nowrap; }
.persona-list { display: grid; gap: 9px; }
.core-metric-chart { height: 270px; margin: 8px 0 14px; }
.persona-chart { height: 190px; }
.recommendation-list { display: grid; gap: 9px; }
.recommendation-card { padding: 13px; border: 1px solid #eaf0f5; border-radius: 8px; background: #fff; }
.recommendation-top { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; color: #7c8999; font-size: 10px; }
.priority { padding: 2px 6px; border-radius: 4px; background: #fee2e2; color: #b91c1c; font-size: 10px; font-weight: 700; }
.priority.p1 { background: #fef3c7; color: #b45309; }
.recommendation-card h3 { margin: 7px 0 3px; font-size: 13px; }
.recommendation-card p { margin: 0; color: #5f6e82; font-size: 11px; line-height: 1.6; }
.report-footer { display: flex; justify-content: space-between; gap: 12px; padding: 18px 2px 0; color: #7c8999; font-size: 10px; }
@media (max-width: 850px) { .report-layout { grid-template-columns: 150px minmax(0, 1fr); gap: 18px; width: min(calc(100% - 32px), 1180px); } .metric-strip, .detail-metrics, .summary-ribbon { grid-template-columns: repeat(2, minmax(0, 1fr)); } .metric-cell:nth-child(3) { border-left: 0; border-top: 1px solid #dde5ee; } .metric-cell:nth-child(4) { border-top: 1px solid #dde5ee; } .competitor-layout, .persona-intent-grid { grid-template-columns: 1fr; } }
@media (max-width: 620px) { .report-toolbar { min-height: 52px; padding: 0 12px; } .toolbar-brand strong { max-width: 145px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .toolbar-link, .toolbar-button { min-height: 30px; padding: 0 8px; font-size: 10px; } .report-layout { display: block; width: calc(100% - 24px); padding: 14px 0 30px; } .report-toc { position: sticky; z-index: 3; top: 52px; display: flex; gap: 3px; overflow-x: auto; padding: 5px 0 8px; background: #f4f6fa; } .report-toc p { display: none; } .report-toc a { flex: 0 0 auto; padding: 6px 8px; border: 1px solid #dde5ee; border-radius: 5px; background: #fff; font-size: 10px; } .report-title-row { display: block; } .report-title-row h1 { font-size: 22px; } .report-section { padding: 13px; } .section-heading { flex-direction: column; gap: 5px; } .finding-grid { grid-template-columns: 1fr; } .finding-card { min-height: auto; } .metric-cell { padding: 10px; } .metric-name { min-height: 0; } .core-metric-chart { height: 230px; } .persona-chart { height: 230px; } .platform-highlights, .summary-ribbon, .source-insights, .aux-strip { grid-template-columns: 1fr; } .report-footer { flex-direction: column; } }
@media print { .report-document { background: #fff; } .report-toolbar, .report-toc, .ce-modal-root { display: none !important; } .report-layout { display: block; width: 100%; padding: 0; } .report-section.is-export-hidden { display: none !important; } .report-section { break-inside: avoid; border-color: #cbd5e1; } .report-section#details { break-inside: auto; } }

@media screen {
  .report-document {
    --report-blue: #2563eb;
    --report-ink: #172033;
    --report-muted: #596b82;
    --report-soft: #f5f8fc;
    --report-line: #dce5f0;
    background: #f3f6fb;
    color: var(--report-ink);
  }

  .report-toolbar {
    min-height: 60px;
    padding-inline: max(24px, calc((100vw - 1360px) / 2));
    border-bottom-color: #dce5f0;
    box-shadow: 0 2px 8px rgb(23 32 51 / 4%);
  }

  .toolbar-mark { width: 30px; height: 30px; border-radius: 8px; background: var(--report-blue); }
  .toolbar-brand strong { font-size: 14px; letter-spacing: -.01em; }
  .toolbar-link, .toolbar-button { min-height: 38px; padding-inline: 15px; border-radius: 8px; transition: border-color .18s ease, background-color .18s ease, color .18s ease; }
  .toolbar-link:focus-visible, .toolbar-button:focus-visible, .report-toc a:focus-visible { outline: 3px solid rgb(37 99 235 / 35%); outline-offset: 2px; }

  .report-layout {
    width: min(calc(100% - 64px), 1360px);
    grid-template-columns: 190px minmax(0, 1fr);
    gap: 26px;
    padding-top: 28px;
  }

  .report-toc {
    gap: 4px;
    padding: 14px 10px;
    border: 1px solid var(--report-line);
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 2px 8px rgb(23 32 51 / 3%);
  }

  .report-toc p { margin: 0 10px 8px; color: #718198; font-size: 11px; letter-spacing: .04em; text-transform: uppercase; }
  .report-toc a { padding: 9px 11px; border-radius: 7px; color: var(--report-muted); font-size: 13px; transition: background-color .16s ease, color .16s ease, border-color .16s ease; }
  .report-toc a:hover, .report-toc a:focus-visible, .report-toc a.is-active { border-left-color: var(--report-blue); background: #edf4ff; color: #1d4ed8; }

  .report-header {
    margin-bottom: 20px;
    padding: 22px 24px 20px;
    border: 1px solid var(--report-line);
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 2px 8px rgb(23 32 51 / 3%);
  }

  .report-eyebrow { margin-bottom: 8px; color: #315fc5; font-size: 11px; letter-spacing: .075em; }
  .report-title-row h1 { font-size: clamp(25px, 2.1vw, 32px); letter-spacing: -.025em; line-height: 1.25; }
  .report-meta { gap: 8px 20px; margin-top: 13px; color: #596b82; font-size: 13px; }
  .report-scope { gap: 7px; margin-top: 14px; }
  .report-scope span { padding: 5px 9px; border-color: #e1e8f1; border-radius: 6px; background: var(--report-soft); color: #51637b; font-size: 11px; }

  .report-section {
    margin-top: 18px;
    padding: 22px;
    border-color: var(--report-line);
    border-radius: 12px;
    box-shadow: 0 2px 8px rgb(23 32 51 / 3%);
    transition: border-color .18s ease, box-shadow .18s ease;
  }

  .report-section:target { border-color: #a9c6f7; box-shadow: 0 0 0 3px rgb(37 99 235 / 7%); }
  .section-heading { align-items: center; margin-bottom: 18px; padding-bottom: 13px; border-bottom: 1px solid #e8edf4; }
  .section-kicker { margin-bottom: 4px; color: #74849a; font-size: 10px; letter-spacing: .08em; }
  .section-heading h2 { font-size: 19px; letter-spacing: -.015em; }
  .section-label { min-height: 27px; padding: 4px 9px; border: 1px solid #e6edf5; background: #f7f9fc; color: #65768c; font-size: 11px; }

  .summary-band { padding: 15px 17px; border: 1px solid #dce9fb; border-left: 4px solid #4f8df7; border-radius: 0 9px 9px 0; background: #f5f9ff; }
  .summary-lead { margin-bottom: 6px; font-size: 16px; }
  .summary-copy { color: #4f6077; font-size: 13px; line-height: 1.75; }
  .summary-meta { gap: 8px 16px; color: #728198; font-size: 11px; }
  .summary-ribbon { gap: 10px; margin-top: 16px; }
  .summary-ribbon article { gap: 7px; padding: 14px; border-color: #e3eaf3; border-radius: 9px; background: #f8fafc; }
  .summary-ribbon article > span, .summary-ribbon small { color: #718198; font-size: 11px; }
  .summary-ribbon strong { font-size: 16px; line-height: 1.5; }

  .metric-strip { margin-top: 16px; border-color: var(--report-line); border-radius: 10px; }
  .metric-cell { gap: 7px; padding: 15px; }
  .metric-name { min-height: 0; color: #5a6b81; font-size: 12px; }
  .metric-cell strong { font-size: 25px; font-variant-numeric: tabular-nums; }
  .metric-cell small { color: #718198; font-size: 11px; line-height: 1.5; }
  .metric-delta { padding: 3px 7px; font-size: 11px; }

  .finding-grid { gap: 11px; }
  .finding-card { min-height: 126px; padding: 16px; border-color: #e3eaf3; border-radius: 9px; background: #fafbfd; }
  .finding-card.is-primary { border-color: #bad1fa; background: #f1f6ff; }
  .finding-card-heading { gap: 9px; margin-bottom: 7px; }
  .finding-index { font-size: 11px; }
  .finding-card h3 { font-size: 14px; }
  .finding-card p { color: #596b82; font-size: 12px; line-height: 1.7; }

  .rank-card, .competitor-note { padding: 16px; border-color: #e3eaf3; border-radius: 9px; }
  .rank-card h3, .competitor-note h3 { font-size: 14px; }
  .rank-card > p { font-size: 11px; }
  .rank-note, .competitor-note p { color: #596b82; font-size: 12px; line-height: 1.7; }
  .competitor-summary { padding: 13px 15px; border-radius: 7px; color: #4f6077; font-size: 12px; line-height: 1.7; }
  .gap-pills { gap: 7px; }
  .gap-pills span { padding: 5px 9px; border: 1px solid #dfeaff; border-radius: 6px; font-size: 11px; }

  .detail-module + .detail-module { margin-top: 24px; padding-top: 20px; }
  .module-heading { margin-bottom: 12px; }
  .module-heading h3 { font-size: 15px; letter-spacing: -.01em; }
  .module-heading > span { color: #718198; font-size: 11px; }
  .detail-metrics { gap: 10px; }
  .detail-metrics article { gap: 6px; padding: 13px; border-color: #e5ebf3; border-radius: 8px; background: #fafbfd; }
  .detail-metrics article > span, .detail-metrics small { color: #596b82; font-size: 11px; }
  .detail-metrics strong { font-size: 22px; font-variant-numeric: tabular-nums; }
  .detail-metrics small { color: #718198; line-height: 1.5; }
  .primary-metrics { border-color: var(--report-line); }
  .primary-metrics article { gap: 8px; padding: 15px; }
  .primary-metric-heading > span { color: #40526a; font-size: 12px; }
  .primary-metric-heading i { padding: 4px 8px; font-size: 10px; }
  .primary-metrics strong { font-size: 25px; font-variant-numeric: tabular-nums; }

  .platform-highlights { gap: 10px; margin-bottom: 12px; }
  .platform-highlights article { gap: 6px; padding: 12px; border: 1px solid #e6edf5; border-left: 3px solid #4c83eb; border-radius: 0 8px 8px 0; background: #fafbfd; }
  .platform-highlights article strong { font-size: 13px; }
  .platform-highlights article span { color: #596b82; font-size: 11px; line-height: 1.6; }
  .source-insights { gap: 10px; margin-bottom: 12px; }
  .source-insights article { gap: 6px; padding: 13px; border: 1px solid #e6edf5; border-radius: 8px; background: #fafbfd; }
  .source-insights article > span, .source-insights small { color: #718198; font-size: 11px; }
  .source-insights strong { font-size: 20px; font-variant-numeric: tabular-nums; }

  .live-empty { padding: 14px; border: 1px dashed #dce5f0; background: #f8fafc; color: #63748b; font-size: 12px; }
  .table-wrap { border-color: var(--report-line); border-radius: 9px; }
  table { font-size: 12px; }
  th, td { padding: 10px 12px; border-bottom-color: #e8edf4; color: #40526a; line-height: 1.55; }
  thead th { background: #f4f7fb; color: #52647d; font-size: 11px; font-weight: 650; }
  tbody tr { transition: background-color .15s ease; }
  tbody tr:hover { background: #f8fbff; }
  tbody th { color: #26364d; }
  .question-answer { max-width: 480px; margin-top: 5px; color: #718198; font-size: 11px; line-height: 1.55; }
  .question-platform-list { gap: 5px; }
  .question-platform-tag { padding: 4px 8px; border-color: #d9e4f1; border-radius: 6px; background: #f7f9fc; font-size: 11px; }
  .evidence-badge { padding: 4px 8px; border-radius: 5px; font-size: 11px; font-weight: 650; }

  .persona-intent-grid { gap: 12px; }
  .persona-intent-card { padding: 14px; border-color: #e1e8f1; border-radius: 9px; background: #fff; }
  .persona-intent-card-heading { gap: 5px; margin-bottom: 10px; }
  .persona-intent-card-heading h4 { font-size: 14px; }
  .persona-intent-card-heading > span { color: #718198; font-size: 11px; line-height: 1.55; }
  .persona-theme-card .table-wrap { border-color: #e7edf5; border-radius: 7px; }
  .heatmap-table th, .heatmap-table td { padding: 10px 9px; }
  .heatmap-table th:first-child { width: 170px; }
  .persona-intent-card .intent-list article { gap: 4px 14px; padding: 12px 3px; border-bottom-color: #e8edf4; }
  .persona-intent-card .intent-list strong, .persona-intent-card .intent-list span { font-size: 12px; }
  .persona-intent-card .intent-list small { color: #718198; font-size: 10px; }
  .core-metric-chart { height: 300px; margin: 10px 0 18px; padding: 14px 10px 8px; border: 1px solid #e4ebf4; border-radius: 9px; background: #fff; }
  .persona-chart { height: 220px; }

  .recommendation-list { gap: 11px; }
  .recommendation-card { padding: 16px; border-color: #e3eaf3; border-radius: 9px; transition: border-color .16s ease, background-color .16s ease; }
  .recommendation-card:hover { border-color: #c8d9f3; background: #fcfdff; }
  .recommendation-top { gap: 8px; color: #718198; font-size: 11px; }
  .priority { padding: 4px 8px; border-radius: 5px; font-size: 10px; }
  .recommendation-card h3 { margin: 9px 0 5px; font-size: 15px; }
  .recommendation-card p { color: #596b82; font-size: 12px; line-height: 1.7; }
  .report-footer { padding-top: 22px; color: #718198; font-size: 11px; }
}

@media screen and (max-width: 900px) {
  .report-layout { width: min(calc(100% - 40px), 760px); grid-template-columns: 1fr; gap: 14px; }
  .report-toc { position: sticky; z-index: 4; top: 60px; display: flex; align-items: center; gap: 5px; overflow-x: auto; padding: 7px; }
  .report-toc p { flex: 0 0 auto; margin: 0 5px; }
  .report-toc a { flex: 0 0 auto; padding: 7px 9px; border: 1px solid transparent; border-left-width: 1px; border-radius: 6px; white-space: nowrap; }
  .report-toc a:hover, .report-toc a:focus-visible, .report-toc a.is-active { border-color: #dbe8fc; }
}

@media screen and (max-width: 620px) {
  .report-toolbar { min-height: 54px; padding-inline: 12px; }
  .toolbar-brand, .toolbar-actions { gap: 7px; }
  .toolbar-mark { width: 27px; height: 27px; }
  .toolbar-brand strong { max-width: 132px; font-size: 12px; }
  .toolbar-link, .toolbar-button { min-height: 36px; padding-inline: 9px; font-size: 11px; }
  .report-layout { width: calc(100% - 24px); padding: 12px 0 30px; }
  .report-toc { top: 54px; margin-inline: -2px; }
  .report-toc p { display: none; }
  .report-toc a { padding: 7px 9px; font-size: 11px; }
  .report-header { margin-bottom: 14px; padding: 16px; }
  .report-title-row h1 { font-size: 24px; }
  .report-meta { gap: 5px 12px; font-size: 11px; }
  .report-scope { gap: 6px; }
  .report-scope span { padding: 4px 7px; font-size: 10px; }
  .report-section { margin-top: 14px; padding: 16px; }
  .section-heading { align-items: flex-start; gap: 8px; margin-bottom: 14px; padding-bottom: 11px; }
  .section-heading h2 { font-size: 17px; }
  .section-label { min-height: 24px; font-size: 10px; }
  .summary-band { padding: 12px; }
  .summary-copy { font-size: 12px; }
  .metric-strip, .detail-metrics, .summary-ribbon, .source-insights, .aux-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .metric-cell { padding: 11px; }
  .metric-cell:nth-child(3) { border-left: 0; border-top: 1px solid var(--report-line); }
  .metric-cell:nth-child(4) { border-top: 1px solid var(--report-line); }
  .metric-cell strong, .primary-metrics strong { font-size: 21px; }
  .finding-grid, .competitor-layout, .persona-intent-grid { grid-template-columns: 1fr; }
  .finding-card { min-height: auto; padding: 13px; }
  .finding-card p { font-size: 12px; }
  .module-heading { align-items: flex-start; gap: 8px; }
  .module-heading h3 { font-size: 14px; }
  .module-heading > span { text-align: right; }
  .detail-metrics article, .primary-metrics article { padding: 11px; }
  .primary-metrics article + article { border-top: 1px solid var(--report-line); border-left: 0; }
  .platform-highlights { grid-template-columns: 1fr; }
  .intent-list { grid-template-columns: 1fr; }
  .core-metric-chart { height: 250px; margin-block: 8px 14px; padding: 9px 4px 4px; }
  .persona-chart { height: 230px; }
  .persona-intent-card { padding: 11px; }
  .persona-theme-card .table-wrap .heatmap-table { min-width: 480px; }
  .heatmap-table th:first-child { width: 135px; }
  .source-page-table .table-wrap.is-scrollable { max-height: 65vh; }
  .report-footer { gap: 5px; }
}

@media (prefers-reduced-motion: reduce) {
  .report-section, .toolbar-link, .toolbar-button, .report-toc a, tbody tr, .recommendation-card { transition: none; }
}
</style>

<style>
html[data-theme='dark'] .report-document {
  --report-blue: #82adff;
  --report-ink: #e6edf7;
  --report-muted: #b5c2d3;
  --report-soft: #202b3a;
  --report-line: #354357;
  background: #111821;
  color: var(--report-ink);
  color-scheme: dark;
}

html[data-theme='dark'] .report-document .report-toolbar,
html[data-theme='dark'] .report-document .report-header,
html[data-theme='dark'] .report-document .report-section,
html[data-theme='dark'] .report-document .report-toc,
html[data-theme='dark'] .report-document .persona-intent-card,
html[data-theme='dark'] .report-document .core-metric-chart {
  border-color: var(--report-line);
  background: #182230;
  box-shadow: 0 2px 10px rgb(0 0 0 / 18%);
}

html[data-theme='dark'] .report-document .report-toolbar { background: rgb(24 34 48 / 96%); }
html[data-theme='dark'] .report-document .report-header { border-bottom-color: var(--report-line); }
html[data-theme='dark'] .report-document .report-section:target { border-color: #5476a5; box-shadow: 0 0 0 3px rgb(86 139 220 / 13%); }

html[data-theme='dark'] .report-document .toolbar-link,
html[data-theme='dark'] .report-document .report-scope span,
html[data-theme='dark'] .report-document .report-status,
html[data-theme='dark'] .report-document .section-label,
html[data-theme='dark'] .report-document .question-platform-tag,
html[data-theme='dark'] .report-document .toolbar-button:not(.is-primary) { border-color: #3b4a60; background: #202b3a; color: #d6e0ed; }
html[data-theme='dark'] .report-document .toolbar-button:not(.is-primary):hover,
html[data-theme='dark'] .report-document .toolbar-link:hover { border-color: #7098d2; background: #26364a; color: #c3d9ff; }

html[data-theme='dark'] .report-document .report-toc p,
html[data-theme='dark'] .report-document .report-meta,
html[data-theme='dark'] .report-document .rank-card > p,
html[data-theme='dark'] .report-document .section-kicker,
html[data-theme='dark'] .report-document .summary-copy,
html[data-theme='dark'] .report-document .summary-meta,
html[data-theme='dark'] .report-document .summary-ribbon article > span,
html[data-theme='dark'] .report-document .summary-ribbon small,
html[data-theme='dark'] .report-document .metric-name,
html[data-theme='dark'] .report-document .metric-cell small,
html[data-theme='dark'] .report-document .finding-card p,
html[data-theme='dark'] .report-document .rank-note,
html[data-theme='dark'] .report-document .competitor-note p,
html[data-theme='dark'] .report-document .competitor-summary,
html[data-theme='dark'] .report-document .module-heading > span,
html[data-theme='dark'] .report-document .detail-metrics article > span,
html[data-theme='dark'] .report-document .detail-metrics small,
html[data-theme='dark'] .report-document .primary-metric-heading > span,
html[data-theme='dark'] .report-document .platform-highlights article span,
html[data-theme='dark'] .report-document .source-insights article > span,
html[data-theme='dark'] .report-document .source-insights small,
html[data-theme='dark'] .report-document .question-answer,
html[data-theme='dark'] .report-document .source-page-table th small,
html[data-theme='dark'] .report-document .persona-intent-card-heading > span,
html[data-theme='dark'] .report-document .persona-intent-card .intent-list small,
html[data-theme='dark'] .report-document .recommendation-top,
html[data-theme='dark'] .report-document .recommendation-card p,
html[data-theme='dark'] .report-document .report-footer,
html[data-theme='dark'] .report-document .aux-strip,
html[data-theme='dark'] .report-document .aux-strip small { color: var(--report-muted); }

html[data-theme='dark'] .report-document .report-title-row h1,
html[data-theme='dark'] .report-document .section-heading h2,
html[data-theme='dark'] .report-document .summary-lead,
html[data-theme='dark'] .report-document .summary-ribbon strong,
html[data-theme='dark'] .report-document .metric-cell strong,
html[data-theme='dark'] .report-document .finding-card h3,
html[data-theme='dark'] .report-document .rank-card h3,
html[data-theme='dark'] .report-document .competitor-note h3,
html[data-theme='dark'] .report-document .detail-metrics strong,
html[data-theme='dark'] .report-document .primary-metrics strong,
html[data-theme='dark'] .report-document .platform-highlights article strong,
html[data-theme='dark'] .report-document .intent-list strong,
html[data-theme='dark'] .report-document .persona-intent-card-heading h4,
html[data-theme='dark'] .report-document .persona-intent-card .intent-list strong,
html[data-theme='dark'] .report-document .persona-intent-card .intent-list span,
html[data-theme='dark'] .report-document .source-insights strong,
html[data-theme='dark'] .report-document .source-page-table h4,
html[data-theme='dark'] .report-document .recommendation-card h3,
html[data-theme='dark'] .report-document .aux-strip strong { color: var(--report-ink); }

html[data-theme='dark'] .report-document .report-toc a { color: #b5c2d3; }
html[data-theme='dark'] .report-document .report-toc a:hover,
html[data-theme='dark'] .report-document .report-toc a:focus-visible,
html[data-theme='dark'] .report-document .report-toc a.is-active { border-color: #4e6d98; background: #24354b; color: #c3d9ff; }

html[data-theme='dark'] .report-document .section-heading,
html[data-theme='dark'] .report-document .summary-meta,
html[data-theme='dark'] .report-document .persona-intent-card .intent-list article,

html[data-theme='dark'] .report-document .summary-ribbon article,
html[data-theme='dark'] .report-document .metric-strip,
html[data-theme='dark'] .report-document .finding-card,
html[data-theme='dark'] .report-document .rank-card,
html[data-theme='dark'] .report-document .competitor-note,
html[data-theme='dark'] .report-document .competitor-summary,
html[data-theme='dark'] .report-document .detail-metrics article,
html[data-theme='dark'] .report-document .primary-metrics,
html[data-theme='dark'] .report-document .primary-metrics article,
html[data-theme='dark'] .report-document .platform-highlights article,
html[data-theme='dark'] .report-document .source-insights article,
html[data-theme='dark'] .report-document .intent-list article,
html[data-theme='dark'] .report-document .aux-strip > span,
html[data-theme='dark'] .report-document .live-empty,
html[data-theme='dark'] .report-document .persona-intent-card .intent-list article,
html[data-theme='dark'] .report-document .recommendation-card {
  border-color: var(--report-line);
  background: #202b3a;
}

html[data-theme='dark'] .report-document .finding-card.is-primary { border-color: #405d83; background: #1d2b3e; }
html[data-theme='dark'] .report-document .finding-index,
html[data-theme='dark'] .report-document .report-eyebrow { color: #91b7ff; }
html[data-theme='dark'] .report-document a { color: #91b7ff; }
html[data-theme='dark'] .report-document .is-own-brand th,
html[data-theme='dark'] .report-document .is-own-brand td { background: #183d34; }
html[data-theme='dark'] .report-document .summary-band { border-color: #334a68; border-left-color: #6da2f6; background: #1b2a3d; }
html[data-theme='dark'] .report-document .competitor-summary { color: #c1ccda; }
html[data-theme='dark'] .report-document .competitor-summary strong { color: var(--report-ink); }
html[data-theme='dark'] .report-document .gap-pills span,
html[data-theme='dark'] .report-document .question-platform-tag { border-color: #3b4a60; background: #202b3a; color: #c1ccda; }
html[data-theme='dark'] .report-document .metric-cell + .metric-cell,
html[data-theme='dark'] .report-document .primary-metrics article + article { border-color: var(--report-line); }

html[data-theme='dark'] .report-document .metric-delta,
html[data-theme='dark'] .report-document .report-status.is-generated,
html[data-theme='dark'] .report-document .evidence-badge:not(.is-missing),
html[data-theme='dark'] .report-document .primary-metric-heading i { background: #183d34; color: #75d6b3; }
html[data-theme='dark'] .report-document .metric-delta.is-neutral,
html[data-theme='dark'] .report-document .report-status.is-generating { background: #203a5c; color: #a9caff; }
html[data-theme='dark'] .report-document .report-status.is-outline,
html[data-theme='dark'] .report-document .evidence-badge.is-missing,
html[data-theme='dark'] .report-document .priority { background: #44371d; color: #f0c36c; }
html[data-theme='dark'] .report-document .report-status.is-failed { background: #48272b; color: #ffabb2; }
html[data-theme='dark'] .report-document .report-status.is-archived { background: #293444; color: #c1ccda; }

html[data-theme='dark'] .report-document .table-wrap { border-color: var(--report-line); scrollbar-color: #62738a #202b3a; }
html[data-theme='dark'] .report-document th,
html[data-theme='dark'] .report-document td,
html[data-theme='dark'] .report-document tbody th { border-bottom-color: #354357; color: #c1ccda; }
html[data-theme='dark'] .report-document thead th { background: #202b3a; color: #d3deeb; }
html[data-theme='dark'] .report-document tbody tr:hover { background: #202b3a; }
html[data-theme='dark'] .report-document .source-page-table .table-wrap.is-scrollable::-webkit-scrollbar-track { background: #202b3a; }
html[data-theme='dark'] .report-document .source-page-table .table-wrap.is-scrollable::-webkit-scrollbar-thumb { border-color: #202b3a; background: #62738a; }

html[data-theme='dark'] .report-document .heatmap-table td.is-strong { background: #18483e; color: #8de0c3; }
html[data-theme='dark'] .report-document .heatmap-table td.is-medium { background: #4b3c1c; color: #f0c36c; }
html[data-theme='dark'] .report-document .heatmap-table td.is-low { background: #4c292e; color: #ffabb2; }
html[data-theme='dark'] .report-document .recommendation-card:hover { border-color: #526b8b; background: #202d3e; }
</style>

