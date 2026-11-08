import type { AuditFinding, GeoTask, Strategy } from '../data/geo-data'
import { directRepairStatus } from './direct-repair'
import { taskStageLabel } from './task-workflow'

export function isAdviceFinding(finding: AuditFinding) {
  return finding.route === 'advice'
}

export function isKnowledgeFinding(finding: AuditFinding) {
  return finding.route === 'knowledge'
}

export function isReadOnlyFinding(finding: AuditFinding) {
  return isAdviceFinding(finding) || isKnowledgeFinding(finding)
}

/** Canonical business treatment for the five website GEO audit categories. */
export function findingTreatment(finding: AuditFinding) {
  if (finding.treatment) return finding.treatment
  if (finding.route === 'knowledge') return 'website-content-knowledge' as const
  if (finding.route === 'advice') return finding.category === '官网结构' ? 'website-tech-advice' as const : 'website-content-advice' as const
  if (finding.route === 'repair') return 'website-tech-direct' as const
  return 'website-content-review' as const
}

export function taskForFinding(finding: AuditFinding, strategies: readonly Strategy[], tasks: readonly GeoTask[]) {
  const sourceIds = new Set(finding.id.split(/\s*\/\s*/))
  const direct = tasks.find(task => task.origin !== 'buyer-coverage' && task.source.split(/[\s/·]+/).some(id => sourceIds.has(id)))
  if (direct) return direct
  const linkedStrategyIds = strategies.filter(strategy => strategy.origin === 'geo-audit' && (strategy.source.split(/\s*\/\s*/).some(id => sourceIds.has(id)) || (/专家|作者/.test(finding.title) && strategy.id === 'GS14'))).map(strategy => strategy.id)
  return tasks.find(task => linkedStrategyIds.includes(task.strategy) || task.relatedStrategies.some(id => linkedStrategyIds.includes(id)))
}

/** One display status shared by the diagnosis table and finding detail. */
export function findingStatusLabel(finding: AuditFinding, strategies: readonly Strategy[], tasks: readonly GeoTask[], clientMode = false) {
  const treatment = findingTreatment(finding)
  if (finding.status === '暂不修复') return '暂不修复'
  if (treatment === 'website-tech-advice' || treatment === 'website-content-advice') return '无需处理'
  if (treatment === 'website-content-knowledge') return '待补充知识库'
  const task = taskForFinding(finding, strategies, tasks)
  if (treatment === 'website-tech-direct') {
    const completed = task?.progress === 'done' || finding.status === '已修复'
    return directRepairStatus(completed)
  }
  if (task) return task.completionOutcome === 'expired-unexecuted' ? '任务已关闭' : task.progress === 'done' ? '已完成处理' : `已生成任务 · ${taskStageLabel(task)}`
  if (finding.status === '已修复') return '已完成处理'
  return clientMode ? '待确认' : '待专家审核'
}

export function findingRouteLabel(finding: AuditFinding, _clientMode = false) {
  const labels = {
    'website-tech-direct': '官网技术与结构 · 直接处理',
    'website-tech-advice': '官网技术与结构 · 仅提供建议',
    'website-content-review': '官网内容 · 需要审核',
    'website-content-advice': '官网内容 · 仅提供建议',
    'website-content-knowledge': '官网内容 · 待补充知识库',
  }
  return labels[findingTreatment(finding)]
}

export function findingHasTask(finding: AuditFinding, strategies: readonly import('../data/geo-data').Strategy[], tasks: readonly import('../data/geo-data').GeoTask[], _includeRepair = false) {
  const treatment = findingTreatment(finding)
  if (treatment !== 'website-content-review' && treatment !== 'website-tech-direct') return false
  return Boolean(taskForFinding(finding, strategies, tasks))
}

