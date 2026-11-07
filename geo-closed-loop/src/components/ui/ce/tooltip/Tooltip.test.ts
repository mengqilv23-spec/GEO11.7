import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import Tooltip from './Tooltip.vue'

describe('tooltip', () => {
  it('repositions an open callout when the page scrolls', async () => {
    vi.useFakeTimers()

    const wrapper = mount(Tooltip, {
      props: { content: '当前监测口径', placement: 'right', variant: 'callout' },
      slots: { default: '<button type="button">i</button>' },
    })
    const button = wrapper.get('button').element
    let top = 40
    vi.spyOn(button, 'getBoundingClientRect').mockImplementation(() => ({
      x: 20,
      y: top,
      top,
      right: 36,
      bottom: top + 16,
      left: 20,
      width: 16,
      height: 16,
      toJSON: () => ({}),
    }))

    await wrapper.get('button').trigger('mouseenter')
    await vi.advanceTimersByTimeAsync(300)
    await nextTick()

    const callout = document.body.querySelector<HTMLElement>('.ce-tooltip')
    expect(callout?.style.top).toBe('48px')

    top = 10
    window.dispatchEvent(new Event('scroll'))
    await nextTick()

    expect(callout?.style.top).toBe('18px')

    wrapper.unmount()
  })

  it('keeps a help callout inside the viewport when its trigger is near the top edge', async () => {
    vi.useFakeTimers()
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 240 })

    const wrapper = mount(Tooltip, {
      props: { content: '较长的说明文字'.repeat(20), placement: 'right', variant: 'callout' },
      slots: { default: '<button type="button">i</button>' },
    })
    const button = wrapper.get('button').element
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
      x: 20,
      y: 8,
      top: 8,
      right: 36,
      bottom: 24,
      left: 20,
      width: 16,
      height: 16,
      toJSON: () => ({}),
    })

    await wrapper.get('button').trigger('mouseenter')
    await vi.advanceTimersByTimeAsync(300)
    await nextTick()
    await nextTick()

    const callout = document.body.querySelector<HTMLElement>('.ce-tooltip')
    expect(callout).not.toBeNull()
    expect(callout?.querySelector('.ce-tooltip__content')).not.toBeNull()
    vi.spyOn(callout!, 'getBoundingClientRect').mockReturnValue({
      x: 36,
      y: 0,
      top: 0,
      right: 236,
      bottom: 100,
      left: 36,
      width: 200,
      height: 100,
      toJSON: () => ({}),
    })
    window.dispatchEvent(new Event('resize'))
    await nextTick()
    expect(callout?.style.top).toBe('58px')
    expect(callout?.style.getPropertyValue('--ce-tooltip-arrow-top')).toBe('2px')

    wrapper.unmount()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })
})

