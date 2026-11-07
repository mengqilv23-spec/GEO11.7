import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import OverviewView from './OverviewView.vue'

const api = vi.hoisted(() => ({
  getMarketTrend: vi.fn(),
  getBrandMetrics: vi.fn(),
  getPlatformMetrics: vi.fn(),
  getRoundDetail: vi.fn(),
  getSchedule: vi.fn(),
  pauseMonitoring: vi.fn(),
  resumeMonitoring: vi.fn(),
}))
const configApi = vi.hoisted(() => ({
  getMarkets: vi.fn(),
  getDictionary: vi.fn(),
  getMarketPersonas: vi.fn(),
  getMarketQuestions: vi.fn(),
  getMarketThemes: vi.fn(),
  getMarketPlatforms: vi.fn(),
}))
vi.mock('../api/monitoring', () => api)
vi.mock('../api/geo-config', () => configApi)
vi.mock('../stores/geo-context', () => ({ useGeoContextStore: () => ({ marketId: 3 }) }))

describe('overview view', () => {
  beforeEach(() => {
    api.getMarketTrend.mockReset().mockResolvedValue({ rounds: [{ roundId: 5, roundNo: 3, monitorDate: '2026-10-15', isComparablePrev: 1 }], series: [] })
    api.getBrandMetrics.mockReset().mockResolvedValue([])
    api.getPlatformMetrics.mockReset().mockResolvedValue([])
    api.getRoundDetail.mockReset().mockResolvedValue({
      id: 5,
      roundNo: 3,
      triggerType: 1,
      roundStatus: 3,
      monitorDate: '2026-10-15',
      totalSample: 48,
      startedAt: '2026-10-15 08:00:00',
      customerId: 1,
      siteId: 2,
      marketId: 3,
      confidenceLevel: 'high',
      finishedSampleCount: 48,
      validSample: 46,
      judgedCount: 44,
      pendingJudgeCount: 2,
      validReturnRate: 95.83,
      dualSourceRate: null,
      manualReviewRate: null,
      manualReviewCount: 0,
      repeatablePp: null,
      ciValue: null,
      finishedAt: '2026-10-15 08:30:00',
    })
    api.getSchedule.mockReset().mockResolvedValue({ id: 1, scheduleType: 'weekly', executeTime: '05:00', repeatCount: 1, timezone: 'Asia/Shanghai', enabled: 1, nextFireTime: null, lastFireTime: null, lastExecuteStatus: 1, lastRoundId: 5 })
    api.pauseMonitoring.mockReset().mockResolvedValue(undefined)
    api.resumeMonitoring.mockReset().mockResolvedValue(undefined)
    configApi.getMarkets.mockReset().mockResolvedValue([{ id: 3, marketType: 1, status: 1, marketCountry: 'de', marketLanguage: 'de', subSiteName: null }])
    configApi.getDictionary.mockReset().mockImplementation((type: string) => Promise.resolve([{ dictValue: 'de', dictLabel: type === 'country' ? '德国' : '德语', extra: null, sort: 1 }]))
    configApi.getMarketPersonas.mockReset().mockResolvedValue(Array.from({ length: 6 }, (_, id) => ({ id, status: 1 })))
    configApi.getMarketQuestions.mockReset().mockResolvedValue([{ intentType: 'information', status: 1 }, { intentType: 'purchase', status: 1 }])
    configApi.getMarketThemes.mockReset().mockResolvedValue(Array.from({ length: 5 }, (_, id) => ({ id, status: 1 })))
    configApi.getMarketPlatforms.mockReset().mockResolvedValue(Array.from({ length: 5 }, (_, id) => ({ id, enabled: 1 })))
  })

  it('renders the prototype current-round overview with API data', async () => {
    const wrapper = mount(OverviewView, { global: { stubs: { RouterLink: true } } })
    await flushPromises()

    expect(api.getRoundDetail).toHaveBeenCalledWith(5)
    expect(api.getSchedule).toHaveBeenCalledOnce()
    expect(wrapper.find('[aria-label="本轮监测概览"]').exists()).toBe(true)
    expect(wrapper.get('[aria-label="本轮监测概览"]').classes()).toContain('vm-round-summary--overview')
    expect(wrapper.findAll('.vm-round-summary__metrics > div')).toHaveLength(8)
    expect(wrapper.text()).toContain('2026-10-15')
    expect(wrapper.text()).toContain('德国 / 德语')
    expect(wrapper.text()).toContain('买家人设6 类')
    expect(wrapper.text()).toContain('意图2 类')
    expect(wrapper.text()).toContain('关键词5 个')
    expect(wrapper.text()).toContain('可信度高')
    expect(wrapper.text()).toContain('采样总数48')
    expect(wrapper.text()).toContain('AI 平台5 个')
    expect(wrapper.text()).not.toContain('可信度等级由服务端综合评估')
    expect(wrapper.text()).toContain('暂停监测')
    expect(wrapper.find('.vm-round-summary__trigger').exists()).toBe(false)
    wrapper.unmount()
  })
})

