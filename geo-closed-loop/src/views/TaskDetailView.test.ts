import type { GeoTask } from '../data/geo-data'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { geoWorkbenchRouteContextKey } from '../composables/workbench-route-context'
import TaskDetailView from './TaskDetailView.vue'

const { router, route } = vi.hoisted(() => ({
  router: { back: vi.fn(), replace: vi.fn() },
  route: { params: { taskId: 'T-2501' } },
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

function mountView(role = ref<'ops' | 'client'>('ops')) {
  const wrapper = mount(TaskDetailView, {
    global: {
      provide: {
        [geoWorkbenchRouteContextKey as symbol]: {
          tasks: [task],
          role,
          serviceMode: { value: 'managed' },
        },
      },
      stubs: {
        TaskWorkspace: {
          props: ['task', 'role', 'serviceMode', 'clientPreview'],
          emits: ['back', 'setTestRole'],
          template: '<button data-test="back" @click="$emit(\'back\')">← 返回优化中心</button><span data-test="active-role">{{ role }} / {{ clientPreview }}</span><button data-test="role-ops" @click="$emit(\'setTestRole\', \'ops\')">运营</button><button data-test="role-client" @click="$emit(\'setTestRole\', \'client\')">客户</button>',
        },
      },
    },
  })
  return { wrapper, role }
}

describe('task detail back navigation', () => {
  beforeEach(() => vi.clearAllMocks())

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

describe('client role preview', () => {
  it('switches between operations and customer roles on this task only', async () => {
    const { wrapper, role: workbenchRole } = mountView()

    expect(wrapper.get('[data-test="active-role"]').text()).toBe('ops / false')
    await wrapper.get('[data-test="role-client"]').trigger('click')
    expect(wrapper.get('[data-test="active-role"]').text()).toBe('client / true')
    await wrapper.get('[data-test="role-ops"]').trigger('click')
    expect(wrapper.get('[data-test="active-role"]').text()).toBe('ops / false')
    expect(workbenchRole.value).toBe('ops')
  })
})

