<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useContentProductionStore } from '../../stores/content-production'
import { knowledgeLibrary } from '../../workflows/task-workflow'
import Button from '../ui/ce/button/Button.vue'
import AppIcon from '../ui/icons/AppIcon.vue'
import GeoDrawer from '../workbench/shared/GeoDrawer.vue'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [], created: [itemId: string] }>()
const store = useContentProductionStore()
const error = ref('')

// The drawer reuses the same confirmed knowledge entries as content tasks.
const knowledgeOptions = knowledgeLibrary.map(item => ({
  id: item.id,
  title: item.title,
  tag: item.tag,
  source: item.source,
  content: item.content,
}))

const aiForm = reactive({
  theme: '',
  targetQuestion: '',
  market: '德国',
})

const selectedKnowledgeIds = ref<string[]>(knowledgeOptions.map(item => item.id))
const selectedKnowledge = computed(() => knowledgeOptions.filter(item => selectedKnowledgeIds.value.includes(item.id)))
const knowledgeOpen = ref(false)
const knowledgeRoot = ref<HTMLElement | null>(null)

const knowledgeSummary = computed(() => {
  if (!selectedKnowledge.value.length)
    return '请选择知识库内容'
  return `已选 ${selectedKnowledge.value.length} 项：${selectedKnowledge.value.map(item => item.title).join('、')}`
})

function handleKnowledgeOutside(event: PointerEvent) {
  if (!knowledgeRoot.value?.contains(event.target as Node))
    knowledgeOpen.value = false
}

watch(knowledgeOpen, (open) => {
  if (open)
    document.addEventListener('pointerdown', handleKnowledgeOutside)
  else
    document.removeEventListener('pointerdown', handleKnowledgeOutside)
})

onBeforeUnmount(() => document.removeEventListener('pointerdown', handleKnowledgeOutside))

function close() {
  knowledgeOpen.value = false
  emit('close')
}

// The theme carries the confirmed facts; split its segments instead of asking
// the operator to retype them in a separate field.
function factsFromTheme(value: string) {
  return value.split(/[\n，,、/·|]/).map(item => item.trim()).filter(Boolean)
}

function createAiDraft() {
  if (!aiForm.theme.trim()) {
    error.value = '请填写文章主题。'
    return
  }
  const knowledge = selectedKnowledge.value
  if (!knowledge.length) {
    error.value = '请至少选择一项知识库内容。'
    return
  }
  const item = store.createFromBrief({
    brief: {
      theme: aiForm.theme.trim(),
      targetQuestion: aiForm.targetQuestion.trim(),
      audience: '航空复材加工技术主管',
      market: aiForm.market.trim(),
      notes: `具体参数、交期与服务范围以知识库「${knowledge.map(item => item.title).join('、')}」为准。`,
    },
    keyFacts: factsFromTheme(aiForm.theme),
    knowledge,
  })
  resetForm()
  emit('created', item.id)
  close()
}

function resetForm() {
  error.value = ''
  aiForm.theme = ''
  aiForm.targetQuestion = ''
  selectedKnowledgeIds.value = knowledgeOptions.map(item => item.id)
  knowledgeOpen.value = false
}
</script>

<template>
  <GeoDrawer
    :open="open"
    title="AI 写核验文章"
    eyebrow="品牌内容核验"
    subtitle="生成初稿后经 AI 检查、客户确认并发布到官网 Blog"
    :size="720"
    @close="close"
  >
    <div class="cp-create">
      <div class="cp-channel">
        <AppIcon name="globe" :size="16" />
        <span>发布渠道</span>
        <strong>官网 Blog</strong>
        <small>无需选择页面或栏目</small>
      </div>

      <form class="cp-form" @submit.prevent="createAiDraft">
        <label class="cp-field">
          <span>文章主题</span>
          <input v-model="aiForm.theme" data-test="create-theme" placeholder="例如：五轴水刀 · CFRP 分层控制指南">
        </label>
        <div class="cp-form__row">
          <label class="cp-field">
            <span>目标核验问题</span>
            <input v-model="aiForm.targetQuestion" placeholder="例如：APW 如何控制 CFRP 切割分层？">
          </label>
          <label class="cp-field">
            <span>目标市场</span>
            <input v-model="aiForm.market">
          </label>
        </div>
        <fieldset ref="knowledgeRoot" class="cp-knowledge">
          <legend>知识库内容</legend>
          <button
            type="button"
            class="cp-knowledge__trigger"
            :aria-expanded="knowledgeOpen"
            aria-haspopup="listbox"
            data-test="create-knowledge-trigger"
            @click="knowledgeOpen = !knowledgeOpen"
          >
            <span class="cp-knowledge__value" :class="{ 'is-placeholder': !selectedKnowledge.length }">
              {{ knowledgeSummary }}
            </span>
            <AppIcon name="chevronDown" :size="16" class="cp-knowledge__arrow" :class="{ 'is-open': knowledgeOpen }" />
          </button>
          <div v-if="knowledgeOpen" class="cp-knowledge__panel" role="listbox" aria-multiselectable="true" aria-label="知识库内容">
            <label
              v-for="option in knowledgeOptions"
              :key="option.id"
              class="cp-knowledge__option"
              :class="{ 'is-selected': selectedKnowledgeIds.includes(option.id) }"
              role="option"
              :aria-selected="selectedKnowledgeIds.includes(option.id)"
            >
              <input v-model="selectedKnowledgeIds" type="checkbox" :value="option.id" data-test="create-knowledge">
              <span class="cp-knowledge__copy">
                <strong>{{ option.title }}</strong>
                <small>{{ option.tag }} · {{ option.source }}</small>
                <em>{{ option.content }}</em>
              </span>
            </label>
          </div>
        </fieldset>
        <p v-if="error" class="cp-error" role="alert">
          {{ error }}
        </p>
        <div class="cp-form__actions">
          <Button type="submit" variant="primary">
            AI 生成 Blog 初稿
          </Button>
        </div>
      </form>
    </div>

    <template #footer>
      <Button type="button" @click="close">
        取消
      </Button>
    </template>
  </GeoDrawer>
</template>

<style scoped>
.cp-create { display: grid; gap: 16px; min-width: 0; }
.cp-channel { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 12px 14px; border: 1px solid var(--border-default); border-radius: 10px; color: var(--text-secondary); background: var(--background-subtle); font-size: 12px; line-height: 19px; }
.cp-channel strong { color: var(--text-primary); font-weight: 600; }
.cp-channel small { color: var(--text-muted); }
.cp-form { display: grid; gap: 14px; }
.cp-form__row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.cp-field { display: grid; gap: 6px; min-width: 0; color: var(--text-secondary); font-size: 12px; line-height: 18px; }
.cp-field > span { color: var(--text-primary); font-weight: 500; }
.cp-field input { width: 100%; box-sizing: border-box; padding: 9px 10px; border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-primary); background: var(--background-primary); font: inherit; font-size: 13px; line-height: 20px; }
.cp-field input:focus-visible { border-color: var(--action-accent); outline: 2px solid color-mix(in srgb, var(--action-accent) 24%, transparent); outline-offset: 1px; }
.cp-knowledge { display: grid; gap: 6px; min-width: 0; margin: 0; padding: 0; border: 0; }
.cp-knowledge legend { padding: 0; color: var(--text-primary); font-size: 12px; font-weight: 500; line-height: 18px; }
.cp-knowledge__trigger { display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; box-sizing: border-box; padding: 9px 10px; border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-primary); background: var(--background-primary); font: inherit; font-size: 13px; line-height: 20px; text-align: left; cursor: pointer; }
.cp-knowledge__trigger:hover { border-color: var(--border-strong, var(--border-default)); }
.cp-knowledge__trigger[aria-expanded="true"] { border-color: var(--action-accent); outline: 2px solid color-mix(in srgb, var(--action-accent) 24%, transparent); outline-offset: 1px; }
.cp-knowledge__value { min-width: 0; }
.cp-knowledge__value.is-placeholder { color: var(--text-muted); }
.cp-knowledge__arrow { flex-shrink: 0; color: var(--text-muted); transition: transform 0.15s ease; }
.cp-knowledge__arrow.is-open { transform: rotate(180deg); }
.cp-knowledge__panel { display: grid; gap: 8px; padding-top: 2px; }
.cp-knowledge__option { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border: 1px solid var(--border-default); border-radius: 8px; background: var(--background-primary); cursor: pointer; }
.cp-knowledge__option.is-selected { border-color: color-mix(in srgb, var(--action-accent) 45%, var(--border-default)); background: color-mix(in srgb, var(--action-accent) 5%, var(--background-primary)); }
.cp-knowledge__option input { flex-shrink: 0; margin-top: 2px; accent-color: var(--action-accent); }
.cp-knowledge__copy { display: grid; gap: 2px; min-width: 0; }
.cp-knowledge__copy strong { color: var(--text-primary); font-size: 13px; font-weight: 600; line-height: 19px; }
.cp-knowledge__copy small { color: var(--text-muted); font-size: 12px; line-height: 18px; }
.cp-knowledge__copy em { color: var(--text-secondary); font-size: 12px; font-style: normal; line-height: 18px; }
.cp-form__actions { display: flex; justify-content: flex-end; padding-top: 4px; }
.cp-error { margin: 0; color: var(--status-error-foreground, #b91c1c); font-size: 12px; line-height: 18px; }
@media (max-width: 560px) { .cp-form__row { grid-template-columns: 1fr; } }
</style>
