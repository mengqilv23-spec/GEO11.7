<script setup lang="ts">
import type { DropdownSelectOption } from '../../ui/ce'
import type { MonitoringQuestion } from './monitoring-question-data'
import type { CustomMonitoringQuestionDraft } from './monitoring-question-validation'
import { computed, reactive, ref, watch } from 'vue'
import { DropdownSelect, Input, Modal } from '../../ui/ce'
import { buyerPersonaTypeOptions, purchaseStageOptions } from '../buyer-persona/buyer-persona-options'
import { validateCustomMonitoringQuestion } from './monitoring-question-validation'
import { localizePersonaOption } from './persona-labels'

const props = defineProps<{
  personaOptions?: readonly DropdownSelectOption[]
  typeOptions?: readonly DropdownSelectOption[]
  stageOptions?: readonly DropdownSelectOption[]
  intentOptions?: readonly DropdownSelectOption[]
  focusOptions?: readonly DropdownSelectOption[]
  initialQuestion?: MonitoringQuestion | null
  persistQuestion?: (question: MonitoringQuestion) => Promise<MonitoringQuestion>
  persistEditedQuestion?: (question: MonitoringQuestion) => Promise<MonitoringQuestion>
}>()
const emit = defineEmits<{
  added: [question: MonitoringQuestion]
  edited: [question: MonitoringQuestion]
}>()
const open = defineModel<boolean>('open', { default: false })

const typeOptions: DropdownSelectOption[] = [
  { value: '产品词', label: '产品词' },
  { value: '业务词', label: '业务词' },
  { value: '品牌词', label: '品牌词' },
]
const intentOptions: DropdownSelectOption[] = [
  { value: 'cognition', label: '认知' },
  { value: 'compare', label: '比较' },
  { value: 'evaluate', label: '评估' },
  { value: 'endorse', label: '背书' },
  { value: 'recommend', label: '推荐' },
  { value: 'decide', label: '决策' },
]
const mainConcernOptions: DropdownSelectOption[] = [
  { value: 'technical-performance', label: '技术性能' },
  { value: 'application-fit', label: '应用适配' },
  { value: 'price-and-cost', label: '价格与成本' },
  { value: 'supplier-credibility', label: '供应商资质' },
  { value: 'delivery-and-service', label: '交付与服务' },
  { value: 'competitive-comparison', label: '竞品对比' },
]
const availablePersonaOptions = computed(() => (props.personaOptions ?? buyerPersonaTypeOptions).map(localizePersonaOption))
const availableTypeOptions = computed(() => props.typeOptions ?? typeOptions)
const availableStageOptions = computed(() => props.stageOptions ?? purchaseStageOptions)
const availableIntentOptions = computed(() => props.intentOptions ?? intentOptions)
const availableFocusOptions = computed(() => props.focusOptions ?? mainConcernOptions)

const draft = reactive<CustomMonitoringQuestionDraft>({
  question: '',
  keyword: '',
  type: '',
  persona: '',
  purchaseStage: '',
  intent: '',
  mainConcern: '',
})
const errors = reactive<Partial<Record<keyof CustomMonitoringQuestionDraft, string>>>({})
const saving = ref(false)

function resetDraft() {
  Object.assign(draft, {
    question: '',
    keyword: '',
    type: '',
    persona: '',
    purchaseStage: '',
    intent: '',
    mainConcern: '',
  })
  Object.keys(errors).forEach((key) => {
    delete errors[key as keyof CustomMonitoringQuestionDraft]
  })
}

function valueFor(options: readonly DropdownSelectOption[], code: string | undefined, label: string) {
  if (code)
    return code
  return String(options.find(option => option.label === label || option.value === label)?.value ?? '')
}

function loadInitialQuestion(question: MonitoringQuestion) {
  Object.assign(draft, {
    question: question.question,
    keyword: question.keyword,
    type: valueFor(availableTypeOptions.value, question.questionTypeCode, question.type),
    persona: valueFor(availablePersonaOptions.value, question.personaId ? String(question.personaId) : undefined, question.persona),
    purchaseStage: valueFor(availableStageOptions.value, question.purchaseStageCode, question.purchaseStage),
    intent: valueFor(availableIntentOptions.value, question.intentCode, question.intent),
    mainConcern: valueFor(availableFocusOptions.value, question.focusCode, question.mainConcern ?? ''),
  })
}

watch(open, (isOpen) => {
  if (isOpen) {
    if (props.initialQuestion)
      loadInitialQuestion(props.initialQuestion)
    else
      resetDraft()
  }
})

function clearError(field: keyof CustomMonitoringQuestionDraft) {
  delete errors[field]
}

function labelFor(options: readonly DropdownSelectOption[], value: string) {
  return options.find(option => option.value === value)?.label ?? value
}

async function saveQuestion() {
  Object.assign(errors, validateCustomMonitoringQuestion(draft))
  if (Object.keys(errors).length)
    return

  const question: MonitoringQuestion = {
    id: props.initialQuestion?.id ?? `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    question: draft.question.trim(),
    keyword: draft.keyword.trim(),
    type: labelFor(availableTypeOptions.value, draft.type),
    persona: labelFor(availablePersonaOptions.value, draft.persona),
    purchaseStage: labelFor(availableStageOptions.value, draft.purchaseStage),
    intent: labelFor(availableIntentOptions.value, draft.intent),
    mainConcern: labelFor(availableFocusOptions.value, draft.mainConcern),
    personaId: Number(draft.persona),
    questionTypeCode: draft.type,
    purchaseStageCode: draft.purchaseStage,
    intentCode: draft.intent,
    focusCode: draft.mainConcern,
  }
  saving.value = true
  try {
    if (props.initialQuestion) {
      const saved = props.persistEditedQuestion ? await props.persistEditedQuestion(question) : question
      emit('edited', saved)
    }
    else {
      const saved = props.persistQuestion ? await props.persistQuestion(question) : question
      emit('added', saved)
    }
    open.value = false
  }
  catch {
    // API errors are announced by the app-level toast listener.
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <Modal
    v-model:open="open"
    class="custom-monitoring-question-modal"
    :title="initialQuestion ? '编辑监测问题' : '添加监测问题'"
    width="min(860px, calc(100vw - 32px))"
    :confirm-text="initialQuestion ? '保存修改' : '添加监测问题'"
    cancel-text="取消"
    :processing-text="initialQuestion ? '保存中…' : '添加中…'"
    :loading="saving"
    :close-label="initialQuestion ? '关闭编辑监测问题弹窗' : '关闭添加监测问题弹窗'"
    @confirm="saveQuestion"
  >
    <form class="custom-monitoring-question-form" @submit.prevent="saveQuestion">
      <div class="custom-monitoring-question-field custom-monitoring-question-field--wide">
        <label for="custom-monitoring-question">监测问题 <span aria-hidden="true">*</span></label>
        <textarea
          id="custom-monitoring-question"
          v-model="draft.question"
          class="ce-input custom-monitoring-question-form__textarea"
          rows="3"
          maxlength="240"
          placeholder="输入完整的监测问题"
          :aria-invalid="!!errors.question"
          :aria-describedby="errors.question ? 'custom-question-error' : undefined"
          @input="clearError('question')"
        />
        <p v-if="errors.question" id="custom-question-error" class="custom-monitoring-question-field__error" role="alert">
          {{ errors.question }}
        </p>
      </div>

      <div class="custom-monitoring-question-field">
        <label for="custom-monitoring-keyword">关键词 <span aria-hidden="true">*</span></label>
        <Input
          id="custom-monitoring-keyword"
          v-model="draft.keyword"
          maxlength="80"
          placeholder="输入关键词"
          :aria-invalid="!!errors.keyword"
          :aria-describedby="errors.keyword ? 'custom-keyword-error' : undefined"
          @input="clearError('keyword')"
        />
        <p v-if="errors.keyword" id="custom-keyword-error" class="custom-monitoring-question-field__error" role="alert">
          {{ errors.keyword }}
        </p>
      </div>

      <div class="custom-monitoring-question-field">
        <label id="custom-monitoring-type-label">类型 <span aria-hidden="true">*</span></label>
        <DropdownSelect
          v-model="draft.type"
          :options="availableTypeOptions"
          v-bind="{ ariaLabel: '请选择类型', ariaLabelledby: 'custom-monitoring-type-label', ariaDescribedby: errors.type ? 'custom-type-error' : undefined }"
          panel-width="100%"
          @update:model-value="clearError('type')"
        />
        <p v-if="errors.type" id="custom-type-error" class="custom-monitoring-question-field__error" role="alert">
          {{ errors.type }}
        </p>
      </div>

      <div class="custom-monitoring-question-field">
        <label id="custom-monitoring-persona-label">买家人设 <span aria-hidden="true">*</span></label>
        <DropdownSelect
          v-model="draft.persona"
          :options="availablePersonaOptions"
          v-bind="{ ariaLabel: '请选择买家人设', ariaLabelledby: 'custom-monitoring-persona-label', ariaDescribedby: errors.persona ? 'custom-persona-error' : undefined }"
          panel-width="100%"
          @update:model-value="clearError('persona')"
        />
        <p v-if="errors.persona" id="custom-persona-error" class="custom-monitoring-question-field__error" role="alert">
          {{ errors.persona }}
        </p>
      </div>

      <div class="custom-monitoring-question-field">
        <label id="custom-monitoring-stage-label">采购阶段 <span aria-hidden="true">*</span></label>
        <DropdownSelect
          v-model="draft.purchaseStage"
          :options="availableStageOptions"
          v-bind="{ ariaLabel: '请选择采购阶段', ariaLabelledby: 'custom-monitoring-stage-label', ariaDescribedby: errors.purchaseStage ? 'custom-stage-error' : undefined }"
          panel-width="100%"
          @update:model-value="clearError('purchaseStage')"
        />
        <p v-if="errors.purchaseStage" id="custom-stage-error" class="custom-monitoring-question-field__error" role="alert">
          {{ errors.purchaseStage }}
        </p>
      </div>

      <div class="custom-monitoring-question-field">
        <label id="custom-monitoring-intent-label">意图 <span aria-hidden="true">*</span></label>
        <DropdownSelect
          v-model="draft.intent"
          :options="availableIntentOptions"
          v-bind="{ ariaLabel: '请选择意图', ariaLabelledby: 'custom-monitoring-intent-label', ariaDescribedby: errors.intent ? 'custom-intent-error' : undefined }"
          panel-width="100%"
          @update:model-value="clearError('intent')"
        />
        <p v-if="errors.intent" id="custom-intent-error" class="custom-monitoring-question-field__error" role="alert">
          {{ errors.intent }}
        </p>
      </div>

      <div class="custom-monitoring-question-field">
        <label id="custom-monitoring-concern-label">主要关注问题 <span aria-hidden="true">*</span></label>
        <DropdownSelect
          v-model="draft.mainConcern"
          :options="availableFocusOptions"
          v-bind="{ ariaLabel: '请选择主要关注问题', ariaLabelledby: 'custom-monitoring-concern-label', ariaDescribedby: errors.mainConcern ? 'custom-concern-error' : undefined }"
          panel-width="100%"
          @update:model-value="clearError('mainConcern')"
        />
        <p v-if="errors.mainConcern" id="custom-concern-error" class="custom-monitoring-question-field__error" role="alert">
          {{ errors.mainConcern }}
        </p>
      </div>
    </form>
  </Modal>
</template>

<style scoped>
.custom-monitoring-question-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4) var(--space-3); }
.custom-monitoring-question-field { display: grid; align-content: start; gap: var(--space-2); min-width: 0; }
.custom-monitoring-question-field--wide { grid-column: 1 / -1; }
.custom-monitoring-question-field > label { color: var(--text-secondary); font-size: var(--font-size-body); line-height: var(--line-height-body); font-weight: var(--weight-medium); }
.custom-monitoring-question-field > label span { color: var(--status-error); }
.custom-monitoring-question-form :deep(.ce-input) { background: var(--background-secondary); }
.custom-monitoring-question-field :deep(.ce-dropdown-select__trigger) { width: 100%; justify-content: stretch; }
.custom-monitoring-question-form__textarea { min-height: 104px; resize: vertical; }
.custom-monitoring-question-field__error { margin: 0; color: var(--status-error); font-size: var(--font-size-caption); line-height: var(--line-height-caption); }
:deep(.ce-modal-root.custom-monitoring-question-modal) { --modal-inset: var(--space-4); max-height: min(760px, calc(100vh - 32px)); }
:deep(.ce-modal-root.custom-monitoring-question-modal .ce-modal) { max-height: min(760px, calc(100vh - 32px)); }
@media (max-width: 600px) {
  .custom-monitoring-question-form { grid-template-columns: 1fr; }
  .custom-monitoring-question-field--wide { grid-column: auto; }
}
</style>

