import { describe, expect, it } from 'vitest'
import { createDemoReport, filterReports, initialReports } from './report-center-data'

describe('report center demo data', () => {
  it('filters reports by type and returns the newest reports first', () => {
    expect(filterReports(initialReports, 'all').map(report => report.id)).toEqual([
      'weekly-2026-09-15',
      'monthly-2026-09',
      'adhoc-2026-09-12',
      'quarterly-2026-q3',
      'weekly-2026-09-08',
    ])
    expect(filterReports(initialReports, 'weekly')).toHaveLength(2)
    expect(filterReports(initialReports, 'monthly').map(report => report.id)).toEqual(['monthly-2026-09'])
    expect(filterReports(initialReports, 'quarterly').map(report => report.id)).toEqual(['quarterly-2026-q3'])
    expect(filterReports(initialReports, 'adhoc').map(report => report.id)).toEqual(['adhoc-2026-09-12'])
    expect(filterReports(initialReports, 'monthly').map(report => report.date)).toEqual(['2026-09-14'])
  })

  it('returns an empty result for a report type with no matches', () => {
    expect(filterReports([], 'weekly')).toEqual([])
  })

  it('creates a local demo report and consumes one available quota use', () => {
    const generated = createDemoReport(initialReports, 2, new Date('2026-10-10T12:00:00'))

    expect(generated.quota).toBe(1)
    expect(generated.report?.status).toBe('generated')
    expect(generated.report?.summary).toContain('演示')
    expect(generated.reports[0]).toEqual(generated.report)
    expect(generated.reports).toHaveLength(initialReports.length + 1)
  })

  it('does not create a report or decrement an exhausted quota', () => {
    const generated = createDemoReport(initialReports, 0, new Date('2026-10-10T12:00:00'))

    expect(generated).toEqual({ reports: initialReports, quota: 0, report: null })
  })
})

