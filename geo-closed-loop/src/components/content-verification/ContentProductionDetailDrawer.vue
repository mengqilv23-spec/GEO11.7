<script setup lang="ts">
import type {
  ContentProductionItem,
  ProductionQuestion,
} from '../../data/content-production-data'
import type { PlatformVerificationAnswer } from '../../data/content-verification-data'
import { computed, ref, watch } from 'vue'
import {
  canVerifyContent,
  sourceLabel,
  stageDescription,
  stageLabel,
  VERIFICATION_COOLDOWN_HOURS,
  verificationAvailableAt,
} from '../../data/content-production-data'
import { useContentProductionStore } from '../../stores/content-production'
import TaskRichTextEditor from '../tasks/TaskRichTextEditor.vue'
import Button from '../ui/ce/button/Button.vue'
import AppIcon from '../ui/icons/AppIcon.vue'
import GeoDrawer from '../workbench/shared/GeoDrawer.vue'

type DetailTab = 'content' | 'publish' | 'questions' | 'results'
type StepState = 'done' | 'current' | 'pending'

interface WorkflowStep {
  id: DetailTab
  label: string
  state: StepState
}

const props = withDefaults(defineProps<{
  open: boolean
  item: ContentProductionItem | null
  historical?: boolean
}>(), {
  historical: false,
})
const emit = defineEmits<{ close: [], notify: [message: string] }>()
const store = useContentProductionStore()
const item = computed(() => props.item)
const tab = ref<DetailTab>('content')
const draftTitle = ref('')
const draftBody = ref('')
const customQuestion = ref('')
const customActive = ref(false)
const simulateFailure = ref(false)

function stepDone(value: ContentProductionItem, id: DetailTab): boolean {
  if (id === 'content') {
    if (value.source === 'upload')
      return true
    return ['ready_to_publish', 'questions_pending', 'questions_confirmed', 'verifying', 'verified'].includes(value.stage)
      || (value.stage === 'ai_checked' && Boolean(value.aiCheck?.passed))
  }
  if (id === 'publish')
    return Boolean(value.publishedAt)
  if (id === 'questions')
    return Boolean(value.questions[0]?.confirmed)
  return value.stage === 'verified'
}

const workflowSteps = computed<WorkflowStep[]>(() => {
  const value = item.value
  if (!value)
    return []
  const order: Array<{ id: DetailTab, label: string }> = [
    { id: 'content', label: '内容' },
    { id: 'publish', label: '确认内容并发布' },
    { id: 'questions', label: '核验问题' },
    { id: 'results', label: '核验结果' },
  ]
  const firstPending = order.find(entry => !stepDone(value, entry.id))?.id
  return order.map(entry => ({
    ...entry,
    state: stepDone(value, entry.id) ? 'done' : entry.id === firstPending ? 'current' : 'pending',
  }))
})

const description = computed(() => item.value ? stageDescription(item.value.stage) : '')

const canEdit = computed(() => Boolean(item.value && !props.historical && ['draft', 'ai_checked', 'ready_to_publish'].includes(item.value.stage)))
const canPublish = computed(() => Boolean(item.value && !props.historical && (
  (item.value.stage === 'ai_checked' && item.value.aiCheck?.passed)
  || (item.value.stage === 'ready_to_publish' && item.value.clientConfirmation?.status === 'confirmed')
)))
const canEditQuestions = computed(() => Boolean(item.value && !props.historical && item.value.publishedAt && !['verifying', 'verified'].includes(item.value.stage)))
const verifying = computed(() => item.value?.stage === 'verifying')
const selectedQuestion = computed(() => item.value?.questions[0] ?? null)
const candidateQuestions = computed(() => item.value?.questionCandidates ?? [])
const hasSelectedQuestion = computed(() => Boolean(selectedQuestion.value?.confirmed))
const verificationReady = computed(() => Boolean(item.value && canVerifyContent(item.value)))
const verificationWindowStart = computed(() => verificationAvailableAt(item.value?.publishedAt))
const verificationWaitLabel = computed(() => {
  const availableAt = verificationWindowStart.value
  if (!availableAt)
    return ''
  const remaining = availableAt.getTime() - Date.now()
  if (remaining <= 0)
    return ''
  const hours = Math.ceil(remaining / 3600000)
  return hours >= 24 ? `约 ${Math.ceil(hours / 24)} 天` : `约 ${hours} 小时`
})
const hasResults = computed(() => Boolean(item.value?.questions.some(question => question.answers.length)))

const checkSummary = computed(() => {
  if (!item.value?.aiCheck)
    return ''
  return item.value.aiCheck.passed ? 'AI 检查通过' : 'AI 检查未通过，请修改后重新检查'
})

const contentNote = computed(() => {
  const value = item.value
  if (!value)
    return ''
  if (value.stage === 'ai_checked')
    return 'AI 检查通过，可发布到官网 Blog。'
  if (value.stage === 'ready_to_publish')
    return '内容已确认；发布前如需修改，可在「内容」中编辑，保存后需重新检查并确认。'
  if (value.publishedAt)
    return '内容已发布到官网 Blog，核验问题可在「核验问题」中维护。'
  return ''
})

watch(() => [props.open, props.item?.id] as const, ([open]) => {
  if (!open || !props.item)
    return
  resetDraft()
  resetQuestionDraft()
  simulateFailure.value = false
  tab.value = defaultTab(props.item)
})

function defaultTab(value: ContentProductionItem): DetailTab {
  if (value.publishError)
    return 'content'
  if (value.source === 'imported')
    return value.stage === 'verified' ? 'results' : 'questions'
  return (['content', 'publish', 'questions', 'results'] as DetailTab[]).find(id => !stepDone(value, id)) ?? 'results'
}

function resetDraft() {
  if (!props.item)
    return
  draftTitle.value = props.item.title
  draftBody.value = props.item.body
}

function resetQuestionDraft() {
  const selected = props.item?.questions[0]?.question ?? ''
  const candidates = props.item?.questionCandidates ?? []
  customActive.value = Boolean(selected) && !candidates.includes(selected)
  customQuestion.value = customActive.value ? selected : ''
}

function formatDate(value?: string) {
  if (!value)
    return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('zh-CN')
}

function formatDateTime(value: Date) {
  return value.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function saveAndCheck() {
  if (!item.value)
    return
  const wasConfirmed = item.value.clientConfirmation?.status === 'confirmed'
  store.updateDraft(item.value.id, {
    title: draftTitle.value,
    body: draftBody.value,
  })
  store.runAiCheck(item.value.id)
  const passed = Boolean(item.value.aiCheck?.passed)
  if (!passed)
    emit('notify', '内容已保存，AI 检查未通过，请修改后重新检查。')
  else if (wasConfirmed)
    emit('notify', '内容已保存，已重新检查；需重新确认后才能发布。')
  else
    emit('notify', '内容已保存，AI 检查通过。')
}

function goToPublish() {
  tab.value = 'publish'
}

function goToContent() {
  tab.value = 'content'
}

function publish() {
  if (!item.value)
    return
  // Publishing directly accepts the reviewed content, so the confirmation
  // record is written in the same action instead of asking for a separate click.
  if (item.value.stage === 'ai_checked')
    store.confirmContent(item.value.id)
  const success = store.publish(item.value.id, { simulateFailure: simulateFailure.value })
  simulateFailure.value = false
  if (!success) {
    tab.value = 'content'
    emit('notify', '发布失败，请修改内容后重新发布。')
    return
  }
  tab.value = 'questions'
  emit('notify', '已发布到官网 Blog，并生成核验问题。')
}

function isCandidateSelected(candidate: string) {
  return !customActive.value && selectedQuestion.value?.question === candidate
}

function selectCandidate(candidate: string) {
  if (!item.value)
    return
  customActive.value = false
  customQuestion.value = ''
  store.selectQuestion(item.value.id, candidate)
}

function selectCustomQuestion() {
  if (!item.value)
    return
  customActive.value = true
  customQuestion.value = ''
  store.selectQuestion(item.value.id, '')
}

function commitCustomQuestion() {
  if (!item.value)
    return
  store.selectQuestion(item.value.id, customQuestion.value)
}

async function startVerification() {
  if (!item.value || verifying.value || !hasSelectedQuestion.value)
    return
  await store.startVerification(item.value.id)
  tab.value = 'results'
  emit('notify', '核验完成，已记录 AI 回答与官网引用。')
}

function snapshotHref(answer: PlatformVerificationAnswer) {
  return `data:text/html;charset=utf-8,${encodeURIComponent(answer.htmlSnapshot ?? '')}`
}

function snapshotFilename(answer: PlatformVerificationAnswer) {
  return `${item.value?.taskId ?? item.value?.id ?? 'content'}-${answer.platform}.html`
}

function questionStateLabel(question: ProductionQuestion) {
  if (question.primaryCitationCount > 0)
    return '已命中官网'
  if (question.state === 'pending')
    return '待核验'
  return '未命中官网'
}
</script>

<template>
  <GeoDrawer
    :open="open && !!item"
    :title="item?.title ?? ''"
    eyebrow="品牌内容核验"
    :subtitle="item ? `${item.taskId ?? item.id} · ${stageLabel(item.stage)}` : undefined"
    :size="920"
    @close="emit('close')"
  >
    <div v-if="item" class="cpd">
      <div class="cpd__meta">
        <span class="cpd-stage" :class="`is-${item.stage}`">{{ stageLabel(item.stage) }}</span>
        <span>{{ sourceLabel(item.source) }}</span>
        <span>{{ item.taskId ?? item.id }}</span>
        <span v-if="item.publishedAt">发布 {{ formatDate(item.publishedAt) }}</span>
        <span v-if="item.lastChecked">最近核验 {{ formatDate(item.lastChecked) }}</span>
      </div>
      <p class="cpd__description">
        {{ description }}
      </p>

      <ol class="cpd-steps" aria-label="文章处理进度">
        <li
          v-for="(step, index) in workflowSteps"
          :key="step.id"
          class="cpd-step"
          :class="[`is-${step.state}`, { 'is-active': tab === step.id }]"
        >
          <button
            type="button"
            :aria-current="tab === step.id ? 'step' : undefined"
            :data-test="`step-${step.id}`"
            @click="tab = step.id"
          >
            <span class="cpd-step__index">
              <AppIcon v-if="step.state === 'done'" name="check" :size="12" />
              <template v-else>{{ index + 1 }}</template>
            </span>
            <span class="cpd-step__label">{{ step.label }}</span>
          </button>
          <span v-if="index < workflowSteps.length - 1" class="cpd-step__line" aria-hidden="true" />
        </li>
      </ol>

      <section v-if="tab === 'content'" class="cpd__panel">
        <div v-if="item.publishError" class="cpd-publish-error" role="alert" data-test="publish-error">
          <strong>发布失败</strong>
          <p>{{ item.publishError }}</p>
        </div>
        <form v-if="canEdit" class="cpd-form" @submit.prevent="saveAndCheck">
          <label class="cpd-field">
            <span>Blog 标题</span>
            <input v-model="draftTitle" data-test="detail-title">
          </label>
          <div class="cpd-field">
            <span>正文</span>
            <TaskRichTextEditor v-model="draftBody" label="正文" data-test="detail-body" />
          </div>
          <div v-if="item.aiCheck" class="cpd-check-panel" data-test="content-ai-check">
            <div class="cpd-check-summary" :class="item.aiCheck.passed ? 'is-pass' : 'is-warn'">
              <strong>{{ checkSummary }}</strong>
              <span>{{ formatDate(item.aiCheck.checkedAt) }}</span>
            </div>
            <ul class="cpd-check-list">
              <li v-for="check in item.aiCheck.items" :key="check.key">
                <span class="cpd-check__dot" :class="`is-${check.status}`" />
                <div>
                  <strong>{{ check.label }}</strong>
                  <p>{{ check.detail }}</p>
                </div>
                <span class="cpd-check__status" :class="`is-${check.status}`">{{ check.status === 'pass' ? '通过' : '需确认' }}</span>
              </li>
            </ul>
          </div>
          <div class="cpd-actions">
            <Button type="submit" :variant="item.aiCheck?.passed ? 'secondary' : 'primary'" data-test="save-and-check">
              保存并 AI 检查
            </Button>
            <Button v-if="item.aiCheck?.passed" type="button" variant="primary" data-test="next-step" @click="goToPublish">
              下一步
            </Button>
          </div>
          <p v-if="!item.aiCheck" class="cpd-note">
            保存并 AI 检查后，检查结果会显示在这里。
          </p>
        </form>
        <div v-else class="cpd-preview">
          <article class="cp-blog-preview">
            <h1>{{ item.title }}</h1>
            <p class="cp-blog-preview__summary">
              {{ item.summary }}
            </p>
            <div v-html="item.body" />
          </article>
          <p v-if="contentNote" class="cpd-note">
            {{ contentNote }}
          </p>
        </div>
      </section>

      <section v-else-if="tab === 'publish'" class="cpd__panel">
        <div class="cpd-channel">
          <AppIcon name="globe" :size="16" />
          <span>发布渠道</span>
          <strong>官网 Blog</strong>
          <small>固定渠道，无需选择页面或栏目</small>
        </div>

        <article class="cpd-confirm">
          <h3>确认的内容</h3>
          <div class="cpd-confirm__content" data-test="confirmed-content">
            <h4>{{ item.title }}</h4>
            <div v-html="item.body" />
          </div>
          <p v-if="item.source === 'ai' && !item.aiCheck?.passed" class="cpd-note">
            AI 检查未通过，请先在「内容」中修改并重新检查。
          </p>
          <template v-else-if="item.stage === 'ai_checked'">
            <p>AI 检查已通过，可直接发布到官网 Blog。</p>
          </template>
          <template v-else-if="item.clientConfirmation?.status === 'confirmed'">
            <p>内容已确认 · {{ formatDate(item.clientConfirmation.at) }}</p>
          </template>
          <p v-else class="cpd-note">
            内容尚未通过 AI 检查。
          </p>
        </article>

        <div v-if="canPublish" class="cpd-actions">
          <Button type="button" variant="secondary" data-test="edit-content" @click="goToContent">
            返回内容修改
          </Button>
          <Button type="button" variant="primary" data-test="publish-blog" @click="publish">
            发布到官网 Blog
          </Button>
          <label class="cpd-simulate-failure" title="仅用于演示发布失败后的流程">
            <input v-model="simulateFailure" type="checkbox" data-test="simulate-failure">
            <span>模拟发布失败</span>
          </label>
        </div>
      </section>

      <section v-else-if="tab === 'questions'" class="cpd__panel">
        <div v-if="!item.publishedAt" class="cpd-empty">
          <p>内容发布后才能生成核验问题。</p>
        </div>
        <template v-else-if="canEditQuestions">
          <div class="cpd-question-head">
            <div>
              <strong>选择 1 个核验问题</strong>
              <span>AI 已生成 {{ candidateQuestions.length }} 个候选</span>
            </div>
          </div>

          <div class="cpd-question-list" role="radiogroup" aria-label="核验问题">
            <label
              v-for="(candidate, index) in candidateQuestions"
              :key="candidate"
              class="cpd-question-option"
              :class="{ 'is-selected': isCandidateSelected(candidate) }"
            >
              <input
                type="radio"
                name="verification-question"
                :checked="isCandidateSelected(candidate)"
                @change="selectCandidate(candidate)"
              >
              <span class="cpd-question__index">Q{{ index + 1 }}</span>
              <span class="cpd-question-option__text">{{ candidate }}</span>
            </label>
            <label class="cpd-question-option" :class="{ 'is-selected': customActive }">
              <input
                type="radio"
                name="verification-question"
                :checked="customActive"
                @change="selectCustomQuestion"
              >
              <span class="cpd-question__index">Q{{ candidateQuestions.length + 1 }}</span>
              <span class="cpd-question-option__text">自己写一个</span>
            </label>
          </div>

          <input
            v-if="customActive"
            v-model="customQuestion"
            class="cpd-question__input"
            placeholder="输入要核验的问题"
            aria-label="自定义核验问题"
            @input="commitCustomQuestion"
          >
          <div class="cpd-actions">
            <Button
              type="button"
              variant="primary"
              :disabled="!hasSelectedQuestion || !verificationReady || verifying"
              :loading="verifying"
              data-test="start-verification"
              @click="startVerification"
            >
              {{ verifying ? '核验中...' : '开始核验' }}
            </Button>
          </div>
          <p v-if="!verificationReady" class="cpd-note">
            内容发布后需等待 {{ VERIFICATION_COOLDOWN_HOURS }} 小时生效，预计 {{ verificationWindowStart ? formatDateTime(verificationWindowStart) : '48 小时后' }} 后可开始核验<span v-if="verificationWaitLabel">（还需{{ verificationWaitLabel }}）</span>。
          </p>
          <p v-else-if="!hasSelectedQuestion" class="cpd-note">
            选择 1 个 AI 生成的问题，或自己写一个。
          </p>
        </template>
        <template v-else>
          <article v-if="selectedQuestion" class="cpd-question cpd-question--readonly">
            <p class="cpd-question__text">
              {{ selectedQuestion.question }}
            </p>
            <p class="cpd-question__state" :class="{ 'is-cited': selectedQuestion.primaryCitationCount > 0 }">
              {{ questionStateLabel(selectedQuestion) }}
            </p>
          </article>
          <p v-if="selectedQuestion && !verificationReady" class="cpd-note">
            内容生效中，预计 {{ verificationWindowStart ? formatDateTime(verificationWindowStart) : '48 小时后' }} 后可开始核验，由 AI 执行。
          </p>
          <div v-if="!selectedQuestion" class="cpd-empty">
            <p>尚未选择核验问题。</p>
          </div>
          <div v-if="!historical && item.stage === 'verified'" class="cpd-actions">
            <Button type="button" variant="primary" :loading="verifying" @click="startVerification">
              {{ verifying ? '核验中...' : '重新核验' }}
            </Button>
          </div>
        </template>
      </section>

      <section v-else class="cpd__panel">
        <div v-if="!hasResults" class="cpd-empty">
          <p>选择核验问题并开始核验后，结果会显示在这里。</p>
          <p v-if="item.publishedAt && !verificationReady" class="cpd-note">
            内容发布后需等待 {{ VERIFICATION_COOLDOWN_HOURS }} 小时生效，{{ verificationWindowStart ? formatDateTime(verificationWindowStart) : '48 小时后' }} 后可开始核验。
          </p>
          <Button
            v-if="hasSelectedQuestion"
            type="button"
            variant="primary"
            :disabled="!verificationReady || verifying"
            :loading="verifying"
            @click="startVerification"
          >
            {{ verifying ? '核验中...' : '开始核验' }}
          </Button>
        </div>
        <template v-else>
          <article v-for="(question, index) in item.questions" :key="question.id" class="cv-result">
            <header class="cv-result__head">
              <span class="cv-result__index">Q{{ index + 1 }}</span>
              <p class="cv-result__question">
                {{ question.question }}
              </p>
            </header>
            <div v-if="question.answers.length" class="cv-platform-list">
              <article v-for="answer in question.answers" :key="answer.platform" class="cv-platform">
                <header class="cv-platform__head">
                  <span class="cv-platform__mark" :class="`is-${answer.platform}`">{{ answer.platformLabel.slice(0, 1) }}</span>
                  <span class="cv-platform__name">{{ answer.platformLabel }}</span>
                </header>
                <p class="cv-platform__label">
                  平台返回原文
                </p>
                <blockquote class="cv-answer">
                  {{ answer.answer }}
                </blockquote>
                <a
                  v-if="answer.htmlSnapshot"
                  class="cv-snapshot-link"
                  :href="snapshotHref(answer)"
                  :download="snapshotFilename(answer)"
                >
                  下载回答快照
                </a>
              </article>
            </div>
            <p v-else class="cpd-note">
              该问题尚未核验。
            </p>
          </article>
        </template>
      </section>
    </div>

    <template #footer>
      <Button type="button" @click="emit('close')">
        关闭
      </Button>
    </template>
  </GeoDrawer>
</template>

<style scoped>
.cpd { display: grid; gap: 14px; min-width: 0; }
.cpd__meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; padding: 10px 12px; border: 1px solid var(--border-default); border-radius: 10px; color: var(--text-secondary); background: var(--background-subtle); font-size: 12px; line-height: 18px; }
.cpd__description { margin: -4px 0 0; color: var(--text-muted); font-size: 12px; line-height: 19px; }
.cpd-stage { display: inline-flex; padding: 3px 8px; border-radius: 999px; color: var(--text-secondary); background: var(--background-primary); font-size: 11px; line-height: 17px; }
.cpd-stage.is-draft { color: #9a3412; background: #ffedd5; }
.cpd-stage.is-ai_checked, .cpd-stage.is-questions_pending { color: #92400e; background: #fef3c7; }
.cpd-stage.is-ready_to_publish, .cpd-stage.is-questions_confirmed { color: #1d4ed8; background: #dbeafe; }
.cpd-stage.is-verifying { color: #6d28d9; background: #ede9fe; }
.cpd-stage.is-verified { color: #166534; background: #dcfce7; }
.cpd-steps { display: flex; align-items: center; gap: 0; margin: 0; padding: 10px 12px; border: 1px solid var(--border-default); border-radius: 10px; background: var(--background-subtle); list-style: none; }
.cpd-step { display: flex; flex: 1; align-items: center; min-width: 0; }
.cpd-step:last-child { flex: 0 0 auto; }
.cpd-step button { display: inline-flex; align-items: center; gap: 7px; min-width: 0; padding: 2px 4px; border: 0; border-radius: 7px; color: var(--text-muted); background: none; font: inherit; font-size: 12px; line-height: 18px; cursor: pointer; }
.cpd-step button:hover { color: var(--text-primary); }
.cpd-step button:focus-visible { outline: 2px solid var(--action-accent); outline-offset: 2px; }
.cpd-step__index { display: inline-flex; flex: 0 0 auto; align-items: center; justify-content: center; width: 22px; height: 22px; border: 1px solid var(--border-default); border-radius: 999px; color: var(--text-muted); background: var(--background-primary); font-size: 11px; font-weight: 600; }
.cpd-step__label { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.cpd-step__line { flex: 1; height: 1px; margin: 0 10px; background: var(--border-default); }
.cpd-step.is-current button { color: var(--action-accent); font-weight: 600; }
.cpd-step.is-current .cpd-step__index { border-color: var(--action-accent); color: #fff; background: var(--action-accent); }
.cpd-step.is-done .cpd-step__index { border-color: var(--action-accent); color: var(--action-accent); background: var(--action-subtle-background); }
.cpd-step.is-done .cpd-step__line { background: color-mix(in srgb, var(--action-accent) 45%, var(--border-default)); }
.cpd-step.is-active .cpd-step__label { text-decoration: underline; text-underline-offset: 3px; }
.cpd__panel { display: grid; gap: 14px; min-width: 0; }
.cpd-form { display: grid; gap: 12px; }
.cpd-field { display: grid; gap: 6px; color: var(--text-secondary); font-size: 12px; line-height: 18px; }
.cpd-field > span { color: var(--text-primary); font-weight: 500; }
.cpd-field input, .cpd-field textarea { width: 100%; box-sizing: border-box; padding: 9px 10px; border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-primary); background: var(--background-primary); font: inherit; font-size: 13px; line-height: 20px; }
.cpd-field textarea { resize: vertical; }
.cpd-field input:focus-visible, .cpd-field textarea:focus-visible { border-color: var(--action-accent); outline: 2px solid color-mix(in srgb, var(--action-accent) 24%, transparent); outline-offset: 1px; }
.cpd-field :deep(.task-rich-editor__content .ProseMirror) { min-height: 280px; }
.cpd-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.cpd-note { margin: 0; color: var(--text-muted); font-size: 12px; line-height: 19px; }
.cpd-empty { display: grid; justify-items: start; gap: 10px; padding: 24px; border: 1px dashed var(--border-default); border-radius: 10px; color: var(--text-muted); font-size: 12px; line-height: 19px; }
.cpd-empty p { margin: 0; }
.cpd-channel { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 12px 14px; border: 1px solid var(--border-default); border-radius: 10px; color: var(--text-secondary); background: var(--background-subtle); font-size: 12px; line-height: 19px; }
.cpd-channel strong { color: var(--text-primary); font-weight: 600; }
.cpd-channel small { color: var(--text-muted); }
.cpd-confirm { display: grid; gap: 8px; padding: 14px; border: 1px solid var(--border-default); border-radius: 10px; background: var(--background-primary); }
.cpd-confirm h3 { margin: 0; font-size: 13px; line-height: 20px; font-weight: 600; }
.cpd-confirm p { margin: 0; color: var(--text-secondary); font-size: 12px; line-height: 19px; }
.cpd-confirm__content { display: grid; gap: 6px; max-height: 320px; overflow: auto; padding: 12px 14px; border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-secondary); background: var(--background-subtle); font-size: 13px; line-height: 21px; }
.cpd-confirm__content h4 { margin: 0; color: var(--text-primary); font-size: 16px; line-height: 24px; font-weight: 600; }
.cpd-confirm__content :deep(h2) { margin: 14px 0 6px; color: var(--text-primary); font-size: 14px; line-height: 22px; }
.cpd-confirm__content :deep(p) { margin: 6px 0; }
.cpd-publish-error { display: grid; gap: 4px; padding: 12px 14px; border: 1px solid var(--status-error-border, var(--border-default)); border-radius: 10px; color: var(--status-error-foreground); background: var(--status-error-background); font-size: 12px; line-height: 19px; }
.cpd-publish-error strong { font-size: 13px; line-height: 20px; }
.cpd-publish-error p { margin: 0; color: var(--status-error-foreground); }
.cpd-simulate-failure { display: inline-flex; align-items: center; gap: 6px; margin-left: auto; color: var(--text-muted); font-size: 12px; line-height: 18px; cursor: pointer; }
.cpd-simulate-failure input { accent-color: var(--action-accent); }
.cpd-check-panel { display: grid; gap: 8px; }
.cpd-check-summary { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; padding: 12px 14px; border: 1px solid var(--border-default); border-radius: 10px; font-size: 12px; line-height: 19px; }
.cpd-check-summary.is-pass { color: var(--status-success-foreground); background: var(--status-success-background); }
.cpd-check-summary.is-warn { color: #92400e; background: #fef3c7; }
.cpd-check-summary span { color: var(--text-muted); }
.cpd-check-list { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.cpd-check-list li { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: start; gap: 10px; padding: 10px 12px; border: 1px solid var(--border-default); border-radius: 9px; background: var(--background-primary); }
.cpd-check__dot { width: 8px; height: 8px; margin-top: 5px; border-radius: 999px; }
.cpd-check__dot.is-pass { background: var(--status-success-foreground); }
.cpd-check__dot.is-warn { background: #d97706; }
.cpd-check-list strong { color: var(--text-primary); font-size: 12px; line-height: 18px; }
.cpd-check-list p { margin: 2px 0 0; color: var(--text-secondary); font-size: 12px; line-height: 18px; }
.cpd-check__status { font-size: 11px; line-height: 17px; }
.cpd-check__status.is-pass { color: var(--status-success-foreground); }
.cpd-check__status.is-warn { color: #b45309; }
.cpd-question-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
.cpd-question-head > div { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.cpd-question-head strong { font-size: 13px; line-height: 20px; }
.cpd-question-head span { color: var(--text-muted); font-size: 12px; line-height: 18px; }
.cpd-question-list { display: grid; gap: 8px; }
.cpd-question-option { display: flex; align-items: flex-start; gap: 10px; padding: 12px; border: 1px solid var(--border-default); border-radius: 10px; background: var(--background-primary); cursor: pointer; }
.cpd-question-option:hover { border-color: color-mix(in srgb, var(--action-accent) 45%, var(--border-default)); }
.cpd-question-option.is-selected { border-color: var(--action-accent); background: var(--action-subtle-background); }
.cpd-question-option input { flex: 0 0 auto; margin: 5px 0 0; accent-color: var(--action-accent); }
.cpd-question-option__text { color: var(--text-primary); font-size: 13px; line-height: 20px; }
.cpd-question { display: grid; gap: 6px; padding: 12px; border: 1px solid var(--border-default); border-radius: 10px; background: var(--background-primary); }
.cpd-question__index { display: inline-flex; flex: 0 0 auto; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 7px; color: var(--action-accent); background: var(--action-subtle-background); font-size: 11px; font-weight: 600; }
.cpd-question__text { margin: 0; color: var(--text-primary); font-size: 13px; line-height: 21px; font-weight: 500; }
.cpd-question__input { width: 100%; box-sizing: border-box; padding: 8px 9px; border: 1px solid var(--border-default); border-radius: 7px; color: var(--text-primary); background: var(--background-primary); font: inherit; font-size: 13px; line-height: 20px; }
.cpd-question__input:focus-visible { border-color: var(--action-accent); outline: 2px solid color-mix(in srgb, var(--action-accent) 24%, transparent); outline-offset: 1px; }
.cpd-question__state { margin: 0; color: var(--text-muted); font-size: 11px; line-height: 17px; }
.cpd-question__state.is-cited { color: var(--status-success-foreground); }
.cp-blog-preview { max-width: 760px; padding: 20px; border: 1px solid var(--border-default); border-radius: 10px; background: var(--background-primary); color: var(--text-secondary); font-size: 13px; line-height: 21px; }
.cp-blog-preview h1 { margin: 0 0 8px; color: var(--text-primary); font-size: 22px; line-height: 30px; }
.cp-blog-preview h2 { margin: 20px 0 8px; color: var(--text-primary); font-size: 16px; line-height: 24px; }
.cp-blog-preview p { margin: 8px 0; }
.cp-blog-preview__summary { color: var(--text-secondary); font-size: 13px; line-height: 20px; }
.cv-result { display: grid; gap: 14px; padding: 18px; border: 1px solid var(--border-default); border-radius: 12px; background: var(--background-primary); }
.cv-result__head { display: flex; align-items: flex-start; gap: 10px; }
.cv-result__index { display: inline-flex; flex: 0 0 auto; align-items: center; justify-content: center; min-width: 28px; height: 28px; padding: 0 6px; border-radius: 8px; color: var(--action-accent); background: color-mix(in srgb, var(--action-accent) 10%, white); font-size: 12px; font-weight: 700; }
.cv-result__question { margin: 0; padding-top: 2px; color: var(--text-primary); font-size: 14px; line-height: 24px; font-weight: 600; }
.cv-platform-list { display: grid; gap: 14px; }
.cv-platform { display: grid; gap: 8px; padding-top: 14px; border-top: 1px solid var(--border-default); }
.cv-platform:first-child { padding-top: 0; border-top: 0; }
.cv-platform__head { display: flex; align-items: center; gap: 8px; }
.cv-platform__mark { display: grid; width: 24px; height: 24px; place-items: center; border-radius: 7px; color: var(--action-accent); background: color-mix(in srgb, var(--action-accent) 10%, white); font-size: 11px; font-weight: 700; }
.cv-platform__mark.is-google-ai { color: var(--status-warning-foreground); background: var(--status-warning-background); }
.cv-platform__name { color: var(--text-primary); font-size: 13px; line-height: 20px; font-weight: 600; }
.cv-platform__label { margin: 0; color: var(--text-muted); font-size: 12px; line-height: 18px; }
.cv-answer { margin: 0; padding: 14px 16px; border: 1px solid var(--border-default); border-radius: 10px; color: var(--text-primary); background: var(--background-subtle); font-size: 13px; line-height: 1.7; white-space: pre-wrap; overflow-wrap: anywhere; }
.cv-snapshot-link { display: inline-flex; width: fit-content; color: var(--action-accent); font-size: 12px; font-weight: 600; line-height: 18px; text-decoration: none; }
.cv-snapshot-link:hover { text-decoration: underline; }
.cv-snapshot-link:focus-visible { outline: 2px solid var(--action-accent); outline-offset: 2px; }
@media (max-width: 560px) { .cpd-steps { flex-direction: column; align-items: stretch; gap: 4px; } .cpd-step, .cpd-step:last-child { flex: none; } .cpd-step__line { display: none; } .cpd-check-list li { grid-template-columns: auto minmax(0, 1fr); } .cpd-check__status { grid-column: 2; } }
</style>
