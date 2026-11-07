import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { geoWorkbenchRouteContextKey } from '../composables/workbench-route-context'
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

const marketTrend = {
  rounds: [{ roundId: 31, roundNo: 3, monitorDate: '2026-10-15', isComparablePrev: null }],
  series: [{ brandType: 1, brandId: 0, brandName: 'APW', points: [{ mentionRate: 46, recommendRate: null, citationRate: 18, sovRate: 52 }] }],
}
const ownMetric = {
  brandType: 1,
  brandId: 0,
  brandName: 'APW',
  validAnswerCount: 10,
  mentionedAnswerCount: 5,
  mentionTotalCount: 5,
  mentionRate: 50,
  recommendRate: null,
  citationRate: 20,
  sovRate: 52,
  avgRank: null,
  top1Rate: null,
  top3Rate: null,
  top5Rate: null,
  factAccuracyRate: null,
  sentimentPositiveCount: null,
  sentimentNeutralCount: null,
  sentimentNegativeCount: null,
}

describe('overview page integration', () => {
  beforeEach(() => {
    api.getMarketTrend.mockReset().mockResolvedValue(marketTrend)
    api.getBrandMetrics.mockReset().mockResolvedValue([ownMetric])
    api.getRoundDetail.mockReset().mockResolvedValue({ id: 31, roundNo: 3, triggerType: 1, roundStatus: 3, monitorDate: '2026-10-15', totalSample: 10, startedAt: null, customerId: 1, siteId: 2, marketId: 3, confidenceLevel: 'high', finishedSampleCount: 10, validSample: 9, judgedCount: 9, pendingJudgeCount: 0, validReturnRate: 90, dualSourceRate: null, manualReviewRate: null, manualReviewCount: 0, repeatablePp: null, ciValue: null, finishedAt: null })
    api.getSchedule.mockReset().mockResolvedValue(null)
    api.pauseMonitoring.mockReset().mockResolvedValue(undefined)
    api.resumeMonitoring.mockReset().mockResolvedValue(undefined)
    api.getPlatformMetrics.mockReset().mockResolvedValue([
      { platform: 'chatgpt', modelVersion: null, sampleCount: 10, validAnswerCount: 9, mentionedAnswerCount: 4, mentionRate: 44.44, mentionVsPrevPp: null, citedAnswerCount: 2, citationRate: 22.22 },
    ])
    configApi.getMarkets.mockReset().mockResolvedValue([{ id: 3, marketType: 1, status: 1, marketCountry: 'de', marketLanguage: 'de', subSiteName: null }])
    configApi.getDictionary.mockReset().mockResolvedValue([{ dictValue: 'de', dictLabel: '德国', extra: null, sort: 1 }])
    configApi.getMarketPersonas.mockReset().mockResolvedValue([])
    configApi.getMarketQuestions.mockReset().mockResolvedValue([])
    configApi.getMarketThemes.mockReset().mockResolvedValue([])
    configApi.getMarketPlatforms.mockReset().mockResolvedValue([])
  })

  async function renderOverview() {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/overview', component: OverviewView },
        { path: '/visibility-monitoring', name: 'visibility-monitoring', component: { template: '<div />' } },
      ],
    })
    await router.push('/overview')
    await router.isReady()
    const wrapper = mount(RouterView, {
      global: {
        plugins: [router],
        provide: { [geoWorkbenchRouteContextKey as symbol]: {} },
      },
    })
    await flushPromises()
    return wrapper
  }

  it('loads trend and metrics for the latest backend round', async () => {
    const wrapper = await renderOverview()
    expect(api.getMarketTrend).toHaveBeenCalledWith(12)
    expect(api.getBrandMetrics).toHaveBeenCalledWith(31)
    expect(api.getPlatformMetrics).toHaveBeenCalledWith(31)
    expect(api.getRoundDetail).toHaveBeenCalledWith(31)
    expect(wrapper.get('[data-metric="soa"]').text()).toContain('50%')
    expect(wrapper.get('[data-platform="chatgpt"]').text()).toContain('44.44%')
    expect(wrapper.get('#agent-queue-title').text()).toBe('Agent 工作队列')
    expect(wrapper.findAll('.agent-queue__item')).toHaveLength(3)
    expect(wrapper.text()).toContain('发现 3 个潜在新竞品候选')
    expect(wrapper.text()).toContain('交期与产能页优化')
    expect(wrapper.text()).toContain('认证与品牌实体完善')
    expect(wrapper.findAll('.agent-queue__secondary-action')).toHaveLength(1)
    expect(wrapper.text()).not.toMatch(/42%|28%|进行中|已暂停/)
    wrapper.unmount()
  })

  it('shows an empty state if the backend has no monitoring rounds', async () => {
    api.getMarketTrend.mockResolvedValueOnce({ rounds: [], series: [] })
    const wrapper = await renderOverview()
    expect(wrapper.text()).toContain('当前市场暂无监测轮次数据。')
    expect(api.getBrandMetrics).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('shows an error and retry action rather than falling back to fixture data', async () => {
    api.getMarketTrend.mockRejectedValueOnce(new Error('服务暂不可用'))
    const wrapper = await renderOverview()
    expect(wrapper.get('[role="alert"]').text()).toContain('服务暂不可用')
    expect(wrapper.text()).not.toMatch(/42%|28%|进行中|已暂停/)
    wrapper.unmount()
  })
})

