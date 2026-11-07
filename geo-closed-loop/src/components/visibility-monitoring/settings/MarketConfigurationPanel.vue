<script setup lang="ts">
import type { BuyerPersonaRecord, MarketThemeRecord, MonitoringQuestionRecord } from '../../../api/geo-config'
import type { MonitoringQuestion } from '../../../data/visibility-monitoring-data'
import type { BuyerPersona, KnowledgeItem } from '../../../types'
import type { DataListColumn } from '../../ui/ce/data-list/types'
import type { DropdownSelectOption } from '../../ui/ce/dropdown-select/types'
import type { KnowledgeEditorTab } from './CurrentBrandKnowledge.vue'
import { computed, shallowRef } from 'vue'
import BuyerPersonaEditorDialog from '../../onboarding/buyer-persona/BuyerPersonaEditorDialog.vue'
import { Button, DataList } from '../../ui/ce'
import Spinner from '../../ui/ce/spinner/Spinner.vue'
import AddMonitoringQuestionDialog from '../questions/AddMonitoringQuestionDialog.vue'
import BulkMonitoringQuestionsDialog from '../questions/BulkMonitoringQuestionsDialog.vue'
import BuyerPersonaViewDrawer from './BuyerPersonaViewDrawer.vue'
import CurrentBrandKnowledge from './CurrentBrandKnowledge.vue'

const props = defineProps<{
  stage: 1 | 2 | 3
  personas: readonly BuyerPersonaRecord[]
  questions: readonly MonitoringQuestionRecord[]
  themes: readonly MarketThemeRecord[]
  personaTypeOptions: readonly DropdownSelectOption[]
  purchaseStageOptions: readonly DropdownSelectOption[]
  companyScaleOptions: readonly DropdownSelectOption[]
  decisionRoleOptions: readonly DropdownSelectOption[]
  persistPersonas: (personas: BuyerPersona[]) => Promise<BuyerPersona[]>
  knowledgeItems: KnowledgeItem[]
  pendingCompetitorNames: readonly string[]
  loading: boolean
  errors: { brand: string, competitors: string, competitorRecommendations: string, personas: string, questions: string, themes: string }
}>()

const emit = defineEmits<{ retry: [], editKnowledge: [tab: KnowledgeEditorTab], viewKnowledge: [tab: KnowledgeEditorTab], reviewCompetitors: [], addQuestion: [question: MonitoringQuestion], updateQuestions: [questions: MonitoringQuestion[]] }>()
const selectedPersona = shallowRef<BuyerPersonaRecord | null>(null)
const personaEditorOpen = shallowRef(false)
const addQuestionOpen = shallowRef(false)
const editQuestionsOpen = shallowRef(false)
const personaDrafts = computed<BuyerPersona[]>(() => props.personas.map(persona => ({
  id: String(persona.id),
  type: persona.personaType,
  purchaseStage: persona.purchaseStages?.[0] ?? '',
  actualRole: persona.actualPosition ?? '',
  industry: persona.industry ?? '',
  companySize: persona.companyScale ?? '',
  decisionRole: persona.decisionRole ?? '',
  purchaseTrigger: persona.purchaseTrigger ?? '',
  purchaseBudget: persona.purchaseBudget ?? '',
  purchaseCycle: persona.purchaseCycle ?? '',
  discoveryChannel: persona.infoChannels ?? '',
      commonQuestions: persona.commonQuestions ?? '',
})))

const questionColumns: DataListColumn<unknown>[] = [
  { key: 'question', title: '问题', width: 'auto', minWidth: 460 },
  { key: 'keyword', title: '关键词', width: 190, minWidth: 150 },
  { key: 'type', title: '类型', width: 96, minWidth: 90 },
  { key: 'persona', title: '买家人设', width: 150, minWidth: 120 },
  { key: 'purchaseStage', title: '采购阶段', width: 115, minWidth: 100 },
  { key: 'intent', title: '意图', width: 90, minWidth: 80 },
  { key: 'mainConcern', title: '主要关注问题', width: 140, minWidth: 120 },
]

const tableLabels = {
  bulkActions: '监测问题批量操作',
  selectedCount: (count: number) => `已选择 ${count} 条问题`,
  clearSelection: '清除选择',
  table: (label: string) => `${label}表格`,
  selectAll: '选择全部监测问题',
  loading: '正在加载',
  retry: '重试',
  selectRow: (label: string) => `选择问题：${label}`,
}

function question(item: unknown) {
  return item as MonitoringQuestionRecord
}

function getQuestionId(item: unknown) {
  return String(question(item).id)
}

function keywordFor(item: unknown, themes: readonly MarketThemeRecord[]) {
  const record = question(item)
  return record.keyword?.trim() || (record.themeId === null ? '' : themes.find(theme => theme.id === record.themeId)?.themeName) || '—'
}

function asQuestion(record: MonitoringQuestionRecord): MonitoringQuestion {
  return {
    id: `Q${String(record.id).padStart(2, '0')}`,
    question: record.questionContent,
    keyword: record.keyword ?? '',
    type: record.questionType as MonitoringQuestion['type'],
    persona: personaFor(record, props.personas),
    stage: record.purchaseStage,
    intent: record.intentType,
    concern: record.focusType ?? '',
    platformResults: [],
    competitors: [],
    officialSiteCited: false,
    rank: null,
    trend: 'flat',
    samplingBatches: [],
  }
}

const questionOptions = computed(() => ({
  type: [...new Set(props.questions.map(item => item.questionType))].map(value => ({ value, label: value })),
  persona: props.personas.map(item => ({ value: item.personaName, label: item.personaName })),
  purchaseStage: [...new Set(props.questions.map(item => item.purchaseStage))].map(value => ({ value, label: value })),
  intent: [...new Set(props.questions.map(item => item.intentType))].map(value => ({ value, label: value })),
  mainConcern: [...new Set(props.questions.map(item => item.focusType).filter((value): value is string => !!value))].map(value => ({ value, label: value })),
}))

function addQuestion(question: MonitoringQuestion) {
  emit('addQuestion', question)
}

function updateQuestions(questions: MonitoringQuestion[]) {
  emit('updateQuestions', questions)
}

function personaFor(item: unknown, personas: readonly BuyerPersonaRecord[]) {
  return personas.find(persona => persona.id === question(item).personaId)?.personaName ?? '—'
}

function localizedValue(options: readonly DropdownSelectOption[], value: string) {
  return options.find(option => option.value === value)?.label ?? value
}

function personaStages(persona: BuyerPersonaRecord) {
  return persona.purchaseStages?.map(stage => localizedValue(props.purchaseStageOptions, stage)).join('、') || '—'
}
</script>

<template>
  <section class="market-config" :class="{ 'market-config--brand': stage === 1 }" :aria-labelledby="stage === 1 ? 'vm-current-knowledge-title' : `market-config-title-${stage}`">
    <header v-if="stage !== 1" class="market-config__header">
      <div>
        <h2 :id="`market-config-title-${stage}`">
          {{ stage === 2 ? '当前买家人设' : '当前监测问题' }}
          <span class="market-config__count">{{ stage === 2 ? `${personas.length} 类` : `${questions.length} 条` }}</span>
        </h2>
      </div>
      <Button v-if="stage === 2" variant="outline" :disabled="loading" @click="personaEditorOpen = true">
        维护买家人设
      </Button>
      <div v-else class="market-config__question-actions">
        <Button variant="outline" :disabled="loading" @click="editQuestionsOpen = true">
          编辑问题
        </Button>
        <Button variant="primary" :disabled="loading" @click="addQuestionOpen = true">
          添加监测问题
        </Button>
      </div>
    </header>
    <p v-if="loading" class="market-config__state" role="status">
      <Spinner variant="ring" aria-hidden="true" />
    </p>
    <template v-else-if="stage === 1">
      <CurrentBrandKnowledge
        :items="knowledgeItems"
        :pending-competitors="pendingCompetitorNames"
        :errors="[errors.brand && `品牌资料：${errors.brand}`, errors.competitors && `竞品：${errors.competitors}`, errors.competitorRecommendations && `竞品推荐：${errors.competitorRecommendations}`].filter(Boolean) as string[]"
        @edit="emit('editKnowledge', $event)"
        @view="emit('viewKnowledge', $event)"
        @review-competitors="emit('reviewCompetitors')"
      />
    </template>
    <template v-else-if="stage === 2">
      <p v-if="errors.personas" class="market-config__error" role="alert">
        {{ errors.personas }}
      </p>
      <p v-else-if="!personas.length" class="market-config__state">
        当前市场暂无买家人设
      </p>
      <div v-else class="market-config__persona-grid">
        <article v-for="persona in personas" :key="persona.id">
          <header class="market-config__persona-card-header">
            <h3 class="market-config__persona-name">
              {{ persona.personaName || '—' }}
            </h3>
            <Button variant="outline" size="sm" :aria-label="`查看${persona.personaName || '买家人设'}`" @click="selectedPersona = persona">
              查看
            </Button>
          </header>
          <div class="market-config__persona-stage">
            <span>采购阶段</span><strong>{{ personaStages(persona) }}</strong>
          </div>
        </article>
      </div>
      <BuyerPersonaViewDrawer
        :persona="selectedPersona"
        :open="selectedPersona !== null"
        :persona-type-options="personaTypeOptions"
        :purchase-stage-options="purchaseStageOptions"
        :company-scale-options="companyScaleOptions"
        :decision-role-options="decisionRoleOptions"
        @close="selectedPersona = null"
      />
      <BuyerPersonaEditorDialog
        v-model:open="personaEditorOpen"
        :personas="personaDrafts"
        mode="edit"
        :type-options="personaTypeOptions"
        :stage-options="purchaseStageOptions"
        :company-scale-options="companyScaleOptions"
        :decision-role-options="decisionRoleOptions"
        :persist-personas="persistPersonas"
      />
    </template>
    <template v-else>
      <p v-if="errors.questions" class="market-config__error" role="alert">
        {{ errors.questions }}
        <Button variant="outline" size="sm" @click="emit('retry')">
          重试
        </Button>
      </p>
      <div v-else class="market-config__questions">
        <p v-if="errors.themes" class="market-config__error" role="alert">
          {{ errors.themes }}
        </p>
        <DataList
          :items="questions"
          :columns="questionColumns"
          :get-row-id="getQuestionId"
          :labels="tableLabels"
          label="当前监测问题"
          empty-message="当前市场暂无监测问题"
          error-message="监测问题加载失败"
          density="compact"
          :is-row-activatable="() => false"
          @retry="emit('retry')"
        >
          <template #cell-question="{ item }">
            <span class="market-config__question"><span class="market-config__question-id">Q{{ String(question(item).id).padStart(2, '0') }}</span>{{ question(item).questionContent }}</span>
          </template>
          <template #cell-keyword="{ item }">
            {{ keywordFor(item, themes) }}
          </template>
          <template #cell-type="{ item }">
            {{ question(item).questionType || '—' }}
          </template>
          <template #cell-persona="{ item }">
            {{ personaFor(item, personas) }}
          </template>
          <template #cell-purchaseStage="{ item }">
            {{ question(item).purchaseStage || '—' }}
          </template>
          <template #cell-intent="{ item }">
            {{ question(item).intentType || '—' }}
          </template>
          <template #cell-mainConcern="{ item }">
            {{ question(item).focusType || '—' }}
          </template>
        </DataList>
        <AddMonitoringQuestionDialog v-model:open="addQuestionOpen" :options="questionOptions" @added="addQuestion" />
        <BulkMonitoringQuestionsDialog v-model:open="editQuestionsOpen" :questions="questions.map(asQuestion)" market="当前市场" :question-count="questions.length" :options="questionOptions" @saved="updateQuestions" />
      </div>
    </template>
  </section>
</template>

<style scoped>
.market-config { display: grid; gap: 16px; margin-top: 0; padding: 18px; border: 0; border-radius: 0; background: transparent; color: var(--text-primary); }
.market-config--brand { gap: 0; padding: 0; }
.market-config--brand > .market-config__state { margin: 18px; }
.market-config--brand :deep(.vm-current-knowledge) { margin-top: 0; }
.market-config__header,.market-config__cards article header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.market-config__question-actions { display: flex; gap: 8px; }
.market-config__header h2 { display: flex; align-items: center; gap: 10px; margin: 0; font-size: var(--font-size-section-title); }
.market-config__count { padding: 4px 10px; border-radius: 999px; color: var(--status-success-foreground); background: var(--status-success-background); font-size: 12px; line-height: 18px; font-weight: 650; }
.market-config__header p { margin: 6px 0 0; color: var(--text-muted); }
.market-config__facts,.market-config__cards dl { display: grid; grid-template-columns: repeat(auto-fit,minmax(180px,1fr)); gap: 12px; margin: 0; }
.market-config__facts { align-items: start; }
.market-config__facts div,.market-config__cards article { display: grid; gap: 8px; padding: 14px; border: 1px solid var(--border-default); border-radius: 12px; background: var(--background-subtle); }
.market-config dt { color: var(--text-muted); font-size: 12px; }
.market-config dd { margin: 0; overflow-wrap: anywhere; }
.market-config__split { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 14px; }
.market-config__split section { min-width: 0; padding: 16px; border: 1px solid var(--border-default); border-radius: 12px; }
.market-config h3 { margin: 0 0 12px; font-size: 15px; }
.market-config ul,.market-config ol { display: grid; gap: 10px; margin: 0; padding-left: 22px; }
.market-config li { padding: 0 0 10px; border-bottom: 1px solid var(--border-divider); }
.market-config li:last-child { border-bottom: 0; }
.market-config li strong,.market-config li span,.market-config li small { display: block; overflow-wrap: anywhere; }
.market-config li span,.market-config li small { margin-top: 4px; color: var(--text-secondary); font-size: 13px; }
.market-config__persona-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; }
.market-config__persona-grid article { display: grid; min-height: 126px; align-content: start; gap: 16px; padding: 16px; border: 1px solid color-mix(in srgb, var(--action-accent) 14%, var(--border-default)); border-radius: 12px; background: linear-gradient(145deg, var(--background-primary), color-mix(in srgb, var(--action-subtle-background) 28%, var(--background-primary))); box-shadow: 0 2px 8px rgb(38 59 90 / 4%); }
.market-config__persona-card-header { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.market-config__persona-name { margin: 0 !important; color: var(--text-primary); font-size: 15px !important; font-weight: 650; }
.market-config__persona-stage { display: flex; align-items: center; gap: 8px; color: var(--text-muted); font-size: 12px; }
.market-config__persona-stage strong { padding: 4px 9px; border-radius: 999px; color: var(--action-accent); background: var(--action-subtle-background); font-size: 12px; font-weight: 650; }
.market-config__questions { min-width: 0; }
.market-config__questions :deep(.data-list__panel) { border: 1px solid var(--border-default); border-radius: 10px; }
.market-config__questions :deep(.data-list__scroll) { border-radius: 10px; }
.market-config__questions :deep(thead) { background: var(--background-secondary); }
.market-config__question { display: flex; align-items: flex-start; gap: 8px; min-width: 0; color: var(--text-primary); line-height: 1.5; }
.market-config__question-id { flex: 0 0 auto; color: var(--text-muted); font-size: 12px; font-weight: 700; }
.market-config__cards article header { align-items: center; }
.market-config__cards article header span { color: var(--text-muted); font-size: 12px; }
.market-config__cards dl { grid-template-columns: minmax(90px,.45fr) minmax(0,1fr); gap: 7px 12px; }
.market-config__state,.market-config__error { margin: 0; padding: 14px; border-radius: 10px; color: var(--text-secondary); background: var(--background-subtle); }
.market-config__state[role="status"] { display: flex; min-height: 64px; align-items: center; justify-content: center; --spinner-color: var(--action-accent); }
.market-config__error { color: var(--status-error-foreground); background: var(--status-error-background); }
@media (max-width: 700px) { .market-config__split { grid-template-columns: 1fr; } .market-config__persona-grid { grid-template-columns: 1fr; } .market-config__header { align-items: flex-start; flex-direction: column; } .market-config__question-actions { flex-wrap: wrap; } }
</style>

