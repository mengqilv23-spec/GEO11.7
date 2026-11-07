<script setup lang="ts">
import { strategyReviewStatus, strategyTaskActionLabel } from '../../../workflows/review-status'
import { findingHasTask, findingRouteLabel, findingStatusLabel as resolveFindingStatusLabel, isAdviceFinding, isKnowledgeFinding, isReadOnlyFinding } from '../../../workflows/finding-treatment'
import { isDirectRepairFinding } from '../../../workflows/direct-repair'
import type { AuditCheck, AuditFinding, GeoTask, Persona, Strategy, StrategyLayer } from '../../../data/geo-data'
import type { DataListColumn } from '../../ui/ce/data-list/types'
import { storeToRefs } from 'pinia'
import { computed, h, shallowRef, watch } from 'vue'
import { auditChecks, displayObjectCodes } from '../../../data/geo-data'
import { useDiagnosisStore } from '../../../stores/diagnosis'
import Button from '../../ui/ce/button/Button.vue'
import Card from '../../ui/ce/card/Card.vue'
import DataList from '../../ui/ce/data-list/DataList.vue'
import Pagination from '../../ui/ce/pagination/Pagination.vue'
import Tag from '../../ui/ce/tag/Tag.vue'
import Tooltip from '../../ui/ce/tooltip/Tooltip.vue'
import AppIcon from '../../ui/icons/AppIcon.vue'
import GeoPageIntro from '../shared/GeoPageIntro.vue'
import DeferredGeoRadarChart from './DeferredGeoRadarChart.vue'
import ClientGapEvidence from './ClientGapEvidence.vue'
import { clientCheckResult, personaEvidence, platformGapBreakdown, strategyCoverageGapRefs } from '../../../workflows/client-diagnosis'
import type { DiagnosisPlatform } from '../../../workflows/client-diagnosis'

const props = defineProps<{
  findings: AuditFinding[]
  personas: Persona[]
  activePersona: string
  strategies: Strategy[]
  allStrategies?: Strategy[]
  tasks?: GeoTask[]
  strategyLayer: StrategyLayer
  serviceMode: 'managed' | 'agent'
  role: 'ops' | 'client'
  highlightedStrategy?: string
}>()

const emit = defineEmits<{
  selectFinding: [id: string]
  selectAllFindings: [ids: string[]]
  approveSelectedFindings: []
  selectPersona: [id: string]
  setStrategyLayer: [layer: StrategyLayer]
  openStrategy: [strategy: Strategy]
  confirmStrategy: [strategy: Strategy]
  goOptimization: []
  openFlow: []
  openAudit: [finding: AuditFinding]
  openAuditCheck: [check: AuditCheck]
  openPending: []
}>()

const layers: StrategyLayer[] = ['全部', '内容', '外部信源']
const layerLabel = (layer: StrategyLayer) => layer === '内容' ? '官网内容' : layer
const diagnosisStore = useDiagnosisStore()
const { selectedGap } = storeToRefs(diagnosisStore)
const platformFilter = shallowRef<DiagnosisPlatform>('全部平台')
const tableLabels = {
  bulkActions: '异常批量操作',
  selectedCount: (count: number) => `已选择 ${count} 项`,
  clearSelection: '清除选择',
  table: (label: string) => `${label}表格`,
  selectAll: '选择全部异常',
  loading: '正在加载',
  retry: '重试',
  selectRow: (label: string) => `选择 ${label}`,
}
const findingColumns: DataListColumn<unknown>[] = [
  { key: 'id', title: '序号', width: '9%', minWidth: 96, className: 'geo-finding-id' },
  { key: 'finding', title: '问题 / 建议', width: '23%', minWidth: 225 },
  { key: 'route', title: '处理方式与类型', width: '17%', minWidth: 180 },
  { key: 'check', title: '所属检查项', width: '16%', minWidth: 160 },
  { key: 'priority', title: '优先级', width: '7%', minWidth: 64 },
  { key: 'status', title: '处理状态', width: '20%', minWidth: 190 },
  { key: 'actions', title: '操作', width: 120, minWidth: 120, className: 'geo-finding-action-column' },
]
const strategyColumns: DataListColumn<unknown>[] = [
  { key: 'id', title: '序号（问题编码）', width: '8%', minWidth: 108, className: 'geo-strategy-id' },
  { key: 'priority', title: '优先级', width: '5%', minWidth: 70, className: 'geo-strategy-priority' },
  { key: 'type', title: '策略类型', width: '9%', minWidth: 110, className: 'geo-strategy-type' },
  { key: 'description', title: '描述', width: '25%', minWidth: 300, className: 'geo-strategy-main' },
  { key: 'factor', title: '关联关注点与差距', width: '24%', minWidth: 320, className: 'geo-strategy-factor' },
  { key: 'status', title: '当前状态', width: '12%', minWidth: 150, className: 'geo-strategy-status' },
  { key: 'actions', title: '操作', width: 120, minWidth: 120, className: 'geo-strategy-actions' },
]
const aggregatePersonaEvidence = computed(() => {
  const persona = props.personas.find(item => item.id === props.activePersona) ?? props.personas[0]
  return persona ? personaEvidence(persona) : null
})
const activePersonaData = computed(() => {
  const persona = props.personas.find(persona => persona.id === props.activePersona) ?? props.personas[0]
  if (!persona) return persona
  const evidence = personaEvidence(persona, platformFilter.value)
  const actionable = evidence.topics.filter(topic => topic.gap !== null && topic.gap > 0 && linkedStrategyCount(topic.name) > 0)
  return { ...persona, factors: persona.factors.flatMap(factor => {
    const topic = evidence.topics.find(item => item.name === factor.name && item.denominator > 0)
    return topic ? [{ ...factor, attention: topic.attention!, coverage: topic.own!, competitor: topic.rival! }] : []
  }), gaps: actionable.map(topic => ({ name: topic.name, value: topic.gap! })) }
})
const queuePage = shallowRef(1)
const auditPage = shallowRef(1)
const pageSize = 5
const auditFilter = shallowRef('all')
const treatmentFilter = shallowRef('all')
const statusFilter = shallowRef('all')
const allStrategies = computed(() => props.allStrategies ?? props.strategies)
const canReview = computed(() => props.role === (props.serviceMode === 'agent' ? 'client' : 'ops'))
function strategyGaps(strategy: Strategy) {
  if (strategy.origin === 'geo-audit') return []
  return strategyCoverageGapRefs(strategy, props.personas).flatMap((ref) => {
    const [personaId, ...nameParts] = ref.split(':')
    const name = nameParts.join(':')
    const persona = props.personas.find(item => item.id === personaId)
    const topic = persona && personaEvidence(persona).topics.find(item => item.name === name && item.gap !== null && item.gap > 0)
    return topic && persona ? [{ personaId, persona: persona.name, name, value: topic.gap! }] : []
  })
}
// Every candidate strategy stays reviewable even when its supporting evidence is
// an audit finding rather than a positive buyer-coverage gap. Otherwise strategies
// such as GS7/GS8/GS14 would exist in data but have no route into the task flow.
const reviewableStrategies = computed(() => allStrategies.value)
const layerCounts = computed(() => Object.fromEntries(layers.map(layer => [layer, layer === '全部' ? reviewableStrategies.value.length : reviewableStrategies.value.filter(strategy => strategy.layer === layer).length])))
const sortedStrategies = computed(() => {
  const filtered = reviewableStrategies.value.filter(strategy => (props.strategyLayer === '全部' || strategy.layer === props.strategyLayer) && (!selectedGap.value || strategyGaps(strategy).some(gap => gap.personaId === props.activePersona && gap.name === selectedGap.value)))
  return [...filtered].sort((a, b) => a.priority.localeCompare(b.priority))
})
const queuePages = computed(() => Math.max(1, Math.ceil(sortedStrategies.value.length / pageSize)))
const visibleStrategies = computed(() => sortedStrategies.value.slice((queuePage.value - 1) * pageSize, queuePage.value * pageSize))
const activeAuditCheck = computed(() => auditChecks.find(check => check.id === auditFilter.value))
const filteredFindings = computed(() => props.findings.filter(finding => {
  if (activeAuditCheck.value && finding.check !== activeAuditCheck.value.label) return false
  if (statusFilter.value === 'pending' && !['待处理', '待官网运营审核', '待专家审核', '已生成策略'].includes(finding.status)) return false
  if (statusFilter.value === 'approved' && !findingHasApprovedReview(finding)) return false
  if (statusFilter.value === 'no-review' && (!isDirectRepairFinding(finding) || isReadOnlyFinding(finding))) return false
  if (treatmentFilter.value === 'knowledge') return isKnowledgeFinding(finding)
  if (treatmentFilter.value === 'advice') return isAdviceFinding(finding)
  if (treatmentFilter.value === 'repair') return isDirectRepairFinding(finding)
  if (treatmentFilter.value === 'review') return !isReadOnlyFinding(finding) && !isDirectRepairFinding(finding)
  return true
}))
const auditPages = computed(() => Math.max(1, Math.ceil(filteredFindings.value.length / pageSize)))
const visibleFindings = computed(() => filteredFindings.value.slice((auditPage.value - 1) * pageSize, auditPage.value * pageSize))
function findingFromRow(item: unknown) {
  return item as AuditFinding
}
function strategyFromRow(item: unknown) {
  return item as Strategy
}
function findingActionLabel(finding: AuditFinding) {
  if (findingHasTask(finding, allStrategies.value, props.tasks ?? [], props.serviceMode === 'agent' || finding.id === 'F9')) return '查看详情'
  if (isKnowledgeFinding(finding)) return '查看补充要求'
  if (isAdviceFinding(finding)) return '查看建议'
  return canReview.value && !isDirectRepairFinding(finding) && ['待处理', '待官网运营审核', '待专家审核', '已生成策略'].includes(finding.status) ? props.serviceMode === 'agent' ? '确认处理' : '审核' : '查看详情'
}
function findingStatusLabel(finding: AuditFinding) {
  return resolveFindingStatusLabel(finding, allStrategies.value, props.tasks ?? [], props.serviceMode === 'agent')
}
function findingCheckLabel(finding: AuditFinding) {
  const index = auditChecks.findIndex(check => check.label === finding.check)
  return `${['①', '②', '③', '④', '⑤', '⑥', '⑦'][index] ?? ''} ${finding.check}`.trim()
}
function taskFor(strategy: Strategy) {
  return props.tasks?.find(task => task.strategy === strategy.id || task.relatedStrategies.includes(strategy.id))
}
function strategyCollaborationLabel(strategy: Strategy) {
  return strategyReviewStatus(strategy, props.tasks ?? [], props.serviceMode)
}
function strategyTaskLabel(strategy: Strategy) {
  const task = taskFor(strategy)
  return task ? strategyTaskActionLabel(task) : ''
}
function strategyNeedsReview(strategy: Strategy) {
  return !strategy.businessGapRecorded && !strategy.ignored && !strategy.confirmed && !taskFor(strategy)
}
function canReviewStrategy(strategy: Strategy) {
  return strategyNeedsReview(strategy) && (props.serviceMode === 'agent' ? props.role === 'client' : props.role === 'ops')
}
function resultForCheck(check: AuditCheck) { return props.serviceMode === 'agent' ? clientCheckResult(check, props.findings, props.tasks ?? []) : { state: check.passed ? '通过' : '异常', errors: check.passed ? 0 : 1, unknown: 0 } }
const abnormalFindings = computed(() => props.findings.filter(finding => !isReadOnlyFinding(finding)))
const findingsRequiringReview = computed(() => abnormalFindings.value.filter(finding => !isDirectRepairFinding(finding)))
function findingHasApprovedReview(finding: AuditFinding) {
  return finding.status === '已修复' || findingHasTask(finding, allStrategies.value, props.tasks ?? [], true)
}
const auditPendingReviewCount = computed(() => findingsRequiringReview.value.filter(finding => (
  ['待处理', '待官网运营审核', '待专家审核', '已生成策略'].includes(finding.status)
  && !findingHasApprovedReview(finding)
)).length)
const auditApprovedCount = computed(() => findingsRequiringReview.value.filter(findingHasApprovedReview).length)
const auditNoReviewCount = computed(() => abnormalFindings.value.filter(isDirectRepairFinding).length)
const showPassedOnly = computed(() => props.serviceMode === 'agent' && activeAuditCheck.value && resultForCheck(activeAuditCheck.value).state === '通过')

watch(() => props.strategyLayer, () => queuePage.value = 1)
watch(() => props.activePersona, () => {
  diagnosisStore.clearFocusedGap()
  queuePage.value = 1
})
watch(platformFilter, () => {
  diagnosisStore.clearFocusedGap()
  queuePage.value = 1
})
watch(queuePages, pages => queuePage.value = Math.min(queuePage.value, pages))
watch([treatmentFilter, statusFilter], () => auditPage.value = 1)
watch(auditPages, pages => auditPage.value = Math.min(auditPage.value, pages))
function openCheck(check: AuditCheck) {
  auditFilter.value = props.serviceMode === 'agent' && auditFilter.value === check.id ? 'all' : check.id
  auditPage.value = 1
}
function clearAuditFilter() {
  auditFilter.value = 'all'
  auditPage.value = 1
}
function focusGap(name: string) {
  diagnosisStore.focusGap(name)
  if (props.strategyLayer !== '全部') emit('setStrategyLayer', '全部')
  queuePage.value = 1
  const behavior = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
  document.getElementById('strategy-title')?.scrollIntoView({ behavior, block: 'start' })
}
function linkedStrategyCount(name: string) {
  if (!aggregatePersonaEvidence.value?.topics.some(topic => topic.name === name && topic.gap !== null && topic.gap > 0)) return 0
  return reviewableStrategies.value.filter(strategy => strategyGaps(strategy).some(gap => gap.personaId === props.activePersona && gap.name === name)).length
}
function platformGapTooltip(name: string) {
  const persona = props.personas.find(item => item.id === props.activePersona)
  if (!persona) return ''
  return h('div', { class: 'geo-platform-gap-tooltip' }, [
    h('strong', '各平台覆盖差距'),
    ...platformGapBreakdown(persona, name).map(item => h('div', { class: 'geo-platform-gap-tooltip__row' }, [
      h('span', item.platform),
      h('b', item.gap === null ? '暂无数据' : `${item.gap > 0 ? '+' : ''}${item.gap} 个百分点`),
      h('small', item.denominator ? `我方 ${item.own}% · Flow ${item.rival}% · ${item.denominator} 条` : '无有效回答'),
    ])),
  ])
}
function summaryText({ total, page, pages }: { total: number, page: number, pages: number }) {
  return `共 ${total} 条 · 第 ${page} / ${pages} 页`
}
</script>

<template>
  <div class="geo-content geo-diagnosis">
    <GeoPageIntro variant="workbench" title="诊断与策略" help-label="诊断与策略说明" description="需要处理的问题按类型进入修复或策略流程；仅提供建议的条目保留依据与参考建议，无需审核或生成任务。">
      <template #actions>
        <div class="geo-page-head__actions">
          <span class="geo-stage">当前阶段 · 确认问题与处理方向</span>
          <Button variant="text" size="sm" type="button" @click="emit('openFlow')">
            查看流程 <AppIcon name="arrowRight" :size="14" />
          </Button>
        </div>
      </template>
    </GeoPageIntro>

    <section class="geo-diagnosis-summary" aria-label="本轮监测概览">
      <header class="geo-diagnosis-summary__header">
        <div class="geo-diagnosis-summary__title">
          <span class="geo-diagnosis-summary__icon" aria-hidden="true">✦</span>
          <h2>本轮监测</h2>
          <span class="geo-diagnosis-summary__status">进行中</span>
        </div>
      </header>
      <div class="geo-diagnosis-summary__metrics">
        <div><span>监测时间 / 轮次</span><b>2026-10-02 · 第 5 轮</b></div>
        <div><span>市场 / 语言</span><b>德国 / 德语</b></div>
        <div><span>买家人设</span><b>3 类</b></div>
        <div><span>意图</span><b>4 类</b></div>
        <div><span>关键词</span><b>4 个</b></div>
        <div><span>采样总数</span><b>1138</b></div>
        <div><span>AI 平台</span><b>3 个</b></div>
        <div class="geo-diagnosis-summary__confidence">
          <span>可信度</span><b>中 · 趋势级</b>
        </div>
      </div>
    </section>

    <section class="geo-panel geo-audit-panel" aria-labelledby="audit-title">
      <header class="geo-panel__head">
        <div>
          <h2 id="audit-title">
            <span class="geo-section-heading__number" aria-hidden="true">1</span>
            <span>官网 GEO 体检</span>
            <Tooltip content="确定性技术问题由 AI 建站直接处理，完成后自动更新结果。" placement="right">
              <button type="button" class="geo-help" aria-label="官网 GEO 体检说明">?</button>
            </Tooltip>
          </h2>
        </div><div class="geo-inline-tags">
          <Tag tone="red" variant="soft" size="sm">{{ abnormalFindings.length }} 异常</Tag>
          <Tag tone="orange" variant="soft" size="sm">{{ serviceMode === 'agent' ? '待客户确认' : '待审核' }} {{ auditPendingReviewCount }}</Tag>
          <Tag tone="green" variant="soft" size="sm">已通过 {{ auditApprovedCount }}</Tag>
          <Tag tone="neutral" variant="soft" size="sm">无需审核 {{ auditNoReviewCount }}</Tag>
        </div>
      </header>
      <div class="geo-check-grid" role="tablist" aria-label="官网 GEO 检查项">
        <button v-for="(check, index) in auditChecks" :key="check.id" type="button" role="tab" class="geo-check" :class="{ 'is-alert': resultForCheck(check).state === '异常', 'is-active': auditFilter === check.id }" :aria-selected="auditFilter === check.id" @click="openCheck(check)">
          <span class="geo-check-no">{{ ['①', '②', '③', '④', '⑤', '⑥', '⑦'][index] }}</span><span class="geo-check-name">{{ check.label }}</span><strong aria-hidden="true"><AppIcon :name="resultForCheck(check).state === '通过' ? 'check' : 'warning'" :size="16" /></strong><span class="geo-check-tooltip"><b>{{ resultForCheck(check).state }} · {{ check.label }}</b><small>{{ serviceMode === 'agent' ? resultForCheck(check).state === '通过' ? `本轮${check.label}检查通过，未发现需要处理的问题。` : `已确认问题 ${resultForCheck(check).errors} 项，待核对 ${resultForCheck(check).unknown} 项。` : check.note }}</small></span>
        </button>
      </div>
      <div v-if="showPassedOnly" class="geo-check-pass-result"><Tooltip :content="`本轮${activeAuditCheck?.label}检查通过，未发现需要处理的问题。`"><span tabindex="0">通过</span></Tooltip></div>
      <template v-else>
      <div class="geo-audit-filter">
        <select v-model="treatmentFilter" class="geo-treatment-filter" aria-label="处理方式筛选">
          <option value="all">全部处理方式</option>
          <option value="repair">直接处理</option>
          <option value="review">需要审核</option>
          <option value="knowledge">待补充知识</option>
          <option value="advice">仅提供建议</option>
        </select>
        <select v-model="statusFilter" class="geo-treatment-filter" aria-label="处理状态筛选">
          <option value="all">全部状态</option>
          <option value="pending">{{ serviceMode === 'agent' ? '待客户确认' : '待审核' }}</option>
          <option value="approved">已通过</option>
          <option value="no-review">无需审核</option>
        </select>
        <Button v-if="auditFilter !== 'all'" variant="text" size="sm" @click="clearAuditFilter">
          取消筛选
        </Button>
        <span class="geo-audit-current"><b>当前查看：</b>{{ activeAuditCheck ? `${['①', '②', '③', '④', '⑤', '⑥', '⑦'][Number(activeAuditCheck.id) - 1]} ${activeAuditCheck.label}` : '全部问题与建议' }}</span>
      </div>
      <div class="geo-finding-table-frame">
        <div class="geo-diagnosis-table-scroll">
          <DataList
            class="geo-finding-table"
            :items="visibleFindings"
            :columns="findingColumns"
            :get-row-id="item => findingFromRow(item).id"
            :is-row-activatable="() => false"
            label="诊断问题与建议"
            :labels="tableLabels"
            empty-message="当前筛选下没有问题或建议"
            error-message="异常数据加载失败"
            density="compact"
          >
            <template #cell-id="{ item: finding }">
              {{ displayObjectCodes(findingFromRow(finding).id) }}
            </template>
            <template #cell-finding="{ item: finding }">
              <div class="geo-finding-copy"><Tooltip :content="findingFromRow(finding).title" :overflow-only="true"><strong>{{ findingFromRow(finding).title }}</strong></Tooltip></div>
            </template>
            <template #cell-route="{ item: finding }">
              <span class="geo-chip geo-route-badge" :class="findingFromRow(finding).route">{{ findingRouteLabel(findingFromRow(finding), serviceMode === 'agent') }}</span>
            </template>
            <template #cell-check="{ item: finding }">
              <span class="geo-chip">{{ findingCheckLabel(findingFromRow(finding)) }}</span>
            </template>
            <template #cell-priority="{ item: finding }">
              <span class="geo-chip" :class="findingFromRow(finding).priority === 'P0' ? 'geo-chip--danger' : ''">{{ findingFromRow(finding).priority }}</span>
            </template>
            <template #cell-status="{ item: finding }">
              <span class="geo-finding-status" :class="{ 'is-advice': isAdviceFinding(findingFromRow(finding)), 'is-review': ['审核', '确认处理'].includes(findingActionLabel(findingFromRow(finding))), 'is-done': ['已生成任务', '已完成处理', 'AI建站处理中'].includes(findingStatusLabel(findingFromRow(finding))), 'is-deferred': findingStatusLabel(findingFromRow(finding)) === '暂不修复' }">{{ findingStatusLabel(findingFromRow(finding)) }}</span>
            </template>
            <template #cell-actions="{ item: finding }">
              <Button class="geo-finding-detail-button geo-table-detail-button" :class="{ 'geo-review-button': ['审核', '确认处理'].includes(findingActionLabel(findingFromRow(finding))) }" variant="secondary" size="md" type="button" @click="emit('openAudit', findingFromRow(finding))">
                {{ findingActionLabel(findingFromRow(finding)) }}
              </Button>
            </template>
            <template #empty>
              <div class="geo-empty-state">
                <strong>当前筛选下没有问题或建议</strong><span>可调整检查项或处理方式筛选。</span>
              </div>
            </template>
          </DataList>
        </div>
        <footer class="geo-diagnosis-pagination">
          <Pagination v-model="auditPage" :total="filteredFindings.length" :page-size="pageSize" size="sm" label="诊断问题与建议分页" previous-label="问题上一页" next-label="问题下一页" :page-label="page => `问题第 ${page} 页`" :summary-text="summaryText" :format-value="String" />
        </footer>
      </div>
      </template>
    </section>

    <section class="geo-panel geo-persona-panel" aria-labelledby="persona-title">
      <header class="geo-panel__head">
        <div>
          <h2 id="persona-title">
            <span class="geo-section-heading__number" aria-hidden="true">2</span>
            <span>买家关注点与品牌表现</span>
            <span class="geo-persona-panel__subtitle">基于买家人设下的 AI 回答，识别关注话题、品牌覆盖差距与优化机会</span>
          </h2>
        </div>
      </header>
      <div class="geo-personas" role="tablist" aria-label="买家人设">
        <button v-for="persona in personas" :key="persona.id" type="button" role="tab" :aria-selected="activePersona === persona.id" :class="{ 'is-active': activePersona === persona.id }" @click="emit('selectPersona', persona.id)">
          <strong>{{ persona.name }}</strong><small>{{ persona.gaps.length }} Gap</small>
        </button>
      </div>
      <div v-if="activePersonaData" class="geo-persona-body">
        <Card class="geo-radar-card">
          <div class="geo-card-head">
            <strong>{{ activePersonaData.name }} · 关注点与品牌覆盖</strong><span>关注度 / 我方正向覆盖率 / 竞品正向覆盖率（同一回答分母）</span>
          </div><DeferredGeoRadarChart :factors="activePersonaData.factors" :title="activePersonaData.name" client-mode />
        </Card><ClientGapEvidence :persona="personas.find(persona => persona.id === activePersona) || personas[0]!" :linked-count="linkedStrategyCount" :platform="platformFilter" @set-platform="platformFilter = $event" @focus="focusGap" />
      </div>
    </section>

    <section class="geo-panel geo-strategy-panel" aria-labelledby="strategy-title">
      <header class="geo-panel__head geo-panel__head--stacked">
        <div>
          <h2 id="strategy-title">
            <span class="geo-section-heading__number" aria-hidden="true">3</span>
            <span>品牌表现优化策略</span>
            <Tooltip :content="serviceMode === 'agent' ? '候选策略依据人设认知 GAP、回答证据与原因核查结果提出。客户审核通过后生成任务；不处理时请填写原因。' : '候选策略依据人设认知 GAP、回答证据与原因核查结果提出。专家审核通过后生成任务；客户可查看处理结果。'" placement="right">
              <button type="button" class="geo-help" aria-label="候选策略说明">?</button>
            </Tooltip>
          </h2>
        </div>
      </header>
      <div class="geo-strategy-context" role="status">
        <span>当前人设：{{ activePersonaData?.name ?? '全部' }}</span>
        <Tag v-if="selectedGap" tone="blue" variant="soft">
          聚焦：{{ selectedGap }}
        </Tag>
        <Button v-if="selectedGap" variant="text" size="xs" @click="diagnosisStore.clearFocusedGap()">查看全部策略</Button>
      </div>
      <div class="geo-strategy-toolbar">
        <div class="geo-tabs" role="tablist" aria-label="策略类型">
          <button v-for="layer in layers" :key="layer" type="button" role="tab" :aria-selected="strategyLayer === layer" :class="{ 'is-active': strategyLayer === layer }" @click="emit('setStrategyLayer', layer)">
            <span>{{ layerLabel(layer) }}</span><small>{{ ` · ${layerCounts[layer]}` }}</small>
          </button>
        </div>
      </div>
      <div class="geo-strategy-table-scroll">
        <DataList
          class="geo-strategy-table"
          :items="visibleStrategies"
          :columns="strategyColumns"
          :get-row-id="item => strategyFromRow(item).id"
          :active-row-id="highlightedStrategy"
          :is-row-activatable="() => false"
          label="候选策略"
          :labels="tableLabels"
          :empty-message="selectedGap ? '当前主题暂无关联策略' : '当前分类暂无策略'"
          error-message="候选策略加载失败"
          density="compact"
        >
          <template #cell-id="{ item: strategy }">
            {{ strategyFromRow(strategy).id }}
          </template>
          <template #cell-priority="{ item: strategy }">
            <span class="geo-chip" :class="strategyFromRow(strategy).priority === 'P0' ? 'geo-chip--danger' : ''">{{ strategyFromRow(strategy).priority }}</span>
          </template>
          <template #cell-type="{ item: strategy }">
            <span class="geo-chip">{{ layerLabel(strategyFromRow(strategy).layer) }}</span>
          </template>
          <template #cell-description="{ item: strategy }">
            <Tooltip :content="strategyFromRow(strategy).title" :overflow-only="true">
              <strong>{{ strategyFromRow(strategy).title }}</strong>
            </Tooltip>
          </template>
          <template #cell-factor="{ item: strategy }">
            <template v-if="strategyGaps(strategyFromRow(strategy)).length">
              <template v-for="gap in strategyGaps(strategyFromRow(strategy))" :key="`${gap.personaId}:${gap.name}`">
                <Tooltip :content="platformGapTooltip(gap.name)" placement="top">
                  <Button class="geo-gap-link" variant="text" size="sm" :aria-pressed="selectedGap === gap.name && activePersona === gap.personaId" @click="emit('selectPersona', gap.personaId); focusGap(gap.name)">
                    {{ gap.persona }} · {{ gap.name }} · Gap {{ gap.value }}<AppIcon name="openExternal" :size="14" aria-hidden="true" />
                  </Button>
                </Tooltip>
              </template>
            </template>
            <span v-else>策略依据：{{ displayObjectCodes(strategyFromRow(strategy).source) }} · {{ strategyFromRow(strategy).gapFacts?.verified ? '核查已完成' : '待核查正向覆盖证据' }}</span>
          </template>
          <template #cell-status="{ item: strategy }">
            <Tag :class="{ 'geo-review-status': canReviewStrategy(strategyFromRow(strategy)) }" :tone="(strategyFromRow(strategy).ignored || strategyFromRow(strategy).businessGapRecorded) ? 'neutral' : strategyNeedsReview(strategyFromRow(strategy)) ? 'orange' : 'green'" variant="soft" size="sm">
              {{ strategyCollaborationLabel(strategyFromRow(strategy)) }}
            </Tag>
          </template>
          <template #cell-actions="{ item: strategy }">
            <Button v-if="canReviewStrategy(strategyFromRow(strategy))" class="geo-table-detail-button geo-review-button" variant="secondary" size="md" type="button" @click="emit('openStrategy', strategyFromRow(strategy))">
              {{ serviceMode === 'agent' ? '确认策略' : '审核' }}
            </Button><Button v-else-if="taskFor(strategyFromRow(strategy))" class="geo-table-detail-button" variant="secondary" size="md" type="button" @click="emit('confirmStrategy', strategyFromRow(strategy))">
              {{ strategyTaskLabel(strategyFromRow(strategy)) }}
            </Button><Button v-else class="geo-table-detail-button" variant="secondary" size="md" type="button" @click="emit('openStrategy', strategyFromRow(strategy))">
              查看详情
            </Button>
          </template>
          <template #empty>
            <div class="geo-empty-state">
              <strong>{{ selectedGap ? '当前主题暂无关联策略' : '当前分类暂无策略' }}</strong><span>{{ selectedGap ? '可以查看其他主题，或清除主题筛选。' : '切换其他策略分层查看。' }}</span>
            </div>
          </template>
        </DataList>
      </div>
      <footer class="geo-panel__foot">
        <Pagination v-model="queuePage" :total="sortedStrategies.length" :page-size="pageSize" size="sm" label="候选策略分页" previous-label="策略上一页" next-label="策略下一页" :page-label="page => `策略第 ${page} 页`" :summary-text="summaryText" :format-value="String" />
      </footer>
    </section>
  </div>
</template>

<style scoped>
</style>

<style src="../../../styles/diagnosis-ui.css"></style>

