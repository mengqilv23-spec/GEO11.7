import type { GeoTask } from '../data/geo-data'
import { describe, expect, it } from 'vitest'
import { taskFlowFor } from './task-flow'

function makeTask(type: GeoTask['type'], progress: GeoTask['progress']): GeoTask {
  return {
    id: 'T-TEST',
    name: '测试任务',
    type,
    source: 'F1',
    strategy: 'GS1',
    persona: '采购',
    factor: '交付能力',
    methods: ['FAQ'],
    destination: type === 'external' ? '外部内容' : type === 'repair' ? '技术修复' : '官网内容',
    progress,
    relatedStrategies: ['GS1'],
  }
}

describe('taskFlowFor', () => {
  it('renders the six-stage website workflow from Brief to publication result', () => {
    const flow = taskFlowFor(makeTask('web', 'brief'))

    expect(flow.map(step => step.title)).toEqual(['Task Brief 确认', '内容生成', '内容优化', '内容确认', 'AI 建站执行发布', '发布结果'])
    expect(flow.map(step => step.detail)).toEqual(['运营', 'Agent执行', '运营 + Agent执行', '客户审核', '跨 Agent', '执行中'])
    expect(flow.map(step => step.state)).toEqual(['current', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming'])
  })

  it('maps website task progress to the matching workflow stage', () => {
    const progressStages = [
      ['running', 1],
      ['human', 2],
      ['client_review', 3],
      ['site_running', 4],
      ['site_returned', 5],
      ['done', 5],
    ] as const

    for (const [progress, currentIndex] of progressStages) {
      const flow = taskFlowFor(makeTask('web', progress))

      expect(flow.findIndex(step => step.state === 'current'), `${progress} stage`).toBe(currentIndex)
      expect(flow).toHaveLength(6)
    }
  })

  it('uses a four-step content workflow for external content', () => {
    const flow = taskFlowFor(makeTask('external', 'client_review'))

    expect(flow.map(step => step.title)).toEqual(['Task Brief 确认', '内容生成', '内容优化', '内容确认'])
    expect(flow.map(step => step.state)).toEqual(['done', 'done', 'done', 'current'])
    expect(taskFlowFor(makeTask('external', 'done')).map(step => step.state)).toEqual(['done', 'done', 'done', 'done'])
  })

  it('keeps role-specific review stages aligned within the four-step workflow', () => {
    const operationsReview = taskFlowFor(makeTask('external', 'human'), 'managed')
    const customerReview = taskFlowFor(makeTask('external', 'human'), 'agent')

    expect(operationsReview.map(step => step.state)).toEqual(['done', 'done', 'current', 'upcoming'])
    expect(customerReview.map(step => step.state)).toEqual(['done', 'done', 'current', 'upcoming'])
    expect(customerReview[2]?.title).toBe('内容审核改写')
  })

  it('keeps generated external content in customer step 2, then routes to operations step 3', () => {
    const customerReview = taskFlowFor(makeTask('external', 'client_content_review'), 'managed')
    const operationsReview = taskFlowFor(makeTask('external', 'human'), 'managed')

    expect(customerReview.map(step => step.state)).toEqual(['done', 'current', 'upcoming', 'upcoming'])
    expect(operationsReview.map(step => step.state)).toEqual(['done', 'done', 'current', 'upcoming'])
  })

  it('uses a two-step website return path and makes the returned result the current second step', () => {
    const waiting = taskFlowFor(makeTask('repair', 'site_running'))
    const returned = taskFlowFor(makeTask('repair', 'done'))

    expect(waiting.map(step => step.title)).toEqual(['AI建站处理中', '已完成处理'])
    expect(waiting.map(step => step.state)).toEqual(['current', 'upcoming'])
    expect(returned.map(step => step.state)).toEqual(['done', 'current'])
  })
})

