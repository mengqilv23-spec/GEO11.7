<script setup lang="ts">
import type { ProductKnowledgeDraft } from '../../../types'
import type { DropdownSelectOption } from '../../ui/ce'
import { computed, reactive, shallowRef } from 'vue'
import { Button, DropdownSelect, Input, Tag } from '../../ui/ce'
import Spinner from '../../ui/ce/spinner/Spinner.vue'
import AppIcon from '../../ui/icons/AppIcon.vue'
import Textarea from '../../ui/Textarea.vue'

export interface ProductRecommendationCandidate {
  id: number
  lineName: string
  productName: string
  usageScene: string
  sellingPoints: string[]
  targetCustomers: string[]
  sourceType?: number | null
  isMock?: boolean
}

const props = withDefaults(defineProps<{
  errors: Record<string, string>
  recommendations?: ProductRecommendationCandidate[]
  recommendationsLoaded?: boolean
  recommendationsLoading?: boolean
  acceptingRecommendationId?: number | null
  recommendationError?: string
  persistProduct?: (product: ProductKnowledgeDraft) => Promise<ProductKnowledgeDraft>
  deleteProduct?: (id: string) => Promise<void>
}>(), {
  recommendations: () => [],
  recommendationsLoaded: false,
  recommendationsLoading: false,
  acceptingRecommendationId: null,
  recommendationError: '',
})
const emit = defineEmits<{
  editingChange: [editing: boolean]
  acceptRecommendation: [id: number]
  productPersisted: [product: ProductKnowledgeDraft]
}>()
const products = defineModel<ProductKnowledgeDraft[]>({ required: true })

const editingId = shallowRef<string | null>(null)
const draft = shallowRef<ProductKnowledgeDraft | null>(null)
const draftErrors = reactive<Record<string, string>>({})
const savingProduct = shallowRef(false)
const saveError = shallowRef('')
const deletingProductId = shallowRef<string | null>(null)
const deleteError = shallowRef('')
const primaryOptions: DropdownSelectOption[] = [
  { value: 'true', label: '是' },
  { value: 'false', label: '否' },
]
const primaryValue = computed({
  get: () => draft.value?.isPrimary ? 'true' : 'false',
  set: (value) => {
    if (draft.value)
      draft.value.isPrimary = value === 'true'
  },
})

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function clearError(field: string) {
  delete draftErrors[field]
}

function startAdd() {
  draft.value = { id: newId('product'), name: '', useCase: '', strengths: '', customerGroup: '', isPrimary: products.value.length === 0 }
  editingId.value = 'new'
  clearDraftErrors()
  emit('editingChange', true)
}

function startEdit(item: ProductKnowledgeDraft) {
  draft.value = { ...item }
  editingId.value = item.id
  clearDraftErrors()
  emit('editingChange', true)
}

function clearDraftErrors() {
  for (const key of Object.keys(draftErrors)) delete draftErrors[key]
}

function cancelEdit() {
  if (savingProduct.value)
    return
  draft.value = null
  editingId.value = null
  clearDraftErrors()
  emit('editingChange', false)
}

async function saveEdit() {
  if (!draft.value)
    return
  clearDraftErrors()
  if (!draft.value.name.trim())
    draftErrors.name = '请输入核心产品'
  if (!draft.value.useCase.trim())
    draftErrors.useCase = '请输入使用场景'
  if (Object.keys(draftErrors).length)
    return

  saveError.value = ''
  savingProduct.value = true
  try {
    const saved = props.persistProduct ? await props.persistProduct({ ...draft.value }) : { ...draft.value }
    const originalId = editingId.value
    const next = originalId === 'new'
      ? [...products.value, saved]
      : products.value.map(item => item.id === originalId ? saved : { ...item })
    if (saved.isPrimary)
      next.forEach(item => item.isPrimary = item.id === saved.id)
    products.value = next
    if (props.persistProduct)
      emit('productPersisted', saved)
    draft.value = null
    editingId.value = null
    clearDraftErrors()
    emit('editingChange', false)
  }
  catch (cause) {
    saveError.value = cause instanceof Error ? cause.message : '产品保存失败，请稍后重试。'
  }
  finally {
    savingProduct.value = false
  }
}

async function removeProduct(id: string) {
  if (deletingProductId.value)
    return
  deleteError.value = ''
  deletingProductId.value = id
  try {
    await props.deleteProduct?.(id)
    products.value = products.value.filter(item => item.id !== id)
  }
  catch (cause) {
    deleteError.value = cause instanceof Error ? cause.message : '核心产品删除失败，请稍后重试。'
  }
  finally {
    deletingProductId.value = null
  }
}

function itemError(id: string, field: 'name' | 'useCase') {
  return props.errors[`product.${id}.${field}`]
}
</script>

<template>
  <section class="knowledge-section" role="group" aria-labelledby="knowledge-tab-product">
    <div class="knowledge-section__heading">
      <div>
        <h3>核心产品</h3>
        <p>至少维护 1 条核心产品信息，用于后续问题生成、内容优化与监测分析。</p>
      </div>
      <div class="knowledge-section__actions">
        <span class="knowledge-count">已维护 {{ products.length }} 条 <span aria-hidden="true">/</span> 至少 1 条</span>
        <Button variant="outline" :disabled="editingId !== null" @click="startAdd">
          <AppIcon name="add" :size="14" aria-hidden="true" /> 新增核心产品
        </Button>
      </div>
    </div>
    <p v-if="props.errors.products" class="knowledge-field__error" role="alert">
      {{ props.errors.products }}
    </p>

    <div class="knowledge-list knowledge-list--products">
      <article v-for="item in products" :key="item.id" class="knowledge-entry">
        <template v-if="editingId === item.id && draft">
          <header class="knowledge-entry__header">
            <div>
              <h4>编辑核心产品</h4>
              <Tag v-if="draft.isPrimary" tone="green" variant="soft" size="sm">
                主推产品
              </Tag>
            </div>
          </header>
          <div class="knowledge-entry__form">
            <div class="knowledge-field">
              <label :for="`product-name-${item.id}`">核心产品 <span aria-hidden="true">*</span></label>
              <Input :id="`product-name-${item.id}`" v-model="draft.name" :aria-invalid="Boolean(draftErrors.name || itemError(item.id, 'name'))" :aria-describedby="draftErrors.name ? `product-name-error-${item.id}` : undefined" @update:model-value="clearError('name')" />
              <p v-if="draftErrors.name || itemError(item.id, 'name')" :id="`product-name-error-${item.id}`" class="knowledge-field__error" role="alert">
                {{ draftErrors.name || itemError(item.id, 'name') }}
              </p>
            </div>
            <div class="knowledge-field">
              <label :for="`product-use-${item.id}`">使用场景 <span aria-hidden="true">*</span></label>
              <Input :id="`product-use-${item.id}`" v-model="draft.useCase" :aria-invalid="Boolean(draftErrors.useCase || itemError(item.id, 'useCase'))" :aria-describedby="draftErrors.useCase ? `product-use-error-${item.id}` : undefined" @update:model-value="clearError('useCase')" />
              <p v-if="draftErrors.useCase || itemError(item.id, 'useCase')" :id="`product-use-error-${item.id}`" class="knowledge-field__error" role="alert">
                {{ draftErrors.useCase || itemError(item.id, 'useCase') }}
              </p>
            </div>
            <div class="knowledge-field knowledge-field--wide">
              <label :for="`product-strengths-${item.id}`">核心能力 / 卖点</label>
              <Textarea :id="`product-strengths-${item.id}`" v-model="draft.strengths" :rows="3" />
            </div>
            <div class="knowledge-field knowledge-field--wide">
              <label :for="`product-customer-${item.id}`">客户群体</label>
              <Input :id="`product-customer-${item.id}`" v-model="draft.customerGroup" />
            </div>
            <div class="knowledge-field knowledge-field--wide">
              <label :id="`product-primary-label-${item.id}`">是否是主推产品</label>
              <DropdownSelect v-model="primaryValue" :options="primaryOptions" v-bind="{ ariaLabel: '是否是主推产品', ariaLabelledby: `product-primary-label-${item.id}` }" />
            </div>
          </div>
          <footer class="knowledge-entry__actions">
            <p v-if="saveError" class="knowledge-field__error" role="alert">
              {{ saveError }}
            </p>
            <Button variant="secondary" :disabled="savingProduct" @click="cancelEdit">
              取消
            </Button>
            <Button variant="primary" :loading="savingProduct" @click="saveEdit">
              保存修改
            </Button>
          </footer>
        </template>
        <template v-else>
          <header class="knowledge-entry__header">
            <div class="knowledge-entry__title">
              <h4>{{ item.name || '未命名产品' }}</h4>
              <Tag v-if="item.isPrimary" tone="green" variant="soft" size="sm">
                主推产品
              </Tag>
            </div>
            <div class="knowledge-entry__actions knowledge-entry__actions--top">
              <Button variant="outline" @click="startEdit(item)">
                编辑
              </Button>
              <Button variant="outline" tone="danger" :loading="deletingProductId === item.id" :disabled="deletingProductId !== null && deletingProductId !== item.id" @click="removeProduct(item.id)">
                删除
              </Button>
            </div>
          </header>
          <p v-if="deleteError" class="knowledge-field__error" role="alert">
            {{ deleteError }}
          </p>
          <dl class="knowledge-entry__details">
            <dt>核心产品 <span aria-hidden="true">*</span></dt><dd>{{ item.name || '—' }}</dd>
            <dt>使用场景 <span aria-hidden="true">*</span></dt><dd>{{ item.useCase || '—' }}</dd>
            <dt>核心能力 / 卖点</dt><dd>{{ item.strengths || '—' }}</dd>
            <dt>客户群体</dt><dd>{{ item.customerGroup || '—' }}</dd>
            <dt>是否是主推产品</dt><dd>{{ item.isPrimary ? '是' : '否' }}</dd>
          </dl>
        </template>
      </article>

      <article v-if="editingId === 'new' && draft" class="knowledge-entry">
        <header class="knowledge-entry__header">
          <h4>新增核心产品</h4>
        </header>
        <div class="knowledge-entry__form">
          <div class="knowledge-field">
            <label for="new-product-name">核心产品 <span aria-hidden="true">*</span></label><Input id="new-product-name" v-model="draft.name" :aria-invalid="Boolean(draftErrors.name)" @update:model-value="clearError('name')" /><p v-if="draftErrors.name" class="knowledge-field__error" role="alert">
              {{ draftErrors.name }}
            </p>
          </div>
          <div class="knowledge-field">
            <label for="new-product-use">使用场景 <span aria-hidden="true">*</span></label><Input id="new-product-use" v-model="draft.useCase" :aria-invalid="Boolean(draftErrors.useCase)" @update:model-value="clearError('useCase')" /><p v-if="draftErrors.useCase" class="knowledge-field__error" role="alert">
              {{ draftErrors.useCase }}
            </p>
          </div>
          <div class="knowledge-field knowledge-field--wide">
            <label for="new-product-strengths">核心能力 / 卖点</label><Textarea id="new-product-strengths" v-model="draft.strengths" :rows="3" />
          </div>
          <div class="knowledge-field knowledge-field--wide">
            <label for="new-product-customer">客户群体</label><Input id="new-product-customer" v-model="draft.customerGroup" />
          </div>
          <div class="knowledge-field knowledge-field--wide">
            <label id="new-product-primary-label">是否是主推产品</label><DropdownSelect v-model="primaryValue" :options="primaryOptions" v-bind="{ ariaLabel: '是否是主推产品', ariaLabelledby: 'new-product-primary-label' }" />
          </div>
        </div>
        <footer class="knowledge-entry__actions">
          <p v-if="saveError" class="knowledge-field__error" role="alert">
            {{ saveError }}
          </p>
          <Button variant="secondary" :disabled="savingProduct" @click="cancelEdit">
            取消
          </Button><Button variant="primary" :loading="savingProduct" @click="saveEdit">
            保存修改
          </Button>
        </footer>
      </article>
    </div>

    <section class="product-recommendations" aria-labelledby="product-recommendations-title">
      <header class="product-recommendations__header">
        <h4 id="product-recommendations-title">
          <span aria-hidden="true">✦</span> AI推荐产品
        </h4>
      </header>
      <p v-if="recommendationError" class="product-recommendations__error" role="alert">
        {{ recommendationError }}
      </p>
      <p v-if="recommendationsLoading" class="product-recommendations__state" role="status">
        <Spinner variant="ring" aria-hidden="true" />
      </p>
      <div v-else-if="props.recommendations.length" class="product-recommendations__grid">
        <article v-for="candidate in props.recommendations" :key="candidate.id" class="product-recommendation">
          <h5>{{ candidate.productName }}</h5>
          <Tag tone="purple" variant="soft" size="sm">
            {{ candidate.sourceType === 1 ? 'AI 完善' : 'AI 推荐' }}
          </Tag>
          <dl class="product-recommendation__details">
            <dt>使用场景</dt><dd>{{ candidate.usageScene || '—' }}</dd>
            <dt>核心卖点</dt><dd>{{ candidate.sellingPoints.join(' · ') || '—' }}</dd>
            <dt>客户群体</dt><dd>{{ candidate.targetCustomers.join(' · ') || '—' }}</dd>
          </dl>
          <Button
            :data-test="`accept-product-${candidate.id}`"
            class="product-recommendation__accept"
            variant="outline"
            :loading="props.acceptingRecommendationId === candidate.id"
            :disabled="(props.acceptingRecommendationId !== null && props.acceptingRecommendationId !== candidate.id) || editingId !== null"
            @click="emit('acceptRecommendation', candidate.id)"
          >
            加入核心产品
          </Button>
        </article>
      </div>
    </section>
  </section>
</template>

<style scoped>
.knowledge-section { display: grid; gap: var(--space-5); }
.knowledge-section__heading,.knowledge-entry__header,.knowledge-entry__actions { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
.knowledge-section__heading h3,.knowledge-entry__header h4 { margin: 0; color: var(--text-primary); font-size: var(--font-size-section-title); line-height: var(--line-height-section-title); font-weight: var(--weight-semibold); }
.knowledge-section__heading p { margin: var(--space-1) 0 0; color: var(--text-secondary); font-size: var(--font-size-body); line-height: var(--line-height-body); }
.knowledge-section__actions,.knowledge-entry__actions { display: flex; align-items: center; gap: var(--space-2); flex: none; }
.knowledge-count { color: var(--text-secondary); font-size: var(--font-size-caption); line-height: var(--line-height-caption); }
.knowledge-list { display: grid; gap: var(--space-4); }
.knowledge-list--products { grid-template-columns: 1fr; }
.knowledge-entry { min-width: 0; padding: var(--space-5); border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--background-primary); }
.knowledge-entry__header { padding-bottom: var(--space-4); border-bottom: 1px solid var(--border-divider); }
.knowledge-entry__title { display: grid; justify-items: start; gap: var(--space-2); min-width: 0; }
.knowledge-entry__form { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: var(--space-4); padding-top: var(--space-4); }
.knowledge-field { display: grid; align-content: start; gap: var(--space-2); min-width: 0; }
.knowledge-field--wide { grid-column: 1 / -1; }
.knowledge-field label { color: var(--text-secondary); font-size: var(--font-size-caption); line-height: var(--line-height-caption); }
.knowledge-field label span,.knowledge-entry__details dt span { color: var(--status-error); }
.knowledge-field__error { margin: 0; color: var(--status-error); font-size: var(--font-size-caption); line-height: var(--line-height-caption); }
.knowledge-entry__actions { justify-content: flex-end; margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--border-divider); }
.knowledge-entry__actions--top { margin-top: 0; padding-top: 0; border-top: 0; }
.knowledge-entry__details { display: grid; grid-template-columns: 104px minmax(0,1fr); column-gap: var(--space-2); row-gap: var(--space-2); margin: var(--space-4) 0 0; }
.knowledge-entry__details dt { color: var(--text-muted); font-size: var(--font-size-caption); line-height: var(--line-height-caption); }
.knowledge-entry__details dd { margin: 0; color: var(--text-primary); font-size: var(--font-size-body); line-height: var(--line-height-body); overflow-wrap: anywhere; }
.product-recommendations { display: grid; gap: var(--space-4); margin-top: var(--space-5); padding-top: var(--space-5); border-top: 1px solid var(--border-divider); }
.product-recommendations__header { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
.product-recommendations__header h4 { margin: 0; color: var(--text-primary); font-size: var(--font-size-section-title); line-height: var(--line-height-section-title); }
.product-recommendations__header h4 span { margin-right: var(--space-2); color: var(--action-accent); }
.product-recommendations__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); }
.product-recommendation { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-2); min-width: 0; padding: var(--space-4); border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--background-primary); }
.product-recommendation h5 { margin: 0; color: var(--text-primary); font-size: var(--font-size-body); line-height: var(--line-height-body); }
.product-recommendation__details { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: var(--space-2) var(--space-3); width: 100%; margin: 0; }
.product-recommendation__details dt { color: var(--text-muted); font-size: var(--font-size-caption); }
.product-recommendation__details dd { margin: 0; color: var(--text-primary); font-size: var(--font-size-caption); line-height: var(--line-height-caption); overflow-wrap: anywhere; }
.product-recommendation__accept { width: 100%; margin-top: auto; color: var(--action-accent); background: var(--action-subtle-background); }
.product-recommendations__state { margin: 0; color: var(--text-secondary); font-size: var(--font-size-body); }
.product-recommendations__state { display: flex; min-height: 48px; align-items: center; justify-content: center; --spinner-color: var(--action-accent); }
.product-recommendations__error { margin: 0; color: var(--status-error); font-size: var(--font-size-caption); }
@media (max-width: 760px) { .knowledge-section__heading { align-items: flex-start; flex-direction: column; } .knowledge-section__actions { flex-wrap: wrap; } }
@media (max-width: 520px) { .knowledge-entry__form { grid-template-columns: 1fr; } .knowledge-field--wide { grid-column: auto; } .knowledge-entry__details { grid-template-columns: 1fr; gap: var(--space-1); } .knowledge-entry__details dd + dt { margin-top: var(--space-2); } .knowledge-entry__header { align-items: flex-start; } .knowledge-entry__actions--top { flex-wrap: wrap; } .product-recommendations__header { align-items: flex-start; flex-direction: column; } .product-recommendations__grid { grid-template-columns: 1fr; } }
</style>

