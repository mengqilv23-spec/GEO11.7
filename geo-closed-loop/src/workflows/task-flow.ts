import type { GeoTask, ServiceMode, TaskProgress } from '../data/geo-data'

import { isDirectRepairTask } from './direct-repair'

export interface TaskFlowStep {
  title: string
  detail: string
  state: 'done' | 'current' | 'upcoming'
}

const websiteSteps = [
  ['Task Brief 确认', 'GEO专家'],
  ['内容生成', 'Agent执行'],
  ['内容优化', 'GEO专家+Agent执行'],
  ['内容确认', '客户审核'],
  ['检测并执行任务', 'AI 建站'],
  ['发布结果', '系统'],
] as const

const externalSteps = [
  ['Task Brief 确认', 'GEO专家'],
  ['内容生成', 'Agent 执行'],
  ['内容优化', 'GEO专家修改'],
  ['内容确认', '客户修改确认'],
] as const

const repairSteps = [
  ['提交官网', '已提交'],
  ['返回结果', '技术处理结果'],
] as const

const verificationSteps = [
  ['Task Brief 确认', '客户'],
  ['原因核查', '客户'],
  ['核查完成', '系统'],
] as const

function stageIndex(task: GeoTask, serviceMode: ServiceMode): number {
  const progress = task.progress
  if (task.type === 'repair') {
    if (['site_returned', 'site_verifying', 'site_publish', 'site_failed', 'recheck', 'done'].includes(progress))
      return 1
    if (['site_submitted', 'site_running', 'site_submit'].includes(progress))
      return 1
    return 0
  }

  if (task.type === 'external') {
    if (progress === 'brief')
      return 0
    if (progress === 'done')
      return externalSteps.length
    if (['todo', 'running'].includes(progress))
      return 1
    if (progress === 'client_content_review')
      return 1
    if (progress === 'human')
      return serviceMode === 'managed' ? 2 : 3
    if (progress === 'client_review')
      return 3
    return 2
  }

  // Website publishing is automatic: the AI website build returns a publish
  // result instead of a preview that the customer has to confirm again.
  const indices: Partial<Record<TaskProgress, number>> = {
    brief: 0,
    todo: 1,
    running: 1,
    human: 2,
    client_content_review: 3,
    client_review: 3,
    site_submit: 4,
    site_submitted: 4,
    site_running: 4,
    site_returned: 4,
    site_verifying: 4,
    site_failed: 4,
    site_publish: 5,
    publish: 5,
    recheck: 5,
    done: 5,
  }
  return indices[progress] ?? 0
}

export function taskFlowFor(task: GeoTask, serviceMode: ServiceMode = 'managed'): TaskFlowStep[] {
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
  let definitions: ReadonlyArray<readonly [string, string]> = task.type === 'repair' ? repairSteps : task.type === 'external' ? externalSteps : websiteSteps
  let current = stageIndex(task, serviceMode)
  if (serviceMode === 'agent') {
    definitions = task.type === 'repair'
      ? [['确认修复方案', '客户'], ['官网执行与验证', 'Agent'], ['执行结果', '系统']]
      : task.type === 'external'
        ? [['Task Brief 确认', '客户'], ['内容生成与质检', 'Agent'], ['内容审核改写', '客户 + Agent'], ['内容交付', '系统']]
        : [['Task Brief 确认', '客户'], ['内容生成与质检', 'Agent'], ['内容审核', '客户 + Agent'], ['检测并执行任务', 'Agent'], ['发布结果', '系统']]
    const p = task.progress
    current = task.type === 'repair'
      ? ['human', 'brief'].includes(p) ? 0 : ['done', 'site_returned'].includes(p) ? 2 : 1
      : p === 'brief' ? 0 : ['todo', 'running'].includes(p) ? 1 : ['human', 'client_review', 'client_content_review'].includes(p) ? 2 : ['site_submit', 'site_submitted', 'site_running', 'site_verifying', 'site_failed'].includes(p) ? 3 : ['site_publish', 'publish', 'recheck', 'done'].includes(p) ? definitions.length - 1 : 3
  }

  return definitions.map(([title, detail], index) => ({
    title,
    detail,
    state: index < current ? 'done' : index === current ? 'current' : 'upcoming',
  }))
}

