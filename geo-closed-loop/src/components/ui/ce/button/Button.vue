<script setup lang="ts">
import type { StyleValue } from 'vue'
import type { ButtonProps } from './types'
import { computed, useAttrs, useSlots } from 'vue'
import IconFont from '../icon-font/IconFont.vue'
import Spinner from '../spinner/Spinner.vue'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<ButtonProps>(), {
  tone: 'default',
  variant: 'secondary',
  shape: 'default',
  loading: false,
  disabled: false,
  iconOnly: false,
  type: 'button',
})
const emit = defineEmits<{ click: [event: MouseEvent] }>()
const attrs = useAttrs()
const slots = useSlots()
if (props.iconType !== undefined && !props.iconType.trim())
  throw new Error('Button 的 iconType 必须是真实的非空图标类型。')
if (props.iconType !== undefined && slots.icon)
  throw new Error('Button 的 icon slot 与 iconType 不能同时提供。')
if (props.iconOnly) {
  const name = String(attrs['aria-label'] ?? attrs['aria-labelledby'] ?? '').trim()
  if (!name)
    throw new Error('纯图标 Button 必须提供 aria-label 或 aria-labelledby。')
  if (!props.iconType && !slots.icon)
    throw new Error('纯图标 Button 必须提供可用的图标。')
  if (props.variant === 'text')
    throw new Error('纯图标 Button 暂不支持 text 外观。')
}

const disabledByState = computed(() => props.disabled || props.loading)
const buttonStyle = computed<StyleValue>(() => [
  attrs.style as StyleValue,
  props.color
    ? {
        '--button-custom-color': props.color,
        '--button-custom-foreground': props.colorText ?? '#fff',
      }
    : undefined,
])

function handleClick(event: MouseEvent) {
  if (disabledByState.value) {
    event.preventDefault()
    event.stopImmediatePropagation()
    return
  }
  emit('click', event)
}
</script>

<template>
  <button
    v-bind="attrs"
    :type="type"
    :disabled="disabledByState"
    :aria-busy="loading || attrs['aria-busy'] ? 'true' : undefined"
    class="ce-button" :class="[attrs.class]"
    :style="buttonStyle"
    :data-variant="variant"
    :data-tone="tone"
    :data-size="size"
    :data-shape="shape"
    :data-icon-only="iconOnly ? 'true' : undefined"
    :data-custom-color="color ? 'true' : undefined"
    @click="handleClick"
  >
    <span class="ce-button__content">
      <Spinner v-if="loading" variant="ring" class="ce-button__spinner" aria-hidden="true" />
      <span v-if="$slots.icon || iconType" class="ce-button__icon" aria-hidden="true">
        <IconFont v-if="iconType" :type="iconType" size="var(--button-icon-size)" />
        <slot v-else name="icon" />
      </span>
      <slot />
    </span>
  </button>
</template>

