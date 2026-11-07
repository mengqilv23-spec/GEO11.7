<script setup lang="ts">
import type { MonitoringQuestion } from '../../../data/visibility-monitoring-data'
import type { CustomMonitoringQuestionDraft } from '../../onboarding/monitoring-questions/monitoring-question-validation'
import type { DropdownSelectOption } from '../../ui/ce'
import { reactive, watch } from 'vue'
import { validateCustomMonitoringQuestion } from '../../onboarding/monitoring-questions/monitoring-question-validation'
import { DropdownSelect, Input, Modal } from '../../ui/ce'

type SelectFieldKey = 'type' | 'persona' | 'purchaseStage' | 'intent' | 'mainConcern'

const props = defineProps<{
  options: Record<SelectFieldKey, readonly DropdownSelectOption[]>
}>()

const emit = defineEmits<{
  added: [question: MonitoringQuestion]
}>()

const open = defineModel<boolean>('open', { default: false })
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
const selectFields: { key: SelectFieldKey, label: string }[] = [
  { key: 'type', label: '类型' },
  { key: 'persona', label: '买家人设' },
  { key: 'purchaseStage', label: '采购阶段' },
  { key: 'intent', label: '意图' },
  { key: 'mainConcern', label: '主要关注问题' },
]

function resetDraft() {
  Object.assign(draft, { question: '', keyword: '', type: '', persona: '', purchaseStage: '', intent: '', mainConcern: '' })
  Object.keys(errors).forEach((key) => {
    delete errors[key as keyof CustomMonitoringQuestionDraft]
  })
}

watch(open, (isOpen) => {
  if (isOpen)
    resetDraft()
})

function clearError(field: keyof CustomMonitoringQuestionDraft) {
  delete errors[field]
}

function labelFor(options: readonly DropdownSelectOption[], value: string) {
  return options.find(option => option.value === value)?.label ?? value
}

function addQuestion() {
  Object.assign(errors, validateCustomMonitoringQuestion(draft))
  if (Object.keys(errors).length)
    return

  emit('added', {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    question: draft.question.trim(),
    keyword: draft.keyword.trim(),
    type: draft.type as MonitoringQuestion['type'],
    persona: labelFor(props.options.persona, draft.persona),
    stage: labelFor(props.options.purchaseStage, draft.purchaseStage),
    intent: labelFor(props.options.intent, draft.intent),
    concern: labelFor(props.options.mainConcern, draft.mainConcern),
    platformResults: [],
    competitors: [],
    officialSiteCited: false,
    rank: null,
    trend: 'flat',
    samplingBatches: [],
  })
  open.value = false
}
</script>

<template>
  <Modal
    v-model:open="open"
    title="添加监测问题"
    width="min(760px, calc(100vw - 32px))"
    confirm-text="添加问题"
    cancel-text="取消"
    processing-text="添加中…"
    close-label="关闭添加监测问题弹窗"
    @confirm="addQuestion"
  >
    <form class="vm-add-question-form" @submit.prevent="addQuestion">
      <div class="vm-add-question-form__field">
        <label for="vm-add-question-text">监测问题</label>
        <textarea
          id="vm-add-question-text"
          v-model="draft.question"
          class="ce-input vm-add-question-form__textarea"
          rows="3"
          maxlength="240"
          placeholder="输入完整的监测问题"
          :aria-invalid="!!errors.question"
          :aria-describedby="errors.question ? 'vm-add-question-text-error' : undefined"
          @input="clearError('question')"
        />
        <p v-if="errors.question" id="vm-add-question-text-error" class="vm-add-question-form__error" role="alert">
          {{ errors.question }}
        </p>
      </div>

      <div class="vm-add-question-form__field">
        <label for="vm-add-question-keyword">关键词</label>
        <Input
          id="vm-add-question-keyword"
          v-model="draft.keyword"
          maxlength="80"
          placeholder="输入关键词"
          :aria-invalid="!!errors.keyword"
          :aria-describedby="errors.keyword ? 'vm-add-question-keyword-error' : undefined"
          @input="clearError('keyword')"
        />
        <p v-if="errors.keyword" id="vm-add-question-keyword-error" class="vm-add-question-form__error" role="alert">
          {{ errors.keyword }}
        </p>
      </div>

      <div v-for="field in selectFields" :key="field.key" class="vm-add-question-form__field">
        <label :id="`vm-add-question-${field.key}-label`">{{ field.label }}</label>
        <DropdownSelect
          v-model="draft[field.key]"
          :options="options[field.key]"
          v-bind="{ ariaLabel: `请选择${field.label}`, ariaLabelledby: `vm-add-question-${field.key}-label`, ariaDescribedby: errors[field.key] ? `vm-add-question-${field.key}-error` : undefined }"
          panel-width="100%"
          @update:model-value="clearError(field.key)"
        />
        <p v-if="errors[field.key]" :id="`vm-add-question-${field.key}-error`" class="vm-add-question-form__error" role="alert">
          {{ errors[field.key] }}
        </p>
      </div>
    </form>
  </Modal>
</template>

<style scoped>
.vm-add-question-form { display: grid; gap: 16px; }
.vm-add-question-form__field { display: grid; align-content: start; gap: 8px; min-width: 0; }
.vm-add-question-form__field > label { color: var(--text-secondary); font-size: 14px; line-height: 22px; font-weight: 500; }
.vm-add-question-form :deep(input.ce-input),
.vm-add-question-form :deep(.ce-dropdown-select__trigger) { box-sizing: border-box; height: 40px; min-height: 40px; }
.vm-add-question-form__field :deep(.ce-dropdown-select__trigger) {
  width: 100%;
  justify-content: stretch;
  --button-height: var(--size-control-regular);
  --button-background: var(--background-primary);
  --button-foreground: var(--text-primary);
  --button-border-color: var(--border-control);
  --button-hover-background: var(--background-primary);
  --button-hover-border: var(--action-accent);
  --button-hover-foreground: var(--text-primary);
}
.vm-add-question-form__textarea { min-height: 104px; resize: vertical; }
.vm-add-question-form__error { margin: 0; color: var(--status-error); font-size: 12px; line-height: 20px; }
:deep(dialog.ce-modal-root:has(.vm-add-question-form)) { --modal-inset: 16px; max-height: min(820px, calc(100vh - 32px)); }
:deep(dialog.ce-modal-root:has(.vm-add-question-form) .ce-modal) { max-height: min(820px, calc(100vh - 32px)); }
</style>

