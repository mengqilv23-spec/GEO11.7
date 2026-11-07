<script setup lang="ts">
import type { CountryFlagProps } from './types'
import * as Flags from 'country-flag-icons/string/3x2'
import { computed } from 'vue'

const props = withDefaults(defineProps<CountryFlagProps>(), { width: 18 })

const code = computed(() => props.countryCode?.trim().toUpperCase() ?? '')
const supported = computed(() => /^[A-Z]{2}$/.test(code.value) && Object.hasOwn(Flags, code.value))
const height = computed(() => (props.width * 2) / 3)

const flagMarkup = computed(() => {
  if (!supported.value)
    return ''
  const raw = Flags[code.value as keyof typeof Flags]
  // 资源来自本地 country-flag-icons 包，不接受网络或用户提供的 SVG 内容。
  return raw.replace(
    '<svg ',
    `<svg width="${props.width}" height="${height.value}" aria-hidden="true" focusable="false" `,
  )
})
</script>

<template>
  <span
    v-if="supported"
    data-country-flag
    class="ce-country-flag" :class="[className]"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : 'true'"
    :width="width"
    :height="height"
    :style="{ display: 'inline-block', flexShrink: 0, verticalAlign: 'middle', width: `${width}px`, height: `${height}px` }"
    v-html="flagMarkup"
  />
</template>

