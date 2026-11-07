import type { InjectionKey, ShallowRef } from 'vue'
import { inject, shallowRef } from 'vue'

export interface InteractionScopeState {
  readonly active: boolean
  isCurrent: () => boolean
}

export type InteractionScopeRef = Readonly<ShallowRef<InteractionScopeState>>

const defaultState: InteractionScopeState = {
  active: true,
  isCurrent: () => true,
}
const defaultScope = shallowRef(defaultState)

export const interactionScopeKey: InjectionKey<InteractionScopeRef> = Symbol('ce-interaction-scope')

export function useInteractionScope(): InteractionScopeRef {
  return inject(interactionScopeKey, defaultScope)
}

