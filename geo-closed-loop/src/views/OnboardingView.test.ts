import type { useFirstConfigWizard } from '../composables/use-first-config-wizard'
import type { useOnboardingStore } from '../stores/onboarding'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { shallowRef } from 'vue'
import OnboardingView from './OnboardingView.vue'

const mocks = vi.hoisted(() => ({
  wizard: null as unknown,
  store: null as unknown,
  push: vi.fn(),
}))

vi.mock('../composables/use-first-config-wizard', () => ({
  useFirstConfigWizard: () => mocks.wizard,
}))
vi.mock('../stores/onboarding', () => ({
  useOnboardingStore: () => mocks.store,
}))
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ push: mocks.push }),
}))

describe('onboarding view load errors', () => {
  beforeEach(() => {
    mocks.push.mockReset()
    mocks.wizard = {
      loading: shallowRef(false),
      saving: shallowRef(false),
      loaded: shallowRef(false),
      error: shallowRef('请求体格式错误'),
      questionCandidates: shallowRef([]),
      questionLimit: shallowRef(null),
      dictionaryOptions: shallowRef({}),
      load: vi.fn().mockRejectedValue(new Error('请求体格式错误')),
      saveCurrentStep: vi.fn(),
    } as unknown as ReturnType<typeof useFirstConfigWizard>
    mocks.store = {
      currentStep: 0,
      steps: [],
      knowledgeItems: [],
      buyerPersonas: [],
      selectedMonitoringQuestionIds: [],
      customMonitoringQuestions: [],
      monitoringPlatforms: [],
      monitoringFrequency: '',
      goNext: vi.fn(),
      goPrevious: vi.fn(),
      updateKnowledgeItems: vi.fn(),
      addCustomMonitoringQuestion: vi.fn(),
      updateMonitoringQuestionSelection: vi.fn(),
    } as unknown as ReturnType<typeof useOnboardingStore>
  })

  it('shows a compact floating load-error toast without a retry action or page panel', async () => {
    const wrapper = mount(OnboardingView)
    await flushPromises()

    const toast = document.body.querySelector('.ce-toast')
    expect(wrapper.find('.onboarding-page__status').exists()).toBe(true)
    expect(wrapper.find('.onboarding-page__status .ce-toast').exists()).toBe(false)
    expect(toast?.getAttribute('role')).toBe('alert')
    expect(toast?.textContent).toContain('请求体格式错误')
    expect(toast?.querySelector('.ce-alert__title')).toBeNull()
    expect(toast?.textContent).not.toContain('重试')
    expect(toast?.querySelector('button')).toBeNull()

    wrapper.unmount()
  })

  it('uses only a quiet spinner while onboarding data is loading', () => {
    ;(mocks.wizard as ReturnType<typeof useFirstConfigWizard>).loading.value = true
    const wrapper = mount(OnboardingView)

    expect(wrapper.find('.ce-spinner').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('正在读取后端新人引导配置')
    wrapper.unmount()
  })
})

