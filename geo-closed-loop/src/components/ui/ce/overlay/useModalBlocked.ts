import { onScopeDispose, readonly, shallowRef } from 'vue'
import { getModalBlocked, subscribeModalBlocked } from './overlay-manager'

/** 复用 overlay manager 的单一模态快照，不维护平行计数。 */
export function useModalBlocked() {
  const blocked = shallowRef(getModalBlocked())
  const unsubscribe = subscribeModalBlocked(() => {
    blocked.value = getModalBlocked()
  })
  onScopeDispose(unsubscribe)
  return readonly(blocked)
}

