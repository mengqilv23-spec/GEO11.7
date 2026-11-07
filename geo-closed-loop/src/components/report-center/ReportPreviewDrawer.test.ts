import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { initialReports } from '../../data/report-center-data'
import ReportPreviewDrawer from './ReportPreviewDrawer.vue'

describe('report preview drawer', () => {
  it('shows a report outline and emits the related question when selected', async () => {
    const report = initialReports[0]!
    const wrapper = mount(ReportPreviewDrawer, {
      props: { report, open: true },
    })

    expect(wrapper.get('.ce-drawer').text()).toContain(report.title)
    expect(wrapper.get('.report-preview__chapter').text()).toContain(report.sections[0]!.title)
    expect(wrapper.find('.report-preview__status svg.lucide-check').exists()).toBe(true)
    expect(wrapper.find('.report-preview__row-mark.lucide-arrow-up-right').exists()).toBe(true)
    await wrapper.get(`[data-report-question="${report.questionIds[0]}"]`).trigger('click')
    expect(wrapper.emitted('selectQuestion')?.[0]).toEqual([report.questionIds[0]])
  })
})

