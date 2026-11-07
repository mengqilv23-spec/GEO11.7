import { describe, expect, it } from 'vitest'
import { getReportDetailData } from './report-detail-data'

describe('report detail data', () => {
  it('resolves each prototype to its own title and reporting period', () => {
    expect(getReportDetailData('weekly-2026-09-15')?.title).toBe('本周 GEO 表现与优化简报')
    expect(getReportDetailData('adhoc-2026-09-15')?.label).toBe('次报')
    expect(getReportDetailData('monthly-2026-09')?.title).toBe('9月 GEO 月度表现与复盘')
    expect(getReportDetailData('quarterly-2026-q3')?.cycle).toContain('2026 Q3')
  })

  it('marks unknown report identifiers as unavailable', () => {
    expect(getReportDetailData('not-a-report')).toBeNull()
  })
})

