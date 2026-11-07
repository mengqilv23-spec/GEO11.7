<script setup lang="ts">
import type { DrawerCloseReason, DrawerProps } from './types'
import { computed, ref, shallowRef } from 'vue'
import { containDialogTab } from '../dialog/dialog-focus'
import { consumeOverlayCancel } from '../overlay/overlay-manager'
import { useDialogOverlay } from '../overlay/useDialogOverlay'

const props = withDefaults(defineProps<DrawerProps>(), {
  placement: 'right',
  size: 400,
  closeOnEscape: true,
  closeOnBackdrop: true,
  closeDisabled: false,
  role: 'dialog',
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'close': [reason: DrawerCloseReason]
}>()

const dialog = shallowRef<HTMLDialogElement | null>(null)
const heading = shallowRef<HTMLHeadingElement | null>(null)
const titleId = `ce-drawer-title-${Math.random().toString(36).slice(2, 10)}`
const descriptionId = `ce-drawer-description-${Math.random().toString(36).slice(2, 10)}`
const backdropPressed = ref(false)
const { local, container, interaction } = useDialogOverlay({
  open: () => props.open,
  dialog,
  onEscape: () => requestClose('escape'),
  canClose: () => props.closeOnEscape && !props.closeDisabled,
  initialFocus: () => {
    const target = props.initialFocus
    return target && dialog.value?.contains(target) ? target : heading.value
  },
})

function requestClose(reason: DrawerCloseReason) {
  if (props.closeDisabled || !interaction.value.isCurrent())
    return
  emit('close', reason)
  emit('update:open', false)
}

function outside(event: MouseEvent | PointerEvent) {
  const box = dialog.value?.getBoundingClientRect()
  if (!box)
    return event.target === event.currentTarget
  return event.target === event.currentTarget && (
    event.clientX < box.left
    || event.clientX > box.right
    || event.clientY < box.top
    || event.clientY > box.bottom
  )
}

function handleCancel(event: Event) {
  event.preventDefault()
  event.stopPropagation()
  if (dialog.value)
    consumeOverlayCancel(dialog.value)
}

function handleSubmit(event: SubmitEvent) {
  if (event.defaultPrevented || !(event.target instanceof HTMLFormElement) || !dialog.value)
    return
  if (event.target.closest('dialog') !== dialog.value)
    return
  const method = event.submitter?.getAttribute('formmethod') ?? event.target.method
  if (method.toLowerCase() !== 'dialog')
    return
  event.preventDefault()
  requestClose('form')
}

function handleKeydown(event: KeyboardEvent) {
  if (!local)
    containDialogTab(event, heading.value)
}

const dimension = computed(() => {
  const presets = { sm: 400, md: 600, lg: 800 } as const
  return typeof props.size === 'string' && props.size in presets
    ? `${presets[props.size as keyof typeof presets]}px`
    : typeof props.size === 'number' ? `${props.size}px` : props.size
})
const portalTarget = computed(() => (local ? container.value : undefined))
</script>

<template>
  <Teleport
    v-if="open && (!local || container)"
    :to="portalTarget"
    :disabled="!local"
  >
    <dialog
      ref="dialog"
      :role="role"
      class="ce-drawer"
      :class="props.class"
      :data-placement="placement"
      :data-overlay-local="local ? 'true' : undefined"
      :aria-modal="local ? undefined : 'true'"
      :aria-labelledby="titleId"
      :aria-describedby="description != null ? descriptionId : undefined"
      :style="{ '--ce-drawer-size': dimension }"
      tabindex="-1"
      @keydown="handleKeydown"
      @cancel="handleCancel"
      @submit="handleSubmit"
      @pointerdown="backdropPressed = outside($event)"
      @click="backdropPressed && outside($event) && closeOnBackdrop ? requestClose('backdrop') : undefined; backdropPressed = false"
    >
      <header class="ce-drawer-header">
        <div class="ce-drawer-heading">
          <div v-if="eyebrow != null && !titleFirst" class="ce-drawer-eyebrow">
            {{ eyebrow }}
          </div>
          <h2 :id="titleId" ref="heading" tabindex="-1">
            {{ title }}
          </h2>
          <div v-if="eyebrow != null && titleFirst" class="ce-drawer-eyebrow">
            {{ eyebrow }}
          </div>
          <div v-if="description != null" :id="descriptionId" class="ce-drawer-description">
            {{ description }}
          </div>
        </div>
        <button
          type="button"
          class="ce-drawer-close"
          :class="{ 'ce-drawer-close--text': closeText }"
          :aria-label="closeLabel"
          :disabled="closeDisabled"
          @click="requestClose('close-button')"
        >
          <span v-if="closeText" class="ce-drawer-close-text">{{ closeText }}</span>
          <span v-else aria-hidden="true" />
        </button>
      </header>
      <div class="ce-drawer-body">
        <slot />
      </div>
      <footer v-if="footer != null || $slots.footer" class="ce-drawer-footer">
        <slot name="footer">
          {{ footer }}
        </slot>
      </footer>
    </dialog>
  </Teleport>
</template>

