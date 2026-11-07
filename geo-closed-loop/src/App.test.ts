import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import App from './App.vue'

describe('standalone app bootstrap', () => {
  it('loads the local market context and mounts the routed page without a host session', async () => {
    const wrapper = mount(App, {
      global: { plugins: [createPinia()], stubs: { GeoProductGuide: true, RouterView: { template: '<div data-testid="routed-page" />' } } },
    })
    await flushPromises()
    expect(wrapper.find('[data-testid="routed-page"]').exists()).toBe(true)
    expect(wrapper.find('.ce-spinner').exists()).toBe(false)
    wrapper.unmount()
  })
})

