import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetMockState, updateMockState } from '../mock/repository'
import { useGeoContextStore } from './geo-context'

describe('local geo context', () => {
  beforeEach(() => {
    localStorage.clear()
    resetMockState()
    setActivePinia(createPinia())
  })

  it('initializes the local demo site and configured market', async () => {
    const context = useGeoContextStore()
    await context.initialize()
    expect(context.initialized).toBe(true)
    expect(context.siteId).toBe('demo-site-apw')
    expect(context.marketId).toBe(1)
    expect(context.entryStatus?.entryStatus).toBe('FIRST_TIME')
  })

  it('shares concurrent initialization against the same local state', async () => {
    const context = useGeoContextStore()
    await Promise.all([context.initialize(), context.initialize()])
    expect(context.initialized).toBe(true)
    expect(context.siteId).toBe('demo-site-apw')
  })

  it('keeps marketId empty when no market is selected', async () => {
    updateMockState((draft) => { draft.config.activeMarketId = 0 })
    const context = useGeoContextStore()
    await context.initialize()
    expect(context.marketId).toBeNull()
  })
})

