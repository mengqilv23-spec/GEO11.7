import { describe, expect, it } from 'vitest'
import { stripLeadingTitleHeading } from './content-title'

describe('content title separation', () => {
  it('removes a leading heading that repeats the title', () => {
    const body = '<h2>APW ffff</h2><p>正文第一段。</p>'
    expect(stripLeadingTitleHeading(body, ['APW ffff'])).toBe('<p>正文第一段。</p>')
  })

  it('matches the theme when the title adds a brand prefix', () => {
    const body = '<h2>ffff</h2><p>正文第一段。</p>'
    expect(stripLeadingTitleHeading(body, ['APW ffff', 'ffff'])).toBe('<p>正文第一段。</p>')
  })

  it('compares escaped title text and tolerates leading whitespace', () => {
    const body = '\n  <h2>水刀 &amp; 激光</h2><p>正文第一段。</p>'
    expect(stripLeadingTitleHeading(body, ['水刀 & 激光'])).toBe('<p>正文第一段。</p>')
  })

  it('keeps a real section heading that differs from the title', () => {
    const body = '<h2>适用场景</h2><p>正文第一段。</p>'
    expect(stripLeadingTitleHeading(body, ['APW ffff'])).toBe(body)
  })

  it('leaves bodies without a leading heading untouched', () => {
    const body = '<p>正文第一段。</p><h2>适用场景</h2>'
    expect(stripLeadingTitleHeading(body, ['APW ffff'])).toBe(body)
  })
})
