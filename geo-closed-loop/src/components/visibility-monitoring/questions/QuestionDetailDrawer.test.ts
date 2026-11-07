import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { visibilityMonitoringData as data } from '../../../data/visibility-monitoring-data'
import QuestionDetailDrawer from './QuestionDetailDrawer.vue'

describe('questionDetailDrawer', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('switches sampling batches and expands an answer to select its cited page', async () => {
    const wrapper = mount(QuestionDetailDrawer, {
      attachTo: document.body,
      props: { question: data.questions[0]!, open: true, platforms: data.platforms },
    })

    expect(wrapper.find('.ce-drawer').exists()).toBe(true)
    expect(wrapper.findAll('.vm-table-scroll[role="region"][tabindex="0"]')).toHaveLength(2)
    expect(wrapper.find('.vm-trend-empty__icon svg.lucide-chart-no-axes-combined').exists()).toBe(true)
    expect(wrapper.get('.vm-table-scroll tbody button').classes()).toContain('geo-table-detail-button')
    expect(wrapper.get('[data-batch-id="batch-1"]').text()).toContain(data.questions[0]!.samplingBatches[0]!.date)
    expect(wrapper.text()).not.toContain('置信区间')
    expect(wrapper.find('.vm-detail-metrics').text()).not.toContain('95%')
    await wrapper.get('[data-batch-id="batch-2"]').trigger('click')
    expect(wrapper.get('[data-batch-id="batch-2"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-batch-id="batch-2"]').text()).toContain('2026-09-08')

    await wrapper.get('.vm-answer summary').trigger('click')
    expect(wrapper.find('.vm-answer[open]').exists()).toBe(true)
    expect(wrapper.find('.vm-answer-chevron.lucide-chevron-down').exists()).toBe(true)
    const pageId = data.questions[0]!.platformResults.find(result => result.citedPages.length)!.citedPages[0]!
    await wrapper.get(`[data-cited-page="${pageId}"]`).trigger('click')
    expect(wrapper.find(`[data-cited-page="${pageId}"] svg.lucide-arrow-up-right`).exists()).toBe(true)
    expect(wrapper.emitted('selectSource')?.[0]).toEqual([pageId])
    wrapper.unmount()
  })
})

