import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MonitoringSettingsDialog from './MonitoringSettingsDialog.vue'

const props = {
  open: true as const,
  frequency: 'weekly' as const,
  selectedPlatforms: ['chatgpt'],
  planName: '专业版',
}

describe('monitoringSettingsDialog', () => {
  it('shows the five supported platforms, locks plan frequency, and saves platform selection', async () => {
    const wrapper = mount(MonitoringSettingsDialog, { props })
    expect(wrapper.get('dialog').attributes('open')).toBeDefined()
    expect(wrapper.find('button[aria-label="关闭设置"] svg.lucide-x').exists()).toBe(true)
    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(1)
    expect(wrapper.get('input[type="radio"][value="weekly"]').element).toHaveProperty('disabled', true)
    expect(wrapper.text()).toContain('每周')
    expect(wrapper.text()).not.toContain('每月')
    expect(wrapper.find('.vm-schedule').exists()).toBe(false)
    expect(wrapper.text()).toContain('执行日期与时间由系统安排')
    expect(wrapper.text()).toContain('保存当前设置')
    expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(5)
    expect(wrapper.text()).toContain('AI Overview')
    expect(wrapper.text()).toContain('Claude')
    expect(wrapper.get('input[type="checkbox"][value="claude"]').element).toHaveProperty('disabled', true)
    await wrapper.get('button.is-primary').trigger('click')
    expect(wrapper.emitted('save')?.[0]?.[0]).toEqual({ frequency: 'weekly', platforms: ['chatgpt'] })
    wrapper.unmount()
  })

  it('cancels without emitting save', async () => {
    const wrapper = mount(MonitoringSettingsDialog, { props })
    await wrapper.get('.vm-settings__foot button:not(.is-primary)').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('save')).toBeUndefined()
    wrapper.unmount()
  })
})

