import type { BrandInfoRecord, BrandProductRecord, BuyerPersonaRecord, CompetitorRecord, GeoDictionaryItem, MonitoringQuestionRecord, SelectedPlatformRecord } from '../api/geo-config'
import type { MonitoringPlatform } from '../components/onboarding/monitoring-plan/monitoring-plan'
import type { MonitoringQuestion } from '../components/onboarding/monitoring-questions/monitoring-question-data'
import type { BuyerPersona, CompetitorKnowledgeDraft, KnowledgeItem, ProductKnowledgeDraft } from '../types'
import { computed, shallowRef } from 'vue'
import { addBrandProduct, addCompetitor, addPersona, addQuestion, bindMarket, completeBrandStep, completePersonaStep, completeQuestionStep, completeWizardStep, createWizard, deleteBrandProduct, deleteCompetitor, deletePersona, generateQuestionCandidates, getActivePlan, getBrandInfo, getBrandProducts, getDictionary, getMarketCompetitors, getMarketEntryStatus, getMarketPersonas, getMarketPlatforms, getMarketQuestions, getMarkets, getMarketThemes, removePlatform, saveBrandInfo, selectPlatform, switchMarket, updateBrandProduct, updateCompetitor, updateFirstSelected, updatePersona, updateQuestion } from '../api/geo-config'
import { getSchedule, saveSchedule } from '../api/monitoring'
import { buildCompetitorSummary } from '../components/onboarding/knowledge/competitor-summary'
import { defaultMonitoringPlatformsForPlan, frequencyForPlan, monitoringPlatformOptions, normalizeMonitoringPlatform } from '../components/onboarding/monitoring-plan/monitoring-plan'
import { inferMonitoringKeyword } from '../components/onboarding/monitoring-questions/monitoring-question-data'
import { visibilityMonitoringData } from '../data/visibility-monitoring-data'
import { useGeoContextStore } from '../stores/geo-context'
import { useOnboardingStore } from '../stores/onboarding'

const marketDictionaryTypes = ['country', 'language']
const personaDictionaryTypes = ['persona_type', 'purchase_stage', 'company_scale', 'decision_role']
const questionDictionaryTypes = ['intent_type', 'question_type', 'focus_type']
const planDictionaryTypes = ['ai_platform', 'monitor_frequency']

function splitList(value: string) {
  return value.split(/[·,，]/).map(item => item.trim()).filter(Boolean)
}

function productInput(product: ProductKnowledgeDraft, existing?: BrandProductRecord) {
  return {
    // The editor exposes productName; preserve the backend's separate lineName
    // field because it is not independently editable in this panel.
    lineName: existing?.lineName || product.name,
    productName: product.name,
    usageScene: product.useCase,
    sellingPoints: splitList(product.strengths),
    targetCustomers: splitList(product.customerGroup),
    isPrimary: product.isPrimary ? 1 : 0,
  }
}

function competitorInput(competitor: CompetitorKnowledgeDraft) {
  return {
    competitorName: competitor.name,
    domain: competitor.domain,
    aliasNames: competitor.alias,
    competitorDesc: competitor.description,
  }
}

function sameList(left: string[] | null | undefined, right: string[]) {
  return (left ?? []).length === right.length && (left ?? []).every((value, index) => value === right[index])
}

export function useFirstConfigWizard() {
  const geoContext = useGeoContextStore()
  const onboarding = useOnboardingStore()
  const loading = shallowRef(false)
  const saving = shallowRef(false)
  const error = shallowRef('')
  const loaded = shallowRef(false)
  const questionLimit = shallowRef<number | null>(null)
  const competitorCountLimit = shallowRef<number | null>(null)
  const planName = shallowRef('')
  const planCode = shallowRef('')
  const planFrequency = shallowRef<import('../components/onboarding/monitoring-plan/monitoring-plan').MonitoringFrequency>('weekly')
  const brand = shallowRef<BrandInfoRecord | null>(null)
  const products = shallowRef<BrandProductRecord[]>([])
  const competitors = shallowRef<CompetitorRecord[]>([])
  const personas = shallowRef<BuyerPersonaRecord[]>([])
  const questions = shallowRef<MonitoringQuestionRecord[]>([])
  const platforms = shallowRef<SelectedPlatformRecord[]>([])
  const dictionaries = shallowRef<Record<string, GeoDictionaryItem[]>>({})
  const schedule = shallowRef<Awaited<ReturnType<typeof getSchedule>>>(null)
  const themes = shallowRef<Awaited<ReturnType<typeof getMarketThemes>>>([])
  const marketIdentity = shallowRef({ market: '', language: '' })
  const loadedSteps = new Set<number>()
  const dictionaryOptions = computed(() => Object.fromEntries(Object.entries(dictionaries.value).map(([key, values]) => [key, values.map(item => ({ value: item.dictValue, label: item.dictLabel }))])))
  const questionCandidates = computed<MonitoringQuestion[]>(() => {
    const personaLabels = new Map(personas.value.map(persona => [persona.id, persona.personaName]))
    const themeLabels = new Map(themes.value.map(theme => [theme.id, theme.themeName]))
    const label = (kind: string, value: string) => dictionaries.value[kind]?.find(item => item.dictValue === value)?.dictLabel ?? value
    return questions.value.map(question => ({
      id: String(question.id),
      question: question.questionContent,
      keyword: question.keyword?.trim() || (question.themeId ? themeLabels.get(question.themeId) ?? '' : '') || visibilityMonitoringData.questions.find(candidate => candidate.question === question.questionContent)?.keyword || inferMonitoringKeyword(question.questionContent),
      type: label('question_type', question.questionType),
      persona: personaLabels.get(question.personaId) ?? '',
      purchaseStage: label('purchase_stage', question.purchaseStage),
      intent: label('intent_type', question.intentType),
      mainConcern: question.focusType ? label('focus_type', question.focusType) : '—',
      personaId: question.personaId,
      questionTypeCode: question.questionType,
      purchaseStageCode: question.purchaseStage,
      intentCode: question.intentType,
      focusCode: question.focusType ?? undefined,
    }))
  })

  function dictionaryLabel(type: string, code: string) {
    const normalizedCode = code.trim().toLocaleLowerCase()
    return dictionaries.value[type]?.find(item => item.dictValue.trim().toLocaleLowerCase() === normalizedCode)?.dictLabel ?? code
  }

  async function loadDictionaries(types: string[]) {
    const missingTypes = types.filter(type => !Object.hasOwn(dictionaries.value, type))
    if (!missingTypes.length)
      return
    const records = await Promise.all(missingTypes.map(type => getDictionary(type)))
    dictionaries.value = {
      ...dictionaries.value,
      ...Object.fromEntries(missingTypes.map((type, index) => [type, records[index]])),
    }
  }

  function installKnowledgeItems() {
    if (!brand.value)
      return
    const productDrafts: ProductKnowledgeDraft[] = products.value.map(product => ({
      id: String(product.id),
      name: product.productName,
      useCase: product.usageScene,
      strengths: product.sellingPoints?.join(' · ') ?? '',
      customerGroup: product.targetCustomers?.join(' · ') ?? '',
      isPrimary: product.isPrimary === 1,
    }))
    const competitorDrafts: CompetitorKnowledgeDraft[] = competitors.value.map(competitor => ({
      id: String(competitor.id),
      name: competitor.competitorName,
      domain: competitor.domain ?? '',
      alias: competitor.aliasNames ?? '',
      description: competitor.competitorDesc ?? '',
      confirmed: competitor.status === 1,
    }))
    const primaryProduct = productDrafts[0]
    const productSummary = primaryProduct
      ? `${primaryProduct.name.trim() || '未命名产品'} · ${primaryProduct.useCase.trim() || '未填写使用场景'}`
      : '尚未添加核心产品'
    const items: KnowledgeItem[] = [
      { id: 'brand', index: '01', title: '品牌信息', summary: `${brand.value.brandName} · ${brand.value.industry}`, requirements: '品牌名称 · 主营行业 · 品牌定位 · 品牌别名', brand: { name: brand.value.brandName, alias: brand.value.aliasNames ?? '', website: brand.value.siteUrl, industry: brand.value.industry, description: brand.value.positioning ?? '' } },
      { id: 'product', index: '02', title: '核心产品', summary: productSummary, requirements: '核心产品 · 使用场景', products: productDrafts },
      { id: 'market', index: '03', title: '市场与语言', summary: `${geoContext.entryStatus?.marketId ?? ''}`, requirements: '当前上下文市场', marketLanguage: { market: '', language: '' } },
      { id: 'competitor', index: '04', title: '竞争对手', summary: buildCompetitorSummary(competitorDrafts, competitorCountLimit.value), requirements: '竞品名称 · 竞品域名', competitors: competitorDrafts },
    ]
    const market = geoContext.entryStatus?.marketId
    if (market) {
      // Entry status contains IDs; labels come from the server dictionaries and market DTO.
      const currentMarket = onboarding.knowledgeItems.find(item => item.id === 'market')?.marketLanguage
      items[2].marketLanguage = marketIdentity.value.market || marketIdentity.value.language ? marketIdentity.value : currentMarket ?? { market: '', language: '' }
      items[2].summary = `${items[2].marketLanguage?.market ?? ''} · ${items[2].marketLanguage?.language ?? ''}`
    }
    onboarding.updateKnowledgeItems(items)
    onboarding.updateBuyerPersonas(personas.value.map((persona): BuyerPersona => ({
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
    onboarding.updateMonitoringQuestionSelection(questions.value.filter(question => question.isFirstSelected === 1).map(question => String(question.id)))
    const savedPlatforms = platforms.value.filter(platform => platform.enabled === 1).map(platform => normalizeMonitoringPlatform(platform.platform))
    const selectablePlatforms = new Set(monitoringPlatformOptions.filter(platform => !platform.disabled).map(platform => platform.value))
    onboarding.updateMonitoringPlatforms(savedPlatforms.length
      ? savedPlatforms.filter(platform => selectablePlatforms.has(platform))
      : defaultMonitoringPlatformsForPlan(planCode.value, planName.value))
    onboarding.updateMonitoringFrequency(planFrequency.value)
  }

  function registerAcceptedProduct(product: BrandProductRecord) {
    if (!products.value.some(item => item.id === product.id))
      products.value = [...products.value, product]
    installKnowledgeItems()
  }

  function syncSavedProduct(product: BrandProductRecord) {
    products.value = [...products.value.filter(item => item.id !== product.id), product]
  }

  async function deleteProduct(id: string) {
    await deleteBrandProduct(Number(id))
    products.value = products.value.filter(product => String(product.id) !== id)
    installKnowledgeItems()
  }

  async function deleteCompetitorDraft(id: string) {
    await deleteCompetitor(Number(id))
    competitors.value = competitors.value.filter(competitor => String(competitor.id) !== id)
    installKnowledgeItems()
  }

  function registerAcceptedCompetitor(competitor: CompetitorRecord) {
    competitors.value = [...competitors.value.filter(item => item.id !== competitor.id), competitor]
    installKnowledgeItems()
  }

  function syncSavedCompetitor(competitor: CompetitorRecord) {
    competitors.value = [...competitors.value.filter(item => item.id !== competitor.id), competitor]
  }

  async function loadStep(step: number) {
    if (loadedSteps.has(step))
      return

    if (step === 1) {
      const [personaRecords] = await Promise.all([
        getMarketPersonas(),
        loadDictionaries(personaDictionaryTypes),
      ])
      personas.value = personaRecords
    }
    else if (step === 2) {
      const [, questionRecords, marketThemes, plan] = await Promise.all([
        loadStep(1),
        getMarketQuestions(),
        getMarketThemes(),
        getActivePlan().catch(() => null),
        loadDictionaries(questionDictionaryTypes),
      ])
      questions.value = questionRecords
      themes.value = marketThemes
      questionLimit.value = plan?.quota.questionCountLimit ?? null
      competitorCountLimit.value = plan?.quota.competitorCountLimit ?? null
      planName.value = plan?.quota.planName ?? ''
      planCode.value = plan?.quota.planCode ?? ''
      planFrequency.value = frequencyForPlan(planCode.value, planName.value, onboarding.monitoringFrequency)
      onboarding.updateMonitoringFrequency(planFrequency.value)
      if (!questionRecords.length) {
        await generateQuestionCandidates()
        questions.value = await getMarketQuestions()
      }
    }
    else if (step === 3) {
      const [platformRecords, currentSchedule] = await Promise.all([
        getMarketPlatforms(),
        getSchedule(),
        loadDictionaries(planDictionaryTypes),
      ])
      platforms.value = platformRecords
      schedule.value = currentSchedule
      planFrequency.value = frequencyForPlan(planCode.value, planName.value, currentSchedule?.scheduleType ?? onboarding.monitoringFrequency)
      onboarding.updateMonitoringFrequency(planFrequency.value)
    }

    loadedSteps.add(step)
    installKnowledgeItems()
  }

  async function load() {
    loading.value = true
    error.value = ''
    try {
      const status = geoContext.entryStatus ?? await getMarketEntryStatus()
      if (status.entryStatus === 'FIRST_TIME') {
        const wizard = await createWizard()
        if (!status.marketId)
          throw new Error('当前账号尚未选择可配置市场，暂时无法开始新人引导。')
        await bindMarket(status.marketId)
        await switchMarket(status.marketId)
        onboarding.currentStep = Math.max(0, (wizard.currentStep ?? 1) - 1)
      }
      else {
        onboarding.currentStep = Math.max(0, Math.min(onboarding.steps.length - 1, (status.currentStep ?? 1) - 1))
      }
      const [brandInfo, productRecords, competitorRecords, marketRecords, , activePlan] = await Promise.all([
        getBrandInfo(),
        getBrandProducts(),
        getMarketCompetitors(),
        getMarkets(),
        loadDictionaries(marketDictionaryTypes),
        onboarding.currentStep === 2 ? Promise.resolve(null) : getActivePlan().catch(() => null),
      ])
      planName.value = activePlan?.quota.planName ?? ''
      planCode.value = activePlan?.quota.planCode ?? ''
      planFrequency.value = frequencyForPlan(planCode.value, planName.value, onboarding.monitoringFrequency)
      onboarding.updateMonitoringFrequency(planFrequency.value)
      competitorCountLimit.value = activePlan?.quota.competitorCountLimit ?? null
      brand.value = brandInfo
      products.value = productRecords
      competitors.value = competitorRecords
      const marketRecord = marketRecords.find(item => item.id === status.marketId)
      marketIdentity.value = {
        market: marketRecord?.marketCountry ? dictionaryLabel('country', marketRecord.marketCountry) : '',
        language: marketRecord?.marketLanguage ? dictionaryLabel('language', marketRecord.marketLanguage) : '',
      }
      installKnowledgeItems()
      if (onboarding.currentStep > 0)
        await loadStep(onboarding.currentStep)
      loaded.value = true
    }
    catch (cause) {
      error.value = cause instanceof Error ? cause.message : '新人引导数据加载失败'
      throw cause
    }
    finally {
      loading.value = false
    }
  }

  async function saveKnowledgeItems(items: KnowledgeItem[]) {
    const brandItem = items.find(item => item.id === 'brand')?.brand
    if (!brandItem)
      throw new Error('品牌资料缺失')
    const brandChanged = !brand.value || brand.value.brandName !== brandItem.name || brand.value.industry !== brandItem.industry || (brand.value.aliasNames ?? '') !== brandItem.alias || (brand.value.positioning ?? '') !== brandItem.description
    if (brandChanged) {
      await saveBrandInfo({ brandName: brandItem.name, industry: brandItem.industry, aliasNames: brandItem.alias, positioning: brandItem.description })
    }
    let productsChanged = false
    let competitorsChanged = false
    const currentProducts = new Map(products.value
      .map(item => [String(item.id), item]))
    const nextProducts = new Map((items.find(item => item.id === 'product')?.products ?? []).map(item => [item.id, item]))
    for (const [id, product] of currentProducts) {
      if (!nextProducts.has(id)) {
        await deleteBrandProduct(product.id as number)
        productsChanged = true
      }
    }
    for (const [id, product] of nextProducts) {
      const existing = currentProducts.get(id)
      const input = productInput(product, existing)
      if (existing) {
        const changed = existing.productName !== input.productName || existing.usageScene !== input.usageScene || !sameList(existing.sellingPoints, input.sellingPoints ?? []) || !sameList(existing.targetCustomers, input.targetCustomers ?? []) || existing.isPrimary !== input.isPrimary
        if (changed) {
          await updateBrandProduct(existing.id as number, input)
          productsChanged = true
        }
      }
      else {
        const productId = await addBrandProduct(input)
        productsChanged = true
        product.id = String(productId)
        products.value = [...products.value, { id: productId, lineName: input.lineName, productName: input.productName, usageScene: input.usageScene, sellingPoints: input.sellingPoints, targetCustomers: input.targetCustomers, sourceType: 1, isPrimary: input.isPrimary }]
        onboarding.updateKnowledgeItems(items)
      }
    }
    const currentCompetitors = new Map(competitors.value
      .map(item => [String(item.id), item]))
    const nextCompetitors = new Map((items.find(item => item.id === 'competitor')?.competitors ?? []).map(item => [item.id, item]))
    for (const [id, competitor] of currentCompetitors) {
      if (!nextCompetitors.has(id)) {
        await deleteCompetitor(competitor.id as number)
        competitorsChanged = true
      }
    }
    for (const [id, competitor] of nextCompetitors) {
      const input = competitorInput(competitor)
      const existing = currentCompetitors.get(id)
      if (existing) {
        const changed = existing.competitorName !== input.competitorName || (existing.domain ?? '') !== (input.domain ?? '') || (existing.aliasNames ?? '') !== (input.aliasNames ?? '') || (existing.competitorDesc ?? '') !== (input.competitorDesc ?? '')
        if (changed) {
          await updateCompetitor(existing.id as number, input)
          competitorsChanged = true
        }
      }
      else {
        const competitorId = await addCompetitor(input)
        competitorsChanged = true
        competitor.id = String(competitorId)
        competitors.value = [...competitors.value, { id: competitorId, competitorName: input.competitorName, domain: input.domain ?? null, aliasNames: input.aliasNames ?? null, competitorDesc: input.competitorDesc ?? null, isCoreSov: 0, sourceType: 1, status: 1 }]
        onboarding.updateKnowledgeItems(items)
      }
    }
    if (brandChanged) {
      const [brandInfo, productRecords] = await Promise.all([getBrandInfo(), getBrandProducts()])
      brand.value = brandInfo
      products.value = productRecords
    }
    else if (productsChanged) {
      products.value = await getBrandProducts()
    }
    if (competitorsChanged)
      competitors.value = await getMarketCompetitors()
    onboarding.updateKnowledgeItems(items)
  }

  async function saveKnowledge() {
    await saveKnowledgeItems(onboarding.knowledgeItems)
    await completeBrandStep()
  }

  async function savePersonas() {
    if (!onboarding.buyerPersonas.length)
      throw new Error('请至少添加一套买家人设后再继续。')
    await completePersonaStep()
  }

  async function savePersonasImmediately(nextPersonas: BuyerPersona[]) {
    const current = new Map(personas.value.map(persona => [String(persona.id), persona]))
    const next = new Map(nextPersonas.map(persona => [persona.id, persona]))
    let updated = [...personas.value]
    try {
      for (const persona of personas.value) {
        if (!next.has(String(persona.id))) {
          await deletePersona(persona.id)
          updated = updated.filter(item => item.id !== persona.id)
        }
      }
      for (const persona of nextPersonas) {
        const payload = {
          personaName: dictionaryLabel('persona_type', persona.type),
          personaType: persona.type,
          actualPosition: persona.actualRole || undefined,
          industry: persona.industry || undefined,
          companyScale: persona.companySize || undefined,
          decisionRole: persona.decisionRole || undefined,
          purchaseTrigger: persona.purchaseTrigger || undefined,
          purchaseBudget: persona.purchaseBudget || undefined,
          purchaseCycle: persona.purchaseCycle || undefined,
          infoChannels: persona.discoveryChannel || undefined,
          commonQuestions: persona.commonQuestions || undefined,
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
          || (existing.commonQuestions ?? undefined) !== payload.commonQuestions
          || (existing.purchaseStages ?? []).join('\u0000') !== payload.purchaseStages.join('\u0000')
        )) {
          await updatePersona(existing.id, payload)
          updated = updated.map(item => item.id === existing.id
            ? { ...item, ...payload, actualPosition: payload.actualPosition ?? null, industry: payload.industry ?? null, companyScale: payload.companyScale ?? null, decisionRole: payload.decisionRole ?? null, purchaseTrigger: payload.purchaseTrigger ?? null, purchaseBudget: payload.purchaseBudget ?? null, purchaseCycle: payload.purchaseCycle ?? null, infoChannels: payload.infoChannels ?? null, commonQuestions: payload.commonQuestions ?? null }
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
      personas.value = updated
      const savedPersonas = personas.value.map((persona): BuyerPersona => ({
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
      onboarding.updateBuyerPersonas(savedPersonas)
      return savedPersonas
    }
    catch (cause) {
      // Some APIs are item-scoped, so a multi-persona save may partially succeed.
      // Re-read the server state before showing the failed operation to the user.
      personas.value = await getMarketPersonas().catch(() => personas.value)
      onboarding.updateBuyerPersonas(personas.value.map(persona => ({
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
      throw cause
    }
  }

  async function saveQuestions() {
    if (!onboarding.selectedMonitoringQuestionIds.length)
      throw new Error('至少选择一条监测问题后才能继续。')
    await completeQuestionStep()
  }

  async function saveQuestionSelection(ids: string[]) {
    if (!ids.length)
      throw new Error('至少选择一条监测问题。')
    const questionIds = ids.map(id => Number(id)).filter(Number.isSafeInteger)
    if (questionIds.length !== ids.length)
      throw new Error('请先保存自定义问题，再更新监测问题选择。')
    await updateFirstSelected({ questionIds, candidateIds: [] })
    onboarding.updateMonitoringQuestionSelection(ids, questionLimit.value ?? undefined)
    questions.value = questions.value.map(question => ({ ...question, isFirstSelected: ids.includes(String(question.id)) ? 1 : 0 }))
  }

  async function addCustomQuestionImmediately(question: MonitoringQuestion) {
    if (!question.personaId || !question.questionTypeCode || !question.purchaseStageCode || !question.intentCode || !question.focusCode)
      throw new Error(`自定义问题“${question.question}”缺少后端必填选项`)
    const questionId = await addQuestion({
      questionContent: question.question,
      keyword: question.keyword,
      questionType: question.questionTypeCode,
      personaId: question.personaId,
      purchaseStage: question.purchaseStageCode,
      intentType: question.intentCode,
      focusType: question.focusCode,
    })
    const saved = { ...question, id: String(questionId) }
    questions.value = [...questions.value, { id: questionId, questionContent: question.question, themeId: null, questionType: question.questionTypeCode, personaId: question.personaId, purchaseStage: question.purchaseStageCode, intentType: question.intentCode, focusType: question.focusCode, isFirstSelected: 0, sourceType: 1, status: 1 }]
    return saved
  }

  async function updateMonitoringQuestionImmediately(question: MonitoringQuestion) {
    const id = Number(question.id)
    if (!Number.isSafeInteger(id))
      throw new Error('当前问题无法编辑，请刷新问题列表后重试。')
    if (!question.personaId || !question.questionTypeCode || !question.purchaseStageCode || !question.intentCode || !question.focusCode)
      throw new Error(`问题“${question.question}”缺少后端必填选项`)
    await updateQuestion(id, {
      questionContent: question.question,
      keyword: question.keyword,
      questionType: question.questionTypeCode,
      personaId: question.personaId,
      purchaseStage: question.purchaseStageCode,
      intentType: question.intentCode,
      focusType: question.focusCode,
    })
    questions.value = questions.value.map((item) => {
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

  async function savePlan() {
    if (!onboarding.monitoringPlatforms.length)
      throw new Error('请至少选择一个 AI 平台后再继续。')
    await saveMonitoringFrequencyImmediately(planFrequency.value)
    await completeWizardStep(4)
    const status = await geoContext.refreshEntryStatus()
    if (status.entryStatus !== 'CONFIGURED')
      throw new Error('监测配置已保存，但服务端尚未将向导标记为完成。')
  }

  async function saveMonitoringFrequencyImmediately(frequency: import('../components/onboarding/monitoring-plan/monitoring-plan').MonitoringFrequency) {
    const previous = schedule.value
    const id = await saveSchedule({ scheduleType: frequency, executeTime: previous?.executeTime ?? '05:00', repeatCount: previous?.repeatCount ?? 1 })
    schedule.value = {
      id,
      scheduleType: frequency,
      executeTime: previous?.executeTime ?? '05:00',
      repeatCount: previous?.repeatCount ?? 1,
      timezone: previous?.timezone ?? 'UTC',
      enabled: previous?.enabled ?? 1,
      nextFireTime: previous?.nextFireTime ?? null,
      lastFireTime: previous?.lastFireTime ?? null,
      lastExecuteStatus: previous?.lastExecuteStatus ?? null,
      lastRoundId: previous?.lastRoundId ?? null,
    }
    onboarding.updateMonitoringFrequency(frequency)
  }

  async function saveMonitoringPlatformsImmediately(nextPlatforms: MonitoringPlatform[]) {
    const next = new Set(nextPlatforms)
    const current = new Set(onboarding.monitoringPlatforms)
    const added = nextPlatforms.find(platform => !current.has(platform))
    const removed = [...current].find(platform => !next.has(platform))
    if (added) {
      const platformId = await selectPlatform({ platform: added })
      platforms.value = [...platforms.value.filter(item => item.platform !== added), { id: platformId, platform: added, modelVersion: null, enabled: 1, sort: platforms.value.length + 1 }]
    }
    else if (removed) {
      const record = platforms.value.find(item => item.platform === removed && item.enabled === 1)
      if (record)
        await removePlatform(record.id)
      platforms.value = platforms.value.map(item => item.platform === removed ? { ...item, enabled: 0 } : item)
    }
    onboarding.updateMonitoringPlatforms(nextPlatforms)
  }

  async function saveCurrentStep(step: number) {
    saving.value = true
    error.value = ''
    try {
      await loadStep(step)
      if (step === 0)
        await saveKnowledge()
      else if (step === 1)
        await savePersonas()
      else if (step === 2)
        await saveQuestions()
      else
        await savePlan()
      await loadConfigurationAfterSave(step)
      if (step < 3)
        await loadStep(step + 1)
    }
    catch (cause) {
      error.value = cause instanceof Error ? cause.message : '保存新人引导失败'
      throw cause
    }
    finally {
      saving.value = false
    }
  }

  async function loadConfigurationAfterSave(step: number) {
    if (step === 0) {
      const [brandInfo, productRecords, competitorRecords] = await Promise.all([
        getBrandInfo(),
        getBrandProducts(),
        getMarketCompetitors(),
      ])
      brand.value = brandInfo
      products.value = productRecords
      competitors.value = competitorRecords
    }
    else if (step === 1) {
      personas.value = await getMarketPersonas()
    }
    else if (step === 2) {
      questions.value = await getMarketQuestions()
    }
    else {
      const [platformRecords, currentSchedule] = await Promise.all([getMarketPlatforms(), getSchedule()])
      platforms.value = platformRecords
      schedule.value = currentSchedule
    }
    installKnowledgeItems()
  }

  return { loading, saving, error, loaded, questionLimit, competitorCountLimit, planName, planFrequency, dictionaries, dictionaryOptions, questionCandidates, load, loadStep, saveCurrentStep, saveKnowledgeItems, savePersonasImmediately, saveQuestionSelection, addCustomQuestionImmediately, updateMonitoringQuestionImmediately, saveMonitoringFrequencyImmediately, saveMonitoringPlatformsImmediately, registerAcceptedProduct, registerAcceptedCompetitor, syncSavedProduct, deleteProduct, syncSavedCompetitor, deleteCompetitor: deleteCompetitorDraft }
}

