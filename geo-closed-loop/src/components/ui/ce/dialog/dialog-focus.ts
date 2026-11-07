/** 只检查焦点目标是否仍连接、可用且没有被视觉或交互隐藏。 */
export function isAvailableDialogTarget(element: HTMLElement) {
  if (
    !element.isConnected
    || element.matches(':disabled')
    || element.getAttribute('aria-disabled') === 'true'
    || element.closest('[hidden], [inert]')
  ) {
    return false
  }

  const view = element.ownerDocument.defaultView
  if (!view)
    return false
  for (let node: HTMLElement | null = element; node; node = node.parentElement) {
    const style = view.getComputedStyle(node)
    if (
      style.display === 'none'
      || style.visibility === 'hidden'
      || style.visibility === 'collapse'
      || style.opacity === '0'
    ) {
      return false
    }
  }
  return true
}

/** 只处理本层首尾环绕；嵌套模态、修饰键和已处理事件保留原语义。 */
export function containDialogTab(
  event: KeyboardEvent,
  fallback?: HTMLElement | null,
) {
  const dialog = event.currentTarget
  if (
    !(dialog instanceof HTMLDialogElement)
    || event.key !== 'Tab'
    || event.defaultPrevented
    || event.ctrlKey
    || event.metaKey
    || event.altKey
    || !dialog.open
    || !(event.target instanceof Element)
    || event.target.closest('dialog') !== dialog
    || dialog.querySelector('dialog[open]')
  ) {
    return
  }

  const elements = Array.from(
    dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex], [contenteditable="true"]',
    ),
  ).filter(element => (
    element.closest('dialog') === dialog
    && element.tabIndex >= 0
    && isAvailableDialogTarget(element)
  ))
  const first = elements[0]
  const last = elements.at(-1)
  const focused = dialog.ownerDocument.activeElement

  if (!first) {
    event.preventDefault()
    ;(fallback ?? dialog).focus()
  }
  else if (event.shiftKey && (focused === first || !elements.includes(focused as HTMLElement))) {
    event.preventDefault()
    last?.focus()
  }
  else if (!event.shiftKey && (focused === last || !elements.includes(focused as HTMLElement))) {
    event.preventDefault()
    first.focus()
  }
}

