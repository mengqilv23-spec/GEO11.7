import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import OverviewInfoIcon from './OverviewInfoIcon.vue'

describe('overview info icon', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows its help copy in the shared tooltip on hover', async () => {
    vi.useFakeTimers()
    const copy = '集中查看指标变化和各平台表现。'
    const wrapper = mount(OverviewInfoIcon, {
      props: { label: '概览说明', title: copy },
    })

    await wrapper.get('button').trigger('mouseenter')
    await vi.advanceTimersByTimeAsync(300)

    expect(document.body.querySelector('.ce-tooltip__content')?.textContent).toContain(copy)
    wrapper.unmount()
  })
})

