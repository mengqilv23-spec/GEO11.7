import type { GeoTask, TaskProgress } from '../data/geo-data'

import { isDirectRepairTask } from './direct-repair'

export interface TaskFlowStep {
  title: string
  detail: string
  state: 'done' | 'current' | 'upcoming'
}

const websiteSteps = [
  ['Task Brief 确认', '客户'],
  ['内容生成与质检', 'Agent'],
  ['内容审核', '客户 + Agent'],
  ['检测并执行任务', '客户 + Agent'],
  ['发布结果', '系统'],
] as const

const externalSteps = [
  ['Task Brief 确认', '客户'],
  ['内容生成与质检', 'Agent'],
  ['内容审核改写', '客户 + Agent'],
  ['内容交付', ''],
] as const

const repairSteps = [
  ['确认修复方案', '客户'],
  ['官网执行与验证', 'Agent'],
  ['执行结果', '系统'],
] as const

const verificationSteps = [
  ['Task Brief 确认', '客户'],
  ['原因核查', '客户'],
  ['核查完成', '系统'],
] as const

function stageIndex(task: GeoTask): number {
  const progress = task.progress
  if (task.type === 'repair') {
    if (['brief', 'human'].includes(progress))
      return 0
    if (['done', 'site_returned', 'site_publish', 'publish', 'recheck'].includes(progress))
      return 2
    return 1
  }

  if (task.type === 'external') {
    if (progress === 'brief')
      return 0
    if (progress === 'done' || progress === 'site_submit')
      return externalSteps.length - 1
    if (['todo', 'running'].includes(progress))
      return 1
    return 2
  }

  // After the customer submits the prepared execution package, the AI website
  // build runs and returns a publish result without another preview confirmation.
  const indices: Partial<Record<TaskProgress, number>> = {
    brief: 0,
    todo: 1,
    running: 1,
    human: 2,
    client_content_review: 2,
    client_review: 2,
    site_submit: 3,
    site_submitted: 3,
    site_running: 3,
    site_returned: 3,
    site_verifying: 3,
    site_failed: 3,
    site_publish: 4,
    publish: 4,
    recheck: 4,
    done: 4,
  }
  return indices[progress] ?? 0
}

export function taskFlowFor(task: GeoTask): TaskFlowStep[] {
  if (isDirectRepairTask(task))
    return [{ title: 'AI建站处理中', detail: 'AI 建站', state: task.progress === 'done' ? 'done' : 'current' }, { title: '已完成处理', detail: '系统', state: task.progress === 'done' ? 'current' : 'upcoming' }]
  // A verification task only records a conclusion. It does not generate or
  // publish content, so it must not show the website content pipeline.
  if (task.executionKind === 'verification') {
    const current = task.progress === 'brief' ? 0 : task.progress === 'done' ? verificationSteps.length : 1
    return verificationSteps.map(([title, detail], index) => ({
      title,
      detail,
      state: index < current ? 'done' : index === current ? 'current' : 'upcoming',
    }))
  }
  const definitions = task.type === 'repair' ? repairSteps : task.type === 'external' ? externalSteps : websiteSteps
  const current = stageIndex(task)

  return definitions.map(([title, detail], index) => ({
    title,
    detail,
    state: index < current ? 'done' : index === current ? 'current' : 'upcoming',
  }))
}
