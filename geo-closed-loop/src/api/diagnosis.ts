export interface DiagnosisPage<T> {
  records: T[]
  total: number
  size: number
  current: number
  pages: number
}

export interface DiagnosisQuery {
  siteId: string
  taskId?: number
  dataSource?: string
  taskType?: string
  severity?: string
  findingStatus?: string
  pageNum?: number
  pageSize?: number
}

export interface DiagnosisIssue {
  id: number
  taskId: number
  dataSource: string
  checkCategory: string
  findingTitle: string
  findingDesc: string
  severity: string
  taskType: string
  ruleCode: string
  pageUrl: string
  findingStatus: string
  remediation: string
  evidence: string
}

export interface DiagnosisGap {
  id: number
  taskId: number
  personaName: string
  personaStage: string
  personaFactorType: string
  personaFactorName: string
  sourceType: string
  ourCoverage: number | null
  competitorCoverage: number | null
}

export interface DiagnosisStrategy {
  id: number
  taskId: number
  strategyNo: string
  gapId: number | null
  personaName: string
  personaFactorName: string
  taskType: string
  priority: string
  strategyDesc: string
  agentMethod: string
  briefGoal: string
  briefAudience: string
  briefKnowledgeUsed: string
}

export { getDiagnosisGaps, getDiagnosisIssue, getDiagnosisIssues, getDiagnosisStrategies, getDiagnosisStrategy, updateDiagnosisFinding } from '../mock/diagnosis-service'

