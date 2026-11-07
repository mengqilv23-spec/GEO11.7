import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ getMarketPlatforms: vi.fn(), getDictionary: vi.fn(), removePlatform: vi.fn(), selectPlatform: vi.fn() }))
vi.mock('../api/geo-config', () => api)

describe('useMonitoringPlatforms', () => {
  beforeEach(() => {
    for (const method of Object.values(api)) method.mockReset()
    api.getMarketPlatforms.mockResolvedValue([{ id: 3, platform: 'chatgpt', modelVersion: null, enabled: 1, sort: 1 }])
    api.getDictionary.mockResolvedValue([{ dictValue: 'chatgpt', dictLabel: 'ChatGPT', extra: null, sort: 1 }, { dictValue: 'gemini', dictLabel: 'Gemini', extra: null, sort: 2 }])
    api.selectPlatform.mockResolvedValue(4)
    api.removePlatform.mockResolvedValue(undefined)
  })

  it('uses backend dictionary and selected platform records as the authoritative settings', async () => {
    const { useMonitoringPlatforms } = await import('./use-monitoring-platforms')
    const state = useMonitoringPlatforms()
    await state.load()
    expect(state.options.value).toEqual([{ id: 'chatgpt', label: 'ChatGPT', enabled: true }, { id: 'gemini', label: 'Gemini', enabled: true }])
    expect(state.selected.value).toEqual(['chatgpt'])
  })

  it('applies selected-platform additions/removals through server mutations, then reloads', async () => {
    const { useMonitoringPlatforms } = await import('./use-monitoring-platforms')
    const state = useMonitoringPlatforms()
    await state.load()
    await expect(state.save(['gemini'])).resolves.toBe(true)
    expect(api.removePlatform).toHaveBeenCalledWith(3)
    expect(api.selectPlatform).toHaveBeenCalledWith({ platform: 'gemini' })
    expect(api.getMarketPlatforms).toHaveBeenCalledTimes(2)
  })
})

