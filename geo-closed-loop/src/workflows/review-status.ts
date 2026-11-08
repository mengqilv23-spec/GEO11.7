import type { GeoTask, ServiceMode, Strategy } from '../data/geo-data'
import { isTaskDeferred, isTaskIgnored, taskStageLabel } from './task-workflow'

export function pendingReviewLabel(mode: ServiceMode) {
  return mode === 'agent' ? '待确认' : '待专家审核'
}

export function taskForStrategy(strategy: Strategy, tasks: readonly GeoTask[]) {
  return tasks.find(task => task.strategy === strategy.id || task.relatedStrategies.includes(strategy.id))
}

/**
 * The diagnosis status follows the linked optimisation task. This is what makes
 * the review decision, execution and result visible from the strategy row.
 */
export function strategyReviewStatus(strategy: Strategy, tasks: readonly GeoTask[], mode: ServiceMode) {
  if (mode === 'agent' && strategy.businessGapRecorded) return '业务能力缺口'
  if (strategy.ignored) return mode === 'agent' ? '本轮已终止' : '已忽略'
  const task = taskForStrategy(strategy, tasks)
  if (task) {
    if (task.completionOutcome === 'expired-unexecuted') return '任务已关闭'
    if (task.progress === 'done') return '已完成'
    if (isTaskIgnored(task)) return '已忽略'
    if (isTaskDeferred(task)) return '已暂不处理'
    return `已生成任务 · ${taskStageLabel(task, mode)}`
  }
  if (strategy.confirmed) return '已通过'
  return pendingReviewLabel(mode)
}

/** Result-oriented action copy so the diagnosis row returns the execution outcome. */
export function strategyTaskActionLabel(task: GeoTask) {
  if (task.completionOutcome === 'expired-unexecuted') return '查看关闭记录'
  return task.progress === 'done' ? '查看结果' : '查看任务'
}
