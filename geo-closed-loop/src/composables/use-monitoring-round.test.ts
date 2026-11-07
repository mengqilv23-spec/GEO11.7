import type { BrandMetric } from '../api/monitoring'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  getRounds: vi.fn(),
  getRoundDetail: vi.fn(),
  getBrandMetrics: vi.fn(),
  getPlatformMetrics: vi.fn(),
  getPersonaMetrics: vi.fn(),
  getQuestionHits: vi.fn(),
  getSourceDomains: vi.fn(),
  getSourcePages: vi.fn(),
}))
vi.mock('../api/monitoring', () => api)

describe('useMonitoringRound', () => {
  beforeEach(() => {
    Object.values(api).forEach(mock => mock.mockReset())
  })

  it('uses the latest server round and its snapshots without falling back to fixtures', async () => {
    api.getRounds.mockImplementation(async ({ pageNum } = {}) => pageNum === 2
      ? { records: [{ id: 18, roundNo: 3, roundStatus: 3, monitorDate: '2026-10-08', totalSample: 52 }], total: 2, pages: 2 }
      : { records: [{ id: 19, roundNo: 4, roundStatus: 3, monitorDate: '2026-10-15', totalSample: 48 }], total: 2, pages: 2 })
    api.getRoundDetail.mockImplementation(async id => id === 19
      ? { id: 19, totalSample: 60, finishedSampleCount: 48, validSample: 46, monitorDate: '2026-10-15' }
      : { id: 18, totalSample: 60, finishedSampleCount: 52, validSample: 49, monitorDate: '2026-10-08' })
    api.getBrandMetrics.mockResolvedValue([{ brandType: 1, brandId: 0, brandName: 'Brand', validAnswerCount: 46 }])
    api.getPlatformMetrics.mockResolvedValue([])
    api.getPersonaMetrics.mockResolvedValue([])
    api.getQuestionHits.mockResolvedValue([])
    api.getSourceDomains.mockResolvedValue({ records: [], total: 0 })
    api.getSourcePages.mockResolvedValue({ records: [], total: 0 })
    const { useMonitoringRound } = await import('./use-monitoring-round')
    const state = useMonitoringRound()

    await state.load()

    expect(state.round.value?.id).toBe(19)
    expect(state.detail.value?.validSample).toBe(46)
    expect(state.cumulativeSampling.value).toMatchObject({ executedCount: 100, plannedCount: 120, validCount: 95, roundCount: 2, periodStart: '2026-10-08', periodEnd: '2026-10-15', complete: true })
    expect(state.brandMetrics.value).toHaveLength(1)
    expect(api.getRounds).toHaveBeenCalledWith({ pageNum: 1, pageSize: 100 })
    expect(api.getRounds).toHaveBeenCalledWith({ pageNum: 2, pageSize: 100 })
    expect(api.getQuestionHits).toHaveBeenCalledWith(19)
  })

  it('keeps an empty backend round list empty and does not request snapshots', async () => {
    api.getRounds.mockResolvedValue({ records: [], total: 0 })
    const { useMonitoringRound } = await import('./use-monitoring-round')
    const state = useMonitoringRound()

    await state.load()

    expect(state.round.value).toBeNull()
    expect(state.empty.value).toBe(true)
    expect(api.getBrandMetrics).not.toHaveBeenCalled()
  })

  it('clears stale results and exposes errors when a snapshot request fails', async () => {
    api.getRounds.mockResolvedValue({ records: [{ id: 19, roundNo: 4, roundStatus: 3, monitorDate: '2026-10-15', totalSample: 48 }], total: 1 })
    api.getRoundDetail.mockRejectedValue(new Error('会话失效'))
    const { useMonitoringRound } = await import('./use-monitoring-round')
    const state = useMonitoringRound()
    state.brandMetrics.value = [{ brandType: 1, brandId: 0, brandName: 'stale', validAnswerCount: 1 } as BrandMetric]

    await state.load()

    expect(state.error.value).toBe('会话失效')
    expect(state.brandMetrics.value).toEqual([])
  })
})

