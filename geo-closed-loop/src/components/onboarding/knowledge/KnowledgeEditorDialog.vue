<script setup lang="ts">
import type { BrandProductRecord, CompetitorRecord, RecommendationRecord } from '../../../api/geo-config'
import type { BrandKnowledgeDraft, CompetitorKnowledgeDraft, KnowledgeItem, MarketLanguageDraft, ProductKnowledgeDraft } from '../../../types'
import type { CompetitorRecommendationCandidate } from './CompetitorKnowledgePanel.vue'
import type { KnowledgeTab, KnowledgeValidationResult } from './knowledge-validation'
import type { ProductRecommendationCandidate } from './ProductKnowledgePanel.vue'
import { computed, reactive, ref, shallowRef, watch } from 'vue'
import { confirmRecommendation, generateCompetitorCandidates, getMarketCompetitors, getRecommendationItems } from '../../../api/geo-config'
import { Button, Modal } from '../../ui/ce'
import BrandKnowledgePanel from './BrandKnowledgePanel.vue'
import { persistCompetitorDraft } from './competitor-persistence'
import { buildCompetitorSummary } from './competitor-summary'
import CompetitorKnowledgePanel from './CompetitorKnowledgePanel.vue'
import { validateKnowledgeItems } from './knowledge-validation'
import MarketLanguagePanel from './MarketLanguagePanel.vue'
import { persistProductDraft } from './product-persistence'
import ProductKnowledgePanel from './ProductKnowledgePanel.vue'

const props = defineProps<{
  items: KnowledgeItem[]
  initialTab: string | undefined
  closeOnSave?: boolean
  footerMode?: 'all-tabs' | 'brand-only'
  readOnlyMarket?: boolean
  persistProducts?: boolean
  persistCompetitors?: boolean
  competitorCountLimit?: number | null
  deleteProduct?: (id: string) => Promise<void>
  deleteCompetitor?: (id: string) => Promise<void>
  persistKnowledge?: (items: KnowledgeItem[]) => Promise<void>
}>()

const emit = defineEmits<{
  saved: [items: KnowledgeItem[]]
  productAccepted: [product: BrandProductRecord]
  productSaved: [draft: ProductKnowledgeDraft, record: BrandProductRecord]
  competitorAccepted: [competitor: CompetitorRecord]
  competitorSaved: [draft: CompetitorKnowledgeDraft, record: CompetitorRecord]
}>()

const open = defineModel<boolean>('open', { default: false })
const tabs: Array<{ id: KnowledgeTab, label: string }> = [
  { id: 'brand', label: '品牌信息' },
  { id: 'product', label: '核心产品' },
  { id: 'market', label: '市场与语言' },
  { id: 'competitor', label: '竞争对手' },
]
const activeTab = shallowRef<KnowledgeTab>('brand')
const showFooter = computed(() => props.footerMode !== 'brand-only' || activeTab.value === 'brand')
const draftItems = ref<KnowledgeItem[]>([])
const validation = shallowRef<KnowledgeValidationResult | null>(null)
const activeEditors = reactive({ product: false, competitor: false })
const hasNestedEdit = computed(() => activeEditors.product || activeEditors.competitor)
const recommendations = shallowRef<ProductRecommendationCandidate[]>([])
const recommendationsLoaded = shallowRef(false)
const recommendationsLoading = shallowRef(false)
const acceptingRecommendationId = shallowRef<number | null>(null)
const recommendationError = shallowRef('')
const competitorRecommendations = shallowRef<CompetitorRecommendationCandidate[]>([])
const competitorRecommendationsLoaded = shallowRef(false)
const competitorRecommendationsLoading = shallowRef(false)
const competitorRecommendationsGenerating = shallowRef(false)
const acceptingCompetitorRecommendationId = shallowRef<number | null>(null)
const competitorRecommendationError = shallowRef('')
const savePending = shallowRef(false)
const saveError = shallowRef('')

const mockProductRecommendation: ProductRecommendationCandidate = {
  id: -2026,
  lineName: '三轴水刀切割系统',
  productName: 'APW 三轴水刀切割系统',
  usageScene: '金属板材、石材与玻璃的通用切割',
  sellingPoints: ['切割精度稳定', '支持多种材料', '维护成本可控'],
  targetCustomers: ['金属加工企业', '石材与玻璃加工企业'],
  sourceType: 3,
  isMock: true,
}

function cloneItems(items: readonly KnowledgeItem[]): KnowledgeItem[] {
  return items.map(item => ({
    ...item,
    brand: item.brand ? { ...item.brand } : undefined,
    products: item.products?.map(product => ({ ...product })) ?? (item.id === 'product' ? [] : undefined),
    marketLanguage: item.marketLanguage ? { ...item.marketLanguage } : (item.id === 'market' ? { market: '', language: '' } : undefined),
    competitors: item.competitors?.map(competitor => ({ ...competitor })) ?? (item.id === 'competitor' ? [] : undefined),
  }))
}

function resetDraft() {
  draftItems.value = cloneItems(props.items)
  activeTab.value = tabs.some(tab => tab.id === props.initialTab) ? props.initialTab as KnowledgeTab : 'brand'
  validation.value = null
  activeEditors.product = false
  activeEditors.competitor = false
}

function itemById(id: string) {
  return draftItems.value.find(item => item.id === id)
}

const brandDraft = computed<BrandKnowledgeDraft>({
  get: () => itemById('brand')?.brand ?? { name: '', alias: '', industry: '', description: '' },
  set: (value) => {
    const item = itemById('brand')
    if (item)
      item.brand = value
  },
})
const productDraft = computed<ProductKnowledgeDraft[]>({
  get: () => itemById('product')?.products ?? [],
  set: (value) => {
    const item = itemById('product')
    if (item)
      item.products = value
  },
})
const marketDraft = computed<MarketLanguageDraft>({
  get: () => itemById('market')?.marketLanguage ?? { market: '', language: '' },
  set: (value) => {
    const item = itemById('market')
    if (item)
      item.marketLanguage = value
  },
})
const competitorDraft = computed<CompetitorKnowledgeDraft[]>({
  get: () => itemById('competitor')?.competitors ?? [],
  set: (value) => {
    const item = itemById('competitor')
    if (item)
      item.competitors = value
  },
})

function errorsFor(tab: KnowledgeTab) {
  return validation.value?.tab === tab ? validation.value.errors : {}
}

function handleTabKeydown(event: KeyboardEvent, index: number) {
  let targetIndex: number | undefined
  if (event.key === 'ArrowRight')
    targetIndex = (index + 1) % tabs.length
  else if (event.key === 'ArrowLeft')
    targetIndex = (index - 1 + tabs.length) % tabs.length
  else if (event.key === 'Home')
    targetIndex = 0
  else if (event.key === 'End')
    targetIndex = tabs.length - 1
  if (targetIndex === undefined)
    return
  event.preventDefault()
  activeTab.value = tabs[targetIndex].id
  document.getElementById(`knowledge-tab-${activeTab.value}`)?.focus()
}

function parseRecommendation(record: RecommendationRecord): ProductRecommendationCandidate | null {
  let payload: unknown
  try {
    payload = JSON.parse(record.itemPayload)
  }
  catch {
    return null
  }
  if (!payload || typeof payload !== 'object')
    return null
  const candidate = payload as Record<string, unknown>
  if (typeof candidate.lineName !== 'string' || typeof candidate.productName !== 'string')
    return null

  return {
    id: record.id,
    lineName: candidate.lineName,
    productName: candidate.productName,
    usageScene: typeof candidate.usageScene === 'string' ? candidate.usageScene : '',
    sellingPoints: Array.isArray(candidate.sellingPoints) ? candidate.sellingPoints.filter((item): item is string => typeof item === 'string') : [],
    targetCustomers: Array.isArray(candidate.targetCustomers) ? candidate.targetCustomers.filter((item): item is string => typeof item === 'string') : [],
    sourceType: typeof candidate.sourceType === 'number' ? candidate.sourceType : null,
  }
}

function parseCompetitorRecommendation(record: RecommendationRecord): CompetitorRecommendationCandidate | null {
  let payload: unknown
  try {
    payload = JSON.parse(record.itemPayload)
  }
  catch {
    return null
  }
  if (!payload || typeof payload !== 'object')
    return null
  const candidate = payload as Record<string, unknown>
  const competitorName = typeof candidate.competitorName === 'string' ? candidate.competitorName : typeof candidate.name === 'string' ? candidate.name : ''
  if (!competitorName)
    return null
  return {
    id: record.id,
    competitorName,
    domain: typeof candidate.domain === 'string' ? candidate.domain : '',
    aliasNames: typeof candidate.aliasNames === 'string' ? candidate.aliasNames : '',
    competitorDesc: typeof candidate.competitorDesc === 'string' ? candidate.competitorDesc : '',
  }
}

async function loadProductRecommendations() {
  if (recommendationsLoading.value)
    return
  recommendationsLoading.value = true
  recommendationError.value = ''
  try {
    const records = await getRecommendationItems({ recommendType: 2, itemStatus: 1 })
    const parsed = records.map(parseRecommendation)
    const validRecommendations = parsed.filter((candidate): candidate is ProductRecommendationCandidate => candidate !== null)
    recommendations.value = validRecommendations.length ? validRecommendations : [{ ...mockProductRecommendation }]
    if (parsed.some(candidate => candidate === null))
      recommendationError.value = '部分推荐数据格式不完整，暂时无法展示。'
  }
  catch (cause) {
    recommendations.value = [{ ...mockProductRecommendation }]
    recommendationError.value = cause instanceof Error ? cause.message : '产品推荐读取失败'
  }
  finally {
    recommendationsLoaded.value = true
    recommendationsLoading.value = false
  }
}

async function loadCompetitorRecommendations() {
  if (competitorRecommendationsLoading.value)
    return
  competitorRecommendationsLoading.value = true
  competitorRecommendationError.value = ''
  try {
    const records = await getRecommendationItems({ recommendType: 3, itemStatus: 1 })
    const parsed = records.map(parseCompetitorRecommendation)
    competitorRecommendations.value = parsed.filter((candidate): candidate is CompetitorRecommendationCandidate => candidate !== null)
    if (parsed.some(candidate => candidate === null))
      competitorRecommendationError.value = '部分推荐数据格式不完整，暂时无法展示。'
  }
  catch (cause) {
    competitorRecommendationError.value = cause instanceof Error ? cause.message : '竞品推荐读取失败'
  }
  finally {
    competitorRecommendationsLoaded.value = true
    competitorRecommendationsLoading.value = false
  }
}

async function generateCompetitorRecommendations() {
  competitorRecommendationsGenerating.value = true
  competitorRecommendationError.value = ''
  try {
    await generateCompetitorCandidates()
    competitorRecommendationsLoaded.value = false
    await loadCompetitorRecommendations()
  }
  catch (cause) {
    competitorRecommendationError.value = cause instanceof Error ? cause.message : '竞品推荐生成失败'
  }
  finally {
    competitorRecommendationsGenerating.value = false
  }
}

async function acceptRecommendation(id: number) {
  const candidate = recommendations.value.find(item => item.id === id)
  if (!candidate || acceptingRecommendationId.value !== null)
    return
  acceptingRecommendationId.value = id
  recommendationError.value = ''
  try {
    const productId = candidate.isMock ? -Date.now() : await confirmRecommendation(id)
    const product: BrandProductRecord = {
      id: productId,
      lineName: candidate.lineName,
      productName: candidate.productName,
      usageScene: candidate.usageScene,
      sellingPoints: candidate.sellingPoints,
      targetCustomers: candidate.targetCustomers,
      sourceType: 3,
      isPrimary: 0,
    }
    productDraft.value = [...productDraft.value, {
      id: String(productId),
      name: candidate.productName,
      useCase: candidate.usageScene,
      strengths: candidate.sellingPoints.join(' · '),
      customerGroup: candidate.targetCustomers.join(' · '),
      isPrimary: false,
    }]
    recommendations.value = recommendations.value.filter(item => item.id !== id)
    emit('productAccepted', product)
  }
  catch (cause) {
    recommendationError.value = cause instanceof Error ? cause.message : '加入核心产品失败'
  }
  finally {
    acceptingRecommendationId.value = null
  }
}

async function acceptCompetitorRecommendation(id: number) {
  const candidate = competitorRecommendations.value.find(item => item.id === id)
  if (!candidate || acceptingCompetitorRecommendationId.value !== null)
    return
  acceptingCompetitorRecommendationId.value = id
  competitorRecommendationError.value = ''
  try {
    const competitorId = await confirmRecommendation(id)
    const records = await getMarketCompetitors()
    const record = records.find(item => item.id === competitorId) ?? {
      id: competitorId,
      competitorName: candidate.competitorName,
      domain: candidate.domain || null,
      aliasNames: candidate.aliasNames || null,
      competitorDesc: candidate.competitorDesc || null,
      isCoreSov: 0,
      sourceType: 3,
      status: 1,
    }
    competitorDraft.value = [...competitorDraft.value, {
      id: String(record.id),
      name: record.competitorName,
      domain: record.domain ?? '',
      alias: record.aliasNames ?? '',
      description: record.competitorDesc ?? '',
      confirmed: record.status === 1,
    }]
    competitorRecommendations.value = competitorRecommendations.value.filter(item => item.id !== id)
    emit('competitorAccepted', record)
  }
  catch (cause) {
    competitorRecommendationError.value = cause instanceof Error ? cause.message : '加入竞品失败'
  }
  finally {
    acceptingCompetitorRecommendationId.value = null
  }
}

async function persistProduct(product: ProductKnowledgeDraft) {
  const result = await persistProductDraft(product)
  emit('productSaved', result.draft, result.record)
  return result.draft
}

async function persistCompetitor(competitor: CompetitorKnowledgeDraft) {
  const result = await persistCompetitorDraft(competitor)
  emit('competitorSaved', result.draft, result.record)
  return result.draft
}

function summaryFor(item: KnowledgeItem) {
  if (item.id === 'brand') {
    const brand = item.brand
    return `${brand?.name.trim() || '未填写品牌'} · ${brand?.industry.trim() || '未填写行业'}`
  }
  if (item.id === 'product') {
    const product = item.products?.[0]
    return product
      ? `${product.name.trim() || '未命名产品'} · ${product.useCase.trim() || '未填写使用场景'}`
      : '尚未添加核心产品'
  }
  if (item.id === 'market') {
    return `${item.marketLanguage?.market || '未设置市场'} · ${item.marketLanguage?.language || '未设置语言'}`
  }
  return buildCompetitorSummary(item.competitors ?? [], props.competitorCountLimit)
}

async function save() {
  if (savePending.value)
    return
  if (props.footerMode !== 'brand-only') {
    validation.value = validateKnowledgeItems(draftItems.value)
    if (validation.value) {
      activeTab.value = validation.value.tab
      document.getElementById(`knowledge-tab-${activeTab.value}`)?.focus()
      return
    }
  }
  if (hasNestedEdit.value)
    return

  const saved = cloneItems(draftItems.value).map(item => ({ ...item, summary: summaryFor(item) }))
  saveError.value = ''
  savePending.value = true
  try {
    await props.persistKnowledge?.(saved)
    emit('saved', saved)
    if (props.footerMode === 'brand-only' || props.closeOnSave !== false)
      open.value = false
  }
  catch (cause) {
    saveError.value = cause instanceof Error ? cause.message : '品牌知识保存失败，请稍后重试。'
  }
  finally {
    savePending.value = false
  }
}

watch([open, () => props.initialTab], ([isOpen]) => {
  if (isOpen)
    resetDraft()
})

watch([open, activeTab], ([isOpen, tab]) => {
  if (!isOpen) {
    recommendationsLoaded.value = false
    recommendations.value = []
    recommendationError.value = ''
    competitorRecommendationsLoaded.value = false
    competitorRecommendations.value = []
    competitorRecommendationError.value = ''
    return
  }
  if (tab === 'product' && !recommendationsLoaded.value)
    void loadProductRecommendations()
  if (tab === 'competitor' && !competitorRecommendationsLoaded.value)
    void loadCompetitorRecommendations()
})
</script>

<template>
  <Modal
    v-model:open="open"
    class="knowledge-editor-modal"
    title="维护品牌知识"
    width="min(900px, calc(100vw - 40px))"
    :footer="showFooter ? undefined : null"
    confirm-text="保存"
    cancel-text="取消"
    processing-text="保存中…"
    close-label="关闭品牌知识编辑"
  >
    <div class="knowledge-editor">
      <nav class="knowledge-editor__tabs" role="tablist" aria-label="品牌知识模块">
        <button
          v-for="(tab, index) in tabs"
          :id="`knowledge-tab-${tab.id}`"
          :key="tab.id"
          type="button"
          role="tab"
          class="knowledge-editor__tab"
          :class="{ 'knowledge-editor__tab--active': activeTab === tab.id }"
          :aria-selected="activeTab === tab.id"
          :aria-controls="`knowledge-panel-${tab.id}`"
          :tabindex="activeTab === tab.id ? 0 : -1"
          @click="activeTab = tab.id"
          @keydown="handleTabKeydown($event, index)"
        >
          {{ tab.label }}
        </button>
      </nav>

      <div class="knowledge-editor__content">
        <div v-show="activeTab === 'brand'" id="knowledge-panel-brand" class="knowledge-editor__panel" role="tabpanel" aria-labelledby="knowledge-tab-brand" tabindex="0">
          <BrandKnowledgePanel v-model="brandDraft" :errors="errorsFor('brand')" />
        </div>
        <div v-show="activeTab === 'product'" id="knowledge-panel-product" class="knowledge-editor__panel" role="tabpanel" aria-labelledby="knowledge-tab-product" tabindex="0">
          <ProductKnowledgePanel
            v-model="productDraft"
            :errors="errorsFor('product')"
            :recommendations="recommendations"
            :recommendations-loaded="recommendationsLoaded"
            :recommendations-loading="recommendationsLoading"
            :accepting-recommendation-id="acceptingRecommendationId"
            :recommendation-error="recommendationError"
            :persist-product="props.persistProducts ? persistProduct : undefined"
            :delete-product="props.deleteProduct"
            @editing-change="activeEditors.product = $event"
            @accept-recommendation="acceptRecommendation"
          />
        </div>
        <div v-show="activeTab === 'market'" id="knowledge-panel-market" class="knowledge-editor__panel" role="tabpanel" aria-labelledby="knowledge-tab-market" tabindex="0">
          <MarketLanguagePanel v-model="marketDraft" :errors="errorsFor('market')" :read-only="props.readOnlyMarket" />
        </div>
        <div v-show="activeTab === 'competitor'" id="knowledge-panel-competitor" class="knowledge-editor__panel" role="tabpanel" aria-labelledby="knowledge-tab-competitor" tabindex="0">
          <CompetitorKnowledgePanel
            v-model="competitorDraft"
            :errors="errorsFor('competitor')"
            :competitor-count-limit="props.competitorCountLimit"
            :recommendations="competitorRecommendations"
            :recommendations-loaded="competitorRecommendationsLoaded"
            :recommendations-loading="competitorRecommendationsLoading"
            :recommendations-generating="competitorRecommendationsGenerating"
            :accepting-recommendation-id="acceptingCompetitorRecommendationId"
            :recommendation-error="competitorRecommendationError"
            :persist-competitor="props.persistCompetitors ? persistCompetitor : undefined"
            :delete-competitor="props.deleteCompetitor"
            @editing-change="activeEditors.competitor = $event"
            @generate-recommendations="generateCompetitorRecommendations"
            @accept-recommendation="acceptCompetitorRecommendation"
          />
        </div>
      </div>

      <p v-if="hasNestedEdit" class="knowledge-editor__notice" role="status">
        请先保存或取消当前产品 / 竞品的修改。
      </p>
      <p v-if="saveError" class="knowledge-editor__error" role="alert">
        {{ saveError }}
      </p>
    </div>

    <template v-if="showFooter" #footer>
      <Button v-if="props.footerMode !== 'brand-only'" variant="outline" :disabled="savePending" @click="open = false">
        取消
      </Button>
      <Button variant="primary" :disabled="hasNestedEdit" :loading="savePending" @click="save">
        保存
      </Button>
    </template>
  </Modal>
</template>

<style scoped>
.knowledge-editor {
  min-width: 0;
  --font-size-section-title: 15px;
  --font-size-body: 13px;
  --line-height-body: 20px;
  --line-height-caption: 18px;
  --space-3: 8px;
  --space-4: 12px;
  --space-5: 16px;
  --space-6: 20px;
}
.knowledge-editor__tabs {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: var(--space-1);
  overflow-x: auto;
  margin: 0 calc(-1 * var(--space-6));
  padding: 0 var(--space-6) var(--space-2);
  border-bottom: 1px solid var(--border-divider);
  background: var(--background-primary);
  scrollbar-width: thin;
}
.knowledge-editor__tab {
  flex: 0 0 auto;
  min-width: 0;
  min-height: 36px;
  padding: var(--space-2) var(--space-3);
  border: 1px solid transparent;
  border-radius: var(--radius-control);
  color: var(--text-secondary);
  background: transparent;
  font: inherit;
  font-size: var(--font-size-body);
  font-weight: var(--weight-medium);
  white-space: nowrap;
  cursor: pointer;
  transition: color 140ms ease, background-color 140ms ease, border-color 140ms ease;
}
.knowledge-editor__tab:hover { color: var(--text-primary); background: var(--background-hover); }
.knowledge-editor__tab:focus-visible { z-index: 1; outline: 2px solid var(--focus-ring); outline-offset: -2px; }
.knowledge-editor__tab--active {
  border-color: color-mix(in srgb, var(--action-accent) 18%, transparent);
  color: var(--action-accent);
  background: color-mix(in srgb, var(--action-accent) 8%, var(--background-primary));
  font-weight: var(--weight-semibold);
}
.knowledge-editor__content { padding: var(--space-3) 0 0; }
.knowledge-editor__panel { min-width: 0; outline: none; }
.knowledge-editor__notice { margin: var(--space-4) 0 0; padding: var(--space-3) var(--space-4); border-radius: var(--radius-control); color: var(--status-warning-foreground); background: var(--status-warning-background); font-size: var(--font-size-caption); line-height: var(--line-height-caption); }
.knowledge-editor__error { margin: var(--space-3) 0 0; color: var(--status-error); font-size: var(--font-size-caption); line-height: var(--line-height-caption); }
:global(dialog.ce-modal-root.knowledge-editor-modal) { max-height: min(520px, calc(100dvh - 48px)); }
:global(dialog.ce-modal-root.knowledge-editor-modal .ce-modal) { max-height: min(520px, calc(100dvh - 48px)); }
:global(dialog.ce-modal-root.knowledge-editor-modal .ce-modal-header) { --modal-inset: 20px; padding: var(--space-4) var(--space-5) var(--space-2); }
:global(dialog.ce-modal-root.knowledge-editor-modal .ce-modal-body) {
  padding: 0 var(--space-5) var(--space-6);
  scrollbar-color: var(--border-default) transparent;
  scrollbar-width: thin;
}
:global(dialog.ce-modal-root.knowledge-editor-modal .ce-modal-body::-webkit-scrollbar) { width: 6px; }
:global(dialog.ce-modal-root.knowledge-editor-modal .ce-modal-body::-webkit-scrollbar-thumb) { border-radius: 999px; background: var(--border-default); }
:global(dialog.ce-modal-root.knowledge-editor-modal .ce-modal-body::-webkit-scrollbar-track) { background: transparent; }
:global(dialog.ce-modal-root.knowledge-editor-modal .ce-modal-footer) {
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5) var(--space-4);
  border-top: 1px solid var(--border-divider);
  background: var(--background-primary);
}
:global(dialog.ce-modal-root.knowledge-editor-modal .ce-modal-footer .ce-button) {
  min-height: 36px;
  padding-inline: 14px;
  font-size: 13px;
  line-height: 20px;
}
:deep(.knowledge-editor__panel .knowledge-section) { gap: var(--space-4); }
@media (max-width: 600px) {
  :global(dialog.ce-modal-root.knowledge-editor-modal .ce-modal-header) { padding-inline: var(--space-4); }
  :global(dialog.ce-modal-root.knowledge-editor-modal .ce-modal-body) { padding-inline: var(--space-4); }
  :global(dialog.ce-modal-root.knowledge-editor-modal .ce-modal-footer) { padding-inline: var(--space-4); }
  .knowledge-editor__tabs { margin-right: calc(-1 * var(--space-4)); margin-left: calc(-1 * var(--space-4)); padding-right: var(--space-4); padding-left: var(--space-4); }
  .knowledge-editor__tab { padding-right: var(--space-3); padding-left: var(--space-3); }
}
</style>

