import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'

const staticDemoPath = resolve(process.cwd(), 'static-demo/index.html')

describe('standalone static demo', () => {
  it('contains the project pages without iframe or external runtime dependencies', () => {
    const html = readFileSync(staticDemoPath, 'utf8')
    const dom = new JSDOM(html)

    expect(dom.window.document.querySelector('iframe')).toBeNull()
    expect(dom.window.document.querySelector('script[src]')).toBeNull()
    const navLabels = [...dom.window.document.querySelectorAll('.sidebar nav .nav-text')]
      .map(label => label.textContent?.trim())

    expect(navLabels).toEqual(['概览', '诊断与策略', '优化中心', '可见性监测', '报告中心'])
    expect(dom.window.document.querySelectorAll('[data-page-panel]')).toHaveLength(9)
  })

  it('keeps the original view fields and supporting page links in the static content', () => {
    const html = readFileSync(staticDemoPath, 'utf8')

    expect(html).toContain('本次监测')
    expect(html).toContain('较上次监测（pp）')
    expect(html).toContain('页面与证据')
    expect(html).toContain('整改建议')
    expect(html).toContain('任务类型')
    expect(html).toContain('任务状态')
    expect(html).toContain('报告类型')
    expect(html).toContain('当前监测流程')
    expect(html).toContain('data-page-link="task-detail"')
    expect(html).toContain('data-page-link="report-detail"')
  })

  it('switches the visible page and active navigation item when selected', () => {
    const html = readFileSync(staticDemoPath, 'utf8')
    const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/static-demo/' })
    const { document, Event } = dom.window
    const overview = document.querySelector<HTMLElement>('[data-page-panel="overview"]')
    const diagnosis = document.querySelector<HTMLElement>('[data-page-panel="diagnosis"]')
    const diagnosisLink = document.querySelector<HTMLButtonElement>('[data-page-link="diagnosis"]')

    expect(overview?.hidden).toBe(false)
    expect(diagnosis?.hidden).toBe(true)
    diagnosisLink?.dispatchEvent(new Event('click', { bubbles: true }))

    expect(overview?.hidden).toBe(true)
    expect(diagnosis?.hidden).toBe(false)
    expect(diagnosisLink?.getAttribute('aria-current')).toBe('page')
  })

  it('opens supporting pages from the main views and keeps their parent navigation active', () => {
    const html = readFileSync(staticDemoPath, 'utf8')
    const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/static-demo/' })
    const { document, Event } = dom.window
    const detailLink = document.querySelector<HTMLButtonElement>('[data-page-link="task-detail"]')
    const taskDetail = document.querySelector<HTMLElement>('[data-page-panel="task-detail"]')
    const optimizationLink = document.querySelector<HTMLButtonElement>('.sidebar [data-page-link="optimization"]')

    detailLink?.dispatchEvent(new Event('click', { bubbles: true }))

    expect(taskDetail?.hidden).toBe(false)
    expect(optimizationLink?.getAttribute('aria-current')).toBe('page')

    const visibilityLink = document.querySelector<HTMLButtonElement>('.sidebar [data-page-link="visibility"]')
    visibilityLink?.dispatchEvent(new Event('click', { bubbles: true }))
    document.querySelector<HTMLButtonElement>('[data-step="5"]')?.dispatchEvent(new Event('click', { bubbles: true }))

    expect(document.querySelector<HTMLElement>('[data-stage="5"]')?.classList.contains('is-active')).toBe(true)
  })
})

