import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DiagnosisApiPanel from './DiagnosisApiPanel.vue'

function props() {
  const page = { records: [], total: 0, size: 20, current: 1, pages: 0 }
  return {
    issues: { ...page, records: [{ id: 5, taskId: 2, dataSource: 'site', checkCategory: 'seo', findingTitle: 'Missing title', findingDesc: '', severity: 'high', taskType: 'content', ruleCode: 'R1', pageUrl: '', findingStatus: 'open', remediation: '', evidence: '' }] },
    gaps: { ...page, records: [] },
    strategies: { ...page, records: [{ id: 8, taskId: 2, strategyNo: 'S-1', gapId: null, personaName: 'Buyer', personaFactorName: 'Quality', taskType: 'content', priority: 'high', strategyDesc: 'Improve', agentMethod: '', briefGoal: '', briefAudience: '', briefKnowledgeUsed: '' }] },
    loading: false,
    errors: { issues: '', gaps: '', strategies: '' },
    detail: null,
    detailLoading: false,
    detailError: '',
  }
}

describe('diagnosisApiPanel detail actions', () => {
  it('requests real issue and strategy detail records from the parent view', async () => {
    const wrapper = mount(DiagnosisApiPanel, { props: props() })

    await wrapper.get('.diagnosis-section button.detail-link').trigger('click')
    expect(wrapper.emitted('detail')?.[0]).toEqual(['issue', 5])
    await wrapper.get('.diagnosis-section:last-of-type button.detail-link').trigger('click')
    expect(wrapper.emitted('detail')?.[1]).toEqual(['strategy', 8])
  })
})

