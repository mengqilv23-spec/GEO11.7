import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { getReportSectionLabels } from '../../data/report-detail-data'
import ReportExportDialog from './ReportExportDialog.vue'

const ModalStub = defineComponent({
  setup(_, { slots }) {
    return () => h('div', [slots.default?.(), slots.footer?.()])
  },
})

describe('report export dialog', () => {
  it('defaults all sections to selected and emits only selected sections', async () => {
    const wrapper = mount(ReportExportDialog, {
      props: { open: true, sections: getReportSectionLabels() },
      global: { stubs: { Modal: ModalStub } },
    })
    const checkboxes = wrapper.findAll('input[type="checkbox"]')

    expect(checkboxes).toHaveLength(5)
    expect(checkboxes.every(checkbox => (checkbox.element as HTMLInputElement).checked)).toBe(true)

    await checkboxes[1]!.setValue(false)
    await wrapper.get('button.export-action--primary').trigger('click')

    expect(wrapper.emitted('export')?.[0]).toEqual([{
      format: 'html',
      sections: ['summary', 'evidence', 'details', 'strategy'],
    }])
    expect(wrapper.emitted('update:open')?.[0]).toEqual([false])
    wrapper.unmount()
  })

  it('disables export when no section is selected', async () => {
    const wrapper = mount(ReportExportDialog, {
      props: { open: true, sections: getReportSectionLabels() },
      global: { stubs: { Modal: ModalStub } },
    })

    for (const checkbox of wrapper.findAll('input[type="checkbox"]'))
      await checkbox.setValue(false)

    expect(wrapper.findAll('button.export-action:disabled')).toHaveLength(2)
    wrapper.unmount()
  })
})

