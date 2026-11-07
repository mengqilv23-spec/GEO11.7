import { afterEach, vi } from 'vitest'

window.scrollTo = vi.fn()

if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
}

if (!HTMLDialogElement.prototype.close) {
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
  }
}

afterEach(() => {
  document.body.innerHTML = '<div id="app"></div>'
  document.documentElement.style.overflow = ''
  for (const key of Object.keys(window.localStorage)) {
    if (key.startsWith('geo-task-draft:')) window.localStorage.removeItem(key)
  }
  vi.useRealTimers()
})

