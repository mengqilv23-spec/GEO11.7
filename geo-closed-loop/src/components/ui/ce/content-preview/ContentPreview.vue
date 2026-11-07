<script setup lang="ts">
import type { PropType, VNodeChild } from 'vue'
import type { ContentPreviewProps } from './types'
import { computed, defineComponent, shallowRef, useId, useSlots, watch } from 'vue'
import Button from '../button/Button.vue'
import { useInteractionScope } from '../interaction/useInteractionScope'
import Modal from '../modal/Modal.vue'
import { useModalBlocked } from '../overlay/useModalBlocked'
import { useOverlayScope } from '../overlay/useOverlayScope'
import { isPreviewMimeAllowed, resolvePreviewUrl } from './preview-url'
import PreviewDownload from './PreviewDownload.vue'
import PreviewResource from './PreviewResource.vue'

type ComponentProps = Omit<ContentPreviewProps, 'onActiveIdChange' | 'onClose'>
const props = defineProps<ComponentProps>()
const emit = defineEmits<{
  activeIdChange: [id: string]
  close: []
}>()
const slots = useSlots()
const interaction = useInteractionScope()
const overlay = useOverlayScope()
const blocked = useModalBlocked()
const resourceId = useId()
const resourceAttempt = shallowRef(0)

const RenderValue = defineComponent({
  name: 'ContentPreviewRenderValue',
  props: { value: { type: null as unknown as PropType<VNodeChild>, required: true } },
  setup(renderProps) {
    return () => renderProps.value
  },
})

const active = computed(() => interaction.value.active && (overlay.scope !== 'assistant' || !blocked.value))
const index = computed(() => {
  const found = props.items.findIndex(item => item.id === props.activeId)
  return Math.max(0, found)
})
const item = computed(() => props.items[index.value] ?? null)
const source = computed(() => {
  if (!item.value || !('src' in item.value) || !isPreviewMimeAllowed(item.value.kind, item.value.mimeType))
    return null
  return resolvePreviewUrl(item.value.src, props.trustedBlobUrls ?? [])
})
const poster = computed(() => {
  if (!item.value || item.value.kind !== 'video' || !item.value.poster)
    return undefined
  return resolvePreviewUrl(item.value.poster, props.trustedBlobUrls ?? []) ?? undefined
})
const sessionKey = computed(() => `${item.value?.id ?? 'empty'}:${item.value?.kind ?? 'empty'}:${source.value ?? ''}:${resourceAttempt.value}`)
const actionContent = computed<VNodeChild>(() => {
  if (!props.open || !active.value || !item.value)
    return null
  if (slots.actions)
    return slots.actions({ item: item.value })
  return props.renderActions?.(item.value) ?? null
})

function hasMeaningfulContent(value: VNodeChild): boolean {
  if (value === null || value === undefined || value === false)
    return false
  if (typeof value === 'string')
    return value.trim().length > 0
  if (Array.isArray(value))
    return value.some(child => hasMeaningfulContent(child))
  return true
}

const hasActions = computed(() => hasMeaningfulContent(actionContent.value))

watch(() => `${item.value?.id ?? ''}:${item.value?.kind ?? ''}:${source.value ?? ''}`, () => {
  resourceAttempt.value = 0
})

function changeActive(id: string) {
  if (!active.value || !interaction.value.isCurrent())
    return
  emit('activeIdChange', id)
}

function move(offset: number) {
  const next = props.items[index.value + offset]
  if (next)
    changeActive(next.id)
}

function handleClose() {
  emit('close')
}

function handleKeydown(event: KeyboardEvent) {
  if (
    event.defaultPrevented
    || event.altKey
    || event.ctrlKey
    || event.metaKey
    || event.shiftKey
    || !(event.target instanceof Element)
    || event.target.closest('video,audio,iframe,input,textarea,select,[contenteditable="true"]')
  ) {
    return
  }
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')
    return
  event.preventDefault()
  move(event.key === 'ArrowLeft' ? -1 : 1)
}
</script>

<template>
  <Modal
    v-if="open"
    class="ce-content-preview"
    :open="open"
    :title="item?.name ?? labels.title"
    :width="960"
    :footer="hasActions ? undefined : null"
    :confirm-text="labels.close"
    :cancel-text="labels.close"
    :close-label="labels.close"
    :processing-text="labels.loading"
    @close="handleClose"
  >
    <template v-if="hasActions" #footer>
      <div class="ce-content-preview-actions">
        <RenderValue :value="actionContent" />
      </div>
    </template>

    <div
      class="ce-content-preview-content"
      role="region"
      :aria-label="item?.name ?? labels.title"
      tabindex="0"
      @keydown="handleKeydown"
    >
      <template v-if="active && item">
        <div class="ce-content-preview-carousel" :data-multiple="items.length > 1 ? 'true' : undefined">
          <Button
            v-if="items.length > 1"
            class="ce-content-preview-previous"
            icon-only
            icon-type="icon-a-arrowleft"
            shape="round"
            size="lg"
            :aria-label="labels.previous"
            :aria-controls="resourceId"
            :title="labels.previous"
            :disabled="index === 0"
            @click="move(-1)"
          />
          <div :id="resourceId" class="ce-content-preview-resource">
            <PreviewResource
              :key="sessionKey"
              :item="item"
              :source="source"
              :poster="poster"
              :labels="labels"
              @retry="resourceAttempt++"
            />
          </div>
          <Button
            v-if="items.length > 1"
            class="ce-content-preview-next"
            icon-only
            icon-type="icon-a-arrowright"
            shape="round"
            size="lg"
            :aria-label="labels.next"
            :aria-controls="resourceId"
            :title="labels.next"
            :disabled="index === items.length - 1"
            @click="move(1)"
          />
        </div>
        <div v-if="items.length > 1" class="ce-content-preview-count" aria-live="polite">
          {{ index + 1 }} / {{ items.length }}
        </div>
        <p v-if="item.kind === 'pdf'" class="ce-content-preview-message">
          {{ labels.pdfNotice }}
        </p>
        <PreviewDownload
          v-if="onDownload"
          :key="sessionKey"
          :item="item"
          :labels="labels"
          :on-download="onDownload"
        />
      </template>
      <p v-else-if="!item" class="ce-content-preview-message" role="status">
        {{ labels.empty }}
      </p>
    </div>
  </Modal>
</template>

