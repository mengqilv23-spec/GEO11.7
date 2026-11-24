import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import DiagnosisView from './DiagnosisView.vue'

const workbench = vi.hoisted(() => ({
  findings: [],
  personas: [],
  activePersona: { value: 'engineering' },
  strategies: [],
  tasks: [],
  strategyLayer: { value: '全部' },
  highlightedStrategy: { value: undefined },
  toggleFinding: vi.fn(),
  selectAllFindings: vi.fn(),
  approveSelectedFindings: vi.fn(),
  openStrategy: vi.fn(),
  confirmStrategy: vi.fn(),
  openFlow: vi.fn(),
  openAudit: vi.fn(),
  openAuditCheck: vi.fn(),
  openPending: vi.fn(),
}))

vi.mock('../composables/workbench-route-context', () => ({ useGeoWorkbenchRouteContext: () => workbench }))
vi.mock('../components/workbench/diagnosis/DiagnosisContent.vue', () => ({
  default: {
    props: ['activePersona'],
    emits: ['selectPersona'],
    template: '<div data-testid="local-workflow"><span>{{ activePersona }}</span><button type="button" @click="$emit(\'selectPersona\', \'procurement\')">switch persona</button></div>',
  },
}))
describe('diagnosis view', () => {
  it('renders the local workflow with the active persona and connects persona changes', async () => {
    workbench.activePersona.value = 'engineering'

    const wrapper = mount(DiagnosisView)
    expect(wrapper.get('[data-testid="local-workflow"] span').text()).toBe('engineering')
    await wrapper.get('[data-testid="local-workflow"] button').trigger('click')
    expect(workbench.activePersona.value).toBe('procurement')
    expect(wrapper.text()).not.toContain('原始诊断查询数据')
  })
})

