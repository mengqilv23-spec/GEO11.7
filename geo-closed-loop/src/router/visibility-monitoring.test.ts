import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAppRouter } from '.'
import { getMarketEntryStatus } from '../api/geo-config'
import { useGeoContextStore } from '../stores/geo-context'

vi.mock('../api/geo-config', () => ({ getMarketEntryStatus: vi.fn() }))

describe('visibility monitoring route', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('requires onboarding before entering the workbench when the server reports first-time setup', async () => {
    useGeoContextStore().entryStatus = { entryStatus: 'FIRST_TIME', marketId: 5, wizardId: null, wizardStatus: null, currentStep: null, maxReachedStep: null, stepStatus: null }
    const router = createAppRouter()
    const target = router.getRoutes().find(route => route.name === 'visibility-monitoring')
    expect(target?.path).toBe('/visibility-monitoring')
    expect(target?.meta).toMatchObject({ title: '可见性监测' })
    expect(target?.meta.requiresOnboarding).toBeTruthy()

    await router.push('/visibility-monitoring')
    expect(router.currentRoute.value.name).toBe('onboarding')
    expect(router.currentRoute.value.query.returnTo).toBe('/visibility-monitoring')
  })

  it('registers report center inside the shared workbench layout', () => {
    const router = createAppRouter()
    const target = router.getRoutes().find(route => route.name === 'report-center')

    expect(target?.path).toBe('/report-center')
    expect(target?.meta.title).toBe('报告中心')
    expect(target?.components?.default).toBeDefined()
  })

  it('registers a standalone report detail page for opening in a new window', () => {
    const router = createAppRouter()
    const target = router.getRoutes().find(route => route.name === 'report-detail')

    expect(target?.path).toBe('/reports/:reportId')
    expect(target?.meta.title).toBe('报告详情')
    expect(target?.components?.default).toBeDefined()
    expect(router.resolve('/reports/weekly-2026-09-15').matched).toHaveLength(1)
  })

  it('registers overview in the shared workbench and keeps diagnosis as the root page', async () => {
    useGeoContextStore().entryStatus = { entryStatus: 'CONFIGURED', marketId: 5, wizardId: null, wizardStatus: null, currentStep: null, maxReachedStep: null, stepStatus: null }
    const router = createAppRouter()
    const overview = router.getRoutes().find(route => route.name === 'overview')

    expect(overview?.path).toBe('/overview')
    expect(overview?.meta.title).toBe('概览')
    expect(overview?.components?.default).toBeDefined()

    await router.push('/')
    expect(router.currentRoute.value.name).toBe('diagnosis')
  })

  it('allows a user who finished onboarding to enter', async () => {
    useGeoContextStore().entryStatus = { entryStatus: 'CONFIGURED', marketId: 5, wizardId: null, wizardStatus: null, currentStep: null, maxReachedStep: null, stepStatus: null }
    const router = createAppRouter()
    await router.push('/visibility-monitoring')
    expect(router.currentRoute.value.name).toBe('visibility-monitoring')
  })

  it('opens the onboarding preview from the workbench after setup is complete', async () => {
    useGeoContextStore().entryStatus = { entryStatus: 'CONFIGURED', marketId: 5, wizardId: null, wizardStatus: null, currentStep: 4, maxReachedStep: 4, stepStatus: null }
    const router = createAppRouter()

    await router.push('/onboarding?preview=1')

    expect(router.currentRoute.value.name).toBe('onboarding')
  })

  it('resumes an unfinished server wizard instead of trusting local state', async () => {
    useGeoContextStore().entryStatus = { entryStatus: 'CONTINUE_WIZARD', marketId: 5, wizardId: 9, wizardStatus: 0, currentStep: 2, maxReachedStep: 2, stepStatus: { step1: 'DONE', step2: 'DOING' } }
    const router = createAppRouter()
    await router.push('/overview')
    expect(router.currentRoute.value.name).toBe('onboarding')
  })

  it('fetches the server entry status and fails closed when the local status is unknown', async () => {
    vi.mocked(getMarketEntryStatus).mockResolvedValue({
      entryStatus: 'FIRST_TIME',
      marketId: null,
      wizardId: null,
      wizardStatus: null,
      currentStep: null,
      maxReachedStep: null,
      stepStatus: null,
    })
    const router = createAppRouter()

    await router.push('/report-center')

    expect(getMarketEntryStatus).toHaveBeenCalledOnce()
    expect(router.currentRoute.value.name).toBe('onboarding')
  })
})

