import type { MaybeRef, MaybeRefOrGetter } from 'vue'
import type { OverlayDomain } from './overlay-manager'
import {
  computed,

  onMounted,
  shallowRef,
  toValue,
  unref,
  watch,
} from 'vue'
import { useInteractionScope } from '../interaction/useInteractionScope'
import { registerOverlayLayer } from './overlay-manager'
import { useOverlayScope } from './useOverlayScope'

export interface OverlayLayerOptions {
  open: MaybeRefOrGetter<boolean>
  onEscape: MaybeRef<() => void>
  canClose?: MaybeRefOrGetter<boolean | undefined>
  scope?: MaybeRefOrGetter<OverlayDomain | undefined>
  modal?: MaybeRefOrGetter<boolean | undefined>
  element?: MaybeRefOrGetter<HTMLElement | null | undefined>
  getElement?: MaybeRef<(() => HTMLElement | null) | undefined>
}

/** 打开期间登记浮层，并在关闭、暂停或卸载时自动释放。 */
export function useOverlayLayer(options: OverlayLayerOptions) {
  const interaction = useInteractionScope()
  const inheritedScope = useOverlayScope()
  const mounted = shallowRef(false)
  const open = computed(() => toValue(options.open))
  const modal = computed(() => toValue(options.modal) ?? false)
  const scope = computed(() => toValue(options.scope) ?? inheritedScope.scope)

  onMounted(() => {
    mounted.value = true
  })

  watch(
    [mounted, open, modal, scope, interaction],
    ([isMounted, isOpen, isModal, currentScope, currentInteraction], _previous, onCleanup) => {
      if (!isMounted || !isOpen || !currentInteraction.active)
        return

      const unregister = registerOverlayLayer({
        scope: currentScope,
        modal: isModal,
        onEscape: () => {
          if (currentInteraction.isCurrent())
            unref(options.onEscape)()
        },
        canClose: () => (
          currentInteraction.isCurrent()
          && toValue(options.canClose) !== false
        ),
        getElement: () => {
          const getElement = unref(options.getElement)
          return getElement?.() ?? toValue(options.element) ?? null
        },
      })
      onCleanup(unregister)
    },
    { immediate: true, flush: 'sync' },
  )
}

