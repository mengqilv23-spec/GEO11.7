import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  getDiagnosisIssues: vi.fn(),
  getDiagnosisGaps: vi.fn(),
  getDiagnosisStrategies: vi.fn(),
  getDiagnosisIssue: vi.fn(),
  getDiagnosisStrategy: vi.fn(),
}))
vi.mock('../api/diagnosis', () => api)

describe('useDiagnosisData', () => {
  beforeEach(() => {
    api.getDiagnosisIssues.mockReset()
    api.getDiagnosisGaps.mockReset()
    api.getDiagnosisStrategies.mockReset()
    api.getDiagnosisIssue.mockReset()
    api.getDiagnosisStrategy.mockReset()
  })

  it('loads all diagnosis datasets from the active site without local fixtures', async () => {
    const page = { records: [{ id: 1 }], total: 1, size: 20, current: 1, pages: 1 }
    api.getDiagnosisIssues.mockResolvedValue(page)
    api.getDiagnosisGaps.mockResolvedValue({ ...page, records: [{ id: 2 }] })
    api.getDiagnosisStrategies.mockResolvedValue({ ...page, records: [{ id: 3 }] })
    const { useDiagnosisData } = await import('./use-diagnosis-data')
    const state = useDiagnosisData()

    await state.load('01a12e18-3e48-7232-b98c-283ca40ac3c2')

    expect(state.issues.value.records).toEqual([{ id: 1 }])
    expect(state.gaps.value.records).toEqual([{ id: 2 }])
    expect(state.strategies.value.records).toEqual([{ id: 3 }])
    expect(api.getDiagnosisIssues).toHaveBeenCalledWith({ siteId: '01a12e18-3e48-7232-b98c-283ca40ac3c2', pageNum: 1, pageSize: 20 })
    expect(api.getDiagnosisGaps).toHaveBeenCalledWith({ siteId: '01a12e18-3e48-7232-b98c-283ca40ac3c2', pageNum: 1, pageSize: 100 })
    expect(api.getDiagnosisStrategies).toHaveBeenCalledWith({ siteId: '01a12e18-3e48-7232-b98c-283ca40ac3c2', pageNum: 1, pageSize: 100 })
  })

  it('shows API failures and clears prior results instead of retaining stale or fixture content', async () => {
    api.getDiagnosisIssues.mockRejectedValue(new Error('会话已失效'))
    api.getDiagnosisGaps.mockResolvedValue({ records: [], total: 0, size: 100, current: 1, pages: 0 })
    api.getDiagnosisStrategies.mockResolvedValue({ records: [], total: 0, size: 100, current: 1, pages: 0 })
    const { useDiagnosisData } = await import('./use-diagnosis-data')
    const state = useDiagnosisData()

    await state.load('01a12e18-3e48-7232-b98c-283ca40ac3c2')

    expect(state.issues.value.records).toEqual([])
    expect(state.errors.value.issues).toBe('会话已失效')
    expect(state.loading.value).toBe(false)
  })

  it('does not request data without a valid site identifier', async () => {
    const { useDiagnosisData } = await import('./use-diagnosis-data')
    const state = useDiagnosisData()

    await state.load(null)

    expect(state.errors.value.issues).toContain('站点')
    expect(api.getDiagnosisIssues).not.toHaveBeenCalled()
  })

  it('loads selected issue and strategy details through their detail endpoints', async () => {
    api.getDiagnosisIssue.mockResolvedValue({ id: 5, findingTitle: 'Issue detail' })
    api.getDiagnosisStrategy.mockResolvedValue({ id: 8, strategyDesc: 'Strategy detail' })
    const { useDiagnosisData } = await import('./use-diagnosis-data')
    const state = useDiagnosisData()

    await state.loadDetail('issue', 5, '01a12e18-3e48-7232-b98c-283ca40ac3c2')
    expect(state.detail.value).toEqual({ kind: 'issue', data: { id: 5, findingTitle: 'Issue detail' } })
    await state.loadDetail('strategy', 8, '01a12e18-3e48-7232-b98c-283ca40ac3c2')
    expect(state.detail.value).toEqual({ kind: 'strategy', data: { id: 8, strategyDesc: 'Strategy detail' } })
    expect(api.getDiagnosisIssue).toHaveBeenCalledWith(5, '01a12e18-3e48-7232-b98c-283ca40ac3c2')
    expect(api.getDiagnosisStrategy).toHaveBeenCalledWith(8, '01a12e18-3e48-7232-b98c-283ca40ac3c2')
  })
})

