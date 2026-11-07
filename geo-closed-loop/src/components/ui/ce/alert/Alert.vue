<script setup lang="ts">
import type { AlertProps, AlertVariant } from './types'
import {
  computed,
  getCurrentInstance,
  shallowRef,
  useAttrs,
  useSlots,
  watch,
  watchEffect,
} from 'vue'
import IconFont from '../icon-font/IconFont.vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<AlertProps>(), {
  variant: 'info',
  showIcon: true,
  appearance: 'default',
  open: true,
  closeDisabled: false,
})
const emit = defineEmits<{
  close: []
  afterClose: []
}>()
defineSlots<{
  default: () => unknown
  title?: () => unknown
  icon?: () => unknown
  action?: () => unknown
}>()

const ALERT_CLOSE_FALLBACK_MS = 250
const alertIcons: Record<AlertVariant, string> = {
  neutral: 'icon-xinxi',
  info: 'icon-xinxi',
  success: 'icon-wancheng-1',
  warning: 'icon-tishi',
  error: 'icon-icon-center-16px',
}

const attrs = useAttrs()
const slots = useSlots()
const instance = getCurrentInstance()
const present = shallowRef(props.open)
let closeCompleted = !props.open
let closeRequested = false

const nativeAttrs = computed(() => {
  const {
    class: _class,
    onTransitionend: _onTransitionend,
    onTransitionEnd: _onTransitionEnd,
    ...rest
  } = attrs
  return rest
})
const hasTitle = computed(() => (
  Boolean(slots.title)
  || (props.title !== undefined && props.title !== null && props.title !== '')
))
const hasIcon = computed(() => props.showIcon)
const iconType = computed(() => props.iconType ?? alertIcons[props.variant])

function hasCloseListener() {
  return Boolean(instance?.vnode.props?.onClose)
}

function hasActions() {
  return Boolean(slots.action || hasCloseListener())
}

function finishClose() {
  if (closeCompleted)
    return
  closeCompleted = true
  present.value = false
  emit('afterClose')
}

function callNativeTransitionListener(event: TransitionEvent) {
  const listener = attrs.onTransitionend ?? attrs.onTransitionEnd
  if (typeof listener === 'function')
    listener(event)
  else if (Array.isArray(listener))
    listener.forEach(handler => handler(event))
}

function handleTransitionEnd(event: TransitionEvent) {
  callNativeTransitionListener(event)
  if (
    !props.open
    && event.target === event.currentTarget
    && event.propertyName === 'grid-template-rows'
  ) {
    finishClose()
  }
}

function requestClose(event: MouseEvent | KeyboardEvent) {
  if (!hasCloseListener() || props.closeDisabled || closeRequested)
    return
  if (event instanceof KeyboardEvent) {
    if (event.key !== 'Enter' && event.key !== ' ')
      return
    event.preventDefault()
  }
  closeRequested = true
  emit('close')
}

watchEffect(() => {
  if (props.iconType !== undefined && slots.icon) {
    throw new Error('Alert 的 icon slot 与 iconType 不能同时提供。')
  }
  if (props.iconType !== undefined && !props.iconType.trim()) {
    throw new Error('Alert 的 iconType 必须是真实的非空图标类型。')
  }
})

watch(
  () => props.open,
  (open, _previous, onCleanup) => {
    if (open) {
      closeCompleted = false
      closeRequested = false
      present.value = true
      return
    }
    if (!present.value)
      return

    const reduceMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      finishClose()
      return
    }
    const timer = window.setTimeout(finishClose, ALERT_CLOSE_FALLBACK_MS)
    onCleanup(() => window.clearTimeout(timer))
  },
  { flush: 'sync' },
)
</script>

<template>
  <div
    v-if="present"
    v-bind="nativeAttrs"
    class="ce-alert" :class="[attrs.class]"
    :data-variant="variant"
    :data-appearance="appearance"
    :data-state="open ? 'open' : 'closing'"
    :data-has-icon="hasIcon ? 'true' : undefined"
    :data-has-title="hasTitle ? 'true' : undefined"
    :data-has-actions="hasActions() ? 'true' : undefined"
    :inert="!open || undefined"
    @transitionend="handleTransitionEnd"
  >
    <div class="ce-alert__motion-content">
      <div class="ce-alert__layout">
        <span v-if="hasIcon" class="ce-alert__icon-slot" aria-hidden="true">
          <slot name="icon">
            <IconFont :type="iconType" :size="16" />
          </slot>
        </span>
        <div class="ce-alert__content">
          <div v-if="hasTitle" class="ce-alert__title">
            <slot name="title">
              {{ title }}
            </slot>
          </div>
          <div class="ce-alert__body">
            <slot />
          </div>
        </div>
        <div v-if="hasActions()" class="ce-alert__actions">
          <slot name="action" />
          <IconFont
            v-if="hasCloseListener()"
            type="icon-guanbi"
            :size="16"
            class="ce-alert__close"
            role="button"
            :tabindex="closeDisabled ? -1 : 0"
            :aria-disabled="String(closeDisabled)"
            :aria-label="closeLabel"
            @click="requestClose"
            @keydown="requestClose"
          />
        </div>
      </div>
    </div>
  </div>
</template>

