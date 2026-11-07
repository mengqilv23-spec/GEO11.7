<script setup lang="ts">
import type { BuyerPersonaRecord, GeoDictionaryItem, MarketThemeRecord, MonitoringQuestionRecord, SelectedPlatformRecord } from '../api/geo-config'
import type { MonitoringQuestion } from '../components/onboarding/monitoring-questions/monitoring-question-data'
import type { DropdownSelectOption } from '../components/ui/ce/dropdown-select/types'
import type { BuyerPersona } from '../types'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { addPersona, addQuestion, bindMarket, completeBrandStep, completePersonaStep, completeQuestionStep, completeWizardStep, createWizard, deletePersona, getActivePlan, getBrandInfo, getDictionary, getMarketPersonas, getMarketPlatforms, getMarketQuestions, getMarketThemes, removePlatform, saveBrandInfo, selectPlatform, switchMarket, updateFirstSelected, updatePersona, updateQuestion } from '../api/geo-config'
import { getSchedule, saveSchedule } from '../api/monitoring'
import BuyerPersonaStep from '../components/onboarding/buyer-persona/BuyerPersonaStep.vue'
import { defaultMonitoringPlatformsForPlan, monitoringPlatformOptions, normalizeMonitoringPlatform } from '../components/onboarding/monitoring-plan/monitoring-plan'
import MonitoringPlanStep from '../components/onboarding/monitoring-plan/MonitoringPlanStep.vue'
import { inferMonitoringKeyword } from '../components/onboarding/monitoring-questions/monitoring-question-data'
import MonitoringQuestionStep from '../components/onboarding/monitoring-questions/MonitoringQuestionStep.vue'
import OnboardingSteps from '../components/onboarding/shared/OnboardingSteps.vue'
import DropdownSelect from '../components/ui/ce/dropdown-select/DropdownSelect.vue'
import Spinner from '../components/ui/ce/spinner/Spinner.vue'
import AppIcon from '../components/ui/icons/AppIcon.vue'
import { useServerMarkets } from '../composables/use-server-markets'
import { visibilityMonitoringData } from '../data/visibility-monitoring-data'
import { marketSetupSteps, useMarketContextStore } from '../stores/market-context'

const route = useRoute()
const router = useRouter()
const marketContext = useMarketContextStore()
const serverMarkets = useServerMarkets()
const errors = ref<Record<string, string>>({})
const workflowError = ref('')
const saving = ref(false)
const personaSaving = ref(false)
const questionSelectionSaving = ref(false)
const planSaving = ref(false)
const selectedMarketId = ref<number | null>(null)
const backendPersonas = ref<BuyerPersonaRecord[]>([])
const backendQuestions = ref<MonitoringQuestionRecord[]>([])
const backendThemes = ref<MarketThemeRecord[]>([])
const backendPlatforms = ref<SelectedPlatformRecord[]>([])
const dictionaries = ref<Record<string, GeoDictionaryItem[]>>({})
const serverSchedule = ref<Awaited<ReturnType<typeof getSchedule>>>(null)
const questionLimit = ref<number | undefined>()
const activePlanName = ref('')
const draft = computed(() => marketContext.setupDraft)
const currentMarket = computed(() => draft.value?.market ?? '')
const currentLanguage = computed(() => draft.value?.language ?? '')
const marketLanguageOptions = computed<DropdownSelectOption[]>(() => serverMarkets.items.value
  .filter(market => !market.enabled)
  .map(market => ({ value: String(market.id), label: `${market.country} · ${market.language}` })))
const selectedMarketLanguage = computed(() => selectedMarketId.value ? String(selectedMarketId.value) : '')
const dictionaryOptions = (name: string) => (dictionaries.value[name] ?? []).map(item => ({ value: item.dictValue, label: item.dictLabel }))
const personaTypeOptions = computed(() => dictionaryOptions('persona_type'))
const purchaseStageOptions = computed(() => dictionaryOptions('purchase_stage'))
const intentOptions = computed(() => dictionaryOptions('intent_type'))
const questionTypeOptions = computed(() => dictionaryOptions('question_type'))
const focusOptions = computed(() => dictionaryOptions('focus_type'))
const personaQuestionOptions = computed<DropdownSelectOption[]>(() => backendPersonas.value.map(persona => ({ value: String(persona.id), label: persona.personaName })))
const serverQuestionCandidates = computed<MonitoringQuestion[]>(() => {
  const personaById = new Map(backendPersonas.value.map(item => [item.id, item.personaName]))
  const themeById = new Map(backendThemes.value.map(item => [item.id, item.themeName]))
  const label = (kind: string, value: string) => (dictionaries.value[kind] ?? []).find(item => item.dictValue === value)?.dictLabel ?? value
  return [...backendQuestions.value.map(question => ({
    id: String(question.id),
    question: question.questionContent,
    keyword: question.keyword?.trim() || (question.themeId ? themeById.get(question.themeId) ?? '' : '') || visibilityMonitoringData.questions.find(candidate => candidate.question === question.questionContent)?.keyword || inferMonitoringKeyword(question.questionContent),
    type: label('question_type', question.questionType),
    persona: personaById.get(question.personaId) ?? String(question.personaId),
    purchaseStage: label('purchase_stage', question.purchaseStage),
    intent: label('intent_type', question.intentType),
    mainConcern: question.focusType ? label('focus_type', question.focusType) : '—',
    personaId: question.personaId,
    questionTypeCode: question.questionType,
    purchaseStageCode: question.purchaseStage,
    intentCode: question.intentType,
    focusCode: question.focusType ?? undefined,
  })), ...(draft.value?.customMonitoringQuestions ?? []).filter(question => !backendQuestions.value.some(item => String(item.id) === question.id))]
})
const safeReturnTo = computed(() => {
  const returnTo = route.query.returnTo
  return typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/report-center'
})

if (!marketContext.setupDraft)
  marketContext.beginMarketSetup()

onMounted(() => void serverMarkets.load())

function updateMarketLanguage(value: string) {
  const marketId = Number(value)
  const market = serverMarkets.items.value.find(item => item.id === marketId)
  selectedMarketId.value = market?.id ?? null
  marketContext.updateSetupMarket(market?.country ?? '', market?.language ?? '')
  errors.value = {}
}

async function loadBoundMarketConfiguration() {
  const dictionaryTypes = ['persona_type', 'purchase_stage', 'company_scale', 'decision_role', 'intent_type', 'question_type', 'focus_type', 'ai_platform', 'monitor_frequency']
  const [personas, questions, themes, platforms, schedule, activePlan, ...dicts] = await Promise.all([
    getMarketPersonas(),
    getMarketQuestions(),
    getMarketThemes(),
    getMarketPlatforms(),
    getSchedule(),
    getActivePlan(),
    ...dictionaryTypes.map(type => getDictionary(type)),
  ])
  backendPersonas.value = personas
  backendQuestions.value = questions
  backendThemes.value = themes
  backendPlatforms.value = platforms
  serverSchedule.value = schedule
  questionLimit.value = activePlan.quota.questionCountLimit
  activePlanName.value = activePlan.quota.planName
  dictionaries.value = Object.fromEntries(dictionaryTypes.map((type, index) => [type, dicts[index] as GeoDictionaryItem[]]))
  const personasForEditor: BuyerPersona[] = personas.map(persona => ({
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
  }))
  marketContext.updateSetupPersonas(personasForEditor)
  marketContext.updateSetupQuestionSelection(questions.filter(question => question.isFirstSelected === 1).map(question => String(question.id)))
  const savedPlatforms = platforms.filter(platform => platform.enabled === 1).map(platform => platform.platform)
  const selectablePlatformIds = new Set(monitoringPlatformOptions.filter(platform => !platform.disabled).map(platform => platform.value))
  marketContext.updateSetupPlatforms(savedPlatforms.length
    ? savedPlatforms.map(normalizeMonitoringPlatform).filter(platform => selectablePlatformIds.has(platform)) as never
    : defaultMonitoringPlatformsForPlan(activePlan.quota.planCode, activePlan.quota.planName))
  if (schedule)
    marketContext.updateSetupFrequency(schedule.scheduleType)
}

async function savePersonasImmediately(nextPersonas: BuyerPersona[]) {
  const current = new Map(backendPersonas.value.map(persona => [String(persona.id), persona]))
  const next = new Map(nextPersonas.map(persona => [persona.id, persona]))
  let updated = [...backendPersonas.value]
  try {
    for (const [id, persona] of current) {
      if (!next.has(id)) {
        await deletePersona(persona.id)
        updated = updated.filter(item => item.id !== persona.id)
      }
    }
    for (const persona of nextPersonas) {
      const personaName = personaTypeOptions.value.find(option => option.value === persona.type)?.label ?? persona.type
      const payload = {
        personaName,
        personaType: persona.type,
        actualPosition: persona.actualRole || undefined,
        industry: persona.industry || undefined,
        companyScale: persona.companySize || undefined,
        decisionRole: persona.decisionRole || undefined,
        purchaseTrigger: persona.purchaseTrigger || undefined,
        purchaseBudget: persona.purchaseBudget || undefined,
        purchaseCycle: persona.purchaseCycle || undefined,
        infoChannels: persona.discoveryChannel || undefined,
        purchaseStages: persona.purchaseStage ? [persona.purchaseStage] : [],
      }
      const existing = current.get(persona.id)
      if (existing && (
        existing.personaName !== payload.personaName
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
      )) {
        await updatePersona(existing.id, payload)
        updated = updated.map(item => item.id === existing.id
          ? { ...item, ...payload, actualPosition: payload.actualPosition ?? null, industry: payload.industry ?? null, companyScale: payload.companyScale ?? null, decisionRole: payload.decisionRole ?? null, purchaseTrigger: payload.purchaseTrigger ?? null, purchaseBudget: payload.purchaseBudget ?? null, purchaseCycle: payload.purchaseCycle ?? null, infoChannels: payload.infoChannels ?? null }
          : item)
      }
      else if (!existing) {
        const id = await addPersona(payload)
        updated.push({
          id,
          ...payload,
          actualPosition: payload.actualPosition ?? null,
          industry: payload.industry ?? null,
          companyScale: payload.companyScale ?? null,
          decisionRole: payload.decisionRole ?? null,
          purchaseTrigger: payload.purchaseTrigger ?? null,
          purchaseBudget: payload.purchaseBudget ?? null,
          purchaseCycle: payload.purchaseCycle ?? null,
          infoChannels: payload.infoChannels ?? null,
          description: null,
          focusTopics: null,
          sourceType: 1,
          status: 1,
        })
      }
    }
  }
  catch (cause) {
    await loadBoundMarketConfiguration()
    throw cause
  }
  backendPersonas.value = updated
  const savedPersonas = updated.map(persona => ({
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
  }))
  marketContext.updateSetupPersonas(savedPersonas)
  return savedPersonas
}

async function saveQuestionSelectionImmediately(ids: string[]) {
  if (questionSelectionSaving.value)
    return
  const questionIds = ids.map(id => Number(id)).filter(Number.isSafeInteger)
  if (!ids.length || questionIds.length !== ids.length)
    throw new Error('至少选择一条已保存的监测问题。')
  questionSelectionSaving.value = true
  try {
    await updateFirstSelected({ questionIds, candidateIds: [] })
    marketContext.updateSetupQuestionSelection(ids)
    backendQuestions.value = backendQuestions.value.map(question => ({ ...question, isFirstSelected: ids.includes(String(question.id)) ? 1 : 0 }))
  }
  finally {
    questionSelectionSaving.value = false
  }
}

async function saveCustomQuestionImmediately(question: MonitoringQuestion) {
  if (!question.personaId || !question.questionTypeCode || !question.purchaseStageCode || !question.intentCode || !question.focusCode)
    throw new Error(`自定义问题“${question.question}”缺少后端必填编码，请补全后重试。`)
  const id = await addQuestion({
    questionContent: question.question,
    keyword: question.keyword,
    questionType: question.questionTypeCode,
    personaId: question.personaId,
    purchaseStage: question.purchaseStageCode,
    intentType: question.intentCode,
    focusType: question.focusCode,
  })
  backendQuestions.value = [...backendQuestions.value, {
    id,
    questionContent: question.question,
    themeId: null,
    questionType: question.questionTypeCode,
    personaId: question.personaId,
    purchaseStage: question.purchaseStageCode,
    intentType: question.intentCode,
    focusType: question.focusCode,
    isFirstSelected: 0,
    sourceType: 1,
    status: 1,
  }]
  return { ...question, id: String(id) }
}

async function persistPersonas() {
  if (!draft.value!.buyerPersonas.length)
    throw new Error('请至少添加一套买家人设后再继续。')
  await completePersonaStep()
}

async function persistQuestions() {
  if (!draft.value!.selectedMonitoringQuestionIds.length)
    throw new Error('至少选择一条监测问题后才能完成该步骤。')
  await completeQuestionStep()
}

async function saveMonitoringFrequencyImmediately(frequency: import('../components/onboarding/monitoring-plan/monitoring-plan').MonitoringFrequency) {
  if (!draft.value)
    return
  planSaving.value = true
  try {
    await saveSchedule({
      scheduleType: frequency,
      executeTime: serverSchedule.value?.executeTime ?? '05:00',
      repeatCount: serverSchedule.value?.repeatCount ?? 1,
    })
    marketContext.updateSetupFrequency(frequency)
    if (serverSchedule.value)
      serverSchedule.value = { ...serverSchedule.value, scheduleType: frequency }
  }
  finally {
    planSaving.value = false
  }
}

async function saveMonitoringPlatformsImmediately(nextPlatforms: import('../components/onboarding/monitoring-plan/monitoring-plan').MonitoringPlatform[]) {
  if (!draft.value)
    return
  const selected = new Set(nextPlatforms)
  const current = new Set(draft.value.platforms)
  const added = nextPlatforms.find(platform => !current.has(platform))
  const removed = [...current].find(platform => !selected.has(platform))
  planSaving.value = true
  try {
    if (added) {
      const id = await selectPlatform({ platform: added })
      backendPlatforms.value = [...backendPlatforms.value.filter(item => item.platform !== added), { id, platform: added, modelVersion: null, enabled: 1, sort: backendPlatforms.value.length + 1 }]
    }
    else if (removed) {
      const record = backendPlatforms.value.find(item => item.platform === removed && item.enabled === 1)
      if (record)
        await removePlatform(record.id)
      backendPlatforms.value = backendPlatforms.value.map(item => item.platform === removed ? { ...item, enabled: 0 } : item)
    }
    marketContext.updateSetupPlatforms(nextPlatforms)
  }
  finally {
    planSaving.value = false
  }
}

async function persistPlan() {
  if (!draft.value!.platforms.length)
    throw new Error('请至少选择一个 AI 平台后再继续。')
  await completeWizardStep(4)
}

async function removePersonaImmediately(id: string) {
  if (!draft.value || draft.value.buyerPersonas.length <= 1) {
    workflowError.value = '至少保留一套买家人设。'
    return
  }
  if (personaSaving.value)
    return
  personaSaving.value = true
  workflowError.value = ''
  try {
    await savePersonasImmediately(draft.value.buyerPersonas.filter(persona => persona.id !== id))
  }
  catch (cause) {
    workflowError.value = cause instanceof Error ? cause.message : '删除买家人设失败'
  }
  finally {
    personaSaving.value = false
  }
}

async function persistPersonasImmediately(personas: BuyerPersona[]) {
  personaSaving.value = true
  workflowError.value = ''
  try {
    return await savePersonasImmediately(personas)
  }
  catch (cause) {
    workflowError.value = cause instanceof Error ? cause.message : '保存买家人设失败'
    throw cause
  }
  finally {
    personaSaving.value = false
  }
}

async function handleQuestionSelection(ids: string[]) {
  workflowError.value = ''
  try {
    await saveQuestionSelectionImmediately(ids)
  }
  catch (cause) {
    workflowError.value = cause instanceof Error ? cause.message : '更新监测问题失败'
  }
}

async function addCustomQuestion(question: MonitoringQuestion) {
  marketContext.addSetupQuestion(question)
  await handleQuestionSelection([...draft.value!.selectedMonitoringQuestionIds, question.id])
}

async function persistEditedQuestion(question: MonitoringQuestion) {
  const id = Number(question.id)
  if (!Number.isSafeInteger(id) || !question.personaId || !question.questionTypeCode || !question.purchaseStageCode || !question.intentCode || !question.focusCode)
    throw new Error('该监测问题缺少可保存的后端字段，请重新读取后重试。')
  await updateQuestion(id, {
    questionContent: question.question,
    keyword: question.keyword,
    questionType: question.questionTypeCode,
    personaId: question.personaId,
    purchaseStage: question.purchaseStageCode,
    intentType: question.intentCode,
    focusType: question.focusCode,
  })
  backendQuestions.value = backendQuestions.value.map((item) => {
    if (item.id !== id)
      return item
    return {
      ...item,
      questionContent: question.question,
      keyword: question.keyword,
      questionType: question.questionTypeCode!,
      personaId: question.personaId!,
      purchaseStage: question.purchaseStageCode!,
      intentType: question.intentCode!,
      focusType: question.focusCode!,
    }
  })
  return question
}

async function persistCustomQuestion(question: MonitoringQuestion) {
  workflowError.value = ''
  try {
    return await saveCustomQuestionImmediately(question)
  }
  catch (cause) {
    workflowError.value = cause instanceof Error ? cause.message : '添加自定义问题失败'
    throw cause
  }
}

async function handleFrequencyChange(frequency: import('../components/onboarding/monitoring-plan/monitoring-plan').MonitoringFrequency) {
  workflowError.value = ''
  try {
    await saveMonitoringFrequencyImmediately(frequency)
  }
  catch (cause) {
    workflowError.value = cause instanceof Error ? cause.message : '更新采集频率失败'
  }
}

async function handlePlatformsChange(platforms: import('../components/onboarding/monitoring-plan/monitoring-plan').MonitoringPlatform[]) {
  workflowError.value = ''
  try {
    await saveMonitoringPlatformsImmediately(platforms)
  }
  catch (cause) {
    workflowError.value = cause instanceof Error ? cause.message : '更新 AI 平台失败'
  }
}

function goPrevious() {
  marketContext.stepSetup(-1)
}

async function goNext() {
  if (!draft.value)
    return
  if (marketContext.setupStep === 0 && (!draft.value.market || !draft.value.language)) {
    errors.value = {
      market: draft.value.market ? '' : '请选择目标市场',
      language: draft.value.language ? '' : '请选择语言',
    }
    return
  }
  workflowError.value = ''
  saving.value = true
  try {
    if (marketContext.setupStep === 0) {
      if (!selectedMarketId.value)
        throw new Error('请选择后端提供的待配置市场。')
      await createWizard()
      await bindMarket(selectedMarketId.value)
      await switchMarket(selectedMarketId.value)
      const brand = await getBrandInfo()
      await saveBrandInfo({ aliasNames: brand.aliasNames ?? '', positioning: brand.positioning ?? '' })
      await completeBrandStep()
      await loadBoundMarketConfiguration()
    }
    else if (marketContext.setupStep === 1) {
      await persistPersonas()
    }
    else if (marketContext.setupStep === 2) {
      await persistQuestions()
    }
    else {
      await persistPlan()
      marketContext.cancelMarketSetup()
      await serverMarkets.load()
      await router.push(safeReturnTo.value)
      return
    }
  }
  catch (error) {
    workflowError.value = error instanceof Error ? error.message : '市场配置保存失败'
    return
  }
  finally {
    saving.value = false
  }
  if (marketContext.setupStep === marketSetupSteps.length - 1) {
    void router.push(safeReturnTo.value)
    return
  }
  marketContext.stepSetup(1)
}

function cancel() {
  marketContext.cancelMarketSetup()
  void router.push(safeReturnTo.value)
}
</script>

<template>
  <main v-if="draft" class="onboarding-page market-setup-page">
    <div class="onboarding-page__inner">
      <template v-if="marketContext.setupStep === 0">
        <header class="page-header">
          <div>
            <h1 class="page-header__title">
              新增市场配置
            </h1>
          </div>
          <span class="market-setup-page__reused">品牌知识已复用</span>
        </header>
        <OnboardingSteps :current-step="marketContext.setupStep" :steps="marketSetupSteps" />
        <section class="knowledge-panel market-setup-page__panel" aria-labelledby="market-setup-title">
          <header class="knowledge-panel__header">
            <div>
              <h2 id="market-setup-title" class="knowledge-panel__title">
                市场与语言
              </h2>
              <p class="market-setup-page__description">
                选择新增市场，系统将使用该市场对应的监测语言。
              </p>
            </div>
          </header>
          <div class="market-setup-page__body">
            <span id="new-market-language-label" class="market-setup-page__field-label">目标市场</span>
            <DropdownSelect
              :model-value="selectedMarketLanguage"
              :options="marketLanguageOptions"
              v-bind="{ ariaLabel: '目标市场与语言', ariaLabelledby: 'new-market-language-label', ariaDescribedby: errors.market ? 'new-market-error' : undefined, panelWidth: '100%' }"
              @update:model-value="updateMarketLanguage"
            />
            <div v-if="serverMarkets.loading.value && !serverMarkets.items.value.length" class="market-setup-page__loading" role="status" aria-label="加载市场">
              <Spinner variant="ring" aria-hidden="true" />
            </div>
            <p v-else-if="!marketLanguageOptions.length && !serverMarkets.error.value" class="market-setup-page__description">
              当前没有后端预置的待配置市场，不能通过前端虚构一个新市场。
            </p>
            <p v-if="serverMarkets.error.value" class="market-setup-page__error" role="alert">
              市场列表加载失败：{{ serverMarkets.error.value }} <button type="button" @click="serverMarkets.load()">
                重试
              </button>
            </p>
            <p v-if="errors.market" id="new-market-error" class="market-setup-page__error" role="alert">
              {{ errors.market }}
            </p>
            <div class="market-setup-page__reuse-note">
              <AppIcon name="check" :size="14" aria-hidden="true" />
              <div><strong>全局品牌知识已复用</strong><p>后续只需维护该市场的人设、监测问题和采集计划，无需再次确认品牌知识。</p></div>
            </div>
          </div>
        </section>
      </template>

      <BuyerPersonaStep
        v-else-if="marketContext.setupStep === 1"
        :current-step="marketContext.setupStep"
        :steps="marketSetupSteps"
        :personas="draft.buyerPersonas"
        :market="currentMarket"
        market-setup
        :type-options="personaTypeOptions"
        :stage-options="purchaseStageOptions"
        :persist-personas="persistPersonasImmediately"
        :saving="personaSaving"
        @saved="marketContext.updateSetupPersonas"
        @remove-requested="removePersonaImmediately"
      />

      <MonitoringQuestionStep
        v-else-if="marketContext.setupStep === 2"
        :current-step="marketContext.setupStep"
        :steps="marketSetupSteps"
        :market="currentMarket"
        :language="currentLanguage"
        market-setup
        :selected-ids="draft.selectedMonitoringQuestionIds"
        :custom-questions="draft.customMonitoringQuestions"
        :candidate-questions="serverQuestionCandidates"
        :persona-options="personaQuestionOptions"
        :type-options="questionTypeOptions"
        :stage-options="purchaseStageOptions"
        :intent-options="intentOptions"
        :focus-options="focusOptions"
        :question-limit="questionLimit"
        :selection-saving="questionSelectionSaving"
        :persist-question="persistCustomQuestion"
        :persist-edited-question="persistEditedQuestion"
        @selection-changed="handleQuestionSelection"
        @custom-question-added="addCustomQuestion"
      />

      <MonitoringPlanStep
        v-else
        :current-step="marketContext.setupStep"
        :steps="marketSetupSteps"
        :frequency="draft.frequency"
        :platforms="draft.platforms"
        market-setup
        :plan-name="activePlanName"
        :market="currentMarket"
        :saving="planSaving"
        @frequency-changed="handleFrequencyChange"
        @platforms-changed="handlePlatformsChange"
      />
    </div>

    <footer class="market-setup-page__footer">
      <span>{{ marketContext.setupStep + 1 }} / 4 · {{ marketSetupSteps[marketContext.setupStep] }}</span>
      <div>
        <button v-if="marketContext.setupStep === 0" class="market-setup-page__cancel" type="button" @click="cancel">
          取消新增
        </button>
        <button v-else class="market-setup-page__cancel" type="button" @click="goPrevious">
          上一步
        </button>
        <p v-if="workflowError" class="market-setup-page__error" role="alert">
          {{ workflowError }}
        </p>
        <button class="market-setup-page__next" type="button" :disabled="saving || (marketContext.setupStep === 0 && !selectedMarketId)" :aria-busy="saving" @click="goNext">
          <Spinner v-if="saving" variant="ring" aria-hidden="true" />
          {{ marketContext.setupStep === 3 ? '完成并开始首次监测' : marketContext.setupStep === 0 ? '绑定市场并继续' : '下一步' }}
        </button>
      </div>
    </footer>
  </main>
</template>

<style scoped>
.market-setup-page { min-height: 100vh; padding-bottom: 92px; background: var(--background-page); }
.market-setup-page__reused { padding: 2px 8px; border: 1px solid var(--status-success-border); border-radius: var(--radius-tag); color: var(--status-success-foreground); background: var(--status-success-background); font-size: var(--font-size-caption); line-height: var(--line-height-caption); font-weight: 600; white-space: nowrap; }
.market-setup-page__panel { overflow: hidden; }
.market-setup-page__description { margin: 6px 0 0; color: var(--text-muted); font-size: var(--font-size-body); line-height: var(--line-height-body); }
.market-setup-page__loading { display: flex; justify-content: center; padding: 12px; --spinner-color: var(--action-accent); }
.market-setup-page__field-label { color: var(--text-secondary); font-size: var(--font-size-body); line-height: var(--line-height-body); font-weight: 600; }
.market-setup-page__error { margin: -12px 0 0; color: var(--status-error-foreground); font-size: var(--font-size-caption); line-height: var(--line-height-caption); }
.market-setup-page__body { display: grid; gap: 20px; padding: 20px; }
.market-setup-page__reuse-note { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; border: 1px solid var(--status-success-border); border-radius: 12px; color: var(--status-success-foreground); background: var(--status-success-background); }
.market-setup-page__reuse-note > span { display: grid; width: 24px; height: 24px; flex: 0 0 24px; place-items: center; border-radius: 50%; background: color-mix(in srgb, var(--status-success-foreground) 12%, white); font-weight: 750; }
.market-setup-page__reuse-note strong { font-size: 14px; }
.market-setup-page__reuse-note p { margin: 2px 0 0; color: var(--text-secondary); font-size: var(--font-size-body); line-height: var(--line-height-body); }
.market-setup-page__footer { position: fixed; z-index: 20; right: 0; bottom: 0; left: 0; display: flex; min-height: 72px; align-items: center; justify-content: space-between; gap: 16px; padding: 12px max(24px, calc((100vw - 1480px) / 2)); border-top: 1px solid var(--border-divider); background: var(--background-primary); }
.market-setup-page__footer > span { color: var(--text-muted); font-size: var(--font-size-caption); line-height: var(--line-height-caption); }
.market-setup-page__footer > div { display: flex; align-items: center; gap: 10px; }
.market-setup-page__cancel,.market-setup-page__next { min-height: 36px; padding: 0 12px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--background-primary); color: var(--text-secondary); font: inherit; font-size: var(--font-size-body); font-weight: 600; cursor: pointer; }
.market-setup-page__next { display: inline-flex; align-items: center; justify-content: center; gap: 8px; --spinner-size: 16px; --spinner-color: currentColor; border-color: var(--action-accent); background: var(--action-accent); color: var(--text-on-accent, #fff); }
.market-setup-page__next:disabled { opacity: .55; cursor: not-allowed; }
.market-setup-page__cancel:focus-visible,.market-setup-page__next:focus-visible { outline: 2px solid var(--action-accent); outline-offset: 2px; }
@media (max-width: 640px) { .market-setup-page__body { padding: 16px; } .market-setup-page__footer { align-items: stretch; flex-direction: column; padding: 10px 16px; } .market-setup-page__footer > div { justify-content: flex-end; } .market-setup-page__cancel,.market-setup-page__next { min-height: 34px; padding-inline: 10px; } }
</style>

