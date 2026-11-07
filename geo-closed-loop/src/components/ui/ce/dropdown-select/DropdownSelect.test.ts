import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import DropdownSelect from './DropdownSelect.vue'

const options = [
  { value: 'first', label: '第一项' },
  { value: 'second', label: '第二项' },
]

describe('dropdownSelect icons', () => {
  it('matches the panel width to the trigger width by default', async () => {
    const wrapper = mount(DropdownSelect, {
      attachTo: document.body,
      props: { modelValue: 'first', options, ariaLabel: '选择选项' },
    })
    const trigger = wrapper.get('button').element
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
      x: 20,
      y: 20,
      left: 20,
      top: 20,
      right: 260,
      bottom: 60,
      width: 240,
      height: 40,
      toJSON: () => ({}),
    } as DOMRect)

    await wrapper.get('button').trigger('click')
    await wrapper.vm.$nextTick()

    expect(document.body.querySelector<HTMLElement>('.ce-dropdown-select__panel')?.style.width).toBe('240px')
    wrapper.unmount()
  })

  it('uses an SVG chevron and check for its selected option', async () => {
    const wrapper = mount(DropdownSelect, {
      attachTo: document.body,
      props: { modelValue: 'first', options, ariaLabel: '选择选项' },
    })

    expect(wrapper.find('svg.lucide-chevron-down').exists()).toBe(true)
    await wrapper.get('button').trigger('click')
    expect(document.body.querySelector('.ce-dropdown-select__check svg.lucide-check')).not.toBeNull()
    expect(document.body.querySelector('[role="option"][aria-selected="true"]')?.textContent).toContain('第一项')
    wrapper.unmount()
  })

  it('keeps a caller-provided selected indicator string compatible', async () => {
    const wrapper = mount(DropdownSelect, {
      attachTo: document.body,
      props: {
        modelValue: 'first',
        options,
        ariaLabel: '选择选项',
        selectedIndicator: '✓✓',
      },
    })

    await wrapper.get('button').trigger('click')
    expect(document.body.querySelector('.ce-dropdown-select__check')?.textContent).toBe('✓✓')
    wrapper.unmount()
  })
})

