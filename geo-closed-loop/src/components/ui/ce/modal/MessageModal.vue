<script setup lang="ts">
import type { ModalCloseReason, ModalProps } from './types'
import { computed } from 'vue'
import IconFont from '../icon-font/IconFont.vue'
import Modal from './Modal.vue'

interface MessageModalProps extends Omit<ModalProps, 'title' | 'tone'> {
  title: unknown
  message: unknown
  tone?: 'info' | 'danger'
}

const props = withDefaults(defineProps<MessageModalProps>(), {
  tone: 'info',
  width: 440,
  showClose: false,
  showCancel: null,
})
const emit = defineEmits<{
  'update:open': [value: boolean]
  'close': [reason: ModalCloseReason]
  'confirm': []
  'cancel': []
}>()
const tone = computed(() => props.tone ?? 'info')
const width = computed(() => props.width ?? 440)
const showClose = computed(() => props.showClose ?? false)
const effectiveShowCancel = computed(() => props.showCancel ?? tone.value === 'danger')
</script>

<template>
  <Modal
    :open="open"
    :title="title"
    :footer="footer"
    :footer-start="footerStart"
    :tone="tone"
    :width="width"
    :confirm-text="confirmText"
    :cancel-text="cancelText"
    :close-label="closeLabel"
    :processing-text="processingText"
    :confirm-disabled="confirmDisabled"
    :cancel-disabled="cancelDisabled"
    :show-cancel="effectiveShowCancel"
    :show-close="showClose"
    :loading="loading"
    :close-disabled="closeDisabled"
    class="ce-message-modal" :class="[$attrs.class]"
    @update:open="emit('update:open', $event)"
    @close="emit('close', $event)"
    @confirm="emit('confirm')"
    @cancel="emit('cancel')"
  >
    <template #title>
      <span class="ce-message-title">
        <IconFont
          class="ce-message-icon"
          :type="tone === 'danger' ? 'icon-tishi' : 'icon-xinxi'"
          :size="16"
          :color="tone === 'danger' ? 'var(--message-danger-icon)' : 'var(--message-info-icon)'"
        />
        <span>{{ title }}</span>
      </span>
    </template>
    <div class="ce-message">
      <div class="ce-message-content">
        {{ message }}
      </div>
    </div>
  </Modal>
</template>

