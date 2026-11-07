import type { MarketRecommendationState } from './types'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { visibilityMonitoringData } from '../../../../data/visibility-monitoring-data'
import MarketRecommendationEditor from './MarketRecommendationEditor.vue'

const questions = visibilityMonitoringData.questions
const longQuestion = 'Welche 5-Achs-Wasserstrahlschneidsysteme eignen sich für CFRP-Luftfahrtbauteile und welche Anbieter bieten präzise, delaminationsfreie Schnitte ohne thermische Beeinflussung und mit zuverlässiger Taper-Kompensation?'

function makeMarket(overrides: Partial<MarketRecommendationState> = {}): MarketRecommendationState {
  return {
    id: 'de-de',
    name: '德国 · 德语',
    language: '德语',
    enabled: false,
    processed: false,
    candidates: [
      { ...questions[0]!, id: 'candidate-1', question: longQuestion },
      ...questions.slice(1, 7).map((question, index) => ({ ...question, id: `candidate-${index + 2}` })),
    ],
    selectedCandidateIds: [],
    existingQuestions: [questions[0]!],
    ...overrides,
  }
}

describe('marketRecommendationEditor', () => {
  it('toggles candidates, shows the selection count and saves only selected ids', async () => {
    const wrapper = mount(MarketRecommendationEditor, { props: { market: makeMarket(), selectedIds: [], pending: false } })
    expect(wrapper.text()).toContain('已选择 0 / 5 条 · 共 7 条候选')
    await wrapper.get('input[value="candidate-1"]').setValue(true)
    expect(wrapper.emitted('update:selectedIds')?.at(-1)?.[0]).toEqual(['candidate-1'])
    await wrapper.setProps({ selectedIds: ['candidate-1'] })
    await wrapper.get('button.is-primary').trigger('click')
    expect(wrapper.emitted('save')?.[0]?.[0]).toEqual(['candidate-1'])
    wrapper.unmount()
  })

  it('enforces a five-question limit and keeps existing questions read-only', async () => {
    const selectedIds = ['candidate-1', 'candidate-2', 'candidate-3', 'candidate-4', 'candidate-5']
    const wrapper = mount(MarketRecommendationEditor, { props: { market: makeMarket(), selectedIds, pending: false } })
    expect(wrapper.text()).toContain('已选择 5 / 5 条 · 共 7 条候选')
    expect(wrapper.get('input[value="candidate-6"]').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('当前监测问题')
    expect(wrapper.text()).toContain(questions[0]!.question)
    expect(wrapper.get('.recommendation-editor__existing').text()).toContain(questions[0]!.keyword)
    expect(wrapper.get('.recommendation-editor__existing').text()).toContain(questions[0]!.persona)
    expect(wrapper.get('.recommendation-editor__existing').text()).toContain('主要关注问题')
    expect(wrapper.findAll('.recommendation-editor__panel')).toHaveLength(2)
    expect(wrapper.findAll('.existing-question input')).toHaveLength(0)
    wrapper.unmount()
  })

  it('shows a meaningful empty state when there are no candidates and preserves long German prompts', () => {
    const empty = mount(MarketRecommendationEditor, { props: { market: makeMarket({ candidates: [] }), selectedIds: [], pending: false } })
    expect(empty.text()).toContain('当前没有新的推荐问题')
    empty.unmount()

    const populated = mount(MarketRecommendationEditor, { props: { market: makeMarket(), selectedIds: [], pending: false } })
    expect(populated.text()).toContain(longQuestion)
    expect(populated.find('.candidate-question').exists()).toBe(true)
    populated.unmount()
  })

  it('disables actions while saving', () => {
    const wrapper = mount(MarketRecommendationEditor, { props: { market: makeMarket(), selectedIds: [], pending: true } })
    expect(wrapper.get('button.is-primary').attributes('disabled')).toBeDefined()
    expect(wrapper.get('button[aria-label="返回市场列表"]').attributes('disabled')).toBeDefined()
    expect(wrapper.emitted('returnToMarkets')).toBeUndefined()
    wrapper.unmount()
  })
})

