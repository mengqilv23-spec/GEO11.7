import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { visibilityMonitoringData as data } from '../../../data/visibility-monitoring-data'
import SourceDetailDrawer from './SourceDetailDrawer.vue'

describe('sourceDetailDrawer', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('shows a cited page and emits the related question selected by the user', async () => {
    const page = data.citedPages[0]!
    const wrapper = mount(SourceDetailDrawer, {
      attachTo: document.body,
      props: {
        source: page,
        open: true,
        sources: data.sources,
        pages: data.citedPages,
        questions: data.questions,
        platforms: data.platforms,
      },
    })

    expect(wrapper.find('.ce-drawer').exists()).toBe(true)
    expect(wrapper.text()).toContain(page.title)
    expect(wrapper.text()).toContain('ChatGPT')
    await wrapper.get('[data-select-question="Q01"]').trigger('click')
    expect(wrapper.emitted('selectQuestion')?.[0]).toEqual(['Q01'])
    wrapper.unmount()
  })

  it('shows a domain page list and emits the selected page ID', async () => {
    const source = data.sources[0]!
    const wrapper = mount(SourceDetailDrawer, {
      attachTo: document.body,
      props: {
        source,
        open: true,
        sources: data.sources,
        pages: data.citedPages,
        questions: data.questions,
        platforms: data.platforms,
      },
    })

    expect(wrapper.text()).toContain(source.domain)
    expect(wrapper.text()).toContain('各 AI 平台引用分布')
    expect(wrapper.text()).toContain('Flow')
    expect(wrapper.text()).toContain('12')
    expect(wrapper.findAll('.vm-source-table-scroll[role="region"][tabindex="0"]')).toHaveLength(2)
    expect(wrapper.get('[data-select-question="Q01"]').classes()).toContain('geo-table-detail-button')
    await wrapper.get('[data-select-page="page-1"]').trigger('click')
    expect(wrapper.emitted('selectPage')?.[0]).toEqual(['page-1'])
    wrapper.unmount()
  })
})

