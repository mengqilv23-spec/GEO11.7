import { createRouter, createWebHistory } from 'vue-router'
import GeoWorkbenchLayout from '../layouts/GeoWorkbenchLayout.vue'
import { useGeoContextStore } from '../stores/geo-context'
import { pageLoaders } from './prefetch'

declare module 'vue-router' {
  interface RouteMeta {
    /** 页面标题，afterEach 里拼接 document.title */
    title?: string
    /** 标记后，未完成引导（含跳过）访问该页会被守卫重定向回 /onboarding */
    requiresOnboarding?: boolean
  }
}

export function createAppRouter() {
  const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
      {
        path: '/',
        component: GeoWorkbenchLayout,
        children: [
          { path: '', redirect: { name: 'diagnosis' } },
          {
            path: 'overview',
            name: 'overview',
            component: pageLoaders.overview,
            meta: { title: '概览', requiresOnboarding: true },
          },
          {
            path: 'diagnosis',
            name: 'diagnosis',
            component: pageLoaders.diagnosis,
            meta: { title: '诊断与策略', requiresOnboarding: true },
          },
          {
            path: 'optimization',
            name: 'optimization',
            component: pageLoaders.optimization,
            meta: { title: '优化中心', requiresOnboarding: true },
          },
          {
            path: 'operations-review',
            name: 'operations-review',
            component: pageLoaders['operations-review'],
            meta: { title: '运营复盘与 Agent 升级', requiresOnboarding: true },
          },
          {
            path: 'optimization/tasks/:taskId',
            name: 'task-detail',
            component: pageLoaders['task-detail'],
            meta: { title: '任务详情', requiresOnboarding: true },
          },
          {
            path: 'visibility-monitoring',
            name: 'visibility-monitoring',
            component: pageLoaders['visibility-monitoring'],
            meta: { title: '可见性监测', requiresOnboarding: true },
          },
          {
            path: 'content-verification',
            name: 'content-verification',
            component: pageLoaders['content-verification'],
            meta: { title: '品牌内容核验', requiresOnboarding: true },
          },
          {
            path: 'report-center',
            name: 'report-center',
            component: pageLoaders['report-center'],
            meta: { title: '报告中心', requiresOnboarding: true },
          },
          {
            path: 'onboarding',
            name: 'onboarding',
            component: pageLoaders.onboarding,
            meta: { title: '品牌知识引导' },
          },
        ],
      },
      {
        path: '/market-setup',
        name: 'market-setup',
        component: pageLoaders['market-setup'],
        meta: { title: '新增市场配置', requiresOnboarding: true },
      },
      {
        path: '/optimization/tasks/:taskId/preview',
        name: 'task-preview',
        component: pageLoaders['task-preview'],
        meta: { title: '发布内容预览', requiresOnboarding: true },
      },
      {
        path: '/reports/:reportId',
        name: 'report-detail',
        component: pageLoaders['report-detail'],
        meta: { title: '报告详情', requiresOnboarding: true },
      },
      { path: '/:pathMatch(.*)*', redirect: '/' },
    ],
    scrollBehavior: () => ({ top: 0 }),
  })

  router.beforeEach(async (to) => {
    const geoContext = useGeoContextStore()
    let entryStatus = geoContext.entryStatus?.entryStatus
    if (to.name === 'onboarding')
      return entryStatus === 'CONFIGURED' && to.query.preview !== '1' ? { name: 'overview' } : true
    if (!to.meta.requiresOnboarding || entryStatus === 'CONFIGURED')
      return true

    if (!entryStatus) {
      try {
        entryStatus = (await geoContext.refreshEntryStatus()).entryStatus
      }
      catch {
        return { name: 'onboarding', query: { returnTo: to.fullPath } }
      }
    }

    if (entryStatus === 'CONFIGURED')
      return true
    return { name: 'onboarding', query: { returnTo: to.fullPath } }
  })

  router.afterEach((to) => {
    const title = to.meta.title
    document.title = title ? `${title} · GEO Agent` : 'GEO Agent'
  })

  return router
}

export default createAppRouter()
