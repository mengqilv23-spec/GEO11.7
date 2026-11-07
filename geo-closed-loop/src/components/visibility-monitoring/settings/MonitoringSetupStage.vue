<script setup lang="ts">
import type { MonitoringQuestion } from '../../../data/visibility-monitoring-data'
import type { BuyerPersona, KnowledgeItem } from '../../../types'
import type { DropdownSelectOption } from '../../ui/ce'
import type { MarketRecommendationState } from './brand-knowledge-update/types'
import type { KnowledgeEditorTab } from './CurrentBrandKnowledge.vue'
import { computed, ref, shallowRef } from 'vue'
import { purchaseStageOptions } from '../../onboarding/buyer-persona/buyer-persona-options'
import BuyerPersonaEditorDialog from '../../onboarding/buyer-persona/BuyerPersonaEditorDialog.vue'
import OnboardingHelp from '../../onboarding/shared/OnboardingHelp.vue'
import { Button } from '../../ui/ce'
import AddMonitoringQuestionDialog from '../questions/AddMonitoringQuestionDialog.vue'
import BulkMonitoringQuestionsDialog from '../questions/BulkMonitoringQuestionsDialog.vue'
import MarketRecommendationEditor from './brand-knowledge-update/MarketRecommendationEditor.vue'
import CurrentBrandKnowledge from './CurrentBrandKnowledge.vue'

const props = defineProps<{
  stage: 1 | 2 | 3
  activePersonaCount: number
  questionCount: number
  market: string
  questions: readonly MonitoringQuestion[]
  knowledgeItems: readonly KnowledgeItem[]
  recommendationMarket?: MarketRecommendationState | null
  recommendationSelectedIds?: string[]
  recommendationPending?: boolean
}>()

const emit = defineEmits<{
  editKnowledge: [tab: KnowledgeEditorTab]
  viewKnowledge: [tab: KnowledgeEditorTab]
  reviewCandidates: []
  pauseMonitoring: []
  updateRecommendationSelection: [ids: string[]]
  saveRecommendationSelection: [ids: string[]]
  returnToMarketList: []
}>()

const currentQuestions = ref<MonitoringQuestion[]>([...props.questions])
const addQuestionDialogOpen = ref(false)
const bulkEditOpen = ref(false)
const personaDialogOpen = ref(false)
const personaDialogMode = shallowRef<'edit' | 'view'>('edit')
const personaTypeOptions: DropdownSelectOption[] = [
  { value: 'composites-engineering', label: '复材加工技术主管' },
  { value: 'aviation-procurement', label: '航空部件采购经理' },
  { value: 'workshop-supervisor', label: '精密加工车间主管' },
  { value: 'japan-trading-company', label: '商社设备采购担当' },
  { value: 'automotive-tier-one', label: '汽车 Tier-1 工艺工程师' },
  { value: 'composites-startup', label: '航空复材项目负责人' },
]
const personaCards = ref<BuyerPersona[]>([
  { id: 'monitor-persona-1', type: 'composites-engineering', purchaseStage: 'supplier-evaluation', actualRole: '', industry: '', companySize: '', decisionRole: '', purchaseTrigger: '', purchaseBudget: '', purchaseCycle: '', discoveryChannel: '' },
  { id: 'monitor-persona-2', type: 'aviation-procurement', purchaseStage: 'supplier-evaluation', actualRole: '', industry: '', companySize: '', decisionRole: '', purchaseTrigger: '', purchaseBudget: '', purchaseCycle: '', discoveryChannel: '' },
  { id: 'monitor-persona-3', type: 'workshop-supervisor', purchaseStage: 'solution-search', actualRole: '', industry: '', companySize: '', decisionRole: '', purchaseTrigger: '', purchaseBudget: '', purchaseCycle: '', discoveryChannel: '' },
  { id: 'monitor-persona-4', type: 'japan-trading-company', purchaseStage: 'supplier-evaluation', actualRole: '', industry: '', companySize: '', decisionRole: '', purchaseTrigger: '', purchaseBudget: '', purchaseCycle: '', discoveryChannel: '' },
  { id: 'monitor-persona-5', type: 'automotive-tier-one', purchaseStage: 'supplier-evaluation', actualRole: '', industry: '', companySize: '', decisionRole: '', purchaseTrigger: '', purchaseBudget: '', purchaseCycle: '', discoveryChannel: '' },
  { id: 'monitor-persona-6', type: 'composites-startup', purchaseStage: 'supplier-evaluation', actualRole: '', industry: '', companySize: '', decisionRole: '', purchaseTrigger: '', purchaseBudget: '', purchaseCycle: '', discoveryChannel: '' },
])
const personaCount = computed(() => personaCards.value.length)
const currentQuestionCount = computed(() => props.questionCount + currentQuestions.value.length - props.questions.length)

function addQuestion(question: MonitoringQuestion) {
  currentQuestions.value.push(question)
}

function saveQuestions(questions: MonitoringQuestion[]) {
  currentQuestions.value = questions
}

function savePersonas(personas: BuyerPersona[]) {
  personaCards.value = personas
}

function personaName(type: string) {
  return personaTypeOptions.find(option => option.value === type)?.label ?? type
}

function stageName(stage: string) {
  return purchaseStageOptions.find(option => option.value === stage)?.label ?? stage
}

function openPersonaDialog(mode: 'edit' | 'view') {
  personaDialogMode.value = mode
  personaDialogOpen.value = true
}

const setupTitles = {
  1: '品牌知识',
  2: '买家人设',
  3: '监测问题',
} as const

const questionOptions = computed<Record<'type' | 'persona' | 'purchaseStage' | 'intent' | 'mainConcern', DropdownSelectOption[]>>(() => ({
  type: [...new Set(currentQuestions.value.map(question => question.type))].map(value => ({ value, label: value })),
  persona: personaCards.value.map(persona => ({ value: personaName(persona.type), label: personaName(persona.type) })),
  purchaseStage: [...new Set(currentQuestions.value.map(question => question.stage))].map(value => ({ value, label: value })),
  intent: [...new Set(currentQuestions.value.map(question => question.intent))].map(value => ({ value, label: value })),
  mainConcern: [...new Set(currentQuestions.value.map(question => question.concern))].map(value => ({ value, label: value })),
}))
</script>

<template>
  <section :id="`visibility-stage-${stage}`" class="vm-setup-stage vm-card" :class="`vm-setup-stage--${stage === 1 ? 'brand' : stage === 2 ? 'personas' : 'questions'}`" role="tabpanel" :aria-labelledby="`visibility-step-${stage}`">
    <header v-if="stage !== 1 && stage !== 2" class="vm-setup-stage__heading">
      <div>
        <div class="vm-setup-stage__title-row">
          <h2>{{ setupTitles[stage] }}</h2>
        </div>
      </div>
    </header>

    <template v-if="stage === 1">
      <section class="vm-setup-stage__pending" aria-label="待确认竞品">
        <div class="vm-setup-stage__pending-title">
          <strong>待确认</strong><span>1</span>
        </div>
        <div class="vm-setup-stage__pending-card">
          <div><h3>发现 3 个潜在新竞品候选</h3><p>Flow X、Techni Waterjet、STM · 需查看监测证据后分别确认</p></div>
          <button type="button" @click="emit('reviewCandidates')">
            查看并确认
          </button>
        </div>
      </section>
      <CurrentBrandKnowledge :items="knowledgeItems" @edit="emit('editKnowledge', $event)" @view="emit('viewKnowledge', $event)" />
    </template>

    <template v-else-if="stage === 2">
      <section class="vm-persona-section" aria-label="买家人设">
        <header class="vm-persona-section__header">
          <div class="vm-persona-section__title">
            <h3 id="vm-persona-section-title">
              当前买家人设
            </h3>
            <OnboardingHelp label="当前买家人设说明" :message="`当前 ${personaCount} 类买家人设；每个人设独立维护和累计样本。`" />
          </div>
          <div class="vm-persona-section__actions">
            <Button class="vm-persona-manage" variant="outline" @click="openPersonaDialog('edit')">
              维护买家人设
            </Button>
            <span class="vm-persona-section__count">{{ personaCount }} 类</span>
          </div>
        </header>

        <div class="vm-persona-grid">
          <article v-for="(persona, index) in personaCards" :key="persona.id" class="vm-persona-card">
            <header class="vm-persona-card__header">
              <div class="vm-persona-card__name">
                <span class="vm-persona-card__index">{{ String(index + 1).padStart(2, '0') }}</span>
                <h4>{{ personaName(persona.type) }}</h4>
              </div>
            </header>
            <div class="vm-persona-card__stage">
              <span>采购阶段</span><strong class="vm-persona-card__stage-tag">{{ stageName(persona.purchaseStage) }}</strong>
            </div>
            <Button class="vm-persona-card__view" variant="outline" @click="openPersonaDialog('view')">
              查看
            </Button>
          </article>
        </div>
      </section>
      <BuyerPersonaEditorDialog v-model:open="personaDialogOpen" :personas="personaCards" :mode="personaDialogMode" :type-options="personaTypeOptions" @saved="savePersonas" />
    </template>

    <template v-else>
      <MarketRecommendationEditor
        v-if="recommendationMarket"
        :market="recommendationMarket"
        :selected-ids="recommendationSelectedIds ?? []"
        :pending="recommendationPending ?? false"
        @update:selected-ids="emit('updateRecommendationSelection', $event)"
        @save="emit('saveRecommendationSelection', $event)"
        @return-to-markets="emit('returnToMarketList')"
      />
      <template v-else>
        <section class="vm-question-panel" aria-labelledby="vm-question-panel-title">
          <header class="vm-question-panel__heading">
            <div class="vm-question-panel__title">
              <h3 id="vm-question-panel-title">
                当前监测问题
              </h3>
              <OnboardingHelp label="当前监测问题说明" message="当前监测问题集；手动添加的问题将在下一次监测生效。" />
              <span class="vm-question-count">{{ currentQuestionCount }} 条</span>
            </div>
            <div class="vm-question-panel__actions">
              <Button class="vm-question-edit" variant="outline" @click="bulkEditOpen = true">
                编辑全部问题
              </Button>
              <Button class="vm-question-add" variant="outline" @click="addQuestionDialogOpen = true">
                添加监测问题
              </Button>
            </div>
          </header>

          <div class="vm-setup-stage__table-scroll" tabindex="0" aria-label="监测问题列表，可横向滚动">
            <table>
              <thead>
                <tr>
                  <th scope="col">
                    问题
                  </th>
                  <th scope="col">
                    关键词
                  </th>
                  <th scope="col">
                    类型
                  </th>
                  <th scope="col">
                    买家人设
                  </th>
                  <th scope="col">
                    采购阶段
                  </th>
                  <th scope="col">
                    意图
                  </th>
                  <th scope="col">
                    主要关注问题
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="question in currentQuestions" :key="question.id">
                  <th scope="row">
                    <span class="vm-setup-stage__question-id">{{ question.id }}</span>{{ question.question }}
                  </th>
                  <td>{{ question.keyword }}</td>
                  <td>{{ question.type }}</td>
                  <td>{{ question.persona }}</td>
                  <td>{{ question.stage }}</td>
                  <td>{{ question.intent }}</td>
                  <td>{{ question.concern }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="vm-question-footnote">
            新增后，从下一次监测开始生效
          </p>
        </section>

        <AddMonitoringQuestionDialog v-model:open="addQuestionDialogOpen" :options="questionOptions" @added="addQuestion" />
        <BulkMonitoringQuestionsDialog v-model:open="bulkEditOpen" :questions="currentQuestions" :market="market" :question-count="currentQuestionCount" :options="questionOptions" @saved="saveQuestions" @pause-market="emit('pauseMonitoring')" />
      </template>
    </template>
  </section>
</template>

<style scoped>
.vm-card { min-width: 0; padding: 16px; border: 1px solid var(--border-default); border-radius: 14px; background: var(--background-primary); }
.vm-setup-stage__heading, .vm-setup-stage__pending-title, .vm-setup-stage__pending-card, .vm-setup-stage__question-meta { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.vm-setup-stage__title-row { display: flex; align-items: center; gap: 8px; }
.vm-setup-stage__heading { margin-bottom: 16px; }
.vm-setup-stage__heading h2, .vm-setup-stage__question-meta h3 { margin: 0; color: var(--text-primary); font-size: var(--font-size-section-title); line-height: 24px; }
.vm-setup-stage__heading p, .vm-setup-stage__question-meta p { margin: 4px 0 0; color: var(--text-muted); }
.vm-setup-stage__pending { margin-bottom: 16px; padding: 12px; border: 1px solid var(--status-warning-border); border-radius: 12px; background: var(--status-warning-background); }
.vm-setup-stage__pending-title { justify-content: flex-start; margin-bottom: 10px; color: var(--status-warning-foreground); font-weight: 700; }
.vm-setup-stage__pending-title span { display: grid; width: 22px; height: 22px; place-items: center; border-radius: 50%; background: color-mix(in srgb, var(--status-warning-foreground) 10%, transparent); }
.vm-setup-stage__pending-card { padding: 12px; border: 1px solid var(--status-warning-border); border-radius: 10px; background: var(--background-primary); }
.vm-setup-stage__pending-card h3 { margin: 0; font-size: 14px; line-height: 20px; }
.vm-setup-stage__pending-card p { margin: 4px 0 0; color: var(--text-secondary); font-size: var(--font-size-body); line-height: var(--line-height-body); }
.vm-setup-stage__pending-card button { flex: 0 0 auto; min-height: 34px; padding: 5px 11px; border: 0; border-radius: var(--radius-control); color: var(--text-on-accent, #fff); background: var(--action-accent); font: inherit; font-size: var(--font-size-body); font-weight: 600; cursor: pointer; }
.vm-question-confirmed { margin-bottom: 16px; padding: 12px; border: 1px solid var(--status-warning-border); border-radius: 12px; color: var(--status-warning-foreground); background: var(--status-warning-background); }
.vm-question-confirmed__heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; font-size: var(--font-size-body); line-height: var(--line-height-body); }
.vm-question-confirmed__item { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px; border: 1px solid var(--status-warning-border); border-radius: 10px; background: var(--background-primary); }
.vm-question-confirmed__item h3 { margin: 0; color: var(--text-primary); font-size: 14px; line-height: 20px; }
.vm-question-confirmed__item p { margin: 4px 0 0; color: var(--text-secondary); font-size: var(--font-size-body); line-height: var(--line-height-body); }
.vm-question-confirmed__item > span { flex: 0 0 auto; color: var(--status-success-foreground); font-size: 12px; font-weight: 600; }
.vm-question-confirmed__empty { margin: 10px 0 0; color: var(--status-success-foreground); font-size: 12px; }
.vm-question-panel { min-width: 0; padding: 16px; border: 1px solid var(--border-default); border-radius: 12px; background: var(--background-primary); }
.vm-question-panel__heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
.vm-question-panel__title { display: flex; align-items: center; gap: 8px; }
.vm-question-panel__title h3 { margin: 0; color: var(--text-primary); font-size: 16px; line-height: 24px; }
.vm-question-count { padding: 4px 10px; border-radius: 999px; color: var(--status-success-foreground); background: var(--status-success-background); font-size: 12px; font-weight: 700; }
.vm-persona-section { min-width: 0; padding: 16px; border: 1px solid var(--border-default); border-radius: 12px; background: var(--background-primary); }
.vm-persona-section__header, .vm-persona-section__title, .vm-persona-card__header, .vm-persona-card__name, .vm-persona-section__actions { display: flex; align-items: center; }
.vm-persona-section__header, .vm-persona-card__header { justify-content: space-between; gap: 12px; }
.vm-persona-section__actions { gap: 12px; }
.vm-persona-section__title { gap: 8px; }
.vm-persona-section__title h3 { margin: 0; color: var(--text-primary); font-size: 16px; line-height: 24px; }
.vm-persona-section__count { flex: 0 0 auto; padding: 4px 10px; border-radius: 999px; color: var(--status-success-foreground); background: var(--status-success-background); font-size: 12px; font-weight: 700; }
.vm-persona-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 14px; }
.vm-persona-card { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-content: start; align-items: center; gap: 14px 16px; min-width: 0; padding: 16px; border: 1px solid var(--border-default); border-radius: 10px; background: var(--background-primary); }
.vm-persona-card__header { grid-column: 1 / -1; justify-content: flex-start; }
.vm-persona-card__name { min-width: 0; gap: 10px; }
.vm-persona-card__index { display: inline-grid; flex: 0 0 auto; min-width: 30px; height: 30px; place-items: center; padding: 0 6px; border-radius: 8px; color: var(--action-accent); background: var(--action-subtle-background); font-family: var(--font-family-mono); font-size: 12px; font-weight: 700; }
.vm-persona-card__name h4 { min-width: 0; margin: 0; color: var(--text-primary); font-size: 15px; line-height: 22px; }
.vm-persona-card__stage { display: flex; align-items: center; gap: 10px; color: var(--text-muted); font-size: var(--font-size-caption); line-height: var(--line-height-caption); }
.vm-persona-card__stage-tag { padding: 3px 8px; border: 0; border-radius: 999px; color: var(--action-accent); background: color-mix(in srgb, var(--action-accent) 9%, var(--background-primary)); font-size: 12px; font-weight: 600; }
.vm-persona-card__view { justify-self: start; }
.vm-persona-details { display: flex; align-items: center; gap: 12px; color: var(--text-muted); }
.vm-persona-details strong { color: var(--text-primary); }
.vm-question-panel__actions { display: flex; align-items: center; gap: 12px; }
.vm-question-footnote { margin: 12px 0 0; color: var(--text-muted); font-size: 12px; }
.vm-setup-stage__table-scroll { overflow-x: auto; border: 1px solid var(--border-default); border-radius: 10px; }
.vm-setup-stage table { width: 100%; min-width: 1100px; border-collapse: collapse; text-align: left; }
.vm-setup-stage th, .vm-setup-stage td { padding: 12px 10px; border-bottom: 1px solid var(--border-divider); vertical-align: middle; }
.vm-setup-stage thead th { color: var(--text-secondary); background: var(--background-secondary); font-size: 12px; white-space: nowrap; }
.vm-setup-stage tbody th { min-width: 350px; color: var(--text-primary); font-size: var(--font-size-body); line-height: var(--line-height-body); font-weight: 500; }
.vm-setup-stage tbody td { color: var(--text-secondary); font-size: 12px; white-space: nowrap; }
.vm-setup-stage__question-id { margin-right: 8px; color: var(--text-muted); font-weight: 700; white-space: nowrap; }
@media (max-width: 720px) { .vm-setup-stage { padding: 16px; } .vm-persona-section, .vm-question-panel { padding: 12px; } .vm-persona-grid { grid-template-columns: 1fr; } .vm-persona-card { padding: 12px; } .vm-setup-stage__pending-card { align-items: flex-start; flex-direction: column; } .vm-question-panel__heading, .vm-persona-section__header { align-items: flex-start; flex-direction: column; } .vm-question-panel__actions { width: 100%; flex-wrap: wrap; } }
</style>

