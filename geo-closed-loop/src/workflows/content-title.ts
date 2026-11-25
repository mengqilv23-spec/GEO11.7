function decodeHtml(value: string) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', '\'')
}

/**
 * Generated articles keep the title in its own field. Older drafts repeated it
 * as the first heading of the body, so remove only that exact leading heading
 * and leave every real section heading untouched.
 */
export function stripLeadingTitleHeading(body: string, titles: Array<string | undefined>) {
  const match = /^\s*<h2[^>]*>([\s\S]*?)<\/h2>/i.exec(body)
  if (!match)
    return body
  const heading = decodeHtml((match[1] ?? '').replace(/<[^>]*>/g, '')).trim()
  const candidates = titles.map(title => title?.trim()).filter((title): title is string => Boolean(title))
  if (!candidates.includes(heading))
    return body
  return body.slice(match[0].length)
}
