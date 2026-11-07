<script setup lang="ts">
import type { InputProps } from './types'
import { computed, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })

withDefaults(defineProps<InputProps>(), {
  modelValue: '',
  type: 'text',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
const attrs = useAttrs()
const nativeAttrs = computed(() => {
  const { class: _class, onInput: _onInput, ...rest } = attrs
  return rest
})

function handleInput(event: Event) {
  emit('update:modelValue', (event.currentTarget as HTMLInputElement).value)
  const listener = attrs.onInput
  if (typeof listener === 'function')
    listener(event)
  else if (Array.isArray(listener))
    listener.forEach(handler => handler(event))
}
</script>

<template>
  <input
    v-bind="nativeAttrs"
    :value="modelValue"
    :type="type"
    class="ce-input" :class="[attrs.class]"
    @input="handleInput"
  >
</template>

