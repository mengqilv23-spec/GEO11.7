import type { GeoTask } from '../data/geo-data'
import { describe, expect, it } from 'vitest'
import { advanceAutomatic, applyAction, canPrepareBrief, deferredTaskFor, ensureWorkflow, getTaskBucket, hasAutomaticStep, isTaskDeferred, isTaskIgnored, knowledgeLibrary, taskStageLabel } from './task-workflow'

function makeTask(type: GeoTask['type'], progress: GeoTask['progress']): GeoTask {
  return {
    id: 'T-TEST',
    name: '任务',
    type,
    source: 'F1',
    strategy: 'GS1',
    persona: '采购',
    factor: '服务能力',
    methods: ['内容补充'],
    destination: '官网内容',
    progress,
    relatedStrategies: ['GS1'],
  }
}

describe('Brief confirmation and customer ownership', () => {
  it('describes the actual content channel and keeps verification separate from publication', () => {
    const website = makeTask('web', 'brief')
    website.name = '航空采购 FAQ 与产能表'
    expect(ensureWorkflow(website).brief.executionTarget).toBe('官网发布或更新《航空采购 FAQ 与产能表》相关内容')

    const linkedin = makeTask('external', 'brief')
    linkedin.name = 'LinkedIn 工程师专栏'
    linkedin.destination = '外部内容'
    expect(ensureWorkflow(linkedin).brief.executionTarget).toBe('领英发布《LinkedIn 工程师专栏》相关内容')

    const verification = makeTask('web', 'brief')
    verification.name = '核查：德国本地服务能力'
    verification.executionKind = 'verification'
    verification.destination = '核查记录'
    const flow = ensureWorkflow(verification)
    expect(flow.brief.executionTarget).toContain('核查「德国本地服务能力」')
    flow.brief.executionTarget = '核查记录'
    expect(ensureWorkflow(verification).brief.executionTarget).toContain('核查「德国本地服务能力」')
    flow.brief.executionTarget = '人工指定的核查对象'
    expect(ensureWorkflow(verification).brief.executionTarget).toBe('人工指定的核查对象')
  })

  it('restores editability for a saved Brief missing its status', () => {
    const task = makeTask('web', 'brief')
    const workflow = ensureWorkflow(task)
    Reflect.deleteProperty(workflow, 'briefStatus')

    expect(ensureWorkflow(task).briefStatus).toBe('ready')
    expect(canPrepareBrief(task)).toBe(true)
  })

  it('lets the customer add instructions without changing AI-defined goals or methods', () => {
    const task = makeTask('web', 'brief')
    const flow = ensureWorkflow(task)
    const payload = { brief: { ...flow.brief, contentInstruction: '使用已确认服务范围' }, methods: [...task.methods], knowledge: [{ ...knowledgeLibrary[0]! }] }

    expect(applyAction(task, 'save_brief', payload)).toBeNull()
    expect(flow.brief.contentInstruction).toBe('使用已确认服务范围')
    expect(applyAction(task, 'save_brief', { ...payload, methods: ['未经确认的方法'] })).toContain('任务目标和专业方法由 AI 生成')
    expect(applyAction(task, 'save_brief', { ...payload, brief: { ...payload.brief, goal: '替换目标' } })).toContain('任务目标和专业方法由 AI 生成')
  })

  it('requires a content source before the customer confirms the Brief', () => {
    const task = makeTask('web', 'brief')
    ensureWorkflow(task).brief.webSupplement = false

    expect(applyAction(task, 'confirm_brief')).toContain('选择知识资料、填写补充说明或勾选联网补充')
    expect(task.progress).toBe('brief')

    task.workflow!.brief.contentInstruction = '重点介绍本地服务，不补充未经确认的承诺。'
    expect(applyAction(task, 'confirm_brief')).toBeNull()
    expect(task.progress).toBe('todo')
  })

  it('allows web supplementation to satisfy the content-source requirement', () => {
    const task = makeTask('web', 'brief')
    ensureWorkflow(task).brief.webSupplement = true

    expect(applyAction(task, 'confirm_brief')).toBeNull()
    expect(task.progress).toBe('todo')
  })

  it('sends verification Briefs straight to customer verification', () => {
    const task = makeTask('web', 'brief')
    task.executionKind = 'verification'
    ensureWorkflow(task)

    expect(applyAction(task, 'confirm_brief')).toBeNull()
    expect(task.progress).toBe('human')
    expect(taskStageLabel(task)).toBe('待客户核查')
  })

  it('lets the customer ignore a Brief without a reason and records the decision', () => {
    const task = makeTask('web', 'brief')
    const flow = ensureWorkflow(task)

    expect(applyAction(task, 'ignore_task')).toBeNull()

    expect(flow.ignoredTask).toMatchObject({ reason: '', explanation: '', actor: '客户' })
    expect(flow.ignoredBrief).toMatchObject({ reason: '', explanation: '' })
    expect(flow.reviews.at(-1)?.note).toBe('忽略本次审核事项')
    expect(getTaskBucket(task)).toBe('ignored')
    expect(taskStageLabel(task)).toBe('已忽略')
  })

  it('migrates saved Brief ignore records to the shared ignored-step state', () => {
    const task = makeTask('web', 'brief')
    const flow = ensureWorkflow(task)
    flow.ignoredBrief = { reason: '事实 / 证据不足', explanation: '旧记录', actor: '客户', time: '2026-10-13T00:00:00.000Z' }

    expect(ensureWorkflow(task).ignoredTask).toMatchObject({ stage: 'brief', stageLabel: 'Task Brief 确认', reason: '事实 / 证据不足' })
    expect(isTaskIgnored(task)).toBe(true)
  })
})

describe('customer content review and publishing', () => {
  it('waits for customer submission after approval and completes on the simulated success result', () => {
    const task = makeTask('web', 'client_review')
    const flow = ensureWorkflow(task)

    expect(applyAction(task, 'approve_client')).toBeNull()
    expect(task.progress).toBe('site_submit')
    expect(flow.site.attempts).toBe(0)
    expect(flow.site.requirements).toContain(flow.brief.executionTarget)
    expect(advanceAutomatic(task)).toBe(false)

    expect(applyAction(task, 'submit_site')).toBeNull()
    expect(task.progress).toBe('site_submitted')
    expect(flow.site.attempts).toBe(1)

    expect(advanceAutomatic(task)).toBe(true)
    expect(advanceAutomatic(task)).toBe(true)
    expect(advanceAutomatic(task)).toBe(true)

    expect(task.progress).toBe('done')
    expect(flow.site.result).toContain('发布成功')
    expect(flow.reviews.at(-1)?.note).toContain('发布成功')
    expect(getTaskBucket(task)).toBe('done')
  })

  it('lets the customer return to content review before submitting the website package', () => {
    const task = makeTask('web', 'client_review')
    ensureWorkflow(task)

    expect(applyAction(task, 'approve_client')).toBeNull()
    expect(task.progress).toBe('site_submit')

    expect(applyAction(task, 'return_content_review')).toBeNull()
    expect(task.progress).toBe('client_review')
    expect(applyAction(task, 'approve_client')).toBeNull()
    expect(task.progress).toBe('site_submit')
  })

  it('completes external content only after the delivery gate without tracking a publish URL', () => {
    const task = makeTask('external', 'client_review')
    const flow = ensureWorkflow(task)

    expect(applyAction(task, 'approve_client')).toBeNull()
    expect(task.progress).toBe('site_submit')
    expect(flow.url).toBe('')
    expect(flow.site.attempts).toBe(0)
    expect(flow.reviews.at(-1)?.note).toContain('外部内容确认')

    expect(applyAction(task, 'return_content_review')).toBeNull()
    expect(task.progress).toBe('client_review')
    expect(applyAction(task, 'approve_client')).toBeNull()
    expect(task.progress).toBe('site_submit')

    expect(applyAction(task, 'complete_delivery')).toBeNull()
    expect(task.progress).toBe('done')
    expect(flow.url).toBe('')
    expect(flow.site.attempts).toBe(0)
    expect(flow.reviews.at(-1)?.note).toContain('完成外部内容交付')
  })

  it('rejects completing delivery for a website execution package', () => {
    const task = makeTask('web', 'site_submit')
    ensureWorkflow(task)

    expect(applyAction(task, 'complete_delivery')).toContain('仅待完成的外部内容')
    expect(task.progress).toBe('site_submit')
  })

  it('rejects approval when the generated body is empty', () => {
    const task = makeTask('web', 'client_review')
    const flow = ensureWorkflow(task)
    flow.output.body = ''

    expect(applyAction(task, 'approve_client')).toContain('请由客户审核完整产物')
    expect(task.progress).toBe('client_review')
  })

  it('keeps the generated title out of the body', () => {
    const task = makeTask('web', 'running')
    const flow = ensureWorkflow(task)

    expect(advanceAutomatic(task)).toBe(true)
    expect(task.progress).toBe('client_review')
    expect(flow.output.title).toBe('任务')
    expect(flow.output.body.startsWith('<h2>任务</h2>')).toBe(false)
    expect(flow.output.body.startsWith('<p>任务')).toBe(false)
    expect(flow.output.body).toContain('<h2>执行范围</h2>')
  })

  it('removes only a legacy duplicated title heading from saved output', () => {
    const task = makeTask('web', 'client_review')
    const flow = ensureWorkflow(task)
    flow.output.body = '<h2>任务</h2><p>正文</p><h2>执行范围</h2><p>范围</p>'

    ensureWorkflow(task)

    expect(flow.output.body).toBe('<p>正文</p><h2>执行范围</h2><p>范围</p>')
  })

  it('removes the legacy title echo from a saved generated body', () => {
    const task = makeTask('web', 'client_review')
    const flow = ensureWorkflow(task)
    flow.output.body = '<p>任务。本稿依据已确认的 Brief 与已选知识资料整理，涉及参数、认证、交期和服务承诺的内容发布前需要逐项核对。</p><h2>执行范围</h2><p>范围</p>'

    ensureWorkflow(task)

    expect(flow.output.body.startsWith('<p>本稿依据已确认的 Brief')).toBe(true)
    expect(flow.output.body).not.toContain('<p>任务。')
    expect(flow.output.body).toContain('<h2>执行范围</h2><p>范围</p>')
  })

  it('lets the customer adjust web supplementation during content preparation and review', () => {
    const preparing = makeTask('web', 'todo')
    const preparingFlow = ensureWorkflow(preparing)
    expect(applyAction(preparing, 'update_web_supplement', { webSupplement: false })).toBeNull()
    expect(preparingFlow.brief.webSupplement).toBe(false)
    expect(preparing.progress).toBe('todo')

    const reviewing = makeTask('web', 'client_review')
    const reviewingFlow = ensureWorkflow(reviewing)
    reviewingFlow.brief.webSupplement = true
    const versionsBefore = reviewingFlow.versions.length
    expect(applyAction(reviewing, 'update_web_supplement', { webSupplement: false })).toBeNull()
    expect(reviewingFlow.brief.webSupplement).toBe(false)
    expect(reviewingFlow.versions).toHaveLength(versionsBefore + 1)
    expect(reviewingFlow.reviews.at(-1)?.note).toContain('联网补充已关闭')
  })

  it('rolls a failed website publish straight back to customer content review', () => {
    const task = makeTask('web', 'site_verifying')
    const flow = ensureWorkflow(task)
    flow.site.simulateFailure = true

    expect(advanceAutomatic(task)).toBe(true)
    expect(task.progress).toBe('client_review')
    expect(flow.site.result).toContain('发布失败')
    expect(flow.site.result).toContain('已退回到修改板块，可以执行修改操作或重新提交')
    expect(flow.site.simulateFailure).toBe(false)
    expect(hasAutomaticStep(task)).toBe(false)
  })

  it('rewrites the legacy return copy when restoring a saved workflow', () => {
    const task = makeTask('web', 'client_review')
    const flow = ensureWorkflow(task)
    flow.site.result = '发布失败：执行结果与验收条件存在差异，已退回内容优化。'

    ensureWorkflow(task)

    expect(flow.site.result).toBe('发布失败：执行结果与验收条件存在差异，已退回到修改板块，可以执行修改操作或重新提交。')
  })

  it('returns a failed repair from customer review to content editing, then allows republish', () => {
    const task = makeTask('repair', 'client_review')
    task.source = 'F9'
    const flow = ensureWorkflow(task)
    flow.site.simulateFailure = true
    flow.output.body = '<h2>修复说明</h2><p>等待确认。</p>'
    task.progress = 'site_verifying'

    expect(advanceAutomatic(task)).toBe(true)
    expect(task.progress).toBe('site_failed')
    expect(flow.site.attempts).toBe(0)
  })

  it('supports retry after a repair publish failure', () => {
    const task = makeTask('repair', 'human')
    task.source = 'F9'
    const flow = ensureWorkflow(task)
    expect(hasAutomaticStep(task)).toBe(false)
    expect(applyAction(task, 'submit_site', { simulateFailure: true })).toBeNull()
    for (let i = 0; i < 3; i++) advanceAutomatic(task)
    expect(task.progress).toBe('site_failed')

    expect(applyAction(task, 'retry_site', { note: '仅更新已确认的结构字段', simulateFailure: false })).toBeNull()
    for (let i = 0; i < 3; i++) advanceAutomatic(task)
    expect(task.progress).toBe('done')
    expect(flow.site.attempts).toBe(2)
    expect(flow.site.requirements).toContain('仅更新已确认的结构字段')
  })

  it('keeps Re-check waiting for an explicit monitoring completion action', () => {
    const task = makeTask('web', 'recheck')
    const flow = ensureWorkflow(task)

    expect(hasAutomaticStep(task)).toBe(false)
    expect(applyAction(task, 'complete_recheck')).toBeNull()
    expect(task.progress).toBe('done')
    expect(flow.reviews.at(-1)?.note).toContain('完成本次官网核验')
  })
})

describe('ignoring and deferring a task step', () => {
  it('lets the current step owner ignore a later step and records which step was ignored', () => {
    const task = makeTask('web', 'human')
    const flow = ensureWorkflow(task)

    expect(applyAction(task, 'ignore_task', { ignoreReason: '事实 / 证据不足', note: '当前阶段资料不足。' })).toBeNull()

    expect(flow.ignoredTask).toMatchObject({
      stage: 'human',
      stageLabel: '待客户审核',
      reason: '事实 / 证据不足',
      explanation: '当前阶段资料不足。',
      actor: '客户',
    })
    expect(getTaskBucket(task)).toBe('ignored')
    expect(taskStageLabel(task)).toBe('已忽略')
  })

  it('rejects ignoring terminal tasks and repeating an ignored decision', () => {
    const task = makeTask('web', 'human')
    ensureWorkflow(task)

    expect(applyAction(task, 'ignore_task', { note: '说明' })).toBeNull()
    expect(applyAction(task, 'ignore_task', { note: '再次忽略' })).toContain('已忽略')

    const completed = makeTask('web', 'done')
    ensureWorkflow(completed)
    expect(applyAction(completed, 'ignore_task', { note: '说明' })).toContain('已完成')
  })

  it('prevents an ignored automatic step from resuming or advancing', () => {
    const task = makeTask('web', 'running')
    ensureWorkflow(task)

    expect(applyAction(task, 'ignore_task', { note: '本次不再执行。' })).toBeNull()
    expect(hasAutomaticStep(task)).toBe(false)
    expect(advanceAutomatic(task)).toBe(false)
    expect(task.progress).toBe('running')
  })

  it('keeps the current progress when deferring and resumes later without a required reason', () => {
    const task = makeTask('web', 'brief')
    const flow = ensureWorkflow(task)

    expect(applyAction(task, 'defer_task')).toBeNull()

    expect(flow.deferredTask).toMatchObject({ stage: 'brief', stageLabel: 'Task Brief 确认', reason: '', explanation: '', actor: '客户' })
    expect(isTaskDeferred(task)).toBe(true)
    expect(canPrepareBrief(task)).toBe(false)
    expect(getTaskBucket(task)).toBe('deferred')
    expect(taskStageLabel(task)).toBe('已暂不处理')
    expect(applyAction(task, 'confirm_brief')).toContain('请先恢复处理')
    expect(advanceAutomatic(task)).toBe(false)

    expect(applyAction(task, 'resume_task')).toBeNull()
    expect(isTaskDeferred(task)).toBe(false)
    expect(canPrepareBrief(task)).toBe(true)
    expect(task.progress).toBe('brief')
  })

  it('can still be terminally ignored after deferring', () => {
    const task = makeTask('web', 'human')
    const flow = ensureWorkflow(task)
    expect(applyAction(task, 'defer_task')).toBeNull()

    expect(applyAction(task, 'ignore_task', { ignoreReason: '不再执行', note: '确认不处理。' })).toBeNull()

    expect(flow.deferredTask).toBeUndefined()
    expect(flow.ignoredTask).toMatchObject({ stage: 'human', stageLabel: '待客户审核', reason: '不再执行' })
    expect(isTaskDeferred(task)).toBe(false)
    expect(isTaskIgnored(task)).toBe(true)
    expect(getTaskBucket(task)).toBe('ignored')
    expect(applyAction(task, 'defer_task')).toContain('已忽略')
  })

  it('rejects resuming a task that is not deferred and deferring a completed task', () => {
    const active = makeTask('web', 'human')
    ensureWorkflow(active)
    expect(applyAction(active, 'resume_task')).toContain('不能恢复处理')

    const completed = makeTask('web', 'done')
    ensureWorkflow(completed)
    expect(applyAction(completed, 'defer_task')).toContain('已完成')
  })

  it('removes the deferred record so the same step can be reviewed normally', () => {
    const task = makeTask('web', 'human')
    ensureWorkflow(task)
    expect(applyAction(task, 'defer_task', { ignoreReason: '资料待补充', note: '等待客户补充认证材料。' })).toBeNull()

    expect(deferredTaskFor(task)?.stageLabel).toBe('待客户审核')
    expect(applyAction(task, 'approve_client')).toContain('请先恢复处理')
    expect(applyAction(task, 'resume_task')).toBeNull()
    expect(deferredTaskFor(task)).toBeUndefined()
    expect(applyAction(task, 'approve_client')).toBeNull()
  })
})

describe('automatic execution', () => {
  it('automatically completes direct repair without approval', () => {
    const task = makeTask('repair', 'human')
    ensureWorkflow(task)
    expect(hasAutomaticStep(task)).toBe(true)
    expect(applyAction(task, 'submit_site')).toContain('无需人工操作')
    expect(taskStageLabel(task)).toBe('AI建站处理中')
    advanceAutomatic(task)
    expect(task.progress).toBe('site_running')
    advanceAutomatic(task)
    expect(taskStageLabel(task)).toBe('已完成处理')
    expect(getTaskBucket(task)).toBe('done')
    expect(hasAutomaticStep(task)).toBe(false)
  })

  it('normalizes legacy repair execution fields to the technical-repair package', () => {
    const task = makeTask('repair', 'site_running')
    const workflow = ensureWorkflow(task)
    workflow.site.targetPage = '目标内容页'
    workflow.site.changeType = '官网内容新增 / 更新'
    workflow.site.factBoundary = '使用客户终审版本；不得扩写未确认的价格、交期、认证和服务承诺'

    const normalized = ensureWorkflow(task)

    expect(normalized.site.targetPage).toBe('相关官网页面 / 全站实体配置')
    expect(normalized.site.changeType).toBe('技术修复')
    expect(normalized.site.factBoundary).toBe('不得改写已确认的企业、认证与产品事实')
  })
})
