import type { BrandKnowledgeUpdateSnapshot } from './types'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { visibilityMonitoringData } from '../../../../data/visibility-monitoring-data'
import MarketRecommendationListDialog from './MarketRecommendationListDialog.vue'

function makeSnapshot(markets = [{
  id: 'de-de',
  name: '德国 · 德语',
  language: '德语',
  enabled: false,
  processed: false,
  candidates: visibilityMonitoringData.questions.slice(0, 10),
  selectedCandidateIds: [],
  existingQuestions: visibilityMonitoringData.questions.slice(0, 2),
}]): BrandKnowledgeUpdateSnapshot {
  return { demo: true, editQuota: { total: 3, remaining: 2 }, knowledgeItems: [], markets }
}

describe('marketRecommendationListDialog', () => {
  it('shows market status and pending recommendation counts and emits actions', async () => {
    const wrapper = mount(MarketRecommendationListDialog, { props: { open: true, snapshot: makeSnapshot(), pendingAction: null, error: null } })
    expect(wrapper.text()).toContain('德国 · 德语')
    expect(wrapper.text()).toContain('已暂停')
    expect(wrapper.text()).toContain('待处理 · 10 条推荐问题')
    expect(wrapper.text()).toContain('品牌知识已保存，推荐问题按市场分别生成。加入或移出问题都在对应市场的“监测问题”列表中操作。')
    expect(wrapper.text()).toContain('未调整的市场保留现有监测问题。所有市场当前已暂停，可通过统一入口一次开启全部市场。')
    expect(wrapper.text()).not.toContain('演示数据')
    expect(wrapper.get('.market-row__status').text()).toBe('已暂停')
    expect(wrapper.find('.ce-modal-footer').exists()).toBe(false)

    await wrapper.get('button[aria-label="处理德国 · 德语的推荐问题"]').trigger('click')
    expect(wrapper.emitted('processMarket')?.[0]).toEqual(['de-de'])
    await wrapper.get('button.is-primary').trigger('click')
    expect(wrapper.emitted('enableAll')).toHaveLength(1)
    wrapper.unmount()
  })

  it('renders empty state for no markets', () => {
    const wrapper = mount(MarketRecommendationListDialog, { props: { open: true, snapshot: makeSnapshot([]), pendingAction: null, error: null } })
    expect(wrapper.text()).toContain('当前没有需要处理的市场')
    expect(wrapper.find('button.is-primary').exists()).toBe(false)
    wrapper.unmount()
  })

  it('uses service-returned market state for the footer guidance', () => {
    const snapshot = makeSnapshot()
    snapshot.markets[0]!.enabled = true
    const wrapper = mount(MarketRecommendationListDialog, { props: { open: true, snapshot, pendingAction: null, error: null } })
    expect(wrapper.text()).toContain('未调整的市场保留现有监测问题。所有市场当前已开启。')
    expect(wrapper.text()).not.toContain('所有市场当前已暂停')
    expect(wrapper.get('button.is-primary').text()).toBe('全部市场已开启')
    expect(wrapper.get('button.is-primary').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('disables duplicate actions while pending and exposes retry after failure', async () => {
    const wrapper = mount(MarketRecommendationListDialog, { props: { open: true, snapshot: makeSnapshot(), pendingAction: 'enable-all', error: '网络暂不可用' } })
    expect(wrapper.text()).toContain('网络暂不可用')
    expect(wrapper.find('button.is-primary').attributes('disabled')).toBeDefined()
    await wrapper.get('button[aria-label="重试市场操作"]').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
    wrapper.unmount()
  })
})

