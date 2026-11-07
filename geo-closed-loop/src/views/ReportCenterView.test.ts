import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import GenerateLatestReportDialog from '../components/report-center/GenerateLatestReportDialog.vue'
import { readMockState, resetMockState } from '../mock/repository'
import { useGeoContextStore } from '../stores/geo-context'
import ReportCenterView from './ReportCenterView.vue'

async function mountReportCenter() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/report-center', component: ReportCenterView }] })
  await router.push('/report-center?marketId=1')
  await router.isReady()
  const wrapper = mount(ReportCenterView, { global: { plugins: [router], stubs: { Modal: { props: ['open', 'title', 'confirmText'], emits: ['confirm'], template: '<div v-if="open"><h2>{{ title }}</h2><slot /><button class="confirm" @click="$emit(\'confirm\')">{{ confirmText }}</button></div>' } } } })
  await flushPromises()
  return wrapper
}

describe('standalone report center', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    resetMockState()
    useGeoContextStore().marketId = 1
  })

  it('renders seeded local reports and retains report scope in local detail links', async () => {
    const wrapper = await mountReportCenter()
    expect(wrapper.text()).toContain('周度趋势报告')
    const reportLink = wrapper.find('[data-open-report]')
    expect(reportLink.exists()).toBe(true)
    expect(reportLink.attributes('href')).toContain('/reports/')
    expect(reportLink.attributes('href')).toContain('marketId=1')
    wrapper.unmount()
  })

  it('opens report generation, then persists the generated item and decrements local quota', async () => {
    const wrapper = await mountReportCenter()
    await wrapper.get('[data-testid="generate-latest"]').trigger('click')
    await flushPromises()
    expect(wrapper.findComponent(GenerateLatestReportDialog).props('open')).toBe(true)
    await wrapper.get('.confirm').trigger('click')
    await flushPromises()
    expect(readMockState().reports.quota).toBe(1)
    expect(readMockState().reports.items.length).toBeGreaterThan(4)
    wrapper.unmount()
  })
})

