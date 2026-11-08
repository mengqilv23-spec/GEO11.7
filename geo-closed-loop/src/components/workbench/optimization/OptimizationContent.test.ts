import type { GeoTask } from '../../../data/geo-data'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { initialTasks } from '../../../data/geo-data'
import { ensureWorkflow } from '../../../workflows/task-workflow'
import OptimizationContent from './OptimizationContent.vue'

function makeTasks(): GeoTask[] {
  return Array.from({ length: 6 }, (_, index) => ({
    ...initialTasks[index % initialTasks.length]!,
    id: `TASK-${index + 1}`,
    name: `任务 ${index + 1}`,
  }))
}

describe('optimization content task table', () => {
  it('removes the optimization-window selector and aggregates every window', () => {
    const tasks = makeTasks().slice(0, 2).map((task, index) => ({
      ...task,
      type: index === 0 ? 'web' as const : 'external' as const,
      strategyWindow: index === 0 ? '09/14–09/20' : '09/21–09/27',
    }))
    const wrapper = mount(OptimizationContent, {
      props: { tasks: [tasks[0]!], allTasks: tasks, filter: 'all', role: 'ops' },
    })

    expect(wrapper.find('.geo-optimization-period').exists()).toBe(false)
    expect(wrapper.findAll('.geo-task-metric').map(card => card.text().replace(/\s/g, ''))).toEqual([
      '全部任务2项',
      '官网内容1项',
      '外部内容1项',
      '基础修复0项',
    ])
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    wrapper.unmount()
  })

  it('shows the unified page help icon with the requested explanation', () => {
    const tasks = makeTasks()
    const wrapper = mount(OptimizationContent, {
      props: { tasks, allTasks: tasks, filter: 'all', role: 'ops' },
    })

    expect(wrapper.get('.geo-page-intro h1 .overview-info-icon').attributes('aria-label')).toBe('优化中心说明')
    expect(wrapper.find('.geo-page-description').exists()).toBe(false)
    wrapper.unmount()
  })

  it('uses the prototype columns and shows a compact pagination summary', () => {
    const tasks = makeTasks()
    const wrapper = mount(OptimizationContent, {
      props: { tasks, allTasks: tasks, filter: 'all', role: 'ops' },
    })

    expect(wrapper.findAll('thead th').map(header => header.text())).toEqual([
      '序号',
      '任务',
      '任务类型',
      '来源',
      '任务状态',
      '操作',
    ])
    expect(wrapper.findAll('tbody tr td:first-child').map(cell => cell.text())).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
    ])
    expect(wrapper.get('thead th:nth-child(1)').attributes('style')).toContain('width: 4%')
    expect(wrapper.get('thead th:nth-child(1)').attributes('style')).toContain('min-width: 44px')
    expect(wrapper.get('thead th:nth-child(6)').attributes('style')).toContain('width: 9%')
    expect(wrapper.get('thead th:nth-child(6)').attributes('style')).toContain('min-width: 112px')
    expect(wrapper.get('.geo-task-pagination .pagination__summary').text()).toBe('共 6 条 · 第 1 / 2 页')
    expect(wrapper.get('.geo-task-pagination').attributes('data-size')).toBe('sm')
    expect(wrapper.get('.geo-task-detail-button').text()).toBe('确认 Brief')
    expect(wrapper.get('.geo-task-detail-button').classes()).toContain('geo-table-detail-button')
    wrapper.unmount()
  })

  it('removes ignored Briefs from pending cards and exposes a dedicated ignored filter', async () => {
    const task = { ...initialTasks[0]!, id: 'TASK-IGNORED', name: '已忽略任务', progress: 'brief' as const }
    ensureWorkflow(task).ignoredBrief = {
      reason: '其他',
      explanation: '不再适用',
      actor: '客户',
      time: new Date().toISOString(),
    }
    const tasks = [task]
    const wrapper = mount(OptimizationContent, {
      props: { tasks, allTasks: tasks, filter: 'all', role: 'client' },
    })

    expect(wrapper.find('.geo-action-card').exists()).toBe(false)
    expect(wrapper.get('.geo-optimization-no-pending').text()).toBe('当前暂无待处理任务')
    expect(wrapper.get('tbody').text()).toContain('已忽略')
    await wrapper.get('input[value="ignored"]').trigger('change')
    expect(wrapper.get('tbody').text()).toContain('已忽略任务')

    wrapper.unmount()
  })

  it('removes deferred tasks from pending cards and exposes a dedicated deferred filter', async () => {
    const task = { ...initialTasks[0]!, id: 'TASK-DEFERRED', name: '已暂不处理任务', progress: 'human' as const }
    ensureWorkflow(task).deferredTask = {
      stage: 'human',
      stageLabel: '运营专业审核',
      reason: '资料待补充',
      explanation: '等待客户补充材料。',
      actor: '专家',
      time: new Date().toISOString(),
    }
    const tasks = [task]
    const wrapper = mount(OptimizationContent, {
      props: { tasks, allTasks: tasks, filter: 'all', role: 'ops' },
    })

    expect(wrapper.find('.geo-action-card').exists()).toBe(false)
    expect(wrapper.get('.geo-optimization-no-pending').text()).toBe('当前暂无待处理任务')
    expect(wrapper.get('tbody').text()).toContain('已暂不处理')
    await wrapper.get('input[value="deferred"]').trigger('change')
    expect(wrapper.get('tbody').text()).toContain('已暂不处理任务')

    wrapper.unmount()
  })
})


it.each([
  ['managed', 'ops', 2],
  ['managed', 'client', 1],
  ['agent', 'client', 3],
  ['agent', 'ops', 0],
] as const)('counts only tasks owned by the current reviewer in %s/%s', async (mode, role, expected) => {
  const tasks: GeoTask[] = ['brief', 'human', 'client_review', 'running', 'done'].map((progress, index) => ({
    ...initialTasks[0]!, id: `ROLE-${index}`, name: `角色任务${index}`, type: 'web', workflow: undefined, progress: progress as GeoTask['progress'],
  }))
  tasks.push({ ...tasks[0]!, id: 'REPAIR', type: 'repair', source: 'F7-1', progress: 'human' })
  const wrapper = mount(OptimizationContent, { props: { tasks, allTasks: tasks, filter: 'all', role, serviceMode: mode } })
  expect(wrapper.get('.geo-my-tasks-count').text()).toBe(String(expected))
  expect(wrapper.findAll('.geo-action-card').every(card => !card.text().includes('暂无待办'))).toBe(true)
  if (mode === 'managed' && role === 'ops') {
    await wrapper.findAll('.geo-action-card').find(card => card.text().includes('审核内容'))!.trigger('click')
    expect(wrapper.emitted('openTask')?.[0]?.[0]).toMatchObject({ id: 'ROLE-1' })
  }
  wrapper.unmount()
})

