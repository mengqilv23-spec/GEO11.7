import { describe, expect, it } from 'vitest'
import { cloneReportForExport, createStandaloneReportHtml } from './report-export'

describe('standalone report export', () => {
  it('wraps selected report content with title, base URL, and embedded styles', () => {
    const html = createStandaloneReportHtml({
      title: '月报 <APW>',
      baseUrl: 'https://reports.example/report/1',
      styles: '.report { color: #123; }',
      content: '<main class="report"><section id="summary">摘要</section></main>',
    })

    expect(html).toContain('<!doctype html>')
    expect(html).toContain('<title>月报 &lt;APW&gt;</title>')
    expect(html).toContain('<base href="https://reports.example/report/1">')
    expect(html).toContain('.report { color: #123; }')
    expect(html).toContain('id="summary"')
  })

  it('escapes attribute content and does not inject a closing style tag', () => {
    const html = createStandaloneReportHtml({
      title: 'Report & details',
      baseUrl: 'https://reports.example/?a="b"&c=1',
      styles: 'body::after { content: "</style><script>bad()</script>"; }',
      content: '<main>safe content</main>',
    })

    expect(html).toContain('<title>Report &amp; details</title>')
    expect(html).toContain('href="https://reports.example/?a=&quot;b&quot;&amp;c=1"')
    expect(html).not.toContain('</style><script>bad()')
    expect(html).toContain('<\\/style>')
  })

  it('removes unselected sections and report navigation from the exported clone', () => {
    const source = document.createElement('div')
    source.innerHTML = `
      <header class="report-toolbar">toolbar</header>
      <nav class="report-toc">toc</nav>
      <main><section id="summary" class="report-section">summary</section>
      <section id="analysis" class="report-section">analysis</section></main>`

    const report = cloneReportForExport(source, ['summary'])

    expect(report.querySelector('.report-toolbar')).toBeNull()
    expect(report.querySelector('.report-toc')).toBeNull()
    expect(report.querySelector('#summary')?.textContent).toBe('summary')
    expect(report.querySelector('#analysis')).toBeNull()
  })
})

