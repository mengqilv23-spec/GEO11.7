<script setup lang="ts">
import type { CompetitorKnowledgeDraft } from '../../../types'
import { reactive, shallowRef } from 'vue'
import { Button, Input, Tag } from '../../ui/ce'
import Spinner from '../../ui/ce/spinner/Spinner.vue'
import AppIcon from '../../ui/icons/AppIcon.vue'
import Textarea from '../../ui/Textarea.vue'

export interface CompetitorRecommendationCandidate {
  id: number
  competitorName: string
  domain: string
  aliasNames: string
  competitorDesc: string
}

const props = withDefaults(defineProps<{
  errors: Record<string, string>
  competitorCountLimit?: number | null
  recommendations?: CompetitorRecommendationCandidate[]
  recommendationsLoaded?: boolean
  recommendationsLoading?: boolean
  recommendationsGenerating?: boolean
  acceptingRecommendationId?: number | null
  recommendationError?: string
  persistCompetitor?: (competitor: CompetitorKnowledgeDraft) => Promise<CompetitorKnowledgeDraft>
  deleteCompetitor?: (id: string) => Promise<void>
}>(), {
  recommendations: () => [],
  competitorCountLimit: null,
  recommendationsLoaded: false,
  recommendationsLoading: false,
  recommendationsGenerating: false,
  acceptingRecommendationId: null,
  recommendationError: '',
})
const emit = defineEmits<{
  editingChange: [editing: boolean]
  generateRecommendations: []
  acceptRecommendation: [id: number]
  competitorPersisted: [competitor: CompetitorKnowledgeDraft]
}>()
const competitors = defineModel<CompetitorKnowledgeDraft[]>({ required: true })

const monogramColors = ['blue', 'green', 'amber', 'rose', 'violet', 'cyan', 'orange', 'slate'] as const

function monogramColorClass(id: string | number) {
  let hash = 0
  for (const character of String(id))
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  return `competitor-monogram--${monogramColors[hash % monogramColors.length]}`
}

const editingId = shallowRef<string | null>(null)
const draft = shallowRef<CompetitorKnowledgeDraft | null>(null)
const draftErrors = reactive<Record<string, string>>({})
const savingCompetitor = shallowRef(false)
const saveError = shallowRef('')
const deletingCompetitorId = shallowRef<string | null>(null)
const deleteError = shallowRef('')

function clearDraftErrors() {
  for (const key of Object.keys(draftErrors)) delete draftErrors[key]
}

function clearError(field: string) {
  delete draftErrors[field]
}

function startAdd() {
  saveError.value = ''
  draft.value = { id: `competitor-${Date.now()}`, name: '', domain: '', alias: '', description: '', confirmed: false }
  editingId.value = 'new'
  clearDraftErrors()
  emit('editingChange', true)
}

function startEdit(item: CompetitorKnowledgeDraft) {
  saveError.value = ''
  draft.value = { ...item }
  editingId.value = item.id
  clearDraftErrors()
  emit('editingChange', true)
}

function cancelEdit() {
  if (savingCompetitor.value)
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
    draftErrors.name = '请输入竞品名称'
  if (!draft.value.domain.trim())
    draftErrors.domain = '请输入竞品域名'
  if (Object.keys(draftErrors).length)
    return
  saveError.value = ''
  savingCompetitor.value = true
  try {
    const saved = props.persistCompetitor ? await props.persistCompetitor({ ...draft.value }) : { ...draft.value }
    const originalId = editingId.value
    competitors.value = originalId === 'new'
      ? [...competitors.value, saved]
      : competitors.value.map(item => item.id === originalId ? saved : { ...item })
    if (props.persistCompetitor)
      emit('competitorPersisted', saved)
    draft.value = null
    editingId.value = null
    clearDraftErrors()
    emit('editingChange', false)
  }
  catch (cause) {
    saveError.value = cause instanceof Error ? cause.message : '竞品保存失败，请稍后重试。'
  }
  finally {
    savingCompetitor.value = false
  }
}

async function removeCompetitor(id: string): Promise<boolean> {
  if (deletingCompetitorId.value)
    return false
  deleteError.value = ''
  deletingCompetitorId.value = id
  try {
    await props.deleteCompetitor?.(id)
    competitors.value = competitors.value.filter(item => item.id !== id)
    return true
  }
  catch (cause) {
    deleteError.value = cause instanceof Error ? cause.message : '竞品删除失败，请稍后重试。'
    return false
  }
  finally {
    deletingCompetitorId.value = null
  }
}

function itemError(id: string, field: 'name' | 'domain') {
  return props.errors[`competitor.${id}.${field}`]
}
</script>

<template>
  <section class="knowledge-section" role="group" aria-labelledby="knowledge-tab-competitor">
    <div class="knowledge-section__heading">
      <div>
        <h3>竞争对手</h3>
        <p>至少维护 1 个竞品，用于竞品对比分析、品牌提及监测与后续内容评估。</p>
      </div>
      <div class="knowledge-section__actions">
        <span class="knowledge-count">已选择 {{ competitors.length }} 个 <span aria-hidden="true">/</span> {{ props.competitorCountLimit === null ? '套餐上限未返回' : `最多 ${props.competitorCountLimit} 个` }}</span>
        <Button variant="outline" :disabled="editingId !== null" @click="startAdd">
          <AppIcon name="add" :size="14" aria-hidden="true" /> 手动添加竞品
        </Button>
      </div>
    </div>
    <p v-if="props.errors.competitors" class="knowledge-field__error" role="alert">
      {{ props.errors.competitors }}
    </p>

    <div class="knowledge-list knowledge-list--competitors">
      <article v-for="item in competitors" :key="item.id" class="knowledge-entry">
        <template v-if="editingId === item.id && draft">
          <header class="knowledge-entry__header">
            <div class="competitor-identity">
              <span class="competitor-monogram" :class="monogramColorClass(item.id)">{{ item.name.slice(0, 2).toUpperCase() }}</span><div><h4>{{ item.name }}</h4><span>{{ item.domain }}</span></div>
            </div>
            <div class="knowledge-entry__actions knowledge-entry__actions--top">
              <Button variant="outline" tone="danger" :loading="deletingCompetitorId === item.id" :disabled="deletingCompetitorId !== null && deletingCompetitorId !== item.id" @click="removeCompetitor(item.id).then(deleted => deleted && cancelEdit())">
                删除
              </Button>
            </div>
          </header>
          <p v-if="deleteError" class="knowledge-field__error" role="alert">
            {{ deleteError }}
          </p>
          <div class="knowledge-entry__form">
            <div class="knowledge-field">
              <label :for="`competitor-name-${item.id}`">竞品名称 <span aria-hidden="true">*</span></label><Input :id="`competitor-name-${item.id}`" v-model="draft.name" :aria-invalid="Boolean(draftErrors.name || itemError(item.id, 'name'))" :aria-describedby="draftErrors.name ? `competitor-name-error-${item.id}` : undefined" @update:model-value="clearError('name')" /><p v-if="draftErrors.name || itemError(item.id, 'name')" :id="`competitor-name-error-${item.id}`" class="knowledge-field__error" role="alert">
                {{ draftErrors.name || itemError(item.id, 'name') }}
              </p>
            </div>
            <div class="knowledge-field">
              <label :for="`competitor-domain-${item.id}`">竞品域名 <span aria-hidden="true">*</span></label><Input :id="`competitor-domain-${item.id}`" v-model="draft.domain" :aria-invalid="Boolean(draftErrors.domain || itemError(item.id, 'domain'))" :aria-describedby="draftErrors.domain ? `competitor-domain-error-${item.id}` : undefined" @update:model-value="clearError('domain')" /><p v-if="draftErrors.domain || itemError(item.id, 'domain')" :id="`competitor-domain-error-${item.id}`" class="knowledge-field__error" role="alert">
                {{ draftErrors.domain || itemError(item.id, 'domain') }}
              </p>
            </div>
            <div class="knowledge-field knowledge-field--wide">
              <label :for="`competitor-alias-${item.id}`">竞品别名</label><Input :id="`competitor-alias-${item.id}`" v-model="draft.alias" />
            </div>
            <div class="knowledge-field knowledge-field--wide">
              <label :for="`competitor-description-${item.id}`">竞品介绍</label><Textarea :id="`competitor-description-${item.id}`" v-model="draft.description" :rows="3" />
            </div>
          </div>
          <footer class="knowledge-entry__actions">
            <p v-if="saveError" class="knowledge-field__error" role="alert">
              {{ saveError }}
            </p>
            <Button variant="secondary" @click="cancelEdit">
              取消
            </Button><Button variant="primary" :loading="savingCompetitor" @click="saveEdit">
              保存修改
            </Button>
          </footer>
        </template>
        <template v-else>
          <header class="knowledge-entry__header">
            <div class="competitor-identity">
              <span class="competitor-monogram" :class="monogramColorClass(item.id)">{{ item.name.slice(0, 2).toUpperCase() }}</span><div>
                <h4>{{ item.name || '未命名竞品' }}</h4><div class="competitor-identity__meta">
                  <Tag v-if="item.confirmed" tone="green" variant="soft" size="sm">
                    已确认
                  </Tag><span>{{ item.domain || '未填写域名' }}</span>
                </div>
              </div>
            </div>
            <div class="knowledge-entry__actions knowledge-entry__actions--top">
              <Button variant="outline" @click="startEdit(item)">
                编辑
              </Button><Button variant="outline" tone="danger" :loading="deletingCompetitorId === item.id" :disabled="deletingCompetitorId !== null && deletingCompetitorId !== item.id" @click="removeCompetitor(item.id)">
                删除
              </Button>
            </div>
          </header>
          <p v-if="deleteError" class="knowledge-field__error" role="alert">
            {{ deleteError }}
          </p>
          <dl class="knowledge-entry__details">
            <dt>竞品名称 <span aria-hidden="true">*</span></dt><dd>{{ item.name || '—' }}</dd><dt>竞品域名 <span aria-hidden="true">*</span></dt><dd>{{ item.domain || '—' }}</dd><dt>竞品别名</dt><dd>{{ item.alias || '—' }}</dd><dt>竞品介绍</dt><dd>{{ item.description || '—' }}</dd>
          </dl>
        </template>
      </article>

      <article v-if="editingId === 'new' && draft" class="knowledge-entry">
        <header class="knowledge-entry__header">
          <h4>手动添加竞品</h4>
        </header>
        <div class="knowledge-entry__form">
          <div class="knowledge-field">
            <label for="new-competitor-name">竞品名称 <span aria-hidden="true">*</span></label><Input id="new-competitor-name" v-model="draft.name" :aria-invalid="Boolean(draftErrors.name)" @update:model-value="clearError('name')" /><p v-if="draftErrors.name" class="knowledge-field__error" role="alert">
              {{ draftErrors.name }}
            </p>
          </div>
          <div class="knowledge-field">
            <label for="new-competitor-domain">竞品域名 <span aria-hidden="true">*</span></label><Input id="new-competitor-domain" v-model="draft.domain" :aria-invalid="Boolean(draftErrors.domain)" @update:model-value="clearError('domain')" /><p v-if="draftErrors.domain" class="knowledge-field__error" role="alert">
              {{ draftErrors.domain }}
            </p>
          </div>
          <div class="knowledge-field knowledge-field--wide">
            <label for="new-competitor-alias">竞品别名</label><Input id="new-competitor-alias" v-model="draft.alias" />
          </div>
          <div class="knowledge-field knowledge-field--wide">
            <label for="new-competitor-description">竞品介绍</label><Textarea id="new-competitor-description" v-model="draft.description" :rows="3" />
          </div>
        </div>
        <footer class="knowledge-entry__actions">
          <p v-if="saveError" class="knowledge-field__error" role="alert">
            {{ saveError }}
          </p>
          <Button variant="secondary" @click="cancelEdit">
            取消
          </Button><Button variant="primary" :loading="savingCompetitor" @click="saveEdit">
            保存修改
          </Button>
        </footer>
      </article>
    </div>

    <section class="competitor-recommendations" aria-labelledby="competitor-recommendations-title">
      <header class="competitor-recommendations__header">
        <h4 id="competitor-recommendations-title">
          <span aria-hidden="true">✦</span> AI 推荐竞品
        </h4>
        <span>基于品牌、产品、使用场景与目标市场生成</span>
      </header>
      <p v-if="props.recommendationError" class="knowledge-field__error" role="alert">
        {{ props.recommendationError }}
      </p>
      <p v-if="props.recommendationsLoading" class="competitor-recommendations__state" role="status">
        <Spinner variant="ring" aria-hidden="true" />
      </p>
      <div v-else-if="props.recommendations.length" class="competitor-recommendations__grid">
        <article v-for="candidate in props.recommendations" :key="candidate.id" class="competitor-recommendation">
          <header>
            <span class="competitor-monogram" :class="monogramColorClass(candidate.id)">{{ candidate.competitorName.slice(0, 2).toUpperCase() }}</span>
            <div>
              <h5>{{ candidate.competitorName }}</h5>
              <span>{{ candidate.domain || '未提供域名' }}</span>
              <Tag tone="purple" variant="soft" size="sm">
                AI 推荐
              </Tag>
            </div>
          </header>
          <dl class="knowledge-entry__details">
            <dt>竞品名称</dt><dd>{{ candidate.competitorName }}</dd>
            <dt>竞品域名</dt><dd>{{ candidate.domain || '—' }}</dd>
            <dt>竞品别名</dt><dd>{{ candidate.aliasNames || '—' }}</dd>
            <dt>竞品介绍</dt><dd>{{ candidate.competitorDesc || '—' }}</dd>
          </dl>
          <Button
            :data-test="`accept-competitor-${candidate.id}`"
            variant="outline"
            :loading="props.acceptingRecommendationId === candidate.id"
            :disabled="(props.acceptingRecommendationId !== null && props.acceptingRecommendationId !== candidate.id) || editingId !== null"
            @click="emit('acceptRecommendation', candidate.id)"
          >
            选择竞品
          </Button>
        </article>
      </div>
      <div v-else-if="props.recommendationsLoaded" class="competitor-recommendations__empty">
        <p>暂无待确认的竞品推荐</p>
        <Button data-test="generate-competitor-recommendations" variant="outline" :loading="props.recommendationsGenerating" :disabled="editingId !== null" @click="emit('generateRecommendations')">
          生成竞品推荐
        </Button>
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
.knowledge-list--competitors { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.knowledge-entry { min-width: 0; padding: var(--space-5); border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--background-primary); }
.knowledge-entry__header { padding-bottom: var(--space-4); border-bottom: 1px solid var(--border-divider); }
.knowledge-field { display: grid; align-content: start; gap: var(--space-2); min-width: 0; }
.knowledge-entry__form { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: var(--space-4); padding-top: var(--space-4); }
.knowledge-field--wide { grid-column: 1 / -1; }
.knowledge-field label { color: var(--text-secondary); font-size: var(--font-size-caption); line-height: var(--line-height-caption); }
.knowledge-field label span,.knowledge-entry__details dt span { color: var(--status-error); }
.knowledge-field__error { margin: 0; color: var(--status-error); font-size: var(--font-size-caption); line-height: var(--line-height-caption); }
.knowledge-entry__actions { justify-content: flex-end; margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--border-divider); }
.knowledge-entry__actions--top { margin-top: 0; padding-top: 0; border-top: 0; }
.knowledge-entry__details { display: grid; grid-template-columns: max-content minmax(0,1fr); column-gap: var(--space-2); row-gap: var(--space-2); margin: var(--space-4) 0 0; }
.knowledge-entry__details dt { color: var(--text-muted); font-size: var(--font-size-caption); line-height: var(--line-height-caption); }
.knowledge-entry__details dd { margin: 0; color: var(--text-primary); font-size: var(--font-size-body); line-height: var(--line-height-body); overflow-wrap: anywhere; }
.competitor-identity { display: flex; align-items: center; gap: var(--space-3); min-width: 0; }
.competitor-identity > div { display: grid; justify-items: start; gap: var(--space-1); min-width: 0; }
.competitor-identity h4,.competitor-identity h5 { margin: 0; color: var(--text-primary); font-size: var(--font-size-section-title); line-height: var(--line-height-section-title); font-weight: var(--weight-semibold); }
.competitor-identity span:not(.ce-tag) { color: var(--text-muted); font-size: var(--font-size-caption); line-height: var(--line-height-caption); overflow-wrap: anywhere; }
.competitor-identity__meta { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
.competitor-monogram { display: grid; place-items: center; width: 44px; height: 44px; flex: none; border-radius: var(--radius-card); color: var(--monogram-ink, var(--action-accent)); background: var(--monogram-surface, var(--background-active)); font-weight: var(--weight-semibold); }
.competitor-monogram--blue { --monogram-ink: #3154b5; --monogram-surface: #e8f0fe; }
.competitor-monogram--green { --monogram-ink: #26734d; --monogram-surface: #e9f7ef; }
.competitor-monogram--amber { --monogram-ink: #8a5200; --monogram-surface: #fff3df; }
.competitor-monogram--rose { --monogram-ink: #a23d58; --monogram-surface: #fce8ec; }
.competitor-monogram--violet { --monogram-ink: #6546a5; --monogram-surface: #eee9ff; }
.competitor-monogram--cyan { --monogram-ink: #176b79; --monogram-surface: #e2f4f7; }
.competitor-monogram--orange { --monogram-ink: #8b4c23; --monogram-surface: #f9eadf; }
.competitor-monogram--slate { --monogram-ink: #536171; --monogram-surface: #e9edf2; }
.competitor-recommendations { display: grid; gap: var(--space-4); margin-top: var(--space-5); padding-top: var(--space-5); border-top: 1px solid var(--border-divider); }
.competitor-recommendations__header { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
.competitor-recommendations__header h4 { margin: 0; color: var(--text-primary); font-size: var(--font-size-section-title); }
.competitor-recommendations__header h4 span { margin-right: var(--space-2); color: var(--action-accent); }
.competitor-recommendations__header > span,.competitor-recommendations__state { color: var(--text-muted); font-size: var(--font-size-caption); }
.competitor-recommendations__state { display: flex; min-height: 48px; align-items: center; justify-content: center; --spinner-color: var(--action-accent); }
.competitor-recommendations__grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: var(--space-3); }
.competitor-recommendation { display: grid; align-content: start; gap: var(--space-3); min-width: 0; padding: var(--space-4); border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--background-primary); }
.competitor-recommendation > header { display: flex; align-items: flex-start; gap: var(--space-3); }
.competitor-recommendation > header > div { display: grid; justify-items: start; gap: var(--space-1); min-width: 0; }
.competitor-recommendation h5 { margin: 0; color: var(--text-primary); font-size: var(--font-size-body); }
.competitor-recommendation > header span:not(.competitor-monogram):not(.ce-tag) { color: var(--text-muted); font-size: var(--font-size-caption); overflow-wrap: anywhere; }
.competitor-recommendation > button { width: 100%; color: var(--action-accent); background: var(--action-subtle-background); }
.competitor-recommendations__empty { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
.competitor-recommendations__empty p { margin: 0; color: var(--text-secondary); font-size: var(--font-size-body); }
@media (max-width: 760px) { .knowledge-section__heading { align-items: flex-start; flex-direction: column; } .knowledge-section__actions { flex-wrap: wrap; } }
@media (max-width: 760px) { .knowledge-list--competitors { grid-template-columns: 1fr; } }
@media (max-width: 520px) { .knowledge-entry__form { grid-template-columns: 1fr; } .knowledge-field--wide { grid-column: auto; } .knowledge-entry__details { grid-template-columns: 1fr; gap: var(--space-1); } .knowledge-entry__header { align-items: flex-start; } .knowledge-entry__actions--top { flex-wrap: wrap; } .competitor-recommendations__header,.competitor-recommendations__empty { align-items: flex-start; flex-direction: column; } .competitor-recommendations__grid { grid-template-columns: 1fr; } }
</style>

