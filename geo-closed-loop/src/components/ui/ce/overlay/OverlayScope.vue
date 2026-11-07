<script setup lang="ts">
import type { OverlayDomain } from './overlay-manager'
import { provide, shallowRef, useTemplateRef } from 'vue'
import { overlayScopeKey } from './useOverlayScope'

const props = defineProps<{ scope: OverlayDomain }>()

const content = useTemplateRef<HTMLElement>('content')
const container = useTemplateRef<HTMLElement>('container')
const localModals = shallowRef(0)

function setLocalModal(delta: number) {
  localModals.value = Math.max(0, localModals.value + delta)
}

provide(overlayScopeKey, {
  scope: props.scope,
  content,
  container,
  setLocalModal,
})
</script>

<template>
  <div :data-overlay-scope="scope">
    <div
      ref="content"
      class="ce-overlay-scope-content"
      :inert="localModals > 0 || undefined"
    >
      <slot />
    </div>
    <div ref="container" class="ce-overlay-scope-host" />
  </div>
</template>

