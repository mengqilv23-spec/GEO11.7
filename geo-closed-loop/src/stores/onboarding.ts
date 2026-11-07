import type { MonitoringFrequency, MonitoringPlatform } from '../components/onboarding/monitoring-plan/monitoring-plan'
import type { MonitoringQuestion } from '../components/onboarding/monitoring-questions/monitoring-question-data'
import type { BuyerPersona, KnowledgeItem } from '../types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { limitSelectedQuestionIds } from '../components/onboarding/monitoring-questions/monitoring-question-selection'

export const useOnboardingStore = defineStore('onboarding', () => {
  const steps: string[] = ['品牌知识', '买家人设', '监测问题', '开始监测']

  const currentStep = ref(0)
  const guideFinished = ref(false)
  const buyerPersonas = ref<BuyerPersona[]>([])
  const selectedMonitoringQuestionIds = ref<string[]>([])
  const customMonitoringQuestions = ref<MonitoringQuestion[]>([])
  const monitoringFrequency = ref<MonitoringFrequency>('weekly')
  const monitoringPlatforms = ref<MonitoringPlatform[]>([])
  const knowledgeItems = ref<KnowledgeItem[]>([
    {
      id: 'brand',
      index: '01',
      title: '品牌信息',
      summary: '等待后端品牌信息',
      requirements: '品牌名称 · 主营行业 · 品牌定位 · 品牌别名',
      brand: { name: '', alias: '', website: '', industry: '', description: '' },
    },
    {
      id: 'product',
      index: '02',
      title: '核心产品',
      summary: '等待后端产品信息',
      requirements: '至少 1 条产品线 · 核心产品* · 使用场景*',
      products: [],
    },
    {
      id: 'market',
      index: '03',
      title: '市场与语言',
      summary: '等待后端市场信息',
      requirements: '目标市场* · 语言*',
      marketLanguage: { market: '', language: '' },
    },
    {
      id: 'competitor',
      index: '04',
      title: '竞争对手',
      summary: '等待后端竞品信息',
      requirements: '竞品名称* · 竞品域名* · 竞品别名 · 竞争说明',
      competitors: [],
    },
  ])

  const isLastStep = computed(() => currentStep.value === steps.length - 1)

  function goNext(): 'advanced' | 'finished' {
    if (!isLastStep.value) {
      currentStep.value += 1
      return 'advanced'
    }
    guideFinished.value = true
    return 'finished'
  }

  function goPrevious() {
    currentStep.value = Math.max(0, currentStep.value - 1)
  }

  function updateKnowledgeItems(items: KnowledgeItem[]) {
    knowledgeItems.value = items.map(item => ({
      ...item,
      brand: item.brand ? { ...item.brand } : undefined,
      products: item.products?.map(product => ({ ...product })),
      marketLanguage: item.marketLanguage ? { ...item.marketLanguage } : undefined,
      competitors: item.competitors?.map(competitor => ({ ...competitor })),
    }))
  }

  function updateBuyerPersonas(items: BuyerPersona[]) {
    buyerPersonas.value = items.map(item => ({ ...item }))
  }

  function updateMonitoringQuestionSelection(ids: string[], limit?: number) {
    selectedMonitoringQuestionIds.value = limitSelectedQuestionIds(ids, selectedMonitoringQuestionIds.value, limit)
  }

  function addCustomMonitoringQuestion(question: MonitoringQuestion) {
    customMonitoringQuestions.value = [...customMonitoringQuestions.value, { ...question }]
  }

  function updateMonitoringFrequency(frequency: MonitoringFrequency) {
    monitoringFrequency.value = frequency
  }

  function updateMonitoringPlatforms(platforms: MonitoringPlatform[]) {
    monitoringPlatforms.value = [...platforms]
  }

  return {
    steps,
    currentStep,
    guideFinished,
    knowledgeItems,
    buyerPersonas,
    selectedMonitoringQuestionIds,
    customMonitoringQuestions,
    monitoringFrequency,
    monitoringPlatforms,
    isLastStep,
    goNext,
    goPrevious,
    updateKnowledgeItems,
    updateBuyerPersonas,
    updateMonitoringQuestionSelection,
    addCustomMonitoringQuestion,
    updateMonitoringFrequency,
    updateMonitoringPlatforms,
  }
})

