<script setup lang="ts">
import type { PaginationAction, PaginationProps } from './types'
import { computed } from 'vue'
import ChevronIcon from '../chevron-icon/ChevronIcon.vue'

const props = withDefaults(defineProps<PaginationProps>(), {
  disabled: false,
  disabledActions: () => [],
  size: 'xs',
})
const emit = defineEmits<{
  'update:modelValue': [page: number]
}>()

const state = computed(() => {
  if (
    !Number.isSafeInteger(props.total)
    || props.total < 0
    || !Number.isSafeInteger(props.modelValue)
    || props.modelValue < 1
    || !Number.isSafeInteger(props.pageSize)
    || props.pageSize < 1
  ) {
    throw new RangeError('total 必须为非负安全整数，page 和 pageSize 必须为正安全整数')
  }

  const pages = Math.ceil(props.total / props.pageSize)
  const current = Math.min(props.modelValue, Math.max(1, pages))
  const visiblePages = Array.from(new Set([
    1,
    pages,
    current - 1,
    current,
    current + 1,
    ...(pages <= 7 ? Array.from({ length: pages }, (_, index) => index + 1) : []),
  ]))
    .filter(page => page >= 1 && page <= pages)
    .sort((left, right) => left - right)
    .map((page, index, values) => ({
      page,
      gapBefore: index > 0 && page - values[index - 1]! > 1,
    }))

  return { pages, current, visiblePages }
})

const summary = computed(() => props.summaryText({
  total: props.total,
  page: state.value.pages ? state.value.current : 0,
  pages: state.value.pages,
  pageSize: props.pageSize,
}))

function actionDisabled(action: PaginationAction) {
  return props.disabled || props.disabledActions.includes(action)
}

function requestPage(page: number, action: PaginationAction) {
  if (actionDisabled(action) || state.value.pages === 0)
    return
  if (page < 1 || page > state.value.pages || page === state.value.current)
    return
  emit('update:modelValue', page)
}
</script>

<template>
  <nav class="pagination" :aria-label="label" :data-size="size">
    <span class="pagination__summary">{{ summary }}</span>
    <div class="pagination__pages">
      <button
        class="pagination__step"
        type="button"
        :aria-label="previousLabel"
        :disabled="actionDisabled('previous') || state.current <= 1 || state.pages === 0"
        @click="requestPage(state.current - 1, 'previous')"
      >
        <ChevronIcon class="pagination__chevron" direction="left" />
      </button>

      <span v-for="item in state.visiblePages" :key="item.page" class="pagination__item">
        <span v-if="item.gapBefore" class="pagination__ellipsis">…</span>
        <button
          type="button"
          :aria-label="pageLabel(item.page)"
          :aria-current="item.page === state.current ? 'page' : undefined"
          :disabled="actionDisabled('pages')"
          @click="requestPage(item.page, 'pages')"
        >
          {{ formatValue(item.page) }}
        </button>
      </span>

      <button
        class="pagination__step"
        type="button"
        :aria-label="nextLabel"
        :disabled="actionDisabled('next') || state.current >= state.pages"
        @click="requestPage(state.current + 1, 'next')"
      >
        <ChevronIcon class="pagination__chevron" direction="right" />
      </button>
    </div>
  </nav>
</template>

