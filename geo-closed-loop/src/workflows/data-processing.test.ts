import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('staged monitoring data processing', () => {
  beforeEach(() => {
    localStorage.removeItem('geo-data-processing:v1')
    vi.resetModules()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-02T09:00:00+08:00'))
  })

  it('reveals monitoring, diagnosis, then optimization and restores progress', async () => {
    const workflow = await import('./data-processing')
    workflow.startDataProcessing()
    const state = workflow.useDataProcessing()
    expect(state.isReady('visibility-monitoring').value).toBe(false)
    expect(state.isReady('diagnosis').value).toBe(false)

    vi.advanceTimersByTime(6000)
    expect(workflow.updateDataProcessing()).toEqual(['visibility-monitoring'])
    expect(state.isReady('visibility-monitoring').value).toBe(true)
    expect(state.isReady('diagnosis').value).toBe(false)

    vi.advanceTimersByTime(6000)
    expect(workflow.updateDataProcessing()).toEqual(['diagnosis'])
    expect(state.isReady('optimization').value).toBe(false)

    vi.resetModules()
    const restored = await import('./data-processing')
    expect(restored.useDataProcessing().completed.value).toBe(2)
    vi.advanceTimersByTime(6000)
    expect(restored.updateDataProcessing()).toEqual(['optimization'])
    expect(restored.useDataProcessing().isReady('optimization').value).toBe(true)
    vi.useRealTimers()
  })
})

