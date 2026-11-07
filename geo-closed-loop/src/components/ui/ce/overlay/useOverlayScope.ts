import type { InjectionKey, ShallowRef } from 'vue'
import type { OverlayDomain } from './overlay-manager'
import { inject, shallowRef } from 'vue'

export interface OverlayScopeState {
  scope: OverlayDomain
  container: Readonly<ShallowRef<HTMLElement | null>>
  content: Readonly<ShallowRef<HTMLElement | null>>
  setLocalModal: (delta: number) => void
}

const defaultScope: OverlayScopeState = {
  scope: 'page',
  container: shallowRef(null),
  content: shallowRef(null),
  setLocalModal: () => undefined,
}

export const overlayScopeKey: InjectionKey<OverlayScopeState> = Symbol('ce-overlay-scope')

export function useOverlayScope(): OverlayScopeState {
  return inject(overlayScopeKey, defaultScope)
}

