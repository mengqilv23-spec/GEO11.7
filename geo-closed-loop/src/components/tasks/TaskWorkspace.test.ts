import type { GeoWorkbenchRouteContext } from '../../composables/workbench-route-context'
import type { GeoTask, Strategy } from '../../data/geo-data'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { geoWorkbenchRouteContextKey } from '../../composables/workbench-route-context'
import { auditFindings, officialContentSnapshot } from '../../data/geo-data'
import { advanceAutomatic, applyAction, ensureWorkflow, knowledgeLibrary } from '../../workflows/task-workflow'
import TaskWorkspace from './TaskWorkspace.vue'

function makeTask(): GeoTask {
  return {
    id: 'T-2402',
    name: '航空采购 FAQ 与产能表 Brief',
    type: 'web',
    source: 'F3',
    strategy: 'GS10',
    persona: '航空采购',
    factor: '交付稳定性',
    methods: ['交期 FAQ'],
    destination: '官网内容',
    progress: 'brief',
    relatedStrategies: ['GS10'],
  }
}

function mountWorkspace(task = makeTask(), context: Partial<GeoWorkbenchRouteContext> = {}) {
  const routeContext = { openFlow: vi.fn(), ...context } as unknown as GeoWorkbenchRouteContext
  return mount(TaskWorkspace, {
    props: { task },
    global: {
      provide: { [geoWorkbenchRouteContextKey as symbol]: routeContext },
      stubs: {
        Tooltip: { template: '<div><slot /></div>' },
        Drawer: {
          props: ['open', 'title', 'eyebrow'],
          template: '<div v-if="open" data-test="drawer"><p>{{ eyebrow }}</p><h2>{{ title }}</h2><slot /><footer><slot name="footer" /></footer></div>',
        },
        DropdownSelect: {
          props: ['modelValue', 'options', 'ariaLabel'],
          emits: ['update:modelValue'],
          template: '<select :aria-label="ariaLabel || \'忽略原因\'" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option value="">请选择</option><option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option></select>',
        },
      },
    },
  })
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('task workspace brief', () => {
  it('saves the AI instruction without confirming the Brief and restores an unfinished local draft', async () => {
    const task = makeTask()
    task.id = 'T-DRAFT-TEST'
    const first = mountWorkspace(task)
    await first.get('.tw-content-basis textarea').setValue('先核对品牌资料')
    expect(window.localStorage.getItem('geo-task-draft:agent:T-DRAFT-TEST')).toContain('先核对品牌资料')
    first.unmount()

    const restored = mountWorkspace(task)
    expect((restored.get('.tw-content-basis textarea').element as HTMLTextAreaElement).value).toBe('先核对品牌资料')
    await restored.get('[data-test="save-brief-draft"]').trigger('click')
    expect(task.workflow?.brief.contentInstruction).toBe('先核对品牌资料')
    expect(task.progress).toBe('brief')
    expect(restored.findAll('.tw-brief-confirm .tw-actions button').map(button => button.text())).toEqual(['保存', '忽略', '确认并生成内容'])
    expect(window.localStorage.getItem('geo-task-draft:agent:T-DRAFT-TEST')).toBeNull()
    restored.unmount()
  })

  it('removes an AI-matched knowledge tag directly from the Brief', async () => {
    const task = reactive(makeTask())
    const flow = ensureWorkflow(task)
    flow.knowledge = [{ ...knowledgeLibrary[0]! }]
    const wrapper = mountWorkspace(task)

    expect(wrapper.get('.tw-knowledge-tag').text()).toContain(knowledgeLibrary[0]!.title)
    await wrapper.get('.tw-knowledge-tag__remove').trigger('click')

    expect(task.workflow?.knowledge).toHaveLength(0)
    expect(wrapper.find('.tw-knowledge-tag').exists()).toBe(false)
    expect(wrapper.get('.tw-content-basis__empty').text()).toContain('在您的知识库没有检索到相关资料')
    wrapper.unmount()
  })

  it('shows the current address finding and website modification scope for saved F9 tasks', () => {
    const task = makeTask()
    task.origin = 'geo-audit'
    task.source = 'F9'
    task.sourceKind = 'geo-audit-content'
    task.auditContent = { abnormality: '演示核对：旧说明', originalContent: '' }
    const wrapper = mountWorkspace(task)
    const summary = wrapper.get('.tw-brief-summary')

    expect(summary.text()).toContain('官网有关企业地址的文字描述')
    expect(summary.text()).toContain('可能使 AI 难以准确识别企业所在地')
    expect(summary.text()).toContain('官网：核对并更新企业地址相关文字描述')
    expect(summary.text()).not.toContain('演示核对：旧说明')
    wrapper.unmount()
  })

  it('uses the audited task origin rather than the source ID or title to choose the Brief summary', () => {
    const task = makeTask()
    task.origin = 'geo-audit'
    task.name = '碳纤维切割能力页缺少适用条件'
    task.source = 'FC-01'
    task.sourceKind = 'geo-audit-content'
    task.auditContent = officialContentSnapshot(auditFindings.find(item => item.id === 'FC-01')!)
    const wrapper = mountWorkspace(task)
    const summary = wrapper.get('.tw-brief-summary')

    expect(summary.text()).toContain('问题描述')
    expect(summary.text()).toContain('解决方案')
    expect(summary.text()).toContain('官网：围绕')
    expect(summary.text()).not.toContain('目标人设')
    expect(summary.text()).not.toContain('买家关注点')
    wrapper.unmount()

    task.origin = 'buyer-coverage'
    delete task.sourceKind
    delete task.auditContent
    const strategyWrapper = mountWorkspace(task)
    expect(strategyWrapper.get('.tw-brief-summary').text()).toContain('目标人设')
    expect(strategyWrapper.get('.tw-brief-summary').text()).not.toContain('解决方案')
    strategyWrapper.unmount()
  })

  it('uses the GEO audit writing summary for legacy tasks', () => {
    const task = makeTask()
    task.id = 'T-2501'
    task.origin = 'geo-audit'
    task.source = 'F8-2'
    task.name = '工程师专家档案实体统一与同名消歧'
    task.evidence = '当前作者页缺少经确认的工程师背景资料。'
    const wrapper = mountWorkspace(task)
    const summary = wrapper.get('.tw-brief-summary').text()

    expect(wrapper.get('.tw-count-badge').text()).toBe('T-2501')
    expect(summary).toContain('问题描述')
    expect(summary).toContain('解决方案')
    expect(summary).not.toContain('任务目标')
    expect(summary).not.toContain('目标人设')
    expect(summary).not.toContain('买家关注点')
    expect(summary).not.toContain('执行对象')
    wrapper.unmount()
  })

  it('shows the Brief workspace as the actual first step with customer confirmation controls', () => {
    const task = makeTask()
    ensureWorkflow(task).knowledge.push({ ...knowledgeLibrary[0]! })
    const wrapper = mountWorkspace(task)

    expect(wrapper.find('details.tw-more-details').exists()).toBe(false)
    expect(wrapper.find('.tw-confirmation').exists()).toBe(false)
    expect(wrapper.find('.tw-brief-permission').exists()).toBe(false)
    expect(wrapper.get('.tw-brief-workspace__head').text()).toContain('Task Brief 确认')
    expect(wrapper.get('.tw-brief-workspace__head').text()).toContain('V1')
    expect(wrapper.get('.tw-tabs').text()).not.toContain('生成内容')
    expect(wrapper.get('.tw-tabs').text()).toContain('Brief')
    expect(wrapper.get('.tw-gate.ready strong').text()).toBe('内容依据已准备完成')
    expect(wrapper.get('.tw-gate.ready p').text()).toBe('确认 Brief 后，Agent 将优先使用已匹配知识，并按需联网补充。')
    expect(wrapper.get('.tw-content-basis').element.contains(wrapper.get('.tw-gate.ready').element)).toBe(true)
    expect(wrapper.get('.tw-brief-workspace').find('.tw-brief-confirm').exists()).toBe(true)
    const fields = wrapper.findAll('.tw-brief--table dt')
    expect(fields.map(field => field.text())).toEqual(['任务目标', '目标人设', '买家关注点', '执行对象'])
    expect(wrapper.findAll('.tw-brief--table dd')).toHaveLength(4)
    expect(wrapper.get('.tw-brief-confirm').text()).toContain('请补充资料或说明，确认后由 AI 生成内容。')
    expect(wrapper.get('.tw-brief-confirm').text()).toContain('确认并生成内容')
    expect(wrapper.findAll('.tw-content-basis__actions button').map(button => button.text())).toEqual(['调整已有资料', '上传新资料'])
    wrapper.unmount()
  })

  it('renders the first step without an extra confirmation summary card', () => {
    const wrapper = mountWorkspace()
    const overview = wrapper.get('.tw-overview')
    const content = wrapper.get('.tw-content-panel')

    expect(wrapper.get('.tw-task-detail.is-brief').element.contains(overview.element)).toBe(true)
    expect(wrapper.get('.tw-task-detail.is-brief').element.contains(content.element)).toBe(true)
    expect(overview.get('h1').text()).toBe('航空采购 FAQ 与产能表 Brief')
    expect(overview.get('.tw-task-id').text()).toBe('F3')
    expect(overview.find('.tw-flow-steps').exists()).toBe(true)
    expect(overview.get('.tw-count-badge').text()).toBe('T-2402')
    expect(overview.find('.tw-title-line .ce-tag').exists()).toBe(true)
    expect(content.find('.tw-flow-steps').exists()).toBe(false)
    expect(content.find('.tw-confirmation').exists()).toBe(false)
    expect(content.find('.tw-brief-workspace').exists()).toBe(true)
    wrapper.unmount()
  })

  it('keeps the back navigation and task flow without role or permission controls', () => {
    const wrapper = mountWorkspace()

    expect(wrapper.find('.tw-back-button svg.lucide-arrow-left').exists()).toBe(true)
    expect(wrapper.find('[data-test="open-full-flow"]').exists()).toBe(false)
    expect(wrapper.find('.tw-permission-help').exists()).toBe(false)
    expect(wrapper.find('[data-test="workflow-role-switch"]').exists()).toBe(false)
    expect(wrapper.get('.tw-flow-head').text()).toContain('官网任务执行流程')
    expect(wrapper.get('.tw-flow-steps').text()).toContain('内容生成与质检')
    expect(wrapper.findAll('.tw-flow-steps li')).toHaveLength(5)
    expect(wrapper.text()).toContain('返回优化中心')
    wrapper.unmount()
  })

  it('renders content-basis controls and routes material actions to knowledge preparation', async () => {
    const wrapper = mountWorkspace()

    expect(wrapper.get('.tw-content-basis').text()).toContain('内容依据')
    expect(wrapper.get('.tw-content-basis').text()).toContain('AI 自动匹配')
    expect(wrapper.get('.tw-content-basis').text()).toContain('建议再补充')
    expect(wrapper.get('.tw-content-basis textarea').attributes('placeholder')).toContain('重点介绍')
    expect(wrapper.find('.tw-content-basis input[type="checkbox"]').exists()).toBe(true)
    await wrapper.get('[data-test="adjust-materials"]').trigger('click')
    expect(wrapper.get('[data-test="drawer"] h2').text()).toBe('知识资料准备')
    expect(wrapper.find('[data-test="upload-file"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('renders supplemental topics as non-interactive suggestions in a legacy Brief', () => {
    const task = makeTask()
    task.id = 'T-2502'
    task.name = '日本代理合作与本地服务说明页'
    task.factor = '代理支持 / 本地服务'
    const workflow = ensureWorkflow(task)
    Reflect.deleteProperty(workflow, 'briefStatus')
    const wrapper = mountWorkspace(task)

    expect(wrapper.findAll('.tw-suggestion-chip')).toHaveLength(4)
    const suggestions = wrapper.get('.tw-content-basis__line:nth-child(2) .tw-chip-list')
    expect(suggestions.text()).toContain('服务范围')
    expect(suggestions.element.querySelector('button')).toBeNull()
    wrapper.unmount()
  })

  it('opens the dedicated upload flow from the content-basis action', async () => {
    const wrapper = mountWorkspace()

    await wrapper.get('[data-test="upload-material"]').trigger('click')

    expect(wrapper.get('[data-test="drawer"] h2').text()).toBe('上传知识资料')
    expect(wrapper.get('[data-test="drawer"]').text()).toContain('此处只负责上传资料。上传完成后，请前往 AI 建站知识库进行内容解析；解析完成后，再从知识库刷新并选择。')
    wrapper.unmount()
  })

  it('shows the demo handoff after submitting upload details without linking an unparsed file', async () => {
    const task = makeTask()
    const wrapper = mountWorkspace(task)
    await wrapper.get('[data-test="upload-material"]').trigger('click')
    await wrapper.get('[aria-label="资料标签"]').setValue('品牌事实')
    await wrapper.get('[data-test="upload-name"]').setValue('产品规格资料')
    const input = wrapper.get('[data-test="upload-file"]')
    Object.defineProperty(input.element, 'files', {
      configurable: true,
      value: [new File(['spec'], 'product.pdf', { type: 'application/pdf' })],
    })
    await input.trigger('change')
    await wrapper.get('[data-test="upload-file-submit"]').trigger('click')

    expect(wrapper.get('[data-test="upload-staged"]').text()).toContain('文件尚未实际上传')
    expect(wrapper.get('.tw-brief-confirm').text()).toContain('已登记「产品规格资料」的上传流程')
    expect(task.workflow?.knowledge).toEqual([])
    wrapper.unmount()
  })

  it('saves the Brief draft, warns on unsaved changes, and confirms to start automatic generation', async () => {
    const task = reactive(makeTask())
    ensureWorkflow(task).knowledge.push({ ...knowledgeLibrary[0]! })
    const wrapper = mountWorkspace(task)
    await wrapper.get('.tw-content-basis textarea').setValue('重点说明日本本地服务，不编造交期承诺。')

    expect(wrapper.find('.tw-brief-confirm [data-test="ignore-task"]').exists()).toBe(true)
    expect(wrapper.find('.tw-actionbar').exists()).toBe(false)
    await wrapper.get('.tw-back-button').trigger('click')
    expect(task.progress).toBe('brief')
    expect(task.workflow?.brief.contentInstruction).toBe('')
    expect(document.body.textContent).toContain('请确认已保存修改内容')
    expect(wrapper.emitted('back')).toBeUndefined()

    await wrapper.get('[data-test="save-brief-draft"]').trigger('click')
    const confirm = wrapper.findAll('.tw-brief-confirm button').find(button => button.text().includes('确认并生成内容'))!
    await confirm.trigger('click')

    expect(task.progress).toBe('todo')
    expect(task.workflow?.briefStatus).toBe('confirmed')
    expect(task.workflow?.brief.contentInstruction).toBe('重点说明日本本地服务，不编造交期承诺。')
    expect(task.workflow?.brief.supplementalTopics).toEqual([])
    expect(task.workflow?.brief.webSupplement).toBe(true)
    expect(task.workflow?.versions.at(-1)?.brief.contentInstruction).toBe('重点说明日本本地服务，不编造交期承诺。')
    expect(task.workflow?.reviews.at(-1)?.note).toBe('确认 Brief，进入自动执行')
    wrapper.unmount()
  })

  it('ignores the Brief with an optional reason and keeps the source diagnosis intact', async () => {
    const task = makeTask()
    const wrapper = mountWorkspace(task)

    await wrapper.get('.tw-brief-confirm [data-test="ignore-task"]').trigger('click')
    expect(wrapper.get('[data-test="drawer"] h2').text()).toBe('确认忽略')
    expect(wrapper.get('[data-test="drawer"]').text()).toContain('来源诊断仍保留，官网异常不会因此变为通过。')
    expect(wrapper.get('[data-test="drawer"]').text().match(/可选/g)).toHaveLength(2)
    expect((wrapper.get('[data-test="confirm-ignore"]').element as HTMLButtonElement).disabled).toBe(false)

    await wrapper.get('[data-test="drawer"] select').setValue('Agent 判断错误 / 策略不适用')
    await wrapper.get('[data-test="ignore-explanation"]').setValue('本次目标与当前业务不匹配。')
    await wrapper.get('[data-test="confirm-ignore"]').trigger('click')

    expect(task.progress).toBe('brief')
    expect(task.source).toBe('F3')
    expect(task.strategy).toBe('GS10')
    expect(task.workflow?.ignoredTask).toMatchObject({
      stage: 'brief',
      stageLabel: 'Task Brief 确认',
      reason: 'Agent 判断错误 / 策略不适用',
      explanation: '本次目标与当前业务不匹配。',
      actor: '客户',
    })
    expect(wrapper.find('[data-test="ignore-task"]').exists()).toBe(false)
    expect(wrapper.find('.tw-brief-confirm').exists()).toBe(false)
    expect(wrapper.get('.tw-actionbar').text()).toContain('已忽略「Task Brief 确认」：Agent 判断错误 / 策略不适用。本任务不再进入后续执行。')
    expect(wrapper.get('[data-test="return-optimization"]').text()).toBe('返回优化中心')
    wrapper.unmount()
  })

  it('resumes a previously deferred review step from the action bar', async () => {
    const task = makeTask()
    task.type = 'external'
    task.progress = 'human'
    ensureWorkflow(task)
    expect(applyAction(task, 'defer_task', { ignoreReason: '其他', note: '等待客户补充认证材料。' })).toBeNull()
    const wrapper = mountWorkspace(task)

    expect(wrapper.get('.tw-actionbar').text()).toContain('已暂不处理「待客户审核」：其他')
    expect(wrapper.get('.tw-actionbar').text()).toContain('可恢复处理')
    expect(wrapper.find('.tw-actionbar [data-test="defer-task"]').exists()).toBe(false)
    expect(wrapper.get('.tw-actionbar [data-test="resume-task"]').text()).toBe('恢复处理')
    expect(wrapper.find('.tw-actionbar [data-test="ignore-task"]').exists()).toBe(true)

    await wrapper.get('.tw-actionbar [data-test="resume-task"]').trigger('click')

    expect(task.workflow?.deferredTask).toBeUndefined()
    expect(task.progress).toBe('human')
    expect(wrapper.find('.tw-actionbar [data-test="resume-task"]').exists()).toBe(false)
    expect(wrapper.find('.tw-actionbar [data-test="ignore-task"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows a top toast instead of opening knowledge preparation when both content sources are empty', async () => {
    const task = makeTask()
    ensureWorkflow(task).brief.webSupplement = false
    const wrapper = mountWorkspace(task)

    const button = wrapper.findAll('.tw-brief-confirm button').find(candidate => candidate.text().includes('确认并生成内容'))!
    await button.trigger('click')

    expect(wrapper.find('[data-test="drawer"]').exists()).toBe(false)
    expect(document.body.querySelector('[role="alert"]')?.textContent).toContain('请选择知识资料、填写补充说明或勾选联网补充')
    expect(wrapper.get('.tw-gate').text()).toContain('选择知识资料、填写补充说明或勾选联网补充')
    wrapper.unmount()
  })

  it('confirms the task when web supplementation is selected without other content sources', async () => {
    const task = makeTask()
    const wrapper = mountWorkspace(task)
    expect((wrapper.get('.tw-web-supplement input').element as HTMLInputElement).checked).toBe(true)

    const button = wrapper.findAll('.tw-brief-confirm button').find(candidate => candidate.text().includes('确认并生成内容'))!
    await button.trigger('click')

    expect(task.progress).toBe('todo')
    expect(task.workflow?.brief.webSupplement).toBe(true)
    wrapper.unmount()
  })

  it('confirms the task when the customer provides a direct AI instruction without knowledge materials', async () => {
    const task = makeTask()
    ensureWorkflow(task).brief.webSupplement = false
    const wrapper = mountWorkspace(task)
    await wrapper.get('.tw-content-basis textarea').setValue('重点介绍本地服务，不补充未经确认的承诺。')

    expect(wrapper.get('.tw-gate strong').text()).toBe('内容依据已准备完成')
    const button = wrapper.findAll('.tw-brief-confirm button').find(candidate => candidate.text().includes('确认并生成内容'))!
    await wrapper.get('[data-test="save-brief-draft"]').trigger('click')
    await button.trigger('click')

    expect(task.progress).toBe('todo')
    expect(task.workflow?.brief.contentInstruction).toBe('重点介绍本地服务，不补充未经确认的承诺。')
    wrapper.unmount()
  })

  it('confirms the task when the customer has completed all required preparation', async () => {
    const task = makeTask()
    ensureWorkflow(task).knowledge.push({ ...knowledgeLibrary[0]! })
    const wrapper = mountWorkspace(task)

    const button = wrapper.findAll('.tw-brief-confirm button').find(candidate => candidate.text().includes('确认并生成内容'))!
    expect((button.element as HTMLButtonElement).disabled).toBe(false)
    await button.trigger('click')

    expect(task.progress).toBe('todo')
    expect(task.workflow?.briefStatus).toBe('confirmed')
    wrapper.unmount()
  })
})

describe('task workspace content review', () => {
  it('hides the bottom card during automatic execution but keeps the customer review action bar', () => {
    const automaticTask = makeTask()
    automaticTask.progress = 'todo'
    ensureWorkflow(automaticTask)
    const automaticView = mountWorkspace(automaticTask)

    expect(automaticView.find('.tw-actionbar').exists()).toBe(false)
    automaticView.unmount()

    const reviewTask = makeTask()
    reviewTask.progress = 'human'
    ensureWorkflow(reviewTask)
    const reviewView = mountWorkspace(reviewTask)

    expect(reviewView.get('[data-test="approve-output"]').text()).toBe('确认最终稿')
    expect(reviewView.get('.tw-actionbar').text()).toContain('等待客户确认产物、业务事实与交付范围。')
    reviewView.unmount()
  })

  it('uses a rich-text editor for the generated content review step', async () => {
    const task = makeTask()
    task.progress = 'human'
    const flow = ensureWorkflow(task)
    flow.brief.webSupplement = true
    flow.output.body = `<h2>${task.name}</h2><p>${'航空采购 FAQ 的交付稳定性说明。'.repeat(12)}</p>`
    const wrapper = mountWorkspace(task)
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(wrapper.find('.ProseMirror').exists()).toBe(true)
    expect(wrapper.get('.ProseMirror').attributes('contenteditable')).toBe('true')
    expect(wrapper.find('.task-rich-editor__toolbar').exists()).toBe(true)
    expect(wrapper.find('button[aria-label="加粗"]').exists()).toBe(true)
    expect(wrapper.get('.tw-actionbar').text()).toContain('等待客户确认产物、业务事实与交付范围。')
    expect(wrapper.get('[data-test="approve-output"]').text()).toBe('确认最终稿')
    expect(wrapper.get('.tw-actionbar strong').text()).toBe('待客户审核')
    expect(wrapper.find('.tw-actionbar [data-test="ignore-task"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="save-inline-output"]').text()).toBe('保存正文')
    expect((wrapper.get('[data-test="save-inline-output"]').element as HTMLButtonElement).disabled).toBe(false)
    expect(wrapper.findAll('.tw-actionbar button').map(button => button.text())).toEqual([
      '忽略',
      '保存正文',
      '确认最终稿',
    ])
    expect(wrapper.find('[data-test="save-output"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="copy-output"]').exists()).toBe(false)
    expect(wrapper.get('.tw-workspace-head').text()).toContain('内容审核工作区')
    expect(wrapper.find('.tw-stage-permission').exists()).toBe(false)
    expect(wrapper.get('[data-test="review-insights"]').text()).not.toContain('段落问题')
    expect(wrapper.get('[data-test="review-insights"]').text()).not.toContain('请先补齐下方未通过的检查项。')
    expect(wrapper.get('[data-test="review-insights"]').text()).toContain('自动检查')
    expect(wrapper.get('[data-test="review-insights"]').text()).toContain('3/4 通过')
    expect(wrapper.get('[data-test="review-insights"]').text()).toContain('正文结构')
    expect(wrapper.find('[data-test="open-ai-optimize"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="regenerate-article"]').exists()).toBe(true)
    expect(wrapper.find('.tw-output-status').exists()).toBe(false)
    expect(wrapper.find('[data-test="external-claim-summary"]').exists()).toBe(false)
    expect(wrapper.get('.task-rich-editor__page').classes()).toContain('is-full-width')
    expect(wrapper.find('.tw-confirmation').exists()).toBe(false)
    expect(wrapper.find('[data-test="drawer"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="request-agent-revision"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="request-output-feedback"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('saves inline body edits from the review action bar without advancing the task', async () => {
    const task = makeTask()
    task.progress = 'human'
    const wrapper = mountWorkspace(task)
    await new Promise(resolve => setTimeout(resolve, 0))
    const proseMirror = wrapper.get('.ProseMirror')
    proseMirror.element.textContent = '客户保存后的正文'
    await proseMirror.trigger('input')

    const saveButton = wrapper.get('[data-test="save-inline-output"]')
    expect((saveButton.element as HTMLButtonElement).disabled).toBe(false)
    await saveButton.trigger('click')

    expect(task.workflow?.output.body).toContain('客户保存后的正文')
    expect(task.workflow?.output.revision).toBe(2)
    expect(task.progress).toBe('human')
    expect((wrapper.get('[data-test="save-inline-output"]').element as HTMLButtonElement).disabled).toBe(false)
    expect(wrapper.get('.tw-actionbar .tw-success').text()).toContain('保存产物修改')
    wrapper.unmount()
  })

  it('warns before leaving an edited content review and allows return after saving', async () => {
    const task = makeTask()
    task.progress = 'human'
    const wrapper = mountWorkspace(task)
    await new Promise(resolve => setTimeout(resolve, 0))
    const editor = wrapper.get('.ProseMirror')
    editor.element.textContent = '待保存的正文修改'
    await editor.trigger('input')

    await wrapper.get('.tw-back-button').trigger('click')
    expect(task.progress).toBe('human')
    expect(document.body.textContent).toContain('请确认已保存修改内容')
    expect(wrapper.emitted('back')).toBeUndefined()

    await wrapper.get('[data-test="save-inline-output"]').trigger('click')
    await wrapper.get('.tw-back-button').trigger('click')
    expect(wrapper.emitted('back')).toHaveLength(1)
    wrapper.unmount()
  })

  it('saves inline rich-text edits when the customer approves them and completes external delivery', async () => {
    const task = reactive(makeTask())
    task.type = 'external'
    task.destination = '外部内容'
    task.progress = 'client_review'
    ensureWorkflow(task).output.body = '<p>待审核的外部示例文案</p>'
    const wrapper = mountWorkspace(task)
    await new Promise(resolve => setTimeout(resolve, 0))
    const proseMirror = wrapper.get('.ProseMirror')
    proseMirror.element.textContent = '修改后的成稿'
    await proseMirror.trigger('input')
    expect(wrapper.get('[data-test="approve-output"]').text()).toBe('确认最终稿')
    await wrapper.get('[data-test="approve-output"]').trigger('click')

    expect(task.workflow?.output.body).toContain('修改后的成稿')
    expect(task.workflow?.output.revision).toBe(2)
    expect(task.progress).toBe('site_submit')
    expect(task.workflow?.reviews.at(-1)?.note).toBe('外部内容确认，等待完成交付；不跟踪外部发布 URL')
    expect(wrapper.find('[data-test="drawer"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="return-to-content-review"]').text()).toBe('返回内容审核修改')
    expect(wrapper.get('[data-test="complete-delivery"]').text()).toBe('完成')
    expect(wrapper.find('[data-test="submit-site"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="simulate-failure"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="ignore-task"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="review-insights"]').text()).toContain('自动检查')
    expect(wrapper.findAll('.tw-flow-steps li')).toHaveLength(4)
    expect(wrapper.findAll('.tw-flow-steps li strong').map(step => step.text())).toEqual(['Task Brief 确认', '内容生成与质检', '内容审核改写', '内容交付'])
    expect(wrapper.findAll('.tw-flow-steps li')[3]?.classes()).toContain('current')

    await wrapper.get('[data-test="complete-delivery"]').trigger('click')

    expect(task.progress).toBe('done')
    expect(wrapper.get('.tw-actionbar').text()).toContain('本任务已完成')
    expect(wrapper.get('[data-test="return-optimization"]').text()).toBe('返回优化中心')
    wrapper.unmount()
  })

  it('offers only approve and ignore for code content at the customer review', async () => {
    const task = makeTask()
    task.source = 'F9'
    task.progress = 'client_review'
    ensureWorkflow(task)
    const wrapper = mountWorkspace(task)
    await new Promise(resolve => setTimeout(resolve, 0))
    const notice = '请查看生成内容；内容只读，只能选择通过或忽略（不处理该任务，忽略后无法恢复该任务，可等下次诊断处理）。'

    expect(wrapper.findAll('.tw-flow-steps li')).toHaveLength(5)
    expect(wrapper.find('.tw-actionbar [data-test="defer-task"]').exists()).toBe(false)
    expect(wrapper.get('.tw-actionbar').text()).toContain(notice)
    expect(wrapper.get('.ProseMirror').attributes('contenteditable')).toBe('false')
    expect(wrapper.get('.ProseMirror pre').text()).toContain('<meta name="description"')
    expect(wrapper.get('.ProseMirror pre').text()).toContain('"@type": "Organization"')
    expect(wrapper.find('[data-test="review-insights"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="save-inline-output"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="ignore-task"]').text()).toBe('忽略')
    expect(wrapper.find('[data-test="reject-output"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="request-agent-revision"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="approve-output"]').text()).toBe('通过')

    await wrapper.get('[data-test="ignore-task"]').trigger('click')
    expect(wrapper.get('[data-test="drawer"] h2').text()).toBe('确认忽略')
    expect(wrapper.get('[data-test="drawer"]').text()).toContain('忽略后，本任务不再进入后续执行，且无法恢复')
    expect(wrapper.get('[data-test="drawer"]').text().match(/可选/g)).toHaveLength(2)
    const confirm = wrapper.get('[data-test="drawer"] footer button:last-child')
    expect(confirm.text()).toBe('确认忽略')
    expect((confirm.element as HTMLButtonElement).disabled).toBe(false)
    await confirm.trigger('click')

    expect(task.progress).toBe('client_review')
    expect(task.workflow?.ignoredTask).toMatchObject({
      stage: 'client_review',
      stageLabel: '待客户审核',
      reason: '',
      explanation: '',
      actor: '客户',
    })
    expect(wrapper.get('.tw-actionbar').text()).toContain('已忽略「待客户审核」')
    expect(wrapper.find('.tw-actionbar [data-test="ignore-task"]').exists()).toBe(false)
    expect(wrapper.find('.tw-actionbar [data-test="approve-output"]').exists()).toBe(false)
    expect(applyAction(task, 'approve_client')).toContain('已忽略')
    wrapper.unmount()
  })

  it('auto-completes code content after the customer submits the website package', () => {
    const task = makeTask()
    task.source = 'F9'
    task.progress = 'client_review'
    ensureWorkflow(task)

    expect(task.workflow?.output.body).toContain('<pre><code>')
    expect(applyAction(task, 'approve_client')).toBeNull()
    expect(task.progress).toBe('site_submit')
    expect(advanceAutomatic(task)).toBe(false)
    expect(applyAction(task, 'submit_site')).toBeNull()
    expect(task.progress).toBe('site_submitted')
    expect(advanceAutomatic(task)).toBe(true)
    expect(advanceAutomatic(task)).toBe(true)
    expect(advanceAutomatic(task)).toBe(true)
    expect(task.progress).toBe('done')
  })

  it('opens the final content preview without an extra submit confirmation', async () => {
    const task = makeTask()
    task.progress = 'site_submit'
    ensureWorkflow(task)
    const wrapper = mountWorkspace(task)
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(wrapper.get('.tw-more-details > .tw-tabs').classes()).toContain('tw-tabs--workspace')
    expect(wrapper.get('.tw-tabs button[aria-current="page"]').text()).toBe('最终稿')
    expect(wrapper.find('.ProseMirror').exists()).toBe(true)
    expect(wrapper.get('.ProseMirror').attributes('contenteditable')).toBe('false')
    expect(wrapper.find('.task-rich-editor__toolbar').exists()).toBe(false)
    expect(wrapper.get('[data-test="submit-site"]').text()).toBe('提交 AI 建站')
    expect(wrapper.get('[data-test="return-to-content-review"]').text()).toBe('返回内容审核修改')
    expect(wrapper.find('.tw-confirmation').exists()).toBe(false)
    expect(wrapper.find('[data-test="review-insights"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('shows the publish result without a preview link or extra customer confirmation', () => {
    const task = makeTask()
    task.progress = 'site_verifying'
    const flow = ensureWorkflow(task)
    flow.output.body = '<p>待发布正文</p>'
    const wrapper = mountWorkspace(task)

    const strip = wrapper.get('.tw-site-strip')
    expect(strip.text()).toContain('AI 建站正在发布')
    expect(wrapper.find('.tw-actionbar').exists()).toBe(false)
    expect(wrapper.find('.tw-preview-link').exists()).toBe(false)
    expect(wrapper.find('[data-test="confirm-publish"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="review-insights"]').exists()).toBe(false)
    wrapper.unmount()

    advanceAutomatic(task)
    expect(task.progress).toBe('done')
    const published = mountWorkspace(task)
    expect(published.get('.tw-site-strip').text()).toContain('发布成功')
    published.unmount()
  })

  it('returns a failed website verification to content review instead of publishing', async () => {
    const task = makeTask()
    task.progress = 'site_failed'
    const flow = ensureWorkflow(task)
    flow.output.body = '<p>待修改正文</p>'
    flow.site.result = '验证未通过：正文参数与已确认事实不一致。'
    flow.site.simulateFailure = true
    const wrapper = mountWorkspace(task)

    expect(wrapper.get('[data-test="return-content-review"]').text()).toBe('返回内容审核改写')
    expect(wrapper.find('[data-test="confirm-publish"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="ignore-task"]').exists()).toBe(true)
    expect(wrapper.get('.tw-site-strip').text()).toContain('验证未通过')
    expect(wrapper.find('[data-test="review-insights"]').exists()).toBe(false)

    await wrapper.get('[data-test="return-content-review"]').trigger('click')
    expect(task.progress).toBe('client_review')
    expect(task.workflow?.site.simulateFailure).toBe(false)
    expect(wrapper.find('[data-test="review-insights"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('returns the customer directly to content optimisation when AI website publish fails', async () => {
    vi.useFakeTimers()
    try {
      const task = reactive(makeTask())
      task.progress = 'site_submit'
      const flow = ensureWorkflow(task)
      flow.output.body = '<p>待发布正文</p>'
      const wrapper = mountWorkspace(task)

      await wrapper.get('[data-test="simulate-failure"]').setValue(true)
      await wrapper.get('[data-test="submit-site"]').trigger('click')
      expect(task.progress).toBe('site_submitted')

      await vi.advanceTimersByTimeAsync(5000)
      expect(task.progress).toBe('client_review')
      expect(flow.site.simulateFailure).toBe(false)
      await wrapper.vm.$nextTick()
      expect(wrapper.get('.tw-site-strip').text()).toContain('发布失败')
      expect(wrapper.get('.tw-site-strip').text()).toContain('已退回到修改板块，可以执行修改操作或重新提交')
      expect(wrapper.get('.tw-site-strip').classes()).toContain('is-failed')
      expect(wrapper.find('[data-test="return-content-review"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="review-insights"]').exists()).toBe(false)
      expect(wrapper.get('.ProseMirror').attributes('contenteditable')).toBe('true')
      wrapper.unmount()
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('shows the publish rejection only while the content is being reworked', async () => {
    const task = reactive(makeTask())
    task.progress = 'human'
    const flow = ensureWorkflow(task)
    flow.output.body = '<p>修改后的发布正文</p>'
    flow.site.result = '发布失败：执行结果与验收条件存在差异，已退回到修改板块，可以执行修改操作或重新提交。'

    const editing = mountWorkspace(task)
    expect(editing.find('.tw-site-strip').exists()).toBe(false)
    editing.unmount()

    task.progress = 'client_review'
    const review = mountWorkspace(task)
    expect(review.get('.tw-site-strip').text()).toContain('发布失败')
    expect(review.get('.tw-site-strip').text()).toContain('已退回到修改板块，可以执行修改操作或重新提交')
    expect(review.find('[data-test="review-insights"]').exists()).toBe(false)
    review.unmount()

    task.progress = 'site_submitted'
    const submitted = mountWorkspace(task)
    expect(submitted.get('.tw-site-strip').text()).toContain('执行包已提交')
    expect(submitted.get('.tw-site-strip').text()).not.toContain('发布失败')
    expect(submitted.find('[data-test="review-insights"]').exists()).toBe(false)
    submitted.unmount()
  })

  it('allows the customer to change the web supplement choice from the Brief tab during review', async () => {
    const task = makeTask()
    task.progress = 'client_review'
    ensureWorkflow(task).brief.webSupplement = true
    const wrapper = mountWorkspace(task)
    await wrapper.findAll('.tw-tabs button').find(button => button.text() === 'Brief')!.trigger('click')

    const toggle = wrapper.get('.tw-content-basis input[type="checkbox"]')
    expect((toggle.element as HTMLInputElement).disabled).toBe(false)
    await toggle.setValue(false)

    expect(task.progress).toBe('client_review')
    expect(task.workflow?.brief.webSupplement).toBe(false)
    expect(task.workflow?.reviews.at(-1)?.note).toContain('联网补充已关闭')
    expect(task.workflow?.versions.at(-1)?.note).toContain('调整联网补充设置')
    expect((wrapper.get('.tw-content-basis input[type="checkbox"]').element as HTMLInputElement).checked).toBe(false)
    wrapper.unmount()
  })

  it('shows the monitoring step and moves to the completed state only when explicitly confirmed', async () => {
    const task = makeTask()
    task.progress = 'recheck'
    ensureWorkflow(task)
    const wrapper = mountWorkspace(task)

    expect(wrapper.get('.tw-actionbar').text()).toContain('现在需要监测 Agent')
    expect(wrapper.get('.tw-actionbar').text()).toContain('等待新的监测轮次进行官网核验')
    await wrapper.get('[data-test="complete-recheck"]').trigger('click')

    expect(task.progress).toBe('done')
    expect(wrapper.get('.tw-actionbar').text()).toContain('本任务已完成')
    expect(wrapper.get('.tw-actionbar').text()).toContain('官网执行与验证已完成，可查看处理结果。')
    expect(wrapper.find('.tw-actionbar .tw-success').exists()).toBe(false)
    expect(wrapper.get('[data-test="return-optimization"]').text()).toBe('返回优化中心')
    expect(wrapper.get('[data-test="return-optimization"]').attributes('data-variant')).toBe('primary')
    expect(wrapper.find('.tw-confirmation').exists()).toBe(false)
    await wrapper.get('[data-test="return-optimization"]').trigger('click')
    expect(wrapper.emitted('back')).toHaveLength(1)
    wrapper.unmount()
  })
})

it.each(['web', 'external'] as const)('lets the customer confirm a %s Brief and review generated content in customer-only mode', async (type) => {
  vi.useFakeTimers()
  const task = reactive(makeTask())
  task.type = type
  ensureWorkflow(task).brief.webSupplement = true
  const wrapper = mountWorkspace(task)
  expect(wrapper.find('[data-test="workflow-role-switch"]').exists()).toBe(false)
  expect(wrapper.find('[data-test="adjust-materials"]').exists()).toBe(true)
  expect(wrapper.get('.tw-brief-confirm').text()).toContain('确认并生成内容')
  await wrapper.get('.tw-brief-confirm button[data-variant="primary"]').trigger('click')
  expect(task.progress).toBe('todo')
  await vi.advanceTimersByTimeAsync(3400)
  expect(task.progress).toBe('client_review')
  expect(wrapper.find('[data-test="review-insights"]').exists()).toBe(true)
  expect(wrapper.find('.task-rich-editor__ai-dock').exists()).toBe(true)
  expect(wrapper.get('.ProseMirror').attributes('contenteditable')).toBe('true')
  expect(wrapper.find('[data-test="save-inline-output"]').exists()).toBe(true)
  expect(wrapper.find('[data-test="open-ai-optimize"]').exists()).toBe(true)
  expect(wrapper.get('.tw-actionbar').text()).not.toContain('提交修改意见')
  expect(wrapper.find('[data-test="request-output-feedback"]').exists()).toBe(false)
  expect(wrapper.find('[data-test="request-agent-revision"]').exists()).toBe(false)
  await wrapper.get('[data-test="approve-output"]').trigger('click')
  expect(task.progress).toBe('site_submit')
  await wrapper.get('[data-test="return-to-content-review"]').trigger('click')
  expect(task.progress).toBe('client_review')
  await wrapper.get('[data-test="approve-output"]').trigger('click')
  expect(task.progress).toBe('site_submit')
  if (type === 'web') {
    await wrapper.get('[data-test="submit-site"]').trigger('click')
    expect(task.progress).toBe('site_submitted')
    await vi.advanceTimersByTimeAsync(5000)
  }
  else {
    await wrapper.get('[data-test="complete-delivery"]').trigger('click')
  }
  expect(task.progress).toBe('done')
  wrapper.unmount()
})

describe('repair task', () => {
  it('renders the repair detail fields, flow progress, and backend-driven result state', () => {
    const task = makeTask()
    task.id = 'T-2501'
    task.name = '工程师专家档案实体统一与同名消歧'
    task.source = 'F9'
    task.type = 'repair'
    task.destination = '技术修复'
    task.factor = '实体可信度'
    task.evidence = '正在扫描是否可复用“认证结构化、专家档案与 sameAs”修复任务。'
    task.methods = ['作者实体', '专家档案', 'sameAs 消歧']
    task.progress = 'site_running'
    const wrapper = mountWorkspace(task)

    expect(wrapper.text()).toContain('GEO 体检信息')
    expect(wrapper.text()).toContain('处理方式')
    expect(wrapper.text()).toContain('所属检查项')
    expect(wrapper.text()).toContain('当前状态')
    expect(wrapper.text()).toContain('问题描述')
    expect(wrapper.text()).toContain('为什么这样处理')
    expect(wrapper.text()).toContain('技术方案及内容')
    expect(wrapper.find('[data-test="repair-result"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('官网处理中，等待结果回传')
    expect(wrapper.text()).not.toContain('技术修复已提交官网，正在等待官网返回处理结果。')
    expect(wrapper.text()).toContain('等待官网处理结果')
    expect(wrapper.findAll('.tw-flow-steps li')).toHaveLength(3)
    expect(wrapper.findAll('.tw-flow-steps li').map(step => step.text())).toEqual(['确认修复方案', '2官网执行与验证', '3执行结果'])
    expect(wrapper.findAll('.tw-repair-section')).toHaveLength(1)
    expect(wrapper.get('.tw-task-id').text()).toBe(task.source)
    expect(wrapper.find('.tw-confirmation').exists()).toBe(false)
    expect(wrapper.find('.tw-tabs').exists()).toBe(false)
    expect(wrapper.find('.tw-actionbar').exists()).toBe(false)
    wrapper.unmount()

    task.progress = 'site_returned'
    const returned = mountWorkspace(task)
    expect(returned.find('[data-test="repair-result"]').exists()).toBe(true)
    expect(returned.text()).toContain('官网处理结果')
    expect(returned.text()).toContain('官网已返回处理结果')
    expect(returned.text()).toContain(`${task.evidence}；官网已返回处理结果。`)
    returned.unmount()
    task.workflow!.site.result = '服务端回传：已完成实体档案修复。'
    const withServerResult = mountWorkspace(task)
    expect(withServerResult.text()).toContain('服务端回传：已完成实体档案修复。')
    withServerResult.unmount()

    task.progress = 'site_failed'
    const failed = mountWorkspace(task)
    expect(failed.get('.tw-title-line .ce-tag').attributes('data-tone')).toBe('red')
    expect(failed.get('[data-test="repair-result"] .tw-repair-result-card__heading').text()).toContain('官网已返回处理结果')
    failed.unmount()
  })

  it('omits secondary permission and flow links while keeping the repair progress steps', () => {
    const task = makeTask()
    task.type = 'repair'
    task.source = 'F9'
    task.destination = '技术修复'
    task.progress = 'site_running'
    const wrapper = mountWorkspace(task)

    expect(wrapper.find('.tw-permission-help').exists()).toBe(false)
    expect(wrapper.find('[data-test="workflow-role-switch"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('官网技术修复流程')
    expect(wrapper.text()).not.toContain('查看完整流程与角色分工')
    expect(wrapper.find('.tw-flow-steps').exists()).toBe(true)
    expect(wrapper.find('.tw-flow-steps').element.getAttribute('style')).toContain('--tw-step-count: 3')
    wrapper.unmount()
  })
})

describe('verification task', () => {
  it('records the conclusion as a reminder without creating a follow-up flow', async () => {
    const task = reactive(makeTask())
    task.id = 'T-VERIFY-TEST'
    task.name = '核查：交期与产能页'
    task.executionKind = 'verification'
    task.destination = '核查记录'
    task.progress = 'human'
    task.verificationOutcome = 'add-content'
    const strategies: Strategy[] = []
    const tasks = [task]
    const flow = ensureWorkflow(task)
    flow.output.body = '已核实具备该能力，官网未介绍。'
    const wrapper = mountWorkspace(task, { strategies, tasks, findings: [] })

    expect(wrapper.get('.tw-flow-head').text()).toBe('核查任务流程')
    expect(wrapper.findAll('.tw-flow-steps li strong').map(step => step.text())).toEqual(['Task Brief 确认', '原因核查', '核查完成'])

    await wrapper.get('[data-test="verification-outcome"]').setValue('add-content')
    await wrapper.get('[data-test="verification-record"]').setValue('已核实具备该能力，官网未介绍。')
    await wrapper.get('[data-test="complete-verification"]').trigger('click')

    expect(task.progress).toBe('done')
    expect(task.verificationFollowupId).toBeUndefined()
    expect(strategies).toHaveLength(0)
    expect(tasks).toHaveLength(1)
    expect(wrapper.get('[data-test="verification-reminder"]').text()).toContain('官网具备该能力，但尚未介绍')
    expect(wrapper.get('[data-test="verification-reminder"]').text()).toContain('仅作提醒，不会自动生成后续任务或流程')
    wrapper.unmount()
  })
})
