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
      '官网结构与技术0项',
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
      'TASK-1',
      'TASK-2',
      'TASK-3',
      'TASK-4',
      'TASK-5',
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

  it('offers only the three task statuses', () => {
    const tasks = makeTasks()
    const wrapper = mount(OptimizationContent, {
      props: { tasks, allTasks: tasks, filter: 'all', role: 'ops' },
    })

    const statusRow = wrapper.findAll('.geo-task-filter-row')[1]!
    expect(statusRow.findAll('.ce-segmented__option').map(option => option.text())).toEqual([
      '全部状态',
      '待确认 Brief',
      '处理中',
      '已完成',
    ])
    expect(wrapper.find('.geo-optimization-pending').exists()).toBe(false)
    expect(wrapper.find('.geo-action-card').exists()).toBe(false)
    wrapper.unmount()
  })

  it('maps every task progress into pending Brief, processing or done', async () => {
    const tasks: GeoTask[] = ['brief', 'site_failed', 'done'].map((progress, index) => ({
      ...initialTasks[0]!, id: `STATUS-${index}`, name: `状态任务${index}`, workflow: undefined, progress: progress as GeoTask['progress'],
    }))
    const ignored = { ...initialTasks[0]!, id: 'STATUS-IGNORED', name: '已忽略任务', progress: 'brief' as const }
    ensureWorkflow(ignored).ignoredBrief = {
      reason: '其他',
      explanation: '不再适用',
      actor: '客户',
      time: new Date().toISOString(),
    }
    const deferred = { ...initialTasks[0]!, id: 'STATUS-DEFERRED', name: '已暂不处理任务', progress: 'human' as const }
    ensureWorkflow(deferred).deferredTask = {
      stage: 'human',
      stageLabel: '运营专业审核',
      reason: '资料待补充',
      explanation: '等待客户补充材料。',
      actor: '专家',
      time: new Date().toISOString(),
    }
    tasks.push(ignored, deferred)
    const wrapper = mount(OptimizationContent, {
      props: { tasks, allTasks: tasks, filter: 'all', role: 'client' },
    })

    expect(wrapper.findAll('tbody .geo-progress').map(status => status.text())).toEqual([
      '待确认 Brief',
      '处理中',
      '已完成',
      '已完成',
      '已完成',
    ])
    await wrapper.get('input[value="done"]').setValue(true)
    expect(wrapper.findAll('tbody tr')).toHaveLength(3)
    expect(wrapper.get('tbody').text()).toContain('已忽略任务')
    expect(wrapper.get('tbody').text()).toContain('已暂不处理任务')
    wrapper.unmount()
  })

  it('counts structure and technical tasks by pending, processing and done', async () => {
    const tasks: GeoTask[] = [
      { ...initialTasks[0]!, id: 'TECH-1', name: '待处理修复', type: 'repair', workflow: undefined, progress: 'brief' },
      { ...initialTasks[0]!, id: 'TECH-2', name: '处理中修复', type: 'repair', workflow: undefined, progress: 'site_running' },
      { ...initialTasks[0]!, id: 'TECH-3', name: '已完成修复', type: 'repair', workflow: undefined, progress: 'done' },
      { ...initialTasks[0]!, id: 'TECH-4', name: '验证未通过修复', type: 'repair', workflow: undefined, progress: 'site_failed' },
      { ...initialTasks[0]!, id: 'WEB-1', name: '官网内容任务', type: 'web', workflow: undefined, progress: 'brief' },
    ]
    const wrapper = mount(OptimizationContent, {
      props: { tasks, allTasks: tasks, filter: 'all', role: 'ops' },
    })

    expect(wrapper.get('.geo-optimization-tech-stats h2').text()).toBe('官网结构与技术')
    expect(wrapper.findAll('.geo-tech-stat').map(stat => stat.text().replace(/\s/g, ''))).toEqual([
      '待我处理2项',
      '处理中1项',
      '已完成1项',
    ])
    expect(wrapper.get('.geo-optimization-tech-stats .ce-tag').text()).toBe('共 4 项')
    wrapper.unmount()
  })
})

