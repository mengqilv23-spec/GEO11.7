<script setup lang="ts">
import type { SwitchProps } from './types'
import { computed, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<SwitchProps>(), {
  disabled: false,
})
const emit = defineEmits<{
  'click': [event: MouseEvent]
  'update:modelValue': [value: boolean]
}>()
const attrs = useAttrs()
const nativeAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})

function handleClick(event: MouseEvent) {
  emit('click', event)
  if (!event.defaultPrevented && !props.disabled) {
    emit('update:modelValue', !props.modelValue)
  }
}
</script>

<template>
  <button
    v-bind="nativeAttrs"
    type="button"
    role="switch"
    :aria-label="ariaLabel"
    :aria-checked="modelValue"
    :disabled="disabled"
    class="ce-switch" :class="[attrs.class]"
    @click="handleClick"
  >
    <span class="ce-switch__thumb" aria-hidden="true" />
  </button>
</template>

