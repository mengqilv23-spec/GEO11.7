import { DOMWrapper, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { geoGuideModules } from '../../data/geo-product-guide'
import GeoProductGuide from './GeoProductGuide.vue'
import { positionGuide } from './guide-targets'

const wrappers: ReturnType<typeof mount>[] = []
const storageKey = 'geo-product-guide:test'
const page = () => new DOMWrapper(document.body)
beforeEach(() => {
  localStorage.removeItem(storageKey)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.matches('.geo-guide-card')) return { left: 0, top: 0, width: 360, height: 320, right: 360, bottom: 320, x: 0, y: 0, toJSON() {} }
    if (this.matches('.vm-process, .vm-table-card, .vm-round-summary, .geo-audit-panel')) return { left: 100, top: 80, width: 400, height: 200, right: 500, bottom: 280, x: 100, y: 80, toJSON() {} }
    return { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON() {} }
  })
})
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})
async function setup(path = '/visibility-monitoring') {
  document.body.insertAdjacentHTML('beforeend', '<section class="vm-process"></section><section class="vm-round-summary"></section><section class="geo-audit-panel"></section><button id="visibility-step-5">监测结果</button><button id="visibility-tab-questions">问答命中明细</button><section class="vm-table-card"></section>')
  const router = createRouter({ history: createMemoryHistory(), routes: [...new Set(geoGuideModules.map(module => module.route))].map(name => ({ path: `/${name}`, name, component: { template: '<div />' } })) })
  await router.push(path)
  const wrapper = mount(GeoProductGuide, { attachTo: document.body, props: { storageKey }, global: { plugins: [router] } })
  wrappers.push(wrapper)
  await flushPromises()
  await new Promise(resolve => requestAnimationFrame(resolve))
  return { wrapper, router }
}

describe('anchored GEO guide', () => {
  it('highlights the current functional region on first entry and permits immediate skipping', async () => {
    await setup()
    expect(page().get('#geo-guide-title').text()).toBe('定义监测范围')
    expect(page().get('.geo-guide-highlight').attributes('style')).toContain('left: 94px')
    await page().get('.geo-guide-skip').trigger('click')
    expect(page().find('.geo-guide-card').exists()).toBe(false)
    expect(localStorage.getItem(storageKey)).toBe('1')
    expect(document.querySelector('[data-geo-guide-target]')).toBeNull()
  })

  it('remembers dismissal and reopens beside the current page through the entry or F1', async () => {
    localStorage.setItem(storageKey, '1')
    const { router } = await setup()
    expect(page().find('.geo-guide-card').exists()).toBe(false)
    await page().get('.geo-guide-launcher').trigger('click')
    expect(page().find('.geo-guide-card').exists()).toBe(true)
    await page().get('.geo-guide-skip').trigger('click')
    await router.push('/diagnosis')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F1', cancelable: true }))
    await flushPromises()
    expect(page().get('#geo-guide-title').text()).toBe('查看诊断证据')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))
    await flushPromises()
    expect(page().find('.geo-guide-card').exists()).toBe(false)
  })

  it('activates only display tabs when moving to question evidence', async () => {
    await setup()
    const stepClick = vi.fn()
    const tabClick = vi.fn()
    document.getElementById('visibility-step-5')!.addEventListener('click', stepClick)
    document.getElementById('visibility-tab-questions')!.addEventListener('click', tabClick)
    await page().get('footer [data-variant="primary"]').trigger('click')
    await flushPromises()
    await page().get('footer [data-variant="primary"]').trigger('click')
    await flushPromises()
    expect(stepClick).toHaveBeenCalledTimes(2)
    expect(tabClick).toHaveBeenCalledOnce()
    expect(page().get('#geo-guide-title').text()).toBe('问答命中明细')
    expect(document.querySelector('.vm-table-card')!.hasAttribute('data-geo-guide-target')).toBe(true)
  })

  it('navigates to the chosen module and preserves the product version', async () => {
    const { router } = await setup('/diagnosis?version=client')
    await page().get('select[aria-label="选择引导模块"]').setValue('overview')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('overview')
    expect(router.currentRoute.value.query.version).toBe('client')
    expect(page().get('#geo-guide-title').text()).toBe('先确定观察范围')
  })

  it('does not claim a hidden target is highlighted and cancels pending lookup when skipped', async () => {
    await setup()
    await page().get('select').setValue('task-detail')
    await flushPromises()
    expect(page().find('.geo-guide-highlight').exists()).toBe(false)
    expect(page().text()).toContain('正在定位功能区域')
    await page().get('.geo-guide-skip').trigger('click')
    await flushPromises()
    expect(page().find('.geo-guide-card').exists()).toBe(false)
  })
})

describe('guide placement', () => {
  it('uses available space beside the target and keeps a mobile card within the viewport', () => {
    const target = { left: 100, top: 80, width: 400, height: 200 }
    expect(positionGuide(target, { width: 1200, height: 800 }, { width: 360, height: 320 }).side).toBe('right')
    const mobile = positionGuide({ left: 8, top: 500, width: 359, height: 200 }, { width: 375, height: 740 }, { width: 343, height: 380 })
    expect(mobile.left).toBe(16)
    expect(mobile.top).toBeGreaterThanOrEqual(16)
    expect(mobile.top + 380).toBeLessThanOrEqual(724)
  })
})

