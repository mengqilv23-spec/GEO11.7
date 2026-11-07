<script setup lang="ts">
import type { VNode } from 'vue'
import type { ToastProps, ToastVariant } from './types'
import {
  cloneVNode,
  computed,
  defineComponent,
  onScopeDispose,
  reactive,
  watch,
  watchEffect,

} from 'vue'
import Alert from '../alert/Alert.vue'

const props = withDefaults(defineProps<ToastProps>(), {
  variant: 'info',
  closable: false,
  closeDisabled: false,
  showIcon: true,
})
const emit = defineEmits<{ close: [] }>()
defineSlots<{
  default: () => unknown
  title?: () => unknown
  icon?: () => unknown
  action?: () => unknown
}>()

const toastDurations: Record<ToastVariant, number> = {
  neutral: 4_000,
  info: 4_000,
  success: 3_000,
  warning: 4_000,
  error: 3_500,
}

const SlotSnapshot = defineComponent({
  name: 'ToastSlotSnapshot',
  props: { capture: { type: Boolean, required: true } },
  setup(snapshotProps, { slots }) {
    let snapshot: VNode[] = []
    return () => {
      if (snapshotProps.capture)
        snapshot = (slots.default?.() ?? []).map(node => cloneVNode(node))
      return snapshot.map(node => cloneVNode(node))
    }
  },
})

const canRender = typeof document !== 'undefined'
const effectiveDuration = computed(() => props.duration ?? toastDurations[props.variant])
const alertListeners = computed(() => props.closable ? { close: requestClose } : {})
const visibleContent = reactive({
  title: props.title,
  closeLabel: props.closeLabel,
  closeDisabled: props.closeDisabled,
  showIcon: props.showIcon,
  iconType: props.iconType,
})
let timer: number | undefined
let remaining = effectiveDuration.value
let started = 0
let hovered = false
let focused = false
let closed = false

function clearTimer() {
  if (timer !== undefined)
    window.clearTimeout(timer)
  timer = undefined
}

function requestClose() {
  if (closed)
    return
  closed = true
  clearTimer()
  emit('close')
}

function resume() {
  if (hovered || focused || closed)
    return
  if (!Number.isFinite(remaining) || remaining <= 0)
    return
  clearTimer()
  started = Date.now()
  timer = window.setTimeout(requestClose, remaining)
}

function pause() {
  if (timer === undefined)
    return
  remaining = Math.max(1, remaining - (Date.now() - started))
  clearTimer()
}

function handleMouseEnter() {
  hovered = true
  pause()
}

function handleMouseLeave() {
  hovered = false
  resume()
}

function handleFocusIn() {
  focused = true
  pause()
}

function handleFocusOut(event: FocusEvent) {
  const next = event.relatedTarget
  if (next instanceof Node && (event.currentTarget as HTMLElement).contains(next))
    return
  focused = false
  resume()
}

watchEffect(() => {
  if (Number.isNaN(effectiveDuration.value) || effectiveDuration.value < 0) {
    throw new RangeError('Toast duration 必须为非负毫秒数或 Infinity')
  }
  if (props.open) {
    visibleContent.title = props.title
    visibleContent.closeLabel = props.closeLabel
    visibleContent.closeDisabled = props.closeDisabled
    visibleContent.showIcon = props.showIcon
    visibleContent.iconType = props.iconType
  }
})

watch(
  [() => props.open, effectiveDuration, () => props.variant, () => props.messageId],
  ([open, duration], _previous, onCleanup) => {
    closed = false
    remaining = duration
    if (open) {
      resume()
    }
    else {
      hovered = false
      focused = false
      clearTimer()
    }
    onCleanup(clearTimer)
  },
  { immediate: true, flush: 'sync' },
)

onScopeDispose(clearTimer)
</script>

<template>
  <Teleport v-if="canRender" :to="container ?? 'body'">
    <div
      class="ce-toast" :class="[props.class]"
      :role="variant === 'error' ? 'alert' : 'status'"
      aria-atomic="true"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
      @focusin="handleFocusIn"
      @focusout="handleFocusOut"
    >
      <Alert
        :open="open"
        :variant="variant"
        :title="visibleContent.title"
        :close-label="visibleContent.closeLabel"
        :close-disabled="visibleContent.closeDisabled"
        :show-icon="visibleContent.showIcon"
        :icon-type="visibleContent.iconType"
        v-on="alertListeners"
      >
        <SlotSnapshot :capture="open">
          <slot />
        </SlotSnapshot>
        <template v-if="$slots.title" #title>
          <SlotSnapshot :capture="open">
            <slot name="title" />
          </SlotSnapshot>
        </template>
        <template v-if="$slots.icon" #icon>
          <SlotSnapshot :capture="open">
            <slot name="icon" />
          </SlotSnapshot>
        </template>
        <template v-if="$slots.action" #action>
          <SlotSnapshot :capture="open">
            <slot name="action" />
          </SlotSnapshot>
        </template>
      </Alert>
    </div>
  </Teleport>
</template>

