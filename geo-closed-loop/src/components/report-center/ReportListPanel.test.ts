import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { initialReports } from '../../data/report-center-data'
import ReportListPanel from './ReportListPanel.vue'

describe('reportListPanel', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows type counts, changes filters, and links reports to a new tab', async () => {
    const wrapper = mount(ReportListPanel, {
      props: { reports: initialReports, modelValue: 'all' },
    })

    expect(wrapper.text()).not.toContain('按时间倒序整理的监测快照与周期汇报')
    expect(wrapper.text()).toContain('按时间倒序')
    expect(wrapper.text()).not.toContain('最近生成优先')
    expect(wrapper.get('[data-report-filter="all"]').text()).toContain('5')
    expect(wrapper.get('[data-report-filter="weekly"]').text()).toContain('2')
    expect(wrapper.find('.report-card__action svg.lucide-arrow-right').exists()).toBe(true)
    await wrapper.get('[data-report-filter="monthly"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['monthly'])

    const reportLink = wrapper.get('[data-open-report="monthly-2026-09"]')
    expect(reportLink.element.tagName).toBe('A')
    expect(reportLink.attributes('target')).toBe('_blank')
    expect(reportLink.attributes('rel')).toContain('noopener')
    expect(reportLink.attributes('href')).toBe('/reports/monthly-2026-09')
    wrapper.unmount()
  })

  it('filters the fetched page locally while preserving server-provided counts', async () => {
    const wrapper = mount(ReportListPanel, {
      props: {
        reports: initialReports,
        modelValue: 'weekly',
        counts: { all: 5, weekly: 2, monthly: 1, quarterly: 1, adhoc: 1 },
      },
    })

    expect(wrapper.findAll('.report-card')).toHaveLength(2)
    expect(wrapper.get('[data-report-filter="all"] .filter-count').text()).toBe('5')
    expect(wrapper.findAll('.report-card .report-card__type').every(el => el.text() === '周报')).toBe(true)
    wrapper.unmount()
  })

  it('shows an empty state when the selected filter has no matching reports', () => {
    const wrapper = mount(ReportListPanel, {
      props: { reports: [], modelValue: 'quarterly' },
    })

    expect(wrapper.get('[role="status"]').text()).toContain('暂无季度报告')
    expect(wrapper.find('.report-empty__mark').exists()).toBe(false)
    wrapper.unmount()
  })

  it('offers the supplied on-demand report prototype from its filter', () => {
    const wrapper = mount(ReportListPanel, {
      props: { reports: initialReports, modelValue: 'adhoc' },
    })

    expect(wrapper.get('[data-report-filter="adhoc"]').text()).toContain('次报')
    expect(wrapper.get('[data-report-filter="adhoc"]').text()).toContain('1')
    expect(wrapper.findAll('.report-card')).toHaveLength(1)
    expect(wrapper.get('[data-open-report="adhoc-2026-09-12"]').text()).toContain('查看报告')
    wrapper.unmount()
  })

  it('shows a no-data status for empty reports instead of generated', () => {
    const reports = [
      { ...initialReports[0], id: 'empty-report', empty: true },
      { ...initialReports[1], id: 'available-report', empty: false },
    ]
    const wrapper = mount(ReportListPanel, {
      props: { reports, modelValue: 'all' },
    })

    const statuses = wrapper.findAll('.report-status')
    expect(statuses[0].text()).toBe('暂无数据')
    expect(statuses[0].classes()).toContain('is-empty')
    expect(statuses[1].text()).toBe('已生成')
    expect(wrapper.find('[data-open-report="empty-report"]').exists()).toBe(false)
    expect(wrapper.get('[data-open-report="available-report"]').text()).toContain('查看报告')
    wrapper.unmount()
  })

  it('shows the report-list explanation in a tooltip beside the title', async () => {
    vi.useFakeTimers()
    const wrapper = mount(ReportListPanel, {
      props: { reports: [], modelValue: 'all' },
    })

    await wrapper.get('[aria-label="报告列表说明"]').trigger('mouseenter')
    await vi.advanceTimersByTimeAsync(300)

    expect(document.body.querySelector('.ce-tooltip__content')?.textContent).toContain('按报告类型和时间查看监测结果、趋势、证据与可信度。')
    wrapper.unmount()
  })
})

