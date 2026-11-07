export interface StandaloneReportHtmlOptions {
  title: string
  baseUrl: string
  styles: string
  content: string
}

export function cloneReportForExport(source: HTMLElement, sectionIds: readonly string[]) {
  const report = source.cloneNode(true) as HTMLElement
  report.querySelector('.report-toolbar')?.remove()
  report.querySelector('.report-toc')?.remove()
  report.querySelectorAll<HTMLElement>('.report-section').forEach((section) => {
    if (!sectionIds.includes(section.id))
      section.remove()
  })
  return report
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('\'', '&#39;')
}

export function createStandaloneReportHtml({ title, baseUrl, styles, content }: StandaloneReportHtmlOptions) {
  const safeStyles = styles.replaceAll('</style', '<\\/style')

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <base href="${escapeHtml(baseUrl)}">
  <title>${escapeHtml(title)}</title>
  <style>${safeStyles}
.report-layout { display: block !important; width: min(calc(100% - 48px), 1180px) !important; margin: 0 auto !important; padding: 30px 0 56px !important; }
.report-toc { display: none !important; }
.report-main { width: 100%; }
@media (max-width: 700px) { .report-layout { width: calc(100% - 24px) !important; padding: 16px 0 32px !important; } .report-section { padding: 14px !important; } }
</style>
</head>
<body>
${content}
</body>
</html>`
}

