import { beforeEach, describe, expect, it } from 'vitest'
import { getDiagnosisGaps, getDiagnosisIssues, getDiagnosisStrategies, updateDiagnosisFinding } from './diagnosis-service'
import { readMockState, resetMockState } from './repository'

describe('local diagnosis workflow', () => {
  beforeEach(() => resetMockState())

  it('provides issue, buyer gap, and strategy lists from shared seed data', async () => {
    expect((await getDiagnosisIssues({ siteId: 'local' })).total).toBeGreaterThan(0)
    expect((await getDiagnosisGaps({ siteId: 'local' })).total).toBeGreaterThan(0)
    expect((await getDiagnosisStrategies({ siteId: 'local' })).total).toBeGreaterThan(0)
  })

  it('persists an issue status change', async () => {
    await updateDiagnosisFinding(1, '已修复')
    expect((readMockState().diagnosis.findings[0] as { status: string }).status).toBe('已修复')
  })
})

