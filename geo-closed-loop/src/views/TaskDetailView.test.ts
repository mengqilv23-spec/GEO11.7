import type { GeoTask } from '../data/geo-data'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { geoWorkbenchRouteContextKey } from '../composables/workbench-route-context'
import TaskDetailView from './TaskDetailView.vue'

const { router, route } = vi.hoisted(() => ({
  router: { back: vi.fn(), replace: vi.fn() },
  route: { params: { taskId: 'T-2501' }, query: undefined as Record<string, string> | undefined },
}))

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => router,
}))

const task: GeoTask = {
  id: 'T-2501',
  name: '工程师专家档案实体统一与同名消歧',
  type: 'repair',
  source: '7',
  strategy: 'GS14',
  persona: '不适用',
  factor: '实体可信度',
  methods: ['作者实体'],
  destination: '技术修复',
  progress: 'site_running',
  relatedStrategies: ['GS14'],
}

function mountView(options: { tasks?: GeoTask[] } = {}) {
  const wrapper = mount(TaskDetailView, {
    global: {
      provide: {
        [geoWorkbenchRouteContextKey as symbol]: {
          tasks: options.tasks ?? [task],
        },
      },
      stubs: {
        TaskWorkspace: {
          props: ['task'],
          emits: ['back'],
          template: '<button data-test="back" @click="$emit(\'back\')">← 返回优化中心</button><span data-test="task-view">{{ task.source }} / {{ task.contentFormat || "text" }} / {{ task.progress }}</span>',
        },
      },
    },
  })
  return { wrapper }
}

describe('task detail back navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    route.query = undefined
  })

  it('returns to browser history when an in-app previous page exists', async () => {
    window.history.replaceState({ back: '/optimization' }, '', '/')
    const { wrapper } = mountView()

    await wrapper.get('[data-test="back"]').trigger('click')

    expect(router.back).toHaveBeenCalledOnce()
    expect(router.replace).not.toHaveBeenCalled()
  })

  it('falls back to the optimization center when the detail page has no previous route', async () => {
    window.history.replaceState(null, '', '/')
    const { wrapper } = mountView()

    await wrapper.get('[data-test="back"]').trigger('click')

    expect(router.replace).toHaveBeenCalledWith({ name: 'optimization' })
    expect(router.back).not.toHaveBeenCalled()
  })
})

describe('task previews', () => {
  afterEach(() => {
    route.query = undefined
  })

  it('keeps the code review fixture reachable when the prototype task is absent from the customer list', () => {
    route.query = { preview: 'code-review' }
    const { wrapper } = mountView({ tasks: [] })

    expect(wrapper.get('[data-test="task-view"]').text()).toBe('F9 / code / client_review')
    expect(router.replace).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})

