<script setup lang="ts">
import type { RecommendationRecord } from '../../../api/geo-config'
import type { RoundResponseDetail } from '../../../api/monitoring'
import { computed, shallowRef, watch } from 'vue'
import { confirmRecommendation, ignoreRecommendation } from '../../../api/geo-config'
import { getResponseDetail } from '../../../api/monitoring'
import Drawer from '../../ui/ce/drawer/Drawer.vue'
import Spinner from '../../ui/ce/spinner/Spinner.vue'
import { parsePotentialCompetitors } from './potential-competitor-data'

const props = defineProps<{
  candidates: readonly RecommendationRecord[]
  questions: readonly { id: number, questionContent: string }[]
}>()

const emit = defineEmits<{
  resolved: [id: number]
}>()

const open = defineModel<boolean>('open', { default: false })
const activeId = shallowRef<number | null>(null)
const handledIds = shallowRef<number[]>([])
const decisions = shallowRef<Record<number, 'ignore' | 'add'>>({})
const questionLabels = computed(() => new Map(props.questions.map(question => [question.id, question.questionContent])))
const localCandidates = shallowRef(parsePotentialCompetitors(props.candidates, questionLabels.value))
const processingId = shallowRef<number | null>(null)
const actionError = shallowRef('')
const evidenceDetails = shallowRef<Record<number, RoundResponseDetail>>({})
const evidenceLoading = shallowRef(false)
let evidenceRequest = 0
const candidates = computed(() => localCandidates.value)
const activeCandidate = computed(() => candidates.value.find(candidate => candidate.id === activeId.value) ?? null)
const pendingCount = computed(() => Math.max(0, candidates.value.length - handledIds.value.length))
const totalOccurrences = computed(() => {
  const values = candidates.value.map(candidate => candidate.occurrences)
  return values.length && values.every((value): value is number => value !== null)
    ? values.reduce((sum, value) => sum + value, 0)
    : null
})
const totalQuestions = computed(() => {
  const questions = new Set(candidates.value.flatMap(candidate => candidate.questions.map(item => item.question)))
  return questions.size || null
})
const batches = computed(() => [...new Set(candidates.value.map(candidate => candidate.batchNo).filter((batch): batch is string => !!batch))])
const batchLabel = computed(() => batches.value.length === 1 ? batches.value[0] : batches.value.length ? `${batches.value.length} 个批次` : '—')

watch(open, (isOpen) => {
  if (!isOpen)
    return
  localCandidates.value = parsePotentialCompetitors(props.candidates, questionLabels.value)
  handledIds.value = []
  decisions.value = {}
  processingId.value = null
  actionError.value = ''
  evidenceDetails.value = {}
  activeId.value = localCandidates.value[0]?.id ?? null
})

watch([open, activeId], async ([isOpen, id]) => {
  const requestId = ++evidenceRequest
  evidenceDetails.value = {}
  const candidate = isOpen ? candidates.value.find(item => item.id === id) : null
  const responseIds = [...new Set(candidate?.evidence.flatMap(item => item.responseId === null ? [] : [item.responseId]) ?? [])]
  if (!responseIds.length) {
    evidenceLoading.value = false
    return
  }

  evidenceLoading.value = true
  const results = await Promise.allSettled(responseIds.map(responseId => getResponseDetail(responseId)))
  if (requestId !== evidenceRequest)
    return
  evidenceDetails.value = Object.fromEntries(results.flatMap((result, index) => result.status === 'fulfilled' ? [[responseIds[index]!, result.value]] : []))
  evidenceLoading.value = false
})

function close() {
  open.value = false
}

async function handleCandidate(decision: 'ignore' | 'add') {
  const candidate = activeCandidate.value
  if (!candidate || processingId.value !== null)
    return

  processingId.value = candidate.id
  actionError.value = ''
  try {
    if (decision === 'add')
      await confirmRecommendation(candidate.id)
    else
      await ignoreRecommendation(candidate.id)

    decisions.value = { ...decisions.value, [candidate.id]: decision }
    handledIds.value = [...handledIds.value, candidate.id]
    emit('resolved', candidate.id)
    const next = candidates.value.find(item => !handledIds.value.includes(item.id))
    activeId.value = next?.id ?? null
  }
  catch (cause) {
    actionError.value = cause instanceof Error ? cause.message : (decision === 'add' ? '加入竞品监测失败' : '忽略竞品推荐失败')
  }
  finally {
    processingId.value = null
  }
}
</script>

<template>
  <Drawer
    v-model:open="open"
    eyebrow="潜在竞品确认"
    :title="`发现 ${candidates.length} 个潜在新竞品候选`"
    placement="right"
    size="lg"
    close-label="关闭潜在竞品确认"
    class="vm-candidate-dialog"
  >
    <div class="vm-candidate-dialog__body">
      <section class="vm-candidate-dialog__section" aria-label="本批发现概况">
        <p class="vm-candidate-dialog__intro">
          本轮共发现 {{ candidates.length }} 个潜在竞品候选。选择候选查看接口返回的证据，并逐条完成处理。
        </p>
        <div class="vm-candidate-dialog__summary">
          <article><span>候选品牌</span><strong>{{ candidates.length }} 个</strong></article>
          <article><span>出现回答</span><strong>{{ totalOccurrences === null ? '—' : `${totalOccurrences} 次` }}</strong></article>
          <article><span>相关问题</span><strong>{{ totalQuestions === null ? '—' : `${totalQuestions} 条` }}</strong></article>
          <article><span>推荐批次</span><strong>{{ batchLabel }}</strong></article>
        </div>
      </section>

      <section class="vm-candidate-dialog__section" aria-label="候选品牌">
        <div class="vm-candidate-dialog__section-head">
          <h3>候选品牌</h3>
          <span class="vm-candidate-dialog__pending">待处理 {{ pendingCount }} 个</span>
        </div>
        <div class="vm-candidate-dialog__tabs" role="tablist" aria-label="切换候选品牌">
          <button
            v-for="candidate in candidates"
            :key="candidate.id"
            type="button"
            role="tab"
            :aria-selected="activeId === candidate.id"
            :class="{ 'is-active': activeId === candidate.id, 'is-handled': handledIds.includes(candidate.id) }"
            @click="activeId = candidate.id"
          >
            {{ candidate.name }} <small>{{ candidate.occurrences === null ? '—' : `${candidate.occurrences} 次` }}</small>
          </button>
        </div>
      </section>

      <template v-if="activeCandidate">
        <section class="vm-candidate-dialog__section">
          <div class="vm-candidate-dialog__candidate-heading">
            <div>
              <h3>{{ activeCandidate.name }}</h3>
              <p>{{ activeCandidate.platforms.length ? `出现于 ${activeCandidate.platforms.join('、')}` : ' ' }}</p>
            </div>
            <span v-if="decisions[activeCandidate.id] === 'add'" class="vm-candidate-dialog__handled">已加入</span>
            <span v-else-if="decisions[activeCandidate.id] === 'ignore'" class="vm-candidate-dialog__handled">已忽略</span>
            <span v-else class="vm-candidate-dialog__pending">待确认</span>
          </div>
          <div class="vm-candidate-dialog__summary vm-candidate-dialog__summary--candidate">
            <article><span>出现回答</span><strong>{{ activeCandidate.occurrences === null ? '—' : `${activeCandidate.occurrences} 次` }}</strong></article>
            <article><span>涉及问题</span><strong>{{ activeCandidate.questions.length ? `${activeCandidate.questions.length} 条` : '—' }}</strong></article>
            <article><span>涉及 AI 平台</span><strong>{{ activeCandidate.platforms.length ? `${activeCandidate.platforms.length} 个` : '—' }}</strong></article>
          </div>
        </section>

        <section class="vm-candidate-dialog__section">
          <h3>对应问题</h3>
          <div class="vm-candidate-dialog__table-scroll" role="region" tabindex="0" aria-label="候选主体对应问题表，可横向滚动">
            <table>
              <thead>
                <tr>
                  <th scope="col">
                    监测问题
                  </th><th scope="col">
                    出现次数
                  </th><th scope="col">
                    AI 平台
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="question in activeCandidate.questions" :key="question.question">
                  <td>{{ question.question }}</td><td>{{ question.occurrences ?? '—' }}</td><td>{{ question.platforms.join(' · ') || '—' }}</td>
                </tr>
                <tr v-if="!activeCandidate.questions.length">
                  <td colspan="3">
                    —
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="vm-candidate-dialog__section">
          <h3>原始证据</h3>
          <article v-for="(evidence, index) in activeCandidate.evidence" :key="`${evidence.responseId ?? evidence.platform}-${index}`" class="vm-candidate-dialog__evidence">
            <header><strong>{{ evidenceDetails[evidence.responseId ?? -1]?.platform || evidence.platform || '—' }}</strong><time>{{ evidenceDetails[evidence.responseId ?? -1]?.collectTime || evidence.date || '—' }}</time></header>
            <div v-if="evidenceLoading && evidence.responseId !== null" class="vm-candidate-dialog__evidence-loading" role="status" aria-label="加载回答证据">
              <Spinner variant="ring" aria-hidden="true" />
            </div>
            <blockquote v-else>
              {{ evidenceDetails[evidence.responseId ?? -1]?.responseContent || evidence.answer || '—' }}
            </blockquote>
            <a v-if="evidenceDetails[evidence.responseId ?? -1]?.htmlSnapshotUrl || evidence.snapshotUrl" :href="evidenceDetails[evidence.responseId ?? -1]?.htmlSnapshotUrl || evidence.snapshotUrl" target="_blank" rel="noreferrer">查看 HTML 快照 ↗</a>
          </article>
          <div v-if="!activeCandidate.evidence.length" class="vm-candidate-dialog__empty">
            —
          </div>
        </section>

        <p v-if="actionError" class="vm-candidate-dialog__error" role="alert">
          {{ actionError }}
        </p>
        <footer v-if="!handledIds.includes(activeCandidate.id)" class="vm-candidate-dialog__actions">
          <button type="button" :disabled="processingId !== null" @click="handleCandidate('ignore')">
            忽略
          </button>
          <button type="button" class="is-primary" :disabled="processingId !== null" @click="handleCandidate('add')">
            {{ processingId === activeCandidate.id ? '处理中…' : '加入竞品监测' }}
          </button>
        </footer>
      </template>
      <p v-else class="vm-candidate-dialog__empty">
        {{ candidates.length ? '本批候选已处理完成。' : '—' }}
      </p>
    </div>

    <template #footer>
      <div class="vm-candidate-dialog__foot">
        <span>已完成 {{ handledIds.length }} / {{ candidates.length }} 个</span>
        <button type="button" @click="close">
          关闭
        </button>
      </div>
    </template>
  </Drawer>
</template>

<style scoped>
.vm-candidate-dialog__body { display: grid; align-content: start; gap: 18px; min-height: 0; }
.vm-candidate-dialog__section { display: grid; gap: 10px; min-width: 0; }
.vm-candidate-dialog__intro { margin: 0; padding: 10px 12px; border: 1px solid var(--action-subtle-border, var(--border-default)); border-radius: var(--radius-control); color: var(--text-secondary); background: var(--background-subtle); font-size: var(--font-size-body); line-height: var(--line-height-body); }
.vm-candidate-dialog__section h3 { margin: 0; color: var(--text-primary); font-size: 14px; line-height: 20px; }
.vm-candidate-dialog__section-head, .vm-candidate-dialog__candidate-heading, .vm-candidate-dialog__evidence header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.vm-candidate-dialog__pending, .vm-candidate-dialog__handled { flex: 0 0 auto; padding: 4px 9px; border-radius: 999px; color: var(--status-warning-foreground); background: var(--status-warning-background); font-size: 12px; font-weight: 650; }
.vm-candidate-dialog__handled { color: var(--status-success-foreground); background: var(--status-success-background); }
.vm-candidate-dialog__summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.vm-candidate-dialog__summary article { display: grid; gap: 5px; min-width: 0; padding: 11px 12px; border: 1px solid var(--border-default); border-radius: 10px; background: var(--background-secondary); }
.vm-candidate-dialog__summary span { color: var(--text-muted); font-size: 12px; line-height: 18px; }
.vm-candidate-dialog__summary strong { color: var(--text-primary); font-size: 16px; line-height: 22px; overflow-wrap: anywhere; }
.vm-candidate-dialog__summary--candidate { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.vm-candidate-dialog__tabs { display: flex; flex-wrap: wrap; gap: 8px; }
.vm-candidate-dialog__tabs button { min-height: 34px; padding: 5px 11px; border: 1px solid var(--border-control); border-radius: var(--radius-control); color: var(--text-secondary); background: var(--background-primary); font: inherit; font-size: var(--font-size-body); font-weight: 600; cursor: pointer; }
.vm-candidate-dialog__tabs button.is-active { border-color: var(--action-accent); color: var(--action-accent); background: var(--action-subtle-background); }
.vm-candidate-dialog__tabs button.is-handled:not(.is-active) { color: var(--text-muted); background: var(--background-secondary); }
.vm-candidate-dialog__tabs small { margin-left: 4px; color: var(--text-muted); font-size: 11px; }
.vm-candidate-dialog__candidate-heading h3 { font-size: 16px; line-height: 22px; }
.vm-candidate-dialog__candidate-heading p { min-height: 18px; margin: 3px 0 0; color: var(--text-muted); font-size: 12px; line-height: 18px; }
.vm-candidate-dialog__table-scroll { overflow-x: auto; border: 1px solid var(--border-default); border-radius: var(--radius-control); }
.vm-candidate-dialog__table-scroll:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: -2px; }
.vm-candidate-dialog__table-scroll table { width: 100%; border-collapse: collapse; text-align: left; }
.vm-candidate-dialog__table-scroll th, .vm-candidate-dialog__table-scroll td { padding: 8px 10px; border-bottom: 1px solid var(--border-divider); font-size: 12px; line-height: 18px; vertical-align: top; }
.vm-candidate-dialog__table-scroll th { color: var(--text-secondary); background: var(--background-secondary); font-weight: 650; white-space: nowrap; }
.vm-candidate-dialog__table-scroll td { color: var(--text-secondary); }
.vm-candidate-dialog__evidence { display: grid; gap: 7px; padding: 11px; border: 1px solid var(--border-default); border-radius: 10px; }
.vm-candidate-dialog__evidence header strong { font-size: var(--font-size-body); }
.vm-candidate-dialog__evidence time { color: var(--text-muted); font-size: 11px; line-height: 16px; }
.vm-candidate-dialog__evidence blockquote { max-height: 180px; overflow: auto; margin: 0; padding: 10px 11px; border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-secondary); background: var(--background-secondary); font-family: var(--font-family-body); font-size: 12px; line-height: 19px; white-space: pre-wrap; }
.vm-candidate-dialog__evidence-loading { display: grid; min-height: 72px; place-items: center; --spinner-color: var(--action-accent); }
.vm-candidate-dialog__evidence a { justify-self: end; color: var(--action-accent); font-size: 12px; font-weight: 600; }
.vm-candidate-dialog__actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 12px; border-top: 1px solid var(--border-divider); }
.vm-candidate-dialog__actions button, .vm-candidate-dialog__foot button { min-height: 36px; padding: 6px 13px; border: 1px solid var(--border-control); border-radius: var(--radius-control); color: var(--action-accent); background: var(--background-primary); font: inherit; font-size: var(--font-size-body); font-weight: 600; cursor: pointer; }
.vm-candidate-dialog__actions button.is-primary { border-color: var(--action-accent); color: white; background: var(--action-accent); }
.vm-candidate-dialog__actions button:disabled { opacity: .6; cursor: wait; }
.vm-candidate-dialog__foot { display: flex; flex: 1; align-items: center; justify-content: space-between; gap: 16px; }
.vm-candidate-dialog__foot > span, .vm-candidate-dialog__empty { color: var(--text-muted); font-size: 12px; line-height: 18px; }
.vm-candidate-dialog__empty { margin: 0; padding: 8px 0; }
.vm-candidate-dialog__error { margin: 0; padding: 9px 12px; border-radius: 8px; color: var(--status-error-foreground); background: var(--status-error-background); font-size: 12px; }
@media (max-width: 640px) { .vm-candidate-dialog__summary { grid-template-columns: repeat(2, minmax(0, 1fr)); } .vm-candidate-dialog__foot { align-items: flex-start; flex-direction: column; } }
</style>

