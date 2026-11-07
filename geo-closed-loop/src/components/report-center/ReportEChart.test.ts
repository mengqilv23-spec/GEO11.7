import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import ReportEChart from './ReportEChart.vue'

const { setOption } = vi.hoisted(() => ({ setOption: vi.fn() }))

vi.mock('echarts/core', () => ({
  init: vi.fn(() => ({ setOption, resize: vi.fn(), dispose: vi.fn() })),
  use: vi.fn(),
}))

describe('report echarts theme switching', () => {
  beforeEach(() => {
    setOption.mockClear()
    delete document.documentElement.dataset.theme
  })

  it('recolors chart labels and grid when the host changes to dark mode', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Chrome')
    const wrapper = mount(ReportEChart, {
      props: {
        label: 'Report metrics',
        option: {
          xAxis: { type: 'category', axisLabel: { color: '#8291a5' } },
          yAxis: { type: 'value', splitLine: { lineStyle: { color: '#e8eef5' } } },
          series: [{ type: 'line', lineStyle: { color: '#2563eb' } }],
        },
      },
    })
    await nextTick()

    document.documentElement.dataset.theme = 'dark'
    await vi.waitFor(() => expect(setOption).toHaveBeenLastCalledWith(
      expect.objectContaining({
        xAxis: expect.objectContaining({ axisLabel: expect.objectContaining({ color: '#a8b6c8' }) }),
        yAxis: expect.objectContaining({ splitLine: { lineStyle: { color: '#344254' } } }),
      }),
      { notMerge: true },
    ))

    wrapper.unmount()
    vi.restoreAllMocks()
  })
})

