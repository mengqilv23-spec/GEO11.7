import type { AuditFinding, GeoTask, Strategy } from '../data/geo-data'
import { isDirectRepairFinding } from './direct-repair'
import { isAdviceFinding, isKnowledgeFinding, taskForFinding } from './finding-treatment'
import { taskForStrategy } from './review-status'
import { isTaskDeferred, isTaskIgnored } from './task-workflow'

/**
 * The diagnosis modules only expose the review loop, not the task workflow.
 * Detailed stages stay in the optimisation centre; a completed task reports
 * back as `已完成`.
 */
export type DiagnosisStatus = '待审核' | '处理中' | '已完成'

function statusFromTask(task: GeoTask | undefined): DiagnosisStatus | undefined {
  if (!task)
    return undefined
  if (task.progress === 'done' || task.completionOutcome === 'expired-unexecuted' || isTaskIgnored(task) || isTaskDeferred(task))
    return '已完成'
  return '处理中'
}

export function diagnosisFindingStatus(finding: AuditFinding, strategies: readonly Strategy[], tasks: readonly GeoTask[]): DiagnosisStatus {
  const taskStatus = statusFromTask(taskForFinding(finding, strategies, tasks))
  if (taskStatus)
    return taskStatus
  if (finding.status === '已修复' || finding.status === '暂不修复')
    return '已完成'
  // Advice is already settled; missing knowledge still needs a person before
  // the finding can be reviewed.
  if (isAdviceFinding(finding))
    return '已完成'
  if (isKnowledgeFinding(finding))
    return '待审核'
  if (isDirectRepairFinding(finding) || finding.status === '已生成策略')
    return '处理中'
  return '待审核'
}

export function diagnosisStrategyStatus(strategy: Strategy, tasks: readonly GeoTask[]): DiagnosisStatus {
  const taskStatus = statusFromTask(taskForStrategy(strategy, tasks))
  if (taskStatus)
    return taskStatus
  // Ignored items, recorded business gaps and confirmed-but-not-yet-tasked
  // strategies are already decisions rather than pending reviews.
  if (strategy.ignored || strategy.businessGapRecorded)
    return '已完成'
  if (strategy.confirmed)
    return '处理中'
  return '待审核'
}
