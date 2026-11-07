import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ getRoundResponses: vi.fn(), getResponseDetail: vi.fn() }))
vi.mock('../api/monitoring', () => api)

describe('useRoundResponses', () => {
  beforeEach(() => Object.values(api).forEach(mock => mock.mockReset()))

  it('loads the question-scoped page and then loads the selected answer detail', async () => {
    api.getRoundResponses.mockResolvedValue({ records: [{ id: 81, platform: 'chatgpt' }], total: 1, size: 10, current: 1, pages: 1 })
    api.getResponseDetail.mockResolvedValue({ id: 81, promptContent: 'Prompt', responseContent: 'Answer' })
    const { useRoundResponses } = await import('./use-round-responses')
    const state = useRoundResponses()

    await state.open(19, 301)
    await state.loadDetail(81)

    expect(api.getRoundResponses).toHaveBeenCalledWith(19, { pageNum: 1, pageSize: 10, questionId: 301 })
    expect(api.getResponseDetail).toHaveBeenCalledWith(81)
    expect(state.page.value.records).toHaveLength(1)
    expect(state.detail.value?.responseContent).toBe('Answer')
  })

  it('clears stale results and reports errors instead of using sample answers', async () => {
    api.getRoundResponses.mockRejectedValue(new Error('接口不可用'))
    const { useRoundResponses } = await import('./use-round-responses')
    const state = useRoundResponses()

    await state.open(19, 301)

    expect(state.page.value.records).toEqual([])
    expect(state.listError.value).toBe('接口不可用')
  })
})

