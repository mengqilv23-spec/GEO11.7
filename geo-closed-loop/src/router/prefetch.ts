/**
 * Route chunk loaders shared by the router and the navigation.
 * Keeping them here lets the workbench warm the page chunks before a click,
 * which matters on slow static hosting such as GitHub Pages.
 */
export const pageLoaders = {
  'overview': () => import('../views/OverviewView.vue'),
  'diagnosis': () => import('../views/DiagnosisView.vue'),
  'optimization': () => import('../views/OptimizationView.vue'),
  'operations-review': () => import('../views/OperationsReviewView.vue'),
  'task-detail': () => import('../views/TaskDetailView.vue'),
  'visibility-monitoring': () => import('../views/VisibilityMonitoringView.vue'),
  'brand-cognition': () => import('../views/BrandCognitionView.vue'),
  'report-center': () => import('../views/ReportCenterView.vue'),
  'onboarding': () => import('../views/OnboardingView.vue'),
  'market-setup': () => import('../views/MarketSetupView.vue'),
  'task-preview': () => import('../views/TaskPreviewView.vue'),
  'report-detail': () => import('../views/ReportDetailView.vue'),
} as const

export type PageName = keyof typeof pageLoaders

const navigationPages: PageName[] = [
  'overview',
  'visibility-monitoring',
  'brand-cognition',
  'report-center',
  'diagnosis',
  'optimization',
  'operations-review',
]

const warmed = new Set<PageName>()

function loadPage(page: PageName) {
  return pageLoaders[page]()
    .then(() => undefined)
    .catch(() => {
      // Let a later hover or click retry after a transient network failure.
      warmed.delete(page)
    })
}

export function prefetchPage(page: PageName) {
  if (warmed.has(page))
    return Promise.resolve()
  warmed.add(page)
  return loadPage(page)
}

export async function prefetchNavigationPages() {
  for (const page of navigationPages)
    await prefetchPage(page)
}

export function prefetchNavigationPagesWhenIdle() {
  const start = () => {
    void prefetchNavigationPages()
  }
  if (typeof window.requestIdleCallback === 'function')
    window.requestIdleCallback(start, { timeout: 2500 })
  else
    window.setTimeout(start, 800)
}
