<script setup lang="ts">
import type { DataListColumn } from '../../ui/ce/data-list/types'
import type { TagTone } from '../../ui/ce/tag/types'
import type { MonitoringQuestion } from './monitoring-question-data'
import { computed, shallowRef } from 'vue'
import { Button, DataList, Tag } from '../../ui/ce'
import AppIcon from '../../ui/icons/AppIcon.vue'
import OnboardingHelp from '../shared/OnboardingHelp.vue'
import OnboardingSteps from '../shared/OnboardingSteps.vue'
import CustomMonitoringQuestionDialog from './CustomMonitoringQuestionDialog.vue'
import { canSelectMonitoringQuestion, limitSelectedQuestionIds, maxMonitoringQuestions } from './monitoring-question-selection'

const props = defineProps<{
  currentStep: number
  steps: string[]
  market: string
  language: string
  marketSetup?: boolean
  selectedIds: string[]
  customQuestions: MonitoringQuestion[]
  candidateQuestions?: MonitoringQuestion[]
  personaOptions?: readonly import('../../ui/ce/dropdown-select/types').DropdownSelectOption[]
  typeOptions?: readonly import('../../ui/ce/dropdown-select/types').DropdownSelectOption[]
  stageOptions?: readonly import('../../ui/ce/dropdown-select/types').DropdownSelectOption[]
  intentOptions?: readonly import('../../ui/ce/dropdown-select/types').DropdownSelectOption[]
  focusOptions?: readonly import('../../ui/ce/dropdown-select/types').DropdownSelectOption[]
  questionLimit?: number
  selectionSaving?: boolean
  persistQuestion?: (question: MonitoringQuestion) => Promise<MonitoringQuestion>
  persistEditedQuestion?: (question: MonitoringQuestion) => Promise<MonitoringQuestion>
}>()

const emit = defineEmits<{
  selectionChanged: [ids: string[]]
  customQuestionAdded: [question: MonitoringQuestion]
  questionEdited: [question: MonitoringQuestion]
}>()

const removedQuestionIds = shallowRef<string[]>([])
const candidates = computed(() => {
  const unique = new Map((props.candidateQuestions ?? []).map(question => [question.id, question]))
  props.customQuestions.forEach((question) => {
    if (!unique.has(question.id))
      unique.set(question.id, question)
  })
  return [...unique.values()].filter(question => !removedQuestionIds.value.includes(question.id))
})
const selectionLimit = computed(() => props.questionLimit ?? maxMonitoringQuestions)
const selectedCount = computed(() => props.selectedIds.length)
const customDialogOpen = shallowRef(false)
const editingQuestion = shallowRef<MonitoringQuestion | null>(null)

const columns: DataListColumn<unknown>[] = [
  { key: 'select', title: '选择', width: 64, minWidth: 64, className: 'monitoring-question-table__nowrap' },
  { key: 'question', title: '问题', width: 'auto', minWidth: 480 },
  { key: 'keyword', title: '关键词', width: 230, minWidth: 230, className: 'monitoring-question-table__wrap' },
  { key: 'type', title: '类型', width: 96, minWidth: 96, className: 'monitoring-question-table__nowrap' },
  { key: 'persona', title: '买家人设', width: 120, minWidth: 120, className: 'monitoring-question-table__nowrap' },
  { key: 'purchaseStage', title: '采购阶段', width: 110, minWidth: 110, className: 'monitoring-question-table__nowrap' },
  { key: 'intent', title: '意图', width: 160, minWidth: 160, className: 'monitoring-question-table__nowrap' },
  { key: 'mainConcern', title: '主要关注问题', width: 130, minWidth: 130, className: 'monitoring-question-table__nowrap' },
  { key: 'actions', title: '操作', width: 120, minWidth: 120, className: 'monitoring-question-table__nowrap' },
]

const labels = {
  bulkActions: '候选问题批量操作',
  selectedCount: (count: number) => `已选择 ${count} 条问题`,
  clearSelection: '清除选择',
  table: (label: string) => `${label}表格`,
  selectAll: '选择全部候选问题',
  loading: '正在加载候选问题…',
  retry: '重试',
  selectRow: (question: string) => `选择问题：${question}`,
}

function asQuestion(item: unknown) {
  return item as MonitoringQuestion
}

function getRowId(item: unknown) {
  return asQuestion(item).id
}

function isSelected(item: unknown) {
  return props.selectedIds.includes(asQuestion(item).id)
}

function canSelect(item: unknown) {
  return canSelectMonitoringQuestion(asQuestion(item).id, props.selectedIds, selectionLimit.value)
}

function toggleQuestion(item: unknown, event: Event) {
  const question = asQuestion(item)
  const checked = (event.currentTarget as HTMLInputElement).checked
  const next = checked
    ? [...props.selectedIds, question.id]
    : props.selectedIds.filter(id => id !== question.id)
  emit('selectionChanged', limitSelectedQuestionIds(next, props.selectedIds, selectionLimit.value))
}

function addMonitoringQuestion() {
  editingQuestion.value = null
  customDialogOpen.value = true
}

function editMonitoringQuestion(item: unknown) {
  editingQuestion.value = asQuestion(item)
  customDialogOpen.value = true
}

function removeMonitoringQuestion(item: unknown) {
  const questionId = asQuestion(item).id
  removedQuestionIds.value = [...removedQuestionIds.value, questionId]
  if (props.selectedIds.includes(questionId))
    emit('selectionChanged', props.selectedIds.filter(id => id !== questionId))
}

function typeTone(type: MonitoringQuestion['type']): TagTone {
  if (type === '产品词')
    return 'orange'
  if (type === '品牌词')
    return 'purple'
  return 'green'
}
</script>

<template>
  <div class="monitoring-question-step">
    <header class="page-header">
      <div class="page-header__title-row">
        <h1 class="page-header__title">
          {{ marketSetup ? '配置该市场监测问题' : '确认首次监测问题' }}
        </h1>
        <OnboardingHelp label="监测问题说明" :message="marketSetup ? '为该市场选择首次监测的问题；问题配置与其他市场独立。正式环境将按目标市场和语言生成候选问题。' : '候选问题由后端生成；可选条数按当前套餐额度执行。自定义监测问题由用户输入；关键词、类型、人设、阶段、意图和主要关注问题通过下拉选择。'" />
      </div>
    </header>

    <OnboardingSteps :current-step="currentStep" :steps="steps" />

    <p class="monitoring-question-step__context">
      {{ marketSetup ? '当前配置市场：' : '当前市场：' }}<strong>{{ market || '尚未设置' }} · {{ language || '尚未设置' }}</strong>{{ marketSetup ? '。候选问题将根据本市场单独生成和保存。' : '。候选问题将根据当前市场和回答语言生成。' }}
    </p>

    <section class="knowledge-panel monitoring-question-panel" aria-labelledby="monitoring-question-title">
      <div class="knowledge-panel__header monitoring-question-panel__header">
        <div>
          <div class="monitoring-question-panel__title-row">
            <h2 id="monitoring-question-title" class="knowledge-panel__title">
              {{ marketSetup ? '该市场候选监测问题' : 'AI 生成的候选问题' }}
            </h2>
            <OnboardingHelp label="候选问题说明" message="问题 · 关键词 · 类型 · 买家人设 · 采购阶段 · 意图 · 主要关注问题" />
          </div>
          <p class="monitoring-question-panel__description">
            {{ marketSetup ? '请选择本市场需要监测的问题；不同市场的问题配置分别保存。' : `当前共有 ${candidates.length} 条候选问题，当前套餐最多可选择 ${selectionLimit} 条加入首次监测。` }}
          </p>
        </div>
        <div class="monitoring-question-panel__header-actions">
          <div class="monitoring-question-panel__counts" aria-live="polite">
            <Tag tone="blue" variant="soft" size="sm">
              已选择 {{ selectedCount }} / {{ selectionLimit }}
            </Tag>
            <Tag tone="neutral" variant="soft" size="sm">
              {{ candidates.length }} 条候选
            </Tag>
          </div>
          <Button variant="primary" :disabled="selectionSaving" @click="addMonitoringQuestion">
            <AppIcon name="add" :size="16" aria-hidden="true" />
            添加监测问题
          </Button>
        </div>
      </div>

      <div class="monitoring-question-panel__table">
        <DataList
          :items="candidates"
          :columns="columns"
          :get-row-id="getRowId"
          :labels="labels"
          label="AI 生成的候选问题"
          empty-message="暂无候选问题"
          error-message="候选问题加载失败"
          density="compact"
          :is-row-activatable="() => false"
        >
          <template #cell-select="{ item }">
            <input
              type="checkbox"
              :checked="isSelected(item)"
              :disabled="selectionSaving || (!canSelect(item) && !isSelected(item))"
              :aria-label="`选择问题：${asQuestion(item).question}`"
              @change="toggleQuestion(item, $event)"
            >
          </template>
          <template #cell-question="{ item }">
            <span class="monitoring-question-panel__question">{{ asQuestion(item).question }}</span>
          </template>
          <template #cell-keyword="{ item }">
            {{ asQuestion(item).keyword }}
          </template>
          <template #cell-type="{ item }">
            <Tag :tone="typeTone(asQuestion(item).type)" variant="soft" size="sm">
              {{ asQuestion(item).type }}
            </Tag>
          </template>
          <template #cell-persona="{ item }">
            {{ asQuestion(item).persona }}
          </template>
          <template #cell-purchaseStage="{ item }">
            {{ asQuestion(item).purchaseStage }}
          </template>
          <template #cell-intent="{ item }">
            <Tag tone="neutral" variant="soft" size="sm">
              {{ asQuestion(item).intent }}
            </Tag>
          </template>
          <template #cell-mainConcern="{ item }">
            {{ asQuestion(item).mainConcern }}
          </template>
          <template #cell-actions="{ item }">
            <div class="monitoring-question-panel__row-actions">
              <Button variant="text" size="sm" :disabled="selectionSaving" @click="editMonitoringQuestion(item)">
                编辑
              </Button>
              <Button class="is-remove" variant="text" size="sm" :disabled="selectionSaving" @click="removeMonitoringQuestion(item)">
                移除
              </Button>
            </div>
          </template>
        </DataList>
      </div>
    </section>

    <CustomMonitoringQuestionDialog
      v-model:open="customDialogOpen"
      :initial-question="editingQuestion"
      :persona-options="personaOptions"
      :type-options="typeOptions"
      :stage-options="stageOptions"
      :intent-options="intentOptions"
      :focus-options="focusOptions"
      :persist-question="persistQuestion"
      :persist-edited-question="persistEditedQuestion"
      @added="emit('customQuestionAdded', $event)"
      @edited="emit('questionEdited', $event)"
    />
  </div>
</template>

<style scoped>
.monitoring-question-step { display: grid; gap: var(--space-5); min-width: 0; }
.monitoring-question-step .page-header { margin-bottom: 0; }
.monitoring-question-step :deep(.onboarding-steps) { margin-bottom: 0; }
.monitoring-question-step__context { margin: 0; padding: 0 var(--space-2); color: var(--text-secondary); font-size: var(--font-size-body); line-height: var(--line-height-body); }
.monitoring-question-step__context strong { color: var(--text-primary); font-weight: var(--weight-semibold); }
.monitoring-question-panel { min-width: 0; }
.monitoring-question-panel__header { align-items: flex-start; }
.monitoring-question-panel__title-row { display: flex; align-items: center; gap: var(--space-2); }
.monitoring-question-panel__description { margin: var(--space-2) 0 0; color: var(--text-muted); font-size: var(--font-size-caption); line-height: var(--line-height-caption); }
.monitoring-question-panel__header-actions, .monitoring-question-panel__counts { display: flex; flex: 0 0 auto; align-items: center; gap: var(--space-2); }
.monitoring-question-panel__header-actions { flex-wrap: wrap; justify-content: flex-end; }
.monitoring-question-panel__table { padding: var(--space-4) var(--space-surface-content) 0; }
.monitoring-question-panel__table :deep(.data-list__scroll) { border: 0; }
.monitoring-question-panel__table :deep(.data-list__panel) { border: 0; border-radius: 0; box-shadow: none; }
.monitoring-question-panel__table :deep(.data-list th) { background: var(--background-control-subtle); }
.monitoring-question-panel__table :deep(.data-list td) { vertical-align: middle; }
.monitoring-question-panel__table :deep(.data-list .monitoring-question-table__nowrap) { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; overflow-wrap: normal; }
.monitoring-question-panel__table :deep(.data-list .monitoring-question-table__wrap) { white-space: normal; overflow-wrap: anywhere; }
.monitoring-question-panel__question { display: block; font-weight: var(--weight-medium); line-height: var(--line-height-body); }
.monitoring-question-panel__header-actions :deep(.ce-button) { display: inline-flex; align-items: center; gap: var(--space-icon-text); }
.monitoring-question-panel__row-actions { display: flex; align-items: center; gap: 8px; }
.monitoring-question-panel__row-actions :deep(.is-remove) { color: var(--status-error-foreground); }
.monitoring-question-panel__header-actions svg { display: block; flex: 0 0 16px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-width: 1.8; }
@media (max-width: 760px) {
  .monitoring-question-panel__header { flex-direction: column; }
  .monitoring-question-panel__header-actions, .monitoring-question-panel__counts { flex-wrap: wrap; }
  .monitoring-question-panel__header-actions { justify-content: flex-start; }
  .monitoring-question-panel__table { padding-inline: var(--space-3); }
}
</style>

