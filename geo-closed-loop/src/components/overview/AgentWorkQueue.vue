<script setup lang="ts">
import type { OverviewQueueItem } from '../../data/overview-data'
import type { DropdownSelectOption } from '../ui/ce/dropdown-select/types'
import { computed, shallowRef } from 'vue'
import Button from '../ui/ce/button/Button.vue'
import DropdownSelect from '../ui/ce/dropdown-select/DropdownSelect.vue'
import AppIcon from '../ui/icons/AppIcon.vue'

const props = defineProps<{ items: readonly OverviewQueueItem[] }>()
const emit = defineEmits<{
  openItem: [item: OverviewQueueItem]
  openSecondaryItem: [item: OverviewQueueItem]
}>()
const priorityFilter = shallowRef('all')
const sourceFilter = shallowRef('all')
const priorityOptions: DropdownSelectOption[] = [
  { value: 'all', label: '全部优先级' },
  { value: 'P0', label: 'P0' },
  { value: 'P1', label: 'P1' },
  { value: 'P2', label: 'P2' },
]
const sources = computed(() => [...new Set(props.items.map(item => item.source))].sort((a, b) => a.localeCompare(b, 'zh-CN')))
const sourceOptions = computed<DropdownSelectOption[]>(() => [
  { value: 'all', label: '全部来源' },
  ...sources.value.map(source => ({ value: source, label: source })),
])
const visibleItems = computed(() => props.items.filter((item) => {
  return (priorityFilter.value === 'all' || item.priority === priorityFilter.value)
    && (sourceFilter.value === 'all' || item.source === sourceFilter.value)
}))
</script>

<template>
  <section class="agent-queue" aria-labelledby="agent-queue-title">
    <div class="overview-section-heading">
      <div>
        <span class="overview-section-heading__index" aria-hidden="true">③</span>
        <h2 id="agent-queue-title">
          Agent 工作队列
        </h2>
        <span class="agent-queue__count">{{ items.length }}</span>
      </div>
    </div>

    <div class="agent-queue__surface">
      <div class="agent-queue__filters agent-queue__filters--header">
        <div class="agent-queue__filter agent-queue__filter--priority">
          <DropdownSelect v-model="priorityFilter" :options="priorityOptions" v-bind="{ ariaLabel: '按优先级筛选' }" />
        </div>
        <div class="agent-queue__filter agent-queue__filter--source">
          <DropdownSelect v-model="sourceFilter" :options="sourceOptions" v-bind="{ ariaLabel: '按来源筛选' }" />
        </div>
        <span class="agent-queue__source-tag">数据源：诊断与策略 + 优化中心 + 可见性监测</span>
      </div>

      <div v-if="visibleItems.length" class="agent-queue__list">
        <article v-for="item in visibleItems" :key="`${item.kind}-${item.id}`" class="agent-queue__item">
          <div class="agent-queue__item-main">
            <div class="agent-queue__tags">
              <span class="agent-queue__priority" :class="`is-${item.priority.toLowerCase()}`">{{ item.priority }}</span>
              <span class="agent-queue__kind">{{ item.owner ?? (item.kind === 'finding' ? '诊断' : item.kind === 'strategy' ? 'Agent' : '任务') }}</span>
              <span class="agent-queue__origin">{{ item.source }}</span>
              <span class="agent-queue__status">{{ item.status }}</span>
            </div>
            <strong>{{ item.title }}</strong>
            <span class="agent-queue__summary">{{ item.summary }}</span>
          </div>
          <div class="agent-queue__next">
            <small>下一步</small>
            <strong>{{ item.nextAction }}</strong>
          </div>
          <div class="agent-queue__actions">
            <Button class="agent-queue__primary-action" :variant="item.actionLabel ? 'primary' : 'outline'" size="sm" @click="emit('openItem', item)">
              {{ item.actionLabel ?? '查看并确认' }} <AppIcon name="arrowRight" :size="14" aria-hidden="true" />
            </Button>
            <Button v-if="item.secondaryActionLabel" class="agent-queue__secondary-action" variant="outline" size="sm" @click="emit('openSecondaryItem', item)">
              {{ item.secondaryActionLabel }}
            </Button>
          </div>
        </article>
      </div>
      <div v-else class="agent-queue__empty" role="status">
        <strong>{{ items.length ? '没有符合筛选条件的事项' : '当前没有待处理事项' }}</strong>
        <span>{{ items.length ? '调整优先级或来源筛选后再试。' : '新的诊断、策略或任务会显示在这里。' }}</span>
      </div>

      <footer class="agent-queue__footer">
        当前有 {{ visibleItems.length }} 项需要确认
        <span>排序：P0 → P1 → P2 · 同优先级按来源模块顺序</span>
      </footer>
    </div>
  </section>
</template>

<style scoped>
.overview-section-heading, .overview-section-heading > div { display: flex; align-items: center; }
.overview-section-heading { justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.overview-section-heading > div { gap: 8px; }
.overview-section-heading h2 { margin: 0; color: var(--text-primary); font-size: 14px; line-height: 22px; font-weight: 600; }
.overview-section-heading__index { color: var(--action-accent); font-size: 16px; }
.agent-queue__count { display: inline-grid; min-width: 22px; height: 22px; place-items: center; padding: 0 6px; border-radius: 999px; color: var(--action-accent); background: var(--action-subtle-background); font-size: 12px; font-weight: 700; }
.agent-queue__surface { overflow: hidden; border: 1px solid var(--border-default); border-radius: 14px; background: var(--background-primary); }
.agent-queue__filters { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-bottom: 1px solid var(--border-divider); background: var(--background-primary); }
.agent-queue__source-tag { margin-left: auto; padding: 6px 10px; border: 1px solid var(--action-subtle-border, var(--border-default)); border-radius: 999px; color: var(--action-accent); background: var(--action-subtle-background); font-size: 11px; line-height: 1.4; white-space: nowrap; }
.agent-queue__filters :deep(.ce-dropdown-select__trigger) { --button-height: 36px; --button-padding-inline: 12px; --button-border-width: 1px; --button-border-color: var(--border-default); --button-background: var(--background-primary); --button-foreground: var(--text-primary); --button-hover-border: var(--action-accent); --button-hover-background: var(--background-secondary); min-width: 138px; border-radius: 8px; box-shadow: 0 1px 2px rgb(20 35 60 / 8%); }
.agent-queue__filters :deep(.ce-dropdown-select__trigger:hover) { border-color: var(--action-accent); background: var(--background-primary); }
.agent-queue__filters :deep(.ce-dropdown-select__trigger[data-open]) { border-color: var(--action-accent); background: var(--action-subtle-background); }
.agent-queue__filter--source { width: 180px; }
.agent-queue__filter--source :deep(.ce-dropdown-select__trigger) { width: 100%; }
.agent-queue__item { display: grid; grid-template-columns: minmax(0, 1fr) minmax(180px, 250px) minmax(150px, 180px); align-items: center; gap: 16px; padding: 16px 18px; border-bottom: 1px solid var(--border-divider); }
.agent-queue__item:last-child { border-bottom: 0; }
.agent-queue__filters :deep(.ce-dropdown-select__trigger:focus-visible) { outline: 2px solid var(--action-accent); outline-offset: 2px; }
.agent-queue__item-main { display: grid; gap: 6px; min-width: 0; }
.agent-queue__tags { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.agent-queue__priority, .agent-queue__kind, .agent-queue__origin, .agent-queue__status { padding: 3px 7px; border-radius: 5px; color: var(--text-secondary); background: var(--background-secondary); font-size: 10px; line-height: 1.2; }
.agent-queue__priority { color: #b45309; background: #fff7ed; font-weight: 700; }.agent-queue__priority.is-p0 { color: #dc2626; background: #fef2f2; }
.agent-queue__kind { color: var(--action-accent); background: var(--action-subtle-background); font-weight: 650; }
.agent-queue__item-main > strong { overflow: hidden; color: var(--text-primary); font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
.agent-queue__summary { overflow: hidden; color: var(--text-muted); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.agent-queue__next { display: grid; gap: 4px; min-width: 0; padding: 10px 12px; border-radius: 9px; background: var(--background-secondary); }
.agent-queue__next small { color: var(--text-muted); font-size: 10px; }
.agent-queue__next strong { overflow: hidden; color: var(--text-primary); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.agent-queue__actions { display: flex; min-width: 0; align-items: center; justify-content: flex-end; gap: 8px; }
.agent-queue__actions :deep(.ce-button) { width: auto; min-width: 0; min-height: 32px; padding-inline: 12px; border-radius: 8px; color: var(--action-accent); white-space: nowrap; }
.agent-queue__actions :deep(.ce-button:hover:not(:disabled)) { border-color: var(--action-accent); background: var(--action-subtle-background); }
.agent-queue__actions :deep(.ce-button.agent-queue__primary-action) { color: var(--text-on-accent, #fff); }
.agent-queue__actions :deep(.ce-button.agent-queue__primary-action:hover:not(:disabled)) { border-color: var(--action-accent); background: var(--action-accent); }
.agent-queue__empty { display: grid; justify-items: center; gap: 5px; padding: 38px 16px; color: var(--text-secondary); text-align: center; }
.agent-queue__empty strong { color: var(--text-primary); font-size: var(--font-size-body); line-height: var(--line-height-body); }.agent-queue__empty span { color: var(--text-muted); font-size: var(--font-size-caption); line-height: var(--line-height-caption); }
.agent-queue__footer { display: flex; justify-content: space-between; gap: 12px; padding: 11px 16px; border-top: 1px solid var(--border-divider); color: var(--text-muted); background: var(--background-secondary); font-size: 11px; }
@media (max-width: 900px) { .agent-queue__item { grid-template-columns: minmax(0, 1fr) minmax(150px, 220px); gap: 10px; padding: 14px; } .agent-queue__next { grid-column: 1; } .agent-queue__actions { grid-column: 2; grid-row: 1 / span 2; } }
@media (max-width: 760px) { .overview-section-heading { align-items: flex-start; flex-direction: column; } .agent-queue__filters { flex-wrap: wrap; } .agent-queue__source-tag { flex-basis: fit-content; max-width: 100%; margin-left: 0; white-space: normal; } .agent-queue__item { grid-template-columns: minmax(0, 1fr); } .agent-queue__actions { grid-column: 1; grid-row: auto; justify-content: stretch; } .agent-queue__actions :deep(.ce-button) { width: 100%; } .agent-queue__footer { flex-direction: column; } }
</style>

