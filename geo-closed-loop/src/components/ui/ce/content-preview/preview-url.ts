function isLoopback(hostname: string) {
  return hostname === 'localhost' || hostname === '[::1]' || /^127(?:\.\d{1,3}){3}$/.test(hostname)
}

export function resolvePreviewUrl(
  source: string,
  trustedBlobUrls: readonly string[],
  pageUrl = globalThis.location?.href,
): string | null {
  const value = source.trim()
  if (!value)
    return null
  for (const character of value) {
    const code = character.charCodeAt(0)
    if (code < 0x20 || code === 0x7F)
      return null
  }
  try {
    const page = pageUrl ? new URL(pageUrl) : null
    const url = page ? new URL(value, page) : new URL(value)
    if (url.username || url.password)
      return null
    if (url.protocol === 'https:')
      return url.href
    if (url.protocol === 'blob:') {
      return page && url.origin === page.origin && trustedBlobUrls.includes(value) ? url.href : null
    }
    if (url.protocol !== 'http:' || !page)
      return null
    const relative = !/^[a-z][a-z\d+.-]*:/i.test(value) && !value.startsWith('//')
    if (relative && url.origin === page.origin)
      return url.href
    return isLoopback(page.hostname) && isLoopback(url.hostname) ? url.href : null
  }
  catch {
    return null
  }
}

export function isPreviewMimeAllowed(kind: string, mimeType?: string) {
  if (!mimeType)
    return true
  const mime = mimeType.split(';')[0]?.trim().toLowerCase()
  if (!mime || mime === 'application/octet-stream')
    return true
  if (kind === 'pdf')
    return mime === 'application/pdf'
  return ['image', 'audio', 'video'].includes(kind) && mime.startsWith(`${kind}/`)
}

