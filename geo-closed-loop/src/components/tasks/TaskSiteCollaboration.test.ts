import type { GeoTask } from '../../data/geo-data'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { ensureWorkflow } from '../../workflows/task-workflow'
import TaskSiteCollaboration from './TaskSiteCollaboration.vue'

function makeTask(): GeoTask {
  return {
    id: 'T-2402',
    name: '航空采购 FAQ 与产能表 Brief',
    type: 'web',
    source: 'F3',
    strategy: 'GS10',
    persona: '航空采购',
    factor: '交付稳定性',
    methods: ['交期 FAQ', '产能表'],
    destination: '官网内容',
    progress: 'brief',
    relatedStrategies: ['GS10'],
  }
}

describe('task site collaboration layout', () => {
  it('keeps the AI task and status together as the third standalone section', () => {
    const task = makeTask()
    const workflow = ensureWorkflow(task)
    const wrapper = mount(TaskSiteCollaboration, {
      props: {
        task,
        brief: workflow.brief,
        site: workflow.site,
        methods: task.methods,
        statusLabel: '尚未进入 AI 建站协同',
        statusTone: 'neutral',
      },
    })

    expect(wrapper.findAll('.tw-site-card')).toHaveLength(1)
    expect(wrapper.get('.tw-site-header h2').text()).toBe('AI 建站执行')
    expect(wrapper.get('.tw-site-mark').text()).toBe('AI')
    expect(wrapper.get('.tw-site-body').element.children).toHaveLength(2)
    expect(wrapper.findAll('.tw-site-block')).toHaveLength(2)
    expect(wrapper.findAll('.tw-site-inner-head')).toHaveLength(0)
    expect(wrapper.get('[data-test="site-task-card"] .tw-site-column-head h3').text()).toBe('确认后提交的执行任务')
    expect(wrapper.get('[data-test="site-execution-status"] .tw-site-column-head h3').text()).toBe('执行状态')
    expect(wrapper.get('[data-test="site-task-card"]').text()).toContain('T-2402 · V1')
    expect(wrapper.findAll('.tw-site-field')).toHaveLength(6)
    expect(wrapper.get('[data-test="site-execution-status"]').attributes('aria-label')).toBe('执行状态')
    expect(wrapper.get('[data-test="site-execution-status"]').text()).toContain('等待执行')
    expect(wrapper.get('[data-test="site-execution-status"]').text()).toContain('AI 建站接收任务后')
  })

  it('shows the prototype technical-repair execution fields and uses returned status copy', () => {
    const task = makeTask()
    task.id = 'T-2501'
    task.name = '工程师专家档案实体统一与同名消歧'
    task.type = 'repair'
    task.destination = '技术修复'
    task.methods = ['作者实体', '专家档案', 'sameAs 消歧']
    task.progress = 'site_running'
    const workflow = ensureWorkflow(task)
    const wrapper = mount(TaskSiteCollaboration, {
      props: {
        task,
        brief: workflow.brief,
        site: workflow.site,
        methods: task.methods,
        statusLabel: '等待官网处理结果',
        statusTone: 'blue',
      },
    })

    expect(wrapper.get('[data-test="site-task-card"]').text()).toContain('目标站点APW 水刀切割网站')
    for (const label of ['目标页面', '变更类型', '执行内容', '事实边界', '验收条件'])
      expect(wrapper.get('[data-test="site-task-card"]').text()).toContain(label)
    expect(wrapper.get('[data-test="site-task-card"]').text()).toContain('技术修复')
    expect(wrapper.get('[data-test="site-task-card"]').text()).toContain('作者实体、专家档案、sameAs 消歧')

    task.progress = 'site_returned'
    const returned = mount(TaskSiteCollaboration, {
      props: {
        task,
        brief: workflow.brief,
        site: workflow.site,
        methods: task.methods,
        statusLabel: '官网已返回处理结果',
        statusTone: 'green',
      },
    })
    expect(returned.get('[data-test="site-execution-status"]').text()).toContain('官网已返回处理结果，详细回传内容待加载。')
    expect(returned.get('[data-test="site-execution-status"]').text()).not.toContain('正在等待官网返回')
  })
})

