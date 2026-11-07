import type { AuditFinding, GeoTask } from '../data/geo-data'

export function isDirectRepairFinding(finding: AuditFinding) {
  return (finding.treatment ?? (finding.route === 'repair' ? 'website-tech-direct' : undefined)) === 'website-tech-direct'
}

export function isDirectRepairTask(task: GeoTask) {
  return task.type === 'repair' && !/(^|[^A-Z0-9])F9([^0-9]|$)/.test(task.source)
}

export function directRepairStatus(done: boolean) {
  return done ? '已完成处理' : 'AI建站处理中'
}

