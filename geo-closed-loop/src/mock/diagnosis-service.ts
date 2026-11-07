import type { DiagnosisGap, DiagnosisIssue, DiagnosisPage, DiagnosisQuery, DiagnosisStrategy } from '../api/diagnosis'
import type { auditFindings, strategies } from '../data/geo-data'
import { readMockState, updateMockState } from './repository'

function paginate<T>(rows: T[], query: DiagnosisQuery): DiagnosisPage<T> {
  const pageNum = query.pageNum ?? 1
  const pageSize = query.pageSize ?? 20
  return { records: rows.slice((pageNum - 1) * pageSize, pageNum * pageSize), total: rows.length, size: pageSize, current: pageNum, pages: Math.ceil(rows.length / pageSize) }
}
function issues(): DiagnosisIssue[] {
  return readMockState().diagnosis.findings.map((entry, index) => {
    const item = entry as typeof auditFindings[number]
    return { id: index + 1, taskId: 1, dataSource: 'GEO 监测', checkCategory: item.check, findingTitle: item.title, findingDesc: item.detail, severity: item.priority, taskType: item.route, ruleCode: item.id, pageUrl: 'https://www.apwwaterjet.com/solutions/composites', findingStatus: item.status, remediation: item.method, evidence: item.routeReason }
  })
}
function mockStrategies(): DiagnosisStrategy[] {
  return readMockState().diagnosis.strategies.map((entry, index) => {
    const item = entry as typeof strategies[number]
    return { id: index + 1, taskId: 1, strategyNo: item.id, gapId: null, personaName: item.persona, personaFactorName: item.factor, taskType: item.layer, priority: item.priority, strategyDesc: item.description, agentMethod: item.methods.join('、'), briefGoal: item.title, briefAudience: item.persona, briefKnowledgeUsed: item.evidence }
  })
}
export async function getDiagnosisIssues(query: DiagnosisQuery): Promise<DiagnosisPage<DiagnosisIssue>> {
  const rows = issues().filter(item => (!query.severity || item.severity === query.severity) && (!query.findingStatus || item.findingStatus === query.findingStatus) && (!query.taskType || item.taskType === query.taskType))
  return paginate(rows, query)
}
export async function getDiagnosisGaps(query: DiagnosisQuery): Promise<DiagnosisPage<DiagnosisGap>> {
  const rows = readMockState().config.personas.flatMap(persona => (persona.focusTopics.length ? persona.focusTopics : ['综合表现']).map((topic, index) => ({ id: persona.id * 10 + index, taskId: 1, personaName: persona.personaName, personaStage: persona.purchaseStages[0] ?? '供应商评估', personaFactorType: '主题', personaFactorName: topic, sourceType: '本地分析', ourCoverage: 55, competitorCoverage: 70 })))
  return paginate(rows, query)
}
export async function getDiagnosisStrategies(query: DiagnosisQuery): Promise<DiagnosisPage<DiagnosisStrategy>> { return paginate(mockStrategies(), query) }
export async function getDiagnosisIssue(id: number, _siteId: string): Promise<DiagnosisIssue> { return issues().find(item => item.id === id) ?? issues()[0]! }
export async function getDiagnosisStrategy(id: number, _siteId: string): Promise<DiagnosisStrategy> { return mockStrategies().find(item => item.id === id) ?? mockStrategies()[0]! }
export async function updateDiagnosisFinding(id: number, status: string): Promise<void> {
  updateMockState((draft) => {
    const row = draft.diagnosis.findings[id - 1] as { status?: string } | undefined
    if (row)
      row.status = status
  })
}

