<script setup lang="ts">
import type { DropdownSelectOption } from '../components/ui/ce/dropdown-select/types'
import type { KnowledgeEditorTab } from '../components/visibility-monitoring/settings/CurrentBrandKnowledge.vue'
import type { MonitoringQuestion, SamplingFrequency, VisibilityTab } from '../data/visibility-monitoring-data'
import type { BuyerPersona, KnowledgeItem } from '../types'
import { computed, onMounted, ref, shallowRef } from 'vue'
import { addPersona, addQuestion, deleteBrandProduct, deleteCompetitor, deletePersona, getActivePlan, getDictionary, getMarkets, saveBrandInfo, updatePersona, updateQuestion } from '../api/geo-config'
import { triggerRound } from '../api/monitoring'
import KnowledgeEditorDialog from '../components/onboarding/knowledge/KnowledgeEditorDialog.vue'
import KnowledgeViewDialog from '../components/onboarding/knowledge/KnowledgeViewDialog.vue'
import { defaultMonitoringPlatformsForPlan, frequencyForPlan } from '../components/onboarding/monitoring-plan/monitoring-plan'
import { Button, Modal } from '../components/ui/ce'
import Spinner from '../components/ui/ce/spinner/Spinner.vue'
import MonitoringOverview from '../components/visibility-monitoring/analysis/MonitoringOverview.vue'
import ReferenceMonitoringResults from '../components/visibility-monitoring/analysis/ReferenceMonitoringResults.vue'
import PotentialCompetitorReviewDialog from '../components/visibility-monitoring/analysis/PotentialCompetitorReviewDialog.vue'
import SamplingTrustSection from '../components/visibility-monitoring/sampling/SamplingTrustSection.vue'
import MarketConfigurationPanel from '../components/visibility-monitoring/settings/MarketConfigurationPanel.vue'
import MonitoringProcessNav from '../components/visibility-monitoring/settings/MonitoringProcessNav.vue'
import MonitoringSettingsDialog from '../components/visibility-monitoring/settings/MonitoringSettingsDialog.vue'
import GeoPageIntro from '../components/workbench/shared/GeoPageIntro.vue'
import { useMarketConfiguration } from '../composables/use-market-configuration'
import { useMonitoringPlatforms } from '../composables/use-monitoring-platforms'
import { useMonitoringRound } from '../composables/use-monitoring-round'
import { useWorkbenchTasksStore } from '../stores/workbench-tasks'
import { expireUnsubmittedWebsiteTasks } from '../workflows/task-workflow'
import { useMonitoringSchedule } from '../composables/use-monitoring-schedule'
import { marketLanguageLabels, toMonitoringOverviewMetrics } from '../data/monitoring-overview-summary'
import { referenceMonitoringResults } from '../data/reference-monitoring-results'
import { useGeoContextStore } from '../stores/geo-context'
import { startDataProcessing } from '../workflows/data-processing'

const activeTab = shallowRef<VisibilityTab>('brand')
const activeStep = shallowRef(5)
const monitoringSchedule = useMonitoringSchedule()
const monitoringPlatforms = useMonitoringPlatforms()
const monitoringRound = useMonitoringRound()
const marketConfiguration = useMarketConfiguration()
const geoContext = useGeoContextStore()
const marketConfigurationLoaded = shallowRef(false)
const roundTriggerPending = ref(false)
const roundTriggerError = ref('')
const workbenchTasks = useWorkbenchTasksStore()
const marketLanguage = shallowRef({ market: '', language: '' })
const marketLabel = computed(() => [marketLanguage.value.market, marketLanguage.value.language].filter(Boolean).join(' / '))
const brandKnowledgeEditorOpen = shallowRef(false)
const brandKnowledgeViewerOpen = shallowRef(false)
const competitorReviewOpen = shallowRef(false)
const brandKnowledgeTab = shallowRef<KnowledgeEditorTab>('brand')
const personaTypeOptions = shallowRef<DropdownSelectOption[]>([])
const purchaseStageOptions = shallowRef<DropdownSelectOption[]>([])
const companyScaleOptions = shallowRef<DropdownSelectOption[]>([])
const decisionRoleOptions = shallowRef<DropdownSelectOption[]>([])
const monitoringEnabled = computed(() => monitoringSchedule.enabled.value)
const monitoringStatusText = computed(() => {
  if (monitoringSchedule.loading.value)
    return '读取中'
  if (monitoringSchedule.error.value)
    return '状态读取失败'
  return monitoringSchedule.schedule.value ? (monitoringEnabled.value ? '进行中' : '已暂停') : '未配置'
})
const overviewStats = computed(() => toMonitoringOverviewMetrics({
  market: marketLabel.value,
  personas: !marketConfigurationLoaded.value || marketConfiguration.errors.value.personas ? null : marketConfiguration.personas.value,
  questions: !marketConfigurationLoaded.value || marketConfiguration.errors.value.questions ? null : marketConfiguration.questions.value,
  themes: !marketConfigurationLoaded.value || marketConfiguration.errors.value.themes ? null : marketConfiguration.themes.value,
  platforms: !marketConfigurationLoaded.value || marketConfiguration.errors.value.platforms ? null : marketConfiguration.platforms.value,
  totalSample: monitoringRound.detail.value?.totalSample,
}))
const settingsOpen = shallowRef(false)
const frequencyChoice = shallowRef<SamplingFrequency>('weekly')
const executionTime = shallowRef<string>('05:00')
const activePlanName = shallowRef('')
const activePlanCode = shallowRef('')
const settingsError = shallowRef('')
const enableConfirmationOpen = shallowRef(false)
const setupTabs = [
  { id: 1, label: '品牌知识' },
  { id: 2, label: '买家人设' },
  { id: 3, label: '监测问题' },
] as const
const tabs: Array<{ id: VisibilityTab, label: string }> = [
  { id: 'brand', label: '品牌提及分析' },
  { id: 'questions', label: '问答命中明细' },
  { id: 'sources', label: '信源域名追踪' },
]
const setupStage = computed(() => activeStep.value as 1 | 2 | 3)
const brandKnowledgeItems = computed<KnowledgeItem[]>(() => [
  {
    id: 'brand',
    index: '01',
    title: '品牌信息',
    summary: '',
    requirements: '',
    brand: {
      name: marketConfiguration.brand.value?.brandName ?? '',
      alias: marketConfiguration.brand.value?.aliasNames ?? '',
      website: marketConfiguration.brand.value?.siteUrl ?? '',
      industry: marketConfiguration.brand.value?.industry ?? '',
      description: marketConfiguration.brand.value?.positioning ?? '',
    },
  },
  {
    id: 'product',
    index: '02',
    title: '核心产品',
    summary: '',
    requirements: '',
    products: marketConfiguration.products.value.map((product, index) => ({
      id: product.id === null ? `product-${index + 1}` : String(product.id),
      name: product.productName || product.lineName,
      useCase: product.usageScene,
      strengths: product.sellingPoints?.join(' · ') ?? '',
      customerGroup: product.targetCustomers?.join(' · ') ?? '',
      isPrimary: product.isPrimary === 1,
    })),
  },
  {
    id: 'market',
    index: '03',
    title: '市场与语言',
    summary: '',
    requirements: '',
    marketLanguage: { ...marketLanguage.value },
  },
  {
    id: 'competitor',
    index: '04',
    title: '竞争对手',
    summary: '',
    requirements: '',
    competitors: marketConfiguration.competitors.value.map((competitor, index) => ({
      id: competitor.id === null ? `competitor-${index + 1}` : String(competitor.id),
      name: competitor.competitorName,
      domain: competitor.domain ?? '',
      alias: competitor.aliasNames ?? '',
      description: competitor.competitorDesc ?? '',
      confirmed: competitor.status === 1,
    })),
  },
])
const pendingCompetitorNames = computed(() => marketConfiguration.competitorRecommendations.value.flatMap((recommendation) => {
  try {
    const payload: unknown = JSON.parse(recommendation.itemPayload)
    if (!payload || typeof payload !== 'object')
      return []
    const candidate = payload as Record<string, unknown>
    const name = typeof candidate.competitorName === 'string' ? candidate.competitorName : typeof candidate.name === 'string' ? candidate.name : ''
    return name ? [name] : []
  }
  catch {
    return []
  }
}))
onMounted(() => {
  void loadMarketLabel()
  void loadPersonaDictionaries()
  void Promise.allSettled([getActivePlan(), monitoringSchedule.load()]).then(([planResult]) => {
    if (planResult.status === 'fulfilled') {
      activePlanName.value = planResult.value.quota.planName
      activePlanCode.value = planResult.value.quota.planCode
    }
    const schedule = monitoringSchedule.schedule.value
    if (schedule)
      executionTime.value = schedule.executeTime
    frequencyChoice.value = frequencyForPlan(activePlanCode.value, activePlanName.value, schedule?.scheduleType ?? 'weekly')
  })
  void monitoringRound.load()
  void monitoringPlatforms.load()
  void marketConfiguration.load().finally(() => marketConfigurationLoaded.value = true)
})
async function loadMarketLabel() {
  const [marketsResult, countriesResult, languagesResult] = await Promise.allSettled([
    getMarkets(),
    getDictionary('country'),
    getDictionary('language'),
  ])
  marketLanguage.value = marketLanguageLabels(
    geoContext.marketId,
    marketsResult.status === 'fulfilled' ? marketsResult.value : null,
    countriesResult.status === 'fulfilled' ? countriesResult.value : null,
    languagesResult.status === 'fulfilled' ? languagesResult.value : null,
  )
}
async function loadPersonaDictionaries() {
  const dictionaryNames = ['persona_type', 'purchase_stage', 'company_scale', 'decision_role'] as const
  const results = await Promise.allSettled(dictionaryNames.map(name => getDictionary(name)))
  const options = results.map(result => result.status === 'fulfilled'
    ? result.value.map(item => ({ value: item.dictValue, label: item.dictLabel }))
    : [])
  personaTypeOptions.value = options[0] ?? []
  purchaseStageOptions.value = options[1] ?? []
  companyScaleOptions.value = options[2] ?? []
  decisionRoleOptions.value = options[3] ?? []
}
async function addCurrentMonitoringQuestion(question: MonitoringQuestion) {
  const persona = marketConfiguration.personas.value.find(item => item.personaName === question.persona)
  if (!persona)
    return
  await addQuestion({ questionContent: question.question, keyword: question.keyword, questionType: question.type, personaId: persona.id, purchaseStage: question.stage, intentType: question.intent, focusType: question.concern })
  await marketConfiguration.load()
}
async function updateCurrentMonitoringQuestions(questions: MonitoringQuestion[]) {
  const saved = await Promise.allSettled(questions.map((question) => {
    const id = Number(question.id.match(/\d+/)?.[0])
    const persona = marketConfiguration.personas.value.find(item => item.personaName === question.persona)
    if (!Number.isFinite(id) || !persona)
      return Promise.reject(new Error('问题编号或买家人设无效'))
    return updateQuestion(id, { questionContent: question.question, keyword: question.keyword, questionType: question.type, personaId: persona.id, purchaseStage: question.stage, intentType: question.intent, focusType: question.concern })
  }))
  if (saved.some(result => result.status === 'rejected'))
    return
  await marketConfiguration.load()
}
function openKnowledgeEditor(tab: KnowledgeEditorTab) {
  brandKnowledgeTab.value = tab
  brandKnowledgeEditorOpen.value = true
}
function openKnowledgeViewer(tab: KnowledgeEditorTab) {
  brandKnowledgeTab.value = tab
  brandKnowledgeViewerOpen.value = true
}
async function saveBrandKnowledge(items: KnowledgeItem[]) {
  const brand = items.find(item => item.id === 'brand')?.brand
  if (!brand)
    throw new Error('品牌资料缺失')
  await saveBrandInfo({ brandName: brand.name, industry: brand.industry, aliasNames: brand.alias, positioning: brand.description })
  await marketConfiguration.load()
}
async function removeBrandProduct(id: string) {
  await deleteBrandProduct(Number(id))
  await marketConfiguration.load()
}
async function removeMarketCompetitor(id: string) {
  await deleteCompetitor(Number(id))
  await marketConfiguration.load()
}
async function persistMarketPersonas(personas: BuyerPersona[]) {
  const current = new Map(marketConfiguration.personas.value.map(persona => [String(persona.id), persona]))
  const next = new Map(personas.map(persona => [persona.id, persona]))
  try {
    for (const [id, existing] of current) {
      if (!next.has(id))
        await deletePersona(existing.id)
    }
    for (const persona of personas) {
      const existing = current.get(persona.id)
      const payload = {
        personaName: personaTypeOptions.value.find(option => option.value === persona.type)?.label ?? existing?.personaName ?? persona.type,
        personaType: persona.type,
        actualPosition: persona.actualRole || undefined,
        industry: persona.industry || undefined,
        companyScale: persona.companySize || undefined,
        decisionRole: persona.decisionRole || undefined,
        purchaseTrigger: persona.purchaseTrigger || undefined,
        purchaseBudget: persona.purchaseBudget || undefined,
        purchaseCycle: persona.purchaseCycle || undefined,
        infoChannels: persona.discoveryChannel || undefined,
        purchaseStages: persona.purchaseStage
          ? existing?.purchaseStages?.[0] === persona.purchaseStage ? existing.purchaseStages : [persona.purchaseStage]
          : [],
      }
      if (existing) {
        const changed = existing.personaName !== payload.personaName
          || existing.personaType !== payload.personaType
          || (existing.actualPosition ?? undefined) !== payload.actualPosition
          || (existing.industry ?? undefined) !== payload.industry
          || (existing.companyScale ?? undefined) !== payload.companyScale
          || (existing.decisionRole ?? undefined) !== payload.decisionRole
          || (existing.purchaseTrigger ?? undefined) !== payload.purchaseTrigger
          || (existing.purchaseBudget ?? undefined) !== payload.purchaseBudget
          || (existing.purchaseCycle ?? undefined) !== payload.purchaseCycle
          || (existing.infoChannels ?? undefined) !== payload.infoChannels
          || (existing.purchaseStages ?? []).join('\u0000') !== payload.purchaseStages.join('\u0000')
        if (changed)
          await updatePersona(existing.id, payload)
      }
      else {
        await addPersona(payload)
      }
    }
  }
  catch (cause) {
    await marketConfiguration.load()
    throw cause
  }
  await marketConfiguration.load()
  return personas
}
function refreshBrandKnowledge() {
  void marketConfiguration.load()
}
function refreshCompetitorRecommendations() {
  void marketConfiguration.load()
}
function switchTab(tab: VisibilityTab) {
  activeTab.value = tab
}
const settingsPlatformSelection = computed(() => monitoringPlatforms.selected.value.length
  ? monitoringPlatforms.selected.value
  : defaultMonitoringPlatformsForPlan(activePlanCode.value, activePlanName.value))

async function saveSettings(settings: { frequency: SamplingFrequency, platforms: string[] }) {
  settingsError.value = ''
  const platformsSaved = await monitoringPlatforms.save(settings.platforms)
  if (!platformsSaved) {
    settingsError.value = monitoringPlatforms.error.value || 'AI 平台配置保存失败'
    return
  }
  const scheduleSaved = await monitoringSchedule.save({ scheduleType: frequencyChoice.value, executeTime: executionTime.value })
  if (!scheduleSaved) {
    settingsError.value = monitoringSchedule.error.value || '监测计划保存失败'
    return
  }
  settingsOpen.value = false
}
function toggleMonitoring() {
  if (monitoringEnabled.value) {
    void monitoringSchedule.toggle()
    return
  }
  if (!monitoringSchedule.schedule.value || monitoringSchedule.loading.value || monitoringSchedule.error.value)
    return
  enableConfirmationOpen.value = true
}
async function enableCurrentMarket() {
  if (await monitoringSchedule.toggle())
    enableConfirmationOpen.value = false
}

async function launchManualRound() {
  if (roundTriggerPending.value || monitoringSchedule.loading.value || !monitoringSchedule.schedule.value)
    return
  roundTriggerPending.value = true
  roundTriggerError.value = ''
  try {
    await triggerRound()
    expireUnsubmittedWebsiteTasks(workbenchTasks.tasks)
    startDataProcessing()
    await monitoringRound.load()
  }
  catch (cause) {
    roundTriggerError.value = cause instanceof Error ? cause.message : '监测轮次创建失败'
  }
  finally {
    roundTriggerPending.value = false
  }
}
</script>

<template>
  <div class="geo-page visibility-page">
    <GeoPageIntro variant="visibility" title="可见性监测" help-label="可见性监测说明" description="直接透视品牌在各大生成式 AI 引擎中的曝光度、真实问答证据与主域名信源引用。" />

    <MonitoringOverview :round="monitoringRound.round.value" :detail="monitoringRound.detail.value" :additional-metrics="overviewStats" variant="overview" :show-round-number="true" :monitoring-enabled="monitoringEnabled" :exclusive-actions="true" :status-text="monitoringStatusText" :toggle-disabled="monitoringSchedule.loading.value || !!monitoringSchedule.error.value || !monitoringSchedule.schedule.value" :toggle-pending="monitoringSchedule.pending.value" :trigger-disabled="monitoringSchedule.loading.value || !!monitoringSchedule.error.value || !monitoringSchedule.schedule.value" :trigger-pending="roundTriggerPending" :trigger-error="roundTriggerError" @toggle-monitoring="toggleMonitoring" @trigger-round="launchManualRound" />
    <div v-if="monitoringSchedule.error.value" class="visibility-api-error" role="alert">
      <span>监测计划状态加载失败：{{ monitoringSchedule.error.value }}</span>
      <button type="button" @click="monitoringSchedule.load()">
        重试
      </button>
    </div>
    <MonitoringProcessNav v-model="activeStep" />

    <div v-if="activeStep <= 3" class="visibility-setup-group">
      <nav class="visibility-tabs visibility-tabs--setup" aria-label="监测配置步骤" role="tablist">
        <button v-for="tab in setupTabs" :id="`visibility-setup-tab-${tab.id}`" :key="tab.id" type="button" role="tab" :aria-selected="activeStep === tab.id" :class="{ 'is-active': activeStep === tab.id }" @click="activeStep = tab.id">
          {{ tab.label }}<span v-if="tab.id === 1">1</span>
        </button>
      </nav>

      <MarketConfigurationPanel
        :stage="setupStage"
        :knowledge-items="brandKnowledgeItems"
        :pending-competitor-names="pendingCompetitorNames"
        :personas="marketConfiguration.personas.value"
        :questions="marketConfiguration.questions.value"
        :themes="marketConfiguration.themes.value"
        :persona-type-options="personaTypeOptions"
        :purchase-stage-options="purchaseStageOptions"
        :company-scale-options="companyScaleOptions"
        :decision-role-options="decisionRoleOptions"
        :persist-personas="persistMarketPersonas"
        :loading="marketConfiguration.loading.value"
        :errors="marketConfiguration.errors.value"
        @retry="marketConfiguration.load()"
        @edit-knowledge="openKnowledgeEditor"
        @view-knowledge="openKnowledgeViewer"
        @review-competitors="competitorReviewOpen = true"
        @add-question="addCurrentMonitoringQuestion"
        @update-questions="updateCurrentMonitoringQuestions"
      />
    </div>

    <section v-else-if="activeStep === 4" id="visibility-stage-4" class="visibility-stage-four" role="tabpanel" aria-labelledby="visibility-step-4">
      <SamplingTrustSection :schedule="monitoringSchedule.schedule.value" :round="monitoringRound.detail.value" :cumulative="monitoringRound.cumulativeSampling.value" :question-count="marketConfiguration.questions.value.length" :platform-count="monitoringPlatforms.selected.value.length" :loading="monitoringSchedule.loading.value || monitoringRound.loading.value" :error="monitoringSchedule.error.value || monitoringRound.error.value" @edit-settings="settingsOpen = true" />
    </section>

    <section v-else id="visibility-stage-5" class="visibility-results" role="tabpanel" aria-labelledby="visibility-step-5">
      <nav class="visibility-tabs" aria-label="监测结果分类" role="tablist">
        <button v-for="tab in tabs" :id="`visibility-tab-${tab.id}`" :key="tab.id" type="button" role="tab" :aria-selected="activeTab === tab.id" :aria-controls="`visibility-panel-${tab.id}`" :class="{ 'is-active': activeTab === tab.id }" @click="switchTab(tab.id)">
          {{ tab.label }}<span v-if="tab.id === 'questions'">{{ monitoringRound.round.value ? referenceMonitoringResults.questions.length : 0 }}</span>
        </button>
      </nav>

      <section v-if="monitoringRound.loading.value" class="visibility-api-state" role="status" aria-label="加载监测结果">
        <Spinner variant="ring" aria-hidden="true" />
      </section>
      <section v-else-if="monitoringRound.error.value" class="visibility-api-state is-error" role="alert">
        <span>监测结果加载失败：{{ monitoringRound.error.value }}</span>
        <button type="button" @click="monitoringRound.load()">
          重试
        </button>
      </section>
      <section v-else-if="monitoringRound.empty.value" class="visibility-api-state" role="status">
        当前市场暂无监测轮次，完成首轮采集后此处会显示真实结果。
      </section>
      <ReferenceMonitoringResults
        v-else-if="monitoringRound.round.value"
        :key="geoContext.marketId ?? 'default'"
        :active-tab="activeTab"
      />
    </section>

    <MonitoringSettingsDialog :open="settingsOpen" :frequency="frequencyChoice" :selected-platforms="settingsPlatformSelection" :plan-name="activePlanName" :saving="monitoringPlatforms.saving.value || monitoringSchedule.saving.value" :error="settingsError || monitoringPlatforms.error.value" @close="settingsOpen = false" @save="saveSettings" />
    <KnowledgeEditorDialog
      v-model:open="brandKnowledgeEditorOpen"
      :items="brandKnowledgeItems"
      :initial-tab="brandKnowledgeTab"
      footer-mode="brand-only"
      read-only-market
      persist-products
      persist-competitors
      :delete-product="removeBrandProduct"
      :delete-competitor="removeMarketCompetitor"
      :persist-knowledge="saveBrandKnowledge"
      @product-saved="refreshBrandKnowledge"
      @product-accepted="refreshBrandKnowledge"
      @competitor-saved="refreshBrandKnowledge"
      @competitor-accepted="refreshBrandKnowledge"
    />
    <KnowledgeViewDialog v-model:open="brandKnowledgeViewerOpen" :items="brandKnowledgeItems" :initial-tab="brandKnowledgeTab" />
    <PotentialCompetitorReviewDialog
      v-model:open="competitorReviewOpen"
      :candidates="marketConfiguration.competitorRecommendations.value"
      :questions="marketConfiguration.questions.value"
      @resolved="refreshCompetitorRecommendations"
    />
    <Modal v-model:open="enableConfirmationOpen" title="开启当前市场？" width="min(760px, calc(100vw - 32px))" confirm-text="开启当前市场" cancel-text="暂不开启" processing-text="开启中…" close-label="关闭开启确认" :footer="undefined">
      <p class="vm-enable-copy">
        开启后按原定采集计划运行，历史数据与报告保留。
      </p>
      <template #footer>
        <Button class="vm-market-enable-cancel" variant="outline" @click="enableConfirmationOpen = false">
          暂不开启
        </Button>
        <Button class="vm-market-enable-confirm" variant="primary" @click="enableCurrentMarket">
          开启当前市场
        </Button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.visibility-page { display: grid; min-width: 0; align-content: start; gap: 16px; padding: 0; font-size: var(--font-size-body); line-height: var(--line-height-body); }
.visibility-tabs { display: flex; gap: 4px; margin: 0; border-bottom: 1px solid var(--border-default); }
.visibility-setup-group { display: grid; min-width: 0; gap: 0; overflow: hidden; border: 1px solid var(--border-default); border-radius: 16px; background: var(--background-primary); }
.visibility-tabs button { display: inline-flex; align-items: center; gap: 8px; min-height: 40px; padding: 6px 14px; color: var(--text-secondary); background: transparent; border: 0; border-bottom: 2px solid transparent; font: inherit; font-weight: 600; cursor: pointer; }
.visibility-tabs button.is-active { color: var(--action-accent); background: var(--background-primary); border-color: var(--action-accent); }
.visibility-tabs button span { display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 5px; color: var(--text-secondary); background: var(--background-subtle); border-radius: 999px; font-size: 11px; }
.visibility-tabs--setup { align-items: stretch; gap: 20px; padding: 0 16px; border-bottom: 1px solid var(--border-divider); }
.visibility-tabs--setup button { min-height: 48px; padding: 8px 12px; border: 0; border-bottom: 2px solid transparent; border-radius: 0; font-size: var(--font-size-body); }
.visibility-tabs--setup button.is-active { color: var(--action-accent); background: transparent; border-bottom-color: var(--action-accent); }
.visibility-tabs--setup button span { box-sizing: border-box; flex: 0 0 22px; width: 22px; min-width: 22px; height: 22px; padding: 0; line-height: 1; text-align: center; background: var(--background-secondary); border-radius: 50%; }
.visibility-tabs button:focus-visible { outline: 2px solid var(--action-accent); outline-offset: 2px; }
.visibility-tab-panel { min-width: 0; }
.vm-enable-copy { margin: 0; color: var(--text-secondary); font-size: 14px; line-height: 22px; }
.visibility-api-error { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0; padding: 12px 16px; color: var(--status-error-foreground); background: var(--status-error-background); border-radius: var(--radius-control); }
.visibility-api-error button { flex: 0 0 auto; padding: 4px 10px; border: 1px solid currentColor; border-radius: var(--radius-control); color: inherit; background: transparent; font: inherit; cursor: pointer; }
.visibility-api-state { display: flex; min-height: 110px; align-items: center; justify-content: center; gap: 14px; padding: 24px; border: 1px dashed var(--border-default); border-radius: var(--radius-card); color: var(--text-secondary); background: var(--background-primary); text-align: center; }
.visibility-api-state.is-error { border-color: var(--status-error-border); color: var(--status-error-foreground); background: var(--status-error-background); }
.visibility-api-state button { flex: 0 0 auto; padding: 5px 10px; border: 1px solid currentColor; border-radius: var(--radius-control); color: inherit; background: transparent; font: inherit; cursor: pointer; }
.visibility-stage-four, .visibility-results { display: grid; min-width: 0; gap: 16px; }
@media (max-width: 760px) { .visibility-tabs { overflow-x: auto; } .visibility-tabs button { flex: 0 0 auto; } }
</style>

