import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGeoContextStore } from '../stores/geo-context'
import VisibilityMonitoringView from './VisibilityMonitoringView.vue'

const monitoringApi = vi.hoisted(() => ({
  getSchedule: vi.fn(),
  saveSchedule: vi.fn(),
  pauseMonitoring: vi.fn(),
  resumeMonitoring: vi.fn(),
  triggerRound: vi.fn(),
  getRounds: vi.fn(),
  getRoundDetail: vi.fn(),
  getResponseDetail: vi.fn(),
  getBrandMetrics: vi.fn(),
  getPlatformMetrics: vi.fn(),
  getPersonaMetrics: vi.fn(),
  getQuestionHits: vi.fn(),
  getSourceDomains: vi.fn(),
  getSourcePages: vi.fn(),
}))
vi.mock('../api/monitoring', () => monitoringApi)

const geoConfigApi = vi.hoisted(() => ({
  getActivePlan: vi.fn(),
  getMarkets: vi.fn(),
  getMarketPlatforms: vi.fn(),
  getDictionary: vi.fn(),
  selectPlatform: vi.fn(),
  removePlatform: vi.fn(),
  addPersona: vi.fn(),
  updatePersona: vi.fn(),
  deletePersona: vi.fn(),
  getBrandInfo: vi.fn(),
  getBrandProducts: vi.fn(),
  getMarketCompetitors: vi.fn(),
  getMarketPersonas: vi.fn(),
  getMarketQuestions: vi.fn(),
  getMarketThemes: vi.fn(),
  getRecommendationItems: vi.fn(),
  confirmRecommendation: vi.fn(),
  ignoreRecommendation: vi.fn(),
}))
vi.mock('../api/geo-config', () => geoConfigApi)

beforeEach(() => {
  geoConfigApi.getActivePlan.mockReset().mockResolvedValue({ quota: { planCode: 'demo', planName: '演示版' } })
  geoConfigApi.getMarkets.mockReset().mockResolvedValue([{ id: 3, marketType: 1, status: 1, marketCountry: 'de', marketLanguage: 'de', subSiteName: null }])
  monitoringApi.getSchedule.mockReset().mockResolvedValue(null)
  monitoringApi.saveSchedule.mockReset().mockResolvedValue(77)
  monitoringApi.pauseMonitoring.mockReset().mockResolvedValue(undefined)
  monitoringApi.resumeMonitoring.mockReset().mockResolvedValue(undefined)
  monitoringApi.triggerRound.mockReset().mockResolvedValue(102)
  monitoringApi.getRounds.mockReset().mockResolvedValue({ records: [], total: 0 })
  for (const method of ['getRoundDetail', 'getBrandMetrics', 'getPlatformMetrics', 'getPersonaMetrics', 'getQuestionHits', 'getSourceDomains', 'getSourcePages'])
    monitoringApi[method as keyof typeof monitoringApi].mockReset()

  geoConfigApi.getMarketPlatforms.mockReset().mockResolvedValue([{ id: 2, platform: 'chatgpt', modelVersion: null, enabled: 1, sort: 1 }])
  geoConfigApi.getDictionary.mockReset().mockImplementation((type: string) => Promise.resolve(type === 'country'
    ? [{ dictValue: 'de', dictLabel: '德国', extra: null, sort: 1 }]
    : type === 'language'
      ? [{ dictValue: 'de', dictLabel: '德语', extra: null, sort: 1 }]
      : type === 'persona_type'
        ? [{ dictValue: 'procurement_lead', dictLabel: '采购负责人', extra: null, sort: 1 }]
        : type === 'purchase_stage'
          ? [{ dictValue: 'supplier_evaluation', dictLabel: '供应商评估', extra: null, sort: 1 }, { dictValue: 'purchase_decision', dictLabel: '采购决策', extra: null, sort: 2 }]
          : type === 'company_scale'
            ? [{ dictValue: 'large', dictLabel: '大型企业', extra: null, sort: 1 }]
            : type === 'decision_role'
              ? [{ dictValue: 'decision_maker', dictLabel: '决策者', extra: null, sort: 1 }]
              : [{ dictValue: 'chatgpt', dictLabel: 'ChatGPT', extra: null, sort: 1 }, { dictValue: 'gemini', dictLabel: 'Gemini', extra: null, sort: 2 }]))
  geoConfigApi.selectPlatform.mockReset().mockResolvedValue(3)
  geoConfigApi.removePlatform.mockReset().mockResolvedValue(undefined)
  geoConfigApi.addPersona.mockReset().mockResolvedValue(4)
  geoConfigApi.updatePersona.mockReset().mockResolvedValue(undefined)
  geoConfigApi.deletePersona.mockReset().mockResolvedValue(undefined)
  geoConfigApi.getBrandInfo.mockReset().mockResolvedValue({ brandName: 'Server Brand', industry: 'Manufacturing', siteUrl: 'https://brand.example', aliasNames: 'SB', positioning: 'Real positioning', saved: 1 })
  geoConfigApi.getBrandProducts.mockReset().mockResolvedValue([{ id: 1, lineName: 'Cutting', productName: 'Waterjet X', usageScene: 'CFRP', sellingPoints: ['Precision'], targetCustomers: [], sourceType: 1, isPrimary: 1 }])
  geoConfigApi.getMarketCompetitors.mockReset().mockResolvedValue([{ id: 2, competitorName: 'Rival', domain: 'rival.example', aliasNames: null, competitorDesc: null, isCoreSov: 1, sourceType: 1, status: 1 }])
  geoConfigApi.getMarketPersonas.mockReset().mockResolvedValue([{ id: 3, personaName: '采购负责人', personaType: 'procurement_lead', actualPosition: '采购经理', industry: '工业设备', companyScale: 'large', decisionRole: 'decision_maker', purchaseTrigger: '设备更换', purchaseBudget: '100万', purchaseCycle: '3个月', infoChannels: null, description: null, focusTopics: null, purchaseStages: ['supplier_evaluation', 'purchase_decision'], sourceType: 1, status: 1 }])
  geoConfigApi.getMarketQuestions.mockReset().mockResolvedValue([{ id: 4, questionContent: 'Real server question?', themeId: 5, questionType: 'standard', personaId: 3, purchaseStage: 'Evaluation', intentType: 'Information', focusType: 'Precision', isFirstSelected: 1, sourceType: 1, status: 1 }])
  geoConfigApi.getMarketThemes.mockReset().mockResolvedValue([{ id: 5, themeName: 'Server theme', searchVolume: 100, cpcCost: 1, competition: 2, resultCount: 10, keywordIntent: 'Information', status: 1 }])
  geoConfigApi.getRecommendationItems.mockReset().mockResolvedValue([
    { id: 6, siteId: 1, marketId: 3, recommendType: 3, itemPayload: '{"competitorName":"Candidate One"}', evidenceJson: '{"totalMentionCount":5,"hitResponses":[{"responseId":900,"questionId":4,"platform":"chatgpt","mentionCount":2,"excerpt":"Candidate excerpt"}]}', confidenceScore: null, batchNo: 'round-10', itemStatus: 1, confirmedBizId: null, confirmedAt: null },
    { id: 7, siteId: 1, marketId: 3, recommendType: 3, itemPayload: '{"name":"Candidate Two"}', evidenceJson: null, confidenceScore: null, batchNo: null, itemStatus: 1, confirmedBizId: null, confirmedAt: null },
  ])
  monitoringApi.getResponseDetail.mockReset().mockResolvedValue({
    id: 900,
    roundId: 10,
    questionId: 4,
    personaId: 3,
    platform: 'chatgpt',
    collectStatus: 1,
    failReason: null,
    isMentioned: 1,
    repeatNo: 1,
    collectChannel: 1,
    collectTime: '2026-10-16 10:00:00',
    modelVersion: null,
    promptContent: null,
    responseContent: 'Server answer body',
    citationLinks: null,
    htmlSnapshotUrl: 'https://example.test/snapshot/900',
    retryCount: 0,
    isInRecommendDenominator: 1,
    isCitable: 1,
    mentionCount: 2,
    recommendTendency: null,
    hasRank: null,
    brandRank: null,
    rankTotal: null,
    isOfficialCited: null,
    factStatus: null,
    sentiment: null,
    isCompetitorHit: 1,
    competitorHits: [],
  })
  geoConfigApi.confirmRecommendation.mockReset().mockResolvedValue(88)
  geoConfigApi.ignoreRecommendation.mockReset().mockResolvedValue(undefined)
})

function mountView(attachTo?: Element) {
  const pinia = createPinia()
  useGeoContextStore(pinia).marketId = 3
  return mount(VisibilityMonitoringView, { attachTo, global: { plugins: [pinia] } })
}
const serverSchedule = (id: number, enabled: 0 | 1) => ({ id, scheduleType: 'weekly', executeTime: '05:00', repeatCount: 1, enabled, timezone: 'Asia/Shanghai', nextFireTime: null, lastFireTime: null, lastExecuteStatus: null, lastRoundId: null })

describe('visibility monitoring integration', () => {
  it('loads configuration from APIs and renders only server-returned brand data', async () => {
    const wrapper = mountView()
    await flushPromises()
    await wrapper.get('#visibility-step-1').trigger('click')

    expect(geoConfigApi.getBrandInfo).toHaveBeenCalledOnce()
    expect(geoConfigApi.getBrandProducts).toHaveBeenCalledOnce()
    expect(geoConfigApi.getMarketCompetitors).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('Server Brand')
    expect(wrapper.text()).toContain('Waterjet X')
    expect(wrapper.text()).toContain('Rival')
    expect(wrapper.text()).not.toContain('APW Waterjet')
    wrapper.unmount()
  })

  it('renders actual personas, questions, themes and platforms on the corresponding steps', async () => {
    const wrapper = mountView(document.body)
    await flushPromises()
    await wrapper.get('#visibility-step-1').trigger('click')
    await wrapper.get('#visibility-setup-tab-2').trigger('click')
    expect(geoConfigApi.getMarketPersonas).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('采购负责人')
    expect(wrapper.text()).toContain('当前买家人设')
    expect(wrapper.findAll('.market-config__persona-grid article')).toHaveLength(1)
    expect(wrapper.find('.visibility-tabs--setup .is-active')?.text()).toContain('买家人设')
    expect(wrapper.text()).not.toContain('复材加工技术主管')

    const maintainButton = wrapper.findAll('.market-config__header button').find(button => button.text().includes('维护买家人设'))
    expect(maintainButton).toBeTruthy()
    await maintainButton!.trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('维护买家人设')
    expect(document.body.textContent).toContain('人设 1')
    await wrapper.get('.buyer-persona-form__toggle').trigger('click')
    await wrapper.get('#persona-role-3').setValue('采购工程师')
    const saveButton = wrapper.findAll('button').find(button => button.text().trim() === '保存')
    expect(saveButton).toBeTruthy()
    await saveButton!.trigger('click')
    await flushPromises()
    expect(geoConfigApi.updatePersona).toHaveBeenCalledWith(3, expect.objectContaining({ actualPosition: '采购工程师' }))

    await wrapper.get('.market-config__persona-grid button').trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('查看买家人设')
    for (const field of ['人设名称', '人设类型', '采购阶段', '实际职位', '所属行业', '企业规模', '决策角色', '采购触发场景', '采购预算', '采购周期', '了解渠道', '人设描述', '关注主题'])
      expect(document.body.textContent).toContain(field)
    for (const value of ['采购负责人', '供应商评估', '采购决策', '采购经理', '工业设备', '大型企业', '决策者', '设备更换', '100万', '3个月'])
      expect(document.body.textContent).toContain(value)
    expect(document.body.textContent).not.toContain('procurement_lead')
    expect(document.body.textContent).not.toContain('supplier_evaluation')
    expect(document.body.textContent).not.toContain('接口状态')
    expect(document.body.textContent).not.toContain('来源类型')
    await wrapper.get('.ce-drawer-close').trigger('click')

    await wrapper.get('#visibility-setup-tab-3').trigger('click')
    expect(geoConfigApi.getMarketQuestions).toHaveBeenCalledTimes(2)
    expect(geoConfigApi.getMarketThemes).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Real server question?')
    expect(wrapper.text()).toContain('Server theme')
    expect(wrapper.find('.visibility-tabs--setup .is-active')?.text()).toContain('监测问题')
    expect(wrapper.find('.market-config__questions .data-list')).toBeTruthy()
    expect(wrapper.text()).toContain('Q04')
    wrapper.unmount()
  })

  it('shows API errors and allows retry without falling back to mock fixtures', async () => {
    geoConfigApi.getMarketQuestions.mockRejectedValueOnce(new Error('question service down'))
    const wrapper = mountView()
    await flushPromises()
    await wrapper.get('#visibility-step-3').trigger('click')
    expect(wrapper.text()).toContain('question service down')
    expect(wrapper.text()).not.toContain('67 条')
    await wrapper.get('.market-config__error button').trigger('click')
    await flushPromises()
    expect(geoConfigApi.getMarketQuestions).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Real server question?')
    wrapper.unmount()
  })

  it('keeps an unconfigured monitoring state honest', async () => {
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.get('.vm-round-summary__status').text()).toBe('未配置')
    expect(wrapper.findAll('.vm-round-summary__metrics dt').map(item => item.text())).toEqual([
      '监测日期',
      '市场 / 语言',
      '买家人设',
      '意图',
      '关键词',
      '采样总数',
      'AI 平台',
      '可信度',
    ])
    expect(wrapper.findAll('.vm-round-summary__metrics dd')[1].text()).toBe('德国 / 德语')
    expect(wrapper.text()).toContain('当前市场暂无监测轮次')
    expect(monitoringApi.triggerRound).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('renders the prototype brand knowledge cards using current API data', async () => {
    const wrapper = mountView()
    await flushPromises()
    await wrapper.get('#visibility-step-1').trigger('click')

    expect(wrapper.findAll('.vm-knowledge-item')).toHaveLength(4)
    expect(wrapper.text()).toContain('发现 2 个潜在新竞品候选')
    expect(wrapper.text()).toContain('Candidate One、Candidate Two')
    expect(wrapper.text()).toContain('Server Brand')
    expect(wrapper.text()).toContain('Waterjet X')
    expect(wrapper.text()).toContain('德国 · 德语')
    expect(wrapper.text()).toContain('Rival')
    expect(wrapper.text()).not.toContain('Flow X')
    wrapper.unmount()
  })

  it('opens the candidate review drawer and resolves candidates through recommendation APIs', async () => {
    const wrapper = mountView(document.body)
    await flushPromises()
    await wrapper.get('#visibility-step-1').trigger('click')
    await wrapper.get('.vm-current-knowledge__pending-row button').trigger('click')
    await flushPromises()

    expect(document.body.textContent).toContain('发现 2 个潜在新竞品候选')
    expect(document.body.textContent).toContain('Candidate One')
    expect(document.body.textContent).toContain('Candidate Two')
    expect(document.body.textContent).not.toContain('Flow X')
    expect(document.body.textContent).toContain('—')
    expect(document.body.textContent).toContain('Real server question?')
    expect(document.body.textContent).toContain('Server answer body')
    expect(document.body.querySelector('a[href="https://example.test/snapshot/900"]')).toBeTruthy()
    expect(monitoringApi.getResponseDetail).toHaveBeenCalledWith(900)

    const drawer = document.body.querySelector('dialog.vm-candidate-dialog')
    expect(drawer).toBeTruthy()
    const addButton = [...drawer!.querySelectorAll('button')].find(button => button.textContent?.includes('加入竞品监测'))
    expect(addButton).toBeTruthy()
    addButton!.click()
    await flushPromises()

    expect(geoConfigApi.confirmRecommendation).toHaveBeenCalledWith(6)
    expect(document.body.textContent).toContain('Candidate Two')
    const ignoreButton = [...drawer!.querySelectorAll('button')].find(button => button.textContent?.trim() === '忽略')
    expect(ignoreButton).toBeTruthy()
    ignoreButton!.click()
    await flushPromises()
    expect(geoConfigApi.ignoreRecommendation).toHaveBeenCalledWith(7)
    expect(document.body.textContent).toContain('本批候选已处理完成。')
    wrapper.unmount()
  })

  it('triggers a monitoring round through the backend when a schedule exists', async () => {
    monitoringApi.getSchedule.mockResolvedValue(serverSchedule(7, 0))
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.find('.vm-round-summary__toggle').exists()).toBe(false)
    await wrapper.get('.vm-round-summary__trigger').trigger('click')
    await flushPromises()
    expect(monitoringApi.triggerRound).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('shows only the pause action while monitoring is enabled', async () => {
    monitoringApi.getSchedule.mockResolvedValue(serverSchedule(7, 1))
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.get('.vm-round-summary__toggle').text()).toContain('暂停监测')
    expect(wrapper.find('.vm-round-summary__trigger').exists()).toBe(false)
    wrapper.unmount()
  })

  it('keeps plan-controlled frequency fixed and persists platform selection to backend APIs', async () => {
    monitoringApi.getSchedule.mockResolvedValue({ id: 6, scheduleType: 'weekly', executeTime: '05:00', repeatCount: 4, enabled: 1, timezone: 'Asia/Shanghai', nextFireTime: null, lastFireTime: null, lastExecuteStatus: null, lastRoundId: null })
    const wrapper = mountView()
    await flushPromises()
    await wrapper.get('#visibility-step-4').trigger('click')
    await wrapper.get('.sampling-summary__header button').trigger('click')
    await wrapper.get('input[type="checkbox"][value="chatgpt"]').setValue(false)
    await wrapper.get('button.is-primary').trigger('click')
    await flushPromises()

    expect(geoConfigApi.removePlatform).toHaveBeenCalledWith(2)
    expect(monitoringApi.saveSchedule).toHaveBeenCalledWith({ scheduleType: 'weekly', executeTime: '05:00', repeatCount: 4 })
    expect(wrapper.find('.vm-settings').attributes('open')).toBeUndefined()
    wrapper.unmount()
  })
})

