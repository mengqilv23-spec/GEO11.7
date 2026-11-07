<script setup lang="ts">
import type { StyleValue } from 'vue'
import type { TagProps } from './types'
import { computed, getCurrentInstance, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })
const props = defineProps<TagProps>()
const attrs = useAttrs()
const vnodeProps = getCurrentInstance()?.vnode.props ?? {}
if (props.preset && ('tone' in vnodeProps || 'variant' in vnodeProps || 'color' in vnodeProps)) {
  throw new Error('Tag 的 preset 不能与 tone、variant 或 color 同时使用。')
}
const style = computed<StyleValue>(() => [attrs.style as StyleValue, props.color ? { '--tag-custom-color': props.color } : undefined])
</script>

<template>
  <span
    v-bind="attrs"
    class="ce-tag" :class="[attrs.class]"
    :style="style"
    :data-tone="preset ? undefined : (tone ?? 'neutral')"
    :data-variant="preset ? undefined : (variant ?? 'soft')"
    :data-preset="preset"
    :data-size="size"
    :data-custom-color="color ? 'true' : undefined"
  ><slot /></span>
</template>

