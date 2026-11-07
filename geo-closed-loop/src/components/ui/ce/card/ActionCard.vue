<script setup lang="ts">
import type { ButtonTone } from '../button/types'
import Button from '../button/Button.vue'

defineOptions({ inheritAttrs: false })
withDefaults(defineProps<{ tone?: ButtonTone, disabled?: boolean }>(), { tone: 'default', disabled: false })
const emit = defineEmits<{ click: [event: MouseEvent] }>()
</script>

<template>
  <Button v-bind="$attrs" class="ce-action-card" variant="outline" :tone="tone" :disabled="disabled" @click="emit('click', $event)">
    <slot />
  </Button>
</template>

