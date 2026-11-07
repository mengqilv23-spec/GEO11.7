<script setup lang="ts">
import type { ModalCloseReason, ModalProps } from './types'
import { computed, nextTick, ref, shallowRef, watch } from 'vue'
import AppIcon from '../../icons/AppIcon.vue'
import Button from '../button/Button.vue'
import { containDialogTab } from '../dialog/dialog-focus'
import { consumeOverlayCancel } from '../overlay/overlay-manager'
import { useDialogOverlay } from '../overlay/useDialogOverlay'

const props = withDefaults(defineProps<ModalProps>(), {
  tone: 'default',
  width: 720,
  confirmDisabled: false,
  cancelDisabled: false,
  showCancel: true,
  showClose: true,
  loading: false,
  closeDisabled: false,
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'close': [reason: ModalCloseReason]
  'confirm': []
  'cancel': []
}>()

const dialog = shallowRef<HTMLDialogElement | null>(null)
const titleId = `ce-modal-title-${Math.random().toString(36).slice(2, 10)}`
const backdropPressed = ref(false)
const dialogOpen = computed(() => props.open)
const blocked = computed(() => props.loading || props.closeDisabled)
const { local, container, interaction } = useDialogOverlay({
  open: dialogOpen,
  dialog,
  onEscape: () => requestClose('escape'),
  canClose: () => !blocked.value,
})

function requestClose(reason: ModalCloseReason) {
  if (blocked.value || !interaction.value.isCurrent())
    return
  emit('close', reason)
  emit('update:open', false)
}

function confirm() {
  if (blocked.value || props.confirmDisabled || !interaction.value.isCurrent())
    return
  emit('confirm')
}

function cancel() {
  if (blocked.value || props.cancelDisabled || !interaction.value.isCurrent())
    return
  emit('cancel')
  requestClose('cancel')
}

function handleNativeCancel(event: Event) {
  event.preventDefault()
  event.stopPropagation()
  if (dialog.value)
    consumeOverlayCancel(dialog.value)
}

function handleBackdropPointerDown(event: PointerEvent) {
  backdropPressed.value = event.target === event.currentTarget
}

function handleBackdropClick(event: MouseEvent) {
  if (backdropPressed.value && event.target === event.currentTarget)
    requestClose('backdrop')
  backdropPressed.value = false
}

function handleDialogKeydown(event: KeyboardEvent) {
  if (!local)
    containDialogTab(event)
}

function cssWidth(value: number | string) {
  return typeof value === 'number' ? `${value}px` : value
}

const portalTarget = computed(() => (local ? container.value : undefined))

watch(() => props.open, async (open) => {
  if (open)
    await nextTick()
})
</script>

<template>
  <Teleport
    v-if="open && (!local || container)"
    :to="portalTarget"
    :disabled="!local"
  >
    <dialog
      ref="dialog"
      class="ce-modal-root"
      :class="$attrs.class"
      :data-tone="tone"
      :data-overlay-local="local ? 'true' : undefined"
      :style="{ '--ce-modal-width': cssWidth(width) }"
      :aria-labelledby="titleId"
      :aria-modal="local ? undefined : 'true'"
      :aria-busy="loading ? 'true' : 'false'"
      tabindex="-1"
      @cancel="handleNativeCancel"
      @pointerdown="handleBackdropPointerDown"
      @click="handleBackdropClick"
      @keydown="handleDialogKeydown"
    >
      <div class="ce-modal">
        <header class="ce-modal-header">
          <div :id="titleId" class="ce-modal-title">
            <slot name="title">
              {{ title }}
            </slot>
          </div>
          <button
            v-if="showClose"
            type="button"
            class="ce-modal-close"
            :aria-label="closeLabel"
            :title="closeLabel"
            :disabled="blocked"
            @click="requestClose('close-button')"
          >
            <AppIcon name="close" :size="18" class="ce-modal-close__icon" />
          </button>
        </header>

        <div class="ce-modal-body">
          <slot />
          <p v-if="loading" class="ce-modal-status" role="status">
            {{ processingText }}
          </p>
        </div>

        <footer v-if="footer !== null" class="ce-modal-footer">
          <template v-if="$slots.footer">
            <slot name="footer" />
          </template>
          <template v-else-if="footer !== undefined">
            {{ footer }}
          </template>
          <template v-else>
            <div v-if="footerStart != null || $slots.footerStart" class="ce-modal-footer-start">
              <slot name="footerStart">
                {{ footerStart }}
              </slot>
            </div>
            <Button
              v-if="showCancel"
              class="ce-modal-button ce-modal-cancel"
              :disabled="cancelDisabled || blocked"
              @click="cancel"
            >
              {{ cancelText }}
            </Button>
            <Button
              class="ce-modal-button ce-modal-confirm"
              variant="primary"
              :tone="tone === 'danger' ? 'danger' : 'default'"
              :loading="loading"
              :disabled="confirmDisabled"
              @click="confirm"
            >
              {{ confirmText }}
            </Button>
          </template>
        </footer>
      </div>
    </dialog>
  </Teleport>
</template>

