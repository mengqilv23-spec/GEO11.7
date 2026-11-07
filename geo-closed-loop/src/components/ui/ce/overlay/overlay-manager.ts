import { isAvailableDialogTarget } from '../dialog/dialog-focus'

export type OverlayDomain = 'page' | 'assistant'

export interface OverlayRegistration {
  scope: OverlayDomain
  modal?: boolean
  onEscape: () => void
  canClose?: () => boolean
  getElement?: () => HTMLElement | null
}

const layers: OverlayRegistration[] = []
const listeners = new Set<() => void>()
const consumed = new WeakSet<Event>()
const scrollLocks = new WeakMap<Document, { count: number, overflow: string }>()
let modalCount = 0

export function getModalBlocked() {
  return modalCount > 0
}

export function subscribeModalBlocked(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function topLayer() {
  const pageModals = layers.filter(layer => layer.modal && layer.scope === 'page')
  const topModal = pageModals.reduce<OverlayRegistration | undefined>((top, layer) => {
    if (layer.getElement?.()?.contains(top?.getElement?.() ?? null))
      return top
    return layer
  }, undefined)
  const candidates = topModal
    ? layers.filter((layer) => {
        const element = layer.getElement?.()
        return layer === topModal
          || (layer.scope === 'page' && Boolean(element) && topModal.getElement?.()?.contains(element ?? null))
      })
    : layers

  return candidates.reduce<OverlayRegistration | undefined>((top, layer) => {
    if (layer.getElement?.()?.contains(top?.getElement?.() ?? null))
      return top
    return layer
  }, undefined)
}

export function isTopOverlayElement(element: HTMLElement) {
  return topLayer()?.getElement?.() === element
}

function syncLocalModals() {
  const localModals = layers.filter(layer => layer.modal && layer.scope === 'assistant')
  const top = localModals.reduce<OverlayRegistration | undefined>((previous, layer) => {
    if (layer.getElement?.()?.contains(previous?.getElement?.() ?? null))
      return previous
    return layer
  }, undefined)

  for (const layer of localModals) {
    const element = layer.getElement?.()
    if (element)
      element.inert = layer !== top
  }
}

export function consumeEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape' || event.isComposing || event.keyCode === 229)
    return false
  if (consumed.has(event))
    return true
  const layer = topLayer()
  if (!layer)
    return false

  consumed.add(event)
  event.preventDefault()
  event.stopImmediatePropagation()
  if (layer.canClose?.() !== false)
    layer.onEscape()
  return true
}

export function consumeOverlayCancel(element: HTMLElement) {
  const layer = topLayer()
  if (layer?.getElement?.() === element && layer.canClose?.() !== false) {
    layer.onEscape()
  }
}

export function registerOverlayLayer(layer: OverlayRegistration) {
  if (layers.length === 0)
    window.addEventListener('keydown', consumeEscape, true)
  layers.push(layer)
  syncLocalModals()

  const pageModal = layer.modal && layer.scope === 'page'
  const ownerDocument = layer.getElement?.()?.ownerDocument ?? document
  if (pageModal) {
    modalCount += 1
    let lock = scrollLocks.get(ownerDocument)
    if (!lock) {
      lock = { count: 0, overflow: ownerDocument.body.style.overflow }
      scrollLocks.set(ownerDocument, lock)
      ownerDocument.body.style.overflow = 'hidden'
    }
    lock.count += 1
    listeners.forEach(listener => listener())
  }

  let released = false
  return () => {
    if (released)
      return
    released = true
    const index = layers.indexOf(layer)
    if (index >= 0)
      layers.splice(index, 1)
    syncLocalModals()

    if (pageModal) {
      modalCount -= 1
      const lock = scrollLocks.get(ownerDocument)
      if (lock && --lock.count === 0) {
        ownerDocument.body.style.overflow = lock.overflow
        scrollLocks.delete(ownerDocument)
      }
      listeners.forEach(listener => listener())
    }
    if (layers.length === 0)
      window.removeEventListener('keydown', consumeEscape, true)
  }
}

export function restoreOverlayFocus(trigger: HTMLElement | null) {
  const top = topLayer()
  const topElement = top?.getElement?.()
  const allowed = !top?.modal || !topElement || topElement.contains(trigger)
  if (trigger && isAvailableDialogTarget(trigger) && allowed) {
    trigger.focus()
    return
  }
  if (
    topElement
    && ((top?.modal && !topElement.contains(document.activeElement))
      || document.activeElement === document.body
      || !document.activeElement?.isConnected)
  ) {
    const fallback = topElement.querySelector<HTMLElement>('button:not(:disabled),input:not(:disabled),[tabindex]')
    ;(fallback ?? topElement).focus()
  }
}

