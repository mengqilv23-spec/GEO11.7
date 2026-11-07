import { describe, expect, it } from 'vitest'
import reportDocumentSource from './ReportDetailDocument.vue?raw'

describe('report detail theme selector', () => {
  it('keeps the report root inside the global dark-theme selector', () => {
    expect(reportDocumentSource).toContain(`<style>\nhtml[data-theme='dark'] .report-document`)
  })
})

