<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import { computed, ref } from 'vue'
import GeoDrawer from '../workbench/shared/GeoDrawer.vue'
import GeoPageIntro from '../workbench/shared/GeoPageIntro.vue'
import MonitoringEChart from './components/MonitoringEChart.vue'
import { strategies as strategyCatalog } from './data/strategies'

type Section = '复盘总览' | '信源时效' | '策略采纳与复盘分析' | 'Agent 升级'
type AgentVersion = { version: string, change: string, evalRate: number, qaRate: number, adoptionRate: number, observed: string, rollback?: boolean }
const sections: Section[] = ['复盘总览', '信源时效', '策略采纳与复盘分析', 'Agent 升级']
const active = ref<Section>('复盘总览')
const storageKey = 'geo-operations-review-standalone-v1'
const saved = (() => {
  try { return JSON.parse(localStorage.getItem(storageKey) || '{}') as { version?: number, versions?: AgentVersion[] } }
  catch { return {} }
})()
const agentVersion = ref(saved.version ?? 3)
const notice = ref('')
const sourceRows = [
  { kind: '品牌官网', title: '碳纤维方案页 · v2.4', market: '德国 / 德语', model: 'ChatGPT · Perplexity', published: '10/12 14:20', found: '10/14 09:10', cited: '10/16 11:35', foundDays: 1.8, citedDays: 3.9 },
  { kind: '第三方信源', title: 'CompositesWorld 行业投稿', market: '德国 / 英语', model: 'Gemini · Perplexity', published: '10/09 16:00', found: '10/11 10:25', cited: '10/15 08:40', foundDays: 1.8, citedDays: 3.7 },
  { kind: '品牌官网', title: '交期与产能页 · v1.6', market: '德国 / 德语', model: 'ChatGPT · Gemini', published: '10/08 12:00', found: '10/10 15:30', cited: '尚未观测到', foundDays: 2.1, citedDays: null },
  { kind: '第三方信源', title: '行业技术访谈 · 德国市场', market: '德国 / 德语', model: 'ChatGPT · Gemini', published: '10/06 09:00', found: '10/08 18:00', cited: '尚未观测到', foundDays: 2.4, citedDays: null },
]
const versionRows = ref<AgentVersion[]>(saved.versions ?? [
  { version: 'v1.0', change: '建立基线评估集', evalRate: 68, qaRate: 61, adoptionRate: 53, observed: '已完成观察' },
  { version: 'v1.1', change: '补充事实引用规则', evalRate: 73, qaRate: 67, adoptionRate: 59, observed: '已完成观察' },
  { version: 'v2.0', change: '增加结构化质检项', evalRate: 78, qaRate: 72, adoptionRate: 65, observed: '已完成观察' },
  { version: 'v2.1', change: '优化本地化术语检查', evalRate: 84, qaRate: 78, adoptionRate: 71, observed: '已完成观察' },
  { version: 'v3.0', change: '加强引用证据核验', evalRate: 88, qaRate: 82, adoptionRate: 76, observed: '观察中 · 第 4 天 / 7 天' },
])
const sourceKindFilter = ref('全部信源')
const marketFilter = ref('全部市场')
const languageFilter = ref('全部语言')
const modelFilter = ref('全部模型')
const filteredSources = computed(() => sourceRows.filter((row) => {
  return (sourceKindFilter.value === '全部信源' || row.kind === sourceKindFilter.value)
    && (marketFilter.value === '全部市场' || row.market.startsWith(marketFilter.value))
    && (languageFilter.value === '全部语言' || row.market.endsWith(languageFilter.value))
    && (modelFilter.value === '全部模型' || row.model.includes(modelFilter.value))
}))
const sourceStats = computed(() => ['品牌官网', '第三方信源'].map(kind => {
  const rows = filteredSources.value.filter(row => row.kind === kind)
  const found = rows.map(row => row.foundDays).filter((value): value is number => value !== null && value !== undefined)
  const cited = rows.map(row => row.citedDays).filter((value): value is number => value !== null)
  return { kind, count: rows.length, foundCount: found.length, citedCount: cited.length, noCitationCount: rows.filter(row => row.citedDays === null).length, avgFound: found.length ? (found.reduce((a, b) => a + b, 0) / found.length).toFixed(1) : '—', avgCited: cited.length ? (cited.reduce((a, b) => a + b, 0) / cited.length).toFixed(1) : '—' }
}))
const sourceTimingConclusion = computed(() => `当前筛选范围内：官网首次发现均值 ${sourceStats.value[0].avgFound} 天、首次观测引用均值 ${sourceStats.value[0].avgCited} 天；第三方信源分别为 ${sourceStats.value[1].avgFound} 天和 ${sourceStats.value[1].avgCited} 天。均值只基于有对应时间记录的样本，样本量见上方。`)
const funnelSteps = [
  { label: 'Agent 提出可审核策略', count: 25, width: 100 },
  { label: '客户或运营确认', count: 21, width: 84 },
  { label: '已建立执行任务', count: 19, width: 76 },
  { label: '执行任务已完成', count: 15, width: 60 },
]
const strategyPeriods = ['09/22', '09/29', '10/06', '10/13', '10/20']
const strategyRecords = [
  { id: 'GS1', period: '10/20', status: '已采纳并建任务', reasonType: '', reason: '审核确认：建议与官网品牌显影诊断相符。', taskId: 'T-2401', reviewer: '运营审核 · Mock', auditedAt: '10/20 10:35', marketLanguage: '德国 / 德语', qaResult: '尚未开始（任务处于 Brief 阶段）', publishResult: '尚未发布', monitorResult: '暂无观测记录', note: '任务详情按现有优化中心演示数据引用。' },
  { id: 'GS8', period: '10/20', status: '未采纳', reasonType: '诊断或证据依据不足', reason: '复盘记录：当前样例证据不足以支持此策略优先级，需补充信源分析。', taskId: '', reviewer: '运营审核 · Mock', auditedAt: '10/20 11:10', marketLanguage: '德国 / 德语', qaResult: '未进入质检', publishResult: '未发布', monitorResult: '未进入监测', note: '审核记录应保留诊断、问答或信源证据。' },
  { id: 'GS9', period: '10/13', status: '暂缓', reasonType: '执行条件或优先级不满足', reason: '复盘记录：先完成已排期的外部信源任务，再评估此项。', taskId: '', reviewer: '客户确认 · Mock', auditedAt: '10/13 15:20', marketLanguage: '德国 / 德语', qaResult: '未进入质检', publishResult: '未发布', monitorResult: '未进入监测', note: '暂缓是审核事实，不代表任务完成状态。' },
  { id: 'GS10', period: '10/13', status: '已采纳并建任务', reasonType: '', reason: '审核确认：建议与航空采购交期和产能诊断相符。', taskId: 'T-2505', reviewer: '运营审核 · Mock', auditedAt: '10/13 09:45', marketLanguage: '德国 / 英语', qaResult: '尚未开始（任务处于 Brief 阶段）', publishResult: '尚未发布', monitorResult: '暂无观测记录', note: '任务详情按现有优化中心演示数据引用。' },
  { id: 'GS7', period: '10/06', status: '未采纳', reasonType: '知识库信息缺失或冲突', reason: '复盘记录：相关产品事实需先由客户核实，审核暂不通过。', taskId: '', reviewer: '运营审核 · Mock', auditedAt: '10/06 16:05', marketLanguage: '德国 / 英语', qaResult: '未进入质检', publishResult: '未发布', monitorResult: '未进入监测', note: '真实复盘需关联具体知识条目、来源和版本。' },
  { id: 'GS4', period: '09/29', status: '暂缓', reasonType: '策略重复或已有任务覆盖', reason: '复盘记录：相同市场与目标已有任务覆盖，暂缓重复建单。', taskId: '关联演示任务 M-098', reviewer: '运营审核 · Mock', auditedAt: '09/29 14:30', marketLanguage: '日本 / 日语', qaResult: '未进入质检', publishResult: '未发布', monitorResult: '未进入监测', note: '需由审核人确认是否确属重复策略。' },
  { id: 'GS5', period: '09/22', status: '未采纳', reasonType: '策略目标或方法不适配', reason: '复盘记录：本期目标与建议方法不完全匹配，需重新诊断。', taskId: '', reviewer: '运营审核 · Mock', auditedAt: '09/22 13:15', marketLanguage: '北美 / 英语', qaResult: '未进入质检', publishResult: '未发布', monitorResult: '未进入监测', note: '不适配原因需由审核人补充说明。' },
].map((record) => ({ ...record, strategy: strategyCatalog.find(item => item.id === record.id)! }))
const selectedPeriod = ref('全部周期')
const selectedStrategyId = ref('')
const strategyStatusFilter = ref('全部状态')
const strategyReasonFilter = ref('全部原因')
const strategyReasons = computed(() => [...new Set(strategyRecords.map(record => record.reasonType || '已采纳'))])
const strategiesForPeriod = computed(() => strategyRecords.filter((record) => {
  return (selectedPeriod.value === '全部周期' || record.period === selectedPeriod.value)
    && (strategyStatusFilter.value === '全部状态' || record.status === strategyStatusFilter.value)
    && (strategyReasonFilter.value === '全部原因' || (record.reasonType || '已采纳') === strategyReasonFilter.value)
}))
const selectedStrategyRecord = computed(() => strategyRecords.find(record => record.id === selectedStrategyId.value))
const reasonCounts = computed(() => {
  const counts = new Map<string, number>()
  strategyRecords.forEach((record) => {
    if (record.reasonType)
      counts.set(record.reasonType, (counts.get(record.reasonType) ?? 0) + 1)
  })
  return [...counts.entries()].map(([reason, count]) => ({ reason, count }))
})
function selectStrategyTrendPoint(point: { name: string, seriesName?: string }) {
  if (!strategyPeriods.includes(point.name))
    return
  selectedPeriod.value = point.name
  selectedStrategyId.value = ''
}
const rate = computed(() => `${Math.round(9 / 11 * 100)}%`)
const conversionTrend = computed<EChartsOption>(() => ({
  color: ['#3b70cb', '#25a687'],
  grid: { left: 42, right: 18, top: 28, bottom: 36 },
  legend: { top: 0, right: 8, textStyle: { color: '#748196', fontSize: 11 } },
  tooltip: { trigger: 'axis', valueFormatter: (value: unknown) => `${value}%` },
  xAxis: { type: 'category', boundaryGap: false, data: ['09/22', '09/29', '10/06', '10/13', '10/20'], axisTick: { show: false }, axisLine: { lineStyle: { color: '#e1e7ef' } } },
  yAxis: { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%', color: '#8792a2' }, splitLine: { lineStyle: { type: 'dashed', color: '#e8edf3' } } },
  series: [
    { name: '策略转任务采纳率', type: 'line', smooth: true, symbolSize: 7, data: [58, 64, 68, 72, 76], lineStyle: { width: 3 } },
    { name: '七步质检首次通过率', type: 'line', smooth: true, symbolSize: 7, data: [66, 71, 75, 79, 82], lineStyle: { width: 3 } },
  ],
}))
const citationTrend = computed<EChartsOption>(() => ({
  color: ['#7359c7', '#e19a35'],
  grid: { left: 42, right: 18, top: 28, bottom: 36 },
  legend: { top: 0, right: 8, textStyle: { color: '#748196', fontSize: 11 } },
  tooltip: { trigger: 'axis', valueFormatter: (value: unknown) => `${value} 天` },
  xAxis: { type: 'category', boundaryGap: false, data: ['09/22', '09/29', '10/06', '10/13', '10/20'], axisTick: { show: false }, axisLine: { lineStyle: { color: '#e1e7ef' } } },
  yAxis: { type: 'value', min: 0, max: 8, interval: 2, axisLabel: { formatter: '{value} 天', color: '#8792a2' }, splitLine: { lineStyle: { type: 'dashed', color: '#e8edf3' } } },
  series: [
    { name: '官网更新→首次观测引用', type: 'line', smooth: true, symbolSize: 7, data: [6.2, 5.7, 5.1, 4.5, 3.9], lineStyle: { width: 3 } },
    { name: '第三方发布→首次观测引用', type: 'line', smooth: true, symbolSize: 7, data: [7.1, 6.2, 5.4, 4.6, 3.7], lineStyle: { width: 3 } },
  ],
}))
const sourceTimingTrend = computed<EChartsOption>(() => ({
  color: ['#3b70cb', '#25a687', '#8b6bc8', '#e19a35'],
  grid: { left: 48, right: 18, top: 32, bottom: 38 },
  legend: { top: 0, right: 8, textStyle: { color: '#748196', fontSize: 10 } },
  tooltip: { trigger: 'axis', valueFormatter: (value: unknown) => `${value} 天` },
  xAxis: { type: 'category', boundaryGap: false, data: ['09/22', '09/29', '10/06', '10/13', '10/20'], axisTick: { show: false }, axisLine: { lineStyle: { color: '#e1e7ef' } } },
  yAxis: { type: 'value', min: 0, max: 10, interval: 2, axisLabel: { formatter: '{value} 天', color: '#8792a2' }, splitLine: { lineStyle: { type: 'dashed', color: '#e8edf3' } } },
  series: [
    { name: '官网首次发现', type: 'line', smooth: true, symbolSize: 6, data: [3.4, 3.1, 2.7, 2.4, 2.1], lineStyle: { width: 2 } },
    { name: '第三方首次发现', type: 'line', smooth: true, symbolSize: 6, data: [3.1, 2.9, 2.6, 2.3, 1.8], lineStyle: { width: 2 } },
    { name: '官网首次观测引用', type: 'line', smooth: true, symbolSize: 6, data: [6.2, 5.7, 5.1, 4.5, 3.9], lineStyle: { width: 3 } },
    { name: '第三方首次观测引用', type: 'line', smooth: true, symbolSize: 6, data: [7.1, 6.2, 5.4, 4.6, 3.7], lineStyle: { width: 3 } },
  ],
}))
const reviewTrend = computed<EChartsOption>(() => ({
  color: ['#3b70cb', '#25a687'],
  grid: { left: 42, right: 18, top: 28, bottom: 36 },
  legend: { top: 0, right: 8, textStyle: { color: '#748196', fontSize: 11 } },
  tooltip: { trigger: 'axis', valueFormatter: (value: unknown) => `${value}%` },
  xAxis: { type: 'category', boundaryGap: false, data: ['09/22', '09/29', '10/06', '10/13', '10/20'], axisTick: { show: false }, axisLine: { lineStyle: { color: '#e1e7ef' } } },
  yAxis: { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%', color: '#8792a2' }, splitLine: { lineStyle: { type: 'dashed', color: '#e8edf3' } } },
  series: [
    { name: '策略转任务采纳率', type: 'line', smooth: true, symbolSize: 7, data: [58, 64, 68, 72, 76], lineStyle: { width: 3 } },
    { name: '七步质检首次通过率', type: 'line', smooth: true, symbolSize: 7, data: [66, 71, 75, 79, 82], lineStyle: { width: 3 } },
  ],
}))
const agentVersionTrend = computed<EChartsOption>(() => ({
  color: ['#7359c7', '#e19a35', '#25a687'],
  grid: { left: 42, right: 18, top: 28, bottom: 36 },
  legend: { top: 0, right: 8, textStyle: { color: '#748196', fontSize: 11 } },
  tooltip: { trigger: 'axis', valueFormatter: (value: unknown) => `${value}%` },
  xAxis: { type: 'category', boundaryGap: false, data: versionRows.value.map(item => item.version), axisTick: { show: false }, axisLine: { lineStyle: { color: '#e1e7ef' } } },
  yAxis: { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%', color: '#8792a2' }, splitLine: { lineStyle: { type: 'dashed', color: '#e8edf3' } } },
  series: [
    { name: '离线评估集通过率', type: 'line', smooth: true, symbolSize: 7, data: versionRows.value.map(item => item.evalRate), lineStyle: { width: 3 } },
    { name: '七步质检首次通过率', type: 'line', smooth: true, symbolSize: 7, data: versionRows.value.map(item => item.qaRate), lineStyle: { width: 2 } },
    { name: '策略采纳率', type: 'line', smooth: true, symbolSize: 7, data: versionRows.value.map(item => item.adoptionRate), lineStyle: { width: 2 } },
  ],
}))
function save() {
  try { localStorage.setItem(storageKey, JSON.stringify({ version: agentVersion.value, versions: versionRows.value })) }
  catch { /* Demo remains usable for this session. */ }
}
function simulateUpgrade() {
  agentVersion.value += 1
  const last = versionRows.value.at(-1)!
  versionRows.value.push({ version: `v${agentVersion.value}.0`, change: '模拟升级：加强引用证据核验', evalRate: Math.min(98, last.evalRate + 3), qaRate: Math.min(96, last.qaRate + 2), adoptionRate: Math.min(94, last.adoptionRate + 2), observed: '观察中 · 第 1 天 / 7 天' })
  save()
  notice.value = `演示评估通过，已记录 Agent v${agentVersion.value}.0`
  window.setTimeout(() => notice.value = '', 2400)
}
function simulateRollback() {
  const previous = versionRows.value.at(-2)
  if (!previous)
    return
  const current = versionRows.value.at(-1)!
  versionRows.value.push({ ...previous, version: `回退至 ${previous.version}`, change: `模拟回退：${current.version} 观察指标异常`, observed: '回退演示记录', rollback: true })
  agentVersion.value += 1
  save()
  notice.value = '已记录模拟回退事件，未修改真实 Agent 配置'
  window.setTimeout(() => notice.value = '', 2600)
}
</script>

<template>
  <div class="ops-review">
    <GeoPageIntro variant="workbench" title="运营复盘与 Agent 升级" help-label="运营复盘与 Agent 升级说明" description="GEO Agent · 学习闭环。把策略执行、内容质量和信源引用结果汇总成可追踪的改进记录。演示数据 · Mock 流程。" />
    <div class="ops-review__kpis ops-review__kpis--top">
      <article><span>策略转任务采纳率</span><strong>76%</strong><small>19 / 25 条可审核策略 · Mock</small></article>
      <article><span>七步质检首次通过率</span><strong>{{ rate }}</strong><small>9 / 11 个首次提交任务 · Mock</small></article>
      <article><span>官网更新 → 首次观测引用</span><strong>{{ sourceStats[0].avgCited }} 天</strong><small>{{ sourceStats[0].citedCount }} 条有引用时间的演示样本</small></article>
      <article><span>第三方发布 → 首次观测引用</span><strong>{{ sourceStats[1].avgCited }} 天</strong><small>{{ sourceStats[1].citedCount }} 条有引用时间的演示样本</small></article>
    </div>
    <nav class="ops-review__tabs" aria-label="运营复盘子页面">
      <button v-for="section in sections" :key="section" :class="{ active: active === section }" @click="active = section">{{ section }}</button>
    </nav>

    <template v-if="active === '复盘总览'">
      <div class="ops-note ops-note--insight"><b>本期汇总分析</b><span>策略采纳率与首次质检通过率在近五期 Mock 样本中上升；官网和第三方信源的引用观测耗时下降。建议结合各专题页检查市场表现、样本量和 Agent 版本变化。</span><small>德国演示市场 · 近五期 · 更新时间：演示数据</small></div>
      <div class="ops-shortcuts"><button @click="active = '信源时效'">查看信源时效明细 →</button><button @click="active = '策略采纳与复盘分析'">查看策略采纳与复盘分析 →</button><button @click="active = 'Agent 升级'">查看 Agent 版本表现 →</button></div>
      <div class="ops-review__grid ops-review__charts">
        <section class="ops-card"><div class="ops-card__head"><div><h2>策略与内容质量趋势</h2><p>近五期表现 · Mock 演示数据</p></div><span class="ops-counter">百分比</span></div><MonitoringEChart :option="conversionTrend" label="近五期策略转任务采纳率与七步质检首次通过率趋势图" /></section>
        <section class="ops-card"><div class="ops-card__head"><div><h2>信源引用时效趋势</h2><p>首次观测引用所需时间 · Mock 演示数据</p></div><span class="ops-counter">天数</span></div><MonitoringEChart :option="citationTrend" label="近五期官网和第三方信源发布至首次观测引用时间趋势图" /></section>
      </div>
      <div class="ops-review__grid">
        <section class="ops-card"><div class="ops-card__head"><div><h2>策略审核与追溯</h2><p>以单条策略为线索查看审核记录与关联执行结果</p></div></div><div class="ops-summary"><div><b>审核事实</b><span>策略状态、原因、审核时间和市场语言。</span></div><div><b>执行追溯</b><span>已关联任务的质检、发布和监测情况只读展示。</span></div><div><b>分析边界</b><span>样例不足时保留单条记录，不推断共性根因。</span></div></div></section>
        <section class="ops-card ops-agent-card"><div class="ops-card__head"><div><h2>Agent 升级台</h2><p>当前演示版本 v{{ agentVersion }}.0</p></div><span class="ops-status">评估就绪</span></div><div class="ops-agent-card__metric"><span>离线评估集通过率</span><strong>88%</strong><span>升级建议：增强引用证据核验</span></div><button class="ops-button ops-button--primary" @click="simulateUpgrade">模拟评估并记录新版本</button><small>仅生成演示评估与版本记录，不修改真实 Agent 配置。</small></section>
      </div>
    </template>

    <template v-else-if="active === '信源时效'">
      <div class="ops-filters"><label>信源类型<select v-model="sourceKindFilter"><option>全部信源</option><option>品牌官网</option><option>第三方信源</option></select></label><label>市场<select v-model="marketFilter"><option>全部市场</option><option>德国</option></select></label><label>语言<select v-model="languageFilter"><option>全部语言</option><option>德语</option><option>英语</option></select></label><label>模型<select v-model="modelFilter"><option>全部模型</option><option>ChatGPT</option><option>Gemini</option><option>Perplexity</option></select></label></div>
      <div class="ops-source-stats"><article v-for="stat in sourceStats" :key="stat.kind"><div class="ops-card__head"><div><h2>{{ stat.kind }}</h2><p>{{ stat.count }} 条样本 · 按当前市场、语言和模型筛选</p></div><span class="ops-counter">独立统计</span></div><div class="ops-source-stats__metrics"><div><small>发布后首次发现均值</small><b>{{ stat.avgFound }} 天</b><span>{{ stat.foundCount }} 条有发现时间</span></div><div><small>发布后首次观测引用均值</small><b>{{ stat.avgCited }} 天</b><span>{{ stat.citedCount }} 条已观测到引用</span></div><div><small>尚未观测到引用</small><b>{{ stat.noCitationCount }} 条</b><span>单独列示，不按 0 天计入</span></div></div></article></div>
      <section class="ops-card"><div class="ops-card__head"><div><h2>信源发现与引用时效趋势</h2><p>官网与第三方信源的首次发现、首次观测引用耗时 · Mock 演示数据</p></div><span class="ops-counter">天数</span></div><MonitoringEChart :option="sourceTimingTrend" label="近五期官网与第三方信源首次发现和首次观测引用时效趋势图" /></section>
      <div class="ops-note ops-note--insight"><b>时效分析</b><span>{{ sourceTimingConclusion }}</span><small>耗时统计只纳入已有观测时间的样本；未观测到引用的内容单独列示，不按 0 天计算。</small></div>
      <section class="ops-card"><div class="ops-card__head"><div><h2>信源发布、发现与引用时间线</h2><p>发现和引用指监测中首次观测到，不代表模型内部索引的真实时间。</p></div><span class="ops-counter">{{ filteredSources.length }} 条演示样本</span></div>
        <div class="ops-table-wrap"><table><thead><tr><th>信源类型 / 内容</th><th>市场语言</th><th>模型</th><th>发布 / 更新</th><th>首次发现时间 / 耗时</th><th>首次观测引用时间 / 耗时</th></tr></thead><tbody><tr v-for="row in filteredSources" :key="row.title"><td><span class="ops-source-kind">{{ row.kind }}</span><b>{{ row.title }}</b></td><td>{{ row.market }}</td><td>{{ row.model }}</td><td>{{ row.published }}</td><td>{{ row.found }} · {{ row.foundDays }} 天</td><td>{{ row.cited }}<template v-if="row.citedDays !== null"> · {{ row.citedDays }} 天</template></td></tr><tr v-if="!filteredSources.length"><td colspan="6">当前筛选条件下没有演示样本。</td></tr></tbody></table></div>
      </section><div class="ops-note">官网从内容版本更新时间起算，第三方从发布时间起算。样本保留模型、市场、语言和监测问题，引用观测次数按记录累计。</div>
    </template>

    <template v-else-if="active === '策略采纳与复盘分析'">
      <section class="ops-card"><div class="ops-card__head"><div><h2>趋势与汇总</h2><p>策略采纳率、七步质检首次通过率 · Mock 演示数据</p></div><span class="ops-counter">点击采纳率数据点可切换周期</span></div><MonitoringEChart :option="reviewTrend" :interactive="true" label="近五期策略转任务采纳率及七步质检首次通过率趋势图" @select-point="selectStrategyTrendPoint" /><div class="ops-reason-summary"><button v-for="item in reasonCounts" :key="item.reason" @click="strategyReasonFilter = item.reason; selectedStrategyId = ''"><b>{{ item.reason }}</b>{{ item.count }} 条 · 筛选</button></div><div class="ops-note">采纳率 = 被确认并建立执行任务的策略数 ÷ 可审核策略数；质检首次通过率单独统计。点击原因标签可直接筛选下方明细。</div></section>
      <section class="ops-card"><div class="ops-card__head"><div><h2>策略明细 · {{ selectedPeriod }}</h2><p>按周期、审核结果和原因筛选；展开单条策略查看依据与执行追溯。</p></div><span class="ops-counter">{{ strategiesForPeriod.length }} 条匹配样例</span></div><div class="ops-period-select"><button :class="{ active: selectedPeriod === '全部周期' }" @click="selectedPeriod = '全部周期'; selectedStrategyId = ''">全部周期</button><button v-for="period in strategyPeriods" :key="period" :class="{ active: selectedPeriod === period }" @click="selectedPeriod = period; selectedStrategyId = ''">{{ period }}</button></div><div class="ops-filters"><label>审核结果<select v-model="strategyStatusFilter" @change="selectedStrategyId = ''"><option>全部状态</option><option>已采纳并建任务</option><option>未采纳</option><option>暂缓</option></select></label><label>原因分类<select v-model="strategyReasonFilter" @change="selectedStrategyId = ''"><option>全部原因</option><option v-for="reason in strategyReasons" :key="reason">{{ reason }}</option></select></label></div>
        <div v-if="strategiesForPeriod.length" class="ops-strategy-drill-list"><button v-for="record in strategiesForPeriod" :key="record.id" class="ops-strategy-drill-row" @click="selectedStrategyId = record.id"><span class="ops-strategy-drill-row__id">{{ record.id }}</span><span class="ops-strategy-drill-row__main"><b>{{ record.strategy.title }}</b><small>{{ record.strategy.layer }} · 来源诊断 {{ record.strategy.source }}</small></span><span class="ops-tag" :class="{ adopted: record.status === '已采纳并建任务', rejected: record.status === '未采纳' }">{{ record.status }}</span><span class="ops-strategy-drill-row__reason">{{ record.reasonType || (record.status === '已采纳并建任务' ? '—' : '未填写') }}</span><span>查看详情 →</span></button></div><div v-else class="ops-empty">该周期暂无演示明细样本；不代表真实业务中没有策略记录。</div>
        <GeoDrawer :open="Boolean(selectedStrategyRecord)" title="策略详情" size="lg" :show-footer="false" @close="selectedStrategyId = ''">
          <div v-if="selectedStrategyRecord" class="ops-strategy-detail"><div class="ops-card__head"><div><h3>{{ selectedStrategyRecord.strategy.title }}</h3><p>{{ selectedStrategyRecord.id }} · {{ selectedStrategyRecord.strategy.layer }} · {{ selectedStrategyRecord.period }}</p></div></div><div class="ops-strategy-detail__group"><b>策略审核事实</b><div class="ops-strategy-detail__grid"><div><small>策略类型 / 来源诊断</small><b>{{ selectedStrategyRecord.strategy.layer }} · {{ selectedStrategyRecord.strategy.source }}</b></div><div><small>目标市场 / 语言</small><b>{{ selectedStrategyRecord.marketLanguage }}</b></div><div><small>审核结果</small><b>{{ selectedStrategyRecord.status }}</b></div><div><small>审核人 / 时间</small><b>{{ selectedStrategyRecord.reviewer }} · {{ selectedStrategyRecord.auditedAt }}</b></div><div><small>已记录原因分类</small><b>{{ selectedStrategyRecord.reasonType || '已采纳' }}</b></div></div><div class="ops-strategy-detail__section"><b>策略内容与判断依据</b><p>{{ selectedStrategyRecord.strategy.description }}</p><p>来源诊断依据：{{ selectedStrategyRecord.strategy.evidence }}</p><small>执行方法：{{ selectedStrategyRecord.strategy.methods.join('、') }} · 审核说明：{{ selectedStrategyRecord.reason }}</small></div></div><div class="ops-strategy-detail__group"><b>执行结果追溯</b><div class="ops-strategy-detail__grid"><div><small>优化中心关联任务</small><a v-if="selectedStrategyRecord.taskId.startsWith('T-')" :href="`https://mengqilv23-spec.github.io/geo-agent-web-mock/optimization/tasks/${selectedStrategyRecord.taskId}`" target="_blank" rel="noopener noreferrer">{{ selectedStrategyRecord.taskId }} · 打开任务详情</a><b v-else>{{ selectedStrategyRecord.taskId || '未建立任务' }}</b></div><div><small>后续质检</small><b>{{ selectedStrategyRecord.qaResult }}</b></div><div><small>页面发布</small><b>{{ selectedStrategyRecord.publishResult }}</b></div><div><small>可见性监测</small><b>{{ selectedStrategyRecord.monitorResult }}</b></div></div><div class="ops-note">任务及执行状态是跨模块的 Mock 演示引用；本页只读展示，不修改优化中心任务。</div></div></div>
        </GeoDrawer>
        <div class="ops-note ops-note--taxonomy"><b>未采纳原因分类说明</b><span>知识库信息缺失或冲突、诊断或证据依据不足、策略目标或方法不适配、策略重复或已有任务覆盖、执行条件或优先级不满足、其他/未填写。这是本产品建议的演示运营分类，不是行业统一标准；真实记录应由审核人选择并填写依据，未知原因显示“未填写”。</span></div>
      </section>
      <section class="ops-card"><div class="ops-card__head"><div><h2>策略执行转化漏斗</h2><p>区分策略采纳与任务完成 · Mock 演示数据</p></div><span class="ops-counter">25 条策略样本</span></div><div class="ops-funnel"><div v-for="step in funnelSteps" :key="step.label" class="ops-funnel__row"><span>{{ step.label }}</span><div><i :style="{ width: `${step.width}%` }" /></div><b>{{ step.count }}</b></div></div><div class="ops-note">25 条可审核策略中，19 条确认并建立任务（76%），15 条任务已完成。采纳不代表任务完成或已产生引用效果。</div></section>
    </template>

    <template v-else>
      <section class="ops-card"><div class="ops-card__head"><div><h2>Agent 版本效果趋势</h2><p>版本迭代前后的评估集、质检和策略采纳表现 · Mock 演示数据</p></div><span class="ops-counter">百分比</span></div><MonitoringEChart :option="agentVersionTrend" label="Agent 五个演示版本的评估集通过率、七步质检首次通过率和策略采纳率趋势图" /></section>
      <section class="ops-card"><div class="ops-card__head"><div><h2>版本变更与观察记录</h2><p>趋势中的变化点对应具体演示版本说明。</p></div><button class="ops-button" @click="simulateRollback">模拟回退并留痕</button></div><div class="ops-version-list"><article v-for="version in versionRows" :key="version.version"><b>{{ version.version }}</b><span>{{ version.change }}</span><span>评估 {{ version.evalRate }}% · 首检 {{ version.qaRate }}% · 采纳 {{ version.adoptionRate }}%</span><em :class="{ rollback: version.rollback }">{{ version.rollback ? '回退演示' : version.observed }}</em></article></div></section>
      <div class="ops-review__grid"><section class="ops-card"><div class="ops-card__head"><div><h2>升级候选项</h2><p>由复盘结果归纳的可评估改进</p></div><span class="ops-status">待模拟评估</span></div><div class="ops-upgrade-list"><article><span>01</span><div><b>事实与引用证据核验</b><p>生成内容中关键参数需逐项匹配品牌知识与来源。</p></div><em>内容质检</em></article><article><span>02</span><div><b>德语行业术语一致性</b><p>沉淀术语表和本地化表达检查规则。</p></div><em>规则库</em></article><article><span>03</span><div><b>策略优先级判断</b><p>把被采纳与被暂缓策略样本加入评估集。</p></div><em>策略模板</em></article></div></section><section class="ops-card"><div class="ops-card__head"><div><h2>演示版本记录</h2><p>评估集对比通过后生成版本，不触及生产配置。</p></div></div><div class="ops-version"><span>当前演示版本</span><strong>Agent v{{ agentVersion }}.0</strong><small>评估样本 50 条 · 观察窗口 7 天 · 变更项：加强引用证据核验</small><small>回退条件：观察期内质检或策略采纳关键指标连续两期下降。</small><button class="ops-button ops-button--primary" @click="simulateUpgrade">运行模拟评估并生成版本</button></div></section></div>
      <section class="ops-card ops-definition"><h2>升级流程</h2><div><span>复盘发现问题</span><i>→</i><span>形成升级候选</span><i>→</i><span>演示评估集验证</span><i>→</i><span>记录版本与观察指标</span></div></section>
    </template>
    <div v-if="notice" class="ops-toast" role="status">{{ notice }}</div>
  </div>
</template>

<style scoped>
.ops-note--insight{display:grid;gap:5px;margin-bottom:14px;border-left:3px solid #4b78cf}.ops-note--insight b{color:#354760;font-size:13px}.ops-note--insight small{color:#8a96a5;font-size:11px}.ops-shortcuts{display:flex;gap:9px;flex-wrap:wrap;margin:0 0 16px}.ops-shortcuts button{border:1px solid #dce5f1;border-radius:7px;padding:8px 11px;background:#fff;color:#3968b3;font-size:12px;cursor:pointer}.ops-filters{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 14px}.ops-filters label{display:flex;align-items:center;gap:7px;color:#758296;font-size:12px}.ops-filters select{border:1px solid #dce3ec;border-radius:6px;padding:7px 24px 7px 9px;background:#fff;color:#45546a;font:inherit}.ops-funnel{display:grid;gap:13px;margin:8px 0 16px}.ops-funnel__row{display:grid;grid-template-columns:190px minmax(100px,1fr) 42px;align-items:center;gap:12px;color:#65758b;font-size:12px}.ops-funnel__row>div{height:14px;border-radius:99px;background:#eef2f7;overflow:hidden}.ops-funnel__row i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#81a4e6,#4c79d1)}.ops-funnel__row b{color:#334155}.ops-review-list article{grid-template-columns:64px minmax(200px,1fr) auto auto auto}.ops-review-list .ops-button{white-space:nowrap}.ops-version-list{display:grid}.ops-version-list article{display:grid;grid-template-columns:88px minmax(180px,1fr) minmax(220px,1fr) auto;align-items:center;gap:12px;padding:12px 4px;border-top:1px solid #edf0f4;font-size:12px;color:#627188}.ops-version-list b{color:#334155}.ops-version-list em{font-style:normal;color:#51805f;background:#edf7ef;border-radius:20px;padding:5px 9px;white-space:nowrap}.ops-version-list em.rollback{color:#a45c54;background:#fdf0ee}
.ops-review{max-width:1440px;margin:0 auto;padding:28px 36px 56px;color:#1f2937}.ops-review__header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px}.ops-review__eyebrow{font-size:12px;color:#718096;letter-spacing:.04em}.ops-review h1{margin:7px 0;font-size:26px;line-height:1.3;font-weight:650;color:#182230}.ops-review__header p,.ops-card__head p{margin:0;color:#778394;font-size:13px}.ops-review__demo,.ops-counter,.ops-status,.ops-tag{border-radius:999px;padding:6px 10px;background:#eef4ff;color:#3766b1;font-size:12px;white-space:nowrap}.ops-review__tabs{display:flex;gap:8px;border-bottom:1px solid #e5eaf0;margin-bottom:20px}.ops-review__tabs button{padding:10px 14px;border:0;border-bottom:2px solid transparent;background:transparent;color:#647184;cursor:pointer}.ops-review__tabs button.active{border-color:#4d79d8;color:#2458b8;font-weight:600}.ops-review__kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:16px}.ops-review__kpis article,.ops-card{background:#fff;border:1px solid #e6eaf0;border-radius:12px;box-shadow:0 2px 8px #1a36500a}.ops-review__kpis article{display:flex;flex-direction:column;padding:18px 20px;gap:7px}.ops-review__kpis article span{font-size:13px;color:#647184}.ops-review__kpis article strong{font-size:28px;color:#1b2a3d;line-height:1.2}.ops-review__kpis article small,.ops-agent-card small{font-size:12px;color:#8994a3}.ops-review__grid{display:grid;grid-template-columns:1.45fr 1fr;gap:16px;margin-bottom:16px}.ops-card{padding:20px;margin-bottom:16px}.ops-review__grid .ops-card{margin:0}.ops-card__head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:18px}.ops-card h2{font-size:16px;margin:0 0 5px;color:#253247}.ops-button{border:1px solid #d9e1eb;border-radius:7px;padding:8px 12px;background:#fff;color:#42536a;font-size:12px;cursor:pointer}.ops-button--primary{background:#376fd0;border-color:#376fd0;color:white}.ops-summary{display:grid;gap:0}.ops-summary div{display:grid;grid-template-columns:90px 1fr;gap:12px;padding:13px 0;border-top:1px solid #eef1f5;font-size:13px}.ops-summary b{color:#344256}.ops-summary span{color:#718094}.ops-agent-card{display:flex;flex-direction:column}.ops-agent-card__metric{display:flex;flex-direction:column;gap:7px;padding:8px 0 18px}.ops-agent-card__metric span{font-size:12px;color:#758296}.ops-agent-card__metric strong{font-size:30px;color:#2a5eaa}.ops-agent-card .ops-button{margin-bottom:10px}.ops-review-list article{display:grid;grid-template-columns:74px minmax(200px,1fr) auto auto;align-items:center;gap:15px;padding:14px 2px;border-top:1px solid #eef1f5}.ops-review-list__id{font-size:12px;color:#8592a3}.ops-review-list b,.ops-review-list strong{font-size:13px;color:#334155}.ops-review-list p{font-size:12px;color:#778394;margin:5px 0 0;line-height:1.6}.ops-review-list strong{white-space:nowrap}.ops-tag{background:#f1f5f9;color:#65758b}.ops-table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;font-size:12px;text-align:left}th{padding:11px 10px;background:#f7f9fc;color:#66758a;font-weight:550;white-space:nowrap}td{padding:14px 10px;border-bottom:1px solid #edf0f4;color:#58677a;white-space:nowrap}td:first-child{white-space:normal;min-width:220px}td:first-child b{display:block;color:#334155;font-size:12px}.ops-source-kind{display:inline-block;margin-bottom:5px;padding:3px 7px;border-radius:5px;background:#eef4ff;color:#4871b4;font-size:11px}.ops-note{padding:14px 16px;border-radius:9px;background:#f4f7fb;color:#718094;font-size:12px;line-height:1.7}.ops-review__kpis--small{grid-template-columns:repeat(3,minmax(0,1fr));margin-top:16px}.ops-upgrade-list article{display:grid;grid-template-columns:28px 1fr auto;align-items:start;gap:12px;padding:14px 0;border-top:1px solid #eef1f5}.ops-upgrade-list article>span{color:#93a2b4;font-size:12px}.ops-upgrade-list b{font-size:13px}.ops-upgrade-list p{margin:5px 0 0;color:#778394;font-size:12px;line-height:1.6}.ops-upgrade-list em{font-style:normal;background:#f3f6fa;padding:4px 7px;border-radius:5px;font-size:11px;color:#718094}.ops-version{display:flex;flex-direction:column;gap:11px;align-items:flex-start;padding:16px 0}.ops-version span,.ops-version small{color:#788597;font-size:12px}.ops-version strong{font-size:24px;color:#2a5eaa}.ops-definition>div{display:flex;align-items:center;justify-content:space-between;gap:8px}.ops-definition>div span{padding:12px;background:#f5f8fc;border-radius:8px;color:#53657c;font-size:12px}.ops-definition i{font-style:normal;color:#9aa6b5}.ops-toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%);padding:11px 18px;background:#26364a;color:white;border-radius:8px;font-size:13px;box-shadow:0 4px 18px #0002;z-index:20}@media(max-width:900px){.ops-review{padding:22px 18px}.ops-review__kpis{grid-template-columns:repeat(2,1fr)}.ops-review__grid{grid-template-columns:1fr}.ops-review-list article{grid-template-columns:55px 1fr auto}.ops-review-list article .ops-tag{display:none}.ops-definition>div{flex-wrap:wrap;justify-content:flex-start}.ops-definition>div i{display:none}}@media(max-width:560px){.ops-review__header{display:block}.ops-review__demo{display:inline-block;margin-top:12px}.ops-review__tabs{overflow-x:auto}.ops-review__tabs button{white-space:nowrap}.ops-review__kpis{grid-template-columns:1fr 1fr;gap:9px}.ops-review__kpis article{padding:14px}.ops-review__kpis article strong{font-size:23px}.ops-review__kpis--small{grid-template-columns:1fr}.ops-review-list article{grid-template-columns:1fr auto}.ops-review-list__id{display:none}.ops-summary div{grid-template-columns:1fr;gap:5px}}
@media(max-width:900px){.ops-review-list article{grid-template-columns:54px minmax(160px,1fr) auto}.ops-review-list article .ops-tag{display:inline-block}.ops-version-list article{grid-template-columns:72px 1fr auto}.ops-version-list article span:nth-of-type(2){grid-column:2}.ops-version-list em{grid-column:3;grid-row:1 / span 2}}
@media(max-width:620px){.ops-funnel__row{grid-template-columns:120px minmax(60px,1fr) 30px;gap:8px;font-size:11px}.ops-review-list article{grid-template-columns:1fr auto}.ops-review-list__id{display:none}.ops-review-list article .ops-button{grid-column:2}.ops-review-list article .ops-tag{grid-column:1}.ops-version-list article{grid-template-columns:1fr auto;gap:6px}.ops-version-list article span,.ops-version-list em{grid-column:1 / -1}.ops-version-list em{grid-row:auto}.ops-filters label{flex:1;justify-content:space-between}}
.ops-period-select{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px}.ops-period-select button{border:1px solid #dfe6ef;border-radius:7px;padding:7px 11px;background:white;color:#64748b;font-size:12px;cursor:pointer}.ops-period-select button.active{border-color:#4b78cf;background:#edf4ff;color:#2e60b3}.ops-strategy-drill-list{display:grid}.ops-strategy-drill-row{display:grid;grid-template-columns:62px minmax(230px,1fr) 140px minmax(160px,.8fr) 80px;align-items:center;gap:12px;padding:13px 6px;border:0;border-top:1px solid #edf0f4;background:white;text-align:left;color:#64748b;font-size:12px;cursor:pointer}.ops-strategy-drill-row:hover{background:#f8faff}.ops-strategy-drill-row__id{color:#8895a5}.ops-strategy-drill-row__main{display:grid;gap:4px}.ops-strategy-drill-row__main b{color:#334155;font-size:13px}.ops-strategy-drill-row__main small{color:#8793a3}.ops-strategy-drill-row .ops-tag.adopted{background:#eaf6ef;color:#39815a}.ops-strategy-drill-row .ops-tag.rejected{background:#fff0ed;color:#b55b4d}.ops-strategy-drill-row>span:last-child{color:#3d6db9;white-space:nowrap}.ops-strategy-detail{margin-top:16px;padding:18px;border:1px solid #dfe8f4;border-radius:10px;background:#f9fbfe}.ops-strategy-detail h3{margin:0 0 5px;font-size:14px;color:#28384e}.ops-strategy-detail__grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.ops-strategy-detail__grid>div{display:grid;gap:6px;padding:11px;border-radius:8px;background:#fff}.ops-strategy-detail__grid small,.ops-strategy-detail__section small{font-size:11px;color:#8290a0}.ops-strategy-detail__grid b{font-size:12px;color:#38495f}.ops-strategy-detail__section{margin-top:12px;padding:13px;border-radius:8px;background:#fff}.ops-strategy-detail__section>b{font-size:12px;color:#46566b}.ops-strategy-detail__section p{margin:7px 0;color:#6b788b;font-size:12px;line-height:1.65}.ops-note--taxonomy{margin-top:15px}.ops-empty{padding:28px;text-align:center;color:#8793a3;font-size:12px}@media(max-width:850px){.ops-strategy-drill-row{grid-template-columns:48px minmax(180px,1fr) 110px}.ops-strategy-drill-row__reason{grid-column:2}.ops-strategy-drill-row>span:last-child{grid-column:3;grid-row:2}.ops-strategy-detail__grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.ops-strategy-drill-row{grid-template-columns:1fr auto;gap:7px}.ops-strategy-drill-row__id{display:none}.ops-strategy-drill-row__reason{grid-column:1}.ops-strategy-drill-row>span:last-child{grid-column:2;grid-row:2}.ops-strategy-drill-row .ops-tag{grid-column:2;grid-row:1}.ops-strategy-detail__grid{grid-template-columns:1fr 1fr}}
.ops-analysis-preview{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.ops-analysis-preview article{display:grid;gap:8px;padding:14px;border:1px solid #e9edf3;border-radius:9px}.ops-analysis-preview article>b{font-size:13px;color:#36475d}.ops-analysis-preview article>span{font-size:11px;color:#738196}.ops-analysis-preview article>p{margin:0;color:#718094;font-size:12px;line-height:1.6}.ops-analysis-preview article>button,.ops-analysis-list__links button{justify-self:start;padding:0;border:0;background:none;color:#356aba;font-size:12px;cursor:pointer}.ops-analysis-list{display:grid;gap:12px}.ops-analysis-list>article{padding:16px;border:1px solid #e8edf3;border-radius:10px}.ops-analysis-list__heading{display:flex;justify-content:space-between;gap:12px;align-items:center}.ops-analysis-list__heading>b{font-size:14px;color:#334155}.ops-analysis-list__heading>span{font-size:11px;color:#748196}.ops-analysis-list__content{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:12px}.ops-analysis-list__content>div{padding:11px;border-radius:8px;background:#f7f9fc}.ops-analysis-list__content small,.ops-analysis-list__links>small{font-size:11px;color:#8290a0}.ops-analysis-list__content p{margin:6px 0 0;color:#5f6e82;font-size:12px;line-height:1.6}.ops-analysis-list__links{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px}.ops-analysis-list__links>small{margin-right:4px}.ops-analysis-list__links button{padding:5px 8px;border:1px solid #dce6f4;border-radius:6px;background:#fff}
@media(max-width:850px){.ops-analysis-preview{grid-template-columns:1fr}.ops-analysis-list__content{grid-template-columns:1fr}}
.ops-reason-summary{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.ops-reason-summary span{display:flex;gap:6px;align-items:center;padding:7px 10px;border:1px solid #e8edf3;border-radius:7px;background:#fafbfd;color:#6b788b;font-size:11px}.ops-reason-summary b{color:#43536a;font-weight:600}.ops-strategy-detail__group{margin-top:14px;padding:14px;border:1px solid #e6ebf2;border-radius:9px;background:#fff}.ops-strategy-detail__group> b{font-size:12px;color:#344256}.ops-strategy-detail__group .ops-strategy-detail__grid{margin-top:10px}.ops-strategy-detail__grid a{font-size:12px;color:#356aba;line-height:1.5}
.ops-analysis-conclusion{margin-top:12px;padding:12px 14px;border-left:3px solid #4b78cf;border-radius:6px;background:#f1f6ff;color:#344a68;font-size:13px;font-weight:600;line-height:1.6}.ops-analysis-list__content{grid-template-columns:1fr 1.2fr 1fr}
@media(max-width:850px){.ops-analysis-list__content{grid-template-columns:1fr}}
.ops-source-stats{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px}.ops-source-stats>article{padding:18px;background:#fff;border:1px solid #e6eaf0;border-radius:12px;box-shadow:0 2px 8px #1a36500a}.ops-source-stats .ops-card__head{margin-bottom:12px}.ops-source-stats__metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.ops-source-stats__metrics>div{display:flex;flex-direction:column;gap:6px;padding:11px;border-radius:8px;background:#f7f9fc}.ops-source-stats__metrics small,.ops-source-stats__metrics span{font-size:11px;color:#778394}.ops-source-stats__metrics b{font-size:20px;color:#26364a}.ops-reason-summary button{display:flex;gap:6px;align-items:center;padding:7px 10px;border:1px solid #e8edf3;border-radius:7px;background:#fafbfd;color:#6b788b;font-size:11px;cursor:pointer}.ops-reason-summary button:hover{border-color:#9bb5e1;background:#f1f6ff}.ops-reason-summary b{color:#43536a;font-weight:600}
@media(max-width:850px){.ops-source-stats{grid-template-columns:1fr}}
@media(max-width:620px){.ops-source-stats__metrics{grid-template-columns:1fr 1fr}.ops-source-stats__metrics>div:last-child{grid-column:1/-1}}
</style>


