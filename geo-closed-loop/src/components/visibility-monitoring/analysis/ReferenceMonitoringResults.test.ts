import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { referenceMonitoringResults as data } from '../../../data/reference-monitoring-results'
import QuestionDetailDrawer from '../questions/QuestionDetailDrawer.vue'
import SourceDetailDrawer from '../sources/SourceDetailDrawer.vue'
import BrandMentionAnalysis from './BrandMentionAnalysis.vue'
import ReferenceMonitoringResults from './ReferenceMonitoringResults.vue'

const wrappers: ReturnType<typeof mount>[] = []
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  document.body.innerHTML = ''
})
function results(activeTab: 'brand' | 'questions' | 'sources') {
  const wrapper = mount(ReferenceMonitoringResults, { attachTo: document.body, props: { activeTab } })
  wrappers.push(wrapper)
  return wrapper
}

describe('three reused monitoring result modules', () => {
  it('preserves the source trend series and selected dimension across tabs', async () => {
    const wrapper = results('brand')
    const analysis = wrapper.getComponent(BrandMentionAnalysis)
    expect(analysis.props('weeks')).toEqual(data.weeks)
    expect(data.trendSeries[1]!.values.at(-1)).toBe(56)
    await analysis.findAll('.vm-segment button')[3]!.trigger('click')
    await wrapper.setProps({ activeTab: 'questions' })
    expect(wrapper.findAll('.vm-table-card tbody tr')).toHaveLength(10)
    expect(wrapper.find('.vm-table-card tbody tr').findAll('th, td')).toHaveLength(wrapper.findAll('.vm-table-card thead th').length)
    await wrapper.setProps({ activeTab: 'brand' })
    expect(wrapper.getComponent(BrandMentionAnalysis).props('modelValue')).toBe('competitors')
    expect(wrapper.text()).not.toContain('品牌知识')
  })

  it('switches original answer snapshots and follows a cited page into its source detail', async () => {
    const wrapper = results('questions')
    await wrapper.get('.vm-table-card tbody button').trigger('click')
    const drawer = wrapper.getComponent(QuestionDetailDrawer)
    expect(drawer.props('question')?.id).toBe('q1')
    expect(drawer.text()).toContain('Hier ist eine detaillierte Analyse')
    expect(drawer.text()).toContain('52 / 54')
    await drawer.get('[data-batch-id="r2"]').trigger('click')
    expect(drawer.text()).toContain('Aktualisierte Marktanalyse')
    expect(drawer.text()).not.toContain('Hier ist eine detaillierte Analyse')
    await drawer.get('[data-cited-page="page-apw-carbon"]').trigger('click')
    expect(wrapper.getComponent(SourceDetailDrawer).props('source')?.id).toBe('page-apw-carbon')
    expect(wrapper.getComponent(QuestionDetailDrawer).props('open')).toBe(false)
  })

  it('reuses all source pages and opens their associated questions without overlapping drawers', async () => {
    const wrapper = results('sources')
    expect(wrapper.findAll('.vm-source-stack table')[0]!.findAll('tbody tr')).toHaveLength(5)
    expect(wrapper.findAll('.vm-source-stack table')[1]!.findAll('tbody tr')).toHaveLength(14)
    await wrapper.get('.vm-source-stack tbody button').trigger('click')
    const drawer = wrapper.getComponent(SourceDetailDrawer)
    expect(drawer.props('source')?.id).toBe('compositesworld.com')
    await drawer.get('[data-select-page="page-composites-cfrp"]').trigger('click')
    await drawer.get('[data-select-question="q1"]').trigger('click')
    expect(wrapper.getComponent(QuestionDetailDrawer).props('question')?.id).toBe('q1')
    expect(drawer.props('open')).toBe(false)
    await wrapper.setProps({ activeTab: 'brand' })
    expect(wrapper.getComponent(QuestionDetailDrawer).props('open')).toBe(false)
  })
})

