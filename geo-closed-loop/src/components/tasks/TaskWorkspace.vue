<script setup lang="ts">
import type { GeoTask } from '../../data/geo-data'
import type { TaskBrief, TaskKnowledge, WorkflowAction, WorkflowPayload } from '../../workflows/task-workflow'
import type { DropdownSelectOption } from '../ui/ce/dropdown-select/types'
import type { KnowledgeUploadDraft } from './KnowledgeUploadDrawer.vue'
import { computed, reactive, shallowRef, watch } from 'vue'
import { useGeoWorkbenchRouteContext } from '../../composables/workbench-route-context'
import { auditFindings, officialContentSnapshot } from '../../data/geo-data'
import { isCodeContentTask } from '../../workflows/content-format'
import { stripLeadingTitleHeading } from '../../workflows/content-title'
import { directRepairStatus, isDirectRepairTask } from '../../workflows/direct-repair'
import { taskFlowFor } from '../../workflows/task-flow'
import { advanceAutomatic, applyAction, briefGate, canIgnoreCurrentStep as canIgnoreStep, canPrepareBrief, deferredTaskFor, ensureWorkflow, hasAutomaticStep, ignoredTaskFor, isTaskIgnored, knowledgeLibrary, replaceLegacyGeneratedIntro, taskStageLabel } from '../../workflows/task-workflow'
import Button from '../ui/ce/button/Button.vue'
import Drawer from '../ui/ce/drawer/Drawer.vue'
import DropdownSelect from '../ui/ce/dropdown-select/DropdownSelect.vue'
import Tag from '../ui/ce/tag/Tag.vue'
import Toast from '../ui/ce/toast/Toast.vue'
import Tooltip from '../ui/ce/tooltip/Tooltip.vue'
import AppIcon from '../ui/icons/AppIcon.vue'
import KnowledgeUploadDrawer from './KnowledgeUploadDrawer.vue'
import TaskProgressTimeline from './TaskProgressTimeline.vue'
import TaskRepairDetail from './TaskRepairDetail.vue'
import TaskReviewInsights from './TaskReviewInsights.vue'
import TaskRichTextEditor from './TaskRichTextEditor.vue'

const props = defineProps<{ task: GeoTask }>()
const emit = defineEmits<{ back: [], change: [] }>()
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
  flow.value.output.body = draft.body
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
const tab = shallowRef('brief')
const drawer = shallowRef<'brief' | 'knowledge' | 'upload' | 'output' | 'retry' | 'ignore' | null>(null)
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
  return `geo-task-draft:agent:${props.task.id}`
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
function aiQuotaStorageKey(taskId: string) {
  return `geo-task-ai-quota:${taskId}:agent`
}
function refreshAiQuota(taskId: string) {
  try {
    const raw = window.localStorage.getItem(aiQuotaStorageKey(taskId))
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
    window.localStorage.setItem(aiQuotaStorageKey(props.task.id), String(aiCallsRemaining.value))
  }
  catch {
    // Keep the quota for the current view even when browser storage is unavailable.
  }
}
function confirmExternalClaim(id: string) {
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
watch(() => props.task, (task) => {
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
    // Local drafts may predate the separate title field and still carry the
    // title as their first heading. Remove only that duplicated heading.
    draft.body = stripLeadingTitleHeading(
      (savedDraft.body ?? draft.body).replaceAll('演示资料：', ''),
      [draft.title, task.workflow?.output.title, task.name],
    )
    draft.body = replaceLegacyGeneratedIntro(draft.body, [draft.title, task.workflow?.brief.goal, task.workflow?.output.title, task.name])
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
watch(() => props.task.id, taskId => refreshAiQuota(taskId), { immediate: true })
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
const decisionStageLabel = computed(() => props.task.progress === 'brief' ? 'Task Brief 确认' : deferredTask.value?.stageLabel ?? taskStageLabel(props.task))
const canIgnoreCurrentStep = computed(() => canIgnoreStep(props.task))
const customerFinalReview = computed(() => props.task.progress === 'client_review')
const flowSteps = computed(() => taskFlowFor(props.task))
const verificationOutcomeLabels = {
  'add-content': '官网具备该能力，但尚未介绍',
  'edit-content': '官网已有介绍，但表达不明确',
  'technical': '内容完整，但存在读取障碍',
  'external': '需要补充第三方来源',
  'business-gap': '实际不具备该能力',
} as const
const verificationReminder = computed(() => {
  const outcome = props.task.verificationOutcome
  const conclusion = outcome ? verificationOutcomeLabels[outcome] : ''
  return `核查完成：${conclusion ? `${conclusion}。` : ''}结论已记录，仅作提醒，不会自动生成后续任务或流程。`
})
const isContentPreparation = computed(() => ['todo', 'running', 'client_content_review', 'human', 'client_review'].includes(props.task.progress))
const publishFailureReturn = computed(() => {
  if (props.task.type !== 'web' || !flow.value.site.result.startsWith('发布失败'))
    return false
  // Show the rejection reason only while the content is still being reworked.
  // Once it is republished or submitted for review, the downstream review must
  // not keep showing the previous failure.
  return props.task.progress === 'client_review'
})
const publishFailureRework = computed(() => props.task.type === 'web'
  && (props.task.progress === 'site_failed'
    || flow.value.site.result.startsWith('发布失败')
    || flow.value.site.result.startsWith('已根据发布失败结果修改内容')))
// The automatic check belongs to content generation and the first content
// review. Once a website task reaches the detection and execution step, that
// check is no longer the latest result and must not follow the content into
// publishing.
const siteExecutionStep = computed(() => props.task.type === 'web'
  && ['site_submit', 'site_submitted', 'site_running', 'site_returned', 'site_verifying', 'site_failed'].includes(props.task.progress))
const siteStatus = computed(() => {
  if (props.task.completionOutcome === 'expired-unexecuted')
    return { label: '已完成', tone: 'neutral' as const }
  if (publishFailureReturn.value)
    return { label: '发布失败', tone: 'red' as const }
  if (isDirectRepairTask(props.task))
    return { label: directRepairStatus(props.task.progress === 'done'), tone: props.task.progress === 'done' ? 'green' as const : 'blue' as const }
  if (props.task.type === 'repair') {
    if (props.task.progress === 'site_failed')
      return { label: '官网已返回处理结果', tone: 'red' as const }
    if (['site_returned', 'site_verifying', 'recheck', 'done'].includes(props.task.progress))
      return { label: '官网已返回处理结果', tone: 'green' as const }
    if (['site_submitted', 'site_running'].includes(props.task.progress))
      return { label: '等待官网处理结果', tone: 'blue' as const }
  }
  if (props.task.progress === 'brief')
    return { label: '尚未进入 AI 建站协同', tone: 'neutral' as const }
  if (props.task.progress === 'site_failed')
    return { label: '发布失败', tone: 'red' as const }
  if (props.task.progress === 'done')
    return { label: '任务已完成', tone: 'green' as const }
  if (['publish', 'recheck'].includes(props.task.progress))
    return { label: '已上线 · Re-check 中', tone: 'green' as const }
  if (props.task.progress === 'site_verifying')
    return { label: '等待发布结果', tone: 'blue' as const }
  if (['site_submitted', 'site_running'].includes(props.task.progress))
    return { label: 'AI 建站执行中', tone: 'blue' as const }
  return { label: taskStageLabel(props.task), tone: 'blue' as const }
})
const siteStripVisible = computed(() => props.task.type === 'web' && (publishFailureReturn.value || ['site_submit', 'site_submitted', 'site_running', 'site_verifying', 'site_failed', 'publish', 'recheck', 'done'].includes(props.task.progress)))
const siteStripText = computed(() => {
  if (props.task.completionOutcome === 'expired-unexecuted')
    return '未执行优化：新一轮监测生成时本任务仍未提交官网，已按时限关闭。'
  if (publishFailureReturn.value)
    return flow.value.site.result
  if (props.task.progress === 'site_failed')
    return flow.value.site.result || '发布失败，请修改后重新提交。'
  if (props.task.progress === 'site_submit')
    return '执行包已准备完成，提交后开始 AI 建站执行与发布。'
  if (props.task.progress === 'site_submitted')
    return '执行包已提交 AI 建站，等待执行结果。'
  if (props.task.progress === 'site_running')
    return 'AI 建站执行中，完成后返回发布结果。'
  if (props.task.progress === 'site_verifying')
    return 'AI 建站正在发布，成功或失败的结果会在这里返回。'
  if (props.task.progress === 'publish')
    return flow.value.site.result || '已确认发布，正在执行发布后 Re-check。'
  if (props.task.progress === 'recheck')
    return flow.value.site.result || '发布后 Re-check 中，完成后任务闭环。'
  if (props.task.progress === 'done')
    return flow.value.site.result || '发布成功，任务已完成。'
  return flow.value.site.result || '执行包已进入官网检测流程，结果返回后会在这里显示。'
})
const taskPriority = computed(() => props.task.priority
  ?? routeContext.strategies?.find(strategy => strategy.id === props.task.strategy)?.priority
  ?? routeContext.findings?.find(finding => props.task.source.split(/[\s/·]+/).includes(finding.id))?.priority)
const taskSubtitle = computed(() => props.task.origin === 'buyer-coverage'
  ? '买家关注点与品牌表现'
  : props.task.origin === 'geo-audit' ? `官网 GEO 体检 · ${props.task.source}` : props.task.source)
const editableBrief = computed(() => canPrepareBrief(props.task))
const reviewing = computed(() => ['client_content_review', 'human', 'client_review'].includes(props.task.progress) && !deferredTask.value && !ignoredTask.value)
const codeContentTask = computed(() => isCodeContentTask(props.task))
const contentReviewLocked = computed(() => codeContentTask.value && reviewing.value)
const CODE_REVIEW_NOTICE = '请查看生成内容；内容只读，只能选择通过或忽略（不处理该任务，忽略后无法恢复该任务，可等下次诊断处理）。'
const canEditWebSupplement = computed(() => editableBrief.value || reviewing.value || ['todo', 'running'].includes(props.task.progress))
const outputDirty = computed(() => draft.title !== flow.value.output.title || draft.body !== flow.value.output.body)
const briefDirty = computed(() => directInstruction.value !== (flow.value.brief.contentInstruction || '')
  || webSupplement.value !== (flow.value.brief.webSupplement ?? true))
const hasUnsavedContent = computed(() => (props.task.type === 'web' || props.task.type === 'external')
  && ((editableBrief.value && briefDirty.value)
    || (outputEditable.value && outputDirty.value)
    || (props.task.executionKind === 'verification' && props.task.progress !== 'done' && draft.body !== flow.value.output.body)))
const outputEditable = computed(() => !contentReviewLocked.value && (reviewing.value || props.task.progress === 'site_failed'))
const aiWritingAvailable = computed(() => outputEditable.value && !codeContentTask.value)
// A failed publish returns the task to rework without a new automatic check.
// Hide the stale check result until the content completes a new publish cycle.
const finalQualityVisible = computed(() => props.task.type !== 'repair' && !codeContentTask.value && !publishFailureRework.value && !siteExecutionStep.value && Boolean(flow.value.output.body))
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
const automatic = computed(() => hasAutomaticStep(props.task))
const tabs = computed(() => [
  { key: 'output', label: props.task.type === 'repair' ? '修复结果' : ['site_submit', 'site_submitted', 'site_running', 'site_verifying', 'site_failed', 'publish', 'recheck', 'done'].includes(props.task.progress) ? '最终稿' : '生成内容' },
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
  if (props.task.type === 'repair' && props.task.progress === 'site_running')
    return '技术修复已提交官网，等待官网返回处理结果；状态以官网服务回传为准。'
  if (automatic.value)
    return '正在自动执行，无需人工推进。离开详情将暂停，重新进入后继续。'
  if (props.task.progress === 'done' && props.task.type !== 'external')
    return ''
  if (props.task.progress === 'done')
    return props.task.type === 'external' ? '外部成稿已完成交付，不跟踪外部发布 URL。' : '任务已形成闭环，可从来源策略查看效果回流。'
  if (props.task.progress === 'brief')
    return '客户确认 Brief 后才启动执行；可查看任务目标与执行范围。'
  if (props.task.progress === 'client_content_review')
    return codeContentTask.value ? CODE_REVIEW_NOTICE : '请确认文案结果；需要修改时可直接编辑标题和正文，保存后再确认。'
  if (['human', 'client_review'].includes(props.task.progress))
    return codeContentTask.value ? CODE_REVIEW_NOTICE : '等待客户确认产物、业务事实与交付范围。'
  if (props.task.progress === 'recheck')
    return '发布/交付已完成，正在等待新的监测轮次进行官网核验。'
  return ['publish'].includes(props.task.progress) ? '客户确认发布门禁，开始官网复测。' : '等待客户检查并提交 AI 建站执行包。'
})
const actionbarTitle = computed(() => {
  if (ignoredTask.value)
    return '本次审核事项已忽略'
  if (deferredTask.value)
    return '本次审核事项已暂不处理'
  if (props.task.progress === 'recheck')
    return '现在需要监测 Agent'
  if (props.task.progress === 'done')
    return '本任务已完成'
  return taskStageLabel(props.task)
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
  if (publishFailureReturn.value)
    return '发布失败。请修改内容并重新确认后提交。'
  if (customerFinalReview.value) {
    if (codeContentTask.value)
      return CODE_REVIEW_NOTICE
    return '请确认文案结果；需要修改时可直接编辑标题和正文。'
  }
  if (props.task.progress === 'client_content_review')
    return codeContentTask.value ? CODE_REVIEW_NOTICE : '请确认文案结果；需要修改时可直接编辑标题和正文，保存后再确认。'
  if (props.task.progress === 'site_failed')
    return '发布失败。请修改内容后重新提交；如不再处理，可选择忽略。'
  if (props.task.progress === 'site_submit')
    return props.task.type === 'external'
      ? '内容已确认；可返回内容审核修改，确认无误后完成交付。'
      : '执行包已准备完成；可返回内容审核修改，确认无误后提交 AI 建站。'
  if (props.task.progress === 'recheck')
    return '发布/交付已完成，正在等待新的监测轮次进行官网核验。'
  if (props.task.progress === 'done' && props.task.type !== 'external')
    return '官网执行与验证已完成，可查看处理结果。'
  if (props.task.progress === 'done')
    return '任务已形成闭环，可从来源策略查看效果回流。'
  return waitingFor.value
})
watch(() => [props.task, props.task.progress, props.task.workflow?.briefStatus] as const, ([task], _, onCleanup) => {
  if (isDirectRepairTask(task) || !hasAutomaticStep(task))
    return
  const timer = setTimeout(() => {
    if (advanceAutomatic(task))
      emit('change')
  }, 1600)
  onCleanup(() => clearTimeout(timer))
}, { immediate: true })

function act(action: WorkflowAction, payload: WorkflowPayload = {}) {
  const result = applyAction(props.task, action, payload)
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
    error.value = '当前任务状态不能确认 Brief。'
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
  act('approve_client')
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
        </header>
        <TaskProgressTimeline :steps="flowSteps" :title="task.executionKind === 'verification' ? '核查任务流程' : task.type === 'repair' ? undefined : task.type === 'external' ? '外部内容执行流程' : '官网任务执行流程'" />
      </section>
      <section class="tw-content-panel" aria-label="任务执行内容">
        <section v-if="task.executionKind === 'verification' && task.progress !== 'brief'" class="tw-card">
          <h2>原因核查</h2><p>核对原始回答、真实业务能力与现有资料，形成核查结论；此任务不生成文章或提交官网。</p>
          <label class="tw-field">核查结果<select v-model="task.verificationOutcome" data-test="verification-outcome" :disabled="task.progress === 'done'">
            <option disabled :value="undefined">请选择已核实的原因</option>
            <option value="add-content">有能力，官网未介绍</option><option value="edit-content">已有介绍，表达不明确</option><option value="technical">内容完整，存在读取障碍</option><option value="external">需要补充第三方来源</option><option value="business-gap">实际不具备该能力</option>
          </select></label>
          <label class="tw-field">核查记录<textarea v-model="draft.body" data-test="verification-record" :readonly="task.progress === 'done'" rows="7" placeholder="记录核查资料、发现的原因和判断依据" /></label>
          <Button v-if="task.progress !== 'done'" variant="secondary" @click="saveVerificationDraft">保存核查草稿</Button>
          <Button :disabled="!draft.body.trim() || !task.verificationOutcome || task.progress === 'done'" data-test="complete-verification" @click="completeVerification">保存核查结论并完成</Button>
          <p v-if="task.progress === 'done'" class="tw-verification-reminder" data-test="verification-reminder" role="status">
            {{ verificationReminder }}
          </p>
        </section>
        <p v-if="task.executionKind !== 'verification' && automatic && task.type !== 'repair'" class="tw-card" role="status">AI 正在处理，请稍候…</p>
        <template v-if="task.type === 'repair'">
          <TaskRepairDetail :task="task" :site="flow.site" :status-label="siteStatus.label" :status-tone="siteStatus.tone" />
          <section v-if="!isDirectRepairTask(task)" class="tw-card" aria-label="修复操作">
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
                <div><h2>Task Brief</h2><p>明确执行范围、品牌事实与交付标准，确认后作为任务执行基线。</p></div>
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
                        <Tooltip content="AI 先从您的知识库中检索与当前任务相关的资料，供 AI 生成内容时参考。知识库资料的准确性、完整度和更新情况会影响生成结果；资料不足或过期时，内容可能缺少关键细节，或需要更多人工核对与修改。" placement="right" variant="callout">
                          <button type="button" class="geo-help" aria-label="内容依据说明">?</button>
                        </Tooltip>
                      </h3>
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
                      <span><strong>任务补充说明</strong><small>由客户补充</small></span>
                      <p class="tw-content-basis__instruction-value">
                        {{ directInstruction || '暂无补充说明' }}
                      </p>
                    </div>
                    <label v-if="canEditWebSupplement" class="tw-web-supplement">
                      <span><strong>知识不足时联网补充</strong><small>{{ editableBrief ? '联网内容会在审核时标出' : '修改将记录为新版本' }}</small></span>
                      <input v-model="webSupplement" type="checkbox" @change="saveWebSupplementSetting">
                    </label>
                    <div v-else class="tw-web-supplement is-disabled">
                      <span><strong>知识不足时联网补充</strong><small>请在审核阶段调整</small></span>
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
              <section v-if="task.progress === 'brief' && !isTaskIgnored(task) && !deferredTask" class="tw-brief-confirm" aria-label="当前阶段操作">
                <div class="tw-brief-confirm__copy">
                  <h3 v-if="flow.briefStatus === 'ready'">
                    Brief 确认
                  </h3>
                  <p>
                    请补充资料或说明，确认后由 AI 生成内容。
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
                  <Button class="tw-ignore-action" variant="secondary" data-test="ignore-task" :disabled="!canIgnoreCurrentStep" :title="canIgnoreCurrentStep ? undefined : '当前步骤不能忽略'" @click="drawer = 'ignore'">
                    忽略
                  </Button>
                  <Button variant="primary" :disabled="!editableBrief" :title="gate.length ? `还需完成：${gate.join('；')}` : undefined" @click="confirmTask">
                    确认并生成内容
                  </Button>
                </div>
              </section>
            </section>

            <section v-else-if="tab === 'output'" class="tw-card">
              <template v-if="flow.output.body">
                <div v-if="siteStripVisible" class="tw-site-strip" :class="{ 'is-failed': task.progress === 'site_failed' || publishFailureReturn }" :title="flow.site.result || undefined">
                  <Tag :tone="siteStatus.tone" size="sm">
                    {{ siteStatus.label }}
                  </Tag>
                  <span class="tw-site-strip__text">{{ siteStripText }}</span>
                </div>
                <div class="tw-output-review-layout">
                  <div class="tw-output-review-main">
                    <p v-if="contentReviewLocked" class="tw-ai-guard" role="status">
                      生成内容为只读，当前只能选择通过或忽略。
                    </p>
                    <label class="tw-field tw-output-title-field">
                      <span>标题</span>
                      <input v-model="draft.title" :readonly="!outputEditable" data-test="inline-output-title">
                    </label>
                    <TaskRichTextEditor v-model="draft.body" :editable="outputEditable" :ai-optimize="aiWritingAvailable" :ai-calls-remaining="aiCallsRemaining" :external-claims="flow.output.externalClaims || []" :can-confirm-external-claims="true" :full-width="true" label="生成内容正文编辑器" @ai-call="consumeAiCall" @confirm-external-claim="confirmExternalClaim">
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

    <section v-if="task.executionKind !== 'verification' && task.type !== 'repair' && !automatic && (task.progress !== 'brief' || ignoredTask || deferredTask)" class="tw-actionbar" :class="{ 'is-complete': task.progress === 'done', 'is-ignored': Boolean(ignoredTask), 'is-deferred': Boolean(deferredTask), 'is-client-content-review': task.progress === 'client_content_review', 'is-client-final-review': customerFinalReview }" aria-label="当前阶段操作">
      <div>
        <strong v-if="task.progress !== 'client_content_review' && task.progress !== 'site_submit' && !customerFinalReview">{{ actionbarTitle }}</strong><p v-if="actionbarDescription" :class="{ 'tw-running': automatic }">
          {{ actionbarDescription }}
        </p><p v-if="message && task.progress !== 'done' && task.progress !== 'site_submit' && !ignoredTask && !deferredTask" class="tw-success" role="status">
          {{ message }}
        </p><p v-if="error && !drawer" class="tw-error" role="alert">
          {{ error }}
        </p>
      </div><div class="tw-actions">
        <template v-if="deferredTask">
          <Button class="tw-ignore-action" variant="secondary" data-test="ignore-task" :disabled="!canIgnoreCurrentStep" :title="canIgnoreCurrentStep ? undefined : '当前步骤不能忽略'" @click="drawer = 'ignore'">
            忽略
          </Button>
          <Button variant="primary" data-test="resume-task" :disabled="!canIgnoreCurrentStep" @click="act('resume_task')">
            恢复处理
          </Button>
        </template>
        <template v-else>
          <template v-if="!ignoredTask && task.progress !== 'done' && !contentReviewLocked && !(task.progress === 'site_submit' && task.type === 'external')">
            <Button class="tw-ignore-action" variant="secondary" data-test="ignore-task" :disabled="!canIgnoreCurrentStep" :title="canIgnoreCurrentStep ? undefined : '当前步骤不能忽略'" @click="drawer = 'ignore'">
              忽略
            </Button>
          </template>
          <template v-if="reviewing">
            <Button v-if="outputEditable" variant="secondary" data-test="save-inline-output" @click="saveInlineOutputFromButton">
              保存修改
            </Button>
            <Button v-if="contentReviewLocked" class="tw-ignore-action" variant="secondary" data-test="ignore-task" @click="drawer = 'ignore'">
              忽略
            </Button>
            <Button variant="primary" data-test="approve-output" @click="approveReview">
              {{ contentReviewLocked ? '通过' : '确认最终稿' }}
            </Button>
          </template>
          <label v-if="task.progress === 'site_submit' && task.type === 'web'" class="tw-simulate-failure" title="仅用于演示 AI 建站返回失败后的流程">
            <input v-model="simulateFailure" type="checkbox" data-test="simulate-failure">
            <span>模拟发布失败</span>
          </label>
          <Button v-if="task.progress === 'site_submit'" variant="secondary" data-test="return-to-content-review" @click="act('return_content_review')">
            返回内容审核修改
          </Button>
          <Button v-if="task.progress === 'site_submit' && task.type === 'web'" data-test="submit-site" @click="act('submit_site', { simulateFailure })">
            提交 AI 建站
          </Button>
          <Button v-if="task.progress === 'site_submit' && task.type === 'external'" variant="primary" data-test="complete-delivery" @click="act('complete_delivery')">
            完成
          </Button>
          <Button v-if="task.progress === 'site_failed'" variant="primary" data-test="return-content-review" @click="returnToContentReview">
            返回内容审核改写
          </Button>
          <Button v-if="task.progress === 'recheck'" data-test="complete-recheck" @click="act('complete_recheck')">
            完成本次官网核验
          </Button>
          <Button v-if="task.progress === 'done' || ignoredTask" variant="primary" data-test="return-optimization" @click="backToOptimization">
            返回优化中心
          </Button>
        </template>
      </div>
    </section>

    <Drawer :open="drawer !== null && drawer !== 'upload'" :class="drawer === 'ignore' ? 'tw-ignore-drawer' : undefined" :eyebrow="drawer === 'ignore' ? `${task.name} · ${decisionStageLabel}` : undefined" :title="drawer === 'ignore' ? '确认忽略' : drawer === 'brief' ? '编辑 Brief 与执行方法' : drawer === 'knowledge' ? '知识资料准备' : drawer === 'output' ? '编辑任务产物' : '补充要求并重新提交'" :size="560" close-label="关闭编辑" @close="closeDrawer">
      <div v-if="drawer === 'ignore'" class="tw-ignore-form">
        <p class="tw-ignore-warning">
          {{ contentReviewLocked
            ? '忽略后，本任务不再进入后续执行，且无法恢复；来源诊断仍保留，可等下次诊断重新处理。'
            : '忽略后，本次审核事项不再进入后续执行，也不会从待处理中重复出现；来源诊断仍保留，官网异常不会因此变为通过。提交后不可恢复。' }}
        </p>
        <label class="tw-field tw-ignore-field">
          <span>忽略原因 <small class="tw-ignore-optional">可选</small></span>
          <DropdownSelect v-model="decisionReason" :options="ignoreReasonOptions" ariaLabel="忽略原因" panel-width="100%" />
        </label>
        <label class="tw-field tw-ignore-field">
          <span>忽略说明 <small class="tw-ignore-optional">可选</small></span>
          <textarea v-model="decisionExplanation" data-test="ignore-explanation" rows="5" placeholder="可选：补充说明，便于后续追溯。" />
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
          <label class="tw-field">标题<input v-model="draft.title"></label><label class="tw-field">正文<TaskRichTextEditor v-model="draft.body" label="编辑正文" /></label>
        </template>
        <template v-else>
          <label class="tw-field">补充要求与修正说明<textarea v-model="note" rows="8" placeholder="请具体说明需要调整的段落、事实依据、表达方式或范围" /></label>
        </template>
        <p v-if="error" role="alert" class="tw-error">
          {{ error }}
        </p>
      </div>
      <template #footer>
        <Button variant="secondary" @click="closeDrawer">
          取消
        </Button><Button v-if="drawer === 'ignore'" variant="primary" data-test="confirm-ignore" @click="ignoreCurrentTask()">
          确认忽略
        </Button><Button v-else @click="saveDrawer">
          {{ drawer === 'retry' ? '重新提交' : '保存修改' }}
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

