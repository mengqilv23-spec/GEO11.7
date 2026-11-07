import type { MaybeRef, MaybeRefOrGetter, ShallowRef } from 'vue'
import {
  computed,

  shallowRef,

  toRef,
  toValue,
  unref,
  watch,
} from 'vue'
import { isAvailableDialogTarget } from '../dialog/dialog-focus'
import { useInteractionScope } from '../interaction/useInteractionScope'
import { registerOverlayLayer, restoreOverlayFocus } from './overlay-manager'
import { useModalBlocked } from './useModalBlocked'
import { useOverlayScope } from './useOverlayScope'

export interface UseDialogOverlayOptions {
  open: MaybeRefOrGetter<boolean>
  dialog: Readonly<ShallowRef<HTMLDialogElement | null>>
  onEscape: MaybeRef<() => void>
  canClose: MaybeRefOrGetter<boolean>
  initialFocus?: MaybeRef<(() => HTMLElement | null) | undefined>
}

/** 原生页面模态与助手局部 dialog 共用生命周期，但只有页面模态锁定 body。 */
export function useDialogOverlay(options: UseDialogOverlayOptions) {
  const scope = useOverlayScope()
  const interaction = useInteractionScope()
  const blocked = useModalBlocked()
  const opened = shallowRef(false)
  const local = scope.scope === 'assistant'
  const available = computed(() => (
    !local || (Boolean(scope.container.value) && (!blocked.value || opened.value))
  ))
  const open = toRef(options.open)

  watch(
    [open, options.dialog, available, interaction],
    ([shouldOpen, dialog, isAvailable, currentInteraction], _previous, onCleanup) => {
      if (!shouldOpen || !dialog || !isAvailable || !currentInteraction.active)
        return

      const ownerDocument = dialog.ownerDocument
      const trigger = ownerDocument.activeElement instanceof HTMLElement
        ? ownerDocument.activeElement
        : null

      if (local) {
        dialog.setAttribute('open', '')
        scope.setLocalModal(1)
      }
      else {
        const descendants = Array.from(dialog.querySelectorAll<HTMLDialogElement>('dialog[open]'))
        descendants.forEach(child => child.close())
        dialog.showModal()
        descendants.forEach(child => child.showModal())
      }
      opened.value = true

      const unregister = registerOverlayLayer({
        scope: scope.scope,
        modal: true,
        getElement: () => dialog,
        onEscape: () => {
          if (currentInteraction.isCurrent())
            unref(options.onEscape)()
        },
        canClose: () => currentInteraction.isCurrent() && toValue(options.canClose),
      })

      const initialFocus = unref(options.initialFocus)
      const target = initialFocus?.() ?? (local
        ? dialog.querySelector<HTMLElement>('button:not(:disabled),input:not(:disabled),[tabindex]')
        : null)
      if (target && isAvailableDialogTarget(target))
        target.focus()

      const trapLocalTab = (event: KeyboardEvent) => {
        if (!local || event.key !== 'Tab' || dialog.inert)
          return
        const elements = Array.from(
          dialog.querySelectorAll<HTMLElement>('button,input,textarea,select,[href],[tabindex]'),
        ).filter(element => (
          element.tabIndex >= 0
          && !element.matches(':disabled')
          && !element.closest('[inert]')
          && element.getClientRects().length > 0
        ))
        const first = elements[0]
        const last = elements.at(-1)
        if (!first) {
          event.preventDefault()
          dialog.focus()
        }
        else if (event.shiftKey && ownerDocument.activeElement === first) {
          event.preventDefault()
          last?.focus()
        }
        else if (!event.shiftKey && ownerDocument.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
      dialog.addEventListener('keydown', trapLocalTab)

      onCleanup(() => {
        dialog.removeEventListener('keydown', trapLocalTab)
        if (local) {
          dialog.removeAttribute('open')
          scope.setLocalModal(-1)
        }
        else {
          dialog.close()
        }
        opened.value = false
        unregister()

        const restore = () => {
          if (currentInteraction.isCurrent())
            restoreOverlayFocus(trigger)
        }
        restore()
        queueMicrotask(restore)
      })
    },
    { immediate: true, flush: 'post' },
  )

  return { local, container: scope.container, interaction }
}

