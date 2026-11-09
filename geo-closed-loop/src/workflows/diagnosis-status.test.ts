import type { GeoTask } from '../data/geo-data'
import { describe, expect, it } from 'vitest'
import { auditFindings, initialTasks, prototypeTasks, strategies } from '../data/geo-data'
import { diagnosisFindingStatus, diagnosisStrategyStatus } from './diagnosis-status'

function findingById(id: string) {
  return auditFindings.find(finding => finding.id === id)!
}

function taskById(id: string) {
  return [...initialTasks, ...prototypeTasks].find(task => task.id === id)!
}

function withProgress(task: GeoTask, progress: GeoTask['progress']): GeoTask {
  return { ...task, progress }
}

describe('diagnosis status', () => {
  it('keeps a finding that has not generated a task in 待审核', () => {
    expect(diagnosisFindingStatus(findingById('FC-01'), strategies, [])).toBe('待审核')
  })

  it('reports an active optimisation task as 处理中 and its completion as 已完成', () => {
    const finding = findingById('F8-2')
    const task = taskById('T-2501')
    expect(diagnosisFindingStatus(finding, strategies, [task])).toBe('处理中')
    expect(diagnosisFindingStatus(finding, strategies, [withProgress(task, 'done')])).toBe('已完成')
  })

  it('keeps a direct technical repair in 处理中 until the repair task completes', () => {
    const finding = findingById('F7-1')
    const task = taskById('T-2403')
    expect(diagnosisFindingStatus(finding, strategies, [task])).toBe('处理中')
    expect(diagnosisFindingStatus(finding, strategies, [withProgress(task, 'done')])).toBe('已完成')
  })

  it('settles advice and keeps missing knowledge pending a review', () => {
    expect(diagnosisFindingStatus(findingById('F7-3'), strategies, [])).toBe('已完成')
    expect(diagnosisFindingStatus(findingById('F8-5'), strategies, [])).toBe('待审核')
  })

  it('derives a strategy status from its optimisation task', () => {
    const strategy = strategies.find(item => item.id === 'GS1')!
    const task = taskById('T-2401')
    expect(diagnosisStrategyStatus(strategy, [])).toBe('待审核')
    expect(diagnosisStrategyStatus(strategy, [task])).toBe('处理中')
    expect(diagnosisStrategyStatus(strategy, [withProgress(task, 'done')])).toBe('已完成')
  })

  it('closes a strategy that was ignored without creating a task', () => {
    const strategy = strategies.find(item => item.id === 'GS1')!
    expect(diagnosisStrategyStatus({ ...strategy, ignored: true }, [])).toBe('已完成')
  })
})
