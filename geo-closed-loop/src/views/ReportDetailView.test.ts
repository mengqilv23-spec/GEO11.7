import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { findMockReportById, mockReportId } from '../mock/report-service'
import { resetMockState } from '../mock/repository'
import ReportDetailView from './ReportDetailView.vue'

describe('standalone report detail', () => {
  beforeEach(() => resetMockState())

  it('renders the selected report from the local report collection and preserves its back link scope', async () => {
    const first = findMockReportById(mockReportId((await import('../mock/repository')).readMockState().reports.items[0]!))!
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/reports/:reportId', component: ReportDetailView }] })
    await router.push(`/reports/${mockReportId(first)}?siteId=demo-site-apw&marketId=1`)
    await router.isReady()
    const wrapper = mount(ReportDetailView, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.get('iframe').attributes('src')).toContain(`report-prototypes/${first.type}.html`)
    expect(wrapper.get('iframe').attributes('title')).toContain('内容')
    wrapper.unmount()
  })

  it.each(['weekly', 'adhoc', 'quarterly', 'monthly'] as const)('opens the supplied %s report prototype from its report record', async (type) => {
    const record = (await import('../data/report-center-data')).initialReports.find(report => report.type === type)!
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/reports/:reportId', component: ReportDetailView }] })
    await router.push(`/reports/${mockReportId(record)}`)
    await router.isReady()
    const wrapper = mount(ReportDetailView, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.get('iframe').attributes('src')).toContain(`report-prototypes/${type}.html`)
    wrapper.unmount()
  })
})

