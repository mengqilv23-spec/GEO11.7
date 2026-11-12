<script setup lang="ts">
import type { GeoTask, ServiceMode, UserRole } from '../../data/geo-data'
import type { TaskBrief, TaskKnowledge, WorkflowAction, WorkflowPayload } from '../../workflows/task-workflow'
import type { DropdownSelectOption } from '../ui/ce/dropdown-select/types'
import type { KnowledgeUploadDraft } from './KnowledgeUploadDrawer.vue'
import { computed, reactive, shallowRef, watch } from 'vue'
import { useGeoWorkbenchRouteContext } from '../../composables/workbench-route-context'
import { auditFindings, officialContentSnapshot } from '../../data/geo-data'
import { createRepairTask } from '../../services/geo-orchestration'
import { isCodeContentTask } from '../../workflows/content-format'
import { directRepairStatus, isDirectRepairTask } from '../../workflows/direct-repair'
import { taskFlowFor } from '../../workflows/task-flow'
import { advanceAutomatic, applyAction, briefGate, canPrepareBrief, deferredTaskFor, ensureWorkflow, hasAutomaticStep, ignoredTaskFor, ignoreOwner, isTaskIgnored, knowledgeLibrary, reviewOwner, taskStageLabel } from '../../workflows/task-workflow'
import Button from '../ui/ce/button/Button.vue'
import Drawer from '../ui/ce/drawer/Drawer.vue'
import DropdownSelect from '../ui/ce/dropdown-select/DropdownSelect.vue'
import Tag from '../ui/ce/tag/Tag.vue'
import Toast from '../ui/ce/toast/Toast.vue'
import AppIcon from '../ui/icons/AppIcon.vue'
import KnowledgeUploadDrawer from './KnowledgeUploadDrawer.vue'
import TaskProgressTimeline from './TaskProgressTimeline.vue'
import TaskRepairDetail from './TaskRepairDetail.vue'
import TaskReviewInsights from './TaskReviewInsights.vue'
import TaskRichTextEditor from './TaskRichTextEditor.vue'

const props = defineProps<{ task: GeoTask, role: UserRole, serviceMode: ServiceMode, clientPreview: boolean }>()
const emit = defineEmits<{ back: [], change: [], setTestRole: [role: UserRole] }>()
const routeContext = useGeoWorkbenchRouteContext()
const sourceStrategy = computed(() => routeContext.strategies?.find(strategy => strategy.id === props.task.strategy || props.task.relatedStrategies.includes(strategy.id)))
const sourceFinding = computed(() => {
  const sourceIds = new Set((props.task.source ?? '').split(/[\s/·]+/))
  return routeContext.findings?.find(finding => sourceIds.has(finding.id))
})
const sourceBacklinkLabel = computed(() => sourceStrategy.value ? '查看来源策略' : sourceFinding.value ? '查看来源诊断' : '')
function openTaskSource() {
  routeContext.openTaskSource?.(props.task)
}
function completeVerification() {
  const task = props.task
  if (task.progress !== 'human' || !draft.body.trim() || !task.verificationOutcome) return
  const parent = routeContext.strategies.find(strategy => strategy.id === task.strategy)
  if (!parent) { error.value = '未找到关联策略，请先核对任务来源'; return }
  const outcome = task.verificationOutcome
  flow.value.output.body = draft.body
  parent.gapFacts = {
    verified: true,
    capability: outcome !== 'business-gap',
    contentExists: outcome !== 'add-content',
    clear: outcome !== 'edit-content',
    readable: outcome !== 'technical',
    thirdParty: outcome === 'external',
  }
  if (outcome === 'business-gap') {
    parent.businessGapRecorded = true
    parent.reviewNote = draft.body
  }
  else if (outcome === 'technical') {
    const id = `GAP-TECH-${parent.id}`
    let finding = routeContext.findings.find(item => item.id === id)
    if (!finding) {
      finding = { id, title: `读取修复：${parent.title}`, detail: draft.body, check: '抓取渲染', method: '读取障碍修复', priority: parent.priority, status: '待处理', checked: false, route: 'repair', routeReason: '原因核查确认存在技术读取障碍，进入直接处理。' }
      routeContext.findings.push(finding)
    }
    const repair = createRepairTask(routeContext.tasks, finding)
    if (!repair.relatedStrategies.includes(parent.id)) repair.relatedStrategies.push(parent.id)
    task.verificationFollowupId = repair.id
  }
  else {
    const id = `${parent.id}-CHECK-${task.id}`
    if (!routeContext.strategies.some(strategy => strategy.id === id)) routeContext.strategies.push({
      ...parent, id, title: `${outcome === 'external' ? '第三方内容建设' : outcome === 'add-content' ? '补充官网内容' : '修改官网内容'}：${parent.title}`,
      confirmed: false, ignored: false, businessGapRecorded: false, reviewNote: undefined,
      layer: outcome === 'external' ? '外部信源' : '内容', description: draft.body,
      evidence: `${parent.evidence}；核查记录 ${task.id}：${draft.body}`,
      methods: [outcome === 'external' ? '第三方内容建设' : outcome === 'add-content' ? '补充官网内容' : '修改官网内容'],
      gapFacts: { verified: true, capability: true, contentExists: outcome !== 'add-content', clear: outcome !== 'edit-content', readable: true, thirdParty: outcome === 'external' },
    })
    task.verificationFollowupId = id
  }
  flow.value.reviews.push({ time: new Date().toISOString(), actor: '客户', note: `核查完成：${draft.body}` })
  task.progress = 'done'
  persistLocalDraft()
  emit('change')
}
function saveVerificationDraft() {
  if (props.task.progress === 'done') return
  flow.value.output.body = draft.body
  message.value = '核查草稿已保存，任务仍待完成'
  persistLocalDraft()
  emit('change')
}
function openVerificationFollowup() {
  const id = props.task.verificationFollowupId
  const task = routeContext.tasks.find(task => task.id === id)
  if (task) routeContext.openTask(task)
  else {
    const strategy = routeContext.strategies.find(strategy => strategy.id === id)
    if (strategy) { void routeContext.navigate('diagnosis'); routeContext.openStrategy(strategy) }
  }
}
const tab = shallowRef('brief')
const drawer = shallowRef<'brief' | 'knowledge' | 'upload' | 'output' | 'feedback' | 'retry' | 'ignore' | null>(null)
const error = shallowRef('')
const message = shallowRef('')
const decisionReason = shallowRef('')
const decisionExplanation = shallowRef('')
const note = shallowRef('')
const simulateFailure = shallowRef(false)
const customMethod = shallowRef('')
const validationToastOpen = shallowRef(false)
const validationToastMessage = shallowRef('')
const validationToastMessageId = shallowRef(0)
const validationToastVariant = shallowRef<'error' | 'warning'>('error')
const directInstruction = shallowRef('')
const webSupplement = shallowRef(false)
const draft = reactive<{ brief: TaskBrief, methods: string[], knowledge: TaskKnowledge[], title: string, body: string }>({ brief: {} as TaskBrief, methods: [], knowledge: [], title: '', body: '' })
function localDraftKey() {
  return `geo-task-draft:${props.serviceMode}:${props.role}:${props.task.id}`
}
function readLocalDraft(): { contentInstruction?: string, webSupplement?: boolean, title?: string, body?: string } | null {
  try {
    const raw = window.localStorage.getItem(localDraftKey())
    return raw ? JSON.parse(raw) : null
  }
  catch { return null }
}
function persistLocalDraft() {
  try {
    const brief = props.task.workflow?.brief
    const output = props.task.workflow?.output
    const changed = directInstruction.value !== (brief?.contentInstruction || '')
      || webSupplement.value !== (brief?.webSupplement ?? true)
      || draft.title !== (output?.title || '')
      || draft.body !== (output?.body || '')
    if (changed) window.localStorage.setItem(localDraftKey(), JSON.stringify({ contentInstruction: directInstruction.value, webSupplement: webSupplement.value, title: draft.title, body: draft.body }))
    else window.localStorage.removeItem(localDraftKey())
  }
  catch { /* The editable fields remain available for this session. */ }
}
const aiCallsRemaining = shallowRef(2)
function aiQuotaStorageKey(taskId: string, role: UserRole) {
  return `geo-task-ai-quota:${taskId}:${role}${props.serviceMode === 'agent' ? ':agent' : ''}`
}
function refreshAiQuota(taskId: string, role: UserRole) {
  try {
    const raw = window.localStorage.getItem(aiQuotaStorageKey(taskId, role))
    const stored = raw === null ? Number.NaN : Number(raw)
    aiCallsRemaining.value = Number.isInteger(stored) ? Math.max(0, Math.min(2, stored)) : 2
  }
  catch {
    aiCallsRemaining.value = 2
  }
}
function consumeAiCall() {
  if (aiCallsRemaining.value <= 0)
    return
  aiCallsRemaining.value -= 1
  try {
    window.localStorage.setItem(aiQuotaStorageKey(props.task.id, props.role), String(aiCallsRemaining.value))
  }
  catch {
    // Keep the quota for the current view even when browser storage is unavailable.
  }
}
function confirmExternalClaim(id: string) {
  if (props.role !== 'client') return
  const claim = flow.value.output.externalClaims?.find(item => item.id === id)
  if (!claim || !draft.body.includes(`data-external-claim-id="${id}"`)) return
  claim.confirmed = true
  flow.value.reviews.push({ time: new Date().toISOString(), actor: '客户', note: `已核对联网品牌信息：${claim.text}` })
  emit('change')
}
const briefFields: Array<{ key: 'goal' | 'persona' | 'factor' | 'executionTarget', label: string }> = [{ key: 'goal', label: '任务目标' }, { key: 'persona', label: '目标人设' }, { key: 'factor', label: '买家关注点' }, { key: 'executionTarget', label: '执行对象' }]
const auditContent = computed(() => {
  if (props.task.origin !== 'geo-audit' || props.task.type !== 'web' || props.task.executionKind === 'verification') return undefined
  if (props.task.source === 'F9') return officialContentSnapshot(auditFindings.find(finding => finding.id === 'F9')!)
  if (props.task.auditContent) return props.task.auditContent
  const finding = auditFindings.find(item => item.id === props.task.source)
  const evidence = props.task.evidence || finding?.detail || `官网有关「${props.task.name}」的内容需要核对。`
  return {
    abnormality: `${evidence}这可能影响 AI 准确识别相关品牌信息。`,
    originalContent: '',
    modificationScope: `官网：围绕「${props.task.name}」，结合已确认的品牌资料与「${props.task.factor}」相关信息，${props.task.methods.join('、') || '更新相关内容'}。`,
  }
})
const auditModificationScope = computed(() => auditContent.value?.modificationScope
  || `官网：围绕「${props.task.name}」，结合已确认的品牌资料，更新相关页面的文字内容。`)
const methodOptions = ['对比表', 'FAQ / Q&A', '统计数据注入', '专家观点', '案例证明', '定义框', 'JSON-LD', 'sameAs', '内容表达优化']
const ignoreReasonOptions: DropdownSelectOption[] = [
  { value: 'Agent 判断错误 / 策略不适用', label: 'Agent 判断错误 / 策略不适用' },
  { value: '事实 / 证据不足', label: '事实 / 证据不足' },
  { value: '重复策略 / 已有其他方案', label: '重复策略 / 已有其他方案' },
  { value: '时机不合适', label: '时机不合适' },
  { value: '执行成本过高', label: '执行成本过高' },
  { value: '不符合当前业务目标', label: '不符合当前业务目标' },
  { value: '其他', label: '其他' },
]
const supplementTopics = computed(() => /代理|服务|本地/.test(`${props.task.name} ${props.task.factor}`)
  ? ['交期与产能', '服务范围', 'SLA', '业务限制']
  : /交付|交期|产能/.test(`${props.task.name} ${props.task.factor}`)
    ? ['交期与产能', '产能规划', 'SLA', '业务限制']
    : ['常见问题', '标准答案', '限制条件'])
watch(() => [props.task, props.role, props.serviceMode] as const, ([task]) => {
  ensureWorkflow(task)
  tab.value = task.progress === 'brief' ? 'brief' : task.type === 'repair' ? 'website' : 'output'
  drawer.value = null
  error.value = ''
  message.value = ''
  decisionReason.value = ''
  decisionExplanation.value = ''
  directInstruction.value = task.workflow?.brief.contentInstruction || ''
  webSupplement.value = task.workflow?.brief.webSupplement ?? true
  draft.title = task.workflow?.output.title || ''
  draft.body = task.workflow?.output.body || ''
  const savedDraft = readLocalDraft()
  if (savedDraft) {
    directInstruction.value = savedDraft.contentInstruction ?? directInstruction.value
    webSupplement.value = savedDraft.webSupplement ?? webSupplement.value
    draft.title = savedDraft.title ?? draft.title
    draft.body = (savedDraft.body ?? draft.body).replaceAll('演示资料：', '')
  }
}, { immediate: true })
watch([directInstruction, webSupplement, () => draft.title, () => draft.body], persistLocalDraft, { flush: 'post' })
watch(() => draft.body, (body) => {
  if (!props.task.workflow?.output.externalClaims?.length) return
  const document = new DOMParser().parseFromString(body, 'text/html')
  for (const claim of props.task.workflow.output.externalClaims) {
    const sentence = document.querySelector(`[data-external-claim-id="${claim.id}"]`)?.textContent?.trim()
    if (sentence && sentence !== claim.text) {
      claim.text = sentence
      claim.confirmed = false
    }
  }
})
watch(() => [props.task.id, props.role, props.serviceMode] as const, ([taskId, role]) => refreshAiQuota(taskId, role), { immediate: true })
const flow = computed(() => props.task.workflow!)
watch(() => props.task.progress, (progress, previous) => {
  if (previous === 'brief' && progress !== 'brief' && props.task.type !== 'repair')
    tab.value = 'output'
})
watch(() => props.task.workflow?.output.body, (body, previous) => {
  if (draft.body === previous || !draft.body)
    draft.body = body || ''
})
watch(() => props.task.workflow?.output.title, (title, previous) => {
  if (draft.title === previous || !draft.title)
    draft.title = title || ''
})
const ignoredTask = computed(() => ignoredTaskFor(props.task))
const deferredTask = computed(() => deferredTaskFor(props.task))
const decisionStageLabel = computed(() => props.task.progress === 'brief' ? 'Task Brief 确认' : deferredTask.value?.stageLabel ?? taskStageLabel(props.task, props.serviceMode))
const decisionDetailsRequired = computed(() => props.serviceMode === 'managed')
const canIgnoreCurrentStep = computed(() => ignoreOwner(props.task, props.serviceMode) === props.role)
const waitingForOperationsReview = computed(() => props.role === 'client' && props.task.progress === 'human' && reviewOwner(props.task, props.serviceMode) === 'ops' && !ignoredTask.value && !deferredTask.value)
const operationsWaitingForClientReview = computed(() => props.serviceMode === 'managed' && props.role === 'ops' && props.task.progress === 'client_review')
const customerFinalReview = computed(() => props.role === 'client' && props.task.progress === 'client_review')
const customerRevisionRequests = computed(() => flow.value.customerRevisionRequests ?? 0)
const previewRevisionRequests = computed(() => flow.value.previewRevisionRequests ?? 0)
const canRequestPreviewChanges = computed(() => props.serviceMode === 'managed' && props.role === 'client' && props.task.progress === 'site_publish' && previewRevisionRequests.value < 1)
const previewRevisionExhausted = computed(() => props.serviceMode === 'managed' && props.role === 'client' && props.task.progress === 'site_publish' && previewRevisionRequests.value >= 1)
const flowSteps = computed(() => taskFlowFor(props.task, props.serviceMode))
const isContentPreparation = computed(() => ['todo', 'running', 'client_content_review', 'human', 'client_review'].includes(props.task.progress))
const siteStatus = computed(() => {
  if (props.task.completionOutcome === 'expired-unexecuted')
    return { label: '已完成', tone: 'neutral' as const }
  if (isDirectRepairTask(props.task))
    return { label: directRepairStatus(props.task.progress === 'done'), tone: props.task.progress === 'done' ? 'green' as const : 'blue' as const }
  if (props.task.type === 'repair') {
    if (props.task.progress === 'site_failed')
      return { label: '官网已返回处理结果', tone: 'red' as const }
    if (['site_returned', 'site_verifying', 'site_publish', 'recheck', 'done'].includes(props.task.progress))
      return { label: '官网已返回处理结果', tone: 'green' as const }
    if (['site_submitted', 'site_running'].includes(props.task.progress))
      return { label: '等待官网处理结果', tone: 'blue' as const }
  }
  if (props.task.progress === 'brief')
    return { label: '尚未进入 AI 建站协同', tone: 'neutral' as const }
  if (props.task.progress === 'site_failed')
    return { label: '验证未通过', tone: 'red' as const }
  if (props.task.progress === 'site_publish')
    return { label: 'GEO 验证通过 · 待发布', tone: 'green' as const }
  if (props.task.progress === 'done')
    return { label: '任务已完成', tone: 'green' as const }
  if (['publish', 'recheck', 'done'].includes(props.task.progress))
    return { label: '已上线 · Re-check 中', tone: 'green' as const }
  if (props.task.progress === 'site_verifying')
    return { label: 'GEO 验证中', tone: 'blue' as const }
  if (['site_submitted', 'site_running'].includes(props.task.progress))
    return { label: 'AI 建站执行中', tone: 'blue' as const }
  return { label: taskStageLabel(props.task, props.serviceMode), tone: 'blue' as const }
})
const siteStripVisible = computed(() => props.task.type === 'web' && ['site_submit', 'site_submitted', 'site_running', 'site_verifying', 'site_failed', 'site_publish', 'publish', 'recheck', 'done'].includes(props.task.progress))
const siteStripText = computed(() => {
  if (props.task.completionOutcome === 'expired-unexecuted')
    return '未执行优化：新一轮监测生成时本任务仍未提交官网，已按时限关闭。'
  if (props.task.progress === 'site_publish')
    return `发布内容预览已就绪 · ${flow.value.site.preview || `Preview V${flow.value.output.revision}`}`
  if (props.task.progress === 'site_failed')
    return flow.value.site.result || '官网检测未通过，请修改正文后重新提交。'
  if (['site_submit', 'site_submitted'].includes(props.task.progress))
    return '执行包已提交 AI 建站，等待执行结果。'
  if (props.task.progress === 'site_running')
    return 'AI 建站执行中，完成后自动进入 GEO 验证。'
  if (props.task.progress === 'site_verifying')
    return codeContentTask.value ? 'GEO 验证中，验证通过后任务将自动完成。' : 'GEO 验证中，结果返回后可确认发布。'
  if (props.task.progress === 'publish')
    return flow.value.site.result || '已确认发布，正在执行发布后 Re-check。'
  if (props.task.progress === 'recheck')
    return flow.value.site.result || '发布后 Re-check 中，完成后任务闭环。'
  if (props.task.progress === 'done')
    return flow.value.site.result || '任务已完成。'
  return flow.value.site.result || '执行包已进入官网检测流程，结果返回后会在这里显示。'
})
const taskPriority = computed(() => props.task.priority
  ?? routeContext.strategies?.find(strategy => strategy.id === props.task.strategy)?.priority
  ?? routeContext.findings?.find(finding => props.task.source.split(/[\s/·]+/).includes(finding.id))?.priority)
const previewHref = computed(() => `${import.meta.env.BASE_URL}optimization/tasks/${encodeURIComponent(props.task.id)}/preview`)
const taskSubtitle = computed(() => props.task.origin === 'buyer-coverage'
  ? '买家关注点与品牌表现'
  : props.task.origin === 'geo-audit' ? `官网 GEO 体检 · ${props.task.source}` : props.task.source)
const editableBrief = computed(() => canPrepareBrief(props.task, props.role, props.serviceMode))
const reviewing = computed(() => ['client_content_review', 'human', 'client_review'].includes(props.task.progress) && reviewOwner(props.task, props.serviceMode) === props.role && !(props.serviceMode === 'agent' && props.role === 'ops') && !deferredTask.value)
const contentReviewVisible = computed(() => ['todo', 'running', 'client_content_review', 'human', 'client_review'].includes(props.task.progress))
const operationsContentReview = computed(() => props.task.progress === 'human' && props.role === 'ops')
const aiWritingBlocked = computed(() => props.serviceMode === 'managed' && props.role === 'client' && props.task.progress === 'human')
const websiteContentReadOnly = computed(() => props.task.type === 'web')
const codeContentTask = computed(() => isCodeContentTask(props.task))
const contentReviewLocked = computed(() => websiteContentReadOnly.value && reviewing.value)
const aiWritingAvailable = computed(() => contentReviewVisible.value && !aiWritingBlocked.value && !websiteContentReadOnly.value)
const canEditWebSupplement = computed(() => editableBrief.value || reviewing.value || (props.role === 'client' && ['todo', 'running'].includes(props.task.progress)))
const outputDirty = computed(() => draft.title !== flow.value.output.title || draft.body !== flow.value.output.body)
const briefDirty = computed(() => directInstruction.value !== (flow.value.brief.contentInstruction || '')
  || webSupplement.value !== (flow.value.brief.webSupplement ?? true))
const hasUnsavedContent = computed(() => (props.task.type === 'web' || props.task.type === 'external')
  && ((editableBrief.value && briefDirty.value)
    || (outputEditable.value && outputDirty.value)
    || (props.task.executionKind === 'verification' && props.task.progress !== 'done' && draft.body !== flow.value.output.body)))
const siteOwner = computed(() => props.role === (props.serviceMode === 'managed' ? 'ops' : 'client'))
const outputEditable = computed(() => !contentReviewLocked.value && (reviewing.value || (props.task.progress === 'site_failed' && siteOwner.value)))
const rejectLimitReached = computed(() => props.serviceMode === 'managed' && props.role === 'client' && websiteContentReadOnly.value && props.task.progress === 'client_review' && customerRevisionRequests.value >= 3)
const canRejectOutput = computed(() => contentReviewLocked.value && reviewing.value)
const finalQualityVisible = computed(() => props.task.type !== 'repair' && !codeContentTask.value && Boolean(flow.value.output.body))
const outputEmptyMessage = computed(() => {
  if (props.task.progress === 'brief')
    return '确认 Brief 后，Agent 将自动生成本任务产物。'
  if (['todo', 'running'].includes(props.task.progress))
    return 'AI 正在生成任务产物，完成后会显示在这里。'
  return '当前还没有可查看的产物。任务状态更新后会自动显示。'
})
const qualityInput = computed(() => ({
  knowledgeCount: flow.value.knowledge.filter(item => item.status === 'ready' && item.content.trim()).length,
  methodCount: props.task.methods.length,
  externalPending: (flow.value.output.externalClaims ?? []).filter(claim => !claim.confirmed).length,
  body: flow.value.output.body,
}))
const gate = computed(() => briefGate(props.task, directInstruction.value, webSupplement.value))
const automatic = computed(() => hasAutomaticStep(props.task, props.serviceMode))
const tabs = computed(() => [
  { key: 'output', label: props.task.type === 'repair' ? '修复结果' : ['site_submit', 'site_submitted', 'site_running', 'site_verifying', 'site_failed', 'site_publish', 'publish', 'recheck', 'done'].includes(props.task.progress) ? '最终稿' : '生成内容' },
  { key: 'brief', label: 'Brief' },
  { key: 'records', label: '审核记录' },
  { key: 'versions', label: '版本' },
].filter(item => props.task.progress !== 'brief' || item.key !== 'output'))
const knowledgeOptions = computed(() => [...knowledgeLibrary, ...flow.value.knowledge.filter(item => !knowledgeLibrary.some(known => known.id === item.id))])
const waitingFor = computed(() => {
  if (ignoredTask.value)
    return '本次审核事项已忽略，不会进入后续执行；来源诊断记录仍保留。'
  if (deferredTask.value)
    return '本次审核事项已暂不处理，当前进度已保留；可恢复处理，或选择忽略。'
  if (props.task.completionOutcome === 'expired-unexecuted')
    return '本任务已因新一轮监测开始而超时关闭；未执行优化，不能继续处理。'
  if (props.serviceMode === 'agent' && props.task.progress === 'running' && customerRevisionRequests.value > 0)
    return `Agent 正在根据客户第${customerRevisionRequests.value}次修改意见继续优化。`
  if (props.task.type === 'repair' && props.task.progress === 'site_running')
    return '技术修复已提交官网，等待官网返回处理结果；状态以官网服务回传为准。'
  if (automatic.value)
    return '正在自动执行，无需人工推进。离开详情将暂停，重新进入后继续。'
  if (props.task.progress === 'done' && props.serviceMode === 'agent' && props.task.type !== 'external')
    return ''
  if (props.task.progress === 'done')
    return props.task.type === 'external' ? '外部成稿已完成交付，不跟踪外部发布 URL。' : '任务已形成闭环，可从来源策略查看效果回流。'
  if (props.task.progress === 'brief')
    return flow.value.briefStatus === 'changes_requested' ? '等待专家审核客户意见，再由 Agent 重整 Brief。' : '专家确认 Brief 后才启动执行；客户可查看任务目标与执行范围。'
  if (props.task.progress === 'client_content_review')
    return websiteContentReadOnly.value ? '请查看生成内容；内容只读，只能选择通过或拒绝。' : '请确认文案结果；需要修改时直接点击正文编辑，保存后再确认。'
  if (['human', 'client_review'].includes(props.task.progress)) {
    if (websiteContentReadOnly.value && reviewOwner(props.task, props.serviceMode) === 'client')
      return '请查看生成内容；内容只读，只能选择通过或拒绝。'
    return reviewOwner(props.task, props.serviceMode) === 'ops' ? '等待专家完成修复专业审核，再交客户确认。' : '等待客户确认产物、业务事实与交付范围。'
  }
  if (props.task.progress === 'site_publish') {
    if (props.role === 'ops')
      return '验证已通过，等待客户确认发布上线。'
    if (props.serviceMode === 'managed')
      return previewRevisionExhausted.value ? '发布预览修改已使用（限 1 次），请确认发布或忽略本次任务。' : 'AI 建站修改与 GEO 验证均已通过。确认前可退回专家修改 1 次，确认后发布上线。'
    return 'AI 建站修改与 GEO 验证均已通过，请确认发布上线。'
  }
  if (props.task.progress === 'recheck')
    return '发布/交付已完成，正在等待新的监测轮次进行官网核验。'
  return ['publish'].includes(props.task.progress) ? '客户确认发布门禁，开始官网复测。' : `等待${props.serviceMode === 'managed' ? '专家' : '客户'}检查并提交 AI 建站执行包。`
})
const actionbarTitle = computed(() => {
  if (ignoredTask.value)
    return '本次审核事项已忽略'
  if (deferredTask.value)
    return '本次审核事项已暂不处理'
  if (props.task.progress === 'site_submit')
    return '现在需要专家'
  if (props.task.progress === 'site_publish')
    return '现在需要客户'
  if (props.task.progress === 'recheck')
    return '现在需要监测 Agent'
  if (props.task.progress === 'done')
    return '本任务已完成'
  return taskStageLabel(props.task, props.serviceMode)
})
const actionbarDescription = computed(() => {
  if (ignoredTask.value) {
    const reason = ignoredTask.value.reason?.trim()
    return `已忽略「${ignoredTask.value.stageLabel}」${reason ? `：${reason}` : ''}。本任务不再进入后续执行。`
  }
  if (deferredTask.value) {
    const reason = deferredTask.value.reason?.trim()
    return `已暂不处理「${deferredTask.value.stageLabel}」${reason ? `：${reason}` : ''}。当前进度已保留，可恢复处理；如确定不再执行，请选择忽略。`
  }
  if (props.task.completionOutcome === 'expired-unexecuted')
    return '未执行优化。本任务已超出处理时限并关闭，不能继续处理。'
  if (customerFinalReview.value) {
    if (websiteContentReadOnly.value)
      return props.serviceMode === 'managed' ? `请查看生成内容；内容只读，只能选择通过或拒绝。拒绝后按修改次数规则退回处理（最多 3 次，已使用 ${customerRevisionRequests.value} 次）。` : '请查看生成内容；内容只读，只能选择通过或拒绝。'
    return props.serviceMode === 'managed' ? `请确认最新文案；如需修改，可填写意见退回专家继续优化（最多 3 次，已使用 ${customerRevisionRequests.value} 次）。` : '请确认文案结果；需要修改时可直接编辑正文。'
  }
  if (operationsWaitingForClientReview.value)
    return '专家已审核通过，当前等待客户查看最新保存版本并确认最终稿。'
  if (operationsContentReview.value)
    return websiteContentReadOnly.value ? '请查看生成内容；内容只读，只能选择通过或拒绝。通过后交客户确认，拒绝则退回重新生成。' : '请检查并修改内容；审核通过后，客户才能确认最终稿。'
  if (props.task.progress === 'client_content_review')
    return websiteContentReadOnly.value ? '请查看生成内容；内容只读，只能选择通过或拒绝。' : '请确认文案结果；需要修改时直接点击正文编辑，保存后再确认。'
  if (props.task.progress === 'site_failed')
    return '官网验证未通过。请返回内容审核改写后重新提交；如不再处理，可选择忽略。'
  if (props.task.progress === 'site_submit')
    return props.role === 'ops' ? '执行包已经准备完成，请提交 AI 建站开始网站修改。' : '执行包已准备完成，等待专家提交 AI 建站开始网站修改。'
  if (props.task.progress === 'site_publish') {
    if (props.role === 'ops')
      return '验证已通过，等待客户确认发布上线。'
    if (props.serviceMode === 'managed')
      return previewRevisionExhausted.value ? '发布预览修改已使用（限 1 次），请确认发布或忽略本次任务。' : 'AI 建站修改与 GEO 验证均已通过。确认前可退回专家修改 1 次，确认后发布上线。'
    return 'AI 建站修改与 GEO 验证均已通过，请确认发布上线。'
  }
  if (props.task.progress === 'recheck')
    return '发布/交付已完成，正在等待新的监测轮次进行官网核验。'
  if (props.task.progress === 'done' && props.serviceMode === 'agent' && props.task.type !== 'external')
    return '官网执行与验证已完成，可查看处理结果。'
  if (props.task.progress === 'done')
    return '任务已形成闭环，可从来源策略查看效果回流。'
  return waitingFor.value
})
watch(() => [props.task, props.task.progress, props.task.workflow?.briefStatus, props.serviceMode] as const, ([task], _, onCleanup) => {
  if (isDirectRepairTask(task) || !hasAutomaticStep(task, props.serviceMode))
    return
  const timer = setTimeout(() => {
    if (advanceAutomatic(task, props.serviceMode))
      emit('change')
  }, 1600)
  onCleanup(() => clearTimeout(timer))
}, { immediate: true })

function act(action: WorkflowAction, payload: WorkflowPayload = {}) {
  const result = applyAction(props.task, props.role, props.serviceMode, action, payload)
  error.value = result || ''
  if (result)
    return false
  message.value = flow.value.reviews.at(-1)?.note || '已保存'
  drawer.value = null
  emit('change')
  return true
}
function closeDrawer() {
  drawer.value = null
  error.value = ''
  decisionReason.value = ''
  decisionExplanation.value = ''
}
function ignoreCurrentTask() {
  if (act('ignore_task', { ignoreReason: decisionReason.value, note: decisionExplanation.value })) {
    decisionReason.value = ''
    decisionExplanation.value = ''
  }
}
function warnUnsavedContent() {
  validationToastVariant.value = 'warning'
  validationToastMessage.value = '请确认已保存修改内容'
  validationToastMessageId.value += 1
  validationToastOpen.value = true
}
function backToOptimization() {
  if (hasUnsavedContent.value) return warnUnsavedContent()
  emit('back')
}
function confirmTask() {
  if (!editableBrief.value) {
    error.value = '当前角色不能确认待确认的 Brief。'
    return
  }
  if (gate.value.length) {
    if (gate.value.includes('选择知识资料、填写补充说明或勾选联网补充')) {
      validationToastVariant.value = 'error'
      validationToastMessage.value = '请选择知识资料、填写补充说明或勾选联网补充'
      validationToastMessageId.value += 1
      validationToastOpen.value = true
      return
    }
    openEditor('brief')
    return
  }
  const saved = saveBriefDraft()
  if (saved && act('confirm_brief'))
    message.value = ''
}
function saveBriefDraft() {
  const saved = act('save_brief', {
    brief: {
      ...flow.value.brief,
      contentInstruction: directInstruction.value,
      webSupplement: webSupplement.value,
    },
    methods: [...props.task.methods],
    knowledge: flow.value.knowledge.map(item => ({ ...item })),
  })
  if (saved) {
    persistLocalDraft()
  }
  return saved
}
function saveBriefDraftFromButton() {
  if (!briefDirty.value) {
    message.value = '当前没有需要保存的修改'
    return
  }
  saveBriefDraft()
}
function removeKnowledge(item: TaskKnowledge) {
  if (!editableBrief.value)
    return
  act('save_brief', {
    brief: {
      ...flow.value.brief,
      contentInstruction: directInstruction.value,
      webSupplement: webSupplement.value,
    },
    methods: [...props.task.methods],
    knowledge: flow.value.knowledge.filter(known => known.id !== item.id),
  })
}
function saveWebSupplementSetting() {
  if (editableBrief.value)
    return
  if (!act('update_web_supplement', { webSupplement: webSupplement.value }))
    webSupplement.value = flow.value.brief.webSupplement ?? true
}
function openKnowledgeUpload() {
  error.value = ''
  message.value = ''
  drawer.value = 'upload'
}
function handleUploadSubmitted(upload: KnowledgeUploadDraft) {
  message.value = `已登记「${upload.name}」的上传流程；请前往 AI 建站知识库上传并解析，再回到“调整已有资料”刷新选择。`
}
function openEditor(kind: Exclude<NonNullable<typeof drawer.value>, 'upload'>) {
  error.value = ''
  note.value = ''
  draft.brief = { ...flow.value.brief }
  draft.methods = [...props.task.methods]
  draft.knowledge = flow.value.knowledge.map(item => ({ ...item }))
  draft.title = flow.value.output.title
  draft.body = flow.value.output.body
  drawer.value = kind
}
function toggleMethod(method: string) {
  draft.methods = draft.methods.includes(method) ? draft.methods.filter(item => item !== method) : [...draft.methods, method]
}
function addMethod() {
  const value = customMethod.value.trim()
  if (value && !draft.methods.includes(value))
    draft.methods.push(value)
  customMethod.value = ''
}
function toggleKnowledge(item: TaskKnowledge) {
  draft.knowledge = draft.knowledge.some(known => known.id === item.id) ? draft.knowledge.filter(known => known.id !== item.id) : [...draft.knowledge, { ...item }]
}
function saveDrawer() {
  if (drawer.value === 'brief' || drawer.value === 'knowledge') {
    act('save_brief', { brief: draft.brief, methods: draft.methods, knowledge: draft.knowledge })
  }
  else if (drawer.value === 'output') {
    act('save_output', { title: draft.title, body: draft.body })
  }
  else if (drawer.value === 'retry') {
    act('retry_site', { note: note.value, simulateFailure: simulateFailure.value })
  }
  else {
    act(props.task.progress === 'brief' ? 'request_brief_changes' : props.task.progress === 'site_publish' ? 'request_preview_changes' : 'request_output_changes', { note: note.value })
  }
}
function persistInlineOutput() {
  const saved = act('save_output', { title: draft.title, body: draft.body })
  if (saved) {
    draft.title = flow.value.output.title
    draft.body = flow.value.output.body
    persistLocalDraft()
  }
  return saved
}
function saveInlineOutput() {
  return outputDirty.value ? persistInlineOutput() : true
}
function returnToContentReview() {
  persistInlineOutput()
}
function saveInlineOutputFromButton() {
  if (!outputDirty.value) {
    message.value = '当前没有需要保存的修改'
    return
  }
  saveInlineOutput()
}
function approveReview() {
  if (!saveInlineOutput()) return
  act(props.role === 'ops' ? 'approve_ops' : 'approve_client')
}
function versionDiff(index: number) {
  const current = flow.value.versions[index]
  const previous = flow.value.versions[index - 1]
  if (!current || !previous)
    return '初始执行基线'
  const changes = briefFields.filter(field => current.brief[field.key] !== previous.brief[field.key]).map(field => field.label)
  if (current.methods.join('|') !== previous.methods.join('|'))
    changes.push('执行方法')
  if (JSON.stringify(current.knowledge) !== JSON.stringify(previous.knowledge))
    changes.push('知识资料')
  if (current.output !== previous.output)
    changes.push('产物正文')
  return changes.length ? `变更字段：${changes.join('、')}` : '执行基线未发生变化'
}
</script>

<template>
  <main class="task-workspace" :class="{ 'is-brief': task.progress === 'brief', 'is-repair': task.type === 'repair' }">
    <div class="tw-task-detail" :class="{ 'is-brief': task.progress === 'brief' }">
      <section class="tw-overview" aria-label="任务信息">
        <div class="tw-topline">
          <div class="tw-topline__links">
            <Button class="tw-back-button" variant="text" @click="backToOptimization">
              <AppIcon name="arrowLeft" :size="14" aria-hidden="true" /> 返回优化中心
            </Button>
            <Button v-if="sourceBacklinkLabel" class="tw-source-link" variant="text" data-test="open-task-source" @click="openTaskSource">
              {{ sourceBacklinkLabel }} <AppIcon name="openExternal" :size="13" aria-hidden="true" />
            </Button>
          </div>
        </div>
        <header class="tw-header">
          <div class="tw-title-block">
            <div class="tw-title-line">
              <h1>{{ task.name }}</h1>
              <span class="tw-count-badge" :aria-label="`任务序号 ${task.id}`">{{ task.id }}</span>
              <template v-if="task.type === 'repair'">
                <Tag :tone="siteStatus.tone" size="sm">
                  {{ siteStatus.label }}
                </Tag>
                <Tag v-if="taskPriority" :tone="taskPriority === 'P0' ? 'red' : 'blue'" size="sm">
                  {{ taskPriority }}
                </Tag>
              </template>
              <template v-else>
                <Tag v-if="taskPriority" :tone="taskPriority === 'P0' ? 'red' : 'blue'" size="sm">
                  {{ taskPriority }}
                </Tag>
              </template>
              <Tag class="tw-task-id" tone="blue" size="sm">{{ taskSubtitle }}</Tag>
            </div>
          </div>
          <div class="tw-header-actions">
            <div v-if="task.type !== 'repair' && serviceMode === 'managed'" class="tw-role-test" data-test="workflow-role-switch">
              <span class="tw-role-test__label">流程测试</span>
              <div class="tw-role-test__options" role="group" aria-label="切换测试角色">
                <Button
                  variant="secondary"
                  :aria-pressed="role === 'ops'"
                  data-test="workflow-role-ops"
                  @click="emit('setTestRole', 'ops')"
                >
                  专家
                </Button>
                <Button
                  variant="secondary"
                  :aria-pressed="role === 'client'"
                  data-test="workflow-role-client"
                  @click="emit('setTestRole', 'client')"
                >
                  客户
                </Button>
              </div>
            </div>
          </div>
        </header>
        <TaskProgressTimeline :steps="flowSteps" :title="task.type === 'repair' ? undefined : task.type === 'external' ? '外部内容执行流程' : '官网任务执行流程'" />
      </section>
      <section class="tw-content-panel" aria-label="任务执行内容">
        <section v-if="task.executionKind === 'verification' && task.progress !== 'brief'" class="tw-card">
          <h2>原因核查</h2><p>核对原始回答、真实业务能力与现有资料，形成核查结论；此任务不生成文章或提交官网。</p>
          <label class="tw-field">核查结果<select v-model="task.verificationOutcome" :disabled="task.progress === 'done'">
            <option disabled :value="undefined">请选择已核实的原因</option>
            <option value="add-content">有能力，官网未介绍</option><option value="edit-content">已有介绍，表达不明确</option><option value="technical">内容完整，存在读取障碍</option><option value="external">需要补充第三方来源</option><option value="business-gap">实际不具备该能力</option>
          </select></label>
          <label class="tw-field">核查记录<textarea v-model="draft.body" :readonly="task.progress === 'done'" rows="7" placeholder="记录核查资料、发现的原因和后续处理建议" /></label>
          <Button v-if="task.progress !== 'done'" variant="secondary" @click="saveVerificationDraft">保存核查草稿</Button>
          <Button :disabled="!draft.body.trim() || !task.verificationOutcome || task.progress === 'done'" @click="completeVerification">保存核查结论并完成</Button>
          <p v-if="task.progress === 'done'">核查已完成。内容类结论已进入后续策略审核；技术问题进入直接处理；业务能力缺口仅记录。</p>
          <Button v-if="task.verificationFollowupId" @click="openVerificationFollowup">查看后续处理</Button>
        </section>
        <p v-if="task.executionKind !== 'verification' && automatic && serviceMode === 'agent' && task.type !== 'repair'" class="tw-card" role="status">{{ task.progress === 'running' && customerRevisionRequests > 0 ? `Agent 正在按客户第${customerRevisionRequests}次修改意见继续优化，请稍候…` : 'AI 正在处理，请稍候…' }}</p>
        <template v-if="task.type === 'repair'">
          <TaskRepairDetail :task="task" :site="flow.site" :status-label="siteStatus.label" :status-tone="siteStatus.tone" />
          <section v-if="serviceMode === 'agent' && !isDirectRepairTask(task)" class="tw-card" aria-label="修复操作">
            <p v-if="error" class="tw-error" role="alert">{{ error }}</p>
            <p v-if="ignoredTask">本次修复已忽略{{ ignoredTask.reason ? '，原因和说明已保存' : '' }}。</p>
            <div v-else-if="task.progress === 'human'" class="tw-actions">
              <Button variant="secondary" @click="drawer = 'ignore'">忽略</Button>
              <Button data-test="confirm-repair" @click="act('submit_site')">确认修复并提交官网</Button>
            </div>
            <div v-else-if="task.progress === 'site_failed'" class="tw-actions">
              <Button variant="secondary" @click="drawer = 'ignore'">忽略</Button>
              <Button data-test="retry-repair" @click="openEditor('retry')">补充要求并重试</Button>
            </div>
            <p v-else-if="automatic" role="status">AI 正在执行修复与验证…</p>
            <p v-else-if="task.progress === 'done'" role="status">修复执行与验证已完成。</p>
          </section>
        </template>
        <template v-else-if="task.executionKind !== 'verification' || task.progress === 'brief'">
          <div class="tw-more-details" :class="{ 'tw-brief-workspace': task.progress === 'brief' }">
            <header v-if="task.progress === 'brief'" class="tw-brief-workspace__head">
              <h2>Task Brief 确认</h2>
              <Tag tone="blue" size="sm">
                V{{ flow.output.revision }}
              </Tag>
            </header>
            <header v-if="isContentPreparation && task.progress !== 'brief'" class="tw-workspace-head">
              <h2>内容审核工作区</h2>
              <Tag tone="blue" size="sm">
                V{{ flow.output.revision }}
              </Tag>
            </header>
            <nav class="tw-tabs" :class="{ 'tw-tabs--workspace': task.progress !== 'brief' }" aria-label="任务详情">
              <button v-for="item in tabs" :key="item.key" :data-guide-task-tab="item.key" type="button" :aria-current="tab === item.key ? 'page' : undefined" :class="{ active: tab === item.key }" @click="tab = item.key">
                {{ item.label }}
              </button>
            </nav>
            <section v-if="tab === 'brief'" class="tw-card" :class="{ 'tw-card--brief': task.progress === 'brief' }">
              <div v-if="task.progress !== 'brief'" class="tw-section-head">
                <div><h2>Task Brief</h2><p>明确执行范围、品牌事实与交付标准，确认后作为任务执行基线。</p></div><Button v-if="editableBrief && serviceMode === 'managed'" variant="secondary" @click="openEditor('brief')">
                  编辑 Brief
                </Button>
              </div>
              <div class="tw-brief-layout" :class="{ 'is-initial': task.progress === 'brief' }">
                <section class="tw-brief-summary" aria-labelledby="tw-brief-summary-title">
                  <h3 id="tw-brief-summary-title">
                    任务概要
                  </h3>
                  <dl class="tw-brief" :class="{ 'tw-brief--table': task.progress === 'brief', 'tw-brief--audit-content': auditContent }">
                    <template v-if="auditContent">
                      <template v-if="task.progress === 'brief'">
                        <div class="tw-brief-summary__item is-primary"><dt>问题描述</dt><dd>{{ auditContent.abnormality }}</dd></div>
                        <div class="tw-brief-summary__item is-before"><dt>解决方案</dt><dd>{{ auditModificationScope }}</dd></div>
                      </template>
                      <template v-else>
                        <dt>问题描述</dt><dd>{{ auditContent.abnormality }}</dd>
                        <dt>解决方案</dt><dd>{{ auditModificationScope }}</dd>
                      </template>
                    </template>
                    <template v-for="field in auditContent ? [] : briefFields" :key="field.key">
                      <div v-if="task.progress === 'brief'" class="tw-brief-summary__item" :class="{ 'is-primary': field.key === 'goal' }">
                        <dt>{{ field.label }}</dt>
                        <dd>{{ flow.brief[field.key] }}</dd>
                      </div>
                      <template v-else>
                        <dt>{{ field.label }}</dt><dd>{{ flow.brief[field.key] }}</dd>
                      </template>
                    </template>
                  </dl>
                </section>
                <section class="tw-content-basis" aria-labelledby="tw-content-basis-title">
                  <header class="tw-content-basis__head">
                    <div>
                      <h3 id="tw-content-basis-title">
                        确认内容依据
                      </h3><p>AI 先从您的知识库中检索与当前任务相关的资料，供 AI 生成内容时参考。知识库资料的准确性、完整度和更新情况会影响生成结果；资料不足或过期时，内容可能缺少关键细节，或需要更多人工核对与修改。</p>
                    </div>
                    <span class="tw-content-basis__summary">AI 已匹配 {{ flow.knowledge.length }} 份知识{{ webSupplement ? ' + 联网补充' : '' }}</span>
                  </header>
                  <div class="tw-content-basis__body">
                    <div class="tw-content-basis__line">
                      <strong>AI 自动匹配</strong>
                      <div class="tw-chip-list">
                        <span v-for="item in flow.knowledge" :key="item.id" class="tw-knowledge-tag">
                          <Tag tone="blue">{{ item.title }}</Tag>
                          <button v-if="editableBrief" type="button" class="tw-knowledge-tag__remove" :aria-label="`移除知识：${item.title}`" title="移除" @click="removeKnowledge(item)">
                            <AppIcon name="close" :size="12" />
                          </button>
                        </span>
                        <span v-if="!flow.knowledge.length" class="tw-content-basis__empty">在您的知识库没有检索到相关资料</span>
                      </div>
                    </div>
                    <div class="tw-content-basis__line">
                      <strong>建议再补充</strong>
                      <div class="tw-chip-list" aria-label="补充主题建议">
                        <span v-for="topic in supplementTopics" :key="topic" class="tw-suggestion-chip">
                          {{ topic }}
                        </span>
                      </div>
                    </div>
                    <label v-if="editableBrief" class="tw-content-basis__instruction">
                      <span><strong>直接告诉 AI</strong><small>写一句话也可以</small></span>
                      <textarea v-model="directInstruction" rows="3" placeholder="例如：重点介绍本地服务与代理支持；不要写未经确认的价格或交期。" />
                    </label>
                    <div v-else class="tw-content-basis__instruction">
                      <span><strong>任务补充说明</strong><small>{{ serviceMode === 'agent' ? '由客户补充' : '由专家维护' }}</small></span>
                      <p class="tw-content-basis__instruction-value">
                        {{ directInstruction || '暂无补充说明' }}
                      </p>
                    </div>
                    <label v-if="canEditWebSupplement" class="tw-web-supplement">
                      <span><strong>知识不足时联网补充</strong><small>{{ editableBrief ? '联网内容会在审核时标出' : '修改将记录为新版本' }}</small></span>
                      <input v-model="webSupplement" type="checkbox" @change="saveWebSupplementSetting">
                    </label>
                    <div v-else class="tw-web-supplement is-disabled">
                      <span><strong>知识不足时联网补充</strong><small>{{ serviceMode === 'agent' ? '请在审核阶段调整' : '该设置由专家维护' }}</small></span>
                      <span class="tw-web-supplement__value">{{ webSupplement ? '已开启' : '未开启' }}</span>
                    </div>
                    <div v-if="editableBrief" class="tw-content-basis__actions">
                      <Button variant="secondary" data-test="adjust-materials" @click="openEditor('knowledge')">
                        调整已有资料
                      </Button>
                      <Button variant="secondary" data-test="upload-material" @click="openKnowledgeUpload">
                        上传新资料
                      </Button>
                    </div>
                  </div>
                  <div v-if="task.progress === 'brief'" class="tw-gate" :class="{ ready: !gate.length }" role="status">
                    <span class="tw-gate__icon" aria-hidden="true"><AppIcon :name="gate.length ? 'warning' : 'check'" :size="16" /></span>
                    <strong>{{ gate.length ? 'Agent 暂不能执行' : '内容依据已准备完成' }}</strong><p>{{ gate.length ? `还需完成：${gate.join('；')}` : '确认 Brief 后，Agent 将优先使用已匹配知识，并按需联网补充。' }}</p>
                  </div>
                </section>
              </div>
              <p v-if="flow.feedback" class="tw-feedback">
                最新调整意见：{{ flow.feedback }}
              </p>
              <section v-if="task.progress === 'brief' && !isTaskIgnored(task) && !deferredTask" class="tw-brief-confirm" :class="{ 'is-client-preview': clientPreview }" aria-label="当前阶段操作">
                <div class="tw-brief-confirm__copy">
                  <strong v-if="(role === 'client' && serviceMode === 'managed') || clientPreview || flow.briefStatus !== 'ready'" class="tw-brief-confirm__eyebrow">{{ role === 'client' || clientPreview ? '客户视图预览' : taskStageLabel(task, serviceMode) }}</strong>
                  <h3 v-if="flow.briefStatus === 'ready'">
                    Brief 确认
                  </h3>
                  <p v-if="role === 'client' || flow.briefStatus !== 'ready'">
                    {{ serviceMode === 'agent' ? '请补充资料或说明，确认后由 AI 生成内容。' : role === 'client' ? 'Brief 由专家维护并确认。此页面仅展示任务目标、范围与依据，不提供编辑操作。' : waitingFor }}
                  </p>
                  <p v-if="message" class="tw-success" role="status">
                    {{ message }}
                  </p>
                  <p v-if="error && !drawer" class="tw-error" role="alert">
                    {{ error }}
                  </p>
                </div>
                <div v-if="editableBrief && flow.briefStatus === 'ready'" class="tw-actions">
                  <Button variant="secondary" data-test="save-brief-draft" @click="saveBriefDraftFromButton">保存</Button>
                  <Button class="tw-ignore-action" variant="secondary" data-test="ignore-task" :disabled="!canIgnoreCurrentStep" :title="canIgnoreCurrentStep ? undefined : `当前步骤由${ignoreOwner(task, serviceMode) === 'ops' ? '专家' : '客户'}负责`" @click="drawer = 'ignore'">
                    忽略
                  </Button>
                  <Button variant="primary" :disabled="!editableBrief" :title="gate.length ? `还需完成：${gate.join('；')}` : undefined" @click="confirmTask">
                    {{ serviceMode === 'agent' ? '确认并生成内容' : '专家审核通过并生成内容' }}
                  </Button>
                </div>
                <Button v-else-if="flow.briefStatus === 'changes_requested' && role === 'ops' && serviceMode === 'managed'" @click="act('rework_brief')">
                  审核意见并重整 Brief
                </Button>
              </section>
            </section>

            <section v-else-if="tab === 'output'" class="tw-card">
              <template v-if="flow.output.body">
                <div v-if="siteStripVisible" class="tw-site-strip" :class="{ 'is-failed': task.progress === 'site_failed', 'is-ready': task.progress === 'site_publish' }" :title="flow.site.result || undefined">
                  <Tag :tone="siteStatus.tone" size="sm">
                    {{ siteStatus.label }}
                  </Tag>
                  <span class="tw-site-strip__text">{{ siteStripText }}</span>
                  <a v-if="task.progress === 'site_publish' && !codeContentTask" class="tw-preview-link" :href="previewHref" target="_blank" rel="noopener noreferrer">打开发布内容预览</a>
                </div>
                <div class="tw-output-review-layout">
                  <div class="tw-output-review-main">
                    <p v-if="aiWritingBlocked && !websiteContentReadOnly" class="tw-ai-guard" role="status">
                      专家正在审核内容，客户当前不能使用 AI 写作。审核完成后可继续查看或确认。
                    </p>
                    <p v-if="contentReviewLocked" class="tw-ai-guard" role="status">
                      生成内容为只读，当前只能选择通过或拒绝。
                    </p>
                    <TaskRichTextEditor v-model="draft.body" :editable="outputEditable" :ai-optimize="!websiteContentReadOnly && (aiWritingAvailable || task.progress === 'site_failed')" :ai-calls-remaining="aiCallsRemaining" :external-claims="flow.output.externalClaims || []" :can-confirm-external-claims="role === 'client'" :full-width="true" :heading="flow.output.title" label="生成内容正文编辑器" @ai-call="consumeAiCall" @confirm-external-claim="confirmExternalClaim">
                      <template v-if="finalQualityVisible" #ai-dock-below>
                        <TaskReviewInsights v-bind="qualityInput" />
                      </template>
                    </TaskRichTextEditor>
                  </div>
                </div>
              </template><p v-else class="tw-empty">
                {{ outputEmptyMessage }}
              </p>
            </section>

            <section v-else-if="tab === 'versions'" class="tw-card">
              <h2>版本</h2><p class="tw-muted">
                历史快照只读。确认后的执行基线不会被后续编辑覆盖。
              </p><details v-for="(version, index) in flow.versions" :key="version.version" class="tw-version">
                <summary>V{{ version.version }} · {{ version.note }}<small>{{ new Date(version.time).toLocaleString() }}</small></summary><p class="tw-feedback">
                  {{ versionDiff(index) }}
                </p><dl class="tw-brief">
                  <template v-for="field in auditContent ? [] : briefFields" :key="field.key">
                    <dt>{{ field.label }}</dt><dd>{{ version.brief[field.key] }}</dd>
                  </template><template v-if="auditContent"><dt>问题描述</dt><dd>{{ auditContent.abnormality }}</dd><dt>解决方案</dt><dd>{{ auditModificationScope }}</dd></template><dt>执行方法</dt><dd>{{ version.methods.join('、') || '未选择' }}</dd><dt>知识资料</dt><dd>{{ version.knowledge.map(item => item.title).join('、') || '未关联' }}</dd>
                </dl><pre v-if="version.output" class="tw-output">{{ version.output }}</pre>
              </details>
            </section>
            <section v-else class="tw-card">
              <h2>协作记录</h2><p v-if="!flow.reviews.length" class="tw-empty">
                暂无协作记录。确认、调整、审核与自动执行都会留痕。
              </p><ol class="tw-timeline">
                <li v-for="(item, index) in flow.reviews" :key="index">
                  <strong>{{ item.actor }}</strong><time>{{ new Date(item.time).toLocaleString() }}</time><p>{{ item.note }}</p>
                </li>
              </ol>
            </section>
          </div>
        </template>
      </section>
    </div>

    <section v-if="task.executionKind !== 'verification' && task.type !== 'repair' && !automatic && (task.progress !== 'brief' || ignoredTask || deferredTask) && !waitingForOperationsReview" class="tw-actionbar" :class="{ 'is-complete': task.progress === 'done', 'is-ignored': Boolean(ignoredTask), 'is-deferred': Boolean(deferredTask), 'is-client-content-review': task.progress === 'client_content_review', 'is-client-final-review': customerFinalReview, 'is-ops-content-review': operationsContentReview, 'is-ops-client-review': operationsWaitingForClientReview }" aria-label="当前阶段操作">
      <div>
        <strong v-if="task.progress !== 'client_content_review' && !customerFinalReview && !operationsContentReview && !operationsWaitingForClientReview">{{ actionbarTitle }}</strong><p v-if="actionbarDescription" :class="{ 'tw-running': automatic }">
          {{ actionbarDescription }}
        </p><p v-if="message && task.progress !== 'done' && !ignoredTask && !deferredTask && !operationsWaitingForClientReview" class="tw-success" role="status">
          {{ message }}
        </p><p v-if="error && !drawer" class="tw-error" role="alert">
          {{ error }}
        </p>
      </div><div class="tw-actions">
        <template v-if="deferredTask">
          <Button class="tw-ignore-action" variant="secondary" data-test="ignore-task" :disabled="!canIgnoreCurrentStep" :title="canIgnoreCurrentStep ? undefined : `当前步骤由${ignoreOwner(task, serviceMode) === 'ops' ? '专家' : '客户'}负责`" @click="drawer = 'ignore'">
            忽略
          </Button>
          <Button variant="primary" data-test="resume-task" :disabled="!canIgnoreCurrentStep" @click="act('resume_task')">
            恢复处理
          </Button>
        </template>
        <template v-else>
          <Button v-if="operationsWaitingForClientReview" variant="secondary" disabled data-test="waiting-client-final-review">
            等待客户确认最终稿
          </Button>
          <template v-else-if="!ignoredTask && task.progress !== 'done' && !contentReviewLocked">
            <Button class="tw-ignore-action" variant="secondary" data-test="ignore-task" :disabled="!canIgnoreCurrentStep" :title="canIgnoreCurrentStep ? undefined : `当前步骤由${ignoreOwner(task, serviceMode) === 'ops' ? '专家' : '客户'}负责`" @click="drawer = 'ignore'">
              忽略
            </Button>
          </template>
          <template v-if="reviewing">
            <Button v-if="outputEditable" variant="secondary" data-test="save-inline-output" @click="saveInlineOutputFromButton">
              保存正文
            </Button>
            <Button v-if="canRejectOutput && !rejectLimitReached" variant="secondary" data-test="reject-output" @click="openEditor('feedback')">
              拒绝
            </Button>
            <span v-else-if="contentReviewLocked && rejectLimitReached" class="tw-revision-limit" role="status">
              已达到 3 次拒绝上限
            </span>
            <Button variant="primary" data-test="approve-output" @click="approveReview">
              {{ contentReviewLocked ? (role === 'ops' ? '通过，交客户确认' : '通过') : operationsContentReview ? '专家审核通过，交客户确认' : role === 'ops' ? '审核通过，交客户确认' : '客户确认最终稿' }}
            </Button>
          </template>
          <Button v-if="siteOwner && task.progress === 'site_submit'" data-test="submit-site" @click="act('submit_site', { simulateFailure })">
            提交 AI 建站
          </Button>
          <Button v-if="siteOwner && task.progress === 'site_failed'" variant="primary" data-test="return-content-review" @click="returnToContentReview">
            返回内容审核改写
          </Button>
          <Button v-if="role === 'ops' && task.progress === 'site_publish'" variant="secondary" disabled data-test="publish-waiting">
            等待客户发布确认
          </Button>
          <template v-if="role === 'client' && ['site_publish', 'publish'].includes(task.progress)">
            <Button v-if="canRequestPreviewChanges" variant="secondary" data-test="request-preview-changes" @click="openEditor('feedback')">
              要求修改
            </Button>
            <span v-else-if="previewRevisionExhausted" class="tw-revision-limit" data-test="preview-revision-exhausted" role="status">
              发布预览修改已使用（限 1 次）
            </span>
            <Button variant="primary" data-test="confirm-publish" @click="act('publish')">
              确认完成并发布
            </Button>
          </template>
          <Button v-if="task.progress === 'recheck'" data-test="complete-recheck" @click="act('complete_recheck')">
            完成本次官网核验
          </Button>
          <Button v-if="task.progress === 'done' || ignoredTask" variant="primary" data-test="return-optimization" @click="backToOptimization">
            返回优化中心
          </Button>
        </template>
      </div>
    </section>

    <Drawer :open="drawer !== null && drawer !== 'upload'" :class="drawer === 'ignore' ? 'tw-ignore-drawer' : undefined" :eyebrow="drawer === 'ignore' ? `${task.name} · ${decisionStageLabel}` : undefined" :title="drawer === 'ignore' ? '绝对不处理（忽略）' : drawer === 'brief' ? '编辑 Brief 与执行方法' : drawer === 'knowledge' ? '知识资料准备' : drawer === 'output' ? '编辑任务产物' : drawer === 'retry' ? '补充要求并重新提交' : drawer === 'feedback' && contentReviewLocked ? '拒绝内容' : task.progress === 'site_publish' ? '发布预览修改要求' : customerFinalReview && serviceMode === 'managed' ? '退回专家修改' : '提出调整意见'" :size="560" close-label="关闭编辑" @close="closeDrawer">
      <div v-if="drawer === 'ignore'" class="tw-ignore-form">
        <p class="tw-ignore-warning">
          忽略后，本次审核事项不再进入后续执行，也不会从待处理中重复出现；来源诊断仍保留，官网异常不会因此变为通过。提交后不可恢复。
        </p>
        <label class="tw-field tw-ignore-field">
          <span>忽略原因 <b v-if="decisionDetailsRequired" aria-hidden="true">*</b><small v-else class="tw-ignore-optional">可选</small></span>
          <DropdownSelect v-model="decisionReason" :options="ignoreReasonOptions" ariaLabel="忽略原因" panel-width="100%" />
        </label>
        <label class="tw-field tw-ignore-field">
          <span>忽略说明 <b v-if="decisionDetailsRequired" aria-hidden="true">*</b><small v-else class="tw-ignore-optional">可选</small></span>
          <textarea v-model="decisionExplanation" data-test="ignore-explanation" rows="5" :placeholder="decisionDetailsRequired ? '说明为什么不采纳本次审核事项，便于追溯和 Agent 学习。' : '可选：补充说明，便于后续追溯。'" />
        </label>
        <p v-if="error" role="alert" class="tw-error">
          {{ error }}
        </p>
      </div>
      <div v-else class="tw-editor">
        <template v-if="drawer === 'brief'">
          <template v-if="auditContent"><div class="tw-field"><strong>问题描述</strong><p>{{ auditContent.abnormality }}</p></div><div class="tw-field"><strong>解决方案</strong><p>{{ auditModificationScope }}</p></div></template>
          <label v-for="field in auditContent ? [] : briefFields" :key="field.key" class="tw-field">{{ field.label }}<textarea v-model="draft.brief[field.key]" rows="3" /></label><fieldset class="tw-methods">
            <legend>执行方法 · 至少选择一项</legend><label v-for="method in [...new Set([...methodOptions, ...draft.methods])]" :key="method" class="tw-check"><input type="checkbox" :checked="draft.methods.includes(method)" @change="toggleMethod(method)">{{ method }}</label>
          </fieldset><div class="tw-inline">
            <label class="tw-field">自定义执行方法<input v-model="customMethod" maxlength="60" @keydown.enter.prevent="addMethod"></label><Button variant="secondary" @click="addMethod">
              添加标签
            </Button>
          </div>
        </template>
        <template v-else-if="drawer === 'knowledge'">
          <p class="tw-demo">
            此处可选择已解析的资料；新资料需先上传至 AI 建站知识库并完成解析。
          </p><label v-for="item in knowledgeOptions" :key="item.id" class="tw-knowledge tw-check"><input type="checkbox" :checked="draft.knowledge.some(known => known.id === item.id)" @change="toggleKnowledge(item)"><span><strong>{{ item.title }}</strong><small>{{ item.tag }} · {{ item.source }} · 解析成功</small></span></label><div v-if="draft.knowledge.length" class="tw-resource">
            <h3>已选 {{ draft.knowledge.length }} 项</h3><div v-for="item in draft.knowledge" :key="item.id" class="tw-knowledge">
              <span>{{ item.title }} · 解析成功</span><Button variant="text" @click="toggleKnowledge(item)">
                移除
              </Button>
            </div>
          </div>
        </template>
        <template v-else-if="drawer === 'output'">
          <label class="tw-field">产物标题<input v-model="draft.title"></label><label class="tw-field">产物正文<TaskRichTextEditor v-model="draft.body" label="编辑产物正文" /></label>
        </template>
        <template v-else>
          <p v-if="drawer === 'feedback' && contentReviewLocked">内容为只读，拒绝后当前版本将退回重新生成。请填写拒绝原因。</p><p v-else-if="drawer === 'feedback' && customerFinalReview && serviceMode === 'managed'">原版本、修改次数与意见会保留在审核记录中。本任务最多退回专家修改 3 次（已使用 {{ customerRevisionRequests }} 次）。</p><p v-else-if="drawer === 'feedback' && task.progress === 'site_publish'">发布预览修改仅支持 1 次。提交后将退回专家处理，再次进入发布预览时只能确认发布或忽略任务。</p><label class="tw-field">{{ drawer === 'retry' ? '补充要求与修正说明' : drawer === 'feedback' && contentReviewLocked ? '拒绝原因（必填）' : customerFinalReview && serviceMode === 'managed' ? '修改意见（必填）' : '调整意见' }}<textarea v-model="note" rows="8" placeholder="请具体说明需要调整的段落、事实依据、表达方式或范围" /></label>
        </template>
        <p v-if="error" role="alert" class="tw-error">
          {{ error }}
        </p>
      </div>
      <template #footer>
        <Button variant="secondary" @click="closeDrawer">
          取消
        </Button><Button v-if="drawer === 'ignore'" variant="primary" data-test="confirm-ignore" :disabled="decisionDetailsRequired && (!decisionReason || !decisionExplanation.trim())" @click="ignoreCurrentTask()">
          确认忽略
        </Button><Button v-else :disabled="drawer === 'feedback' && !note.trim()" @click="saveDrawer">
          {{ drawer === 'feedback' && contentReviewLocked ? '确认拒绝' : drawer === 'feedback' && customerFinalReview && serviceMode === 'managed' ? '提交意见并退回专家' : drawer === 'feedback' && task.progress === 'site_publish' ? '提交修改要求' : drawer === 'feedback' ? '提交调整意见' : drawer === 'retry' ? '重新提交' : '保存修改' }}
        </Button>
      </template>
    </Drawer>
    <KnowledgeUploadDrawer :open="drawer === 'upload'" :task-id="task.id" @close="drawer = null" @submitted="handleUploadSubmitted" />
    <Toast :open="validationToastOpen" :message-id="validationToastMessageId" :variant="validationToastVariant" close-label="关闭提示" @close="validationToastOpen = false">
      {{ validationToastMessage }}
    </Toast>
  </main>
</template>

<style src="../../styles/task-workspace.css" />

