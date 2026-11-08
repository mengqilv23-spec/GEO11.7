<script setup lang="ts">
import type { DropdownSelectOption } from '../components/ui/ce/dropdown-select/types'
import type { AuditCheck, AuditFinding, GeoPage, GeoTask, Priority, ServiceMode, Strategy, StrategyLayer, TaskFilter, UserRole } from '../data/geo-data'
import { computed, onUnmounted, provide, reactive, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from '../components/ui/ce/button/Button.vue'
import ActionCard from '../components/ui/ce/card/ActionCard.vue'
import DropdownSelect from '../components/ui/ce/dropdown-select/DropdownSelect.vue'
import Tag from '../components/ui/ce/tag/Tag.vue'
import AppIcon from '../components/ui/icons/AppIcon.vue'
import Textarea from '../components/ui/Textarea.vue'
import GeoDrawer from '../components/workbench/shared/GeoDrawer.vue'
import PrioritySelect from '../components/workbench/shared/PrioritySelect.vue'
import GeoWorkbenchToolbar from '../components/workbench/shared/GeoWorkbenchToolbar.vue'
import { geoWorkbenchRouteContextKey } from '../composables/workbench-route-context'
import { auditChecks, auditFindings, clientContentReviewFindings, supplementalBriefFindings, baselineMetrics, cloneGeoTask, displayObjectCodes, filterTasks, initialTasks, officialContentSnapshot, personas, prototypeTasks, strategies } from '../data/geo-data'
import { createRepairTask, orchestrateStrategy } from '../services/geo-orchestration'
import { useWorkbenchTasksStore } from '../stores/workbench-tasks'
import { strategyReviewStatus } from '../workflows/review-status'
import { findingHasTask, findingRouteLabel, findingStatusLabel as resolveFindingStatusLabel, findingTreatment, isAdviceFinding, isKnowledgeFinding, isReadOnlyFinding } from '../workflows/finding-treatment'
import { isDirectRepairFinding, isDirectRepairTask } from '../workflows/direct-repair'
import { advanceAutomatic, ensureWorkflow, knowledgeLibrary, taskStageLabel } from '../workflows/task-workflow'
import { normalizeClientFindings, createClientFindingTask, strategyGapEvidence, strategyCoverageGapRefs, platformGapBreakdown, clientStrategyPlan, createVerificationTask } from '../workflows/client-diagnosis'
import type { ProcessingPage } from '../workflows/data-processing'
import { updateDataProcessing, useDataProcessing } from '../workflows/data-processing'
import '../styles/geo-workbench.css'

interface ReviewNote { role: UserRole | 'agent', name: string, time: string, text: string }
type DrawerType = 'strategy' | 'audit-finding' | 'audit-check' | 'baseline' | 'pending' | 'flow' | null
type FlowType = 'diagnosis' | 'optimization'
interface Snapshot { contentReviewReset?: number, findings: AuditFinding[], strategies: Strategy[], tasks: GeoTask[], reviews: Record<string, ReviewNote[]> }
const route = useRoute()
const router = useRouter()
const isOnboardingPage = computed(() => route.name === 'onboarding')
const activePage = computed<GeoPage | 'overview' | 'visibility-monitoring' | 'report-center' | 'operations-review'>(() => route.name === 'overview' ? 'overview' : route.name === 'visibility-monitoring' ? 'visibility-monitoring' : route.name === 'report-center' ? 'report-center' : route.name === 'operations-review' ? 'operations-review' : ['optimization', 'task-detail'].includes(String(route.name)) ? 'optimization' : 'diagnosis')
const sidebarSections = [
  { heading: '', items: [{ label: '网站建设', icon: 'globe', route: 'overview' }] },
  { heading: '整合视图', items: [{ label: '增长驾驶舱', icon: 'dashboard', route: 'overview' }] },
  { heading: '增长入口', items: [{ label: '网站智能体', icon: 'dashboard', route: 'overview', children: [
    { label: '网站概览', route: 'overview' },
    { label: '网站审查', route: 'diagnosis' },
    { label: '内容专家', route: 'optimization' },
    { label: '智能落地页', route: 'optimization' },
    { label: '留资线索', route: 'overview' },
    { label: '数据分析', route: 'report-center' },
    { label: '运维与设置', route: 'visibility-monitoring' },
  ] }] },
  { heading: '企业数字资产', items: [{ label: '企业知识库', icon: 'report', route: 'onboarding' }] },
  { heading: '营销智能体', items: [
    { label: 'SEO 智能体', icon: 'search', route: 'diagnosis', tier: '基础版' },
    { label: 'GEO 智能体', icon: 'globe', route: 'overview', tier: '基础版', selected: true },
    { label: 'SDR 智能体', icon: 'circle', route: 'overview', tier: '基础版' },
  ] },
  { heading: '客户经营', items: [{ label: 'AI CRM', icon: 'circle', route: 'report-center', tier: '专业版' }] },
  { heading: '账号', items: [{ label: '账号与权益', icon: 'dashboard', route: 'onboarding' }] },
] as const
const inReviewModules = computed(() => ['diagnosis', 'optimization', 'task-detail'].includes(String(route.name)))
function initialProductMode(): ServiceMode {
  if (route.query.version === 'client') return 'agent'
  if (route.query.version === 'managed') return 'managed'
  try { return localStorage.getItem('geo-review-product') === 'agent' ? 'agent' : 'managed' }
  catch { return 'managed' }
}
const productMode = shallowRef<ServiceMode>(initialProductMode())
watch(productMode, value => {
  try { localStorage.setItem('geo-review-product', value) } catch { /* The selection still works in this session. */ }
}, { immediate: true })
watch(() => [inReviewModules.value, route.query.version] as const, ([active, version]) => {
  if (active && (version === 'client' || version === 'managed'))
    productMode.value = version === 'client' ? 'agent' : 'managed'
}, { immediate: true })
const managedRole = shallowRef<UserRole>('ops')
const serviceMode = computed<ServiceMode>(() => inReviewModules.value ? productMode.value : 'managed')
const role = computed<UserRole>({
  get: () => serviceMode.value === 'agent' ? 'client' : managedRole.value,
  set: value => { if (serviceMode.value === 'managed') managedRole.value = value },
})
const canReview = computed(() => role.value === (serviceMode.value === 'agent' ? 'client' : 'ops'))
const activePersona = shallowRef('engineering')
const strategyLayer = shallowRef<StrategyLayer>('全部')
const taskFilter = shallowRef<TaskFilter>('all')
const highlightedStrategy = shallowRef<string>()
const reviewText = ref('')
const reviewCategory = ref('')
const deferMode = ref(false)
const strategyIgnoreMode = ref(false)
const deferReason = ref('')
const reviewCategoryOptions: DropdownSelectOption[] = [
  { value: '优先级判断错误', label: '优先级判断错误' },
  { value: '标题生成不准确', label: '标题生成不准确' },
]
const deferReasonOptions: DropdownSelectOption[] = [
  { value: 'Agent 判断错误 / 策略不适用', label: 'Agent 判断错误 / 策略不适用' },
  { value: '事实 / 证据不足', label: '事实 / 证据不足' },
  { value: '重复策略 / 已有其他方案', label: '重复策略 / 已有其他方案' },
  { value: '时机不合适', label: '时机不合适' },
  { value: '执行成本过高', label: '执行成本过高' },
  { value: '不符合当前业务目标', label: '不符合当前业务目标' },
  { value: '其他', label: '其他' },
]
const drawer = reactive<{ type: DrawerType, item: Strategy | AuditFinding | AuditCheck | 'scope' | 'rounds' | 'diagnosis' | 'optimization' | null }>({ type: null, item: null })
const selectedStrategyGapEvidence = computed(() => drawer.type === 'strategy' && drawer.item ? strategyGapEvidence(drawer.item as Strategy, personas) : null)
const selectedStrategyPlatformGaps = computed(() => {
  const selected = selectedStrategyGapEvidence.value
  const persona = personas.find(item => item.name === selected?.persona)
  return selected && persona ? platformGapBreakdown(persona, selected.topic.name) : []
})
const toast = shallowRef('')
const toastTask = shallowRef<GeoTask | null>(null)
const dataProcessing = useDataProcessing()
const processingPage = computed<ProcessingPage | null>(() => ['visibility-monitoring', 'diagnosis', 'optimization'].includes(activePage.value) ? activePage.value as ProcessingPage : null)
const processingReady = computed(() => !processingPage.value || dataProcessing.isReady(processingPage.value).value)
const processingNotice = shallowRef<ProcessingPage | null>(null)
const processingTimer = setInterval(() => {
  const completed = updateDataProcessing()
  if (completed.length) processingNotice.value = completed.at(-1) ?? null
}, 500)
onUnmounted(() => clearInterval(processingTimer))
function openProcessedPage(page: ProcessingPage) {
  processingNotice.value = null
  void router.push({ name: page, query: page === 'visibility-monitoring' ? {} : { version: productMode.value === 'agent' ? 'client' : 'managed' } })
}
function uniqueById<T extends { id: string }>(items: readonly T[]) {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}
const findings = reactive<AuditFinding[]>(uniqueById(auditFindings).map(finding => ({ ...finding })))
const strategyState = reactive<Strategy[]>(strategies.map(strategy => ({ ...strategy, methods: [...strategy.methods] })))
const taskStore = useWorkbenchTasksStore()
const tasks = taskStore.tasks
const reviewNotes = reactive<Record<string, ReviewNote[]>>({
  GS1: [{ role: 'agent', name: 'Agent', time: '刚刚', text: '已依据监测、诊断、人设与 GEO 规则生成候选策略。' }],
})
const visibleTasks = computed(() => filterTasks(tasks, taskFilter.value))
const pendingItems = computed(() => [
  ...findings.filter(finding => canApproveFinding(finding)).map(finding => ({ kind: 'audit' as const, id: finding.id, title: finding.title, status: findingStatusLabel(finding), priority: finding.priority, source: finding.check, summary: finding.detail, finding })),
  ...strategyState.filter(strategy => canReviewStrategy(strategy)).map(strategy => ({ kind: 'strategy' as const, id: strategy.id, title: strategy.title, status: strategyStatusLabel(strategy), priority: strategy.priority, source: strategy.origin === 'buyer-coverage' ? '买家关注点与品牌表现' : `官网 GEO 体检 · ${strategy.source}`, summary: strategy.evidence, strategy })),
  ...tasks.filter(task => ['brief', 'human', 'client_review', 'publish', 'site_submit', 'site_failed', 'site_publish'].includes(task.progress)).map(task => ({ kind: 'task' as const, id: task.id, title: task.name, status: task.progress === 'brief' ? 'Brief 待确认' : task.progress === 'human' ? '待结果审核' : task.progress === 'site_submit' ? '待提交 AI 建站' : task.progress === 'site_failed' ? '验证未通过' : task.progress === 'site_publish' || task.progress === 'publish' ? '待发布确认' : '待客户审核', priority: 'P1', source: task.origin === 'buyer-coverage' ? '买家关注点与品牌表现' : task.origin === 'geo-audit' ? `官网 GEO 体检 · ${task.source}` : task.source, summary: '进入任务处理当前阶段。', task })),
])
const managedFlowSteps: Record<FlowType, Array<{ title: string, description: string }>> = {
  diagnosis: [
    { title: '监测形成诊断', description: 'Agent 根据监测、官网体检与买家 Gap 形成 Finding。' },
    { title: '判断处理出口', description: '确定性问题直接生成修复 Task；策略型问题生成候选策略；仅提供建议项无需审核或执行。' },
    { title: '完成专家审核', description: '专家审核诊断问题与候选策略，并确认处理方式。' },
    { title: '进入优化中心', description: '专家审核通过后，Agent 去重并创建或关联 Task 草稿。' },
    { title: '执行与效果回流', description: '任务发布后 Re-check，结果回写诊断与 Agent 学习。' },
  ],
  optimization: [
    { title: 'Brief确认', description: '确认目标、范围与关键业务事实。' },
    { title: '内容生成', description: 'Agent生成文章并运行自动质检。' },
    { title: '文章审核', description: '客户或专家审核文章内容。' },
    { title: '最终稿确认', description: '确认官网内容版本。' },
    { title: '官网核验', description: '官网返回处理结果。' },
    { title: '完成', description: '流程完成。' },
  ],
}
const flowSteps = computed(() => serviceMode.value === 'managed' ? managedFlowSteps : {
  diagnosis: [
    { title: '查看诊断证据', description: '客户选择问题并确认处理、忽略或暂缓。' },
    { title: '审核候选策略', description: '客户采纳策略，系统自动编排任务；忽略须填写原因。' },
    { title: '进入优化中心', description: 'AI 生成 Brief，客户补充资料并确认执行。' },
  ],
  optimization: [
    { title: 'Brief 确认', description: '客户补充知识资料和说明，确认执行。' },
    { title: '内容生成与质检', description: 'AI 生成正文并提供自动质检结果。' },
    { title: '客户审核改写', description: '客户修改并确认内容；需要时要求 AI 优化。' },
    { title: '执行或交付', description: '官网内容自动提交执行；外部内容确认后完成交付。' },
  ],
})
let toastTimer: ReturnType<typeof setTimeout> | undefined
function notify(message: string, task?: GeoTask) {
  toastTask.value = task ?? null
  toast.value = message
  if (toastTimer)
    clearTimeout(toastTimer)
  toastTimer = setTimeout(() => toast.value = '', task ? 8000 : 2600)
}
function changeProductMode(mode: ServiceMode) {
  productMode.value = mode
  void router.replace({ query: { ...route.query, version: mode === 'agent' ? 'client' : 'managed' } })
}
async function navigate(page: GeoPage) {
  await router.push({ name: page })
}
function snapshot(): Snapshot {
  return JSON.parse(JSON.stringify({ contentReviewReset: 1, findings, strategies: strategyState, tasks, reviews: reviewNotes })) as Snapshot
}
let loadedMode: ServiceMode = 'managed'
function resetSnapshot() {
  findings.splice(0, findings.length, ...uniqueById([...auditFindings, ...supplementalBriefFindings]).map(finding => ({ ...finding })))
  strategyState.splice(0, strategyState.length, ...strategies.map(strategy => ({ ...strategy, methods: [...strategy.methods] })))
  for (const strategy of strategyState) strategy.coverageGapRefs = strategyCoverageGapRefs(strategy, personas)
  tasks.splice(0, tasks.length, ...[...prototypeTasks, ...initialTasks].map(cloneGeoTask))
  for (const task of tasks) {
    const linkedStrategies = strategyState.filter(strategy => strategy.id === task.strategy || task.relatedStrategies.includes(strategy.id))
    task.coverageGapRefs = [...new Set(linkedStrategies.flatMap(strategy => strategy.coverageGapRefs ?? []))]
  }
  seedPrototypeTaskKnowledge()
  Object.keys(reviewNotes).forEach(key => delete reviewNotes[key])
  reviewNotes.GS1 = [{ role: 'agent', name: 'Agent', time: '刚刚', text: '已依据监测、诊断、人设与 GEO 规则生成候选策略。' }]
  findings.filter(finding => ['F7-1', 'F7-2'].includes(finding.id)).forEach(finding => finding.status = '待处理')
  strategyState.find(strategy => strategy.id === 'GS10')!.confirmed = true
}
function seedPrototypeTaskKnowledge() {
  const matchedKnowledge: Record<string, string[]> = {
    'T-2502': ['KB-003'],
    'T-2503': ['KB-003'],
    'T-2504': ['KB-002', 'KB-003'],
    'T-2505': ['KB-002', 'KB-003'],
  }
  for (const [taskId, knowledgeIds] of Object.entries(matchedKnowledge)) {
    const task = tasks.find(item => item.id === taskId)
    if (!task)
      continue
    const workflow = ensureWorkflow(task)
    const existingIds = workflow.knowledge.map(item => item.id).sort().join(',')
    if (taskId === 'T-2502' && existingIds === 'KB-002,KB-003')
      workflow.knowledge = knowledgeIds.map(id => knowledgeLibrary.find(item => item.id === id)!).filter(Boolean).map(item => ({ ...item }))
    if (!workflow.knowledge.length)
      workflow.knowledge = knowledgeIds.map(id => knowledgeLibrary.find(item => item.id === id)!).filter(Boolean).map(item => ({ ...item }))
  }
}
function persist(mode: ServiceMode = loadedMode) {
  try {
    localStorage.setItem(`geo-workbench:${mode}`, JSON.stringify(snapshot()))
  }
  catch {
    notify('本地保存不可用，当前操作仅保留在本次会话')
  }
}
function resetClientContentReview() {
  for (const example of clientContentReviewFindings) {
    if (!findings.some(item => item.id === example.id)) findings.push({ ...example, treatment: 'website-content-review' })
  }
  findings.splice(0, findings.length, ...normalizeClientFindings(findings))
  for (const finding of findings) {
    if (!isReadOnlyFinding(finding) && !isDirectRepairFinding(finding)) {
      finding.status = '待处理'; finding.checked = false; delete finding.feedback; delete finding.decisionReason
    }
  }
  for (const strategy of strategyState) { strategy.confirmed = false; strategy.ignored = false; delete strategy.reviewNote }
  tasks.splice(0, tasks.length, ...tasks.filter(task => isDirectRepairTask(task) && !(task.id === 'T-2501' && task.strategy === 'GS14')))
  Object.keys(reviewNotes).forEach(key => delete reviewNotes[key])
}
function restore(mode: ServiceMode) {
  loadedMode = mode
  try {
    const raw = localStorage.getItem(`geo-workbench:${mode}`)
    if (!raw) {
      resetSnapshot()
      if (mode === 'agent') { resetClientContentReview(); persist(mode) }
      return false
    }
    const data = JSON.parse(raw) as Partial<Snapshot>
    if (!Array.isArray(data.findings) || !Array.isArray(data.strategies) || !Array.isArray(data.tasks)) {
      resetSnapshot()
      if (mode === 'agent') { resetClientContentReview(); persist(mode) }
      return false
    }
    const restoredFindings = uniqueById(data.findings.filter(finding => !(finding.route === 'advice' && (finding.id === 'F9-1' || (finding.category as string) === '第三方信源'))))
    for (const example of auditFindings.filter(isReadOnlyFinding)) {
      if (!restoredFindings.some(finding => finding.id === example.id)) restoredFindings.push({ ...example })
    }
    for (const example of supplementalBriefFindings) {
      if (!restoredFindings.some(finding => finding.id === example.id)) restoredFindings.push({ ...example })
    }
    const canonicalFindings = uniqueById([...auditFindings, ...supplementalBriefFindings, ...clientContentReviewFindings])
    for (const finding of restoredFindings) {
      const canonical = canonicalFindings.find(item => item.id === finding.id)
      if (!canonical) continue
      finding.treatment = canonical.treatment
      if (finding.id === 'F9') Object.assign(finding, { route: canonical.route, category: canonical.category, method: canonical.method, routeReason: canonical.routeReason })
    }
    for (const finding of restoredFindings.filter(isAdviceFinding)) {
      finding.status = '无需处理'
      finding.checked = false
    }
    for (const finding of restoredFindings.filter(isKnowledgeFinding)) { finding.status = '待补充知识'; finding.checked = false }
    if (mode === 'managed') {
      for (const finding of restoredFindings.filter(finding => finding.status === '待客户审核')) {
        finding.status = '待处理'
        finding.checked = false
      }
    }
    findings.splice(0, findings.length, ...restoredFindings)
    if (mode === 'agent') {
      for (const example of clientContentReviewFindings) {
        if (!findings.some(item => item.id === example.id)) findings.push({ ...example })
      }
    }
    const restoredStrategies = data.strategies
      .filter(item => ['内容', '实体与信任', '外部信源'].includes(String(item.layer)) || item.id === 'GS5')
      .map(item => ({ ...item, layer: (String(item.layer) === '实体与信任' ? '内容' : item.layer) as Strategy['layer'], reviewStage: mode === 'managed' ? undefined : item.reviewStage }))
    for (const item of restoredStrategies) {
      if (!['GS5', 'GS1'].includes(item.id)) continue
      const current = strategies.find(strategy => strategy.id === item.id)!
      Object.assign(item, { title: current.title, description: current.description, layer: current.layer, methods: [...current.methods] })
    }
    strategyState.splice(0, strategyState.length, ...restoredStrategies)
    for (const strategy of strategyState) {
      strategy.origin = strategy.id === 'GS14' ? 'geo-audit' : 'buyer-coverage'
      if (strategy.id === 'GS14') strategy.source = 'F8-2'
      strategy.coverageGapRefs = strategyCoverageGapRefs(strategy, personas)
    }
    const restoredTasks = [
      ...prototypeTasks.filter(prototypeTask => mode !== 'agent' && !data.tasks!.some(task => task.id === prototypeTask.id)).map(cloneGeoTask),
      ...data.tasks.filter(task => task.source !== '演示任务').map(cloneGeoTask),
    ]
    for (const task of restoredTasks) {
      const prototypeTask = prototypeTasks.find(item => item.id === task.id)
      if (prototypeTask?.evidence && !task.evidence)
        task.evidence = prototypeTask.evidence
      if (task.workflow)
        ensureWorkflow(task)
    }
    const prototypeTask = initialTasks.find(task => task.id === 'T-2401')!
    const oldTaskIndex = restoredTasks.findIndex(task => task.id === prototypeTask.id && task.type === 'repair')
    if (mode !== 'agent' && oldTaskIndex >= 0) {
      const previousTask = restoredTasks.splice(oldTaskIndex, 1)[0]
      const nextTaskNumber = Math.max(2402, ...restoredTasks.map(task => Number(task.id.replace(/\D/g, '')) || 0)) + 1
      previousTask.id = `T-${nextTaskNumber}`
      restoredTasks.unshift(cloneGeoTask(prototypeTask))
      restoredTasks.push(previousTask)
    }
    else if (mode !== 'agent' && !restoredTasks.some(task => task.id === prototypeTask.id)) {
      restoredTasks.unshift(cloneGeoTask(prototypeTask))
    }
    const preservedRepair = restoredTasks.find(task => task.id !== 'T-2403' && task.type === 'repair' && task.name === '核心产品页结构化数据修复')
    if (preservedRepair && !restoredTasks.some(task => task.id === 'T-2403'))
      preservedRepair.id = 'T-2403'
    tasks.splice(0, tasks.length, ...restoredTasks)
    const officialFindingIds = new Set(canonicalFindings.map(finding => finding.id))
    for (const task of tasks) {
      if (task.id === 'T-2501' && task.strategy === 'GS14' && task.type === 'repair') {
        task.type = 'web'; task.source = 'F8-2'; task.origin = 'geo-audit'; task.destination = '官网内容'; task.factor = '品牌实体'; task.methods = ['核验专家身份', '补充作者档案', '关联对应文章']; task.name = '工程师专家档案实体统一与同名消歧'; task.progress = 'brief'; delete task.workflow
      }
      else if (task.sourceKind === 'geo-audit-content' || task.type === 'repair' || task.source.split(/[\s/·]+/).some(id => officialFindingIds.has(id))) task.origin = 'geo-audit'
      else if (task.strategy || task.relatedStrategies.length) task.origin = 'buyer-coverage'
      else task.origin ??= 'standalone'
      const linkedStrategies = strategyState.filter(strategy => strategy.id === task.strategy || task.relatedStrategies.includes(strategy.id))
      if (task.origin === 'buyer-coverage') task.coverageGapRefs = [...new Set(linkedStrategies.flatMap(strategy => strategy.coverageGapRefs ?? []))]
      if (task.source === 'F9' && task.type === 'repair') {
        task.type = 'web'; task.origin = 'geo-audit'; task.destination = '官网内容'; task.name = '官网地址内容核对'; task.progress = 'brief'; delete task.workflow
      }
    }
    for (const task of tasks.filter(item => item.strategy === 'GS5')) {
      const strategy = strategies.find(item => item.id === 'GS5')!
      task.name = strategy.title
      task.methods = [...strategy.methods]
      task.destination = '官网内容'
      if (task.workflow?.brief.goal.includes('产品页结构优化')) task.workflow.brief.goal = strategy.title
    }
    seedPrototypeTaskKnowledge()
    Object.keys(reviewNotes).forEach(key => delete reviewNotes[key])
    Object.assign(reviewNotes, data.reviews ?? {})
    if (mode === 'agent' && data.contentReviewReset !== 1) { resetClientContentReview(); persist(mode) }
    if (mode === 'agent') {
      const legacyExpertTask = tasks.findIndex(task => task.id === 'T-2501' && task.strategy === 'GS14' && task.type === 'repair')
      if (legacyExpertTask >= 0) tasks.splice(legacyExpertTask, 1)
      for (const task of tasks.filter(task => task.source === 'F9' && task.type === 'repair')) { task.type = 'web'; task.destination = '官网内容'; task.name = '官网地址内容核对'; task.progress = 'brief'; delete task.workflow }
      findings.splice(0, findings.length, ...normalizeClientFindings(findings))
      strategyState.splice(0, strategyState.length, ...strategyState.filter(strategy => !clientContentReviewFindings.some(finding => strategy.source.split(' / ').includes(finding.id))))
    }
    // Rebuild audit tasks from their exact source, including saved tasks that
    // were previously routed through a generated candidate strategy.
    const migratedAuditSources = new Set<string>()
    for (const task of tasks) {
      const snapshot = task.type === 'web'
        ? [...findings, ...auditFindings, ...clientContentReviewFindings]
            .filter(item => item.id === task.source)
            .map(officialContentSnapshot)
            .find(Boolean)
        : undefined
      if (snapshot) {
        task.sourceKind = 'geo-audit-content'
        task.auditContent = snapshot
        if (task.strategy || task.relatedStrategies.length) {
          migratedAuditSources.add(task.source)
          task.strategy = ''
          task.relatedStrategies = []
          if (task.workflow) {
            task.workflow.brief.source = task.source
            task.workflow.versions?.forEach(version => version.brief.source = task.source)
          }
        }
      }
      else {
        delete task.sourceKind
        delete task.auditContent
      }
    }
    if (migratedAuditSources.size)
      strategyState.splice(0, strategyState.length, ...strategyState.filter(strategy => !migratedAuditSources.has(strategy.source)))
    return true
  }
  catch {
    notify('保存记录无法读取，已恢复初始工作台数据')
    return false
  }
}
// Seed data reflects the final prototype's repair and strategy workflow.
resetSnapshot()
restore(serviceMode.value)
function syncDirectRepairs() {
  for (const finding of findings) {
    if (findingHasTask(finding, strategyState, tasks, serviceMode.value === 'agent') && ['待处理', '已生成策略'].includes(finding.status)) { finding.status = '已生成策略'; finding.checked = false }
  }
  for (const finding of findings.filter(isDirectRepairFinding)) {
    const wasDone = finding.status === '已修复'
    const task = createRepairTask(tasks, finding)
    if (wasDone || ['site_returned', 'site_publish', 'recheck'].includes(task.progress))
      task.progress = 'done'
    else if (!['site_submitted', 'site_running', 'done'].includes(task.progress))
      task.progress = 'site_submitted'
    const flow = ensureWorkflow(task)
    flow.ignoredTask = undefined
    flow.ignoredBrief = undefined
    finding.checked = false
    finding.status = task.progress === 'done' ? '已修复' : '待处理'
  }
}
syncDirectRepairs()
const repairTimer = setInterval(() => {
  for (const task of tasks.filter(isDirectRepairTask))
    advanceAutomatic(task, serviceMode.value)
  syncDirectRepairs()
}, 1600)
onUnmounted(() => clearInterval(repairTimer))
watch([findings, strategyState, tasks, reviewNotes], () => persist(), { deep: true })
watch(serviceMode, (mode) => {
  persist(loadedMode)
  drawer.type = null
  if (mode === 'agent')
    role.value = 'client'
  restore(mode)
  syncDirectRepairs()
  notify(mode === 'managed' ? '已切换到 AI + 专家 + 客户版' : '已切换到 AI + 客户版')
})
function toggleFinding(id: string) {
  if (!canReview.value) {
    notify('当前为客户角色，诊断问题由专家审核')
    return
  }
  const finding = findings.find(item => item.id === id)
  if (finding && canApproveFinding(finding))
    finding.checked = !finding.checked
}
function selectAllFindings(ids: string[]) {
  if (!canReview.value) {
    notify('当前为客户角色，诊断问题由专家审核')
    return
  }
  const selected = findings.filter(finding => ids.includes(finding.id) && canApproveFinding(finding))
  const checked = !selected.every(finding => finding.checked)
  selected.forEach(finding => finding.checked = checked)
}
function approveSelectedFindings() {
  if (!canReview.value) {
    notify('当前为客户角色，诊断问题由专家审核')
    return
  }
  const selected = findings.filter(finding => finding.checked && canApproveFinding(finding))
  if (!selected.length) {
    notify('请选择至少一条可审核的问题')
    return
  }
  selected.forEach(finding => processFinding(finding, false))
  notify(`专家已审核 ${selected.length} 项，处理结果已更新`)
}
function confirmStrategy(strategy: Strategy) {
  const linked = tasks.find(task => task.strategy === strategy.id || task.relatedStrategies.includes(strategy.id))
  if (linked) {
    openTask(linked)
    return
  }
  if (serviceMode.value === 'agent' && strategy.businessGapRecorded) { openStrategy(strategy); return }
  if (strategy.ignored) {
    notify('该策略已忽略，可在详情中查看审核记录')
    return
  }
  if (serviceMode.value === 'managed' && role.value !== 'ops') {
    notify('候选策略由专家审核')
    return
  }
  if (serviceMode.value === 'agent' && !canReview.value) {
    notify('候选策略由专家完成专业审核，客户在 Brief 阶段确认业务信息')
    return
  }
  if (serviceMode.value === 'agent') {
    const plan = clientStrategyPlan(strategy)
    if (plan.kind === 'business-gap') {
      strategy.businessGapRecorded = true
      strategy.reviewNote = '已核实不存在对应能力，记录业务能力缺口，不生成宣传内容。'
      notify('已记录业务能力缺口，不生成内容任务。')
      drawer.type = null
      return
    }
    if (plan.kind === 'technical') {
      const finding = findings.find(item => isDirectRepairFinding(item) && item.detail.includes(strategy.factor)) ?? { id: `GAP-TECH-${strategy.id}`, title: `读取修复：${strategy.title}`, detail: strategy.evidence, check: '抓取渲染', method: '抓取与读取障碍修复', priority: strategy.priority, status: '待处理' as const, checked: false, route: 'repair' as const, routeReason: '认知 GAP 原因核查确认：已有内容完整，但存在读取障碍。' }
      if (!findings.some(item => item.id === finding.id)) findings.push(finding)
      const task = createRepairTask(tasks, finding)
      if (!task.relatedStrategies.includes(strategy.id)) task.relatedStrategies.push(strategy.id)
      strategy.confirmed = true
      notify('已关联技术直接处理流程，可在官网体检中查看执行结果。')
      drawer.type = null
      return
    }
  }
  if (strategy.origin === 'buyer-coverage') strategy.coverageGapRefs = strategyCoverageGapRefs(strategy, personas)
  const task = serviceMode.value === 'agent' && needsAgentVerification(strategy) ? createVerificationTask(tasks, strategy) : orchestrateStrategy(tasks, strategy)
  if (serviceMode.value === 'managed') strategy.reviewStage = undefined
  reviewNotes[strategy.id] ??= []
  reviewNotes[strategy.id].push({ role: role.value, name: role.value === 'ops' ? '专家' : '客户', time: '刚刚', text: `${role.value === 'ops' ? '专家' : '客户'}审核通过，Agent 已自动编排关联 Task 草稿。` })
  reviewNotes[task.id] ??= []
  notify(serviceMode.value === 'agent' ? '问题已确认，已生成任务。下一步请确认任务 Brief。' : `${displayObjectCodes(strategy.id)} 已审核，任务已进入优化中心，等待专家确认 Brief。`, task)
}
function openStrategy(strategy: Strategy) {
  reviewText.value = ''
  reviewCategory.value = ''
  strategyIgnoreMode.value = false
  drawer.type = 'strategy'
  drawer.item = strategy
}
function startIgnoreStrategy() {
  reviewText.value = ''
  reviewCategory.value = ''
  strategyIgnoreMode.value = true
}
function ignoreStrategy(strategy: Strategy) {
  if (!canReviewStrategy(strategy)) return
  const requiresDetails = serviceMode.value === 'managed'
  if (requiresDetails && !reviewCategory.value) {
    notify('请选择忽略原因')
    return
  }
  if (requiresDetails && !reviewText.value.trim()) {
    notify('请填写忽略原因')
    return
  }
  const detail = [reviewCategory.value.trim(), reviewText.value.trim()].filter(Boolean).join('：')
  strategy.ignored = true
  if (detail) strategy.reviewNote = detail
  else delete strategy.reviewNote
  reviewNotes[strategy.id] ??= []
  reviewNotes[strategy.id].push({ role: role.value, name: role.value === 'ops' ? '专家' : '客户', time: '刚刚', text: detail ? `忽略候选策略 · ${detail}` : '已记录不处理候选策略' })
  notify(detail ? '已记录忽略原因，来源诊断仍保留' : '已记录不处理，来源诊断仍保留')
  strategyIgnoreMode.value = false
  reviewCategory.value = ''
  reviewText.value = ''
  drawer.type = null
}
function openTask(task: GeoTask) {
  drawer.type = null
  ensureWorkflow(task)
  void router.push({ name: 'task-detail', params: { taskId: task.id } })
}
function openPendingItem(item: (typeof pendingItems.value)[number]) {
  if (item.kind === 'task') {
    openTask(item.task)
    return
  }
  if (item.kind === 'audit') {
    openAudit(item.finding)
    return
  }
  openStrategy(item.strategy)
}
function openAudit(finding: AuditFinding) {
  drawer.type = 'audit-finding'
  drawer.item = findings.find(item => item.id === finding.id) ?? finding
}
function taskForFinding(finding: AuditFinding) {
  if (isReadOnlyFinding(finding)) return undefined
  if (findingTreatment(finding) === 'website-content-review' && finding.category === '官网内容' && finding.id.startsWith('F'))
    return tasks.find(task => task.origin === 'geo-audit' && task.type === 'web' && task.source.split(/[\s/·]+/).includes(finding.id))
  if (finding.category === '官网内容' && finding.route === 'strategy')
    return tasks.find(task => task.sourceKind === 'geo-audit-content' && task.source === finding.id)
  const directTask = tasks.find(task => task.source.split(/[\s/·]+/).includes(finding.id))
  if (directTask)
    return directTask
  const strategy = strategyForFinding(finding)
  return strategy ? tasks.find(task => task.strategy === strategy.id || task.relatedStrategies.includes(strategy.id)) : undefined
}
function strategyForFinding(finding: AuditFinding) {
  if (isReadOnlyFinding(finding)) return undefined
  if (findingTreatment(finding) === 'website-content-review' && finding.category === '官网内容' && finding.id.startsWith('F')) return undefined
  const mappedId = /专家|作者/.test(finding.title) ? 'GS14' : undefined
  return strategyState.find(strategy => strategy.source.split(' / ').includes(finding.id) || (mappedId && strategy.id === mappedId))
}
function canApproveFinding(finding: AuditFinding) {
  if (findingHasTask(finding, strategyState, tasks, serviceMode.value === 'agent' || finding.id === 'F9')) return false
  if (isReadOnlyFinding(finding) || isDirectRepairFinding(finding))
    return false
  if (serviceMode.value === 'managed')
    return role.value === 'ops' && ['待处理', '待官网运营审核', '待专家审核', '已生成策略'].includes(finding.status)
  if (!canReview.value) return false
  if (['待处理', '待官网运营审核', '待专家审核', '已生成策略'].includes(finding.status))
    return true
  const strategy = finding.route === 'strategy' ? strategyForFinding(finding) : undefined
  return Boolean(strategy && !strategy.confirmed && !strategy.ignored && finding.status !== '暂不修复' && finding.status !== '已修复')
}
function canIgnoreFinding(finding: AuditFinding) {
  if (serviceMode.value === 'agent' || serviceMode.value === 'managed') return false
  if (findingHasTask(finding, strategyState, tasks)) return false
  if (isReadOnlyFinding(finding) || !canReview.value)
    return false
  const strategy = finding.route === 'strategy' ? strategyForFinding(finding) : undefined
  return Boolean(strategy && !strategy.confirmed && !strategy.ignored)
}
function ignoreFinding(finding: AuditFinding) {
  if (serviceMode.value === 'agent') { startDeferFinding(); return }
  const strategy = strategyForFinding(finding)
  if (!strategy || !canIgnoreFinding(finding))
    return
  openStrategy(strategy)
  startIgnoreStrategy()
}
function openFindingDestination(finding: AuditFinding) {
  const task = taskForFinding(finding)
  if (task) {
    openTask(task)
    return
  }
  const strategy = strategyForFinding(finding)
  if (strategy)
    openStrategy(strategy)
}
function openAuditCheck(check: AuditCheck) {
  drawer.type = 'audit-check'
  drawer.item = check
}
function relatedStrategies(check: AuditCheck) {
  const ids = new Set(check.strategyIds ?? [])
  return strategyState.filter(strategy => ids.has(strategy.id) || strategy.source.includes(check.source))
}
function changeReviewPriority(value: Priority) {
  if (!['P0', 'P1', 'P2', 'P3'].includes(value)) return
  const selected = drawer.item as AuditFinding | Strategy
  const item = drawer.type === 'strategy'
    ? strategyState.find(strategy => strategy.id === selected.id)
    : drawer.type === 'audit-finding' ? findings.find(finding => finding.id === selected.id) : undefined
  if (!item || (drawer.type === 'strategy' ? !canReviewStrategy(item as Strategy) : !canApproveFinding(item as AuditFinding))) return
  const previous = item.priority
  if (previous === value) return
  item.priority = value
  selected.priority = value
  reviewNotes[item.id] ??= []
  reviewNotes[item.id].push({ role: role.value, name: role.value === 'ops' ? '专家' : '客户', time: '刚刚', text: `调整优先级：${previous} → ${value}` })
}
function processFinding(finding: AuditFinding, showNotification = true) {
  finding = findings.find(item => item.id === finding.id) ?? finding
  if (isReadOnlyFinding(finding) || !canApproveFinding(finding)) return
  if (serviceMode.value === 'managed') {
    reviewNotes[finding.id] ??= []
    reviewNotes[finding.id].push({ role: 'ops', name: '专家', time: '刚刚', text: '专家审核通过，已进入处理流程。' })
  }
  if (finding.route === 'strategy') {
    if (!canApproveFinding(finding))
      return
    if (serviceMode.value === 'agent') {
      const task = createClientFindingTask(tasks, finding)
      finding.status = '已生成策略'; finding.checked = false
      if (showNotification) notify('问题已确认，已生成任务。下一步请确认任务 Brief。', task)
      drawer.type = null
      return
    }
    const task = createClientFindingTask(tasks, finding)
    finding.status = '已生成策略'
    finding.checked = false
    reviewNotes[task.id] ??= []
    reviewNotes[task.id].push({ role: 'ops', name: '专家', time: '刚刚', text: '官网内容问题审核通过，已生成独立任务，等待确认 Brief。' })
    if (showNotification)
      notify('官网内容问题已审核，任务已进入优化中心，等待专家确认 Brief。', task)
  }
  else {
    if (finding.status !== '待处理')
      return
    const task = createRepairTask(tasks, finding)
    finding.status = '已生成策略'
    finding.checked = false
    if (serviceMode.value === 'agent') {
      task.progress = 'brief'
      ensureWorkflow(task).briefStatus = 'ready'
      finding.status = '已生成策略'
      finding.checked = false
    }
    if (showNotification)
      notify(serviceMode.value === 'agent' ? '问题已确认，已生成任务。下一步请确认任务 Brief。' : '专家审核通过，已生成关联任务', serviceMode.value === 'agent' ? task : undefined)
  }
  drawer.type = null
}
function deferFinding(finding: AuditFinding) {
  if (!canApproveFinding(finding)) return
  const requiresDetails = serviceMode.value === 'managed'
  if (requiresDetails && !deferReason.value) {
    notify('请选择暂不修复原因')
    return
  }
  if (requiresDetails && !reviewText.value.trim()) {
    notify('请填写暂不修复说明')
    return
  }
  const detail = [deferReason.value.trim(), reviewText.value.trim()].filter(Boolean).join('：')
  finding.status = '暂不修复'
  if (detail) {
    finding.decisionReason = detail
    finding.feedback = `${role.value === 'ops' ? '专家' : '客户'} · ${detail}`
  }
  else {
    delete finding.decisionReason
    finding.feedback = `${role.value === 'ops' ? '专家' : '客户'} · 未填写原因`
  }
  reviewText.value = ''
  deferReason.value = ''
  deferMode.value = false
  notify(detail ? '本轮事项已终止，已保留原因。' : '本轮事项已终止。')
  drawer.type = null
}
function startDeferFinding() {
  deferMode.value = true
  deferReason.value = ''
  reviewText.value = ''
}
function openPending() {
  drawer.type = 'pending'
  drawer.item = null
}
function openFlow(type: FlowType) {
  drawer.type = 'flow'
  drawer.item = type
}
function openBaseline(kind: 'scope' | 'rounds') {
  drawer.type = 'baseline'
  drawer.item = kind
}
function closeDrawer() {
  drawer.type = null
  drawer.item = null
  reviewText.value = ''
  reviewCategory.value = ''
  deferReason.value = ''
  deferMode.value = false
  strategyIgnoreMode.value = false
}
function openSourceStrategy(task: GeoTask) {
  const source = strategyState.find(strategy => strategy.id === task.strategy || task.relatedStrategies.includes(strategy.id))
  if (source) {
    highlightedStrategy.value = source.id
    strategyLayer.value = '全部'
    void navigate('diagnosis')
    openStrategy(source)
    return
  }
  const sourceIds = new Set(task.source.split(/[\s/·]+/))
  const finding = findings.find(item => sourceIds.has(item.id))
  void navigate('diagnosis')
  if (finding) {
    openAudit(finding)
    return
  }
  notify(`任务来源诊断：${displayObjectCodes(task.source)}`)
}
function drawerTitle() {
  if (drawer.type === 'strategy')
    return (drawer.item as Strategy).title
  if (drawer.type === 'audit-finding')
    return `${isKnowledgeFinding(drawer.item as AuditFinding) ? '补充知识提醒' : isAdviceFinding(drawer.item as AuditFinding) ? '参考建议' : '异常处理'} · ${(drawer.item as AuditFinding).title}`
  if (drawer.type === 'audit-check')
    return (drawer.item as AuditCheck).label
  if (drawer.type === 'pending')
    return '待处理事项'
  if (drawer.type === 'flow') {
    if (drawer.item === 'diagnosis')
      return '诊断与策略如何进入执行'
    const task = tasks.find(item => item.id === route.params.taskId)
    return task ? `${displayObjectCodes(task.id)} · ${task.name}` : '优化任务如何完成闭环'
  }
  if (drawer.type === 'baseline')
    return drawer.item === 'rounds' ? '监测轮次与数据范围' : '本周基础配置变更'
  return '详情'
}
function drawerSubtitle() {
  if (drawer.type === 'strategy')
    return undefined
  if (drawer.type === 'audit-finding')
    return undefined
  if (drawer.type === 'audit-check')
    return `官网 GEO 体检 · ${displayObjectCodes((drawer.item as AuditCheck).source)}`
  if (drawer.type === 'flow')
    return 'GEO Agent · 处理流程'
  if (drawer.type === 'baseline')
    return '分析口径 V2 · 09/17 23:40 更新'
  return undefined
}
function drawerEyebrow() {
  if (drawer.type === 'strategy') {
    const index = strategyState.findIndex(strategy => strategy.id === (drawer.item as Strategy).id)
    return `认知缺口策略 ${Math.max(1, index + 1)}`
  }
  if (drawer.type !== 'audit-finding')
    return undefined
  const index = findings.findIndex(finding => finding.id === (drawer.item as AuditFinding).id)
  return isAdviceFinding(drawer.item as AuditFinding) ? '仅提供建议' : `异常${Math.max(1, index + 1)}`
}
function strategyStatusLabel(strategy: Strategy) {
  return strategyReviewStatus(strategy, tasks, serviceMode.value)
}
function linkedTaskForStrategy(strategy: Strategy) {
  return tasks.find(task => task.strategy === strategy.id || task.relatedStrategies.includes(strategy.id))
}
function canReviewStrategy(strategy: Strategy) {
  if (strategy.confirmed || strategy.ignored || strategy.businessGapRecorded || tasks.some(task => task.strategy === strategy.id || task.relatedStrategies.includes(strategy.id))) return false
  return serviceMode.value === 'agent' ? role.value === 'client' : role.value === 'ops'
}
function strategyTypeLabel(strategy: Strategy) {
  const labels: Partial<Record<Strategy['layer'], string>> = {
    内容: '官网内容',
    外部信源: '外部信源',
  }
  return labels[strategy.layer] ?? strategy.layer
}
function needsAgentVerification(strategy: Strategy) {
  if (clientStrategyPlan(strategy).kind === 'verify') return true
  if (strategyGapEvidence(strategy, personas)) return false
  // A completed verification is itself traceable evidence. Without this guard,
  // follow-up strategies created from a 核查记录 would loop back into another
  // verification task whenever the original gap had no positive coverage metric.
  return !(strategy.gapFacts?.verified && strategy.gapFacts.capability !== null)
}
function strategyRecommendation(strategy: Strategy) {
  if (serviceMode.value === 'agent' && ['business-gap', 'technical'].includes(clientStrategyPlan(strategy).kind)) return clientStrategyPlan(strategy).conclusion
  if (serviceMode.value === 'agent' && needsAgentVerification(strategy)) return '先核查原始回答、真实业务能力和已有资料，形成可追溯的原因结论；本任务不直接生成宣传内容。'
  const destination = strategy.layer === '内容'
    ? '官网内容优化'
    : strategy.layer === '外部信源'
      ? '外部信源建设'
      : `${strategyTypeLabel(strategy)}优化`
  return `建议采用${strategy.methods.join('、')}等方式，完成本次${destination}。`
}
function findingCheckLabel(finding: AuditFinding) {
  const checkIndex = auditChecks.findIndex(check => check.label === finding.check)
  const circledNumbers = ['①', '②', '③', '④', '⑤', '⑥', '⑦']
  return `${circledNumbers[checkIndex] ?? ''} ${finding.check}`.trim()
}
function findingStatusLabel(finding: AuditFinding) {
  return resolveFindingStatusLabel(finding, strategyState, tasks, serviceMode.value === 'agent')
}
provide(geoWorkbenchRouteContextKey, {
  findings,
  personas,
  activePersona,
  strategies: strategyState,
  tasks,
  strategyLayer,
  serviceMode,
  role,
  highlightedStrategy,
  taskFilter,
  visibleTasks,
  navigate,
  toggleFinding,
  selectAllFindings,
  approveSelectedFindings,
  openStrategy,
  confirmStrategy,
  openFlow,
  openAudit,
  openAuditCheck,
  openPending,
  openBaseline,
  openTask,
  openTaskSource: openSourceStrategy,
})
</script>

<template>
  <div class="geo-workbench">
    <header class="geo-app-header">
      <div class="geo-app-header__identity">
        <span class="geo-app-header__logo" aria-hidden="true">AI</span>
        <strong>独立站营销智能体</strong>
        <span class="geo-app-header__divider" aria-hidden="true" />
        <span class="geo-app-header__tenant">APW Waterjet</span>
        <span class="geo-app-header__plan">专业版</span>
        <AppIcon name="chevronDown" :size="16" class="geo-app-header__chevron" />
      </div>
      <div class="geo-app-header__account" aria-label="当前账户">
        <span class="geo-app-header__theme" aria-hidden="true">◐</span>
        <span class="geo-app-header__avatar" aria-hidden="true">{{ serviceMode === 'agent' ? '客' : '运' }}</span>
        <span>{{ serviceMode === 'agent' ? '客户' : '专家管理员' }}</span>
        <AppIcon name="chevronDown" :size="14" />
      </div>
    </header>
    <aside class="geo-workbench-sidebar">
      <section v-for="section in sidebarSections" :key="section.heading || 'primary'" class="geo-workbench-sidebar__section">
        <h2 v-if="section.heading" class="geo-workbench-sidebar__heading">
          {{ section.heading }}
        </h2>
        <template v-for="item in section.items" :key="item.label">
          <RouterLink
            class="geo-workbench-sidebar__item"
            :class="{ 'is-agent-active': 'selected' in item && item.selected }"
            :to="{ name: item.route, ...(item.route === 'onboarding' ? { query: { preview: '1' } } : {}) }"
          >
            <span class="geo-workbench-sidebar__icon" :class="{ 'is-highlighted': 'selected' in item && item.selected }">
              <AppIcon :name="item.icon" :size="16" />
            </span>
            <span class="geo-workbench-sidebar__label">{{ item.label }}</span>
            <span v-if="'tier' in item" class="geo-workbench-sidebar__tier">{{ item.tier }}</span>
            <AppIcon v-if="'children' in item || 'tier' in item" class="geo-workbench-sidebar__chevron" name="chevronDown" :size="14" />
          </RouterLink>
          <div v-if="'children' in item" class="geo-workbench-sidebar__children">
            <RouterLink
              v-for="child in item.children"
              :key="child.label"
              :to="{ name: child.route }"
              class="geo-workbench-sidebar__child"
            >
              {{ child.label }}
            </RouterLink>
          </div>
        </template>
      </section>
      <RouterLink class="geo-workbench-sidebar__onboarding" :to="{ name: 'onboarding', query: { preview: '1' } }">
        新人引导
      </RouterLink>
    </aside>
    <div class="geo-main" :class="{ 'geo-main--onboarding': isOnboardingPage }">
      <GeoWorkbenchToolbar v-if="!isOnboardingPage" :active-page="activePage" :role="role" :service-mode="serviceMode" @update:role="role = $event" @update:service-mode="changeProductMode($event)" />
      <section v-if="processingPage && !processingReady" class="geo-processing" role="status" aria-live="polite">
        <span class="geo-processing__spinner" aria-hidden="true" />
        <h1>{{ dataProcessing.labels[processingPage] }}数据处理中</h1>
        <p>预计需要 10～20 分钟。处理完成后会在右下角通知你。</p>
        <div class="geo-processing__steps" aria-label="数据处理顺序">
          <span v-for="(page, index) in (['visibility-monitoring', 'diagnosis', 'optimization'] as const)" :key="page" :class="{ 'is-complete': dataProcessing.completed.value > index, 'is-current': dataProcessing.completed.value === index }">
            {{ dataProcessing.labels[page] }}<small>{{ dataProcessing.completed.value > index ? '已完成' : dataProcessing.completed.value === index ? '处理中' : '等待中' }}</small>
          </span>
        </div>
      </section>
      <RouterView v-else />
    </div>

    <GeoDrawer :open="drawer.type !== null" :title="drawerTitle()" :subtitle="drawerSubtitle()" :eyebrow="drawerEyebrow()" :size="drawer.type === 'strategy' ? 560 : drawer.type === 'audit-finding' ? 600 : 400" :title-first="drawer.type === 'strategy' || drawer.type === 'audit-finding'" @close="closeDrawer">
      <template v-if="drawer.type === 'strategy'">
        <div class="geo-strategy-drawer">
          <section class="geo-strategy-detail-card">
            <header class="geo-strategy-detail-card__header">
              <strong>认知缺口策略</strong>
              <span class="geo-strategy-drawer__status">{{ strategyStatusLabel(drawer.item as Strategy) }}</span>
            </header>
            <dl class="geo-strategy-detail-grid">
              <dt>优先级</dt><dd>
                <PrioritySelect v-if="canReviewStrategy(drawer.item as Strategy)" :model-value="(drawer.item as Strategy).priority" @update:model-value="changeReviewPriority" />
                <template v-else>{{ (drawer.item as Strategy).priority }}</template>
              </dd>
              <dt>策略类型</dt><dd>{{ strategyTypeLabel(drawer.item as Strategy) }}</dd>
              <dt>目标人设</dt><dd>{{ (drawer.item as Strategy).persona }}</dd>
              <dt>决策因子</dt><dd>{{ (drawer.item as Strategy).factor }}</dd>
            </dl>
          </section>
          <section class="geo-strategy-detail-card">
            <header class="geo-strategy-detail-card__header">
              <strong>Agent 建议方法</strong>
            </header>
            <p class="geo-strategy-recommendation">
              {{ strategyRecommendation(drawer.item as Strategy) }}
            </p>
          </section>
          <section v-if="linkedTaskForStrategy(drawer.item as Strategy)" class="geo-strategy-detail-card geo-strategy-task-link">
            <header class="geo-strategy-detail-card__header">
              <strong>关联任务</strong>
              <span class="geo-strategy-drawer__status is-task">{{ taskStageLabel(linkedTaskForStrategy(drawer.item as Strategy)!, serviceMode) }}</span>
            </header>
            <div class="geo-strategy-task-link__body">
              <div>
                <strong>{{ linkedTaskForStrategy(drawer.item as Strategy)!.id }} · {{ linkedTaskForStrategy(drawer.item as Strategy)!.name }}</strong>
                <small>{{ linkedTaskForStrategy(drawer.item as Strategy)!.completionOutcome === 'expired-unexecuted' ? '任务已关闭，未执行优化' : linkedTaskForStrategy(drawer.item as Strategy)!.progress === 'done' ? '执行结果已回流到诊断与策略' : '任务执行中，状态会持续同步' }}</small>
              </div>
              <Button size="sm" @click="openTask(linkedTaskForStrategy(drawer.item as Strategy)!)">
                {{ linkedTaskForStrategy(drawer.item as Strategy)!.progress === 'done' ? '查看结果' : '查看任务' }}
              </Button>
            </div>
          </section>
          <section class="geo-strategy-detail-card">
            <header class="geo-strategy-detail-card__header"><strong>策略依据</strong></header>
            <div class="geo-strategy-evidence">
              <template v-if="selectedStrategyGapEvidence">
                <div class="geo-strategy-evidence__gap">
                  <span>{{ selectedStrategyGapEvidence.persona }} · {{ selectedStrategyGapEvidence.topic.name }}</span>
                  <div class="geo-strategy-evidence__platforms" aria-label="汇总与各平台覆盖差距">
                    <div class="geo-strategy-evidence__platform geo-strategy-evidence__platform--total">
                      <strong>全部平台汇总</strong>
                      <b>Gap +{{ selectedStrategyGapEvidence.topic.gap }} 个百分点</b>
                      <small>我方 {{ selectedStrategyGapEvidence.topic.own }}% · Flow {{ selectedStrategyGapEvidence.topic.rival }}% · 有效回答 {{ selectedStrategyGapEvidence.topic.denominator }} 条</small>
                    </div>
                    <div v-for="item in selectedStrategyPlatformGaps" :key="item.platform" class="geo-strategy-evidence__platform">
                      <strong>{{ item.platform }}</strong>
                      <b>{{ item.gap === null ? '暂无数据' : `Gap ${item.gap > 0 ? '+' : ''}${item.gap} 个百分点` }}</b>
                      <small>{{ item.denominator ? `我方 ${item.own}% · Flow ${item.rival}% · 有效回答 ${item.denominator} 条` : '无有效回答' }}</small>
                    </div>
                  </div>
                </div>
              </template>
              <p v-else class="geo-strategy-evidence__note">尚未匹配到可核对的正向覆盖差距，请先核查关联主题。</p>
            </div>
          </section>
          <section v-if="strategyIgnoreMode && canReviewStrategy(drawer.item as Strategy)" class="geo-strategy-ignore-form" :aria-label="serviceMode === 'agent' ? '不处理策略' : '忽略策略原因'">
            <label class="geo-form-label">
              {{ serviceMode === 'agent' ? '不处理原因' : '忽略原因' }} <span v-if="serviceMode === 'managed'" aria-hidden="true">*</span><small v-else class="geo-muted">可选</small>
              <span class="geo-workbench-control">
                <DropdownSelect v-model="reviewCategory" :options="reviewCategoryOptions" v-bind="{ ariaLabel: serviceMode === 'agent' ? '请选择不处理原因' : '请选择忽略原因' }" />
              </span>
            </label>
            <Textarea id="strategy-ignore-comment" v-model="reviewText" class="geo-review-textarea" :placeholder="serviceMode === 'agent' ? '可选：补充说明' : '补充说明'" :rows="3" />
          </section>
        </div>
      </template>
      <template v-else-if="drawer.type === 'audit-finding'">
        <div class="geo-detail-section geo-audit-finding-detail">
          <div class="geo-detail-heading">
            <strong>问题性质与处理方式</strong><span class="geo-route-badge" :class="(drawer.item as AuditFinding).route">{{ findingRouteLabel(drawer.item as AuditFinding, serviceMode === 'agent') }}</span>
          </div><dl>
            <dt>优先级</dt><dd>
              <PrioritySelect v-if="canApproveFinding(drawer.item as AuditFinding)" :model-value="(drawer.item as AuditFinding).priority" @update:model-value="changeReviewPriority" />
              <template v-else>{{ (drawer.item as AuditFinding).priority }}</template>
            </dd>
            <template v-if="isReadOnlyFinding(drawer.item as AuditFinding)">
              <dt>问题依据</dt><dd>{{ (drawer.item as AuditFinding).evidence || (drawer.item as AuditFinding).detail }}</dd>
              <dt>{{ isKnowledgeFinding(drawer.item as AuditFinding) ? '补充要求' : '参考建议' }}</dt><dd>{{ (drawer.item as AuditFinding).advice || (drawer.item as AuditFinding).routeReason }}</dd>
            </template>
            <template v-else-if="serviceMode === 'managed'">
              <dt>问题依据</dt><dd>{{ (drawer.item as AuditFinding).evidence || (drawer.item as AuditFinding).detail }}</dd>
              <dt>参考建议</dt><dd>{{ (drawer.item as AuditFinding).advice || (drawer.item as AuditFinding).routeReason }}</dd>
            </template>
            <template v-if="serviceMode === 'agent' && !isReadOnlyFinding(drawer.item as AuditFinding)">
              <dt>问题对象</dt><dd>{{ (drawer.item as AuditFinding).route === 'repair' ? '官网结构' : '官网内容' }}</dd>
              <dt>检测依据</dt><dd>{{ (drawer.item as AuditFinding).evidence || (drawer.item as AuditFinding).detail }}</dd>
              <dt>处理范围</dt><dd>{{ (drawer.item as AuditFinding).routeReason }}</dd>
              <template v-if="isDirectRepairFinding(drawer.item as AuditFinding)">
                <dt>执行对象</dt><dd>{{ taskForFinding(drawer.item as AuditFinding)?.workflow?.site.targetPage || '待任务 Brief 确认后写入执行对象' }}</dd>
                <dt>拟修改项</dt><dd>{{ (drawer.item as AuditFinding).method }} · {{ (drawer.item as AuditFinding).title }}</dd>
                <dt>验证结果</dt><dd>{{ taskForFinding(drawer.item as AuditFinding)?.workflow?.site.result || ((drawer.item as AuditFinding).status === '已修复' ? '官网已返回处理结果。' : '尚无验证结果，完成后更新。') }}</dd>
              </template>
            </template>
            <template v-if="taskForFinding(drawer.item as AuditFinding)">
              <dt>关联任务</dt>
              <dd>
                {{ taskForFinding(drawer.item as AuditFinding)!.id }} · {{ taskStageLabel(taskForFinding(drawer.item as AuditFinding)!, serviceMode) }}
                <Button size="sm" variant="text" @click="openTask(taskForFinding(drawer.item as AuditFinding)!)">
                  {{ taskForFinding(drawer.item as AuditFinding)!.progress === 'done' ? '查看结果' : '查看任务' }}
                </Button>
              </dd>
            </template>
            <dt>所属检查项</dt><dd>{{ findingCheckLabel(drawer.item as AuditFinding) }}</dd>
            <dt>当前状态</dt><dd><span class="geo-finding-status" :class="{ 'is-advice': isAdviceFinding(drawer.item as AuditFinding), 'is-done': ['已生成任务', '已完成处理', 'AI建站处理中'].includes(findingStatusLabel(drawer.item as AuditFinding)), 'is-deferred': findingStatusLabel(drawer.item as AuditFinding) === '暂不修复' }">{{ findingStatusLabel(drawer.item as AuditFinding) }}</span></dd>
            <dt v-if="(drawer.item as AuditFinding).decisionReason">
              {{ serviceMode === 'agent' ? '终止原因' : '暂缓原因' }}
            </dt><dd v-if="(drawer.item as AuditFinding).decisionReason">
              {{ (drawer.item as AuditFinding).decisionReason }}
            </dd>
          </dl>
        </div>
        <div v-if="deferMode" class="geo-detail-section geo-defer-form">
          <strong>{{ serviceMode === 'agent' ? '不处理说明' : '暂不修复说明' }}</strong>
          <label class="geo-form-label">
            {{ serviceMode === 'agent' ? '不处理原因' : '暂不修复原因' }} <span v-if="serviceMode === 'managed'" aria-hidden="true">*</span><small v-else class="geo-muted">可选</small>
            <span class="geo-workbench-control">
              <DropdownSelect v-model="deferReason" :options="deferReasonOptions" v-bind="{ ariaLabel: serviceMode === 'agent' ? '请选择不处理原因' : '请选择暂不修复原因' }" />
            </span>
          </label>
          <label class="geo-form-label">
            {{ serviceMode === 'agent' ? '不处理说明' : '暂不修复说明' }} <span v-if="serviceMode === 'managed'" aria-hidden="true">*</span><small v-else class="geo-muted">可选</small>
            <Textarea id="finding-defer-comment" v-model="reviewText" class="geo-review-textarea" :placeholder="serviceMode === 'agent' ? '可选：补充说明，便于后续追溯。' : '例如：官网下周整体改版，本周暂不单独处理。'" :rows="5" />
          </label>
        </div>
      </template>
      <template v-else-if="drawer.type === 'audit-check'">
        <div class="geo-detail-section">
          <div class="geo-detail-heading">
            <strong>检查结果</strong><Tag :tone="(drawer.item as AuditCheck).passed ? 'green' : 'red'" variant="soft" size="sm">
              {{ (drawer.item as AuditCheck).passed ? '通过' : '异常' }}
            </Tag>
          </div><dl>
            <dt>检查项</dt><dd>{{ (drawer.item as AuditCheck).label }}</dd><dt v-if="(drawer.item as AuditCheck).priority">
              优先级
            </dt><dd v-if="(drawer.item as AuditCheck).priority">
              {{ (drawer.item as AuditCheck).priority }}
            </dd><dt>结果</dt><dd>{{ (drawer.item as AuditCheck).result }}</dd><dt>证据说明</dt><dd>{{ (drawer.item as AuditCheck).evidence }}</dd><dt>来源诊断</dt><dd>{{ (drawer.item as AuditCheck).source }}</dd><dt>分析口径</dt><dd>V2 · 09/14–09/20</dd>
          </dl>
        </div><div v-if="relatedStrategies(drawer.item as AuditCheck).length" class="geo-detail-section">
          <strong>关联候选策略</strong><div class="geo-drawer-links">
            <Button v-for="strategy in relatedStrategies(drawer.item as AuditCheck)" :key="strategy.id" size="sm" @click="openStrategy(strategy)">
              {{ displayObjectCodes(strategy.id) }} · 查看策略
            </Button>
          </div><p class="geo-detail-copy">
            候选策略关联具体检测发现；业务信息和执行范围在 Brief 中确认。
          </p>
        </div>
      </template>
      <template v-else-if="drawer.type === 'pending'">
        <p class="geo-detail-copy">
          已按当前角色聚合待处理事项；进入对应对象继续处理。
        </p><div v-if="pendingItems.length" class="geo-pending-list">
          <ActionCard v-for="item in pendingItems" :key="`${item.kind}-${item.id}`" class="geo-pending-item" @click="openPendingItem(item)">
            <span><span class="geo-pending-item__labels"><i>{{ item.kind === 'audit' ? '诊断异常' : item.kind === 'strategy' ? '候选策略' : '执行任务' }}</i><i>{{ item.status }}</i></span><strong>{{ item.title }}</strong><small>{{ item.summary }}</small><span class="geo-pending-item__meta"><span>优先级 {{ item.priority }}</span><span>来源：{{ item.source }}</span><span>当前周期</span></span></span><b>立即处理 <AppIcon name="arrowRight" :size="14" /></b>
          </ActionCard>
        </div><div v-else class="geo-empty-state">
          <strong>当前没有待处理事项</strong><span>新的诊断与审核事项会集中显示在这里。</span>
        </div>
      </template>
      <template v-else-if="drawer.type === 'flow'">
        <div class="geo-detail-note">
          页面默认只展示当前阶段和下一步；这里集中说明完整流程与角色分工。
        </div><div class="geo-flow-list">
          <div v-for="(step, index) in flowSteps[drawer.item as FlowType]" :key="step.title" class="geo-flow-item">
            <span>{{ index + 1 }}</span><div><strong>{{ step.title }}</strong><small>{{ step.description }}</small></div>
          </div>
        </div><section class="geo-flow-roles">
          <header class="geo-flow-roles__head">
            <h3>角色分工</h3><span>{{ serviceMode === 'managed' ? 'GEO专家模式' : 'Agent 自主模式' }}</span>
          </header>
          <table class="geo-flow-role-table">
            <thead>
              <tr>
                <th scope="col">
                  角色
                </th><th scope="col">
                  主要职责
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">
                  Agent
                </th><td>诊断、生成、编排、自动检查与状态推进</td>
              </tr>
              <tr v-if="serviceMode === 'managed'">
                <th scope="row">
                  专家
                </th><td>专业审核、人工纠偏、提交 AI 建站和异常处理</td>
              </tr>
              <tr>
                <th scope="row">
                  客户
                </th><td>确认关键业务事实、重要执行范围和发布上线</td>
              </tr>
              <tr>
                <th scope="row">
                  AI 建站
                </th><td>执行官网页面与技术配置修改，返回预览稿和 Diff</td>
              </tr>
            </tbody>
          </table>
        </section>
      </template>
      <template v-else-if="drawer.type === 'baseline'">
        <div class="geo-detail-note">
          正式策略只纳入已完成且达到可信度要求的监测轮次；进行中的监测不会实时改写正式策略。
        </div><div class="geo-detail-section">
          <div class="geo-detail-heading">
            <strong>本周策略分析基线 · 09/14–09/20</strong><Tag tone="green" variant="soft" size="sm">
              决策级可信度
            </Tag>
          </div><div class="geo-baseline-detail-grid">
            <div v-for="metric in baselineMetrics" :key="metric.label">
              <span>{{ metric.label }}</span><strong>{{ metric.value }}</strong><small>{{ metric.note }}</small>
            </div>
          </div>
        </div><div class="geo-detail-section">
          <strong>{{ drawer.item === 'scope' ? '配置变更记录' : '轮次状态' }}</strong><p class="geo-detail-copy">
            {{ drawer.item === 'scope' ? 'V2 于 09/17 10:20 生效，Query 从 59 增至 67；新增问题仅参与变更后的监测，不与变更前数据直接计算趋势。' : '已完成 4 轮，当前第 5 轮正在监测，剩余 2 轮达到可信度要求后纳入正式策略。' }}
          </p>
        </div>
      </template>
      <template #footer>
        <Button v-if="drawer.type === 'flow'" class="geo-flow-ack" variant="primary" color="var(--geo-brand)" color-text="var(--primitive-white)" @click="closeDrawer">
          知道了
        </Button><Button v-else-if="!(drawer.type === 'audit-finding' && deferMode)" @click="closeDrawer">
          关闭
        </Button><template v-if="drawer.type === 'audit-finding' && canApproveFinding(drawer.item as AuditFinding) && !isDirectRepairFinding(drawer.item as AuditFinding)">
          <Button v-if="deferMode" @click="closeDrawer">
            取消
          </Button><Button v-if="deferMode" variant="primary" color="var(--geo-brand)" color-text="var(--primitive-white)" @click="deferFinding(drawer.item as AuditFinding)">
            {{ serviceMode === 'agent' ? '确认不处理' : '确认暂不修复' }}
          </Button><template v-else>
            <Button @click="startDeferFinding">
              {{ serviceMode === 'agent' ? '不处理' : '暂不修复' }}
            </Button>
          </template>
        </template><Button v-if="drawer.type === 'audit-finding' && canIgnoreFinding(drawer.item as AuditFinding) && !deferMode" @click="ignoreFinding(drawer.item as AuditFinding)">
          忽略
        </Button><Button v-if="drawer.type === 'audit-finding' && canApproveFinding(drawer.item as AuditFinding) && !deferMode" variant="primary" color="var(--geo-brand)" color-text="var(--primitive-white)" @click="processFinding(drawer.item as AuditFinding)">
          {{ serviceMode === 'agent' ? '确认处理并生成任务' : '审核通过并生成任务' }}
        </Button><Button v-if="drawer.type === 'audit-finding' && !canApproveFinding(drawer.item as AuditFinding) && (drawer.item as AuditFinding).status !== '待处理' && (taskForFinding(drawer.item as AuditFinding) || strategyForFinding(drawer.item as AuditFinding))" variant="primary" color="var(--geo-brand)" color-text="var(--primitive-white)" @click="openFindingDestination(drawer.item as AuditFinding)">
          {{ serviceMode === 'agent' && taskForFinding(drawer.item as AuditFinding)?.progress === 'brief' ? '去确认 Brief' : taskForFinding(drawer.item as AuditFinding) ? '进入任务' : '进入策略' }}
        </Button><template v-if="drawer.type === 'strategy' && canReviewStrategy(drawer.item as Strategy)">
          <Button v-if="strategyIgnoreMode" @click="strategyIgnoreMode = false">
            取消
          </Button><Button v-else @click="startIgnoreStrategy">
            {{ serviceMode === 'agent' ? '不处理' : '忽略' }}
          </Button><Button v-if="strategyIgnoreMode" variant="primary" color="var(--geo-brand)" color-text="var(--primitive-white)" @click="ignoreStrategy(drawer.item as Strategy)">
            {{ serviceMode === 'agent' ? '确认不处理' : '确认忽略' }}
          </Button><Button v-else variant="primary" color="var(--geo-brand)" color-text="var(--primitive-white)" @click="confirmStrategy(drawer.item as Strategy)">
            {{ serviceMode === 'agent' ? '确认策略并生成任务' : '审核通过并生成任务' }}
          </Button>
        </template><Button v-if="drawer.type === 'strategy' && ((drawer.item as Strategy).confirmed || (serviceMode === 'agent' && tasks.some(task => task.strategy === (drawer.item as Strategy).id || task.relatedStrategies.includes((drawer.item as Strategy).id))))" variant="primary" color="var(--geo-brand)" color-text="var(--primitive-white)" @click="confirmStrategy(drawer.item as Strategy)">
          {{ serviceMode === 'agent' && tasks.some(task => (task.strategy === (drawer.item as Strategy).id || task.relatedStrategies.includes((drawer.item as Strategy).id)) && task.progress === 'brief') ? '去确认 Brief' : '查看关联任务' }}
        </Button>
      </template>
    </GeoDrawer>
    <Transition name="geo-toast">
      <div v-if="toast" class="geo-toast" role="status">
        {{ toast }}
        <button v-if="toastTask" type="button" @click="openTask(toastTask)">{{ serviceMode === 'agent' ? '去确认 Brief' : '查看任务' }} →</button>
      </div>
    </Transition>
    <Transition name="geo-toast">
      <div v-if="processingNotice" class="geo-processing-notice" role="status">
        <span>{{ dataProcessing.labels[processingNotice] }}页面已经处理完</span>
        <button type="button" @click="openProcessedPage(processingNotice)">点击查看 →</button>
        <button type="button" class="geo-processing-notice__close" aria-label="关闭提示" @click="processingNotice = null">×</button>
      </div>
    </Transition>
  </div>
</template>

