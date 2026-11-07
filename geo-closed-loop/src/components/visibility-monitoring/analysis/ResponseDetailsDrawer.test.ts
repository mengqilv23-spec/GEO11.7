import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ResponseDetailsDrawer from './ResponseDetailsDrawer.vue'

const api = vi.hoisted(() => ({ getRoundResponses: vi.fn(), getResponseDetail: vi.fn() }))
vi.mock('../../../api/monitoring', () => api)

describe('responseDetailsDrawer', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('shows real round answers and fetches original response detail on selection', async () => {
    api.getRoundResponses.mockResolvedValue({ records: [{ id: 81, roundId: 19, questionId: 301, personaId: 401, platform: 'chatgpt', collectStatus: 1, failReason: null, isMentioned: 1, repeatNo: 1, collectChannel: 1, collectTime: null }], total: 1, size: 10, current: 1, pages: 1 })
    api.getResponseDetail.mockResolvedValue({ id: 81, promptContent: 'Original prompt', responseContent: 'Original answer', citationLinks: [{ url: 'https://example.com', title: 'Source' }], competitorHits: [] })
    const wrapper = mount(ResponseDetailsDrawer, { attachTo: document.body, props: { open: true, roundId: 19, questionId: 301, questionText: 'Monitoring question' } })
    await vi.waitFor(() => expect(api.getRoundResponses).toHaveBeenCalledWith(19, { pageNum: 1, pageSize: 10, questionId: 301 }))

    await wrapper.get('[data-response-id="81"]').trigger('click')

    expect(api.getResponseDetail).toHaveBeenCalledWith(81)
    await vi.waitFor(() => expect(wrapper.text()).toContain('Original answer'))
    expect(wrapper.text()).toContain('Original prompt')
    expect(wrapper.text()).toContain('Source')
    wrapper.unmount()
  })
})

