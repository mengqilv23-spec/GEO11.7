import { beforeEach, describe, expect, it } from 'vitest'
import { generateLatestReport, getReportList, getReportQuota, mockReportId } from './report-service'
import { readMockState, resetMockState } from './repository'

describe('local report workflow', () => {
  beforeEach(() => resetMockState())

  it('filters report pages and reports remaining quota from local state', async () => {
    const list = await getReportList({ pageNum: 1, pageSize: 2 })
    expect(list.page.records).toHaveLength(2)
    expect(list.page.total).toBeGreaterThan(2)
    expect((await getReportQuota('ignored')).residueCount).toBe(2)
  })

  it('generates a report locally and persists it with reduced quota', async () => {
    const result = await generateLatestReport({ siteId: 'local', marketId: 1 })
    const state = readMockState()
    expect(result.status).toBe(2)
    expect(state.reports.quota).toBe(1)
    expect(state.reports.items.some(item => mockReportId(item) === Number(result.taskNo.replace('MOCK-', '')))).toBe(true)
  })
})

