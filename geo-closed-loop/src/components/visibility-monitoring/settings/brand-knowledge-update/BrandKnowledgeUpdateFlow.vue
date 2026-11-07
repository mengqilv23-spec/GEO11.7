<script setup lang="ts">
import type { KnowledgeItem } from '../../../../types'
import type { BrandKnowledgeChangeImpact, BrandKnowledgeUpdateService, BrandKnowledgeUpdateSnapshot, MarketRecommendationState } from './types'
import { computed, ref, shallowRef, watch } from 'vue'
import KnowledgeEditorDialog from '../../../onboarding/knowledge/KnowledgeEditorDialog.vue'
import BrandKnowledgeChangeConfirm from './BrandKnowledgeChangeConfirm.vue'
import MarketRecommendationListDialog from './MarketRecommendationListDialog.vue'

type FlowStep = 'editor' | 'confirm' | 'markets' | 'market-editor'

const props = defineProps<{ open: boolean, items: KnowledgeItem[], initialTab: string | undefined, service: BrandKnowledgeUpdateService }>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  'knowledgeCommitted': [items: KnowledgeItem[], snapshot: BrandKnowledgeUpdateSnapshot]
  'processMarket': [marketId: string, market: MarketRecommendationState]
  'marketSelectionSaved': [snapshot: BrandKnowledgeUpdateSnapshot]
  'enableAllMarkets': [snapshot: BrandKnowledgeUpdateSnapshot]
}>()

const step = shallowRef<FlowStep>('editor')
const snapshot = shallowRef<BrandKnowledgeUpdateSnapshot | null>(null)
const impact = shallowRef<BrandKnowledgeChangeImpact | null>(null)
const draftItems = ref<KnowledgeItem[]>([])
const pendingAction = shallowRef<string | null>(null)
const error = shallowRef<string | null>(null)
const retryOperation = shallowRef<(() => Promise<void>) | null>(null)

const editorOpen = computed({
  get: () => props.open && (step.value === 'editor' || step.value === 'confirm'),
  set: (value: boolean) => {
    if (!value)
      closeFlow()
  },
})
const confirmOpen = computed(() => props.open && step.value === 'confirm')
const marketsOpen = computed(() => props.open && step.value === 'markets')

function cloneItems(items: readonly KnowledgeItem[]): KnowledgeItem[] {
  return items.map(item => ({
    ...item,
    brand: item.brand ? { ...item.brand } : undefined,
    products: item.products?.map(product => ({ ...product })),
    marketLanguage: item.marketLanguage ? { ...item.marketLanguage } : undefined,
    competitors: item.competitors?.map(competitor => ({ ...competitor })),
  }))
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '操作失败，请稍后重试。'
}

async function loadSnapshot() {
  pendingAction.value = 'load'
  error.value = null
  try {
    snapshot.value = await props.service.getSnapshot()
    retryOperation.value = null
  }
  catch (cause) {
    error.value = errorMessage(cause)
    retryOperation.value = loadSnapshot
  }
  finally {
    pendingAction.value = null
  }
}

async function previewChange() {
  pendingAction.value = 'preview'
  error.value = null
  impact.value = null
  try {
    impact.value = await props.service.previewChange(cloneItems(draftItems.value))
    retryOperation.value = null
  }
  catch (cause) {
    error.value = errorMessage(cause)
    retryOperation.value = previewChange
  }
  finally {
    pendingAction.value = null
  }
}

async function handleEditorSaved(items: KnowledgeItem[]) {
  draftItems.value = cloneItems(items)
  step.value = 'confirm'
  await previewChange()
}

function returnToEditor() {
  if (pendingAction.value)
    return
  error.value = null
  impact.value = null
  step.value = 'editor'
}

async function confirmChange() {
  if (pendingAction.value || !impact.value?.quotaAvailable)
    return
  pendingAction.value = 'confirm'
  error.value = null
  try {
    const result = await props.service.confirmChange(cloneItems(draftItems.value))
    snapshot.value = result
    emit('knowledgeCommitted', cloneItems(draftItems.value), result)
    step.value = 'markets'
  }
  catch (cause) {
    error.value = errorMessage(cause)
  }
  finally {
    pendingAction.value = null
  }
}

function processMarket(marketId: string) {
  if (pendingAction.value)
    return
  const market = snapshot.value?.markets.find(item => item.id === marketId)
  if (!market)
    return
  step.value = 'market-editor'
  error.value = null
  retryOperation.value = null
  emit('processMarket', marketId, market)
}

function returnToMarketList() {
  if (pendingAction.value)
    return
  error.value = null
  step.value = 'markets'
}

async function saveMarketSelection(marketId: string, candidateIds: string[]) {
  if (pendingAction.value)
    return
  const save = async () => {
    pendingAction.value = `market:${marketId}`
    error.value = null
    try {
      const result = await props.service.saveMarketSelection(marketId, [...candidateIds])
      snapshot.value = result
      retryOperation.value = null
      emit('marketSelectionSaved', result)
      step.value = 'markets'
    }
    catch (cause) {
      error.value = errorMessage(cause)
      retryOperation.value = save
      step.value = 'markets'
    }
    finally {
      pendingAction.value = null
    }
  }
  await save()
}

async function enableAllMarkets() {
  if (pendingAction.value)
    return
  const enable = async () => {
    pendingAction.value = 'enable-all'
    error.value = null
    try {
      const result = await props.service.enableAllMarkets()
      snapshot.value = result
      retryOperation.value = null
      emit('enableAllMarkets', result)
    }
    catch (cause) {
      error.value = errorMessage(cause)
      retryOperation.value = enable
    }
    finally {
      pendingAction.value = null
    }
  }
  await enable()
}

async function retry() {
  if (pendingAction.value)
    return
  await (retryOperation.value ?? loadSnapshot)()
}

function closeFlow() {
  if (!pendingAction.value)
    emit('update:open', false)
}

watch(() => props.open, (isOpen) => {
  if (!isOpen)
    return
  step.value = 'editor'
  draftItems.value = cloneItems(props.items)
  impact.value = null
  error.value = null
  retryOperation.value = null
  void loadSnapshot()
})

defineExpose({ saveMarketSelection, returnToMarketList })
</script>

<template>
  <div class="brand-update-flow">
    <KnowledgeEditorDialog
      v-model:open="editorOpen"
      :items="items"
      :initial-tab="initialTab"
      :close-on-save="false"
      @saved="handleEditorSaved"
      @update:open="value => !value && closeFlow()"
    />
    <BrandKnowledgeChangeConfirm
      :open="confirmOpen"
      :impact="impact"
      :pending="pendingAction !== null"
      :error="error"
      @back="returnToEditor"
      @confirm="confirmChange"
      @retry-preview="retry"
    />
    <MarketRecommendationListDialog
      :open="marketsOpen"
      :snapshot="snapshot"
      :pending-action="pendingAction"
      :error="error"
      @process-market="processMarket"
      @enable-all="enableAllMarkets"
      @close="closeFlow"
      @retry="retry"
    />
  </div>
</template>

<style scoped>
.brand-update-flow { display: contents; }
</style>

