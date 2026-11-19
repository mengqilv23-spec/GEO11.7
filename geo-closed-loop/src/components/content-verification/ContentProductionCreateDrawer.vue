<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { contentVerificationItems } from '../../data/content-verification-data'
import { publishedContentTasks } from '../../data/published-content-tasks'
import { useContentProductionStore } from '../../stores/content-production'
import Button from '../ui/ce/button/Button.vue'
import Modal from '../ui/ce/modal/Modal.vue'
import AppIcon from '../ui/icons/AppIcon.vue'
import GeoDrawer from '../workbench/shared/GeoDrawer.vue'

type CreateTab = 'ai' | 'published'

const props = withDefaults(defineProps<{ open: boolean, initialTab?: CreateTab }>(), {
  initialTab: 'ai',
})
const emit = defineEmits<{ close: [], created: [itemId: string] }>()
const store = useContentProductionStore()
const activeTab = ref<CreateTab>(props.initialTab)
const error = ref('')
const previewOpen = ref(false)

const aiForm = reactive({
  theme: '',
  targetQuestion: '',
  audience: '航空复材加工技术主管',
  market: '德国',
  notes: '具体参数、交期与服务范围需结合项目确认。',
})
const publishedForm = reactive({
  taskId: '',
  title: '',
  url: '',
  body: '',
})

const publishedTaskOptions = publishedContentTasks.map((task) => {
  const verification = contentVerificationItems.find(item => item.taskId === task.id)
  return {
    id: task.id,
    title: task.workflow?.output.title ?? task.name,
    url: task.workflow?.url ?? task.workflow?.site.preview ?? '',
    body: task.workflow?.output.body ?? '',
    keyFacts: verification?.keyFacts ?? [],
  }
})

const drawerTitle = computed(() => activeTab.value === 'ai' ? 'AI 写核验文章' : '导入已发布文章')
const drawerSubtitle = computed(() => activeTab.value === 'ai'
  ? '生成初稿后经 AI 检查、客户确认并发布到官网 Blog'
  : '选择已发布任务，直接生成核验问题')

watch(() => props.open, (open) => {
  if (!open) {
    previewOpen.value = false
    return
  }
  activeTab.value = props.initialTab
  error.value = ''
})
watch(() => props.initialTab, (tab) => {
  if (props.open)
    activeTab.value = tab
})

function close() {
  previewOpen.value = false
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
  const item = store.createFromBrief({
    brief: {
      theme: aiForm.theme.trim(),
      targetQuestion: aiForm.targetQuestion.trim(),
      audience: aiForm.audience.trim(),
      market: aiForm.market.trim(),
      notes: aiForm.notes.trim(),
    },
    keyFacts: factsFromTheme(aiForm.theme),
  })
  resetForms()
  emit('created', item.id)
  close()
}

function fillPublishedTask() {
  const task = publishedTaskOptions.find(option => option.id === publishedForm.taskId)
  publishedForm.title = task?.title ?? ''
  publishedForm.url = task?.url ?? ''
  publishedForm.body = task?.body ?? ''
  previewOpen.value = false
  error.value = ''
}
watch(() => publishedForm.taskId, fillPublishedTask)

function importPublished() {
  if (!publishedForm.taskId) {
    error.value = '请选择已发布内容的任务编号。'
    return
  }
  if (!publishedForm.body.trim()) {
    error.value = '该任务暂无已发布正文，无法导入。'
    return
  }
  const task = publishedTaskOptions.find(option => option.id === publishedForm.taskId)
  const item = store.importContent({
    taskId: publishedForm.taskId,
    title: publishedForm.title,
    body: publishedForm.body,
    keyFacts: task?.keyFacts ?? [],
    url: publishedForm.url,
  })
  resetForms()
  emit('created', item.id)
  close()
}

function resetForms() {
  error.value = ''
  previewOpen.value = false
  aiForm.theme = ''
  aiForm.targetQuestion = ''
  publishedForm.taskId = ''
  publishedForm.title = ''
  publishedForm.url = ''
  publishedForm.body = ''
}
</script>

<template>
  <GeoDrawer
    :open="open"
    :title="drawerTitle"
    eyebrow="品牌内容核验"
    :subtitle="drawerSubtitle"
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

      <form v-if="activeTab === 'ai'" class="cp-form" @submit.prevent="createAiDraft">
        <label class="cp-field">
          <span>文章主题</span>
          <input v-model="aiForm.theme" data-test="create-theme" placeholder="例如：五轴水刀 · CFRP 分层控制指南">
        </label>
        <label class="cp-field">
          <span>目标核验问题</span>
          <input v-model="aiForm.targetQuestion" placeholder="例如：APW 如何控制 CFRP 切割分层？">
        </label>
        <div class="cp-form__row">
          <label class="cp-field">
            <span>目标读者</span>
            <input v-model="aiForm.audience">
          </label>
          <label class="cp-field">
            <span>目标市场</span>
            <input v-model="aiForm.market">
          </label>
        </div>
        <label class="cp-field">
          <span>需要确认的边界</span>
          <textarea v-model="aiForm.notes" rows="3" />
        </label>
        <p v-if="error" class="cp-error" role="alert">
          {{ error }}
        </p>
        <div class="cp-form__actions">
          <Button type="submit" variant="primary">
            AI 生成 Blog 初稿
          </Button>
        </div>
      </form>

      <form v-else class="cp-form" @submit.prevent="importPublished">
        <label class="cp-field">
          <span>任务编号</span>
          <select v-model="publishedForm.taskId" data-test="published-task">
            <option value="" disabled>
              选择已发布内容
            </option>
            <option v-for="task in publishedTaskOptions" :key="task.id" :value="task.id">
              {{ task.id }}
            </option>
          </select>
        </label>
        <label class="cp-field">
          <span>标题</span>
          <input v-model="publishedForm.title" data-test="published-title" readonly placeholder="选择任务编号后自动带出">
        </label>
        <div class="cp-field">
          <span>正文</span>
          <button
            type="button"
            class="cp-preview-link"
            data-test="published-body-preview"
            :disabled="!publishedForm.body"
            @click="previewOpen = true"
          >
            预览已发布正文
          </button>
        </div>
        <p v-if="error" class="cp-error" role="alert">
          {{ error }}
        </p>
        <div class="cp-form__actions">
          <Button type="submit" variant="primary">
            导入并生成核验问题
          </Button>
        </div>
      </form>
    </div>

    <Modal
      v-model:open="previewOpen"
      title="正文预览"
      width="min(720px, calc(100vw - 32px))"
      :footer="undefined"
      confirm-text="关闭"
      cancel-text="关闭"
      processing-text="关闭中…"
      close-label="关闭正文预览"
    >
      <article class="cp-preview" data-test="published-body-content" v-html="publishedForm.body" />
      <template #footer>
        <Button type="button" @click="previewOpen = false">
          关闭
        </Button>
      </template>
    </Modal>

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
.cp-field input, .cp-field select, .cp-field textarea { width: 100%; box-sizing: border-box; padding: 9px 10px; border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-primary); background: var(--background-primary); font: inherit; font-size: 13px; line-height: 20px; }
.cp-field textarea { resize: vertical; min-height: 72px; }
.cp-field input[readonly] { color: var(--text-secondary); background: var(--background-subtle); }
.cp-field input:focus-visible, .cp-field select:focus-visible, .cp-field textarea:focus-visible { border-color: var(--action-accent); outline: 2px solid color-mix(in srgb, var(--action-accent) 24%, transparent); outline-offset: 1px; }
.cp-form__actions { display: flex; justify-content: flex-end; padding-top: 4px; }
.cp-error { margin: 0; color: var(--status-error-foreground, #b91c1c); font-size: 12px; line-height: 18px; }
.cp-preview-link { justify-self: start; padding: 0; border: 0; color: var(--action-accent); background: transparent; font: inherit; font-size: 13px; line-height: 20px; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.cp-preview-link:hover:not(:disabled) { text-decoration-thickness: 2px; }
.cp-preview-link:focus-visible { border-radius: 2px; outline: 2px solid var(--action-accent); outline-offset: 2px; }
.cp-preview-link:disabled { color: var(--text-muted); text-decoration: none; cursor: not-allowed; }
.cp-preview { color: var(--text-primary); font-size: 13px; line-height: 22px; overflow-wrap: anywhere; }
.cp-preview :deep(h2) { margin: 20px 0 8px; font-size: 16px; line-height: 24px; font-weight: 600; }
.cp-preview :deep(h2:first-child) { margin-top: 0; }
.cp-preview :deep(h3) { margin: 16px 0 6px; font-size: 14px; line-height: 22px; font-weight: 600; }
.cp-preview :deep(p) { margin: 0 0 10px; }
.cp-preview :deep(ul), .cp-preview :deep(ol) { margin: 0 0 10px; padding-left: 20px; }
.cp-preview :deep(li) { margin-bottom: 4px; }
.cp-preview :deep(a) { color: var(--action-accent); }
@media (max-width: 560px) { .cp-form__row { grid-template-columns: 1fr; } }
</style>
