<script setup lang="ts">
import type { Priority } from '../../../data/geo-data'
import { priorityOptions } from '../../../data/priorities'
import DropdownSelect from '../../ui/ce/dropdown-select/DropdownSelect.vue'

defineProps<{ modelValue: Priority }>()
const emit = defineEmits<{ 'update:modelValue': [value: Priority] }>()
function update(value: string) {
  const priority = priorityOptions.find(option => option.value === value)?.value
  if (priority) emit('update:modelValue', priority)
}
</script>

<template>
  <DropdownSelect :model-value="modelValue" :options="priorityOptions" v-bind="{ ariaLabel: '优先级' }" panel-width="360px" @update:model-value="update">
    <template #option="{ option }">
      <span class="geo-priority-option">
        <strong>{{ option.label }}</strong>
        <span>{{ priorityOptions.find(item => item.value === option.value)?.description }}</span>
      </span>
    </template>
  </DropdownSelect>
</template>

<style>
.geo-priority-option { display: grid; gap: 4px; padding-block: 4px; white-space: normal; }
.geo-priority-option strong { font-size: 13px; line-height: 20px; }
.geo-priority-option > span { color: var(--text-secondary); font-size: 12px; line-height: 20px; }
</style>

