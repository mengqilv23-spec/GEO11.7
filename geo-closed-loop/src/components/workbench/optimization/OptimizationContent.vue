<script setup lang="ts">
import type { GeoTask, Strategy, TaskFilter, UserRole, ServiceMode } from '../../../data/geo-data'
import type { DataListColumn } from '../../ui/ce/data-list/types'
import { computed, shallowRef, watch } from 'vue'
import { displayObjectCodes } from '../../../data/geo-data'
import { isTaskDeferred, isTaskIgnored, reviewOwner } from '../../../workflows/task-workflow'
import { isDirectRepairTask } from '../../../workflows/direct-repair'
import Button from '../../ui/ce/button/Button.vue'
import DataList from '../../ui/ce/data-list/DataList.vue'
import Pagination from '../../ui/ce/pagination/Pagination.vue'
import SegmentedControl from '../../ui/ce/segmented-control/SegmentedControl.vue'
import Tag from '../../ui/ce/tag/Tag.vue'
import GeoPageIntro from '../shared/GeoPageIntro.vue'
import '../../../styles/optimization-page.css'

const props = defineProps<{ tasks: GeoTask[], allTasks: GeoTask[], strategies?: Strategy[], filter: TaskFilter, role: UserRole, serviceMode?: ServiceMode }>()
const emit = defineEmits<{ setFilter: [filter: TaskFilter], openTask: [task: GeoTask], openFlow: [] }>()

type BucketFilter = 'all' | 'brief' | 'processing' | 'done'
const taskTypes: Array<{ id: TaskFilter, label: string }> = [
  { id: 'all', label: '全部任务' },
  { id: 'web', label: '官网内容' },
  { id: 'external', label: '外部内容' },
  { id: 'repair', label: '官网结构与技术' },
]
const bucket = shallowRef<BucketFilter>('all')
const page = shallowRef(1)
const perPage = 5
const taskTypeOptions = taskTypes.map(item => ({ value: item.id, label: item.label }))
const taskStatusOptions: Array<{ value: BucketFilter, label: string }> = [
  { value: 'all', label: '全部状态' },
  { value: 'brief', label: '待确认 Brief' },
  { value: 'processing', label: '处理中' },
  { value: 'done', label: '已完成' },
]
const taskColumns: DataListColumn<unknown>[] = [
  { key: 'serial', title: '序号', width: '4%', minWidth: 44 },
  { key: 'task', title: '任务', width: '35%', minWidth: 300 },
  { key: 'type', title: '任务类型', width: '17%', minWidth: 140 },
  { key: 'source', title: '来源', width: '13%', minWidth: 100 },
  { key: 'status', title: '任务状态', width: '22%', minWidth: 190 },
  { key: 'actions', title: '操作', width: '9%', minWidth: 112 },
]
const taskTableLabels = {
  bulkActions: '任务批量操作',
  selectedCount: (count: number) => `已选择 ${count} 项`,
  clearSelection: '取消选择',
  table: (label: string) => `${label}表格`,
  selectAll: '选择全部任务',
  loading: '任务加载中',
  retry: '重试',
  selectRow: (label: string) => `选择任务 ${label}`,
}
function keyStatus(task: GeoTask): Exclude<BucketFilter, 'all'> {
  if (task.progress === 'done' || task.completionOutcome === 'expired-unexecuted' || isTaskIgnored(task) || isTaskDeferred(task))
    return 'done'
  if (task.progress === 'brief')
    return 'brief'
  return 'processing'
}
function keyStatusLabel(task: GeoTask) {
  return taskStatusOptions.find(item => item.value === keyStatus(task))?.label ?? '处理中'
}
const filteredTasks = computed(() => props.allTasks.filter(task => (props.filter === 'all' || task.type === props.filter) && (bucket.value === 'all' || keyStatus(task) === bucket.value)))
const pages = computed(() => Math.max(1, Math.ceil(filteredTasks.value.length / perPage)))
const visibleTasks = computed(() => filteredTasks.value.slice((page.value - 1) * perPage, page.value * perPage))
function taskFromRow(item: unknown) {
  return item as GeoTask
}
function taskPageSummary({ total, page, pages }: { total: number, page: number, pages: number }) {
  return `共 ${total} 条 · 第 ${page} / ${pages} 页`
}
function needsMyAction(task: GeoTask) {
  if (isTaskIgnored(task) || isTaskDeferred(task) || isDirectRepairTask(task) || task.progress === 'done') return false
  const mode = props.serviceMode ?? 'managed'
  const owner = mode === 'agent' ? 'client' : 'ops'
  if (task.progress === 'brief') {
    const status = task.workflow?.briefStatus ?? 'ready'
    return props.role === owner && (status === 'ready' || (mode === 'managed' && status === 'changes_requested'))
  }
  if (['human', 'client_review', 'client_content_review'].includes(task.progress))
    return props.role === reviewOwner(task, mode)
  if (task.progress === 'site_failed') return props.role === owner
  return ['site_publish', 'publish'].includes(task.progress) && props.role === 'client'
}
const overviewStats = computed(() => taskTypes.map(type => ({
  name: type.label,
  count: props.allTasks.filter(task => type.id === 'all' || task.type === type.id).length,
})))
const taskStatusStats = computed(() => {
  let pending = 0
  let processing = 0
  let done = 0
  for (const task of props.allTasks) {
    if (task.progress === 'done' || task.completionOutcome === 'expired-unexecuted' || isTaskIgnored(task) || isTaskDeferred(task))
      done += 1
    else if (needsMyAction(task))
      pending += 1
    else
      processing += 1
  }
  return { total: props.allTasks.length, pending, processing, done }
})
watch([() => props.role, () => props.serviceMode], () => {
  bucket.value = 'all'
})
watch([bucket, () => props.filter], () => page.value = 1)
watch(pages, (value) => {
  if (page.value > value)
    page.value = value
})
function taskTypeLabel(task: GeoTask) {
  return task.type === 'web' ? '官网内容' : task.type === 'external' ? '外部内容' : '官网结构与技术'
}
function sourceLabel(task: GeoTask) {
  if (task.origin === 'buyer-coverage') {
    const count = task.coverageGapRefs?.length ?? 0
    return count ? `买家关注点与品牌表现 · ${count} 项差距` : '买家关注点与品牌表现'
  }
  if (task.origin === 'geo-audit') return `官网 GEO 体检 · ${task.source}`
  if (task.sourceKind === 'geo-audit-content') return `官网体检 · ${displayObjectCodes(task.source)}`
  const source = task.source.split(/[·/]/)[0]?.trim() || task.source
  return displayObjectCodes(source)
}
function taskActionLabel(task: GeoTask) {
  if (!needsMyAction(task)) return '查看详情'
  if (task.progress === 'brief') return '确认 Brief'
  if (['human', 'client_review', 'client_content_review'].includes(task.progress)) return '审核内容'
  return '查看详情'
}
function setTaskFilter(value: string) {
  emit('setFilter', value as TaskFilter)
}
function setTaskStatus(value: string) {
  bucket.value = value as BucketFilter
}
</script>

<template>
  <div class="geo-content geo-optimization">
    <GeoPageIntro variant="workbench" title="优化中心 · 任务工作台" help-label="优化中心说明" description="官网体检确认后生成独立任务；候选策略可按执行目标合并为一项任务。任务先确认 Brief，再进入内容执行与审核。" />

    <section class="geo-diagnosis-summary geo-optimization-summary" aria-label="任务概况与任务状态统计">
      <div class="geo-optimization-summary__overview">
        <div class="geo-optimization-round-meta"><span>监测时间 / 轮次</span><b>2026-10-02 · 第 5 轮</b></div>
        <header class="geo-diagnosis-summary__header">
          <div class="geo-diagnosis-summary__title">
            <span class="geo-diagnosis-summary__icon" aria-hidden="true">✦</span>
            <h2>任务概况</h2>
          </div>
        </header>
        <div class="geo-diagnosis-summary__metrics geo-optimization-summary__metrics">
          <div v-for="stat in overviewStats" :key="stat.name" class="geo-task-metric">
            <span>{{ stat.name }}</span><b>{{ stat.count }}<small> 项</small></b>
          </div>
        </div>
      </div>

      <section class="geo-optimization-status-stats" aria-labelledby="geo-status-stats-title">
        <header class="geo-panel__head">
          <h2 id="geo-status-stats-title">
            任务状态
          </h2>
          <Tag tone="blue" variant="soft" size="sm">
            共 {{ taskStatusStats.total }} 项
          </Tag>
        </header>
        <div class="geo-status-stats__grid">
          <div class="geo-status-stat is-pending">
            <span>待我处理</span><b>{{ taskStatusStats.pending }}<small> 项</small></b>
          </div>
          <div class="geo-status-stat is-processing">
            <span>处理中</span><b>{{ taskStatusStats.processing }}<small> 项</small></b>
          </div>
          <div class="geo-status-stat is-done">
            <span>已完成</span><b>{{ taskStatusStats.done }}<small> 项</small></b>
          </div>
        </div>
      </section>
    </section>

    <section class="geo-panel geo-task-panel" aria-labelledby="geo-task-title">
      <header class="geo-panel__head">
        <div>
          <h2 id="geo-task-title">
            任务列表
          </h2>
        </div><Tag tone="blue" variant="soft" size="sm">
          {{ filteredTasks.length }} 项
        </Tag>
      </header>
      <div class="geo-task-filter-row">
        <strong>任务类型</strong>
        <SegmentedControl class="geo-filter-options" :model-value="filter" :options="taskTypeOptions" variant="filter" aria-label="任务类型筛选" @update:model-value="setTaskFilter" />
      </div>
      <div class="geo-task-filter-row">
        <strong>任务状态</strong>
        <SegmentedControl class="geo-filter-options" :model-value="bucket" :options="taskStatusOptions" variant="filter" aria-label="任务状态筛选" @update:model-value="setTaskStatus" />
      </div>
      <div class="geo-task-table-wrap">
        <DataList
          class="geo-task-table"
          border
          :items="visibleTasks"
          :columns="taskColumns"
          :get-row-id="item => taskFromRow(item).id"
          :is-row-activatable="() => false"
          label="优化中心任务列表"
          :labels="taskTableLabels"
          empty-message="当前筛选下暂无任务。官网体检问题或候选策略审核通过后，任务会出现在这里。"
          error-message="任务加载失败"
          :show-footer-when-empty="true"
          density="compact"
        >
          <template #cell-serial="{ item }">
            {{ taskFromRow(item).id }}
          </template>
          <template #cell-task="{ item }">
            <strong>{{ taskFromRow(item).name }}</strong>
          </template>
          <template #cell-type="{ item }">
            <span class="geo-method">{{ taskTypeLabel(taskFromRow(item)) }}</span>
          </template>
          <template #cell-source="{ item }">
            {{ sourceLabel(taskFromRow(item)) }}
          </template>
          <template #cell-status="{ item }">
            <span class="geo-progress" :class="`geo-progress--${taskFromRow(item).progress}`">{{ keyStatusLabel(taskFromRow(item)) }}</span>
          </template>
          <template #cell-actions="{ item }">
            <Button class="geo-task-detail-button geo-table-detail-button" size="sm" :data-guide-brief-task="taskFromRow(item).progress === 'brief' && taskFromRow(item).type !== 'repair' ? 'true' : undefined" @click="emit('openTask', taskFromRow(item))">
              {{ taskActionLabel(taskFromRow(item)) }}
            </Button>
          </template>
          <template #footer>
            <Pagination
              v-if="pages > 1"
              v-model="page"
              class="geo-task-pagination"
              size="sm"
              :total="filteredTasks.length"
              :page-size="perPage"
              label="任务分页"
              previous-label="任务上一页"
              next-label="任务下一页"
              :page-label="current => `任务第 ${current} 页`"
              :summary-text="taskPageSummary"
              :format-value="String"
            />
          </template>
        </DataList>
      </div>
    </section>
  </div>
</template>

