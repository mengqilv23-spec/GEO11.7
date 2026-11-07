<script setup lang="ts">
import type { PropType, VNodeChild } from 'vue'
import type { DataListColumn, DataListProps, DataListSort } from './types'
import { computed, defineComponent, getCurrentInstance, onMounted, onUpdated, useAttrs, useTemplateRef } from 'vue'
import DirectionArrow from '../direction-arrow/DirectionArrow.vue'
import Empty from '../empty/Empty.vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<DataListProps<unknown>>(), {
  border: false,
  density: 'default',
  showFooterWhenEmpty: false,
  state: 'ready',
  disabledActions: () => [],
})

const emit = defineEmits<{
  sortChange: [sort: DataListSort]
  selectionChange: [ids: string[]]
  rowActivate: [item: unknown]
  retry: []
}>()

const attrs = useAttrs()
const instance = getCurrentInstance()
const nativeAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs
  return rest
})

const RenderValue = defineComponent({
  name: 'DataListRenderValue',
  props: {
    value: { type: null as unknown as PropType<VNodeChild>, required: true },
  },
  setup(renderProps) {
    return () => renderProps.value
  },
})

const selectAllRef = useTemplateRef<HTMLInputElement>('selectAll')
const selectionDisabled = computed(() => (
  props.state !== 'ready' || props.disabledActions.includes('selection')
))
const selectedSet = computed(() => new Set(props.selection?.selectedIds ?? []))
const selectableItems = computed(() => props.items.filter(item => (
  props.selection?.isSelectable?.(item) ?? true
)))
const selectableIds = computed(() => selectableItems.value.map(item => props.getRowId(item)))
const selectedCount = computed(() => selectableIds.value.filter(id => selectedSet.value.has(id)).length)
const allSelected = computed(() => (
  selectableIds.value.length > 0 && selectedCount.value === selectableIds.value.length
))
const tableMinWidth = computed(() => props.columns.reduce(
  (total, column) => total + (column.minWidth ?? (typeof column.width === 'number' ? column.width : 160)),
  props.selection ? 32 : 0,
))

function syncSelectAllState() {
  if (selectAllRef.value) {
    selectAllRef.value.indeterminate = selectedCount.value > 0 && !allSelected.value
  }
}

onMounted(syncSelectAllState)
onUpdated(syncSelectAllState)

function requestSort(column: DataListColumn<unknown>) {
  if (props.state !== 'ready')
    return
  emit('sortChange', {
    key: column.key,
    direction: props.sort?.key === column.key && props.sort.direction === 'asc' ? 'desc' : 'asc',
  })
}

function toggleAll() {
  if (!props.selection || selectionDisabled.value || selectableIds.value.length === 0)
    return
  const next = new Set(selectedSet.value)
  selectableIds.value.forEach((id) => {
    if (allSelected.value)
      next.delete(id)
    else next.add(id)
  })
  emit('selectionChange', [...next])
}

function toggleRow(item: unknown) {
  if (
    !props.selection
    || selectionDisabled.value
    || (props.selection.isSelectable !== undefined && !props.selection.isSelectable(item))
  ) {
    return
  }
  const id = props.getRowId(item)
  const next = new Set(selectedSet.value)
  if (next.has(id))
    next.delete(id)
  else next.add(id)
  emit('selectionChange', [...next])
}

function rowCanActivate(item: unknown) {
  return Boolean(props.isRowActivatable?.(item) ?? true)
}

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('button,a,input,select,textarea'))
}

function activateRow(item: unknown, event: MouseEvent) {
  if (isInteractiveTarget(event.target))
    return
  emit('rowActivate', item)
}

function activateRowByKey(item: unknown, event: KeyboardEvent) {
  if (event.target !== event.currentTarget)
    return
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    emit('rowActivate', item)
  }
}

function sortState(column: DataListColumn<unknown>) {
  if (!column.sortable || props.sort?.key !== column.key)
    return column.sortable ? 'none' : undefined
  return props.sort.direction === 'asc' ? 'ascending' : 'descending'
}

function renderWidth(column: DataListColumn<unknown>) {
  const width = column.width ?? 160
  return typeof width === 'number' ? `${width}px` : width
}

function columnStyle(column: DataListColumn<unknown>) {
  if (column.width == null)
    return undefined
  return {
    width: renderWidth(column),
    minWidth: column.minWidth != null ? `${column.minWidth}px` : undefined,
  }
}

function hasRetryListener() {
  return Boolean(instance?.vnode.props?.onRetry)
}
</script>

<template>
  <section
    v-bind="nativeAttrs"
    class="data-list" :class="[attrs.class]"
    :style="attrs.style"
    :data-density="density"
    :data-border="border"
    :aria-label="label"
  >
    <slot name="toolbar" />
    <div class="data-list__panel">
      <div v-if="selection && selection.selectedIds.length > 0" class="data-list__bulk" role="group" :aria-label="labels.bulkActions">
        <span>{{ labels.selectedCount(selection.selectedIds.length) }}</span>
        <button type="button" :disabled="selectionDisabled" @click="emit('selectionChange', [])">
          {{ labels.clearSelection }}
        </button>
        <fieldset :disabled="state !== 'ready'">
          <slot name="bulkActions" />
        </fieldset>
      </div>
      <div
        class="data-list__scroll"
        role="region"
        :aria-label="labels.table(label)"
        tabindex="0"
        :aria-busy="state === 'loading'"
      >
        <table :style="{ width: `max(100%, ${tableMinWidth}px)`, minWidth: `${tableMinWidth}px` }">
          <colgroup>
            <col v-if="selection" :style="{ width: 32 }">
            <col v-for="column in columns" :key="column.key" :style="{ width: renderWidth(column) }">
          </colgroup>
          <thead>
            <tr>
              <th v-if="selection" class="data-list__selection">
                <input
                  ref="selectAll"
                  type="checkbox"
                  :aria-label="labels.selectAll"
                  :checked="allSelected"
                  :disabled="selectionDisabled || selectableIds.length === 0"
                  @change="toggleAll"
                >
              </th>
              <th
                v-for="column in columns"
                :key="column.key"
                scope="col"
                :class="column.className"
                :style="columnStyle(column)"
                :aria-sort="sortState(column)"
              >
                <slot v-if="$slots[`header-${column.key}`]" :name="`header-${column.key}`" :column="column" />
                <RenderValue v-else-if="column.header != null" :value="column.header" />
                <button
                  v-else-if="column.sortable"
                  class="data-list__sort-button"
                  type="button"
                  :disabled="state !== 'ready'"
                  @click="requestSort(column)"
                >
                  {{ column.title }}
                  <span class="data-list__sort-icons" aria-hidden="true">
                    <span class="data-list__sort-asc"><DirectionArrow direction="up" /></span>
                    <span class="data-list__sort-desc"><DirectionArrow direction="down" /></span>
                  </span>
                </button>
                <template v-else>
                  {{ column.title }}
                </template>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="state !== 'ready' || items.length === 0">
              <td :colspan="columns.length + (selection ? 1 : 0)" class="data-list__state">
                <div v-if="state === 'loading'" role="status">
                  <RenderValue :value="labels.loading" />
                </div>
                <div v-else-if="state === 'error'" role="alert">
                  <RenderValue :value="errorMessage" />
                  <button v-if="hasRetryListener()" type="button" :disabled="disabledActions.includes('retry')" @click="emit('retry')">
                    {{ labels.retry }}
                  </button>
                </div>
                <div v-else role="status">
                  <slot v-if="$slots.empty" name="empty" />
                  <Empty v-else-if="typeof emptyMessage === 'string' || typeof emptyMessage === 'number'" :title="emptyMessage" />
                  <RenderValue v-else :value="emptyMessage" />
                </div>
              </td>
            </tr>
            <template v-else>
              <tr
                v-for="item in items"
                :key="getRowId(item)"
                :data-selected="selectedSet.has(getRowId(item)) || activeRowId === getRowId(item)"
                :data-interactive="rowCanActivate(item)"
                :tabindex="rowCanActivate(item) ? 0 : undefined"
                @click="rowCanActivate(item) && activateRow(item, $event)"
                @keydown="rowCanActivate(item) && activateRowByKey(item, $event)"
              >
                <td v-if="selection" class="data-list__selection">
                  <input
                    type="checkbox"
                    :aria-label="labels.selectRow(getRowLabel?.(item) ?? getRowId(item))"
                    :checked="selectedSet.has(getRowId(item))"
                    :disabled="selectionDisabled || (selection.isSelectable ? !selection.isSelectable(item) : false)"
                    @change="toggleRow(item)"
                  >
                </td>
                <td v-for="column in columns" :key="column.key" :class="column.className" :style="columnStyle(column)">
                  <slot v-if="$slots[`cell-${column.key}`]" :name="`cell-${column.key}`" :item="item" :column="column" />
                  <RenderValue v-else-if="column.render" :value="column.render(item)" />
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <slot v-if="items.length > 0 || showFooterWhenEmpty" name="footer" />
    </div>
  </section>
</template>

