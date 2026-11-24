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
  it('renders the customer website workflow from Brief to publication result without extra confirmation steps', () => {
    const flow = taskFlowFor(makeTask('web', 'brief'))

    expect(flow.map(step => step.title)).toEqual(['Task Brief 确认', '内容生成与质检', '内容审核', '检测并执行任务', '发布结果'])
    expect(flow.map(step => step.detail)).toEqual(['客户', 'Agent', '客户 + Agent', '客户 + Agent', '系统'])
    expect(flow.map(step => step.state)).toEqual(['current', 'upcoming', 'upcoming', 'upcoming', 'upcoming'])
    expect(flow.find(step => step.title === '预览链接与发布确认')).toBeUndefined()
  })

  it('maps website task progress to the matching workflow stage', () => {
    const progressStages = [
      ['running', 1],
      ['human', 2],
      ['client_review', 2],
      ['site_submit', 3],
      ['site_running', 3],
      ['site_returned', 3],
      ['site_verifying', 3],
      ['done', 4],
    ] as const

    for (const [progress, currentIndex] of progressStages) {
      const flow = taskFlowFor(makeTask('web', progress))

      expect(flow.findIndex(step => step.state === 'current'), `${progress} stage`).toBe(currentIndex)
      expect(flow).toHaveLength(5)
    }
  })

  it('keeps the customer review step current for code content', () => {
    const task = makeTask('web', 'client_review')
    task.source = 'F9'

    const flow = taskFlowFor(task)
    expect(flow.map(step => step.title)).toEqual(['Task Brief 确认', '内容生成与质检', '内容审核', '检测并执行任务', '发布结果'])
    expect(flow.findIndex(step => step.state === 'current')).toBe(2)
    expect(taskFlowFor({ ...task, progress: 'done' }).at(-1)?.state).toBe('current')
  })

  it('uses a four-step external workflow ending with content delivery', () => {
    const flow = taskFlowFor(makeTask('external', 'client_review'))

    expect(flow.map(step => step.title)).toEqual(['Task Brief 确认', '内容生成与质检', '内容审核改写', '内容交付'])
    expect(flow.map(step => step.detail)).toEqual(['客户', 'Agent', '客户 + Agent', ''])
    expect(flow.map(step => step.state)).toEqual(['done', 'done', 'current', 'upcoming'])
    expect(taskFlowFor(makeTask('external', 'site_submit')).map(step => step.state)).toEqual(['done', 'done', 'done', 'current'])
    expect(taskFlowFor(makeTask('external', 'done')).map(step => step.state)).toEqual(['done', 'done', 'done', 'current'])
  })

  it('keeps the external customer review stage aligned before delivery', () => {
    const flow = taskFlowFor(makeTask('external', 'human'))

    expect(flow.map(step => step.state)).toEqual(['done', 'done', 'current', 'upcoming'])
    expect(flow[2]?.title).toBe('内容审核改写')
    expect(flow.at(-1)?.detail).toBe('')
  })

  it('uses a three-step repair path for content-conflict repairs', () => {
    const task = makeTask('repair', 'human')
    task.source = 'F9'

    const flow = taskFlowFor(task)
    expect(flow.map(step => step.title)).toEqual(['确认修复方案', '官网执行与验证', '执行结果'])
    expect(flow.map(step => step.detail)).toEqual(['客户', 'Agent', '系统'])
    expect(flow.map(step => step.state)).toEqual(['current', 'upcoming', 'upcoming'])
  })

  it('uses a two-step automatic path for direct technical repair', () => {
    const waiting = taskFlowFor(makeTask('repair', 'site_running'))
    const returned = taskFlowFor(makeTask('repair', 'done'))

    expect(waiting.map(step => step.title)).toEqual(['AI建站处理中', '已完成处理'])
    expect(waiting.map(step => step.state)).toEqual(['current', 'upcoming'])
    expect(returned.map(step => step.state)).toEqual(['done', 'current'])
  })
})
