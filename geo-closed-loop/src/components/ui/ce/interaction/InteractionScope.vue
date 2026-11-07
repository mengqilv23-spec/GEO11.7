<script setup lang="ts">
import type { InteractionScopeState } from './useInteractionScope'
import { onScopeDispose, provide, readonly, shallowRef, watch } from 'vue'
import {
  interactionScopeKey,

  useInteractionScope,
} from './useInteractionScope'

const props = withDefaults(defineProps<{ active?: boolean }>(), { active: true })
const parent = useInteractionScope()
const current = shallowRef<InteractionScopeState>({ active: false, isCurrent: () => false })
let alive = true

function replaceState() {
  const state: InteractionScopeState = {
    active: props.active && parent.value.active,
    isCurrent: () => alive && state.active && current.value === state && parent.value.isCurrent(),
  }
  current.value = state
}

watch([() => props.active, parent], replaceState, { immediate: true, flush: 'sync' })
provide(interactionScopeKey, readonly(current))
onScopeDispose(() => {
  alive = false
})
</script>

<template>
  <slot />
</template>

