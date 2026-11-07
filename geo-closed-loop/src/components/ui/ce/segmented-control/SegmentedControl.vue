<script setup lang="ts">
import type { SegmentedControlOption, SegmentedControlProps } from './types'
import { computed, nextTick, useAttrs, useId, useTemplateRef } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<SegmentedControlProps>(), {
  variant: 'default',
  disabled: false,
})
const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
const attrs = useAttrs()
const generatedName = useId()
const root = useTemplateRef<HTMLDivElement>('root')
const nativeAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})
const validated = computed(() => {
  const groupName = props.name ?? generatedName
  const values = new Set(props.options.map(option => option.value))
  if (values.size !== props.options.length) {
    throw new Error('SegmentedControl 的 options 不能包含重复 value。')
  }
  if (!groupName.trim()) {
    throw new Error('SegmentedControl 的 name 不能为空。')
  }
  if (!String(attrs['aria-label'] ?? '').trim() && !String(attrs['aria-labelledby'] ?? '').trim()) {
    throw new Error('SegmentedControl 必须提供 aria-label 或 aria-labelledby。')
  }
  if (props.options.some(option => !option.label.trim())) {
    throw new Error('SegmentedControl 的选项 label 不能为空。')
  }
  return { groupName, options: props.options }
})

async function handleChange(option: SegmentedControlOption, event: Event) {
  const input = event.currentTarget as HTMLInputElement
  if (!input.disabled && input.checked && option.value !== props.modelValue) {
    emit('update:modelValue', option.value)
    await nextTick()
    root.value?.querySelectorAll<HTMLInputElement>('.ce-segmented__input').forEach((radio) => {
      radio.checked = radio.value === props.modelValue
    })
  }
}
</script>

<template>
  <div
    ref="root"
    v-bind="nativeAttrs"
    role="radiogroup"
    :data-variant="variant"
    :aria-disabled="disabled || undefined"
    class="ce-segmented" :class="[attrs.class]"
  >
    <label
      v-for="option in validated.options"
      :key="option.value"
      class="ce-segmented__label"
    >
      <input
        class="ce-segmented__input"
        type="radio"
        :name="validated.groupName"
        :value="option.value"
        :aria-label="option.ariaLabel"
        :checked="option.value === modelValue"
        :disabled="disabled || option.disabled"
        @change="handleChange(option, $event)"
      >
      <span class="ce-segmented__option">{{ option.label }}</span>
    </label>
  </div>
</template>

