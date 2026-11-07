import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Toast from './Toast.vue'

describe('toast defaults', () => {
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('auto-dismisses error messages after 3.5 seconds by default', async () => {
    vi.useFakeTimers()
    const wrapper = mount(Toast, {
      props: { open: true, variant: 'error', closeLabel: '关闭提示' },
      slots: { default: '请填写补充说明' },
    })

    await vi.advanceTimersByTimeAsync(3_499)
    expect(wrapper.emitted('close')).toBeUndefined()

    await vi.advanceTimersByTimeAsync(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount()
  })

  it('does not render a close control by default', () => {
    const wrapper = mount(Toast, {
      props: { open: true, variant: 'error', closeLabel: '关闭提示' },
      slots: { default: '请填写补充说明' },
    })

    expect(document.body.querySelector('.ce-alert__close')).toBeNull()
    wrapper.unmount()
  })

  it('keeps warning messages within the 3–4 second display window', async () => {
    vi.useFakeTimers()
    const wrapper = mount(Toast, {
      props: { open: true, variant: 'warning', closeLabel: '关闭提示' },
      slots: { default: '请检查填写内容' },
    })

    await vi.advanceTimersByTimeAsync(3_999)
    expect(wrapper.emitted('close')).toBeUndefined()

    await vi.advanceTimersByTimeAsync(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount()
  })
})

